---
sidebar_position: 12
title: Server Video Ops
description: Opt-in server-side video processing (slice, stitch, audio extract) via the ffmpeg_handler pipeline step — with sizing guidance for small hosts
---

# Server Video Ops

Apps that process video — like Studio — normally do it **in the visitor's browser** via ffmpeg.wasm. That works everywhere, but it is single-threaded, memory-hungry in the browser, and slow in headless CI. Since CE **v0.4.25** the backend ships native `ffmpeg`, and apps can run their video work server-side through the `ffmpeg_handler` pipeline step instead: the video never leaves your storage bucket, and encodes run 5–10× faster than wasm.

Server video ops are **off by default** and entirely opt-in per instance (since v0.4.26). When off — or on any older CE — apps keep processing in the browser, exactly as before.

## Three ways to run video ops

| Mode | Where ffmpeg runs | When to use |
| --- | --- | --- |
| **Browser** | ffmpeg.wasm in the visitor's tab | Always available; the fallback when server video ops are off or refused |
| **Local server** | Native ffmpeg inside the CE backend container | 2 GB+ hosts; simplest, no extra moving parts |
| **Remote** (since v0.4.31) | A separate **Worker** CE calls over HTTPS — Cloud Run is the reference deployment | Small hosts (1 GB droplets), bursty encodes, or when you don't want encodes competing with the API |

"Server video ops" = Local server + Remote together: the app only sees `server: true` and the same four operations; **which executor runs a job** is chosen in Admin Settings (Local, Remote, or both, plus a default) and can be overridden per pipeline step (`executor: "remote"`).

## Enabling

1. **Check sizing first** (below) — the backend container needs headroom or every job will be refused.
2. Go to **Admin Settings → Features** and toggle **Server video ops** on.
3. Apps pick the change up on their next session (they probe `GET /api/video/capabilities` once per session).

You can also pre-seed the switch with `FFMPEG_HANDLER_ENABLED=true` in `.env`; the admin toggle is stored in the database and overrides the env value either way.

## Sizing

Encoding is real work. The handler ships with strict guards so a runaway encode can never take down your instance — but those guards will simply **refuse jobs** on an undersized box (the job fails fast with `insufficient memory for server video ops — raise the backend memory cap or lower FFMPEG_MEMORY_MB`, and the app surfaces the error).

| Host | Recommendation |
| --- | --- |
| 1 GB RAM | Leave server video ops **off** — browser processing works fine |
| 2 GB RAM | Works: raise the backend container limit to ~1.5 GB and add swap (below) |
| 4 GB+ RAM | Works with the same container-limit raise; swap optional |

What the guards enforce: one encode at a time (a bounded queue behind it), an address-space cap on the ffmpeg child (`FFMPEG_MEMORY_MB`, default 1024 MB), reduced CPU priority and one encoder thread per spare core so the API stays responsive, a watchdog for wedged processes, and a pre-flight check that requires the backend container to have roughly **`FFMPEG_MEMORY_MB` + 128 MB** of free headroom before accepting a job.

### Raising the backend memory limit

The stock `docker-compose.yml` caps the backend at 384 MB on purpose — most instances never enable video ops. To raise it, **do not edit `docker-compose.yml`** (that breaks `git pull` updates). Create a git-ignored override file next to it:

```yaml title="docker-compose.override.yml"
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1536M
```

Then apply it:

```bash
docker compose up -d backend
```

Docker Compose merges the override automatically, and updates never touch it.

### Swap

On hosts under 4 GB, add a swapfile as an out-of-memory buffer (it also protects large app installs):

```bash
sudo ./scripts/setup-swap.sh
```

The script is idempotent — it no-ops when swap already exists or the host has ≥ 4 GB RAM — and `setup.sh` runs it automatically on new low-RAM installs.

## Tuning

All optional, via `.env` — these tune the Local server; the Remote executor's own variables are listed below, and `.env.example` has the full reference:

| Variable | Default | Purpose |
| --- | --- | --- |
| `FFMPEG_MEMORY_MB` | `1024` | Address-space cap for the ffmpeg child process |
| `FFMPEG_THREADS` | cores − 1 | Encoder threads |
| `FFMPEG_QUEUE_MAX` | `8` | Queued jobs beyond the one running; excess fail fast as "busy" |
| `FFMPEG_MAX_SECONDS` | `1800` | Watchdog: kill any run exceeding this |

## For app and pipeline authors

`ffmpeg_handler` is a pipeline step with four curated operations (never raw ffmpeg arguments): `probe` (capability check / media info), `extract_audio` (16 kHz mono WAV), `slice` (cut kept spans into one clip, optional WAV alongside), and `concat` (stitch clips; stream-copy with automatic re-encode fallback). Inputs and outputs are storage paths — bytes never enter a request body. Long operations belong in a pipeline's `postSteps` with a job row the client polls.

A `probe` step with no input never fails and returns `{ server, ops, version }` — the standard capability endpoint an app should call before choosing the server path, falling back to client-side processing on `server: false`.

## Remote executor

The Remote executor sends each job to a **Worker** — a small stateless container image (`ghcr.io/bffless/ce-ffmpeg-worker`) that runs the ffmpeg command CE hands it. Bytes never touch your CE server: CE signs a download URL per input and an upload URL for the output, and the Worker moves data **bucket ↔ Worker** directly. That has two consequences:

- **Bucket storage only** — S3, GCS, MinIO or Azure. The local filesystem adapter cannot hand a Worker a reachable URL, and Admin Settings refuses to enable Remote on it. (No bucket CORS is needed: Worker → bucket is server-to-server.)
- The Worker needs no access to your database, secrets or CE API — only the signed URLs in the job.

CE authenticates to the Worker with a **Google ID token** (Cloud Run IAM), minted from a service-account key you paste into Admin Settings (stored encrypted, never shown again) or from Application Default Credentials when CE itself runs on GCP. For private networks there is an `auth: none` mode (below).

### Deploy the Worker on Cloud Run (one command + IAM)

Replace `PROJECT` with your GCP project id and `0.4.31` with your CE version (the Worker image is versioned with CE; `:latest` follows the newest release). Pick the **same region as your bucket** — transfer time is billed and cross-region egress costs more (see *What it costs*).

```bash
gcloud run deploy bffless-ffmpeg --project PROJECT --image ghcr.io/bffless/ce-ffmpeg-worker:0.4.31 --region us-central1 --no-allow-unauthenticated --cpu 4 --memory 4Gi --concurrency 1 --timeout 3600 --min-instances 0 --max-instances 10 --port 8080
```

Then create a caller identity CE will use, allow it to invoke the service, and download its key:

```bash
gcloud iam service-accounts create bffless-ffmpeg-caller --project PROJECT
gcloud run services add-iam-policy-binding bffless-ffmpeg --project PROJECT --region us-central1 --member serviceAccount:bffless-ffmpeg-caller@PROJECT.iam.gserviceaccount.com --role roles/run.invoker
gcloud iam service-accounts keys create key.json --iam-account bffless-ffmpeg-caller@PROJECT.iam.gserviceaccount.com
```

`gcloud run deploy` prints the service URL (`https://bffless-ffmpeg-xxxx-uc.a.run.app`).

### Enable it in CE

The Worker's URL, auth and credential are a **[remote connection](./remote-connections.md)** (since the release after v0.4.31); the Executor panel just points at one.

1. **Admin Settings → Infrastructure → Remote connections → Add**: name `ffmpeg`, the Worker URL, **Auth: Google ID token**, paste the contents of `key.json` into **Credential** (skip it if CE runs on GCP with a service account that has `run.invoker` — ADC is used), **Test connection**, Save.
2. **Admin Settings → Features → Server video ops** — turn the feature on if it isn't already.
3. In the **Executor** panel below it: switch **Remote** on and pick the `ffmpeg` connection. **Test connection** should show the Worker version, its ffmpeg build, the four ops, the round-trip latency, plus "Ready".
4. Pick **Default executor: Remote** (or leave Local as default and opt individual pipeline steps in with `executor: "remote"`), then **Save**.
5. Optionally turn **Local server** off — on a 1 GB host that is the whole point: `server: true` with no ffmpeg on the box.

Instances that configured the Worker before this release are migrated automatically: the URL/auth/key become a connection named `ffmpeg`, already selected.

The same settings can be pinned with env vars (they then win over the admin values and the UI shows the field as env-managed):

| Variable | Purpose |
| --- | --- |
| `FFMPEG_EXECUTOR` | Default executor: `local` or `remote` |
| `FFMPEG_REMOTE_CONNECTION` | Name of the remote connection the Remote executor uses |
| `REMOTE_CONNECTION_FFMPEG_URL` / `_AUTH` / `_CREDENTIAL_JSON` / `_MAX_INFLIGHT` | The `ffmpeg` connection's fields (see [Remote connections](./remote-connections.md)) |
| `FFMPEG_REMOTE_URL` / `FFMPEG_REMOTE_AUTH` / `FFMPEG_REMOTE_SA_KEY_JSON` / `FFMPEG_REMOTE_MAX_INFLIGHT` | **Legacy aliases** of the row above — still work; setting `FFMPEG_REMOTE_URL` selects the `ffmpeg` connection |
| `FFMPEG_WORKER_MIN_VERSION` | Refuse Workers older than this version (unset = any) |
| `FFMPEG_MAX_OUTPUT_BYTES` | Cap on one output object (default 2 GiB — a signed PUT is a single request) |
| `FFMPEG_JOB_MAX_SECONDS` | Ceiling for a whole job incl. transfers (default 2 × `FFMPEG_MAX_SECONDS`); keep Cloud Run `--timeout` at or above it |

Nested deadlines: Cloud Run `--timeout` ≥ `FFMPEG_JOB_MAX_SECONDS` (default 2 × `FFMPEG_MAX_SECONDS` = 3600 s) > the per-job ceiling CE sends the Worker. Keep `--timeout 3600` unless you raise the CE values.

### Sizing the Worker

`--concurrency 1` means one job per instance; parallelism = `--max-instances`. Two rules decide the shape:

- **Memory sizes the largest input.** Cloud Run's filesystem is in-memory, and the Worker's scratch dir lives on it — so every job's downloaded input **plus** its outputs sit in RAM alongside ffmpeg (~0.5–1 GB of its own). `--memory` must be ≥ your biggest source file + outputs + that headroom. When you outgrow a shape, **raise memory first**.
- **CPU only speeds up re-encodes.** `slice` always re-encodes (x264 ultrafast, all cores); `concat` stream-copies unless it must fall back; `extract_audio` is trivial. Going 4 → 8 vCPU makes the encode part ~1.6–1.8× faster and doubles the per-second price — including the seconds spent downloading and uploading, when the CPUs sit idle.

| Typical input | `--cpu` | `--memory` | Notes |
| --- | --- | --- | --- |
| Up to ~2 GB sources (most Studio work: ≤ 1 h 1080p, ≤ 2 h 720p) | 4 | 4Gi | **Recommended default.** An 11-min 1080p slice+audio (167 MB in) measured ~10 s ffmpeg + ~11 s transfer |
| Multi-GB sources (2 h 1080p) | 4–8 | 16Gi | The 16Gi is for the scratch input, not for ffmpeg |
| Short clips (< 10 min), demos, CI | 2 | 2Gi | Cloud Run needs ≥ 2Gi for 4 vCPU and ≥ 4Gi for 8 |

Leave `min-instances` at 0 (request-based billing: idle instances are free, you pay only while a job runs plus a second or two of startup). `--cpu-boost` shortens cold starts slightly but bills startup CPU at the boosted rate; skip it unless cold-start latency matters more than cost.

### What it costs (example)

Cloud Run bills vCPU-seconds and GiB-seconds only while an instance is handling a request (plus startup/shutdown), plus egress. At tier-1 list prices (2026), the 4 vCPU / 4 Gi shape costs about **0.011¢ per second**; 8 vCPU / 16 Gi about 0.023¢. Measured: one **11-minute 1080p slice + WAV** (167 MB in, 12.5 MB out) took ~21 s wall on 8/16 Gi → **≈ ½¢**, and ≈ ¼¢ on 4/4 Gi. A 10-minute slice out of a 2 GB 1080p file on 8/16 Gi (~90 s) is roughly **$0.02–0.03**. Cloud Run's monthly free tier (180,000 vCPU-s + 360,000 GiB-s) covers thousands of such cuts. Then **network egress**:

- Bucket in the **same GCP region** as the Worker (GCS): input download is free, output upload is free.
- Bucket on **another cloud or region** (S3, DigitalOcean Spaces, MinIO elsewhere): the Worker's download is that provider's egress (S3 ≈ $0.09/GB → ~$0.18 for the 2 GB input) and the upload back is Cloud Run egress. **Cross-cloud egress usually dwarfs the compute** — put the Worker next to the bucket when you can. Transfer seconds are also billed compute (idle CPUs), so co-location cuts both lines.

There is no cost dashboard in CE; use GCP Billing (label the service, e.g. `--labels app=bffless-ffmpeg`).

### Private network / local dev: `auth: none`

For a Worker that is only reachable on a private network — the docker-compose profile below, CI, or a box behind your own VPN — you can skip Google auth. The UI shows a **red warning** for this mode because anyone who can reach the URL can run jobs.

```bash
# next to your CE compose files
docker compose --profile ffmpeg-worker up -d
```

This starts `assethost-ffmpeg-worker` on the compose network (plain http, `WORKER_ALLOW_HTTP=1` so it accepts MinIO's http presigned URLs). Then add a remote connection `ffmpeg` with URL `http://ffmpeg-worker:8080`, **Auth: None**, and pick it in the Executor panel — or set `FFMPEG_EXECUTOR=remote FFMPEG_REMOTE_URL=http://ffmpeg-worker:8080 FFMPEG_REMOTE_AUTH=none` in `.env`.

### Troubleshooting

Start from the error code the app or pipeline log shows:

- **`FFMPEG_EXECUTOR_UNAVAILABLE`** — the job could not be handed to any executor. Check, in order:
  1. Is **Server video ops** on? (Admin Settings → Features.) With the flag off, `server: false` and apps stay in the browser — no error, just no server path.
  2. Is the executor the step asked for **enabled**? A step with `executor: "remote"` fails with `not enabled on this instance` until Remote is on with a Worker URL; `executor: "local"` fails when ffmpeg isn't installed on the box or Local is switched off.
  3. **Test connection** in the Executor panel: it tells you *why* the Worker isn't ready —
     - `worker unreachable: …` → URL typo, service not deployed, or CE cannot reach `oauth2.googleapis.com` to mint the ID token (droplets need outbound HTTPS).
     - `worker health responded 404: {"ok":false,"code":"BAD_REQUEST","message":"no route for GET /health"}` → the Worker itself answered, so auth and networking are fine — it is an **older Worker image** (before CE moved the probe from `/healthz` to `/health`, which Cloud Run's front door intercepts). Redeploy the service with the current image tag.
     - `worker 0.4.28 is older than FFMPEG_WORKER_MIN_VERSION 0.4.31` → redeploy the Worker with the newer image (or clear the min-version).
     - `local filesystem storage cannot be reached by a worker` / `storage adapter cannot presign` → Remote needs bucket storage; switch storage or use Local.
     - `remote auth google_id_token requires an https worker URL` → Cloud Run URLs are https; `http://` is only allowed with auth `none`.
- **HTTP 403 from the Worker** (shows as `worker unreachable: … 403`) — the caller identity lacks **`roles/run.invoker`** on the service, or you pasted the key of a *different* service account. Re-run the `add-iam-policy-binding` command above for the account whose key CE has. A 401 means no/invalid ID token: auth is set to `none` against an IAM-protected service, or the key JSON is not a `service_account` key.
- **`FFMPEG_BUSY`** — more than the connection's **max in-flight** (`REMOTE_CONNECTION_FFMPEG_MAX_INFLIGHT` / legacy `FFMPEG_REMOTE_MAX_INFLIGHT`, default 8) jobs in flight from this CE, or the Worker returned 429/503 (all `--max-instances` busy). Raise one or both, or let the app retry.
- **`FFMPEG_TIMEOUT`** — the job exceeded CE's per-job ceiling; raise `FFMPEG_MAX_SECONDS` (and keep Cloud Run `--timeout` ≥ `FFMPEG_JOB_MAX_SECONDS`).
- **Job succeeded on the Worker but CE reports `FFMPEG_FAILED: output upload …`** — the signed PUT was refused: output larger than `FFMPEG_MAX_OUTPUT_BYTES`, or the bucket rejects unsigned `Content-Type` on presigned PUTs (rare; MinIO/S3/GCS accept it).
- **Everything says Ready but jobs run locally** — the default executor is still Local; either pick Remote as default or set `executor: "remote"` on the step. The step output's `executor` field tells you which one ran.

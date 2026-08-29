---
sidebar_position: 12
title: Server Video Ops
description: Opt-in server-side video processing (slice, stitch, audio extract, stills, contact sheets) via the ffmpeg_handler pipeline step — with sizing guidance for small hosts
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

"Server video ops" = Local server + Remote together: the app only sees `server: true` and the same five operations; **which executor runs a job** is chosen in Admin Settings (Local, Remote, or both, plus a default) and can be overridden per pipeline step (`executor: "remote"`).

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
| `FFMPEG_JOB_MAX_SECONDS` | `2 × FFMPEG_MAX_SECONDS` (so `3600`) | Ceiling for a whole job — queue wait, transfers and every ffmpeg command in it. **Derived**: lowering `FFMPEG_MAX_SECONDS` halves this too unless you set it explicitly |
| `FFMPEG_IO_MAX_SECONDS` | `900` | Ceiling for one storage transfer |

## For app and pipeline authors

`ffmpeg_handler` is a pipeline step with five curated operations (never raw ffmpeg arguments): `probe` (capability check / media info), `extract_audio` (16 kHz mono WAV), `slice` (cut kept spans into one clip, optional WAV alongside), `concat` (stitch clips; stream-copy with automatic re-encode fallback), and `frames` (stills at times you supply — optionally with a line of text drawn on them, optionally tiled into contact sheets). Inputs and outputs are storage paths — bytes never enter a request body. Long operations belong in a pipeline's `postSteps` with a job row the client polls.

A `probe` step with no input never fails and returns `{ server, ops, version }` — the standard capability endpoint an app should call before choosing the server path, falling back to client-side processing on `server: false`.

### Stills and contact sheets: `frames`

<!-- TODO: add "(since vX.Y.Z)" here once the release these ops ship in is cut — the manifest read v0.4.34 when this page was written. -->

One operation writes **images** rather than a clip, and it is **path-in / path-out under an output prefix**: it takes an `outputPrefix` (an uploads-relative *directory*) instead of a single `output`, and writes numbered JPEGs into it. That is what lets a later step pick a moment off a sheet and then **re-capture that exact second as a clean still**, rather than cropping it out of a grid.

**There is no `contact_sheet` operation.** `frames` captures one still per entry in `times`, and two optional blocks change what comes out:

| What you want | Config |
| --- | --- |
| Plain stills | `times` |
| A title card on a screenshot | `times: [12.5]` plus `draw` |
| A contact sheet | `times` plus `draw` and `tile` |

**CE does not plan the sampling.** You supply `times`; where they fall — and what the drawn text says — is your app's policy. CE only captures, draws and tiles.

`ffmpeg_handler`'s string fields do **not** all take the same syntax, and mixing them up fails at run time (this table covers every operation, not only `frames`):

| Field | Syntax | Example |
| --- | --- | --- |
| Every path/name field — `input`, `output`, `audioOutput`, `outputPrefix`, `executor` | **Template** — `{{…}}` is substituted, anything else is used verbatim | `{{steps.upload.storage_path}}`, `studio/sheets/{{request.body.jobId}}` |
| `times`, `spans`, and the *whole-value string* form of `inputs` | **Bare expression** — no braces. A value starting `{{` does not match the evaluator's root pattern and comes back as a literal string, which then fails | `steps.pick.times` |
| The **entries** of an `inputs` array | **Template**, the other way round from the field itself — each entry goes through the same path resolution as `input` | `["{{steps.a.path}}", "studio/s2.mp4"]` |
| `draw.text` | **Bare expression *only when it looks like one*** — otherwise literal text. See [Drawing text](#drawing-text-on-every-still) | `steps.plan.titles`, `Chapter one` |
| `height`, `quality`, `draw.size`, `tile.perSheet`, `tile.columns` | **Literal number only** — neither form is resolved | `720` |

So `times: "{{…}}"` fails with "expected a non-empty array", while a bare `input: "steps.upload.storage_path"` is quietly used as a *literal storage key* — and `inputs` is the one field where both halves apply: `inputs: "steps.a.parts"` resolves, but inside a literal array it is `inputs: ["{{steps.a.path}}"]` that resolves and `inputs: ["steps.a.path"]` that becomes a literal key.

| Field | Default | Meaning |
| --- | --- | --- |
| `input` | *(required)* | Source object. Template |
| `outputPrefix` | *(required)* | Destination directory, uploads-relative. Template |
| `times` | *(required)* | Capture times in source seconds — a JSON array (entries may be bare expressions) or a bare expression resolving to one |
| `height` | `720` | Output height in px; width follows the aspect ratio |
| `quality` | `3` | ffmpeg `-q:v` on each still (2 = best, 31 = worst). A tiled **sheet** is always `-q:v 3` |
| `draw` | *(off)* | Burn one line of text into every still |
| `tile` | *(off)* | Lay the stills out into contact sheets instead of uploading them one by one |

`draw`:

| Field | Default | Meaning |
| --- | --- | --- |
| `text` | *(required)* | The line to draw. One string draws the same line on every still; an array draws its own line on each and must be **exactly as long as `times`** |
| `position` | `bottom-right` | One of `top-left`, `top-center`, `top-right`, `center`, `bottom-left`, `bottom-center`, `bottom-right`. A closed enum — you never write an x/y expression |
| `size` | `1/12` (≈`0.0833`) | Font height as a **fraction of the frame height**, `0.005`–`1`. Out of range is a configuration error, never a clamp |
| `color` | `white` | An ffmpeg colour **name** or `0xRRGGBB`/`#RRGGBB`. No `@alpha` suffix — translucency comes from `background`, not the colour |
| `background` | `true` | The dark box behind the text. The strings `"false"`, `"0"`, `"no"`, `"off"` also mean off |

`tile`:

| Field | Default | Meaning |
| --- | --- | --- |
| `perSheet` | *(required whenever `tile` is present)* | Stills per sheet |
| `columns` | `3` | Grid columns. A short final sheet lays out at its own narrower width |

**Without `tile`**, each still is written to `<outputPrefix>/frame-NN.jpg` (1-based, zero-padded to two digits and wider once a batch passes 99, so the names stay sortable), and the output is:

```json
{ "frames": [{ "time": 12.5, "storage_path": "…", "content_type": "image/jpeg", "size": 48213 }], "count": 1, "drawn": false }
```

`time` is the **requested** second, unchanged, so a later step can re-capture it.

**With `tile`**, the stills stay in scratch and are **never uploaded** — only the sheets are declared as outputs, so no executor can ship a loose still — and the sheets are written to `<outputPrefix>/sheet-NN.jpg`:

```json
{ "sheets": [{ "storage_path": "…", "content_type": "image/jpeg", "size": 301884, "times": [0, 10, 20], "index": 0, "total": 4, "cols": 3, "rows": 1 }], "count": 12, "drawn": true }
```

`times` are chunked by `tile.perSheet`; each sheet's `cols` is `min(cells on this sheet, tile.columns)` — so a short final sheet is narrower — and `rows` grows to fit. `sheets[].index` is 0-based while the **filename** is 1-based. **`count` is the number of stills in both modes**, not the number of sheets.

Every `storage_path` is the **full resolved key** — `{owner}/{repo}/uploads/<prefix>/frame-01.jpg`, not the `outputPrefix` you wrote — the same convention `slice` and `extract_audio` already use. Treat each run's prefix as disposable rather than as a directory you append to. Both shapes also report `executor`, `timings`, `bytesIn` and `bytesOut`, like every other ffmpeg step.

#### Drawing text on every still

`draw.text` is read one of two ways, and the difference is what makes either usable:

- **A string** is resolved as an expression **only when it has the shape of a whole path** — `steps.chapters.titles`, `request.body.title`, `steps['my step'].label`. Prose that merely begins with an expression root (`user guide`) is drawn as written. A resolved path may come back as one string (the same line on every still) or as an array (one line each).
- **An array you author is always literal text** — one entry per time. That is the escape hatch for strings the shape test cannot tell from a path: `text: ["metadata.json"]` draws that filename, where `text: "metadata.json"` would try to look it up and fail with "…resolved to nothing".

`{{…}}` is **rejected outright** rather than drawn, so a braced template never ends up burned into the picture.

Two things worth knowing before you draw:

- `draw.text` goes through the same evaluator as every other expression, `secrets.*` included. `draw.text: "secrets.API_KEY"` burns a decrypted secret into a JPEG that is then uploaded to storage, where nothing downstream will redact it.
- The text is burned in with ffmpeg's `drawtext` filter, which needs **an ffmpeg built with libfreetype** (plus fontconfig and an installed font) — CE's own image has them. An ffmpeg without it does **not** fail the step: the stills come back plain and the output reports `drawn: false`.

`drawn` is the **outcome, not a diagnosis**. It is `false` whenever nothing was drawn — including when the step simply asked for no `draw` — so it does not on its own tell you the ffmpeg lacked the filter.

### Limits and gotchas for `frames`

- **At most 200 stills per step**, measured on `times.length` — which bounds the sheets too, since sheets are `times.length / perSheet`. **It is a run-time check.** CE validates handler config immediately before executing a step, never when you save one, so an over-budget step saves without complaint and fails on its first request.
- **A time past the end of the source fails the step, loudly.** The still command carries `-abort_on empty_output`, so ffmpeg exits 234 instead of exiting 0 having written no file. Its stderr carries no filename, so the error usually cannot say *which* time was too late — it names the cause, not the frame.
- **A time can be too late while still being inside `duration`.** The reported duration is not the last frame's timestamp. Measured on a 5.000 s clip at 10 fps, the last frame's PTS is 4.9: `-ss 4.9` captures and `-ss 4.99` aborts, even though both are "within" a 5-second clip. A sampler that spreads times across a clip and clamps the last one to the end will meet this on low-fps sources. **Keep the final sample at least one frame interval clear of the end** — `duration - 1/fps`, or simply a few tenths of a second.
- **The numeric knobs are resolved not at all.** Per the syntax table above, `height`, `quality`, `draw.size`, `tile.perSheet` and `tile.columns` are literal numbers (a string `'720'` is coerced). Neither form works: `height: "{{steps.probe.h}}"` is a configuration error, and a bare `height: "steps.probe.h"` is not resolved either. Compute the value in a prior step and you still cannot pass it here — pick it at authoring time.
- **`quality` and `height` have no upper bound.** They are only checked for being positive integers, so `quality: 500` reaches `-q:v 500` and `height: 20000` scales every still to 20 000 px. Sane ranges: `quality` 2–31 (2 = best; default 3), `height` 360–1080 (default 720). `quality` applies to the **stills** — a tiled sheet is always `-q:v 3`.
- **A tiled step is up to twice as many commands as it has stills.** A 200-still step with `tile: { perSheet: 1 }` is 400 ffmpeg commands — 200 stills plus 200 tiles. CE's local runner acquires its single concurrency slot **per command**, not per job, so a long step has that many chances to hit `FFMPEG_BUSY`, and a failure part-way through discards every still computed so far. That, not merely "it is heavy", is why a big `frames` step belongs in `postSteps` behind a job row. The whole step shares one `FFMPEG_JOB_MAX_SECONDS` budget (default 3600 s — see [Tuning](#tuning)).
- **Uploads are all-or-nothing per command, not per batch.** Both executors upload only after every command has succeeded, so a non-zero ffmpeg exit ships nothing at all. But if a declared output turns out to be missing when its turn comes in the upload loop — an ffmpeg that exited 0 having written no file, which `-abort_on empty_output` makes unlikely rather than impossible — the images before it have already landed.
- **A missing `drawtext` only sometimes costs a second pass.** On a *local* executor whose `-filters` probe already reported the filter missing, CE suppresses the draw up front: zero extra commands. The undrawn retry — one more full pass over every still and sheet — is for a remote Worker, or a local ffmpeg whose probe never ran.

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
3. In the **Executor** panel below it: switch **Remote** on and pick the `ffmpeg` connection. **Test connection** should show the Worker version, its ffmpeg build, its ops, the round-trip latency, plus "Ready".
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

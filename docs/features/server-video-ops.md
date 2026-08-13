---
sidebar_position: 12
title: Server Video Ops
description: Opt-in server-side video processing (slice, stitch, audio extract) via the ffmpeg_handler pipeline step — with sizing guidance for small hosts
---

# Server Video Ops

Apps that process video — like Studio — normally do it **in the visitor's browser** via ffmpeg.wasm. That works everywhere, but it is single-threaded, memory-hungry in the browser, and slow in headless CI. Since CE **v0.4.25** the backend ships native `ffmpeg`, and apps can run their video work server-side through the `ffmpeg_handler` pipeline step instead: the video never leaves your storage bucket, and encodes run 5–10× faster than wasm.

Server video ops are **off by default** and entirely opt-in per instance (since v0.4.26). When off — or on any older CE — apps keep processing in the browser, exactly as before.

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

All optional, via `.env` (see `.env.example` for the full reference):

| Variable | Default | Purpose |
| --- | --- | --- |
| `FFMPEG_MEMORY_MB` | `1024` | Address-space cap for the ffmpeg child process |
| `FFMPEG_THREADS` | cores − 1 | Encoder threads |
| `FFMPEG_QUEUE_MAX` | `8` | Queued jobs beyond the one running; excess fail fast as "busy" |
| `FFMPEG_MAX_SECONDS` | `1800` | Watchdog: kill any run exceeding this |

## For app and pipeline authors

`ffmpeg_handler` is a pipeline step with four curated operations (never raw ffmpeg arguments): `probe` (capability check / media info), `extract_audio` (16 kHz mono WAV), `slice` (cut kept spans into one clip, optional WAV alongside), and `concat` (stitch clips; stream-copy with automatic re-encode fallback). Inputs and outputs are storage paths — bytes never enter a request body. Long operations belong in a pipeline's `postSteps` with a job row the client polls.

A `probe` step with no input never fails and returns `{ server, ops, version }` — the standard capability endpoint an app should call before choosing the server path, falling back to client-side processing on `server: false`.

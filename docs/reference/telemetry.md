---
sidebar_position: 5
title: Telemetry
description: What anonymous install telemetry BFFless sends, and how to turn it off
---

# Telemetry

BFFless sends a small amount of **anonymous install telemetry** so the project can
see roughly how many instances are running and which versions are in use. This
helps prioritize releases and is the only way the project can tell that
self-hosted installs exist at all.

It is **opt-out**: telemetry is on by default and can be disabled at any time.

## What is sent

A single anonymous ping shortly after startup, then once a week:

| Field | Example | Notes |
|-------|---------|-------|
| Install ID | random UUID | Generated once per instance; not tied to you or your data |
| Version | `0.1.72` | The CE version you're running |
| OS / architecture | `linux` / `x64` | From the Node.js runtime |
| Node version | `v20.11.1` | |
| Storage provider | `s3` | Which storage backend is configured |
| Project / deployment / user counts | `2-5` | **Bucketed** ranges, never exact numbers |

## What is **never** sent

- Your domains or URLs
- Any deployed content, assets, or file names
- User emails, names, or any personal data
- Project names, API keys, or secrets

Counts are reported as coarse buckets (e.g. `2-5`, `6-20`) specifically so they
can't be used to identify a particular instance.

## How to turn it off

**During setup:** uncheck *"Send anonymous usage data"* on the final step of the
setup wizard.

**Anytime, from the admin UI:** Settings → General → *Anonymous Usage Data* →
toggle off.

**Via environment variable** (always wins, even over the UI setting):

```bash
TELEMETRY=off
```

Then restart: `./stop.sh`, then `./start.sh`.

## Self-hosting the collector

Telemetry is sent to `https://bffless.app/api/telemetry` by default. If you'd
rather point it somewhere you control (or a black hole), set:

```bash
TELEMETRY_ENDPOINT=https://telemetry.example.com/ingest
```

The request is a fire-and-forget `POST` with a short timeout — if the endpoint is
unreachable, BFFless ignores the error and continues normally.

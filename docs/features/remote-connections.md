---
sidebar_position: 13
title: Remote Connections
description: Named services your BFFless instance calls with its own identity (Cloud Run reference) — configured once by an admin, used by the ffmpeg Remote executor and by remote_request pipeline steps
---

# Remote Connections

A **remote connection** is a service *you* run — a transcoder, a PDF renderer, a Whisper worker, anything on Cloud Run or a private network — registered once by an admin with its base URL and how BFFless authenticates to it. Pipelines then call it by **name** with a `remote_request` step, and the ffmpeg [Remote executor](./server-video-ops.md#remote-executor) uses one for its Worker. Rule authors never see a credential; rules-as-code stays portable because each instance maps the name to its own URL and key.

Available since the CE release after v0.4.31 (bffless/ce#687).

## Create a connection

**Admin Settings → Infrastructure → Remote connections → Add**

| Field | Meaning |
| --- | --- |
| **Name** | Lower-case letters, digits and dashes (`pdf-renderer`). Rules reference this; it is locked once used. |
| **URL** | Base URL (`https://my-service-xxxx-uc.a.run.app`). `https` is required unless auth is `none`. |
| **Auth** | `Google ID token` (Cloud Run IAM — the default) or `None` (private networks only; shows a red warning). |
| **Credential** | For Google ID token: a service-account JSON key with `roles/run.invoker` on the service. Optional — leave empty when CE itself runs on GCP with a suitable service account (ADC). Stored encrypted, **write-only**: it is never shown again; you can only *Replace* or *Remove* it. |
| **Max in-flight** | How many concurrent requests this instance will have open to the connection (default 8). Excess requests fail fast with `REMOTE_BUSY` (`FFMPEG_BUSY` on the ffmpeg path) instead of queueing — size it to the service's `--max-instances`. |
| **Health path** | `GET <url><path>` used by **Test connection** and readiness (default `/health`; empty = no probe). |

**Test connection** calls the health path with the connection's auth and reports status, latency and — if the JSON has one — a `version`. `403` = the caller identity lacks `run.invoker`; a `404` HTML page from `*.run.app` on `/healthz` = Google's front door (use `/health`).

### Cloud Run recipe

```bash
gcloud run deploy my-service --image <image> --region us-east1 --no-allow-unauthenticated
gcloud iam service-accounts create bffless-caller
gcloud run services add-iam-policy-binding my-service --member serviceAccount:bffless-caller@PROJECT.iam.gserviceaccount.com --role roles/run.invoker
gcloud iam service-accounts keys create key.json --iam-account bffless-caller@PROJECT.iam.gserviceaccount.com
```

Paste `key.json` into **Credential**. BFFless mints a Google ID token per request with `audience = <service URL>`; the token is refreshed automatically. Outbound access to `oauth2.googleapis.com` is required from the CE host.

## Env-defined connections

Everything above can be pinned by environment variables — env wins over the admin value **per field**, and the UI shows those fields as env-managed. A name that exists only in env appears in the list as read-only.

```
REMOTE_CONNECTION_<NAME>_URL=https://…
REMOTE_CONNECTION_<NAME>_AUTH=google_id_token | none
REMOTE_CONNECTION_<NAME>_CREDENTIAL_JSON=<one-line service-account JSON>
REMOTE_CONNECTION_<NAME>_MAX_INFLIGHT=8
REMOTE_CONNECTION_<NAME>_HEALTH_PATH=/health   # 'none' disables the probe
```

`<NAME>` is the connection name upper-cased with `-` → `_` (`pdf-renderer` → `REMOTE_CONNECTION_PDF_RENDERER_URL`).

The ffmpeg Worker's legacy variables keep working as aliases of the connection named `ffmpeg`: `FFMPEG_REMOTE_URL` / `_AUTH` / `_SA_KEY_JSON` / `_MAX_INFLIGHT` ≡ `REMOTE_CONNECTION_FFMPEG_URL` / `_AUTH` / `_CREDENTIAL_JSON` / `_MAX_INFLIGHT`; setting `FFMPEG_REMOTE_URL` also selects that connection for the Remote executor (`FFMPEG_REMOTE_CONNECTION=<name>` selects any other).

## The `remote_request` step

```json
{
  "name": "render",
  "handlerType": "remote_request",
  "config": {
    "connection": "pdf-renderer",
    "path": "/render",
    "method": "POST",
    "body": "request.body",
    "timeoutSeconds": 600
  }
}
```

| Config | Meaning |
| --- | --- |
| `connection` | Connection name (required, static). |
| `path` | Appended to the connection URL; default `/`; `{{ }}` templates allowed; must start with `/`. |
| `method` | `POST` (default), `GET`, `PUT`, `PATCH`, `DELETE`. |
| `body` | Expression (e.g. `request.body`, `steps.prep`) or `{ field: expression }`; sent as JSON. |
| `headers` | Extra headers (expression values). `Authorization` is never yours to set — the connection supplies it. |
| `timeoutSeconds` | The request is **held open** until the service answers; default 300, max `REMOTE_REQUEST_MAX_SECONDS` (3600). Long jobs are fine. |
| `failOnError` | Default `true`: a non-2xx halts the pipeline with `REMOTE_REQUEST_ERROR`; `false`: it is returned in the output and the next step can branch on `steps.render.ok`. |

The output is **always** `{ ok, status, body, latencyMs, connection, attempts }` — read the service's JSON as `steps.render.body.<field>`.

Errors: `REMOTE_CONNECTION_UNKNOWN` (no such connection on this instance) · `REMOTE_BUSY` (max in-flight reached — retry later) · `REMOTE_UNAVAILABLE` (transport or auth failure; `details.status` when the service answered 429/503 twice) · `REMOTE_TIMEOUT` · `REMOTE_REQUEST_ERROR` (`details.{status, body}`) · `REMOTE_RESPONSE_TOO_LARGE` (`REMOTE_REQUEST_MAX_RESPONSE_BYTES`, default 16 MiB).

BFFless retries a request **once**, and only when the service demonstrably never received it (connection failure before any response byte, or a 429/503 from the front door) — never after a body has been sent, so non-idempotent jobs are safe.

`http_request` remains the right step for public third-party APIs where you hold the key as a project secret; `remote_request` is for services you own.

## Troubleshooting

- **`REMOTE_UNAVAILABLE` … `connection credential is not valid JSON`** — the env-pinned credential is not the raw JSON key (quoting/newline issue). Env credentials are validated lazily; the message never echoes the key.
- **`403`** from Test connection — the service account lacks `roles/run.invoker` on that service, or the URL is a different revision/service than the binding.
- **`REMOTE_BUSY` under load** — raise the connection's max in-flight *and* the service's `--max-instances`; the fuse only protects this instance's sockets.
- **Deleting a connection** the ffmpeg Remote executor uses is refused (409) — pick another connection in the Executor panel first. Rules that name it are counted as a warning, not blocked.

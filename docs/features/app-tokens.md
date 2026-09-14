---
sidebar_position: 5.5
title: App Tokens
description: Project-bound bearer credentials with scopes — mint one for an agent, a CI job or an MCP connector, and exchange it for a browser session when a headless client needs cookies.
---

# App Tokens

An **app token** is a bearer credential bound to **one project** and delegated a set of **scopes**. It is the credential an MCP connector holds after OAuth consent, and the one you mint by hand for an agent, a headless browser or a CI job that should act as you on one project only — never on the whole instance.

Needs CE **v0.4.43**; `neverExpires` and the paged list need **v0.4.51**; the session exchange needs **v0.4.50**.

## App token, API key or session?

| Credential | Sent as | Bound to | Scope checks | Made by |
| --- | --- | --- | --- | --- |
| **Session cookie** | browser cookies | the person | none — a person acting as themselves | signing in |
| **API key** | `X-API-Key` header | a project or global | none | Settings → API Keys |
| **App token** | `Authorization: Bearer bfat_…` | exactly one project | `auth_required.requiredScopes` per rule | Settings → App Tokens, or OAuth consent |

An app token is a **delegation**, not a person: its effective permission is the member's own permission on that project **intersected with** the token's scopes. It never elevates. Sessions and API keys are the person themselves, so `requiredScopes` never applies to them.

When a request carries more than one credential, CE resolves them in this order: `X-API-Key`, then a `bfat_` bearer, then the session cookie, then the custom-domain cookie. A `Bearer` value that is not `bfat_…` is ignored and falls through. Any request with a bearer token is treated as an API request: a failure is a `401`/`403` JSON body, never a redirect to the login page.

## Minting a token

**Admin UI**: **Settings → App Tokens → New**. Pick the project, name it, list the scopes, choose an expiry (or *Never expires*). The secret is shown **once**.

**REST**: session-only — a credential cannot mint a credential. Any member with at least the viewer role on the project can mint one for it.

```bash
curl -s -X POST https://admin.yourdomain.com/api/app-tokens -H "Content-Type: application/json" -b "sAccessToken=…" -d '{"name":"Claude — workflow","project":"myorg/workflow","scopes":["workflow:read","workflow:run"],"neverExpires":true}'
```

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | A label, up to 255 characters |
| `project` | yes | `owner/repo` of the project the token is bound to |
| `scopes` | yes | 1–20 scopes, each `namespace:verb` (lowercase). Your app's own vocabulary — nothing is registered in CE. The `auth:` namespace is reserved for scopes CE interprets itself (see below). |
| `expiresAt` | no | ISO-8601 expiry. Default 90 days, at most 365 days ahead |
| `neverExpires` | no | `true` mints a token with no expiry (`expiresAt: null`). Mutually exclusive with `expiresAt` (`400 expiresAt and neverExpires are mutually exclusive`). Off by default; a revoked token is still refused |

The response carries the `bfat_` secret exactly once. CE stores only its SHA-256 hash. `lastUsedAt` is updated at most once a minute.

## Listing and revoking

```
GET    /api/app-tokens                 # newest 50 active tokens + nextCursor
GET    /api/app-tokens?includeInactive=true&limit=200&cursor=<nextCursor>
DELETE /api/app-tokens/:id             # revoke
```

- A bare `GET` returns the **first page of active tokens only**: revoked and expired tokens are omitted unless `includeInactive=true`.
- `limit` is 1–200 (default 50). Follow `nextCursor` as `?cursor=` until it is `null`. The response shape is `{ data: [...], nextCursor }`.
- The admin UI shows the same view: a *Show expired and revoked* switch and a *Load more* button.

## Using a token against a pipeline

Send it as a bearer to any proxied rule on the project's hosts:

```bash
curl -s https://app.yourdomain.com/api/mcp -H "Authorization: Bearer bfat_…" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

The rule's `auth_required` validator decides:

| Outcome | Status | Body |
| --- | --- | --- |
| Token lacks a scope in the rule's `requiredScopes` | `403` | `insufficient_scope: missing <scope>` plus `WWW-Authenticate: Bearer error="insufficient_scope", scope="…"` |
| Token is bound to a different project than the host resolves to | `403` | `{ "code": "TOKEN_PROJECT_MISMATCH", "message": "Token is bound to another project" }` |
| Token unknown, expired or revoked | `401` | JSON error, with an RFC 9728 `WWW-Authenticate: Bearer resource_metadata="…"` hint on domain hosts |

The project fence is checked **before** any visibility decision (CE ≥ 0.4.58): it applies on public deployments, on `bypassVisibility` rules and on the OAuth discovery rule too, not only on private deployments.

Inside the pipeline, the token is visible to expressions and `function_handler` steps as `user.credential` (`"app_token"`) and `user.scopes` (the array), alongside the member's `user.id`, `user.role` and `user.projectRole`. See [Pipelines → Auth Required](/features/pipelines/#auth-required).

## Exchanging a token for a session

A client that holds only a token but needs **cookie-authenticated pages** — a headless browser driving the admin UI, a CI job fetching a private deployment — can exchange it for a normal session (CE ≥ 0.4.50):

```bash
curl -s -X POST https://admin.yourdomain.com/api/auth/session/from-app-token -H "Authorization: Bearer bfat_…" -c cookies.txt
```

- No body. The token must carry the reserved **`auth:session`** scope; mint it with that scope in the list.
- The response is the same as `POST /api/auth/signin` and sets the session cookies (so `COOKIE_DOMAIN` makes them valid on project subdomains).
- The session's access token carries `via: "app_token"` and `appTokenId`; `GET /api/auth/session` surfaces it as `session.via` (absent for password and OIDC sessions).
- The session has SuperTokens' normal lifetime. It is **not** shortened to the token's expiry, and revoking the token does not end sessions already minted from it.

| Status | `code` | When |
| --- | --- | --- |
| `401` | `unauthorized` | No `bfat_` bearer, or the token is unknown, expired or revoked, or its user is disabled |
| `403` | `insufficient_scope` | The token lacks `auth:session` (`missingScopes` names it) |
| `403` | `token_project_mismatch` | The request host resolves to a project the token is not bound to |
| `401` | `unauthorized` | `REQUIRE_PROJECT_MEMBERSHIP` is on and the member has no role on the resolved project |
| `409` | `user_not_exchangeable` | The user row predates the unified-ID invariant and SuperTokens does not know its id |

## OAuth-issued tokens

When a client connects over OAuth — claude.ai as a custom connector, Claude Code via `/mcp` — the access token it receives **is** an app token (`kind: oauth`, one-hour lifetime, refreshed with a `bfrt_` refresh token that rotates on every use). The person narrows the scopes on the consent page, and the token shows up under **Settings → App Tokens** like any other, where it can be revoked. The server side of that flow is described in [Build an MCP Server](/features/build-an-mcp-server/#auth-session-api-key-or-oauth) and [Authentication → Built-in OAuth server](/configuration/authentication/#built-in-oauth-21-authorization-server).

## Related

- [Build an MCP Server](/features/build-an-mcp-server/) — `requiredScopes`, discovery and consent
- [Authentication](/configuration/authentication/) — sessions, API keys and the OAuth server
- [Authorization](/features/authorization/) — the roles a token's member holds
- [API Reference](/reference/api/) — endpoint list

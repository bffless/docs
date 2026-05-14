---
sidebar_position: 4
title: SSO / OIDC Providers
description: Configure single sign-on with Google, Okta, Azure AD, or any OIDC-compliant identity provider
---

# SSO / OIDC Providers

BFFless ships with a pluggable single sign-on layer. Email + password is always available; on top of that you can add as many OIDC providers as you need — Google, Okta, Microsoft Entra (Azure AD), or any OIDC-compliant IdP — and each one renders a button on the login screen.

Providers are managed at **Settings → Authentication** in the admin UI. No environment redeploys, no SuperTokens dashboard required.

---

## Concepts

| Term | What it means |
|---|---|
| **Provider** | One configured identity source. A workspace can have multiple. |
| **Kind** | The provider type — `google`, `okta`, `azure-ad`, or `oidc` (generic). Picks which SuperTokens built-in adapter to use. |
| **Provider ID** | URL-safe slug used in `/api/auth/oauth/:providerId/url`. Pick something stable — it can't be renamed. |
| **Source** | `admin` (added via UI) or `env` (auto-backfilled from `GOOGLE_OAUTH_CLIENT_ID` env vars). Env-sourced rows can't be deleted via UI; unset the env var instead. |
| **Master switch** | `FEATURE_OIDC_PROVIDERS` (defaults to `true`). Set to `false` to force email/password only across the workspace. |

Each enabled provider becomes one row in the `oidc_providers` table and one button on `/login` and `/signup`. Disabling a row hides its button without losing the credentials.

---

## Quickstart (any IdP)

1. Sign in to your workspace as an admin.
2. Open **Settings → Authentication → Single Sign-On (OIDC)**.
3. Click **+ Add provider** and pick the kind that matches your IdP.
4. Fill in the fields (each kind has its own — see walkthroughs below) and click **Create**.
5. Click **Test** on the new row. You should see "Probe succeeded" with the IdP's issuer URL.
6. Sign out, visit `/login` — your provider's button now appears alongside the email/password form.

The button's redirect target is `https://<your-workspace>/oauth/signin/callback`. You'll need to whitelist this in your IdP's "Allowed redirect URIs" list (each walkthrough below covers where).

---

## Google

### From environment variables (back-compat)

If you set both `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in your `.env` file, BFFless auto-creates a Google provider on first boot (`source: env`). You can then enable/disable it from the admin UI but cannot edit the credentials there — to rotate, update the env var and restart the backend.

### Via the admin UI

1. Open the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. Under **Authorised redirect URIs**, add:
   ```
   https://<your-workspace>/oauth/signin/callback
   ```
4. Copy the **Client ID** and **Client Secret**.
5. In BFFless: **+ Add provider** → kind: **Google** → paste clientId / clientSecret → Display name: `Google` → Enabled → **Create**.

---

## Okta

1. Sign up for an [Okta developer account](https://developer.okta.com/signup/) (free).
2. In the Okta admin → **Applications → Create App Integration → OIDC - OpenID Connect → Web Application**.
3. **Sign-in redirect URIs**:
   ```
   https://<your-workspace>/oauth/signin/callback
   ```
4. After creating, note your Okta domain (e.g. `dev-12345.okta.com`) and copy the **Client ID** + **Client Secret**.
5. In BFFless: **+ Add provider** → kind: **Okta** → fill in clientId, clientSecret, and Okta domain → Display name (e.g. `Acme SSO`) → **Create**.

You can add multiple Okta providers — each gets its own slug (e.g. `okta-acme`, `okta-vendor`) and renders as a separate button. Useful for letting an internal Okta tenant and a partner Okta tenant sign in to the same workspace.

---

## Azure AD / Microsoft Entra

1. Open [Microsoft Entra → App registrations → New registration](https://entra.microsoft.com/).
2. **Redirect URI** type: **Web**, value:
   ```
   https://<your-workspace>/oauth/signin/callback
   ```
3. After creating, copy the **Application (client) ID** and the **Directory (tenant) ID** from the app's overview page.
4. Under **Certificates & secrets → New client secret**, generate one and copy the **Value** (not the Secret ID).
5. In BFFless: **+ Add provider** → kind: **Azure AD / Microsoft Entra** → fill in clientId, clientSecret, and Directory (tenant) ID → **Create**.

---

## Generic OIDC (worked example: Dex)

For any IdP that exposes a standard OIDC discovery endpoint, use the **Generic OIDC** kind. The walkthrough below uses [Dex](https://dexidp.io) as a stand-in — the exact same shape works against Keycloak, Authentik, ZITADEL, your own custom OIDC server, etc.

### 1. Run Dex locally

The CE repo ships a Dex docker-compose file for testing:

```bash
cd ce
pnpm dev:dex
# Dex now serving at http://localhost:5556
```

Two test users are pre-configured: `alice@example.com` / `password` and `bob@example.com` / `password`.

### 2. Add the provider in BFFless

**+ Add provider** → kind: **Generic OIDC (any IdP)**:

| Field | Value |
|---|---|
| Provider ID | `dex-local` |
| Display name | `Dex (dev)` |
| Client ID | `bffless-ce-dev` |
| Client Secret | `dev-secret-change-me` |
| Issuer URL | `http://localhost:5556` |
| Scopes | leave blank (defaults to `openid email profile`) |
| Enabled | on |

### 3. Test + sign in

Click **Test** on the new row. You should see "Probe succeeded — Issuer: http://localhost:5556". Sign out, visit `/login`, click the new "Sign in with Dex (dev)" button, log in as `alice@example.com` / `password`, and you'll be redirected back signed in.

For real IdPs, the only field that changes is the **Issuer URL** — point it at your IdP's base URL (e.g. `https://login.example.com`, NOT the full `/.well-known/openid-configuration` path; the suffix is appended automatically).

---

## Field reference

### Issuer URL (Generic OIDC only)

The IdP's **base** URL — what appears in the `iss` claim of issued ID tokens. SuperTokens appends `/.well-known/openid-configuration` to fetch the discovery document, so don't include the suffix yourself. (If you do, BFFless strips it for you and warns; the field accepts either form.)

### Scopes

Whitespace-separated list. Optional — defaults to `openid email profile` for generic OIDC, and the kind-default for Google / Okta / Azure AD. Add scopes here if your IdP requires extras (e.g. `openid email profile groups` for group-claim federation).

### Provider ID slug

Lowercase letters, numbers, hyphens. 1–64 chars. Used in two places:
- The URL `/api/auth/oauth/:providerId/url` (so it's user-visible during the redirect dance)
- The SuperTokens `thirdPartyId` (for `kind: 'okta' | 'azure-ad' | 'oidc'`; `kind: 'google'` always uses the literal `'google'` for backwards-compatibility with sessions issued before story 0047)

Stable URLs make for stable bookmarks — if you might run multiple Okta tenants, prefix accordingly (`okta-acme`, `okta-vendor`).

---

## Master kill switch

The feature flag `FEATURE_OIDC_PROVIDERS` (env var) / `ENABLE_OIDC_PROVIDERS` (admin UI feature flags page) controls the whole subsystem:

```env
FEATURE_OIDC_PROVIDERS=false   # email/password only; ignore all rows
```

Defaults to `true`. With no providers configured the login screen still only shows email/password — the flag is for hard-disabling the entire OIDC seam without deleting rows.

The legacy `FEATURE_GOOGLE_OAUTH` / `ENABLE_GOOGLE_OAUTH` flag is kept as a deprecated alias for one minor version. New deployments should use `FEATURE_OIDC_PROVIDERS`.

---

## Troubleshooting

### "Sign-in failed: UNKNOWN_USER_ID"

Usually caused by a leftover app-DB user row from a prior failed sign-in attempt. Delete the row and retry:

```bash
psql "$DATABASE_URL" -c "delete from users where email = 'their.email@example.com';"
```

### "Received response with status 404 and body 404 page not found"

The discovery URL is wrong. The Issuer URL field expects the IdP's base URL only (e.g. `https://login.example.com`), not the full `/.well-known/openid-configuration` path. BFFless will strip the suffix if you paste it, but older deployments may not — confirm with:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<your-issuer>/.well-known/openid-configuration
# expect: 200
```

### "OIDC sign-in is not enabled"

Master switch is off. Either flip `FEATURE_OIDC_PROVIDERS=true` in `.env` and restart, or enable `ENABLE_OIDC_PROVIDERS` in **Settings → Feature Flags**.

### "OIDC provider 'foo' is not configured or not enabled"

Either the provider ID slug doesn't match a row, or the row exists but its **Enabled** toggle is off. Check **Settings → Authentication → Single Sign-On (OIDC)**.

### My provider button doesn't appear on `/login`

In order, check:
1. `curl -s http://<workspace>/api/auth/oauth/providers | jq` — does the provider appear in the array?
2. If not: master flag off, or the row's `enabled` is false.
3. If yes but no button: hard-refresh the login page (the providers list is cached by RTK Query for the duration of the page session).

### Sign-in works locally but fails in production

Most often the redirect URI in the IdP doesn't match the workspace's actual hostname. Open the IdP's app config and confirm the production `https://<your-workspace>/oauth/signin/callback` is in the allowed list — separate from any local-dev URI.

### Two tabs of sign-in collide

PKCE verifier sessionStorage keys are shared per origin. If you start sign-in flows in two tabs simultaneously, only one will complete cleanly. Acceptable trade-off for now; a future improvement is to namespace the keys per-provider.

---

## Related Documentation

- [Authentication](/configuration/authentication) — overall auth model, sessions, API keys
- [Environment Variables](/configuration/environment-variables) — `FEATURE_OIDC_PROVIDERS`, `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`
- [Troubleshooting](/troubleshooting) — general issues

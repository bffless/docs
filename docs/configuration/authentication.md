---
sidebar_position: 3
title: Authentication
description: Configure authentication using SuperTokens
---

# Authentication Configuration

Configure authentication for BFFless using SuperTokens.

## Overview

BFFless uses [SuperTokens](https://supertokens.com/) for authentication, providing:

- Email/password authentication
- Secure session management with JWT
- Automatic token refresh
- Password reset functionality
- API key authentication for CI/CD

---

## Authentication Methods

### 1. Session Authentication (Web UI)

Users authenticate via email/password and receive session cookies.

- **Use case**: Web browser access
- **Method**: HTTP-only cookies
- **Token refresh**: Automatic

### 2. API Key Authentication (CI/CD)

API keys authenticate GitHub Actions and other CI/CD integrations.

- **Use case**: Programmatic access
- **Method**: `X-API-Key` header
- **Scope**: Project-level or global

---

## SuperTokens Configuration

### Docker Setup (Recommended)

SuperTokens is included in the default Docker Compose stack and shares the PostgreSQL database.

```env
SUPERTOKENS_CONNECTION_URI=http://supertokens:3567
```

The container automatically:
- Uses your existing PostgreSQL database
- Creates prefixed tables (`supertokens_*`) to avoid conflicts
- Handles session management

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPERTOKENS_CONNECTION_URI` | `http://supertokens:3567` | SuperTokens server URL |
| `SUPERTOKENS_API_KEY` | - | Optional API key (adds security layer) |
| `FRONTEND_URL` | `http://localhost` | Frontend URL for CORS |
| `API_DOMAIN` | Same as `FRONTEND_URL` | API URL for cookie settings |
| `COOKIE_SECURE` | `false` | Require HTTPS for cookies |
| `COOKIE_DOMAIN` | - | Cookie domain (e.g., `.yourdomain.com`) |

### Connection URI Options

| Environment | Value |
|-------------|-------|
| Docker production | `http://supertokens:3567` |
| Local dev with Docker | Empty (defaults to `http://localhost:3567`) |
| SuperTokens managed service | `https://your-app.supertokens.io` |

---

## Cookie Configuration

### Development (HTTP)

```env
COOKIE_SECURE=false
FRONTEND_URL=http://localhost
```

### Production (HTTPS)

```env
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com
FRONTEND_URL=https://www.yourdomain.com
```

:::important
`COOKIE_DOMAIN` with a leading dot (`.yourdomain.com`) enables authentication across all subdomains.
:::

---

## Single Sign-On (Google / Okta / Azure AD / OIDC)

BFFless supports pluggable single sign-on alongside email/password. Admins add providers from **Settings → Authentication** in the admin UI — each enabled provider renders a button on `/login`.

Supported provider kinds:
- **Google** (also auto-configured from `GOOGLE_OAUTH_CLIENT_ID` + `_SECRET` env vars on first boot)
- **Okta** (multiple tenants supported — one row per tenant)
- **Azure AD / Microsoft Entra**
- **Generic OIDC** (any IdP with a discovery endpoint)

The master switch is the `FEATURE_OIDC_PROVIDERS` flag (defaults to `true`); set it to `false` to force email/password only across the workspace.

See **[SSO / OIDC Providers](/configuration/oidc-providers)** for full per-provider walkthroughs (Google Cloud Console, Okta dev tenant, Azure AD app registration, and a Dex-based local example), plus troubleshooting.

---

## Logging in from a localhost dev server

A dev server on `http://localhost:5173` is a **different origin** from your workspace, so the SuperTokens session cookie (scoped to `.yourdomain.com`) can't reach it — the normal login redirect bounces to the admin and comes back *unauthenticated*. To exercise real login against a deployed backend from localhost, use the **custom-domain relay**, which mints a per-origin `bffless_access` cookie.

**1. Register `localhost` as a custom domain.** Add a custom `domain_mappings` entry for the project whose domain is the **bare host** `localhost` — no port. (The port is supplied separately, in step 2.)

**2. Build the login URL with relay params, putting the port in `targetOrigin`:**

```
https://admin.yourdomain.com/login?customDomainRelay=true&targetDomain=localhost&targetOrigin=http://localhost:5173&redirect=/some/path
```

| Param | Value | Why |
|---|---|---|
| `customDomainRelay` | `true` | Tells the admin login page to run the domain-token relay instead of a plain redirect. |
| `targetDomain` | `localhost` | **Bare host, no port.** `POST /api/auth/domain-token` validates this as a domain name and **rejects a `:port`** (`400 "targetDomain must be a valid domain name"`). It's also matched against the registered mapping, so it must be exactly `localhost`. |
| `targetOrigin` | `http://localhost:5173` | Carries the scheme + port. The backend honours this override **only when `targetDomain` is `localhost` or `127.0.0.1`**, and builds the callback URL from it — so the token returns to your dev port. |
| `redirect` | `/some/path` | A **path** (passed through as `redirectPath`), not an absolute URL. |

After you sign in (or if you already have an admin session), the admin mints the token and redirects to `http://localhost:5173/_bffless/auth/callback?token=…`, which sets `bffless_access` on the localhost origin. `localhost` is a secure context even over HTTP, so the `Secure` cookie sticks.

:::tip Put the port in `targetOrigin`, not `targetDomain`
The single most common mistake is sending `targetDomain=localhost:5173`. The domain-token validator rejects the port. Use `window.location.hostname` (`localhost`) for `targetDomain` and `window.location.origin` (`http://localhost:5173`) for `targetOrigin`.
:::

Your dev server also needs to proxy `/api` and `/_bffless` to the deployed backend so those requests resolve. As an alternative that needs no backend at all, mock `/_bffless/auth/*` in your dev server.

---

## API Endpoints

### Custom Endpoints

All authentication goes through custom endpoints (native SuperTokens endpoints are disabled):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/signin` | POST | Login user |
| `/api/auth/signout` | POST | Logout user |
| `/api/auth/session` | GET | Get current session info |
| `/api/auth/refresh` | POST | Refresh token (automatic) |

### Example: Sign Up

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Example: Sign In

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Example: Authenticated Request

```bash
curl http://localhost:3000/api/auth/session \
  -b cookies.txt
```

---

## API Keys

API keys provide authentication for CI/CD pipelines and programmatic access.

### Creating API Keys

1. Log in to the web interface
2. Navigate to **Settings** > **API Keys**
3. Click **Create API Key**
4. Copy the key (shown only once)

### Using API Keys

Include the key in the `X-API-Key` header:

```bash
curl -X POST https://admin.yourdomain.com/api/assets/upload \
  -H "X-API-Key: your-api-key" \
  -F "file=@screenshot.png" \
  -F "owner=myorg" \
  -F "repo=myrepo" \
  -F "commitSha=abc123"
```

### API Key Scopes

| Scope | Description |
|-------|-------------|
| Project-level | Access limited to specific project |
| Global | Access to all projects (admin only) |

### Security Features

- Keys are bcrypt-hashed before storage
- Optional expiration dates
- Last-used tracking
- Revocation support

---

## Role-Based Access Control

### Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all resources |
| `user` | Access to own projects and assigned resources |

### Project Permissions

| Permission | Description |
|------------|-------------|
| Owner | Full control over project |
| Member | Upload and view assets |
| Viewer | View-only access |

---

## First User Setup

The first user to sign up automatically becomes an admin. Subsequent users are created with the `user` role.

To create additional admins:

1. Sign in as an existing admin
2. Navigate to **Users** in the admin panel
3. Update the user's role to `admin`

---

## Troubleshooting

### 401 "try refresh token" Error

Cookies aren't being sent. Common causes:

1. **HTTP instead of HTTPS**: Set `COOKIE_SECURE=false` for HTTP
2. **Wrong domain**: Ensure `API_DOMAIN` matches your URL
3. **Cross-origin issues**: Frontend and API should be on same domain

```env
COOKIE_SECURE=false
API_DOMAIN=http://localhost
```

### Session Lost on Page Refresh

Check that `FRONTEND_URL` and `API_DOMAIN` match your actual domain configuration.

### Can't Login After Setup

```bash
# Check SuperTokens is running
docker compose logs supertokens

# Restart authentication services
docker compose restart supertokens backend
```

### SuperTokens Connection Failed

```bash
# Verify SuperTokens is healthy
curl http://localhost:3567/hello
# Should return: "Hello"

# Check container status
docker compose ps supertokens
```

---

## Production Checklist

- [ ] Set `COOKIE_SECURE=true`
- [ ] Set `COOKIE_DOMAIN=.yourdomain.com`
- [ ] Use HTTPS for all traffic
- [ ] Generate strong `JWT_SECRET` and `API_KEY_SALT`
- [ ] Configure SSO providers if needed (see [OIDC Providers](/configuration/oidc-providers))
- [ ] Consider rate limiting for auth endpoints
- [ ] Enable access logging for security audits
- [ ] Back up SuperTokens data (in PostgreSQL)

---

## Related Documentation

- [Environment Variables](/configuration/environment-variables) - All configuration options
- [Security](/reference/security) - Security model overview
- [API Reference](/reference/api) - Full API documentation
- [Troubleshooting](/troubleshooting) - Common issues

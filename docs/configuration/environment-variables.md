---
sidebar_position: 1
title: Environment Variables
description: Complete reference for all configuration options
---

# Environment Variables

Complete reference for all configuration options in BFFless.

## Quick Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENCRYPTION_KEY` | Yes | - | AES-256 key for encrypting storage credentials |
| `POSTGRES_PASSWORD` | Yes | `changeme` | PostgreSQL password |
| `PRIMARY_DOMAIN` | Yes | `localhost` | Main domain for the platform |
| `FRONTEND_URL` | Yes | `http://localhost` | URL users access the application |
| `JWT_SECRET` | No | Auto-generated | JWT signing secret |
| `API_KEY_SALT` | No | Auto-generated | Salt for hashing API keys |
| `STORAGE_TYPE` | No | `minio` | Storage backend type |
| `COOKIE_SECURE` | No | `false` | Use HTTPS-only cookies |
| `TELEMETRY` | No | `on` | Set to `off` to disable anonymous install telemetry |

---

## Security Keys

### ENCRYPTION_KEY

- **Required**: Yes
- **Example**: Generate with `openssl rand -base64 32`
- **Description**: AES-256 key for encrypting storage credentials in the database

:::warning
This key MUST be set before first run and NEVER changed afterward. If lost or changed, you'll need to reconfigure all storage settings.
:::

```bash
# Generate and set
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
```

### JWT_SECRET

- **Required**: No (auto-generated during setup)
- **Example**: Generate with `openssl rand -base64 32`
- **Description**: Secret for signing JWT authentication tokens

Set manually only for multi-instance deployments sharing the same database.

### API_KEY_SALT

- **Required**: No (auto-generated during setup)
- **Example**: Generate with `openssl rand -base64 32`
- **Description**: Salt for hashing API keys before storage

Set manually only for multi-instance deployments sharing the same database.

---

## Database Configuration

### POSTGRES_PASSWORD

- **Required**: Yes
- **Default**: `changeme`
- **Description**: PostgreSQL superuser password

**Security**: Always change from default in production!

### DATABASE_URL

- **Required**: No (auto-constructed)
- **Default**: `postgresql://postgres:{POSTGRES_PASSWORD}@postgres:5432/bffless`
- **Description**: Full PostgreSQL connection string

Override only if using an external database or custom configuration.

---

## Domain & URL Configuration

### PRIMARY_DOMAIN

- **Required**: Yes
- **Default**: `localhost`
- **Example**: `yourdomain.com`
- **Description**: Main domain for the platform

Used for:
- Subdomain routing (www, admin, minio)
- Nginx configuration
- Wildcard SSL certificates
- Dynamic domain routing

### FRONTEND_URL

- **Required**: Yes
- **Default**: `http://localhost`
- **Example**: `https://www.yourdomain.com`
- **Description**: URL users use to access the application

Used for CORS, authentication cookies, and SuperTokens configuration.

### API_DOMAIN

- **Required**: No
- **Default**: Same as `FRONTEND_URL`
- **Description**: API server URL (only set if different from frontend)

In Docker/production with nginx, the API is proxied through the same domain, so this typically isn't needed.

---

## Cookie & Session Settings

### COOKIE_SECURE

- **Required**: No
- **Default**: `false`
- **Description**: Require HTTPS for authentication cookies

| Environment | Value |
|-------------|-------|
| Local development | `false` |
| Production with HTTPS | `true` |

### COOKIE_DOMAIN

- **Required**: Production only
- **Example**: `.yourdomain.com`
- **Description**: Cookie domain for cross-subdomain authentication

Use a leading dot to share cookies across all subdomains. Without this in production, authentication won't work across subdomains (e.g., logging in on `admin.domain.com` won't work on `www.domain.com`).

---

## Authentication (SuperTokens)

### SUPERTOKENS_CONNECTION_URI

- **Required**: Yes (for Docker)
- **Default**: `http://supertokens:3567`
- **Description**: SuperTokens server URL

| Environment | Value |
|-------------|-------|
| Docker production | `http://supertokens:3567` |
| Local dev with Docker services | Empty (defaults to `http://localhost:3567`) |
| Managed service | `https://your-app.supertokens.io` |

### SUPERTOKENS_API_KEY

- **Required**: No
- **Description**: Optional API key for SuperTokens (adds extra security)

Not needed for self-hosted Docker instances.

---

## Storage Configuration

### STORAGE_TYPE

- **Required**: No
- **Default**: `minio`
- **Options**: `local`, `minio`
- **Description**: Storage backend for uploaded assets

See [Storage Backends](/configuration/storage-backends) for detailed configuration.

### MinIO Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MINIO_ROOT_USER` | `minioadmin` | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | `changeme` | MinIO admin password |
| `MINIO_BUCKET` | `assets` | Bucket name for assets |
| `MINIO_ENDPOINT` | `minio` | MinIO server hostname |
| `MINIO_PORT` | `9000` | MinIO API port |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key (usually same as ROOT_USER) |
| `MINIO_SECRET_KEY` | `changeme` | MinIO secret key (usually same as ROOT_PASSWORD) |
| `MINIO_USE_SSL` | `false` | Use HTTPS for MinIO connections |

---

## Nginx & Reverse Proxy

### BACKEND_HOST

- **Required**: No
- **Default**: `backend`
- **Description**: Backend service hostname

| Environment | Value |
|-------------|-------|
| Docker | `backend` (container name) |
| Local dev | `localhost` |

### BACKEND_PORT

- **Required**: No
- **Default**: `3000`
- **Description**: Backend API port

### NGINX_SITES_PATH

- **Required**: No
- **Default**: `/etc/nginx/sites-enabled`
- **Description**: Path where nginx site configs are written

| Environment | Value |
|-------------|-------|
| Docker | `/etc/nginx/sites-enabled` |
| Local dev | `./nginx-dev/sites-enabled` |

### NGINX_RELOAD_WAIT_MS

- **Required**: No
- **Default**: `3000`
- **Description**: Wait time (ms) for nginx file watcher to process config changes

---

## SSL Certificates

### SSL_CERT_PATH

- **Required**: No
- **Default**: `/etc/nginx/ssl`
- **Description**: Directory for SSL certificates

| Environment | Value |
|-------------|-------|
| Docker | `/etc/nginx/ssl` |
| Local dev | `./nginx-dev/ssl` |

### CERTBOT_EMAIL

- **Required**: Production only (for Let's Encrypt)
- **Example**: `admin@yourdomain.com`
- **Description**: Email for Let's Encrypt certificate notifications

### CERTBOT_WEBROOT

- **Required**: No
- **Default**: `/var/www/certbot`
- **Description**: Webroot directory for ACME HTTP-01 challenges

---

## Email / SMTP

Optional configuration for sending emails (password resets, notifications). If not configured, emails are logged to console.

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | - | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | Use TLS |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |
| `EMAIL_FROM_NAME` | `BFFless` | Sender display name |
| `EMAIL_FROM_ADDRESS` | - | Sender email address |

---

## Telemetry

Anonymous, opt-out install telemetry. On by default; see [Telemetry](/reference/telemetry) for exactly what is sent.

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEMETRY` | `on` | Set to `off` to disable anonymous install telemetry (overrides the admin UI setting) |
| `TELEMETRY_ENDPOINT` | `https://bffless.app/api/telemetry` | Where pings are sent; point at your own collector if preferred |

---

## Generating Secrets

Generate all required secrets at once:

```bash
# Using OpenSSL
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "API_KEY_SALT=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)"
echo "MINIO_SECRET_KEY=$(openssl rand -base64 32)"
```

Or using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Production Configuration Example

```env
# Domain
PRIMARY_DOMAIN=yourdomain.com
FRONTEND_URL=https://www.yourdomain.com

# Security
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com

# SSL
CERTBOT_EMAIL=admin@yourdomain.com

# Secrets (generate unique values!)
ENCRYPTION_KEY=<generate-with-openssl>
POSTGRES_PASSWORD=<generate-with-openssl>
MINIO_ROOT_PASSWORD=<generate-with-openssl>
MINIO_SECRET_KEY=<generate-with-openssl>
```

---

## Environment-Specific Defaults

### Local Development

```env
PRIMARY_DOMAIN=localhost
FRONTEND_URL=http://localhost
COOKIE_SECURE=false
STORAGE_TYPE=minio
MINIO_ENDPOINT=localhost
```

### Docker Production

```env
PRIMARY_DOMAIN=yourdomain.com
FRONTEND_URL=https://www.yourdomain.com
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com
SUPERTOKENS_CONNECTION_URI=http://supertokens:3567
MINIO_ENDPOINT=minio
BACKEND_HOST=backend
```

---

## Related Documentation

- [Storage Backends](/configuration/storage-backends) - Detailed storage configuration
- [Authentication](/configuration/authentication) - SuperTokens configuration
- [SSL Certificates](/deployment/ssl-certificates) - HTTPS setup
- [Deployment Overview](/deployment/overview) - Container configuration

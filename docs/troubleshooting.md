---
sidebar_position: 7
title: Troubleshooting
description: Common issues and solutions for BFFless
---

# Troubleshooting

Common issues and solutions for BFFless.

## Installation Issues

### Docker Not Found

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify
docker --version
docker compose version
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000

# Stop conflicting services
sudo systemctl stop nginx apache2
```

### Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run
newgrp docker
```

## SSL/HTTPS Issues

### Certificate Not Found

```bash
# Check if certificates exist
ls -la ssl/

# Ensure files are named correctly
# Should have: fullchain.pem and privkey.pem
```

### Certificate Expired

```bash
# Force renewal
certbot renew --force-renewal

# Copy new certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/

# Restart nginx
docker compose restart nginx
```

### DNS Not Propagated

Wait 5-30 minutes after updating DNS records. Verify with:

```bash
dig yourdomain.com +short
nslookup yourdomain.com
```

## Authentication Issues

### 401 "try refresh token" Error

This means cookies aren't being sent. Common causes:

1. **HTTP instead of HTTPS**: Set `COOKIE_SECURE=false` for HTTP testing
2. **Wrong domain**: Ensure `API_DOMAIN` matches your URL exactly
3. **Third-party cookies blocked**: Use same domain for frontend and API

```bash
# Fix in .env
COOKIE_SECURE=false
API_DOMAIN=http://localhost

# Restart
docker compose restart backend
```

### Can't Login After Setup

```bash
# Check SuperTokens is running
docker compose logs supertokens

# Restart auth service
docker compose restart supertokens backend
```

### Session Lost on Page Refresh

Check that `FRONTEND_URL` and `API_DOMAIN` match your actual domain.

## Database Issues

### Connection Refused

```bash
# Check if database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Verify database is ready
docker compose exec postgres pg_isready -U postgres
```

### Migration Failed

```bash
# Run migrations manually
docker compose exec backend pnpm db:migrate

# Check migration status
docker compose exec backend pnpm db:check
```

### Reset Database

```bash
# Warning: This deletes all data!
docker compose down
docker volume rm bffless_postgres_data
docker compose up -d
```

## Container Issues

### Container Won't Start

```bash
# View logs
docker compose logs <service-name>

# Common services: backend, frontend, nginx, postgres, minio

# Rebuild container
docker compose up -d --build <service-name>
```

### Out of Memory (1GB RAM)

Stop containers before building:

```bash
docker compose down
docker compose -f docker-compose.build.yml build
docker compose up -d
```

### Container Keeps Restarting

```bash
# Check logs for errors
docker compose logs --tail=50 <service-name>

# Check health status
docker compose ps

# Inspect container
docker inspect <container-id>
```

## Network Issues

### Can't Connect to Application

```bash
# Check firewall
ufw status

# Ensure ports are open
ufw allow 80/tcp
ufw allow 443/tcp

# Check nginx is running
docker compose logs nginx
```

### API Returns 502 Bad Gateway

Backend is not responding:

```bash
# Check backend status
docker compose logs backend

# Restart backend
docker compose restart backend
```

### CORS Errors

Verify `API_DOMAIN` and `FRONTEND_URL` in `.env` match your actual URLs.

## Storage Issues

### MinIO Not Accessible

```bash
# Check MinIO status
docker compose logs minio

# Verify credentials in .env match
# MINIO_ROOT_USER and MINIO_ACCESS_KEY should match
# MINIO_ROOT_PASSWORD and MINIO_SECRET_KEY should match
```

### Upload Failed

```bash
# Check storage configuration
docker compose exec backend pnpm db:studio

# Check MinIO bucket exists
docker compose exec minio mc ls local/assets
```

### Storage Credentials Invalid

If you've changed `ENCRYPTION_KEY` after initial setup:

```bash
# Storage credentials are encrypted with ENCRYPTION_KEY
# Changing it breaks existing configurations
# You'll need to reconfigure storage in the setup wizard
```

## Build Issues

### TypeScript Errors

```bash
# Check types
pnpm --filter frontend exec tsc --noEmit
pnpm --filter backend exec tsc --noEmit
```

### Dependencies Not Found

```bash
# Clean install
rm -rf node_modules apps/*/node_modules
pnpm install
```

### Docker Build Failed

```bash
# Clean build
docker compose build --no-cache

# Check disk space
df -h

# Prune old images
docker system prune -a
```

## Reset Everything

### Soft Reset (Keep Data)

```bash
docker compose restart
```

### Reset Database Only

```bash
docker compose exec postgres psql -U postgres -d assethost -c "TRUNCATE users, assets, api_keys CASCADE;"
docker compose restart backend
```

### Full Reset (Delete All Data)

```bash
docker compose down -v
docker compose up -d
```

## Upgrading a Pre-Wizard Install (Identity in `.env`)

Since the web-bootstrap release, instance identity lives in
`bootstrap/instance.json`. Installs set up earlier (interactive `setup.sh`,
identity in `.env`) are **adopted automatically** on the first boot after
upgrading: the backend writes `bootstrap/instance.json` marked as
env-managed. Nothing changes for you:

- Editing `PRIMARY_DOMAIN` (etc.) in `.env` and restarting keeps working —
  the file is re-synced from `.env` on every boot.
- Rolling back to an older image is safe; `.env` is never modified.

What you gain:

- **Let's Encrypt installs**: certificate renewal now happens in-app (the
  old `certbot --standalone` renewal could not re-bind port 80 while nginx
  held it). You can remove any host-side certbot cron for this domain.
- **Pasted certificates** (Cloudflare Origin or bring-your-own): you now get
  expiry-reminder emails.

If you later change your domain through the admin UI, the install graduates
to UI-managed identity and `.env` identity edits stop applying (the startup
log warns if the two ever diverge).

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Service not running | Check `docker compose ps` |
| `401 Unauthorized` | Invalid credentials | Check API key or session |
| `403 Forbidden` | No permission | Check user role and project access |
| `404 Not Found` | Resource missing | Verify path and IDs |
| `413 Payload Too Large` | File too big | Increase nginx `client_max_body_size` |
| `502 Bad Gateway` | Backend down | Restart backend container |
| `504 Gateway Timeout` | Request too slow | Increase timeout settings |

## Getting Help

If none of these solutions work:

1. Check container logs: `docker compose logs`
2. Search existing issues on [GitHub](https://github.com/bffless/ce/issues)
3. Open a new issue with:
   - Error message
   - Relevant logs
   - Environment details (OS, Docker version)
   - Steps to reproduce

## Related Documentation

- [Local Development](/getting-started/local-development) - Development setup
- [Deployment Overview](/deployment/overview) - Production deployment
- [Environment Variables](/configuration/environment-variables) - Configuration options
- [Security](/reference/security) - Security settings

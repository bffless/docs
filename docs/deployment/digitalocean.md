---
sidebar_position: 3
title: DigitalOcean
description: Deploy BFFless to a DigitalOcean Droplet
---

# DigitalOcean Deployment

Watch the walkthrough — provisioning a droplet, running the installer, and completing the v0.3.0 web setup wizard:

<YouTubeEmbed id="zTGi5M0mcCo" title="BFFless: Installing on DigitalOcean with the Web UI Setup Wizard" />

Deploy BFFless to a DigitalOcean Droplet.

**Cost:** $6-12/month

## Prerequisites

- DigitalOcean account
- Domain name
- SSH key pair

## Step 1: Create Droplet

1. Go to DigitalOcean → Create → Droplets
2. **Image:** Ubuntu 24.04 LTS x64
3. **Size:**
   - Minimum: $6/mo (1GB RAM)
   - Recommended: $12/mo (2GB RAM) — can enable MinIO and Redis for enhanced performance
4. **Authentication:** SSH keys
5. **Hostname:** `bffless-prod`
6. Note the IP address after creation

## Step 2: Configure DNS

Add these DNS records pointing to your Droplet IP:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `YOUR_DROPLET_IP` |
| A | `*` | `YOUR_DROPLET_IP` |

:::info Why Two Records?
- `@` covers your root domain (`yourdomain.com`)
- `*` is a wildcard that covers all subdomains (`admin.yourdomain.com`, `www.yourdomain.com`, `mysite.yourdomain.com`, etc.)
:::

Wait 5-30 minutes for propagation.

## Step 3: Install BFFless

SSH into your droplet and run the install script:

```bash
ssh root@YOUR_DROPLET_IP

sh -c "$(curl -fsSL https://bffless.dev/install.sh)"
```

The installer will:
1. Install Docker if needed
2. Configure the firewall
3. Create secure passwords and keys
4. Start all services in bootstrap mode
5. Print a link to the web setup wizard at `https://YOUR_DROPLET_IP`

Since **v0.3.0** the installer no longer prompts for your domain or SSL certificates in the terminal — all of that happens in the browser.

## Step 4: Complete Setup in the Browser

Open the link the installer printed (`https://YOUR_DROPLET_IP`), accept the self-signed certificate warning, and complete the web setup wizard: claim token, admin account, domain, SSL, storage, and caching. When DNS has propagated, the wizard redirects you to `https://admin.yourdomain.com`.

- 👉 **[Cloudflare Setup](/getting-started/cloudflare-setup)** - Full walkthrough: wizard steps, Cloudflare DNS and origin certificates, claim token details, and recovery

## Access Points

| URL | Purpose |
|-----|---------|
| `https://admin.yourdomain.com` | Admin panel |
| `https://www.yourdomain.com` | Welcome page |
| `https://minio.yourdomain.com` | MinIO console |

## Updating

`git pull` first, always — image-only updates run, but new features that live in the repo (compose mounts, the nginx image) silently stay dormant.

```bash
cd /opt/bffless

# Pull the latest repo, then pull latest images and restart
git pull
./stop.sh
docker compose pull
./start.sh --fresh
```

## Maintenance

### View Logs

```bash
docker compose logs -f
docker compose logs -f backend
```

### Backup Database

```bash
mkdir -p /opt/backups/postgres
docker compose exec postgres pg_dump -U postgres bffless > \
  /opt/backups/postgres/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Reset Application

```bash
# Reset setup state only
cd /opt/bffless/apps/backend
./scripts/reset-setup.sh
docker compose restart backend

# Full reset (deletes all data)
docker compose down -v
docker compose up -d
```

## Troubleshooting

### SSL Issues

```bash
# Check certificate
openssl x509 -in ssl/fullchain.pem -text -noout | grep -A 1 "Subject Alternative Name"

# Force renewal
certbot renew --force-renewal
cp /etc/letsencrypt/live/*/fullchain.pem ssl/
cp /etc/letsencrypt/live/*/privkey.pem ssl/
docker compose restart nginx
```

### Can't Connect

```bash
ufw status
docker compose ps
curl http://localhost:3000/api/health
```

## Next Steps

- [GitHub Actions](/deployment/github-actions) - Set up automated deployments
- [Environment Variables](/configuration/environment-variables) - All configuration options

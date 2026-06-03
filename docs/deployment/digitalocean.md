---
sidebar_position: 3
title: DigitalOcean
description: Deploy BFFless to a DigitalOcean Droplet
---

# DigitalOcean Deployment

Watch the walkthrough (jumps to the "Creating Droplet on Digital Ocean" section):

<YouTubeEmbed id="m1rtyt2fg_o" title="BFFless: Installing on DigitalOcean with Cloudflare" start={150} />

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

sh -c "$(curl -fsSL https://bffless.app/install.sh)"
```

The installer will:
1. Install Docker if needed
2. Configure the firewall
3. Prompt for your domain name and email
4. Generate SSL certificates
5. Create secure passwords and keys
6. Start all services

## Step 4: Complete Setup

Visit `https://admin.yourdomain.com` and complete the setup wizard.

## Access Points

| URL | Purpose |
|-----|---------|
| `https://admin.yourdomain.com` | Admin panel |
| `https://www.yourdomain.com` | Welcome page |
| `https://minio.yourdomain.com` | MinIO console |

## Updating

```bash
cd /opt/bffless

# Pull latest images and restart
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

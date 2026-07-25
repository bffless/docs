---
sidebar_position: 8
title: Manual Setup
description: Step-by-step guide for manually deploying BFFless
---

# Manual Setup

Step-by-step guide for manually deploying BFFless. Use this if you need full control over the installation process.

## Prerequisites

- Linux server (Ubuntu 22.04+ recommended)
- Root or sudo access
- Domain name with DNS configured
- SSH access to your server

**Minimum Requirements:**
- 1GB RAM minimum (2GB+ recommended to enable MinIO and Redis)
- 20GB disk space
- Ports 22, 80, 443 open

## Step 1: Server Preparation

### Update System

```bash
ssh root@YOUR_SERVER_IP

# Update system packages
DEBIAN_FRONTEND=noninteractive apt update && apt upgrade -y
```

### Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Configure Firewall

```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

ufw status
```

## Step 2: Configure DNS

Set up DNS records for your domain:

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_SERVER_IP |
| A | www | YOUR_SERVER_IP |
| A | admin | YOUR_SERVER_IP |
| A | minio | YOUR_SERVER_IP |

Wait 5-30 minutes for DNS propagation before continuing.

## Step 3: Clone Repository

```bash
# Create application directory
mkdir -p /opt/bffless
cd /opt/bffless

# Clone repository
git clone https://github.com/bffless/ce.git .
```

## Step 4: Configure Environment

### Create Environment File

```bash
cp .env.example .env
```

### Generate Secure Secrets

```bash
# Generate random secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "API_KEY_SALT=$(openssl rand -base64 32)"
```

### Edit Configuration

```bash
nano .env
```

Update these values:

```bash
# Domain (REQUIRED)
PRIMARY_DOMAIN=yourdomain.com

# Database
POSTGRES_PASSWORD=<generated-password>

# Security Keys (REQUIRED)
ENCRYPTION_KEY=<generated-key>
JWT_SECRET=<generated-key>
API_KEY_SALT=<generated-key>

# MinIO Storage
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=<your-chosen-password>
MINIO_SECRET_KEY=<same-as-root-password>

# Application URLs
FRONTEND_URL=https://www.yourdomain.com
PUBLIC_URL=https://www.yourdomain.com
API_DOMAIN=https://www.yourdomain.com
COOKIE_SECURE=true
MINIO_BROWSER_REDIRECT_URL=https://minio.yourdomain.com
```

```bash
# Secure the file
chmod 600 .env
```

## Step 5: SSL Certificates

### Install Certbot

```bash
apt install -y certbot
```

### Obtain Certificates

```bash
certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d admin.yourdomain.com \
  -d minio.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

### Copy Certificates

```bash
mkdir -p ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
chmod 644 ssl/*.pem
```

### Set Up Auto-Renewal

```bash
# Create renewal script
mkdir -p /opt/scripts
cat > /opt/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
cd /opt/bffless
certbot renew --quiet \
  --pre-hook "docker compose stop nginx" \
  --post-hook "cp /etc/letsencrypt/live/*/fullchain.pem ssl/ && \
               cp /etc/letsencrypt/live/*/privkey.pem ssl/ && \
               docker compose start nginx"
EOF

chmod +x /opt/scripts/renew-ssl.sh

# Add cron job (runs twice daily)
(crontab -l 2>/dev/null; echo "0 0,12 * * * /opt/scripts/renew-ssl.sh") | crontab -
```

## Step 6: Start Services

```bash
cd /opt/bffless

# Start all services
./start.sh

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## Step 7: Complete Setup

1. Visit `https://admin.yourdomain.com`
2. Complete the setup wizard:
   - Create admin user
   - Configure storage (MinIO is pre-configured)
   - Generate API key for CI/CD

## Verification

```bash
# Test backend health
curl http://localhost:3000/api/health

# Check all services are running
docker compose ps
```

## Updating

`git pull` first, always — image-only updates run, but new features that live in the repo (compose mounts, the nginx image) silently stay dormant.

```bash
cd /opt/bffless

# Pull the latest repo (required — releases can add compose mounts and a rebuilt nginx image)
git pull

# Stop services
./stop.sh

# Pull latest images
docker compose pull

# Restart with fresh cache
./start.sh --fresh
```

## Next Steps

- [Environment Variables](/configuration/environment-variables) - All configuration options
- [Storage Backends](/configuration/storage-backends) - Configure S3, GCS, or Azure
- [GitHub Actions](/deployment/github-actions) - Set up CI/CD

## Troubleshooting

See the [Troubleshooting Guide](/troubleshooting) for common issues.

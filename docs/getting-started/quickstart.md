---
sidebar_position: 1
title: Quick Start
description: Deploy BFFless in under 5 minutes using the automated installer
---

# Quick Start

Deploy BFFless in under 5 minutes using the automated installer.

:::tip New to BFFless?
Watch the 4-minute [Anatomy of a Website explainer](#background-how-the-web-works) below to see where BFFless fits in the request flow — DNS, the edge, the server, and the BFF. Already familiar? Skip to **Prerequisites**.
:::

## Background — How the Web Works

<YouTubeEmbed id="luQMEUYzsUQ" title="BFFless: Anatomy of a Website — How the Web Actually Works" />

## Prerequisites

- A Linux server (Ubuntu 22.04+ recommended)
- Docker and Docker Compose installed
- A domain name
- Port 443 open (port 80 also needed if not using Cloudflare)

:::tip No Server Yet?
You can deploy on any cloud provider. A basic $5-12/month VPS from DigitalOcean, Linode, or Hetzner works well. 1GB RAM is the minimum; 2GB+ lets you enable optional services like MinIO and Redis.
:::

## Choose Your SSL Approach

Both options provide **free SSL certificates**. Choose one to get started:

### Cloudflare (Recommended)

:::tip Why We Recommend Cloudflare
Cloudflare is the easiest path to production. You get SSL certificates that last 15 years (no renewal headaches), plus free DDoS protection and CDN caching. Most users are up and running in under 10 minutes.
:::

```mermaid
flowchart LR
    User["User"]
    CF["Cloudflare<br/>(CDN + DDoS Protection)"]
    Server["Your Server"]

    User -->|"Universal SSL"| CF
    CF -->|"Origin Certificate"| Server
```

- SSL certificates with 15-year validity (no renewal needed)
- DDoS protection and CDN caching included
- Easy DNS management
- No certbot or port 80 required

<a href="/getting-started/cloudflare-setup" class="button button--primary button--lg">Get Started with Cloudflare →</a>

---

### Let's Encrypt (Alternative)

```mermaid
flowchart LR
    User["User"]
    Server["Your Server<br/>(Let's Encrypt SSL)"]

    User -->|"HTTPS"| Server
```

Use this if you need direct connections without a proxy, or if your organization has policies against third-party CDNs:

- Direct connection to your server (no intermediary)
- Certificates auto-renew every 90 days
- Requires port 80 open for verification
- You manage SSL renewal (automated via cron)

<a href="/getting-started/letsencrypt-setup" class="button button--secondary button--lg">Get Started with Let's Encrypt →</a>

---
sidebar_position: 2
title: Cloudflare Setup
description: Set up Cloudflare for free SSL, CDN, and DDoS protection
pagination_next: getting-started/setup-wizard
---

# Cloudflare Setup

<YouTubeEmbed id="m1rtyt2fg_o" title="Cloudflare Setup Walkthrough" />

Chapters: [Domains on Cloudflare](https://youtu.be/m1rtyt2fg_o?t=22) · [Pointing name servers](https://youtu.be/m1rtyt2fg_o?t=60) · [Creating a Droplet](https://youtu.be/m1rtyt2fg_o?t=150) · [Installing BFFless](https://youtu.be/m1rtyt2fg_o?t=208) · [Origin certs](https://youtu.be/m1rtyt2fg_o?t=316) · [DNS A records](https://youtu.be/m1rtyt2fg_o?t=390) · [Onboarding](https://youtu.be/m1rtyt2fg_o?t=504)

**Cloudflare is the recommended approach for self-hosted deployments.** It provides:

- SSL certificates with up to 15 years validity (no renewal needed)
- DDoS protection and CDN caching
- Easy DNS management
- No need for certbot or port 80 access

:::tip Free Setup
Both Cloudflare and Let's Encrypt provide free SSL certificates. Your only cost is server hosting, which typically runs $5-10/month depending on your provider.
:::

## Overview

With Cloudflare, traffic flows like this:

```mermaid
flowchart LR
    User["User"]
    CF["Cloudflare"]
    Server["Your Server"]

    User -->|"Universal SSL"| CF
    CF -->|"Origin Certificate"| Server
```

Cloudflare provides two layers of encryption:

1. **Universal SSL** - Free certificate between users and Cloudflare (automatic)
2. **Origin Certificate** - Certificate between Cloudflare and your server (you set this up)

## Step 1: Set Up Your Server

Before configuring Cloudflare, you need a Linux server to host BFFless.

### Minimum Requirements

| Resource | Minimum | Recommended |
| -------- | ------- | ----------- |
| **RAM** | 1 GB | 2 GB+ |
| **CPU** | 1 vCPU | 2 vCPU+ |
| **Disk** | 25 GB SSD | 50 GB+ SSD |
| **OS** | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

:::tip 2 GB+ RAM — Enable Optional Services
On servers with **2 GB+ of RAM**, you can enable MinIO (S3-compatible object storage) and Redis (caching) for enhanced performance. Add these to your `.env` file:

```bash
ENABLE_MINIO=true
ENABLE_REDIS=true
```

By default, BFFless uses local filesystem storage and in-memory caching, which works well for most deployments.
:::

:::danger 512 MB RAM Is Not Enough
BFFless requires at least **1 GB of RAM** to run. Servers with 512 MB RAM will experience out-of-memory errors and crashes.
:::

### Recommended Providers

Any cloud provider works. Here are some budget-friendly options:

| Provider | Minimum Plan | Price |
| -------- | ------------ | ----- |
| [Hetzner](https://www.hetzner.com/cloud) | CX22 (2 GB / 2 CPU) | ~$4/mo |
| [DigitalOcean](https://www.digitalocean.com/) | Basic Droplet (1 GB / 1 CPU) | $6/mo |
| [Linode](https://www.linode.com/) | Nanode (1 GB / 1 CPU) | $5/mo |
| [Vultr](https://www.vultr.com/) | Cloud Compute (1 GB / 1 CPU) | $6/mo |

### Server Setup

1. Create a server with **Ubuntu 22.04+** (or your preferred Linux distro)
2. Ensure **port 443** is open in your firewall

## Step 2: Run the Installer

Now SSH into your server and start the BFFless installer.

### 2.1 Connect to Your Server

From your local machine, SSH into your server and note your public IP address:

```bash
ssh root@YOUR_SERVER_IP
curl -4 ifconfig.me && echo
```

<img src="/img/cloudflare-6.1.png" alt="Terminal showing SSH connection to Ubuntu server with system information" className="screenshot" />

You'll need this IP address for DNS configuration in the next steps.

### 2.2 Run the Install Script

Run the BFFless installer:

```bash
INSTALL_DIR=/opt/bffless sh -c "$(curl -fsSL https://bffless.app/install.sh)"
```

The installer will automatically install Docker if needed and set up the BFFless platform.

<!-- TODO: Add screenshot of installer starting -->

### 2.3 Enter Your Domain

When prompted, enter your domain name (e.g., `example.com`):

<img src="/img/cloudflare-6.3.png" alt="BFFless setup script showing prerequisites check and domain prompt" className="screenshot" />

### 2.4 Select Cloudflare

When asked about SSL certificate method, select **1** for Cloudflare (or just press Enter for the default):

<img src="/img/cloudflare-6.4.png" alt="SSL Certificate Method selection showing Cloudflare as option 1 and Let's Encrypt as option 2" className="screenshot" />

### 2.5 Confirm Your Server IP

The installer will detect your server's public IP address. Press Enter to confirm or enter a different IP.

### 2.6 Accept Default Passwords

Press Enter to accept the auto-generated defaults for:
- **PostgreSQL password** - auto-generated secure password
- **MinIO root user** - defaults to `minioadmin`
- **MinIO root password** - auto-generated secure password
- **Redis password** - auto-generated secure password

For **Email Configuration**, enter `N` to skip. You can configure email later in Admin Settings.

:::tip Email Provider Recommendation
Most cloud providers block SMTP ports (25, 465, 587) for spam prevention, so direct SMTP usually won't work. Use a transactional email service like [Resend](https://resend.com), [SendGrid](https://sendgrid.com), or [Postmark](https://postmarkapp.com) instead - they use API-based delivery that works on any host.
:::

<img src="/img/cloudflare-defaults.png" alt="Installer showing auto-generated passwords for PostgreSQL, MinIO, and Redis, with SMTP configuration prompt" className="screenshot" />

### 2.7 Origin Certificate Prompt

When prompted "Do you have your Origin Certificate ready?", **enter `y`**.

The installer will wait for you to paste your certificate. **Leave the terminal open** and continue to the next steps to configure Cloudflare and generate your Origin Certificate. You'll return to this terminal after Step 5 to paste the certificates.

## Step 3: Add Your Domain to Cloudflare

If your domain isn't already on Cloudflare:

1. Create a free account at [cloudflare.com](https://cloudflare.com)
2. Click **Add a Site** and enter your domain
3. Select the **Free** plan
4. Cloudflare will scan your existing DNS records
5. **Update your domain's nameservers** at your registrar to point to Cloudflare:
   - Cloudflare will show you two nameservers (e.g., `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
   - Log into your domain registrar (GoDaddy, Namecheap, Google Domains, etc.)
   - Find the nameserver settings and replace them with Cloudflare's nameservers
   - Wait for propagation (can take up to 24 hours, usually faster)

:::tip Checking Nameserver Propagation

```bash
dig NS yourdomain.com +short
```

You should see Cloudflare nameservers in the output.
:::

## Step 4: Create DNS Records

In the Cloudflare Dashboard, go to **DNS > Records** and add these A records:

<img src="/img/cloudflare-dns.png" alt="Cloudflare DNS Records showing A records for admin, wildcard, root domain, minio, and www all proxied" className="screenshot" />

| Type | Name | Content          | Proxy Status           |
| ---- | ---- | ---------------- | ---------------------- |
| A    | `@`  | `YOUR_SERVER_IP` | Proxied (orange cloud) |
| A    | `*`  | `YOUR_SERVER_IP` | Proxied (orange cloud) |

:::info Why Two Records?
- `@` covers your root domain (`yourdomain.com`)
- `*` is a wildcard that covers all subdomains (`admin.yourdomain.com`, `www.yourdomain.com`, `mysite.yourdomain.com`, etc.)
:::

## Step 5: Generate an Origin Certificate

Origin Certificates encrypt traffic between Cloudflare and your server.

<img src="/img/cloudflare-origin-certs.png" alt="Cloudflare Origin Certificate creation showing RSA 2048 key type and hostname configuration" className="screenshot" />

1. In Cloudflare Dashboard, go to **SSL/TLS > Origin Server**
2. Click **Create Certificate**
3. Keep the default options:
   - **Generate private key and CSR with Cloudflare**
   - **Key type:** RSA (2048)
4. Hostnames should already include `yourdomain.com` and `*.yourdomain.com` (keep these defaults)
5. Select **Certificate Validity:** 15 years (recommended)
6. Click **Create**

You'll see two text blocks:

- **Origin Certificate** - The certificate (starts with `-----BEGIN CERTIFICATE-----`)
- **Private Key** - The key (starts with `-----BEGIN PRIVATE KEY-----`)

:::warning Save Both Values
**Copy both the certificate and private key now.** The private key is only shown once and cannot be retrieved later.
:::

### Return to the Terminal

Now go back to your terminal where the installer is waiting for you to paste the certificate:

1. **Paste your Origin Certificate** (the full text including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`), then press Enter on a blank line
2. **Paste your Private Key** (the full text including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`), then press Enter on a blank line

The installer will save the certificates and continue to the next step.

## Step 6: Set SSL Mode to Full (Strict)

This ensures end-to-end encryption:

<img src="/img/cloudflare-full-strict.png" alt="Cloudflare SSL/TLS Overview showing Full (strict) encryption mode with Browser to Cloudflare to Origin Server diagram" className="screenshot" />

1. In Cloudflare Dashboard, go to **SSL/TLS > Overview**
2. Set SSL/TLS encryption mode to **Full (strict)**

:::caution Don't Use "Flexible"
**Flexible** mode means traffic between Cloudflare and your server is unencrypted. Always use **Full (strict)** with Origin Certificates.
:::

## Step 7: Setup Complete

After pasting the certificates, the installer will show the "Setup Complete" screen:

<img src="/img/cloudflare-setup-complete.png" alt="Setup Complete screen showing next steps including DNS configuration and start command" className="screenshot" />

## Step 8: Start and Complete Setup

```bash
cd /opt/bffless
./start.sh
```

Visit `https://admin.yourdomain.com` to complete the setup wizard.

👉 **[Setup Wizard Guide](/getting-started/setup-wizard)** - Detailed walkthrough of the setup wizard

## Recommended Cloudflare Settings

For optimal performance, configure these settings in Cloudflare:

**SSL/TLS:**

- Encryption mode: **Full (strict)**
- Always Use HTTPS: **On**
- Minimum TLS Version: **1.2**

**Speed > Optimization:**

- Auto Minify: **JavaScript, CSS, HTML** (all enabled)
- Brotli: **On**

**Caching > Configuration:**

- Caching Level: **Standard**
- Browser Cache TTL: **4 hours** or higher

**Security:**

- Security Level: **Medium**
- Bot Fight Mode: **On** (optional)

## Next Steps

👉 **[Setup Wizard](/getting-started/setup-wizard)** - Complete the setup wizard to configure storage and create your admin account

## Troubleshooting

### SSL Certificate Errors

If you see certificate errors after setup:

1. Verify SSL mode is set to **Full (strict)** in Cloudflare
2. Check that you pasted the complete certificate including the `BEGIN` and `END` lines
3. Ensure the Origin Certificate hostnames include your domain and `*.yourdomain.com`

### DNS Not Propagated

```bash
# Check if DNS is pointing to your server
dig yourdomain.com +short

# Should show your server's IP address
```

If DNS isn't propagated, wait 5-30 minutes and try again.

### Orange Cloud vs Gray Cloud

- **Orange cloud (Proxied)**: Traffic goes through Cloudflare - recommended
- **Gray cloud (DNS only)**: Traffic goes directly to your server - won't get Cloudflare benefits

Make sure all records show the orange cloud icon.

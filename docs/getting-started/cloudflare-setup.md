---
sidebar_position: 2
title: Cloudflare Setup
description: Set up Cloudflare for free SSL, CDN, and DDoS protection
pagination_next: getting-started/first-deployment
---

# Cloudflare Setup

<YouTubeEmbed id="zTGi5M0mcCo" title="BFFless Web UI Onboarding and Cloudflare Setup" />

:::info Onboarding Moved to the Browser in v0.3.0
Since **v0.3.0** the install script starts BFFless in **bootstrap mode** and everything after the one-line install command — claim token, admin account, domain, Cloudflare origin certificate, storage, and caching — happens in a guided **web UI setup wizard**. This page (and the video above) walks through that flow. To enter bootstrap mode by hand on an existing checkout (for example a DigitalOcean 1-Click image), run `./setup.sh --bootstrap && ./start.sh`.
:::

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
3. Add your SSH key during creation so you can log in without a password

<img src="/img/web-ui-onboarding-01.jpg" alt="Creating a DigitalOcean droplet with minimal specs" className="screenshot" />

Once the server is ready, note its public IP address — you'll need it for DNS configuration.

## Step 2: Run the Installer

SSH into your server and run the one-line installer:

```bash
ssh root@YOUR_SERVER_IP

INSTALL_DIR=/opt/bffless sh -c "$(curl -fsSL https://bffless.dev/install.sh)"
```

On a fresh server the script detects missing prerequisites — Docker, in particular — and installs them automatically. The installation takes a few minutes while Docker and the BFFless containers are pulled and started.

<img src="/img/web-ui-onboarding-02.jpg" alt="The BFFless docs page with the install command" className="screenshot" />

When it finishes, the script prints a link containing your server's IP address. Copy or click that link to open it in your browser — that's the last thing you need the terminal for.

## Step 3: Open the Web Setup Wizard

Because the server is using a self-signed certificate at this point, your browser will show a privacy warning. This is expected — it is *your* certificate — so click **Proceed** to continue.

<img src="/img/web-ui-onboarding-03.jpg" alt="Browser self-signed certificate warning" className="screenshot" />

### Claim the Instance

The first page of the setup wizard is the **Platform Setup** screen. It displays a **claim token** (`ONBOARDING_TOKEN`) — a one-time code that proves you are the person who provisioned the server; whoever supplies it becomes the instance's first admin. Copy the token, then click **Continue**. This prevents anyone else who discovers the IP from hijacking the setup.

If you reached the wizard through a `?token=...` URL (for example a Platform-provisioned relay link), the Claim step is skipped automatically — the token was already supplied for you.

:::tip Claim Token Lost?
The claim token can get lost when the browser redirects through the SSL warning. If the Claim step comes up empty, copy it from your server and paste it in manually:

- **Self-managed install:** printed by the installer when it finishes, and always readable afterward from `.env`:

  ```bash
  grep ONBOARDING_TOKEN .env
  ```

- **DigitalOcean droplet:** open the droplet's **Console** from the DigitalOcean control panel — the token is shown in the server's login banner.
:::

<img src="/img/web-ui-onboarding-04.jpg" alt="Platform Setup page showing the claim token" className="screenshot" />

### Create Your Admin Account

Next, create the administrator account you'll use to manage the platform.

<img src="/img/web-ui-onboarding-05.jpg" alt="Account creation step in the setup wizard" className="screenshot" />

### Choose Cloudflare as the Serving Path

The wizard asks how traffic reaches your server. This choice drives everything else in the Domain & SSL step — the DNS instructions, the certificate options offered, and how nginx gets configured:

| Path | Choose it when… | Certificate |
| --- | --- | --- |
| **Through Cloudflare** | You want the easiest path to production: free SSL, DDoS protection, and CDN caching, with Cloudflare terminating TLS at its edge. | Paste a free Cloudflare Origin Certificate (this guide). Plain HTTP redirects to HTTPS by default (close port 80 instead if you enable Cloudflare's *Always Use HTTPS*). |
| **Through another CDN or WAF** | You're behind Fastly, Bunny, a corporate WAF, or anything else that terminates TLS in front of this server. | Most of these don't validate the origin, so you can keep the server's built-in self-signed certificate with nothing to maintain — or issue Let's Encrypt / paste your own if your front door does validate. |
| **Directly** | Your domain's A record points straight at this server with nothing in front of it. | The server needs a browser-trusted certificate itself: auto-issue with [Let's Encrypt](/getting-started/letsencrypt-setup/) (recommended), or paste your own. |

Select **Through Cloudflare** — a free CDN with a web application firewall in front of your origin is the best practice, and Cloudflare's free tier makes it an easy choice.

Leave the wizard open and switch to Cloudflare for the next two steps.

## Step 4: Add Your Domain to Cloudflare

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

## Step 5: Create DNS Records

In the Cloudflare Dashboard, go to **DNS > Records** and add these A records:

<img src="/img/web-ui-onboarding-06.jpg" alt="Adding DNS A records in Cloudflare" className="screenshot" />

| Type | Name | Content          | Proxy Status           |
| ---- | ---- | ---------------- | ---------------------- |
| A    | `@`  | `YOUR_SERVER_IP` | Proxied (orange cloud) |
| A    | `*`  | `YOUR_SERVER_IP` | Proxied (orange cloud) |

:::info Why Two Records?
- `@` covers your root domain (`yourdomain.com`)
- `*` is a wildcard that covers all subdomains (`admin.yourdomain.com`, `www.yourdomain.com`, `mysite.yourdomain.com`, etc.)
:::

Back in the BFFless wizard, enter your domain name.

## Step 6: Generate an Origin Certificate

Origin Certificates encrypt traffic between Cloudflare and your server.

<img src="/img/web-ui-onboarding-07.jpg" alt="Cloudflare Origin Certificate creation dialog" className="screenshot" />

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

### Paste Both into the Wizard

Back in the BFFless wizard:

1. **Paste the Origin Certificate** (the full text including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`) into the first text box
2. **Paste the Private Key** (the full text including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`) into the second text box

<img src="/img/web-ui-onboarding-08.jpg" alt="Pasting the certificate and key into the BFFless wizard" className="screenshot" />

## Step 7: Set SSL Mode to Full (Strict)

This ensures end-to-end encryption:

<img src="/img/cloudflare-full-strict.png" alt="Cloudflare SSL/TLS Overview showing Full (strict) encryption mode with Browser to Cloudflare to Origin Server diagram" className="screenshot" />

1. In Cloudflare Dashboard, go to **SSL/TLS > Overview**
2. Set SSL/TLS encryption mode to **Full (strict)**

:::caution Don't Use "Flexible"
**Flexible** mode means traffic between Cloudflare and your server is unencrypted. Always use **Full (strict)** with Origin Certificates.
:::

## Step 8: Storage, Cache, and Email

The wizard finishes with the remaining configuration steps:

- **Storage** — where deployed assets are stored. **Local Filesystem** is fine for testing; for production use a cloud [storage backend](/configuration/storage-backends/) such as S3 or GCS. Click **Test Connection** to verify.
- **Cache** — enable the **In-Memory (LRU)** cache for better performance.
- **Email** — can be skipped for now and configured later in Admin Settings.

<img src="/img/web-ui-onboarding-09.jpg" alt="Storage and caching configuration step" className="screenshot" />

See the [Setup Wizard guide](/getting-started/setup-wizard/) for a detailed walkthrough of each of these options.

## Step 9: Finish Setup and Log In

Click **Finish setup**. BFFless applies your configuration and begins polling the domain to check whether DNS has propagated.

<img src="/img/web-ui-onboarding-10.jpg" alt="Waiting for DNS propagation" className="screenshot" />

Propagation typically takes under a minute with Cloudflare. As soon as the domain is live, the wizard automatically redirects from the raw IP address to your real domain name, where you're greeted with the login screen.

<img src="/img/web-ui-onboarding-11.jpg" alt="The BFFless login screen on the live domain" className="screenshot" />

Log in with the credentials you created during setup, and you land on the BFFless dashboard — fully configured and ready to go.

<img src="/img/web-ui-onboarding-12.jpg" alt="BFFless dashboard after first login" className="screenshot" />

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

👉 **[First Deployment](/getting-started/first-deployment/)** - Create a repository, generate an API key, and deploy your first site

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

### Start Over Before Finish Setup

Any time before the final **Finish setup** click, you can reset the wizard's in-progress state and begin again:

```bash
rm -rf bootstrap/instance.json bootstrap/instance.env
docker compose restart backend nginx
```

### Applied the Wrong Domain?

**Finish setup** is a one-way step — if you typo'd the domain or DNS wasn't pointed at the box yet, the server restarts under an identity you can't reach. This is also the fix if **Finish setup** itself failed partway: run the same commands as in [Start Over Before Finish Setup](#start-over-before-finish-setup) over SSH to drop the server back into bootstrap mode, then retry in the browser.

### Stuck Serving the Wizard on Your Real Domain

If nginx ever serves the setup wizard on your **production** domain after certificate files went briefly missing (the durable self-signed bootstrap marker can outlive the situation that created it), recover with:

```bash
rm ssl/bootstrap-selfsigned.crt ssl/bootstrap-selfsigned.key
docker compose restart nginx
```

### Orange Cloud vs Gray Cloud

- **Orange cloud (Proxied)**: Traffic goes through Cloudflare - recommended
- **Gray cloud (DNS only)**: Traffic goes directly to your server - won't get Cloudflare benefits

Make sure all records show the orange cloud icon.

---
sidebar_position: 6
title: Umbrel
description: Deploy BFFless on Umbrel with Cloudflare Tunnel
---

# Umbrel Deployment

Deploy BFFless on your [Umbrel](https://umbrel.com/) home server with Cloudflare Tunnel for secure external access.

## Video Walkthrough

<YouTubeEmbed id="TZzXtZk2wzE" title="BFFless on Umbrel - Setup Guide" />

## How It Works

BFFless on Umbrel uses Cloudflare Tunnel to securely expose your home server to the internet without opening ports on your router.

```mermaid
flowchart LR
    A["🌐 Users"] -->|mysite.domain.com| B["☁️ Cloudflare"]
    B <-.->|Tunnel| C["🏠 Umbrel"]
    C --> D["BFFless"]

    style B fill:#f6821f,color:#fff
    style D fill:#d96459,color:#fff
```

**Key Benefits:**

- **No port forwarding** - Cloudflare Tunnel creates an outbound connection from your home
- **Free SSL** - Cloudflare handles HTTPS certificates automatically
- **Wildcard subdomains** - Host unlimited sites on `*.yourdomain.com`
- **DDoS protection** - Cloudflare shields your home IP from attacks

## Prerequisites

Before you begin, you'll need:

- **Umbrel** running on your home server (Raspberry Pi or x86)
- **Cloudflare account** with at least one domain
- **Domain managed by Cloudflare** (DNS hosted on Cloudflare)

## Installation

### Step 1: Install BFFless from Umbrel App Store

1. Open your Umbrel dashboard
2. Go to the **App Store**
3. Search for "BFFless" or browse the **Developer Tools** category
4. Click **Install**

The app will be available at `http://umbrel.local:5537`, but you'll see a setup page explaining that Cloudflare Tunnel is required.

### Step 2: Install Cloudflare Tunnel App

1. In the Umbrel App Store, install [**Cloudflare Tunnel**](https://apps.umbrel.com/app/cloudflared)
2. Once installed, open the app and follow the authentication flow to connect to your Cloudflare account

## Setting Up Cloudflare Tunnel

### Step 3: Create a Tunnel

If you don't already have a tunnel, create one:

1. Go to the [Cloudflare dashboard](https://dash.cloudflare.com/)
2. In the sidebar, navigate to **Networking** → **Tunnels**
3. Click **Create Tunnel**
4. Select **Cloudflared** as the tunnel type

<img src="/img/umbrel-cloudflare-d.png" alt="Cloudflare tunnel type selection showing Cloudflared and WARP options" className="screenshot" />

5. Name your tunnel (e.g., "BFFless Umbrel")

<img src="/img/umbrel-cloudflare-name.png" alt="Cloudflare tunnel creation showing Name your tunnel step with BFFless Umbrel entered" className="screenshot" />

6. On the **Install and run connectors** step, copy the token from the install command (the `eyJh...` part)

<img src="/img/umbrel-cloudlare-install.png" alt="Cloudflare Install and run connectors step showing environment options" className="screenshot" />

7. Open the **Cloudflare Tunnel** app in Umbrel and paste the token into the settings, then click **Save & Restart**

<img src="/img/umbrel-cloudflare-token.png" alt="Umbrel Cloudflare Tunnel settings showing Connector token field" className="screenshot" />

Once connected, **Networking** → **Tunnels** shows your tunnel with a **Healthy** status:

<img src="/img/umbrel-cloudflare-tunnels.png" alt="Cloudflare Networking Tunnels list showing the Umbrel tunnel with Healthy status" className="screenshot" />

### Step 4: Add Routes to the BFFless App

1. In the Cloudflare dashboard, go to **Networking** → **Tunnels**
2. Click on your tunnel name (e.g., "Umbrel")
3. Go to the **Published application routes** tab
4. Click **Add a published application route** and create the following 2 routes:

| Subdomain          | Domain           | Service                    |
| ------------------ | ---------------- | -------------------------- |
| `*`                | `yourdomain.com` | `http://umbrel.local:5537` |
| _(leave it blank)_ | `yourdomain.com` | `http://umbrel.local:5537` |

<img src="/img/umbrel-cloudflare-routes.png" alt="Cloudflare Published application routes showing the apex and wildcard routes pointing to umbrel.local:5537" className="screenshot" />

These two routes are all you need:

- **`*`** — the wildcard covers every subdomain, so `admin.yourdomain.com`, `www.yourdomain.com`, and any site you deploy later (`blog.yourdomain.com`, `mysite.yourdomain.com`) all reach BFFless. You don't need separate `admin` or `www` routes.
- **_(blank)_** — an empty subdomain is the apex, or root, of the domain (`@` in DNS terms): plain `yourdomain.com`, with no subdomain at all. A wildcard does **not** match the apex, which is why it needs its own route.

:::warning This hands the whole domain to BFFless
Between them, these routes claim **every hostname on `yourdomain.com`** — the root and every subdomain. Point BFFless at a domain you're happy to dedicate to it, and don't plan on using the same domain for anything else:

- The apex route puts a CNAME on the root of the zone, so you can't also point `yourdomain.com` at another host with an `A` record.
- Any subdomain you haven't explicitly created a record for resolves to BFFless via the wildcard — including ones you later expect to point somewhere else.

Already using `yourdomain.com` for a website or mail? Give BFFless a subdomain of its own instead: create routes for `*.apps` and `apps`, and use `apps.yourdomain.com` as your domain in [Step 6](#step-6-set-your-domain).
:::

### Step 5: Configure Wildcard DNS

Cloudflare doesn't automatically create DNS records for wildcard routes, so you need to add one manually:

1. Go to your domain's DNS settings in Cloudflare (**Domains** → your domain → **DNS**, not the Tunnels page)
2. Click **Add record**
3. Configure:

| Field            | Value                          |
| ---------------- | ------------------------------ |
| **Type**         | CNAME                          |
| **Name**         | `*`                            |
| **Target**       | `<tunnel-id>.cfargotunnel.com` |
| **Proxy status** | Proxied (orange cloud)         |

:::tip
The apex route from Step 4 automatically created a CNAME record for `yourdomain.com`. You can copy the target value (e.g., `abc123.cfargotunnel.com`) from that DNS record.
:::

<img src="/img/umbrel-cloudflare-dns.png" alt="Cloudflare DNS settings showing wildcard CNAME record pointing to tunnel" className="screenshot" />

## Configure Your Domain

### Step 6: Set Your Domain

SSH into your Umbrel and create the domain configuration file:

```bash
ssh umbrel@umbrel.local
```

Create the domain file:

```bash
echo "yourdomain.com" > ~/umbrel/app-data/bffless/data/config/domain.txt
```

Replace `yourdomain.com` with your actual domain.

### Step 7: Restart BFFless App

Restart the app to apply the domain configuration:

1. Go to your Umbrel dashboard
2. Find the BFFless app
3. Right-click (or ctrl+click) on the app icon
4. Select **Restart**

<img src="/img/umbrel-restart.png" alt="Umbrel app context menu showing Restart option" className="screenshot" />

## Access Your App

Visit your admin subdomain (e.g., `https://admin.yourdomain.com`) to access BFFless and complete the [setup wizard](/getting-started/setup-wizard/).

## Troubleshooting

### "Cloudflare Tunnel Required" Page

If you see this page when accessing via your domain:

- Verify your Cloudflare Tunnel route is correctly configured
- Check that the tunnel is showing "Healthy" status
- Ensure DNS is properly pointing to the tunnel

### 502 Bad Gateway

- Make sure BFFless is running in Umbrel
- Check that the route URL is `umbrel.local:5537` (not `localhost`)
- Verify the tunnel connector is online

### Cookies Not Working

If you can't stay logged in:

- Make sure `domain.txt` contains just your domain (e.g., `yourdomain.com`), not the full URL
- Restart BFFless after creating/modifying `domain.txt`

### View Logs

To debug issues, view the BFFless logs:

```bash
ssh umbrel@umbrel.local
sudo docker logs bffless_backend_1 --tail 100
```

## Custom Domains

BFFless supports custom domains for your deployed sites. When you add a custom domain through the admin panel:

1. **Add the domain in BFFless** - Go to your deployment settings and add the custom domain
2. **Configure DNS** - Point your custom domain to your Cloudflare Tunnel (CNAME to `<tunnel-id>.cfargotunnel.com`)
3. **Add a route in Cloudflare Tunnel** - Create a route for the custom domain pointing to `umbrel.local:5537`
4. **Restart BFFless** - After adding custom domains, restart the app from the Umbrel dashboard to apply the nginx configuration

:::note
Unlike the standard CE deployment, Umbrel requires a manual app restart after adding custom domains. This is because the containerized environment doesn't allow automatic nginx reloads.
:::

## Next Steps

Once BFFless is running:

- [Upload your first site](/getting-started/quickstart/)
- [Set up GitHub Actions](/deployment/github-actions/) for CI/CD deployments

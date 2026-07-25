---
slug: bffless-web-ui-onboarding-and-cloudflare-setup
title: 'BFFless Web UI Onboarding and Cloudflare Setup'
authors: [bffless-team]
tags: [features]
image: /img/web-ui-onboarding-01.jpg
description: 'A complete walkthrough of the new BFFless v0.3.0 web UI onboarding experience, from provisioning a DigitalOcean droplet to configuring Cloudflare DNS and origin certificates.'
---

[BFFless](https://bffless.dev/) version 0.3.0 brings a major improvement to the first-run experience: the entire onboarding flow has moved from the terminal into a guided web UI. This means setting up BFFless for the first time — and managing certificates or swapping CDN providers on "day two" — can now be done entirely from a browser. If you decide later to switch from Cloudflare to Bunny or any other CDN, you no longer need to drop back into the terminal.

In this post we walk through the full process end to end: provisioning a server on DigitalOcean, running the one-line installer, and completing the new [setup wizard](https://docs.bffless.dev/getting-started/setup-wizard/) with [Cloudflare](https://docs.bffless.dev/getting-started/cloudflare-setup/) as the CDN.

<!-- truncate -->

## Provisioning the Server

The first step is to spin up a server. In the demo we use a DigitalOcean droplet, but any VPS will work. Head over to the [DigitalOcean](https://docs.bffless.dev/deployment/digitalocean/) dashboard and create a new droplet with the following specs:

- **Region:** New York (or whichever is closest to you)
- **Size:** 1 vCPU, 1 GB RAM, 25 GB SSD
- **Cost:** roughly $6/month

That is genuinely all you need for testing. Be sure to add your SSH key during creation so you can log in without a password. The droplet takes about a minute to provision.

![Creating a DigitalOcean droplet with minimal specs](/img/web-ui-onboarding-01.jpg)

Once the droplet is ready, copy its public IP address from the dashboard.

## Installing BFFless via the Terminal

Open a terminal and SSH into the new droplet:

```bash
ssh root@<YOUR_DROPLET_IP>
```

Because the SSH key was added at creation time, you should land at a root prompt without being asked for a password. If the droplet is still booting, wait a moment and try again.

Next, grab the one-line install command from the [BFFless quick-start docs](https://docs.bffless.dev/getting-started/quickstart/). The command sets an install directory and then runs the install script. On a fresh droplet the script will detect missing prerequisites — Docker, in particular — and install them automatically.

![The BFFless docs page with the install command](/img/web-ui-onboarding-02.jpg)

The installation takes a few minutes while Docker and the BFFless containers are pulled and started. When it finishes, the script prints a link containing your server's IP address. Copy or click that link to open it in your browser.

## The Web UI Setup Wizard

Because the server is using a self-signed certificate at this point, your browser will show a privacy warning. This is expected — it is *your* certificate — so click **Proceed** to continue.

![Browser self-signed certificate warning](/img/web-ui-onboarding-03.jpg)

### Claim Token and Account Creation

The first page of the setup wizard is the **Platform Setup** screen. It displays a **claim token** — a one-time code that proves you are the person who provisioned the server. Copy the token, then click **Continue**. This prevents anyone else who discovers the IP from hijacking the setup.

> **Tip:** The claim token can get lost when the browser redirects through the SSL warning. If that happens, simply copy and paste it manually.

![Platform Setup page showing the claim token](/img/web-ui-onboarding-04.jpg)

Next, create your admin account. Any email, username, and password combination will work.

![Account creation step in the setup wizard](/img/web-ui-onboarding-05.jpg)

### Choosing a CDN

The wizard asks how you want to handle SSL and CDN. The options include:

- **Cloudflare** — free CDN with a WAF; recommended
- **Bunny** — another CDN option
- **Direct / Let's Encrypt** — serve directly from the origin with a [Let's Encrypt](https://docs.bffless.dev/getting-started/letsencrypt-setup/) certificate

All three are secure, but putting a CDN with a web application firewall in front of your origin is the better practice. Cloudflare's free tier makes this an easy choice.

## Configuring Cloudflare DNS and Origin Certificates

With Cloudflare selected, head over to your Cloudflare dashboard, find the domain you want to use, and open **DNS → Records → Add Record**.

Create two A records:

| Type | Name | Value |
|------|------|-------|
| A | `@` (root / apex) | `<YOUR_DROPLET_IP>` |
| A | `*` (wildcard) | `<YOUR_DROPLET_IP>` |

![Adding DNS A records in Cloudflare](/img/web-ui-onboarding-06.jpg)

Back in the BFFless wizard, enter your domain name (for example, `sahp.app`).

### Creating and Pasting the Origin Certificate

The wizard now asks for the [SSL certificate](https://docs.bffless.dev/deployment/ssl-certificates/) that encrypts traffic between Cloudflare and your origin server. In Cloudflare, navigate to **SSL/TLS → Origin Server → Create Certificate**. Cloudflare will generate two values:

1. **Origin Certificate** — paste this into the first text box in the wizard.
2. **Private Key** — paste this into the second text box.

![Cloudflare Origin Certificate creation dialog](/img/web-ui-onboarding-07.jpg)

![Pasting the certificate and key into the BFFless wizard](/img/web-ui-onboarding-08.jpg)

### Storage and Caching

The wizard also asks where to store deployment assets. For a quick demo the **local file system** is fine; in production you would choose a cloud [storage backend](https://docs.bffless.dev/configuration/storage-backends/) such as GCS or S3. After selecting storage, click **Test Connection** to verify everything is wired up.

For [caching](https://docs.bffless.dev/storage/caching/), the wizard offers an LRU cache option. Enable it for better performance. Email configuration can be skipped for now.

![Storage and caching configuration step](/img/web-ui-onboarding-09.jpg)

## DNS Propagation and First Login

Once you finish the wizard, BFFless begins polling the domain to check whether DNS has propagated. The setup page shows a "Bootstrapping from GitHub" message and pings the backend until the domain resolves to your server.

![Waiting for DNS propagation](/img/web-ui-onboarding-10.jpg)

In this demo propagation took roughly 30 seconds. As soon as the domain is live, the wizard automatically redirects from the raw IP address to the real domain name. You are greeted with the **Welcome Back** login screen.

![The BFFless login screen on the live domain](/img/web-ui-onboarding-11.jpg)

Log in with the credentials you created during setup, and you land on the BFFless dashboard — fully configured and ready to go.

![BFFless dashboard after first login](/img/web-ui-onboarding-12.jpg)

## What's Next

The goal of version 0.3.0 is to make onboarding as painless as possible. A planned DigitalOcean one-click install image will simplify things even further by eliminating the SSH and install-script steps entirely.

If you run into any issues during setup, [open an issue on GitHub](https://github.com/bffless/ce/issues) — feedback is always welcome.

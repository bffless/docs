---
sidebar_position: 2
title: Zero-SSH Web Bootstrap Setup
description: Set up BFFless entirely in the browser with a claim token — no SSH access required after boot
---

# Zero-SSH Web Bootstrap Setup

Every install still needs one command to boot the container stack, but from there you never
have to touch a terminal again: **bootstrap mode** finishes setup entirely in the browser —
claim token, admin account, domain, and SSL certificate — at `https://admin.<your-domain>` or
directly at `https://<server-ip>`. This is the path used by DigitalOcean 1-Click images and
anything else where you'd rather not manage SSH access at all.

If you're following [Quick Start](/getting-started/quickstart) or
[Manual Setup](/getting-started/manual-setup) with `setup.sh`'s normal interactive flow, you
don't need this page — see [Setup Wizard](/getting-started/setup-wizard) for that (admin →
storage → cache → email) wizard instead.

## Starting bootstrap mode

From the server (one SSH session, or none at all if the image boots into this automatically):

```bash
./setup.sh --bootstrap && ./start.sh
```

This skips every domain/SSL/database prompt — it generates infra secrets (Postgres, MinIO,
Redis passwords) and a random **claim token**, then starts the stack cert-less. Everything
else happens in the browser.

## What is the claim token?

The claim token (`ONBOARDING_TOKEN`) gates the wizard on a box that has no other auth yet —
whoever supplies it becomes the instance's first admin. It's a single random hex string,
minted fresh by `setup.sh --bootstrap` (or by `reset-bootstrap.sh` if one wasn't already
present).

### Where to find it

- **Self-managed install:** printed by `setup.sh --bootstrap` when it finishes, and always
  readable afterward from `.env`:

  ```bash
  grep ONBOARDING_TOKEN .env
  ```

- **DigitalOcean droplet:** open the droplet's **Console** from the DigitalOcean control
  panel — the token is shown in the server's login banner.

Paste it into the wizard's **Claim** step. If you instead reached the wizard through a
`?token=...` URL (for example a Platform-provisioned relay link), the Claim step is skipped
automatically — the token was already supplied for you.

## The wizard steps

Bootstrap mode runs a different step sequence than the classic wizard, shown across the top
of the page as you go:

1. **Claim** — paste the claim token (skipped if a `?token=` was already provided).
2. **Admin Account** — create the first administrator, or sign in / adopt an existing session
   as admin.
3. **Domain & SSL** — three phases in one step:
   - **How does traffic reach this server?** — pick a serving path (see below).
   - **Domain / DNS** — enter your domain and confirm DNS points at this server.
   - **Certificate** — issue, paste, or keep a certificate, depending on the serving path.
4. **Storage** — Local Filesystem, MinIO, S3, Google Cloud Storage, or Azure Blob Storage
   (same options as the [classic wizard](/getting-started/setup-wizard#step-2-configure-storage)).
5. **Cache** — In-Memory (LRU) or Redis.
6. **Email** — SMTP, Resend, or skip for now.
7. **Apply** — review the summary and click **Finish setup**. This is the one-way step: it
   applies the domain, switches nginx to the chosen certificate, and restarts the backend
   under its new identity. The page polls and redirects you to `https://admin.<your-domain>`
   once the server comes back up.

### The three serving paths

Picked in step 3, this choice drives everything else in Domain & SSL — the DNS instructions,
the certificate options offered, and how nginx gets configured.

| Path | Choose it when… | Certificate |
| --- | --- | --- |
| **Through Cloudflare** | You want the easiest path to production: free SSL, DDoS protection, and CDN caching, with Cloudflare terminating TLS at its edge. | Paste a free Cloudflare Origin Certificate. Plain HTTP redirects to HTTPS by default (close port 80 instead if you enable Cloudflare's *Always Use HTTPS*). |
| **Through another CDN or WAF** | You're behind Fastly, Bunny, a corporate WAF, or anything else that terminates TLS in front of this server. | Most of these don't validate the origin, so you can keep the server's built-in self-signed certificate with nothing to maintain — or issue Let's Encrypt / paste your own if your front door does validate. |
| **Directly** | Your domain's A record points straight at this server with nothing in front of it. | The server needs a browser-trusted certificate itself: auto-issue with Let's Encrypt (recommended), or paste your own. |

## Recovery

### Start over before Apply

Any time before the final **Finish setup** click, you can reset the wizard's in-progress
state and begin again:

```bash
rm -rf bootstrap/instance.json bootstrap/instance.env
docker compose restart backend nginx
```

This is also the fix if **Finish setup** itself failed partway or you applied the wrong
domain/DNS combination: it's a one-way step, so if you typo'd the domain or DNS wasn't
pointed at the box yet, the server restarts under an identity you can't reach. Running the
commands above over SSH drops it back into bootstrap mode so you can retry in the browser.

### Stuck serving the wizard on your real domain

If nginx ever serves the setup wizard on your **production** domain after certificate files
went briefly missing (the durable self-signed bootstrap marker can outlive the situation that
created it), recover with:

```bash
rm ssl/bootstrap-selfsigned.crt ssl/bootstrap-selfsigned.key
docker compose restart nginx
```

## What's Next?

Once Apply finishes and you land on `https://admin.<your-domain>`, continue with
[First Deployment](/getting-started/first-deployment) to create a repository, generate an API
key, and deploy your first site.

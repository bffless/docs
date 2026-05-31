---
sidebar_position: 4
title: Azure Blob Storage Setup
description: Configure Azure Blob Storage as your storage provider
---

# Azure Blob Storage Setup

This guide explains how to configure Azure Blob Storage as your storage provider for BFFless.

## Prerequisites

- Azure account with an active subscription
- Permissions to create storage accounts (or an existing one)

## Step 1: Create a Storage Account

1. Go to [Azure Portal](https://portal.azure.com/)
2. Search for **Storage accounts** and click **Create**
3. Configure the basics:
   - **Subscription**: Select your subscription
   - **Resource group**: Create new or use existing
   - **Storage account name**: Unique name (e.g., `bfflessstorage123`)
   - **Region**: Choose closest to your users
   - **Performance**: Standard (recommended) or Premium
   - **Redundancy**: Choose based on your needs (see below)
4. Click **Review + create** → **Create**

### Redundancy Options

| Option | Description | Use Case |
|--------|-------------|----------|
| **LRS** | 3 copies in one datacenter | Development, non-critical data |
| **ZRS** | 3 copies across availability zones | Production, high availability |
| **GRS** | 6 copies across two regions | Disaster recovery |
| **GZRS** | ZRS + GRS combined | Mission-critical applications |

## Step 2: Create a Container

1. Open your storage account
2. Go to **Data storage** → **Containers**
3. Click **+ Container**
4. Enter a name (e.g., `bffless-assets`)
5. **Public access level**: Private (BFFless uses SAS URLs)
6. Click **Create**

## Step 3: Configure CORS

BFFless uploads files from the browser directly to Azure Blob Storage using **pre-signed SAS URLs**. The browser sends a `PUT` request to the blob endpoint from your BFFless admin origin (e.g. `https://admin.your-domain.com`), so the storage account must permit cross-origin requests from that origin — otherwise the upload will fail with a CORS error in the browser console even though the account key is valid.

CORS in Azure is configured at the **storage account** level (per service), not per container.

### Apply CORS via the Azure Portal

1. Open your storage account in the [Azure Portal](https://portal.azure.com/)
2. Go to **Settings** → **Resource sharing (CORS)**
3. Select the **Blob service** tab
4. Add a rule:
   - **Allowed origins**: a comma-separated list of origins, e.g. `https://admin.your-domain.com,https://your-domain.com` (no trailing slash, exact scheme + host + port)
   - **Allowed methods**: check `GET`, `HEAD`, `PUT`, `POST` (also `DELETE` only if you need browser-side deletes)
   - **Allowed headers**: `*` — or, to be explicit, list `Content-Type`, `Content-MD5`, `Content-Disposition`, `Authorization`, and `x-ms-*`
   - **Exposed headers**: `*` (or `ETag`, `Content-Length`)
   - **Max age**: `3600`
5. Click **Save**

### Apply CORS via the Azure CLI

```bash
az storage cors add --services b --methods GET HEAD PUT POST --origins https://admin.YOUR-DOMAIN.COM https://YOUR-DOMAIN.COM --allowed-headers '*' --exposed-headers '*' --max-age 3600 --account-name YOUR-ACCOUNT --account-key YOUR-KEY
```

Verify it was applied:

```bash
az storage cors list --services b --account-name YOUR-ACCOUNT --account-key YOUR-KEY
```

:::tip Origin matching
List every origin you serve the admin UI from — including any custom domain, www/non-www variants, and your localhost dev URL if you upload from there. Wildcards in the host part (e.g. `https://*.your-domain.com`) are not supported; list each origin explicitly.

You can use `*` as the origin during testing, but **don't leave it that way in production** — anyone could upload to your container via a leaked SAS URL from any site.
:::

:::caution CORS changes can take a few minutes to propagate
If you still see a CORS error after updating, wait 1–2 minutes and hard-refresh the browser (Cmd/Ctrl-Shift-R) to clear any cached preflight response.
:::

:::note Why `x-ms-*` and not `x-amz-*` / `x-goog-*`?
Azure Blob Storage uses `x-ms-*` headers on SAS PUTs. (The `x-amz-*` headers in the [S3 guide](/storage/aws-s3) only apply to S3-compatible providers, and `x-goog-*` only applies to GCS.)
:::

## Step 4: Get the Account Key

1. Open your storage account
2. Go to **Security + networking** → **Access keys**
3. Click **Show** next to key1
4. Copy the **Storage account name** and **Key**

## Step 5: Configure in BFFless

1. In the BFFless admin, select **Azure Blob Storage** as the storage provider
2. Enter your configuration:
   - **Account Name**: Your storage account name
   - **Container Name**: Your container name
   - **Account Key**: Paste the storage account key
   - **Access Tier**: Hot (recommended for deployment assets)
3. Click **Test Connection & Save**

## Access Tiers

Azure Blob Storage offers different access tiers:

| Tier | Use Case | Storage Cost | Access Cost |
|------|----------|--------------|-------------|
| **Hot** | Frequently accessed | Higher | Lower |
| **Cool** | Infrequent access (30+ days) | Lower | Higher |
| **Cold** | Rare access (90+ days) | Even lower | Even higher |
| **Archive** | Long-term backup | Lowest | Highest + rehydration time |

## Troubleshooting

### "AuthorizationFailure" Error

- Verify the account key is correct
- Check that the storage account exists and is accessible
- Ensure the container exists

### "ContainerNotFound" Error

- Verify the container name is correct
- Check for typos (container names are case-sensitive)
- Ensure the container exists in the storage account

### "AuthenticationFailed" Error

- Account key may be incorrect or rotated
- Check if storage account firewall is blocking access

### "CORS error" / "Access-Control-Allow-Origin" in browser console on upload

Pre-signed SAS uploads are sent directly from the browser to Azure Blob Storage. If the storage account's CORS policy doesn't include your admin origin, the browser blocks the response.

- Confirm Step 3 (Configure CORS) was applied: Portal → storage account → **Resource sharing (CORS)** → **Blob service**, or `az storage cors list --services b --account-name YOUR-ACCOUNT --account-key YOUR-KEY`
- The origin in the error message must appear exactly in the CORS origins list (scheme + host + port, no trailing slash)
- After updating CORS, wait 1–2 minutes and hard-refresh — preflight responses are cached

### Slow Performance

1. **Enable BFFless caching** to reduce blob storage requests
2. **Use a region closer to your users**
3. **Consider Azure CDN** for edge caching

## Security Best Practices

1. **Never commit credentials** to version control
2. **Rotate storage keys** regularly (every 90 days)
3. **Enable soft delete** for accidental deletion protection
4. **Use Private endpoints** for network isolation
5. **Enable Azure Defender for Storage** for threat detection
6. **Enable storage analytics logging** for audit trails
7. **Use customer-managed keys (CMK)** for encryption
8. **Disable public blob access** at the storage account level

## Related Guides

- [Caching Setup](/storage/caching)
- [Migration Guide](/storage/migration-guide)
- [AWS S3 Setup](/storage/aws-s3)
- [Google Cloud Storage Setup](/storage/google-cloud-storage)

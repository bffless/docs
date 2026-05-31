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

## Step 3: Get the Account Key

1. Open your storage account
2. Go to **Security + networking** → **Access keys**
3. Click **Show** next to key1
4. Copy the **Storage account name** and **Key**

## Step 4: Configure in BFFless

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

---
sidebar_position: 3
title: Google Cloud Storage Setup
description: Configure Google Cloud Storage as your storage provider
---

# Google Cloud Storage Setup

This guide explains how to configure Google Cloud Storage (GCS) as your storage provider for BFFless.

## Prerequisites

- Google Cloud Platform (GCP) account
- A GCP project
- Billing enabled on the project

## Step 1: Create a Cloud Storage Bucket

1. Go to [Cloud Storage Console](https://console.cloud.google.com/storage/browser)
2. Click **Create Bucket**
3. Enter a unique bucket name (e.g., `my-bffless-storage`)
4. Choose a **Location type**:
   - **Region**: Single region, lowest latency for that region
   - **Dual-region**: Two regions, better availability
   - **Multi-region**: Multiple regions, highest availability
5. Choose a **Storage class**:
   - **Standard**: Frequently accessed data (recommended)
   - **Nearline**: Accessed less than once a month
   - **Coldline**: Accessed less than once a quarter
   - **Archive**: Accessed less than once a year
6. **Access control**: Choose **Uniform** (recommended)
7. Click **Create**

## Step 2: Configure Bucket CORS

BFFless uploads files from the browser directly to GCS using **pre-signed URLs**. The browser sends a `PUT` request to the bucket from your BFFless admin origin (e.g. `https://admin.your-domain.com`), so the bucket must permit cross-origin requests from that origin — otherwise the upload will fail with a CORS error in the browser console even though the credentials and IAM are correct.

### Apply CORS via `gcloud`

1. Create a file `cors.json`:

   ```json
   [
     {
       "origin": ["https://admin.toshimoto.dev", "https://toshimoto.dev"],
       "method": ["GET", "HEAD", "PUT", "POST"],
       "responseHeader": [
         "Content-Type",
         "Content-MD5",
         "Content-Disposition",
         "x-goog-resumable",
         "x-goog-content-length-range",
         "x-goog-meta-*"
       ],
       "maxAgeSeconds": 3600
     }
   ]
   ```

2. Apply it to your bucket:

   ```bash
   gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=cors.json
   ```

3. Verify it was applied:

   ```bash
   gcloud storage buckets describe gs://YOUR_BUCKET_NAME --format="default(cors_config)"
   ```

### Apply CORS via `gsutil` (legacy)

```bash
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
gsutil cors get gs://YOUR_BUCKET_NAME
```

:::tip Origin matching
List every origin you serve the admin UI from — including any custom domain, www/non-www variants, and your localhost dev URL if you upload from there. Wildcards like `https://*.your-domain.com` are not supported by GCS; list each origin explicitly.

You can use `"*"` to allow any origin during testing, but **don't leave it that way in production** — anyone could upload to your bucket via a leaked pre-signed URL from any site.
:::

:::caution CORS changes can take a few minutes to propagate
If you still see a CORS error after updating, wait 1–2 minutes and hard-refresh the browser (Cmd/Ctrl-Shift-R) to clear any cached preflight response.
:::

## Step 3: Create Service Account Credentials

### Option A: Service Account Key File (Recommended for non-GCP deployments)

Use this when BFFless runs outside GCP (e.g., AWS, DigitalOcean, self-hosted).

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **Create Service Account**
3. Enter a name (e.g., `bffless-storage-sa`)
4. Click **Create and Continue**
5. Add the role: **Storage Admin** (`roles/storage.admin`)

   :::note Why Storage Admin?
   BFFless's connection test reads bucket metadata (`storage.buckets.get`) before reading/writing objects. **Storage Object Admin** alone is not sufficient — it grants `storage.objects.*` but not `storage.buckets.get`, so the test connection will fail with a permission denied error.

   If you need least-privilege, use **Storage Object User** (`roles/storage.objectUser`) instead — it includes both `storage.buckets.get` and object read/write.
   :::

6. Click **Continue** → **Done**
7. Click on the created service account
8. Go to **Keys** tab → **Add Key** → **Create new key**
9. Select **JSON** format
10. Click **Create** - the key file will download automatically
11. **Store this file securely** - it provides access to your bucket

### Option B: Workload Identity (Recommended for GKE)

Use this when BFFless runs on Google Kubernetes Engine.

1. Enable Workload Identity on your GKE cluster
2. Create a Kubernetes service account
3. Create a GCP service account with **Storage Admin** role (see note above on why Object Admin alone isn't enough)
4. Bind the accounts:
   ```bash
   gcloud iam service-accounts add-iam-policy-binding \
     bffless-storage-sa@PROJECT_ID.iam.gserviceaccount.com \
     --role roles/iam.workloadIdentityUser \
     --member "serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]"
   ```

### Option C: Application Default Credentials (for GCE/Cloud Run)

Use this when BFFless runs on Google Compute Engine or Cloud Run.

1. Create a service account with **Storage Admin** role (see note above on why Object Admin alone isn't enough)
2. Attach the service account to your GCE instance or Cloud Run service
3. BFFless will automatically use the attached credentials

## Step 4: Configure in BFFless

### Via Setup Wizard

1. Navigate to the BFFless setup wizard
2. Select **Google Cloud Storage** as storage provider
3. Enter your configuration:
   - **Project ID**: Your GCP project ID
   - **Bucket Name**: Your bucket name
   - **Authentication Method**: Choose one:
     - **Key File**: Upload or paste the JSON key file contents
     - **Credentials JSON**: Paste the JSON credentials object
     - **Application Default Credentials**: For GCE/Cloud Run/GKE
4. Click **Test Connection & Save**

### Via Environment Variables

```bash
# Storage provider type
STORAGE_TYPE=gcs

# GCS Configuration
GCS_PROJECT_ID=my-gcp-project
GCS_BUCKET=my-bffless-storage

# Option 1: Path to key file
GCS_KEY_FILE=/path/to/service-account-key.json

# Option 2: Inline credentials (JSON string)
GCS_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"..."}'

# Option 3: Use Application Default Credentials (no additional config needed)
# Just don't set GCS_KEY_FILE or GCS_CREDENTIALS
```

## Storage Classes

GCS offers different storage classes for cost optimization:

| Class        | Use Case            | Minimum Storage | Retrieval Cost |
| ------------ | ------------------- | --------------- | -------------- |
| **Standard** | Frequently accessed | None            | Free           |
| **Nearline** | Monthly access      | 30 days         | $0.01/GB       |
| **Coldline** | Quarterly access    | 90 days         | $0.02/GB       |
| **Archive**  | Yearly access       | 365 days        | $0.05/GB       |

## Troubleshooting

### "Permission Denied" Error

- Verify the service account has **Storage Admin** (or **Storage Object User**) — **Storage Object Admin alone is not sufficient** because it does not include `storage.buckets.get`
- Check that the bucket name matches exactly
- Ensure the service account is in the correct project
- Verify the key file is valid and not expired

If the error mentions `storage.buckets.get`, the role is the cause — upgrade Object Admin to **Storage Admin**.

### "CORS error" / "Access-Control-Allow-Origin" in browser console on upload

Pre-signed URL uploads are sent directly from the browser to GCS. If the bucket's CORS policy doesn't include your admin origin, the browser blocks the response.

- Confirm Step 2 (Configure Bucket CORS) was applied: `gcloud storage buckets describe gs://YOUR_BUCKET --format="default(cors_config)"`
- The origin in the error message must appear exactly in the CORS `origin` list (scheme + host + port, no trailing slash)
- After updating CORS, wait 1–2 minutes and hard-refresh — preflight responses are cached
- For multi-domain setups, list every origin explicitly (GCS doesn't support wildcards in the host part)

### "Bucket Not Found" Error

- Verify the bucket exists in the GCS console
- Check for typos in the bucket name
- Ensure you're using the correct project ID
- GCS bucket names are globally unique

### "Invalid Credentials" Error

- Verify the key file JSON is valid
- Check that the service account is not disabled
- Ensure the key hasn't been revoked
- Try regenerating the key file

### Slow Performance

1. **Enable BFFless caching** to reduce GCS requests
2. **Choose a region closer to your users**
3. **Use Cloud CDN** for edge caching

## Security Best Practices

1. **Never commit key files** to version control
2. **Use Workload Identity** or **ADC** when running on GCP
3. **Enable uniform bucket-level access** for consistent permissions
4. **Use customer-managed encryption keys (CMEK)** for sensitive data
5. **Enable audit logging** via Cloud Audit Logs
6. **Rotate service account keys** regularly (every 90 days)
7. **Use least-privilege IAM roles** - only grant required permissions
8. **Enable VPC Service Controls** for sensitive workloads

## Related Guides

- [Caching Setup](/storage/caching)
- [Migration Guide](/storage/migration-guide)
- [AWS S3 Setup](/storage/aws-s3)
- [Azure Blob Storage Setup](/storage/azure-blob-storage)

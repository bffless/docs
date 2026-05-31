---
sidebar_position: 2
title: AWS S3 Setup
description: Configure Amazon S3 as your storage provider
---

# AWS S3 Storage Setup

This guide explains how to configure Amazon S3 as your storage provider for BFFless.

## Prerequisites

- AWS Account
- S3 bucket created (or permissions to create one)
- IAM user or role with S3 permissions

## Step 1: Create an S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click **Create bucket**
3. Enter a unique bucket name (e.g., `my-bffless-storage`)
4. Select your preferred region (e.g., `us-east-1`)
5. **Block Public Access**: Keep enabled (BFFless uses presigned URLs)
6. Leave other settings as defaults
7. Click **Create bucket**

### Recommended Bucket Settings

After creation, configure these optional settings:

- **Versioning**: Enable for data protection (optional)
- **Lifecycle Rules**: Set expiration for old versions if versioning is enabled
- **Encryption**: Enable server-side encryption (SSE-S3 or SSE-KMS)

## Step 2: Configure Bucket CORS

BFFless uploads files from the browser directly to S3 (or your S3-compatible bucket) using **pre-signed URLs**. The browser sends a `PUT` request to the bucket from your BFFless admin origin (e.g. `https://admin.your-domain.com`), so the bucket must permit cross-origin requests from that origin — otherwise the upload will fail with a CORS error in the browser console even though the credentials and IAM are correct.

### Apply CORS via the AWS CLI

1. Create a file `cors.json`:

   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": [
           "https://admin.YOUR-DOMAIN.COM",
           "https://YOUR-DOMAIN.COM"
         ],
         "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
         "AllowedHeaders": [
           "Content-Type",
           "Content-MD5",
           "Content-Disposition",
           "Authorization",
           "x-amz-*"
         ],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
   }
   ```

2. Apply it to your bucket:

   ```bash
   aws s3api put-bucket-cors --bucket YOUR-BUCKET-NAME --cors-configuration file://cors.json
   ```

3. Verify it was applied:

   ```bash
   aws s3api get-bucket-cors --bucket YOUR-BUCKET-NAME
   ```

### Apply CORS via the S3 Console

1. Open your bucket in the [S3 Console](https://s3.console.aws.amazon.com/)
2. Go to **Permissions** → scroll down to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and paste the `CORSRules` JSON above
4. Click **Save changes**

:::tip Origin matching
List every origin you serve the admin UI from — including any custom domain, www/non-www variants, and your localhost dev URL if you upload from there. Wildcards in the host part (e.g. `https://*.your-domain.com`) are not supported; list each origin explicitly.

You can use `"*"` as the origin during testing, but **don't leave it that way in production** — anyone could upload to your bucket via a leaked pre-signed URL from any site.
:::

:::caution CORS changes can take a few minutes to propagate
If you still see a CORS error after updating, wait 1–2 minutes and hard-refresh the browser (Cmd/Ctrl-Shift-R) to clear any cached preflight response.
:::

### DigitalOcean Spaces

The DigitalOcean control panel doesn't accept a CORS JSON — you add one rule at a time via the UI. Repeat the steps below for every origin (admin domain, public domain, localhost dev URL, etc.).

1. Open your Space in the [DigitalOcean control panel](https://cloud.digitalocean.com/spaces)
2. Go to **Settings** → scroll down to **CORS Configurations** → click **Add**
3. Fill in the **Advanced CORS Options** dialog:
   - **Origin**: a single origin, e.g. `https://admin.your-domain.com` (no trailing slash, exact scheme + host + port)
   - **Allowed Methods**: check `GET`, `PUT`, `POST`, `HEAD` (also `DELETE` only if you need browser-side deletes)
   - **Allowed Headers**: click **+ Add Header** and enter `*` — or, to be explicit, add `Content-Type`, `Content-MD5`, `Content-Disposition`, `Authorization`, and `x-amz-*` as separate headers
   - **Access Control Max Age**: `3600`
4. Click **Save CORS Configuration**
5. Click **Add** again to create a rule for each additional origin

:::note Why `x-amz-*` and not `x-goog-*`?
DigitalOcean Spaces speaks the S3 protocol, so pre-signed PUTs carry `x-amz-*` headers. (The `x-goog-*` headers in the [GCS guide](/storage/google-cloud-storage) only apply to Google Cloud Storage.)
:::

### Other S3-Compatible Providers

| Provider | How to apply CORS |
|----------|-------------------|
| **Cloudflare R2** | Dashboard → R2 → your bucket → **Settings** → **CORS Policy** → paste the `CORSRules` JSON above |
| **Backblaze B2** | `b2 update-bucket --corsRules '[{...}]' YOUR-BUCKET allPrivate` (B2 uses a slightly different rule schema — see [B2 docs](https://www.backblaze.com/docs/cloud-storage-cross-origin-resource-sharing-rules)) |
| **Wasabi** | Use the AWS CLI command above with `--endpoint-url https://s3.{region}.wasabisys.com` |
| **MinIO** | `mc anonymous set-json cors.json myminio/YOUR-BUCKET` — or configure via the MinIO console |

## Step 3: Create IAM Credentials

### Option A: IAM User (Recommended for non-AWS deployments)

Use this option when BFFless is deployed outside AWS (e.g., DigitalOcean, self-hosted).

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Users** → **Create user**
3. Enter a username (e.g., `bffless-storage-user`)
4. Click **Next**
5. Select **Attach policies directly**
6. Click **Create policy** (opens in a new tab)
7. In the policy editor, click the **JSON** tab (top right of the Policy editor)
8. Delete the default content and paste the [IAM Policy JSON below](#iam-policy)
9. Click **Next**
10. Enter a policy name (e.g., `bffless-s3-access`)
11. Click **Create policy**
12. Return to the user creation tab and click the **refresh icon** (⟳) next to "Create policy"
13. Search for your policy name (e.g., `bffless-s3-access`) and check the box to select it
14. Click **Next** → **Create user**
15. Click on the new user → **Security credentials** tab → **Create access key**
16. Select **Application running outside AWS** → **Next**
17. **Save the Access Key ID and Secret Access Key** (the secret is shown only once)

### Option B: IAM Role (Recommended for AWS deployments)

Use this option when BFFless runs on AWS (EC2, ECS, Lambda, EKS).

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Roles** → **Create role**
3. Select the appropriate trusted entity:
   - **EC2**: For EC2 instances
   - **ECS Task**: For ECS/Fargate containers
   - **Lambda**: For Lambda functions
4. Attach the policy below
5. Name the role (e.g., `bffless-storage-role`)
6. Assign the role to your AWS resource

## IAM Policy

Minimum required permissions for BFFless:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BFFlessStorageAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectAttributes",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

## Step 4: Configure in BFFless

### Via Setup Wizard

1. Navigate to the BFFless setup wizard
2. Select **AWS S3** as storage provider
3. Enter your configuration:
   - **Region**: Your bucket's region (e.g., `us-east-1`)
   - **Bucket Name**: Your bucket name
   - **Access Key ID**: From Step 2 (if using IAM user)
   - **Secret Access Key**: From Step 2 (if using IAM user)
4. Click **Test Connection & Save**

### Via Environment Variables

```bash
# Storage provider type
STORAGE_TYPE=s3

# S3 Configuration
S3_REGION=us-east-1
S3_BUCKET=my-bffless-storage
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Using S3-Compatible Services

BFFless supports S3-compatible services like DigitalOcean Spaces, Backblaze B2, Cloudflare R2, and Wasabi.

### Provider-Specific Settings

| Provider | Endpoint | Path Style | Notes |
|----------|----------|------------|-------|
| **DigitalOcean Spaces** | `https://{region}.digitaloceanspaces.com` | No | Region examples: `nyc3`, `sfo3`, `ams3` |
| **Backblaze B2** | `https://s3.{region}.backblazeb2.com` | Yes | Get endpoint from B2 bucket settings |
| **Cloudflare R2** | `https://{account-id}.r2.cloudflarestorage.com` | Yes | Find account ID in Cloudflare dashboard |
| **Wasabi** | `https://s3.{region}.wasabisys.com` | No | Region examples: `us-east-1`, `eu-central-1` |
| **MinIO** | `https://your-minio-server:9000` | Yes | Self-hosted MinIO instance |

### Example: DigitalOcean Spaces

```
Region: nyc3
Bucket: my-space-name
Endpoint: https://nyc3.digitaloceanspaces.com
Access Key ID: (from DO API settings)
Secret Access Key: (from DO API settings)
Force Path Style: No
```

:::tip Don't forget CORS
DigitalOcean Spaces requires CORS rules configured via the control panel UI (one rule per origin) before browser uploads will work. See [Step 2 → DigitalOcean Spaces](#digitalocean-spaces).
:::

### Example: Cloudflare R2

```
Region: auto
Bucket: my-r2-bucket
Endpoint: https://abc123.r2.cloudflarestorage.com
Access Key ID: (from R2 API tokens)
Secret Access Key: (from R2 API tokens)
Force Path Style: Yes
```

## Troubleshooting

### "Access Denied" Error

- Verify the IAM policy is attached to your user/role
- Check that the bucket name in the policy matches exactly
- Ensure the region is correct
- If using IAM role, verify the role is attached to your AWS resource

### "Bucket Not Found" Error

- Verify the bucket exists in the S3 console
- Check for typos in the bucket name
- Remember: S3 bucket names are globally unique
- Ensure you're using the correct region

### "Invalid Credentials" Error

- Verify Access Key ID and Secret Access Key are correct
- Check that the IAM user/role is active (not deleted)
- Ensure no extra whitespace in credentials

### Slow Performance

1. **Enable caching** in BFFless settings to reduce S3 requests
2. **Use a region closer to your users** for lower latency
3. **Consider CloudFront CDN** for edge caching

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use IAM roles** instead of access keys when running on AWS
3. **Enable bucket versioning** for data protection
4. **Enable server-side encryption** (SSE-S3 or SSE-KMS)
5. **Keep Block Public Access enabled** - BFFless uses presigned URLs
6. **Rotate access keys regularly** (every 90 days recommended)
7. **Use least-privilege IAM policies** - only grant required permissions

## Related Guides

- [Caching Setup](/storage/caching)
- [Migration Guide](/storage/migration-guide)
- [Google Cloud Storage Setup](/storage/google-cloud-storage)
- [Azure Blob Storage Setup](/storage/azure-blob-storage)

---
sidebar_position: 1
title: Overview
description: Automate deployments using the BFFless GitHub Actions
---

# GitHub Actions CI/CD

Automate static asset deployments using the official BFFless GitHub Actions.

## Available Actions

| Action                                                                          | Description                                         |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`bffless/upload-artifact`](/deployment/github-actions/upload-artifact)         | Upload build artifacts to BFFless                   |
| [`bffless/download-artifact`](/deployment/github-actions/download-artifact)     | Download deployed artifacts from BFFless            |
| [`bffless/compare-screenshots`](/deployment/github-actions/compare-screenshots) | Visual regression testing against BFFless baselines |
| [`bffless/compare-coverage`](/deployment/github-actions/compare-coverage)       | Code coverage regression detection                  |
| [`bffless/deploy-proxy-rules`](/deployment/github-actions/deploy-proxy-rules)   | Build, validate and push proxy rule sets from source |

## Setup

Both actions require the same authentication setup.

### 1. Get Your API Key

1. Go to your BFFless admin panel (`https://admin.yourdomain.com`)
2. Navigate to Settings → API Keys
3. Create a new API key
4. Copy the key (it won't be shown again)

### 2. Configure GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions:

| Type     | Name              | Value                          |
| -------- | ----------------- | ------------------------------ |
| Variable | `BFFLESS_URL`     | `https://admin.yourdomain.com` |
| Secret   | `BFFLESS_API_KEY` | Your API key                   |

## Quick Example

A typical CI/CD workflow using both actions:

```yaml
name: Deploy and Test

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - run: npm ci && npm run build

      # Upload the build
      - uses: bffless/upload-artifact@v1
        with:
          path: dist
          api-url: ${{ vars.BFFLESS_URL }}
          api-key: ${{ secrets.BFFLESS_API_KEY }}
          alias: production

  e2e-test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      # Download the deployed build
      - uses: bffless/download-artifact@v1
        with:
          source-path: dist
          api-url: ${{ vars.BFFLESS_URL }}
          api-key: ${{ secrets.BFFLESS_API_KEY }}
          alias: production

      - run: npx serve dist & npx playwright test
```

## Next Steps

- [Upload Artifact Action](/deployment/github-actions/upload-artifact) - Deploy builds to BFFless
- [Download Artifact Action](/deployment/github-actions/download-artifact) - Retrieve deployed builds
- [Compare Screenshots Action](/deployment/github-actions/compare-screenshots) - Visual regression testing
- [Compare Coverage Action](/deployment/github-actions/compare-coverage) - Code coverage regression detection
- [Deploy Proxy Rules Action](/deployment/github-actions/deploy-proxy-rules) - Sync proxy rule sets from source

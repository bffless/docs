---
sidebar_position: 5
title: First Deployment
description: Create your first repository, generate an API key, and deploy your first site
---

# First Deployment

<YouTubeEmbed id="fGYmvUqhGYk" title="BFFless: First Deployment Walkthrough" />

After completing the setup wizard, follow these steps to deploy your first site.

## 1. Create Your First Repository

Repositories organize your deployed assets by project. Each repository can have multiple deployments (commits) and aliases (like `production`, `staging`).

<img src="/img/first-deployment-create-repo.png" alt="Create Repository dialog showing Owner and Repository Name fields" className="screenshot" />

1. From the dashboard, click **Create Repository**
2. Enter the **Owner** - your GitHub organization or username
3. Enter the **Repository Name** - your GitHub repository name
4. Click **Create Repository**

:::tip Match Your GitHub Repository
Use the exact same owner and repo names as your GitHub repository (e.g., `github.com/acme/my-app` → Owner: `acme`, Repo: `my-app`). This keeps deployments organized and makes it easy to match them to source code.
:::

## 2. Generate an API Key

API keys authenticate your CI/CD pipeline to upload assets to this repository.

<img src="/img/first-deployment-create-api-key.png" alt="API Keys tab in repository settings showing Create API Key button" className="screenshot" />

1. Open your repository and go to **Settings** (in the breadcrumb navigation)
2. Click the **API Keys** tab
3. Click **Create API Key**
4. Give it a descriptive name (e.g., `github-actions`)
5. **Copy the key immediately** - it won't be shown again!

:::warning Save Your API Key
The API key is only displayed once when created. If you lose it, you'll need to generate a new one.
:::

## 3. Set Up GitHub Actions

Add the BFFless GitHub Action to automatically deploy on every push.

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to BFFless

on:
  push:
    branches: [main]
  workflow_dispatch: # Allow manual triggers

concurrency:
  group: deploy
  cancel-in-progress: false # Ensure deployments run in order

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to BFFless
        uses: bffless/upload-artifact@v1
        with:
          path: dist
          api-url: ${{ vars.BFFLESS_URL }}
          api-key: ${{ secrets.BFFLESS_API_KEY }}
          alias: production
```

👉 **[View full example workflow](https://github.com/bffless/demo/blob/main/.github/workflows/main-deploy.yml)** - See the complete demo deployment workflow

### Add a PR Preview Workflow

Add a second workflow to deploy a preview build for every pull request. Each PR gets its own alias (e.g. `pr-42`) so reviewers can open the live changes before merging.

Create `.github/workflows/pr-preview.yml`:

```yaml
name: Preview to BFFless

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write # Allow the action to comment the preview URL on the PR

jobs:
  build-and-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy preview to BFFless
        uses: bffless/upload-artifact@v1
        with:
          path: dist
          api-url: ${{ vars.BFFLESS_URL }}
          api-key: ${{ secrets.BFFLESS_API_KEY }}
          alias: pr-${{ github.event.pull_request.number }}
          description: 'Preview for PR #${{ github.event.pull_request.number }}'
          pr-comment: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

The action will create the `pr-<number>` alias on first run and update it on every subsequent push to the PR. With `pr-comment: true` (defaults to `false`) and `github-token` wired in, it also posts/updates a comment on the PR with the preview URL. `permissions: pull-requests: write` alone isn't enough — you must pass the token explicitly.

### Add Secrets and Variables to GitHub

:::warning Required Configuration
You must configure both a secret and a variable in your GitHub repository for the workflow to work.
:::

1. Go to your GitHub repository
2. Navigate to **Settings > Secrets and variables > Actions**

**Add the Secret** (for your API key):

1. Click the **Secrets** tab
2. Click **New repository secret**
3. Name: `BFFLESS_API_KEY`
4. Value: Paste your API key from step 2
5. Click **Add secret**

**Add the Variable** (for your BFFless URL):

1. Click the **Variables** tab
2. Click **New repository variable**
3. Name: `BFFLESS_URL`
4. Value: `https://admin.yourdomain.com` (replace with your actual domain)
5. Click **Add variable**

### Trigger Your First Deployment

Push a commit to the `main` branch to trigger the workflow:

```bash
git add .
git commit -m "Add BFFless deployment"
git push origin main
```

## What's Next?

After your workflow runs successfully, your deployment will appear in BFFless.

👉 **[Viewing Deployments](/getting-started/viewing-deployments)** - Browse files, set up aliases, and configure custom domains

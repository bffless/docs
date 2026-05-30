---
slug: /
sidebar_position: 1
title: Welcome to BFFless
description: Self-hosted static site hosting platform with authentication, A/B testing, and reverse proxy capabilities
---

<YouTubeEmbed id="luQMEUYzsUQ" title="BFFless - Static site hosting made simple" />

# Welcome to BFFless

BFFless is a self-hosted platform for hosting static assets and build artifacts from CI/CD pipelines. Deploy your React SPAs, Vue apps, coverage reports, and Storybook builds with built-in authentication, traffic splitting, and reverse proxy capabilities.

## Quick Start

Get BFFless running in under 5 minutes with our step-by-step guide.

<a href="/getting-started/quickstart" class="button button--primary button--lg">Get Started →</a>

## Key Features

- **Static Site Hosting** - Upload and serve static files from CI/CD pipelines
- **Authentication** - Built-in user auth with SuperTokens (sessions + API keys)
- **A/B Testing** - Split traffic between deployments for experiments
- **Reverse Proxy** - Route API requests without CORS configuration
- **Custom Domains** - Map your domains to deployments with automatic SSL
- **Share Links** - Share private content without requiring login

## Architecture

```mermaid
flowchart LR
    subgraph CI/CD
        GHA[GitHub Actions]
    end

    subgraph BFFless
        API[Upload API]
        nginx[nginx]
        Backend[Backend]
        DB[(PostgreSQL)]
        Storage[(Storage<br/>S3/MinIO/GCS/Azure)]
    end

    subgraph Users
        Browser[Browser]
    end

    GHA -->|upload assets| API
    API --> Storage
    API --> DB

    Browser -->|request| nginx
    nginx --> Backend
    Backend --> DB
    Backend --> Storage
    Backend -->|serve content| nginx
```

## Documentation Sections

| Section                                               | Description                             |
| ----------------------------------------------------- | --------------------------------------- |
| [Getting Started](/getting-started/quickstart)        | Installation and setup guides           |
| [Features](/features/traffic-splitting)               | A/B testing, share links, proxy rules   |
| [Deployment](/deployment/overview)                    | Deploy to production                    |
| [Configuration](/configuration/environment-variables) | Environment variables and settings      |
| [Storage](/storage/overview)                          | Configure storage backends              |
| [Reference](/reference/api)                           | API docs, architecture, database schema |

## Need Help?

- [Troubleshooting Guide](/troubleshooting) - Common issues and solutions
- [GitHub Issues](https://github.com/bffless/ce/issues) - Report bugs or request features

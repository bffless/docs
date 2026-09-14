---
sidebar_position: 1
title: API Reference
description: REST API documentation for BFFless
---

# API Reference

REST API documentation for BFFless.

## Interactive Documentation

Full interactive API documentation is available via Swagger UI:

- **Local Development**: http://localhost:3000/api/docs
- **Production**: https://admin.yourdomain.com/api/docs

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication testing

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:3000` |
| Production | `https://admin.yourdomain.com` |

## Authentication

### Session Authentication (Web)

For browser-based access, use session cookies obtained from login:

```
Cookie: sAccessToken=...; sIdRefreshToken=...
```

### API Key Authentication (CI/CD)

For programmatic access, include the API key header:

```
X-API-Key: your-api-key
```

## Endpoints Overview

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | None | Register new user |
| POST | `/api/auth/signin` | None | Login user |
| POST | `/api/auth/signout` | Session | Logout user |
| GET | `/api/auth/session` | Session | Get session info |
| POST | `/api/auth/session/from-app-token` | App token (`auth:session`) | Exchange an app token for a session |

### Assets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/assets/upload` | API Key | Upload asset(s) |
| GET | `/api/assets/:id` | Session | Get asset metadata |
| DELETE | `/api/assets/:id` | Session | Delete asset |

### Projects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | Session | List projects |
| POST | `/api/projects` | Session | Create project |
| GET | `/api/projects/:id` | Session | Get project details |
| PATCH | `/api/projects/:id` | Session | Update project |
| DELETE | `/api/projects/:id` | Session | Delete project |

### Deployments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/deployments` | Session | List deployments |
| POST | `/api/deployments` | API Key | Create deployment |
| GET | `/api/deployments/:id` | Session | Get deployment |
| DELETE | `/api/deployments/:id` | Session | Delete deployment |

### Deployment Aliases

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/aliases` | Session | List aliases |
| POST | `/api/aliases` | Session | Create alias |
| PATCH | `/api/aliases/:id` | Session | Update alias |
| DELETE | `/api/aliases/:id` | Session | Delete alias |

### API Keys

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/api-keys` | Session | List API keys |
| POST | `/api/api-keys` | Session | Create API key |
| DELETE | `/api/api-keys/:id` | Session | Revoke API key |

### App Tokens

Project-bound bearer credentials with scopes — see [App Tokens](/features/app-tokens/).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/app-tokens` | Session | List your tokens (paged, active only unless `includeInactive=true`) |
| POST | `/api/app-tokens` | Session | Mint a token (`name`, `project`, `scopes`, `expiresAt` or `neverExpires`) |
| DELETE | `/api/app-tokens/:id` | Session | Revoke a token |

### OAuth 2.1 (admin host)

The built-in authorization server — see [Authentication](/configuration/authentication/#built-in-oauth-21-authorization-server).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/.well-known/oauth-authorization-server` | None | Server metadata (RFC 8414) |
| POST | `/api/oauth/register` | None | Dynamic client registration (RFC 7591) |
| GET | `/api/oauth/authorize` | Session (consent) | Authorization request (PKCE S256 + `resource` required) |
| POST | `/api/oauth/token` | None | `authorization_code` / `refresh_token` grants |
| POST | `/api/oauth/revoke` | None | Revoke a token (RFC 7009) |

### Public Access

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/public/:owner/:repo/:ref/*` | None | Access public asset |
| GET | `/repo/:owner/:repo/:sha/*` | Optional | Access asset by SHA |
| GET | `/repo/:owner/:repo/alias/:alias/*` | Optional | Access asset by alias |

### Setup

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/setup/status` | None | Check setup status |
| POST | `/api/setup/complete` | None | Complete initial setup |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Health check |

## Common Endpoints

### Upload Asset

Upload one or more files to the platform.

```http
POST /api/assets/upload
X-API-Key: your-api-key
Content-Type: multipart/form-data
```

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | File(s) to upload |
| `owner` | String | Yes | Repository owner |
| `repo` | String | Yes | Repository name |
| `commitSha` | String | Yes | Git commit SHA |
| `branch` | String | No | Git branch name |
| `workflowName` | String | No | GitHub workflow name |
| `workflowRunId` | String | No | GitHub workflow run ID |

**Example (cURL):**

```bash
curl -X POST https://admin.yourdomain.com/api/assets/upload \
  -H "X-API-Key: your-api-key" \
  -F "file=@screenshot.png" \
  -F "owner=myorg" \
  -F "repo=myrepo" \
  -F "commitSha=abc123def456"
```

**Response:**

```json
{
  "success": true,
  "assets": [
    {
      "id": "uuid",
      "fileName": "screenshot.png",
      "storageKey": "myorg/myrepo/abc123def456/screenshot.png",
      "mimeType": "image/png",
      "size": 12345,
      "url": "/repo/myorg/myrepo/abc123def456/screenshot.png"
    }
  ]
}
```

### Get Session Info

Get information about the current authenticated user.

```http
GET /api/auth/session
Cookie: sAccessToken=...
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### List Projects

Get all projects accessible to the current user.

```http
GET /api/projects
Cookie: sAccessToken=...
```

**Response:**

```json
{
  "projects": [
    {
      "id": "uuid",
      "owner": "myorg",
      "name": "myrepo",
      "displayName": "My Repository",
      "isPublic": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Access Public Asset

Access a publicly available asset without authentication.

```http
GET /repo/:owner/:repo/:sha/*path
```

**Example:**

```bash
curl https://www.yourdomain.com/repo/myorg/myrepo/abc123/coverage/index.html
```

## Error Responses

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

## Rate Limiting

API requests may be rate-limited to prevent abuse.

- Default: 100 requests per minute per IP
- Upload endpoints: 10 requests per minute per API key

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## GitHub Action Usage

Upload assets from GitHub Actions workflows:

```yaml
name: Upload Test Artifacts
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: bffless/ce@v1
        with:
          api-url: ${{ secrets.BFFLESS_URL }}
          api-key: ${{ secrets.BFFLESS_API_KEY }}
          files: |
            coverage/**/*.html
            test-results/**/*.png
```

### Action Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `api-url` | Yes | BFFless API URL |
| `api-key` | Yes | API key for authentication |
| `files` | Yes | Glob patterns for files to upload |
| `owner` | No | Override repository owner |
| `repo` | No | Override repository name |
| `commit-sha` | No | Override commit SHA |
| `alias` | No | Create deployment alias |

## Pagination

List endpoints support pagination:

```http
GET /api/projects?page=1&limit=20
```

**Parameters:**

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | 1 | - | Page number (1-indexed) |
| `limit` | 20 | 100 | Items per page |

**Response includes:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

## Filtering and Sorting

Many list endpoints support filtering and sorting:

```http
GET /api/projects?owner=myorg&sort=createdAt&order=desc
```

Refer to Swagger documentation for available filters on each endpoint.

## Related Documentation

- [Authentication](/configuration/authentication) - Auth configuration
- [Architecture](/reference/architecture) - System architecture
- [Security](/reference/security) - Security model

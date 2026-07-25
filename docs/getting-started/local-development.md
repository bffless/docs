---
sidebar_position: 8
title: Local Development
description: Set up a development environment for BFFless
---

# Local Development

Set up a development environment to contribute to BFFless.

## Prerequisites

- Node.js 18+ (20 LTS recommended)
- pnpm 8+
- Docker Desktop

## Quick Setup

```bash
# Clone repository
git clone https://github.com/bffless/ce.git
cd ce

# Install dependencies
pnpm install

# Set up environment file
cp .env.example .env

# Generate encryption key (required)
ENCRYPTION_KEY=$(openssl rand -base64 32)
sed -i.bak "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
rm .env.bak

# Start everything (runs migrations automatically)
pnpm dev:full
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:3000/api/docs |
| MinIO Console | http://localhost:9001 |

**MinIO Credentials:** minioadmin / minioadmin

## Development Commands

### Starting Services

```bash
# All-in-one (recommended)
pnpm dev:full

# Or individually:
pnpm dev:services    # Start PostgreSQL + MinIO
pnpm dev             # Start backend + frontend
```

### Managing Services

```bash
pnpm dev:services:logs      # View service logs
pnpm dev:services:stop      # Stop services
pnpm dev:services:restart   # Restart services
```

### Running Tests

```bash
# All tests
pnpm test

# Backend tests
cd apps/backend
pnpm test              # All tests with coverage
pnpm test:watch        # Watch mode
pnpm test:e2e          # E2E tests

# Frontend tests
cd apps/frontend
pnpm test              # Vitest unit tests
pnpm test:ui           # Vitest UI
pnpm test:e2e          # Playwright E2E
pnpm test:e2e:ui       # Playwright UI mode
```

### Type Checking

```bash
# Frontend
pnpm --filter frontend exec tsc --noEmit

# Backend
pnpm --filter backend exec tsc --noEmit
```

### Building

```bash
pnpm build           # All apps
pnpm build:backend   # Backend only
pnpm build:frontend  # Frontend only
```

## Database Operations

This project uses Drizzle ORM with a schema-first approach.

```bash
cd apps/backend

# Generate migrations from schema changes
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (database UI)
pnpm db:studio

# Stop Drizzle Studio
pnpm db:studio:stop
```

**Important:** Never write manual SQL migrations. Always modify the TypeScript schema files in `src/db/schema/` and generate migrations.

## Project Structure

```
bffless/
├── apps/
│   ├── backend/           # NestJS API server
│   │   ├── src/
│   │   │   ├── auth/      # Authentication (SuperTokens)
│   │   │   ├── storage/   # Storage adapters
│   │   │   ├── assets/    # Asset management
│   │   │   └── db/schema/ # Database schemas
│   │   └── drizzle/       # Generated migrations
│   │
│   └── frontend/          # React SPA (Vite)
│       └── src/
│           ├── components/
│           ├── pages/
│           ├── store/     # Redux store
│           └── services/  # RTK Query APIs
│
├── packages/
│   └── github-action/     # GitHub Action
│
└── docker/                # Docker configurations
```

## Common Workflows

### Adding a New API Endpoint

1. Create/update controller in `apps/backend/src/{module}/`
2. Add DTOs with `class-validator` decorators
3. Update Swagger docs with `@ApiOperation()`, `@ApiResponse()`
4. Add RTK Query endpoint in `apps/frontend/src/services/{module}Api.ts`

### Adding a Database Table

1. Create schema file: `apps/backend/src/db/schema/{name}.schema.ts`
2. Export from `apps/backend/src/db/schema/index.ts`
3. Generate migration: `cd apps/backend && pnpm db:generate`
4. Apply migration: `pnpm db:migrate`

### Running a Single Test

```bash
# Backend (Jest)
cd apps/backend
pnpm test -- storage.adapter.spec

# Frontend (Vitest)
cd apps/frontend
pnpm test -- Button.spec

# Frontend E2E (Playwright)
cd apps/frontend
pnpm test:e2e -- tests/upload.spec.ts
```

## Environment Variables

Configuration is in `.env` at the project root. The backend loads this file automatically.

| Variable | Description | Required |
|----------|-------------|----------|
| `ENCRYPTION_KEY` | Encrypts storage credentials in DB | Yes |
| `DATABASE_URL` | PostgreSQL connection | Has default for local dev |
| `JWT_SECRET` | SuperTokens JWT secret | Auto-generated |
| `API_KEY_SALT` | API key hashing salt | Auto-generated |

For local development, only `ENCRYPTION_KEY` needs to be set. See `.env.example` for all available options.

**Frontend note:** The Vite dev server proxies `/api` requests to the backend, so no frontend `.env` is needed for local development.

## Docker Development

```bash
# Build production images
pnpm docker:build

# Start production stack
pnpm docker:up

# View logs
pnpm docker:logs

# Reset everything
pnpm docker:reset:full
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000
lsof -i :5173

# Kill the process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Ensure services are running
pnpm dev:services

# Check logs
pnpm dev:services:logs
```

### Fresh Start

```bash
# Stop everything
pnpm dev:services:stop

# Remove node_modules
rm -rf node_modules apps/*/node_modules

# Reinstall
pnpm install

# Restart
pnpm dev:full
```

## Next Steps

- Review the [Architecture](/reference/architecture) documentation
- Check the [API Reference](/reference/api) for endpoint details

# CLAUDE.md

Guidance for Claude Code when working in `bffless/docs` (formerly `docs-public`) — the public-facing Docusaurus site for BFFless Community Edition, served at docs.bffless.dev (legacy: docs.bffless.app).

The site's proxy rules (blog-post likes API) are managed as code in `.bffless/proxy-rules/api-backend/` and synced to the `bffless/docs` project on admin.bffless.dev by the deploy workflow. Edit rules there, never in the dashboard.

See `README.md` for site setup and the workspace-level `../../CLAUDE.md` for cross-repo context.

## Agent skills

### Issue tracker

Issues are tracked in this repo's **GitHub Issues** (via the `gh` CLI); external PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

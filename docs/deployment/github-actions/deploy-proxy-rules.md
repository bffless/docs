---
sidebar_position: 6
title: Deploy Proxy Rules
description: Build, validate and push BFFless proxy rule sets from source using GitHub Actions
---

# Deploy Proxy Rules Action

The [`bffless/deploy-proxy-rules`](https://github.com/bffless/deploy-proxy-rules) action builds, validates and pushes [proxy rule sets](/features/proxy-rules) from source. It is the CI counterpart to the `bffless rules push` CLI command: point it at one or more rule-set directories (each containing a `ruleset.yaml`), and it validates, compiles and syncs them to your BFFless project.

:::info Requires BFFless CE >= 0.2.0
The proxy-rule-set sync endpoint (`PUT /api/proxy-rule-sets/project/:projectId/sync`) this action calls ships in that version.
:::

:::warning TypeScript handlers need a `linux-x64` runner
Handlers written in TypeScript (`code: ./handler.fn.ts`) are compiled with esbuild, and this action ships an esbuild binary for `linux-x64` only — so run it on `ubuntu-latest` (or any `linux-x64` runner). Rule sets whose handlers are all `.fn.js` use no compiler and run on any runner. To run on another platform, set `ESBUILD_BINARY_PATH` on the step to an esbuild binary of the matching version.
:::

## Use Cases

- Keeping proxy rules in Git and syncing them to BFFless on merge (rules as code)
- Deploying API routes alongside the frontend that calls them
- Per-PR preview rule sets that don't clobber production's
- Dry-run diffs of proxy rule changes as a PR check

## Quick Start

Sync a rule set on every push to `main` (typically run alongside [`bffless/upload-artifact`](/deployment/github-actions/upload-artifact) deploying the app itself):

```yaml
- uses: bffless/deploy-proxy-rules@v1
  with:
    path: rule-sets/api
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-project
```

Only 3 required inputs (`path`, `api-url`, `api-key`).

Multiple rule-set directories can be synced in one step — separate them with commas or newlines:

```yaml
- uses: bffless/deploy-proxy-rules@v1
  with:
    path: |
      rule-sets/api
      rule-sets/webhooks
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-project
```

## Deploy Order

This action only syncs *proxy rules* — it doesn't touch your app's static files. In a job that deploys both, run this action **before** [`bffless/upload-artifact`](/deployment/github-actions/upload-artifact) and attach the synced rule set to the app's alias by name, so the API routes exist before (or at the same moment as) the frontend that calls them goes live:

```yaml
- uses: bffless/deploy-proxy-rules@v1
  id: rules
  with:
    path: rule-sets/api
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-project

- uses: bffless/upload-artifact@v1
  with:
    path: dist
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    alias: production
    proxy-rule-set-names: ${{ steps.rules.outputs.rule-set-names }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `path` | **Yes** | - | One or more rule-set directories (comma or newline separated), each containing `ruleset.yaml` |
| `api-url` | **Yes** | - | Base URL of the BFFless hosting platform |
| `api-key` | **Yes** | - | API key for authentication (`X-API-Key` header) |
| `project` | No | - | Target project (UUID, `owner/name`, or bare name). Falls back to `.bffless/config.json` `project` |
| `prune` | No | `false` | Delete rules/schemas on the server that are absent from source |
| `dry-run` | No | `false` | Compute and report the sync without pushing changes |
| `name-suffix` | No | - | Suffix appended to each rule set name on push (pushes `<name>-<suffix>`) |
| `strict-schemas` | No | `false` | Fail on schema warnings instead of only reporting them |
| `working-directory` | No | `.` | Working directory for resolving relative paths |
| `summary` | No | `true` | Write a GitHub Step Summary |
| `summary-title` | No | `Proxy Rules Sync` | Title for the step summary |
| `pr-comment` | No | `false` | Post/update a comment on the PR with sync details |
| `comment-header` | No | 🔀 BFFless Proxy Rules | Custom header for the PR comment |
| `github-token` | No | `github.token` | GitHub token for posting PR comments |

## Outputs

| Output | Description |
|--------|-------------|
| `rule-set-ids` | Comma-separated rule set IDs, in the order of `path`. Empty for a set that doesn't exist yet on a dry run. |
| `rule-set-names` | Comma-separated rule set names, post-suffix |
| `changed` | `"true"` if any rule set had created/updated/deleted non-empty |
| `report` | JSON: `[{name, dir, response: SyncResponse}]` |

### Using Outputs

```yaml
- uses: bffless/deploy-proxy-rules@v1
  id: rules
  with:
    path: rule-sets/api
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-project

- run: |
    echo "Rule set IDs: ${{ steps.rules.outputs.rule-set-ids }}"
    echo "Changed: ${{ steps.rules.outputs.changed }}"
```

## Examples

### PR Preview with a Per-PR Rule Set

`name-suffix` renames the synced set to `<name>-<suffix>` so each PR gets its own live rule set instead of clobbering production's:

```yaml
jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write # required for pr-comment
    steps:
      - uses: actions/checkout@v4

      - uses: bffless/deploy-proxy-rules@v1
        with:
          path: rule-sets/api
          api-url: ${{ vars.BFFLESS_URL }}
          api-key: ${{ secrets.BFFLESS_API_KEY }}
          project: my-project
          name-suffix: pr-${{ github.event.pull_request.number }}
          pr-comment: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

:::note Cleanup
This action only creates/updates/prunes rules *within* a set — it never deletes the rule set itself, so a PR-preview set outlives the PR unless something else removes it. There's no CLI/action command for that yet; until there is, wire a `pull_request: types: [closed]` job that calls `DELETE /api/proxy-rule-sets/:id` directly (with `${{ secrets.BFFLESS_API_KEY }}` and the rule set ID captured from this action's `rule-set-ids` output when the preview was first created).
:::

:::note Multiple commenting invocations on the same PR
If you run more than one `deploy-proxy-rules` step with `pr-comment: true` on the same PR (in the same job or across multiple jobs), give each a distinct `name-suffix`. The PR-comment marker is keyed on `name-suffix` (not `comment-header`), so steps sharing a `name-suffix` (or both leaving it unset) will overwrite each other's comment instead of posting separately.
:::

### Dry Run

`dry-run: true` computes and reports the diff without pushing changes — useful as a PR check before the real sync happens on merge. Nothing is written; the `report` output and step summary both say so:

```yaml
- uses: bffless/deploy-proxy-rules@v1
  with:
    path: rule-sets/api
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-project
    dry-run: true
```

Step summary output looks like:

> ## Proxy Rules Sync
>
> ### api
>
> 2 created, 1 updated, 0 deleted, 3 unchanged (dry run — nothing written)
>
> | rule | change |
> | --- | --- |
> | GET /api/items | + |
> | POST /api/items | + |
> | GET /api/items/:id | ~ |

### Git as the Source of Truth

`prune: true` deletes rules and schemas on the server that are absent from source, so the repository fully defines the rule set:

```yaml
- uses: bffless/deploy-proxy-rules@v1
  with:
    path: .bffless/proxy-rules/api-backend
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-org/my-project
    prune: true
```

## How It Works

For each directory in `path` (in order):

1. **Validates** the rule set (`ruleset.yaml` + `rules/**/*.rule.yaml`) — validation errors fail the run immediately; warnings are logged and don't stop the sync
2. **Compiles** the rule set with the same compiler `bffless rules build` uses, applying `name-suffix` to the set's name if provided. TypeScript handlers (`.fn.ts`) are bundled to JavaScript with esbuild at this point; `.fn.js` handlers are used as-is
3. **Syncs** via `PUT /api/proxy-rule-sets/project/:projectId/sync`, honoring `prune`, `dry-run` and `strict-schemas`
4. **Sets outputs** from the collected results (`rule-set-ids`, `rule-set-names`, `changed`, `report`)
5. **Writes a Step Summary** (unless `summary: false`) with a per-set change report
6. **Posts/updates a PR comment** (if `pr-comment: true`) with the same report, upserted by a marker keyed on `name-suffix`

Sets are processed **in order** and the run **fails fast**: if a later set fails validation or the sync call, earlier sets that already synced successfully stay synced (push is idempotent, so re-running the action after fixing the bad set is safe).

`missingSecrets` on a synced set (a schema references a secret the project hasn't set yet) is a warning, not a failure — the run still succeeds.

## Troubleshooting

### Sync Failed - 401 Unauthorized

- Verify your API key is correct
- Check the key hasn't been revoked
- Ensure `BFFLESS_API_KEY` secret is set

### Sync Failed - 404 Not Found

- Verify `BFFLESS_URL` is correct and includes the protocol (`https://`)
- Check your BFFless instance is running **CE >= 0.2.0** — the sync endpoint ships in that version
- Verify the `project` input matches an existing project (UUID, `owner/name`, or bare name)

### Project Not Resolved

- Pass the `project` input explicitly, or
- Commit a `.bffless/config.json` with a `project` field for the action to fall back to

### esbuild Fails on a Non-Linux Runner

- TypeScript handlers (`.fn.ts`) require the vendored `linux-x64` esbuild binary — run the action on `ubuntu-latest`
- Alternatively set `ESBUILD_BINARY_PATH` on the step to an esbuild binary matching the bundled version
- Rule sets whose handlers are all `.fn.js` are unaffected and run on any platform

---
sidebar_position: 7
title: Proxy Rules as Code
description: Author proxy rule sets as YAML + TypeScript files in git and sync them with CI
---

# Proxy Rules as Code

This recipe shows how to author [proxy rules](/features/proxy-rules) as ordinary files in a git repository instead of only through the admin UI — one YAML manifest per route, handler bodies as real `.fn.ts`/`.fn.js` files you can lint and unit-test, and a CLI that compiles the directory back into the same export format the dashboard's Import already accepts. It's built around the [`bffless` npm package](https://github.com/bffless/ce/blob/main/packages/cli/README.md) and the [`bffless/deploy-proxy-rules`](https://github.com/bffless/deploy-proxy-rules) GitHub Action.

:::note Requires CE >= 0.2.0
Live sync (`rules push`/`diff` and the `deploy-proxy-rules` action) calls the proxy-rule-set sync endpoint (`PUT /api/proxy-rule-sets/project/:projectId/sync`), which ships in CE 0.2.0+. `rules build`/`validate`/`test` work against any CE version since they only compile and lint files locally.
:::

## Overview

Today, a rule set normally lives only in the database, edited through the admin UI or an AI-agent MCP session — no history, no code review, no local testing, no diff against what's live. This workflow turns a rule set into a directory:

1. **Author** routes as YAML manifests under `rules/`, derived from their filesystem path (Next.js-router-style), with handler code as real `.fn.ts`/`.fn.js` files beside them.
2. **Build** compiles the directory into the same `bffless-proxy-rule-set` export JSON the dashboard already understands, running the same lint checks the CE sandbox enforces at execution time.
3. **Test** runs declarative fixtures against handlers in a `node:vm` harness — no live instance required.
4. **Sync** pushes the compiled output to a live project, either from your machine or a CI job, so the API routes exist before (or at the same moment as) the frontend that calls them goes live.

## Prerequisites

- Node.js 18+ (no global install required — every command below can run via `npx`).
- A BFFless project you can reach with an API key (**Settings → API Keys**).
- CE **0.2.0 or newer** on the target instance if you plan to sync (`rules push`) rather than just build/validate/test locally.

```bash
npx bffless rules build          # one-off, no install
npm i -g bffless                 # or: pnpm add -D bffless
```

## Adopting an Existing Rule Set

Already have a rule set built through the dashboard or an MCP session? Bring it into git without hand-authoring anything, using `rules pull --decompile`:

- **From a live instance:** `npx bffless rules pull <set-name> --decompile` resolves the set within your configured project and decompiles its export straight to the authoring layout (a live pull always decompiles; `--decompile` is accepted for compatibility but is a no-op here).
- **From a dashboard export:** download the set's export JSON, then `npx bffless rules pull --from-file ./export.json --decompile` decompiles that file instead — `--decompile` is required in this form.

Either way, the authoring layout lands at `.bffless/proxy-rules/<ruleSet.name>/` by default (`-o <dir>` to choose another location, `--force` to overwrite a non-empty one) — `ruleset.yaml`, one manifest per route under `rules/`, and a sibling `.fn.js` for any rule with a `function_handler` step. From there, `rules build`/`validate`/`test` (below) work exactly the same as on a hand-authored layout.

Commit the result, then add a `.bffless/config.json` so every command resolves the rule set and target project without repeating flags — `apiUrl`, `project`, and a `ruleSets` glob array (full precedence rules in [Syncing to a Live Instance](#syncing-to-a-live-instance) below). It's safe to commit: the API key is only ever read from the `BFFLESS_API_KEY` environment variable, never from `config.json`.

## Directory Layout & Rule Manifests

A rule set is any directory containing a `ruleset.yaml`. By convention it lives at `.bffless/proxy-rules/<set-name>/`:

```
.bffless/
  config.json                        # { apiUrl?, project?, ruleSets? } — no secrets, committable
  proxy-rules/
    api/
      ruleset.yaml                   # set metadata: { name, description?, environment? }
      schemas/                       # pipeline schemas, referenced by name (never by UUID) — omit if unused
      rules/
        api/
          items/
            get.rule.yaml            # GET /api/items — single-file form, no code needed
          transform/
            post/                    # directory form — chosen because this rule has a code file
              rule.yaml              # POST /api/transform
              transform.fn.ts        # function_handler body, real lintable TypeScript
              transform.fn.test.yaml # declarative fixtures for transform.fn.ts
      dist/                          # written by `rules build`; gitignored
        api.proxy-rules.json
```

The path segments under `rules/` **are** the route: a literal segment is a literal path segment, and a trailing `[...name]/` directory becomes a trailing `*` (e.g. `rules/api/items/[...path]/any.rule.yaml` compiles to `pathPattern: /api/items/*`). The filename stem (`get`, `post`, `any`, …) sets the HTTP method; `any.rule.yaml` takes a `methods:` array for a multi-method rule. Set `pathPattern:` explicitly in the manifest when a pattern can't be expressed as a directory path (a mid-segment wildcard, or anything not starting with `/`).

A minimal `rule.yaml` using the `pipeline:` authoring sugar to wire up a `function_handler` step:

```yaml
# rules/api/transform/post/rule.yaml
description: Tag inbound payloads with their source before forwarding
pipeline:
  steps:
    - name: transform
      handler: function_handler
      code: ./transform.fn.ts
```

`proxyType` is inferred as `pipeline` because a `pipeline:` block is present, and `targetUrl` defaults to `http://internal/pipeline` — no need to set either explicitly. Every other manifest key (`timeout`, `stripPrefix`, `preserveHost`, `forwardCookies`, `headerConfig`, …) has the same defaults as the dashboard form; see the [full manifest reference](https://github.com/bffless/ce/blob/main/packages/cli/docs/reference.md#rule-manifest-reference-ruleyaml--ruleyaml) for the complete key table.

:::caution Secrets are never committed
`headerConfig.add` values (e.g. `Authorization`) must be committed as **empty-string placeholders** — `rules build`/`validate` hard-error on a non-empty value with `secret values must not be committed; use empty-string placeholders`. A literal `{{secrets.NAME}}` placeholder is fine in other string fields (`targetUrl`, a pipeline step's `config`); the compiler only collects the referenced names, it never resolves them.
:::

## TypeScript Handlers

A `code:` reference ending `.ts` is compiled with esbuild into a self-contained bundle, so you can write `function_handler` bodies as real TypeScript with relative imports instead of one flat `.fn.js` file:

```ts
// rules/api/transform/post/transform.fn.ts
import type { HandlerContext } from 'bffless/handlers';

export default function handler(ctx: HandlerContext) {
  const body = (ctx.request?.body as Record<string, unknown>) ?? {};
  return { ...body, source: 'bffless-proxy-rules-as-code' };
}
```

Authoring contract:

- The entry file must `export default function handler(ctx) {...}` (or `export function handler(ctx) {...}`) — a build-time error if neither is present.
- Imports must be **relative** (`./`/`../`) and stay **confined to the rule set directory**; a bare specifier (e.g. `import { z } from 'zod'`) or a path that escapes the set directory is a build error naming the offending specifier. There is no `node_modules` resolution — every import must be a sibling file inside the set.
- `import type { ... }` from `bffless/handlers` (`HandlerContext`, `HandlerRequest`, `HandlerUtils`, `Handler`) is a type-only import, erased before bundling, so it never needs to resolve to a file on disk.
- **No typechecking happens at build time** — esbuild transpiles the syntax away but never runs `tsc`; a type error in a `.fn.ts` file will *not* fail `rules build`. Run your own `tsc --noEmit` over the rule set directory in CI/editor if you want that guarantee.
- The bundled output is run through the same prohibited-pattern lint as a `.fn.js` file, so an *imported* util that touches `process.env` (for example) fails the build even though the raw `.fn.ts` source looks clean — the lint only sees the final bundle.
- `rules pull --decompile` never regenerates TypeScript — it only ever writes `.fn.js`. Pulling into a directory that already has hand-authored `.fn.ts` files prints a warning (it doesn't block).

## Local Workflow: Build, Validate, Test

```console
$ npx bffless rules build .bffless/proxy-rules/api
/path/to/project/.bffless/proxy-rules/api/dist/api.proxy-rules.json
2 rules, 0 schemas, 0 secrets referenced

$ npx bffless rules validate .bffless/proxy-rules/api
$ echo $?
0

$ npx bffless rules test .bffless/proxy-rules/api
1 passed, 0 failed
```

`build`, `validate`, and `test` all accept `[dirs...]`; with no arguments they resolve rule sets from the nearest `.bffless/config.json`'s `ruleSets` glob array. A fixture file for the handler above:

```yaml
# rules/api/transform/post/transform.fn.test.yaml
handler: ./transform.fn.ts
cases:
  - name: tags the payload with its source
    data: { request: { body: { name: 'ada' } } }
    expect: { result: { name: 'ada', source: 'bffless-proxy-rules-as-code' } }
```

`rules test` runs these through the same `node:vm` harness as `bffless/harness`'s `runHandlerFile` — no live instance, no Vitest required. A thrown error names the original `.fn.ts` file; run with `NODE_OPTIONS=--enable-source-maps` for line-accurate stack traces through the bundle.

`bffless rules validate` also runs the shared handler lint (`eval`, `Function`/`new Function`, `require`, dynamic `import()`, `process.*`, `.__proto__`, `Buffer(...)`, and a missing `handler` export) — the same checks the `bffless/eslint` flat-config preset gives your editor, and what a CI pipeline should gate on.

## Local Dev Loop

`bffless rules dev [dirs...]` watches one or more rule-set directories and reruns build → validate → test on every change without leaving the terminal, resolving `[dirs...]` the same way every other `rules` command does (explicit paths, or the nearest `.bffless/config.json`'s `ruleSets` globs when none are given):

```bash
npx bffless rules dev .bffless/proxy-rules/api
```

It's local-first by default — no network. Plain `rules dev` never makes an HTTP call; it only compiles (writing `dist/`, exactly like `rules build`), validates, and runs `*.fn.test.yaml` fixtures. Changes under a set's own `dist/` directory are ignored, so the loop's build output never re-triggers itself.

Per changed set, one pass runs:

1. `rules build` (compile) — a compile error stops the pass here.
2. `rules validate` — any error stops the pass here (warnings don't).
3. `rules test` (`*.fn.test.yaml` fixtures) — any failed case stops the pass here.

Every pass — green or not — prints one timestamped status line, and editing one set's files only reruns that set (200ms debounce per set, so a burst of saves coalesces into a single rerun):

```
[12:01:03] api ✓ build ✓ validate ✓ 3 tests
[12:01:07] api ✗ build: rules/api/x/post.rule.yaml: code file not found: missing.js
```

A red pass is logged and the loop keeps watching — nothing exits the process except Ctrl-C.

**`--push` (opt-in, requires `--name-suffix`).** Only a fully green pass is eligible to push, and passing `--push` without `--name-suffix` is a startup error — dev mode is never allowed to sync to a set's bare (live) name:

```bash
npx bffless rules dev --push --name-suffix dev-yourname .bffless/proxy-rules/api
```

With both flags, every fully green pass additionally runs the equivalent of `rules push --name-suffix <suffix>`, so the synced copy always lives at `<name>-<suffix>` — the same preview-deploy pattern used in [PR previews and cleanup](#pr-previews-and-cleanup) below — never the production name. `--api-url`/`--api-key`/`--project` behave exactly as they do for `rules push`/`pull`/`diff`.

## Syncing to a Live Instance

`.bffless/config.json` (`{ apiUrl?, project?, ruleSets? }`) is safe to commit — it never holds secrets:

```json
{
  "apiUrl": "https://your-bffless-instance.com",
  "project": "my-project",
  "ruleSets": [".bffless/proxy-rules/*"]
}
```

Auth and config precedence:

| Setting | Precedence |
|---|---|
| API URL | `--api-url` flag > `BFFLESS_API_URL` env > `config.json`'s `apiUrl` |
| API key | `--api-key` flag > `BFFLESS_API_KEY` env only — **never** read from `config.json` |
| Project | `--project` flag > `config.json`'s `project` (UUID, `owner/name`, or bare name) |

```bash
export BFFLESS_API_KEY=your-api-key   # never commit this
npx bffless rules push .bffless/proxy-rules/api
npx bffless rules diff .bffless/proxy-rules/api   # exit 0 in-sync, 1 drift, 2 error — CI-safe
```

## CI/CD with GitHub Actions

[`bffless/deploy-proxy-rules`](https://github.com/bffless/deploy-proxy-rules) is the CI counterpart to `rules push`: it validates, compiles, and syncs one or more rule-set directories in a single step. Run it **before** [`bffless/upload-artifact`](/deployment/github-actions/upload-artifact) in the same job and attach the synced rule set to the app's alias by name, so the API routes exist before (or at the same moment as) the frontend calls them:

```yaml
- name: Sync proxy rules to BFFless
  uses: bffless/deploy-proxy-rules@v1
  id: rules
  with:
    path: .bffless/proxy-rules/api
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-project

- name: Deploy app to BFFless
  uses: bffless/upload-artifact@v1
  with:
    path: dist
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    alias: production
    proxy-rule-set-names: ${{ steps.rules.outputs.rule-set-names }}
```

Sets are processed in the order given in `path` and the run fails fast, but earlier sets that already synced stay synced (the sync is idempotent, so re-running after fixing a later set is safe). `prune: true` deletes rules/schemas on the server that are absent from source; `dry-run: true` reports the diff (created/updated/deleted/unchanged, plus a per-rule table) without writing anything — useful as a PR check before merge.

### PR previews and cleanup

`name-suffix` renames the synced set to `<name>-<suffix>` so each PR gets its own live rule set instead of clobbering production's:

```yaml
- uses: bffless/deploy-proxy-rules@v1
  with:
    path: .bffless/proxy-rules/api
    api-url: ${{ vars.BFFLESS_URL }}
    api-key: ${{ secrets.BFFLESS_API_KEY }}
    project: my-project
    name-suffix: pr-${{ github.event.pull_request.number }}
    pr-comment: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

The action only creates/updates/prunes rules *within* a set — it never deletes the set itself, so a preview set outlives its PR unless a `pull_request: types: [closed]` job tears it down. There's no CLI command for that yet, so wire the delete directly against the API, resolving the rule set id by name. `OWNER`/`REPO` below are literal placeholders for your repo's org/name — everything else (`my-org/my-project`, `api-pr-$N`) is a running example value to substitute with your own:

:::note Project lookup needs owner/name (or a UUID)
`GET /api/projects/:id` only accepts the project's UUID. Resolving by name over the raw API needs the two-segment route, `GET /api/projects/:owner/:name` (e.g. `my-org/my-project`) — unlike the CLI's `--project`/`config.json`'s `project`, which also accept a bare name.
:::

```yaml
on:
  pull_request:
    types: [closed]
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Delete preview alias and rule set
        env:
          URL: ${{ vars.BFFLESS_URL }}
          KEY: ${{ secrets.BFFLESS_API_KEY }}
          N: ${{ github.event.pull_request.number }}
        run: |
          set -euo pipefail
          # Alias first — the rule set 409s on delete while attached.
          code=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -H "X-API-Key: $KEY" "$URL/api/repo/OWNER/REPO/aliases/preview-pr-$N")
          [ "$code" = "204" ] || [ "$code" = "404" ] || exit 1   # 204 deleted, 404 never existed — both fine
          project_id=$(curl -sf -H "X-API-Key: $KEY" "$URL/api/projects/my-org/my-project" | jq -r '.id')
          set_id=$(curl -sf -H "X-API-Key: $KEY" "$URL/api/proxy-rule-sets/project/$project_id" | jq -r --arg n "api-pr-$N" '.ruleSets[] | select(.name==$n) | .id')
          [ -z "$set_id" ] && exit 0
          curl -sf -X DELETE -H "X-API-Key: $KEY" "$URL/api/proxy-rule-sets/$set_id"
```

See [`bffless/apps`'s `cleanup-preview-reader.yml`](https://github.com/bffless/apps/blob/main/.github/workflows/cleanup-preview-reader.yml) for the pattern this is drawn from.

### Drift check

Since the dashboard can still edit a synced set directly, a scheduled job keeps git the source of truth by failing when live drifts from what's authored:

```yaml
on:
  schedule:
    - cron: '23 6 * * *'
  workflow_dispatch:
jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - env:
          BFFLESS_API_URL: ${{ vars.BFFLESS_URL }}
          BFFLESS_API_KEY: ${{ secrets.BFFLESS_API_KEY }}
        run: npx --yes bffless@^0.1.0 rules diff --project my-project 2>&1 | tee "$GITHUB_STEP_SUMMARY"
```

`rules diff` exits `1` on drift, which fails the job so the team notices manual dashboard edits to a git-managed set.

## Revisions & Rollback

The server keeps the last 20 revisions of a rule set automatically, captured on every sync, import, or dashboard edit. The dashboard's **History** panel lists them with a **Restore** action.

:::note Requires bffless CLI >= 0.2.0
The two commands below ship in the same release train as this page but aren't in the CLI package version documented above yet.
:::

`bffless rules revisions <set>` lists a rule set's captured revisions, newest first. `bffless rules rollback <set> [--to <revisionId>] [--dry-run]` restores one — defaulting to the newest non-current revision when `--to` is omitted. Rollback never renames or recreates the set, and a rollback is itself a new revision (history only ever moves forward, like `git revert`).

One caveat carries over from restoring any previously deleted rule: secret header values can't be restored, so a rolled-back rule loses them — the CLI/dashboard change report warns about it.

## Troubleshooting

**Git and live have drifted.** Run `rules diff <dir>` — it exits `1` when live differs from what's authored (`0` in sync, `2` on error) and prints the same created/updated/deleted/unchanged breakdown as `push --dry-run`. Reconcile with `rules push` (git wins); if a dashboard edit should actually be kept, fold it into the manifest by hand first, then push.

**Dashboard shows a "Managed from git" warning.** Editing a synced rule set directly in the dashboard doesn't block the edit or clear its `source` — it warns that the next `rules push`/CI sync will overwrite whatever you just changed, since git stays the source of truth. Run `rules pull` first if you want to capture the dashboard edit back into the authoring layout instead of losing it.

**Sync fails with a 400 on a "methods-split" rule set.** Known limitation: if a live rule set has multiple rules sharing the same `pathPattern`, distinguished only by their `methods:` lists rather than consolidated into one `any.rule.yaml`, `rules push`/`diff` can't address them individually yet and errors rather than guessing. Consolidate that path onto a single `methods:` rule via the dashboard (or split it onto distinct paths) before syncing.

**Push reports missing secrets.** A non-empty `missingSecrets` in the sync response (the CLI prints a `MISSING SECRETS (…)` line) means a `{{secrets.NAME}}` placeholder referenced by the set has no matching value on the target project yet. It's a warning, not a failure — `push` still exits `0` — set the named secret in the project's **Settings → Secrets**.

**A PR-preview rule set is still live after the PR closed.** The action only manages rules *inside* the suffixed set — it never deletes the set or the alias pointing at it. Wire the [PR previews and cleanup](#pr-previews-and-cleanup) job above, deleting the **alias first, then the set** — the rule set 409s on delete while an alias still references it.

## Related

- [Proxy Rules](/features/proxy-rules) — the underlying feature these files compile into
- [`bffless/upload-artifact`](/deployment/github-actions/upload-artifact) — deploys the app itself, run alongside `deploy-proxy-rules`
- Full CLI reference: [`packages/cli/docs/reference.md`](https://github.com/bffless/ce/blob/main/packages/cli/docs/reference.md)

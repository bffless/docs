# Context

## Open issues

!`gh issue list --state open --label ready-for-agent --limit 100 --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

The list above is filtered to issues labelled `ready-for-agent` and is the sole source of truth for what work exists. Do not run your own unfiltered query to find more issues — if the list is empty, there is nothing to do.

## Current epic

!`gh pr list --state open --base main --label epic --json number,headRefName,title --jq '.[] | "EPIC: PR #\(.number) · branch \(.headRefName) · \(.title)"'`

The line above (if any) is the **master PR** and its **epic branch**. This run's **BASE branch** is:

- **If an epic branch is shown → BASE = that epic branch.** You branch off it, PR into it, and (on green CI) auto-merge into it. The master PR stays open and accumulates; you never merge it.
- **If empty → BASE = `main` (legacy mode).** Open a PR into `main` for human review; do **not** auto-merge and do **not** close the issue. (See "Starting an epic" if you think one should exist.)

## Recent Sandcastle commits (last 10)

!`git log --oneline --grep="SANDCASTLE" -10`

# Task

You are an autonomous documentation agent working in `bffless/docs-public` — the public-facing **Docusaurus** site for BFFless Community Edition (docs.bffless.app). You implement **one** ready issue per run and land it on the **epic branch** (or open a review PR in legacy mode). The single **master PR** (epic → `main`) is the only thing a human reviews; you never merge it and never touch `main` or production.

## Domain knowledge

This repo's agent conventions live in `docs/agents/`:

- **`docs/agents/issue-tracker.md`** — issues are GitHub Issues, managed with the `gh` CLI. PRs are **not** a triage surface.
- **`docs/agents/triage-labels.md`** — the triage label vocabulary (`ready-for-agent`, etc.).
- **`docs/agents/domain.md`** — before exploring, read `CONTEXT.md` and `docs/adr/` at the repo root **if they exist** (proceed silently if not), and use the glossary's vocabulary in your output.

The site itself is a standard Docusaurus 3 project (React 19, `@docusaurus/preset-classic`, Mermaid theme):

- **Content** lives in `docs/` (Markdown/MDX, organised by section: `getting-started/`, `features/`, `deployment/`, `configuration/`, `storage/`, `recipes/`, `reference/`, plus `troubleshooting.md`) and `blog/`.
- **Navigation** is defined in `sidebars.ts`; site config (navbar, footer, plugins) in `docusaurus.config.ts`.
- **Custom UI** (React components, CSS) lives in `src/`; static assets in `static/`.
- Each doc page has frontmatter (`id`, `title`, `sidebar_position`, etc.). When you add or rename a page, update `sidebars.ts` and any internal links so the build's broken-link checker stays green.

This is a **static site — there is no backend, no `/api/*`, and no proxy rules.** Do not invent a deploy step beyond the PR; preview and production deploys are fully automated by GitHub Actions (see Workflow step 9 and Promotion).

## Workflow

1. **Pick** — choose the highest-priority `ready-for-agent` issue **not blocked by another open issue**. Prefer factual corrections and broken-link/build fixes, then missing-doc additions, then clarifications/polish, then restructures.
2. **Sync BASE** — fetch and base off the BASE branch from the Context block above:
   - `git fetch "https://x-access-token:${GH_TOKEN}@github.com/bffless/docs-public.git" <BASE>`
   - `git switch -c sandcastle/issue-<N>-<short-slug> FETCH_HEAD`
3. **Explore** — read the issue carefully, pull in any referenced PRD, and read the relevant doc pages, `sidebars.ts`, `docusaurus.config.ts`, and any `src/` components before writing. Follow `docs/agents/domain.md` for `CONTEXT.md` / ADRs.
4. **Plan** — decide the smallest change that resolves the issue.
5. **Execute** — make the minimal change. For **content**: correct frontmatter, fix/verify internal links, add sidebar entries for new pages, keep MDX valid, and match the surrounding doc's voice and structure. For **code** (`src/` components, config): keep it tight; if tests exist, follow Red → Green → Refactor. No commented-out code or leftover TODOs.
6. **Verify** — run the site's checks and fix any failures before continuing:
   - `pnpm typecheck` — TypeScript across config and `src/`.
   - `pnpm build` — a full Docusaurus production build. This is the key gate: it compiles all MDX and runs the **broken-link checker**, so a green build proves pages render and links resolve. Treat any build error or broken-link warning as a failure to fix before continuing.
7. **Screenshot (visual/UI changes only — skip for pure content edits)** — verify your change renders cleanly in a real headless browser. The build output is static, so serve it and shoot:
   - Serve the build in the background: `pnpm serve --no-open --port 3000 &` (serves `build/` from step 6; wait until it responds).
   - Screenshot the affected page(s) in **both** color modes — the dark variant is part of this redesign, so it must be checked every time: `node scripts/shot.mjs http://localhost:3000/<path> --out .sandcastle/screenshots/<name>-light.png --full` and again with `--dark` → `<name>-dark.png`. `shot.mjs` exits non-zero on console errors or failed (4xx/5xx) requests — treat that as a failure: fix and re-shoot.
   - You cannot judge aesthetics — that's the human's job on the preview URL (step 10). Your bar here is **mechanical**: page renders, no console errors, no failed requests, both modes load. `.sandcastle/screenshots/` is gitignored; note in the PR body which pages/modes you smoke-checked.
   - Stop the server when done.
8. **Branch + commit** — single commit on your `sandcastle/issue-<N>-<short-slug>` branch. Message MUST start with `SANDCASTLE:` and include the issue number, the key decisions, and the files changed (e.g. `SANDCASTLE: paper/ink/terracotta design tokens + brand fonts (#71)`).
9. **Push** — `origin` is SSH but the sandbox has `GH_TOKEN` (HTTPS). Push over HTTPS; don't reconfigure the remote:
   - `git push "https://x-access-token:${GH_TOKEN}@github.com/bffless/docs-public.git" HEAD:sandcastle/issue-<N>-<short-slug>`
10. **Open the story PR — base = BASE branch** (the epic branch, or `main` in legacy mode):
    - `gh pr create --base <BASE> --head sandcastle/issue-<N>-<short-slug> --title "SANDCASTLE: <summary> (#<N>)" --body "<what changed, why, how verified, which pages/modes smoke-checked>. Refs #<N>"`
    - The PR triggers `pr-preview.yml`, which builds the site and deploys it to the **`docs-preview`** alias, then comments a live preview URL. Reference it in the PR body — this is the surface a human uses to review look-and-feel.
11. **Land it (epic mode only) — auto-merge on green CI, then close the issue:**
    - Wait for checks: `gh pr checks <pr> --watch --fail-fast`.
    - If green: `gh pr merge <pr> --squash --delete-branch`.
    - Then close the issue (GitHub won't auto-close from a non-`main` base): `gh issue close <N> --comment "Landed on <BASE> via <pr-url>"`. This unblocks the next story in the chain.
    - If CI is **red** and you can't fix it: leave the PR open, comment the failure on the issue, and stop — do not merge.
    - **Legacy mode (BASE = `main`):** do NOT merge and do NOT close — a human reviews. Just comment the PR link on the issue.

## Rules

- **One issue per run.**
- **Never merge the master PR**, never push to `main`, and never `git push` to the epic branch directly (go through your story PR). Those are the human's gate.
- In **epic mode** you MAY squash-merge **your own story PR into the epic branch** once CI is green, and you MUST then close the issue. In **legacy mode** you may do neither.
- **Never force-push.**
- A green `pnpm build` (no broken links) is mandatory before opening the PR.
- If blocked (missing context, unfixable build/links, ambiguous requirements), don't merge — comment the blocker on the issue and stop.

## Starting an epic (one-time, usually a human)

If a batch of `ready-for-agent` issues shares a PRD/epic and no epic branch exists:

1. `git switch -c epic/<feature> main` and push it.
2. Open a **draft** master PR into `main`, labelled **`epic`**, titled `EPIC: <feature>` — body links the PRD. Leave it open; it accumulates every story.
3. The agents discover it via the Context block and take over.

## Promotion (human, at the end)

When the epic's stories are all landed and validated on the preview URL:

1. Review and **merge the master PR** into `main`.
2. The push to `main` triggers `main-deploy.yml`, which builds and deploys to the **`docs-production`** alias (docs.bffless.app) automatically. No manual deploy step.

# Done

When you have landed the story (epic mode) or opened the review PR (legacy mode) — or determined there is no actionable issue, or you are blocked — output the completion signal:

<promise>COMPLETE</promise>

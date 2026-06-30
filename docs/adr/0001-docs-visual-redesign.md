---
status: accepted
date: 2026-06-30
---

# Rebrand docs.bffless.app onto the bffless.app "paper" identity by theming Docusaurus

To make `docs.bffless.app` feel like one property with the marketing site at `bffless.app`, we are redesigning the docs to the landing site's visual identity (warm **Paper** / **Ink** / **Terracotta**, with **Fraunces** / **Inter** / **JetBrains Mono**; tokens in `repos/platform/sites/landing`). We are doing this by **deeply theming the existing Docusaurus site** rather than rebuilding on the landing's Vite/Tailwind stack — Docusaurus is fully themeable via Infima CSS variables + swizzled components, and rebuilding would throw away search, MDX, versioning, the blog, the existing `pr-preview.yml` / `main-deploy.yml` CI, and the Sandcastle agent setup (all of which assume `pnpm build` of Docusaurus).

## Considered Options

- **Theme Docusaurus deeply** (chosen) — override CSS vars, swizzle navbar/sidebar/footer/layout, load brand fonts, add a dark variant.
- **Rebuild on the landing's stack** (Vite + React + Tailwind) — maximum control, but reimplements docs infrastructure and rewires CI + Sandcastle. Rejected as disproportionate to a "look and feel" goal.
- **Hybrid** (custom marketing homepage + themed docs) — rejected because the marketing homepage already lives at `bffless.app`; the docs are a subdomain and need no landing page of their own.

## Consequences

- **No custom homepage.** `docs/index.md` is restyled as the entry page; the navbar/logo link back to `bffless.app` so the two sites read as one property.
- **A dark variant must be designed.** The landing is light-only, so the dark palette has no upstream source — it is designed fresh (warm charcoal surfaces, paper-tone text, terracotta accent) and is the one genuinely new piece of design. The light/dark toggle is kept because dark mode is near table-stakes for developer docs.
- **Scope is visual/brand only.** Sidebar structure, page URLs, and content are unchanged this pass; the `pnpm build` broken-link gate enforces that links don't move. Information-architecture work, if any, is a separate later effort.
- **Typography is the primary brand carrier** (no hero page): Fraunces on H1 only, Inter for H2–H6 and body, JetBrains Mono for code.
- **Decorative kit stays on the chrome and components** (navbar, sidebar, footer, cards, callouts, code frames, tables, the eyebrow above each H1) — the reading column stays calm.
- **Execution is a Sandcastle epic.** The concrete design spec is authored here (with the `impeccable` skill); the agent implements spec-heavy `ready-for-agent` issues on an epic branch; Playwright is re-added to the docs Sandcastle image so the agent can run a screenshot smoke-gate; a human reviews each PR's `docs-preview` deploy for aesthetic correctness, since the agent cannot judge taste.

See [`CONTEXT.md`](../../CONTEXT.md) for the brand vocabulary and `docs/design-system.md` (to be authored as the first epic story) for concrete tokens and per-component specs.

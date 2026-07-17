# docs-public Design System

The implementation spec for theming Docusaurus to the **bffless.dev** identity. Sandcastle agents implement each redesign story against this file; humans review the result on the `docs-preview` deploy. This file is **excluded from the published site** (see `docusaurus.config.ts` → `docs.exclude`).

Vocabulary (Paper, Ink, Terracotta, Meta-label, Corner marks, Rule, Chrome, Reading column) is defined in [`/CONTEXT.md`](../CONTEXT.md). The decision record is [ADR-0001](./adr/0001-docs-visual-redesign.md).

> **Source of truth for the look:** `repos/platform/sites/landing` (`tailwind.config.js`, `src/index.css`, `index.html`). When a value here and the landing disagree, the landing wins for light mode — except where this file overrides for **accessibility** (contrast) or to avoid an **anti-pattern** (see "Guardrails").

---

## 0. Identity preservation (read first)

The warm "paper" background is a **committed brand color** carried over from bffless.dev — not an invented palette. The usual advice that "cream/sand backgrounds read as AI-default" does **not** apply here: matching the existing brand is the goal. Keep the paper/ink/terracotta system as specified. Do **not** "improve" it into a white or gray theme.

The one genuinely new design is the **dark variant** (§2) — the landing is light-only, so there is no upstream source; it is designed here and must be contrast-checked.

---

## 1. Light theme — "Paper" (exact, from the landing)

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` | `#ECE3D2` | page background |
| `--paper-deep` | `#E4D9C4` | elevated surface: sidebar, code blocks, table header, cards |
| `--paper-line` | `#D5C8AE` | **rules** — all 1px borders/dividers |
| `--ink` | `#171513` | primary text |
| `--ink-soft` | `#3A352E` | secondary text **and meta-labels** (see contrast note) |
| `--ink-mute` | `#7A7268` | tertiary text — large only (≥18px); never small body |
| `--ink-faint` | `#A9A095` | disabled / placeholder on dark surfaces only |
| `--terracotta` | `#D85A3D` | accent: hovers, underlines, active markers, focus ring |
| `--terracotta-hover` | `#C24E33` | accent hover/pressed |
| `--terracotta-ink` | `#7A2D1D` | **link text** on paper (contrast-safe), strong accent text |

### Contrast (verified, light)

- `ink` on `paper` ≈ 13.8:1 ✓ body.
- `ink-soft` on `paper` ≈ 9.1:1 ✓ — meta-labels use **`ink-soft`**, not `ink-mute`.
- `ink-mute` on `paper` ≈ 3.4:1 ✗ for small text → **large text only**.
- `terracotta` on `paper` ≈ 3.1:1 ✗ for body → **not used as inline-link text**. Inline links use **`terracotta-ink`** (`#7A2D1D` ≈ 7.0:1 ✓); the bright terracotta is for the underline, hover, and ≥18px/bold accents.

---

## 2. Dark variant — "Ink" (new; contrast-checked)

Warm charcoal derived from the `ink` hue (not neutral gray), paper-tone text, same terracotta accent (which is bright enough to use directly on dark).

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` (bg) | `#14110F` | page background (a step deeper than `ink` for headroom) |
| `--paper-deep` | `#1E1A16` | elevated surface: sidebar, code blocks, table header |
| `--surface-2` | `#27221C` | nested surface / hover |
| `--paper-line` | `#3A352E` | rules (1px borders) |
| `--ink` (text) | `#ECE3D2` | primary text (paper tone) |
| `--ink-soft` | `#D5C8AE` | secondary text + meta-labels |
| `--ink-mute` | `#A9A095` | tertiary text |
| `--terracotta` | `#E2694C` | accent + **link text** (brightened for dark) |
| `--terracotta-hover` | `#EC7C61` | accent hover |

### Contrast (verified, dark)

- `#ECE3D2` on `#14110F` ≈ 14.6:1 ✓ body.
- `#D5C8AE` on `#14110F` ≈ 11:1 ✓ meta-labels.
- `#A9A095` on `#14110F` ≈ 6.6:1 ✓ (small ok on dark).
- `#E2694C` on `#14110F` ≈ 6.3:1 ✓ links/accents (bright terracotta is fine on dark — no need for the dark `terracotta-ink`).

---

## 3. Infima variable mapping

Set these in `src/css/custom.css` under `:root` (light) and `[data-theme='dark']` (dark), driven by the tokens above.

```
--ifm-background-color            → --paper
--ifm-background-surface-color    → --paper-deep
--ifm-color-content               → --ink
--ifm-color-content-secondary     → --ink-soft
--ifm-color-primary               → --terracotta-ink (light) / --terracotta (dark)   /* link/primary text */
--ifm-link-color                  → --terracotta-ink (light) / --terracotta (dark)
--ifm-link-hover-color            → --terracotta
--ifm-color-emphasis-300         → --paper-line       /* rules */
--ifm-toc-border-color            → --paper-line
--ifm-table-border-color          → --paper-line
--ifm-font-family-base            → "Inter", system-ui, -apple-system, sans-serif
--ifm-font-family-monospace       → "JetBrains Mono", "SF Mono", Menlo, monospace
--ifm-heading-font-family         → "Inter", ...   /* H2–H6; H1 overridden to Fraunces in §4 */
--ifm-code-font-size             → 90%
--ifm-global-radius               → 6px            /* default; pills use 999px (§5) */
--ifm-navbar-background-color     → --paper
--ifm-footer-background-color     → --paper-deep
--docusaurus-highlighted-code-line-bg → rgba(23,21,19,0.06) light / rgba(236,227,210,0.08) dark
```

Also generate the full `--ifm-color-primary-{dark,darker,darkest,light,lighter,lightest}` ramp from the chosen primary (Docusaurus uses these for buttons/active states). Use the terracotta ramp: darkest `#7A2D1D` → `#C24E33` → `#D85A3D` → `#E2694C` → lightest `#EC7C61`.

---

## 4. Typography

**Families** (load via `headTags` in `docusaurus.config.ts`, mirroring the landing's Google Fonts link — `preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com`, then the stylesheet):

- **Fraunces** (serif display) — `wght 500;700`, opsz + italic axes, as the landing loads it. **Used only for H1** (and the navbar wordmark).
- **Inter** (sans) — `wght 400;500;600;700`. Body, H2–H6, UI.
- **JetBrains Mono** (mono) — `wght 400;500`. Code, meta-labels.

**Scale** (rem; Docusaurus base 16px):

| Element | Font | Size | Weight | Tracking | Notes |
| --- | --- | --- | --- | --- | --- |
| H1 | Fraunces | `clamp(2rem, 1.6rem + 1.6vw, 2.75rem)` | 600 | `-0.015em` | `text-wrap: balance` |
| H2 | Inter | `1.6rem` | 600 | `-0.01em` | |
| H3 | Inter | `1.25rem` | 600 | `-0.005em` | |
| H4–H6 | Inter | `1.05–0.95rem` | 600 | 0 | |
| Body | Inter | `1rem` | 400 | 0 | line-height `1.7`; `text-wrap: pretty` |
| Code | JetBrains Mono | `0.9em` | 400 | 0 | |
| Meta-label | JetBrains Mono | `0.6875rem` (11px) | 500 | `0.22em`, uppercase | color `--ink-soft` |

- **Reading column** capped at **70ch** (`--ifm-container-width` / article `max-width`) for prose legibility.
- Only **H1** is serif — see ADR-0001. Do not promote H2+ to Fraunces.

---

## 5. The kit (chrome + components only)

Reusable primitives. Per ADR-0001 these appear on **chrome and components**, never tiled behind body prose.

- **Rule**: `1px solid var(--paper-line)`. The design separates with rules + color, **not shadows**. Avoid box-shadows except a whisper on the navbar when scrolled.
- **Pill button** (for MDX CTAs): `border-radius: 999px`, padding `0.7rem 1.3rem`, weight 600. `.pill-cta` = filled `--terracotta`, text `--paper`, hover `--terracotta-hover`. `.pill-ghost` = `1px solid --ink`, text `--ink`, hover inverts (bg `--ink`, text `--paper`). Port from landing `index.css`.
- **Meta-label**: mono, 11px, uppercase, `0.22em`, `--ink-soft`. Used for sidebar category headers, code-block language/filename, and the breadcrumb (§6).
- **Corner marks**: the 14px L-bracket flourish. **Sparing** — only on the doc-index intro band and `YouTubeEmbed`. Not on every card (brand signature, not decoration-by-default).
- **Dot-grid**: `radial-gradient(circle at 1px 1px, rgba(23,21,19,0.06) 1px, transparent 0)` at `28px`. Accent only — e.g. behind the doc-index intro band or the sidebar footer. **Never** behind reading prose.

---

## 6. Component specs

**Navbar** — bg `--paper`, bottom **rule**, no shadow (add a 1px shadow only on scroll). Synced broken-heart `logo.svg` (28px) + wordmark "BFFless" in **Fraunces**. Nav links Inter; active/hover link = `--terracotta` text. Logo `href` → `https://bffless.dev` (cross-site unity). GitHub link as icon.

**Sidebar** — bg `--paper-deep`, separated from content by a **rule**. Category headers as **meta-labels**. Item hover = `--surface-2` bg. **Active item** = `--terracotta` text + 600 weight + subtle `--surface-2` tint. **No thick left-border stripe** (impeccable hard-ban); a hairline `1px` left rule in `--terracotta` is the *maximum* if a marker is wanted.

**Breadcrumb (the "eyebrow")** — style Docusaurus's existing breadcrumbs as a **meta-label** row above the H1. This replaces any decorative kicker: it carries real navigation, so it earns its place (a decorative per-page eyebrow would be an anti-pattern).

**Footer** — change `style` to `light`-compatible: bg `--paper-deep`, top **rule**. Boxed-"b" lockup from the landing (`1px solid --ink`, Fraunces italic). Columns in Inter; headers as meta-labels; muted text `--ink-soft` (not `--ink-mute`, for contrast).

**Admonitions / callouts** — override Docusaurus's default **left-stripe**. Each = full `1px solid` border in the type color, a `--paper-deep` (light) / `--surface-2` (dark) tint, an icon, and a **meta-label** title. Type accents: note → `--ink-soft`; tip → terracotta; info → `--ink`; warning/danger → keep semantic amber/red but desaturate toward the warm palette. No `border-left` > 1px.

**Code blocks** — surface `--paper-deep` (light) / `--paper-deep` dark token, `1px` rule frame, radius 6px. Header bar with language + optional filename as a **meta-label**; copy button styled with `--terracotta` on hover. Custom Prism themes (replace `github`/`dracula`):
- Light: text `--ink`, comments `--ink-mute`, keywords `--terracotta-ink`, strings `#5C6E3B` (warm olive), numbers `--terracotta`.
- Dark: text `--ink` (dark token), comments `#8A8278`, keywords `--terracotta`, strings `#A8B775`, numbers `#EC7C61`.
Verify token contrast ≥4.5:1 on the code surface in both modes.

**Tables** — `1px` rules, header row bg `--paper-deep` with meta-label-cased headers, zebra via a 3% ink tint (light) / 4% paper tint (dark). No heavy borders.

**Prose / links** — inline links: `--terracotta-ink` text (light) / `--terracotta` (dark), underline in `--terracotta` with `text-underline-offset: 2px`; hover → `--terracotta`/`--terracotta-hover`. Blockquotes: `1px` left rule (≤1px is allowed) + `--ink-soft` text + `--paper-deep` tint. `<hr>` = a rule.

**Pagination (prev/next)** — two bordered cells with a `1px` rule, hover raises border to `--terracotta`; mono "PREVIOUS"/"NEXT" meta-labels + Inter title. (One legitimate use of a bordered cell — not a card grid.)

**Mermaid** — set `themeVariables` for light + dark: `background` → paper, `primaryColor` → `--paper-deep`, `primaryBorderColor`/`lineColor` → `--ink`, `primaryTextColor` → `--ink`, accented edges/nodes → `--terracotta`, `fontFamily` → JetBrains Mono. Keep the existing `mermaid.theme` keys but override variables so diagrams read as ink-on-paper, terracotta for emphasis.

**Existing components** — `LikeButton`: restyle to a `.pill-ghost` that fills terracotta when liked (drop the inline Infima-var colors). `YouTubeEmbed`: wrap in a `1px` rule frame + corner marks.

---

## 7. Motion

Restrained — this is documentation. Link/border/bg transitions `150ms ease`; navbar scroll-shadow `200ms`. No entrance animations on content (they break on headless renders and add nothing to docs). Every transition wrapped for `@media (prefers-reduced-motion: reduce)` → instant. No bounce/elastic.

---

## 8. Guardrails (impeccable — do not ship these)

- **No side-stripe accents** (`border-left/right` > 1px as a colored bar) on sidebar items, admonitions, cards, or blockquotes. Use full borders + tint.
- **No decorative eyebrow on every section/page** — the meta-label is for the breadcrumb, sidebar categories, and code/table headers only (each finite and functional).
- **No numbered section markers** (01 / 02 / 03) as scaffolding.
- **No gradient text, no glassmorphism, no hero-metric template, no identical card grids.**
- **No shadows-as-depth** — this design is borders + color. A single subtle navbar-scroll shadow is the only exception.
- **Contrast is non-negotiable**: every text/bg pair ≥4.5:1 (small) / ≥3:1 (large). When unsure, move toward the ink end. This is why meta-labels are `ink-soft` and light-mode links are `terracotta-ink`.

---

## 9. Color-mode config

`themeConfig.colorMode`: `defaultMode: 'light'`, `respectPrefersColorScheme: true`. Keep the toggle. Light is the brand default; dark is the designed companion.

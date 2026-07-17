# docs-public

The public documentation site for BFFless Community Edition, served at `docs.bffless.dev`. It is a Docusaurus site themed to share one visual identity with the marketing site at `bffless.dev`. The terms below are the shared vocabulary for that identity — use them in issues, PRs, component names, and CSS so humans and agents describe the design the same way.

## Language — brand identity

**Paper**:
The warm cream surface family that is the light theme's background (`#ECE3D2`), with deeper steps for elevation (`paper.deep`) and hairline borders (`paper.line`).
_Avoid_: cream, beige, off-white.

**Ink**:
The near-black warm text family (`#171513`), with softer/muted steps for secondary and meta text (`ink.soft`, `ink.mute`, `ink.faint`).
_Avoid_: black, charcoal, gray.

**Terracotta**:
The single brand accent (`#D85A3D`) — links, active states, primary CTAs, code highlights. Carries across both light and dark.
_Avoid_: orange, red, brand-color, primary (as a color name).

**Paper theme**:
The default light appearance: paper backgrounds, ink text, terracotta accent. Faithful to `bffless.dev`.

**Dark variant**:
The dark appearance, newly designed for the docs (it does not exist on `bffless.dev`): warm charcoal surfaces, paper-tone text, the same terracotta accent.
_Avoid_: dark mode (acceptable casually, but "dark variant" is the canonical term for this designed palette).

## Language — design kit

**Meta-label** (a.k.a. **Eyebrow** when it sits above a heading):
Small JetBrains Mono text, uppercase, wide tracking (`0.22em`), in `ink.mute` — used for section/category labels and the kicker above an H1.
_Avoid_: kicker, overline, caption.

**Corner marks**:
The small L-shaped 1px bracket flourishes on two opposite corners of a framed element (cards, embeds).
_Avoid_: brackets, corners, crop marks.

**Pill button**:
A fully-rounded (`999px`) button — filled terracotta (`pill-cta`) or outlined ink that inverts on hover (`pill-ghost`).
_Avoid_: rounded button, CTA button.

**Dot-grid**:
The faint radial-dot background texture (28px grid, ~6% ink). A decorative accent for chrome, never tiled behind body prose.
_Avoid_: dot pattern, background grid.

**Rule**:
A 1px hairline divider/border in `paper.line` (light) — the design leans on rules and color, not shadows.
_Avoid_: divider, line, border (when specifically the hairline).

**Chrome**:
The non-content frame of the site — navbar, sidebar, footer, breadcrumbs, pagination.

**Reading column**:
The prose body of a doc page. Kept calm: no dot-grid, no corner marks, no decorative flourishes inside it.

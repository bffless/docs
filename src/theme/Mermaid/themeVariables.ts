/**
 * Mermaid `themeVariables` mapped to the bffless.app "paper" identity, one set
 * per color mode. Docusaurus only varies the Mermaid *theme* preset by mode
 * (`themeConfig.mermaid.theme.{light,dark}`); the shared `options` cannot hold
 * per-mode variables, so the swizzled `@theme/Mermaid` component (./index.tsx)
 * selects the right set at render time from `useColorMode()`.
 *
 * Design intent (design-system.md §6 → "Mermaid"): diagrams read as ink on
 * paper — nodes are `paper-deep` fills with `ink` borders/text, edges are
 * `ink` — and `terracotta` is the single accent, used on emphasis *borders and
 * lines* (notes, activations, relations, active/critical gantt tasks) rather
 * than as a flooding fill, so contrast stays high in both modes.
 */
// Mermaid's themeVariables is an open string→color map. We type it locally
// rather than importing from 'mermaid' — under pnpm that package is a nested
// transitive dep and is not resolvable from this project's src/ (the Footer
// swizzle inlines its constants for the same reason).
type ThemeVariables = Record<string, string>;

type Palette = {
  paper: string;
  paperDeep: string;
  paperLine: string;
  surface2: string;
  ink: string;
  inkSoft: string;
  inkMute: string;
  terracotta: string;
};

const MONO = '"JetBrains Mono", "SF Mono", Menlo, monospace';

function build(p: Palette): ThemeVariables {
  return {
    fontFamily: MONO,
    fontSize: '14px',

    // Canvas
    background: p.paper,

    // Flowchart nodes — paper-deep fill, ink border + text
    primaryColor: p.paperDeep,
    primaryBorderColor: p.ink,
    primaryTextColor: p.ink,
    mainBkg: p.paperDeep,
    nodeBorder: p.ink,
    nodeTextColor: p.ink,

    // Secondary / tertiary nodes + subgraph clusters
    secondaryColor: p.paper,
    secondaryBorderColor: p.ink,
    secondaryTextColor: p.ink,
    tertiaryColor: p.paper,
    tertiaryBorderColor: p.paperLine,
    tertiaryTextColor: p.inkSoft,
    clusterBkg: p.paper,
    clusterBorder: p.paperLine,

    // Edges, lines, labels — ink on paper
    lineColor: p.ink,
    textColor: p.ink,
    titleColor: p.ink,
    edgeLabelBackground: p.paper,

    // Sequence diagram
    actorBkg: p.paperDeep,
    actorBorder: p.ink,
    actorTextColor: p.ink,
    actorLineColor: p.inkMute,
    signalColor: p.ink,
    signalTextColor: p.ink,
    loopTextColor: p.ink,
    sequenceNumberColor: p.paper,
    activationBkgColor: p.surface2,
    activationBorderColor: p.terracotta,
    noteBkgColor: p.paperDeep,
    noteTextColor: p.ink,
    noteBorderColor: p.terracotta,
    labelBoxBkgColor: p.paperDeep,
    labelBoxBorderColor: p.terracotta,
    labelTextColor: p.ink,

    // Class / ER relations — terracotta accent lines
    relationColor: p.terracotta,
    relationLabelColor: p.ink,
    attributeBackgroundColorOdd: p.paper,
    attributeBackgroundColorEven: p.paperDeep,

    // Gantt — keep on-palette; terracotta marks active/critical/today
    sectionBkgColor: p.paper,
    altSectionBkgColor: p.paperDeep,
    sectionBkgColor2: p.paperDeep,
    gridColor: p.paperLine,
    todayLineColor: p.terracotta,
    taskBkgColor: p.paperDeep,
    taskBorderColor: p.ink,
    taskTextColor: p.ink,
    taskTextLightColor: p.ink,
    taskTextDarkColor: p.ink,
    taskTextOutsideColor: p.ink,
    activeTaskBkgColor: p.surface2,
    activeTaskBorderColor: p.terracotta,
    doneTaskBkgColor: p.surface2,
    doneTaskBorderColor: p.inkMute,
    critBkgColor: p.surface2,
    critBorderColor: p.terracotta,
  };
}

/** Light "Paper" theme variables. */
export const paperThemeVariables = build({
  paper: '#ece3d2',
  paperDeep: '#e4d9c4',
  paperLine: '#d5c8ae',
  surface2: '#ddd0b6',
  ink: '#171513',
  inkSoft: '#3a352e',
  inkMute: '#7a7268',
  terracotta: '#d85a3d',
});

/** Dark "Ink" variant theme variables. */
export const inkThemeVariables = build({
  paper: '#14110f',
  paperDeep: '#1e1a16',
  paperLine: '#3a352e',
  surface2: '#27221c',
  ink: '#ece3d2',
  inkSoft: '#d5c8ae',
  inkMute: '#a9a095',
  terracotta: '#e2694c',
});

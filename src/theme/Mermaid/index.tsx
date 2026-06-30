/**
 * Swizzle of @docusaurus/theme-mermaid's `Mermaid` component.
 *
 * Upstream only swaps the Mermaid *theme* preset by color mode and shares one
 * static `options` object across both modes, so there is no supported config
 * surface for per-mode `themeVariables`. We rebuild the same tiny renderer but
 * merge in `paperThemeVariables` / `inkThemeVariables` based on the active
 * color mode, theming diagrams onto the bffless.app palette (design-system.md
 * §6). The existing `theme: {light, dark}` keys are kept and read through the
 * official client hooks; we only layer variables on top.
 *
 * Imports are limited to `@docusaurus/theme-mermaid/client` and core aliases —
 * never `@docusaurus/theme-common` or `mermaid`, which under pnpm are nested
 * transitive deps unresolvable from this project's src/ (see the Footer
 * swizzle, which inlines its constants for the same reason). The color mode is
 * therefore derived from the resolved preset rather than `useColorMode`.
 */
import React, {useEffect, useRef, type ReactNode} from 'react';
import ErrorBoundary from '@docusaurus/ErrorBoundary';
import {
  MermaidContainerClassName,
  useMermaidConfig,
  useMermaidRenderResult,
  useMermaidThemeConfig,
} from '@docusaurus/theme-mermaid/client';
import {paperThemeVariables, inkThemeVariables} from './themeVariables';
import styles from './styles.module.css';

type Props = {value: string};

type RenderResult = NonNullable<ReturnType<typeof useMermaidRenderResult>>;

function MermaidRenderResult({
  renderResult,
}: {
  renderResult: RenderResult;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const div = ref.current;
    if (div) {
      renderResult.bindFunctions?.(div);
    }
  }, [renderResult]);
  return (
    <div
      ref={ref}
      className={`${MermaidContainerClassName} ${styles.container}`}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{__html: renderResult.svg}}
    />
  );
}

function MermaidRenderer({value}: Props): ReactNode {
  const {theme} = useMermaidThemeConfig();
  // useMermaidConfig() returns the base config with `theme` already resolved to
  // the active mode's preset; compare against the configured dark preset to pick
  // the matching palette variables — no @docusaurus/theme-common import needed.
  const base = useMermaidConfig();
  const isDark = base.theme === theme.dark;
  const config = {
    ...base,
    themeVariables: {
      ...base.themeVariables,
      ...(isDark ? inkThemeVariables : paperThemeVariables),
    },
  };
  const renderResult = useMermaidRenderResult({text: value, config});
  if (renderResult === null) {
    return null;
  }
  return <MermaidRenderResult renderResult={renderResult} />;
}

export default function Mermaid(props: Props): ReactNode {
  // `children` is passed as an explicit prop (not JSX nesting): @types/react 19
  // here does not fold nested children into the props of components with a
  // required `children` (the same quirk fails Root.tsx's provider on the base
  // branch); the explicit prop keeps this file typecheck-clean.
  return (
    <ErrorBoundary
      fallback={({error}) => (
        <div role="alert" className={styles.error}>
          <p>Failed to render diagram.</p>
          <pre>{error.message}</pre>
        </div>
      )}
      children={<MermaidRenderer {...props} />}
    />
  );
}

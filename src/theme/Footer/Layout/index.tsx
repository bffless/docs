/**
 * Swizzled Footer/Layout — adds the boxed-"b" brand lockup from the landing
 * (bffless.dev) so the docs footer reads as the same property. Mirrors the
 * upstream layout (links + bottom row) and prepends the lockup to the bottom
 * row above the copyright. See docs/design-system.md §6 (Footer) and the
 * .footer__lockup / .footer__boxed-b rules in src/css/custom.css.
 */
import React, {type ReactNode} from 'react';
import clsx from 'clsx';

// Mirrors ThemeClassNames.layout.footer.container; inlined to keep this swizzle
// free of the transitive @docusaurus/theme-common type dependency.
const FOOTER_CONTAINER_CLASS = 'theme-layout-footer';

interface Props {
  style: 'light' | 'dark';
  links: ReactNode;
  logo: ReactNode;
  copyright: ReactNode;
}

export default function FooterLayout({
  style,
  links,
  logo,
  copyright,
}: Props): ReactNode {
  return (
    <footer
      className={clsx(FOOTER_CONTAINER_CLASS, 'footer', {
        'footer--dark': style === 'dark',
      })}>
      <div className="container container-fluid">
        {links}
        {(logo || copyright) && (
          <div className="footer__bottom text--center">
            {/* Boxed-"b" lockup — 1px ink frame, Fraunces italic mark */}
            <div className="footer__lockup">
              <span className="footer__boxed-b" aria-hidden="true">
                b
              </span>
              <span className="footer__wordmark">BFFless</span>
            </div>
            {logo && <div className="margin-bottom--sm">{logo}</div>}
            {copyright}
          </div>
        )}
      </div>
    </footer>
  );
}

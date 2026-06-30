import type {PrismTheme} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// ── Custom Prism themes — "paper" code highlighting (design-system.md §6) ──
// Replaces prism-react-renderer's github/dracula so code reads as ink-on-paper
// (light) / paper-on-charcoal (dark) with terracotta accents. Surface + plain
// text resolve to the brand tokens (var(--paper-deep)/var(--ink)), so the code
// surface follows the palette per color mode; only the off-palette syntax hues
// (muted comment, warm-olive string, brick number) are literal.
//
// Every token color is contrast-checked ≥4.5:1 on its mode's code surface
// (light --paper-deep #ECE3D2→#E4D9C4 deep; dark #1E1A16). The three light
// hues the spec names verbatim fall just under 4.5:1 on #E4D9C4, so per the
// "verify contrast" clause (§6) + Guardrails §8 they are darkened toward ink:
//   comment  #7A7268 (ink-mute, 3.4:1)  → #655E54 (~4.6:1)
//   string   #5C6E3B                     → #556534 (~4.6:1)
//   number   #D85A3D (terracotta, 2.8:1) → #A33E29 (ramp primary-darker, ~4.6:1)
// Dark hues all clear 4.5:1 on #1E1A16 as specified and are kept verbatim.
const sharedPrismStyles = (c: {
  comment: string;
  string: string;
  number: string;
  keyword: string;
}): PrismTheme['styles'] => [
  {
    types: ['comment', 'prolog', 'doctype', 'cdata'],
    style: {color: c.comment, fontStyle: 'italic'},
  },
  {types: ['namespace'], style: {opacity: 0.7}},
  {
    types: ['string', 'char', 'attr-value', 'inserted', 'regex', 'url'],
    style: {color: c.string},
  },
  {
    types: ['number', 'boolean', 'constant', 'symbol'],
    style: {color: c.number},
  },
  {
    types: [
      'keyword',
      'atrule',
      'operator',
      'tag',
      'selector',
      'deleted',
      'important',
      'entity',
    ],
    style: {color: c.keyword},
  },
  {types: ['punctuation'], style: {color: 'var(--ink-soft)'}},
];

const paperPrismLight: PrismTheme = {
  plain: {color: 'var(--ink)', backgroundColor: 'var(--paper-deep)'},
  styles: sharedPrismStyles({
    comment: '#655e54',
    string: '#556534',
    number: '#a33e29',
    keyword: 'var(--terracotta-ink)',
  }),
};

const paperPrismDark: PrismTheme = {
  plain: {color: 'var(--ink)', backgroundColor: 'var(--paper-deep)'},
  styles: sharedPrismStyles({
    comment: '#8a8278',
    string: '#a8b775',
    number: '#ec7c61',
    keyword: 'var(--terracotta)',
  }),
};

const config: Config = {
  title: 'BFFless',
  tagline: 'The home for your AI-generated apps, internal tools, and HTML docs — with a backend, auth, and a path to your internal services',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  url: 'https://docs.bffless.com',
  baseUrl: '/',

  trailingSlash: true,
  organizationName: 'bffless',
  projectName: 'bffless',

  onBrokenLinks: 'throw',

  clientModules: ['./src/gtag-stub.ts'],

  // We inject gtag manually via headTags (instead of using preset-classic's
  // gtag option) so we can call gtag('set', 'user_properties', { variant })
  // BEFORE gtag('config', ...). The config call fires the initial page_view,
  // and user_properties only attach to events fired AFTER they're set — so
  // queue order in dataLayer is what determines whether the first page_view
  // gets the variant attribution or not.
  headTags: [
    // Brand fonts — Fraunces (H1 + wordmark), Inter (body/UI), JetBrains Mono
    // (code + meta-labels). Mirrors the bffless.app landing's Google Fonts
    // load so the two properties share one type system. See docs/design-system.md §4.
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500;1,9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://www.google-analytics.com',
      },
    },
    {
      tagName: 'script',
      attributes: {
        async: 'true',
        src: 'https://www.googletagmanager.com/gtag/js?id=G-T20LHNBRK6',
      },
    },
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
try {
  var m = document.cookie.match(/(?:^|; )__bffless_variant=([^;]*)/);
  var v = m ? decodeURIComponent(m[1]) : new URLSearchParams(window.location.search).get('version');
  if (v) gtag('set', 'user_properties', { variant: v });
} catch (e) {}
gtag('js', new Date());
gtag('config', 'G-T20LHNBRK6', { 'anonymize_ip': true });`,
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          // Keep internal agent/decision docs out of the published site (docs/
          // is served at the root). These dirs hold Matt-Pocock skill config
          // (agents/) and ADRs (adr/) — repo-internal, not user documentation.
          // Excluding them also keeps their repo-relative links out of the
          // strict broken-link checker (onBrokenLinks: 'throw').
          exclude: [
            '**/_*.{js,jsx,ts,tsx,md,mdx}',
            '**/_*/**',
            '**/*.test.{js,jsx,ts,tsx}',
            '**/__tests__/**',
            'adr/**',
            'agents/**',
            'design-system.md',
          ],
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          blogTitle: 'BFFless Blog',
          blogDescription: 'News and updates from the BFFless team',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        // gtag is configured manually via headTags above so we can set
        // user_properties before the initial page_view fires.
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      // Light "Paper" is the brand default; the dark variant is the designed
      // companion. Keep the toggle. See docs/design-system.md §9.
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    mermaid: {
      // Theme presets per color mode; the palette `themeVariables` are layered
      // on per-mode by the swizzled @theme/Mermaid component, since Docusaurus
      // shares one static `options` across both modes (design-system.md §6,
      // src/theme/Mermaid/).
      theme: {light: 'neutral', dark: 'dark'},
    },
    navbar: {
      title: 'BFFless',
      logo: {
        alt: 'BFFless Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
        // Logo links cross-site to the marketing home so docs + landing read
        // as one property (design-system.md §6).
        href: 'https://bffless.app/?utm_source=docs.bffless.com&utm_medium=referral&utm_campaign=ecosystem-nav&utm_content=logo-link',
        target: '_self',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          href: 'https://bffless.app/?utm_source=docs.bffless.com&utm_medium=referral&utm_campaign=ecosystem-nav&utm_content=oss-link',
          label: 'Open Source',
          position: 'right',
        },
        {
          href: 'https://www.bffless.com/?utm_source=docs.bffless.com&utm_medium=referral&utm_campaign=ecosystem-nav&utm_content=agency-link',
          label: 'Agency',
          position: 'right',
        },
        {
          href: 'https://bffless.app/discord',
          label: 'Discord',
          position: 'right',
        },
        {
          href: 'https://github.com/bffless/ce',
          position: 'right',
          // Rendered as an icon (see .header-github-link in custom.css §6).
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      // Paper identity: light-compatible footer on --paper-deep with a top
      // rule and the boxed-"b" lockup (swizzled Footer/Layout). See §6.
      style: 'light',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://bffless.app/discord',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/bffless/ce',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} BFFless. Built with Docusaurus.`,
    },
    prism: {
      theme: paperPrismLight,
      darkTheme: paperPrismDark,
      additionalLanguages: ['bash', 'yaml', 'docker', 'nginx'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

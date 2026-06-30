import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

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
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'docker', 'nginx'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

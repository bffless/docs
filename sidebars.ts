import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'generated-index',
        description: 'Get up and running with BFFless quickly.',
      },
      items: [
        'getting-started/quickstart',
        'getting-started/cloudflare-setup',
        'getting-started/letsencrypt-setup',
        'getting-started/setup-wizard',
        'getting-started/first-deployment',
        'getting-started/viewing-deployments',
        // 'getting-started/manual-setup',
        // 'getting-started/local-development',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      link: {
        type: 'generated-index',
        description: 'Explore the powerful features of BFFless.',
      },
      items: [
        'features/traffic-splitting',
        'features/share-links',
        'features/proxy-rules',
        'features/authorization',
        'features/repository-overview',
        'features/pipelines',
        'features/ai-pipelines',
        'features/chat',
        'features/mcp-server',
        'features/claude-code-plugin',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      link: {
        type: 'generated-index',
        description: 'Deploy BFFless to production environments.',
      },
      items: [
        'deployment/overview',
        'deployment/digitalocean',
        'deployment/ssl-certificates',
        {
          type: 'category',
          label: 'GitHub Actions',
          link: {
            type: 'doc',
            id: 'deployment/github-actions/index',
          },
          items: [
            'deployment/github-actions/upload-artifact',
            'deployment/github-actions/download-artifact',
            'deployment/github-actions/compare-screenshots',
            'deployment/github-actions/compare-coverage',
          ],
        },
        'deployment/umbrel',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      link: {
        type: 'generated-index',
        description: 'Configure BFFless for your needs.',
      },
      items: [
        'configuration/environment-variables',
        'configuration/storage-backends',
        'configuration/authentication',
        'configuration/oidc-providers',
      ],
    },
    {
      type: 'category',
      label: 'Storage',
      link: {
        type: 'generated-index',
        description: 'Configure storage backends for your deployments.',
      },
      items: [
        'storage/overview',
        'storage/aws-s3',
        'storage/google-cloud-storage',
        'storage/azure-blob-storage',
        'storage/minio',
        'storage/caching',
        'storage/migration-guide',
      ],
    },
    {
      type: 'category',
      label: 'Recipes',
      link: {
        type: 'doc',
        id: 'recipes/index',
      },
      items: [
        'recipes/ab-testing',
        'recipes/coverage-comparison',
        'recipes/compare-screenshots',
        'recipes/email-form-handler',
        'recipes/state-management',
        'recipes/proxy-rules-as-code',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      link: {
        type: 'generated-index',
        description: 'Technical reference documentation.',
      },
      items: [
        'reference/api',
        'reference/architecture',
        'reference/database-schema',
        'reference/security',
      ],
    },
    'troubleshooting',
  ],
};

export default sidebars;

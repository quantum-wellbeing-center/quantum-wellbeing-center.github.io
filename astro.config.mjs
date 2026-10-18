// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO(content): replace with the real domain once the owner provides it.
  site: 'https://example.com',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'ro',
    locales: ['ro', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ro',
        locales: {
          ro: 'ro-RO',
          en: 'en',
        },
      },
      // The styleguide is an internal page: keep it out of the sitemap.
      filter: (page) => !page.includes('/styleguide'),
    }),
  ],
});

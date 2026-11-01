// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Keep in sync with `domain` in src/config/site.ts and the sitemap line in public/robots.txt.
  site: 'https://www.quantumwellbeing.ro',
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

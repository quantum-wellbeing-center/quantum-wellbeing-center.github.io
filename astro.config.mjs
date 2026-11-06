// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Keep in sync with `domain` in src/config/site.ts and the sitemap line in public/robots.txt.
  // GitHub Pages address until the owner buys quantumwellbeing.ro. The repo must be named
  // quantum-wellbeing-center.github.io so the site is served from the root (no `base` needed).
  site: 'https://quantum-wellbeing-center.github.io',
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

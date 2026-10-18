/**
 * Builds the article RSS feed for one language. Used by src/pages/rss.xml.ts (ro) and
 * src/pages/en/rss.xml.ts (en). Draft articles never appear.
 */
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../config/site';
import { bcp47, getRoute, t, type Locale } from '../i18n';
import { articlePath, getArticles } from './content';

export async function buildFeed(lang: Locale, context: APIContext): Promise<Response> {
  const siteUrl = context.site ?? new URL(site.domain);
  const articles = await getArticles(lang);
  return rss({
    title: t(lang, 'articles.feedTitle', { brand: site.brandName }),
    description: t(lang, 'articles.feedDescription'),
    site: new URL(getRoute(lang, 'articles'), siteUrl).href,
    trailingSlash: true,
    customData: `<language>${bcp47(lang).toLowerCase()}</language>`,
    items: articles.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishDate,
      link: new URL(articlePath(entry), siteUrl).href,
      categories: entry.data.tags,
    })),
  });
}

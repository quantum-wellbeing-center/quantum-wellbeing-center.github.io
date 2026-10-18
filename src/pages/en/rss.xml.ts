import type { APIContext } from 'astro';
import { buildFeed } from '../../lib/rss';

/** English article feed at /en/rss.xml. */
export function GET(context: APIContext) {
  return buildFeed('en', context);
}

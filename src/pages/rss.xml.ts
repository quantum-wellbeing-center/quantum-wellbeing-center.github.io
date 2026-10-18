import type { APIContext } from 'astro';
import { buildFeed } from '../lib/rss';

/** Romanian article feed at /rss.xml. */
export function GET(context: APIContext) {
  return buildFeed('ro', context);
}

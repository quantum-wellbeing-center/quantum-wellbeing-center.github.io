/**
 * Content helpers shared by the page components: typed access to the `pages` and `legal`
 * collections, sorted and filtered queries for the other collections and the document-type
 * badge tone.
 *
 * Every query filters on `lang`. Testimonials are additionally filtered on `consent === true`
 * and gallery images on the consent rule (consent needed only when people are identifiable),
 * here as well as by the schema, so the rule is visible where content is read for display.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Locale } from '../config/site';
import type { BadgeTone } from '../components/ui/Badge.astro';
import type { DocumentType, LEGAL_KEYS, PageContentKey } from '../content.config';

/* ------------------------------------------------------------------- pages */

export type PageEntry = CollectionEntry<'pages'>;
export type PageData<K extends PageContentKey> = Extract<PageEntry['data'], { translationKey: K }>;

/** The copy of one page in one language, with its frontmatter narrowed to that page's shape. */
export async function getPage<K extends PageContentKey>(
  lang: Locale,
  key: K,
): Promise<{ entry: PageEntry; data: PageData<K> }> {
  const entry = await getEntry('pages', `${lang}/${key}`);
  if (!entry || entry.data.translationKey !== key) {
    throw new Error(`Missing page copy: src/content/pages/${lang}/${key}.md`);
  }
  return { entry, data: entry.data as PageData<K> };
}

export type LegalKey = (typeof LEGAL_KEYS)[number];

export async function getLegal(lang: Locale, key: LegalKey): Promise<CollectionEntry<'legal'>> {
  const entry = await getEntry('legal', `${lang}/${key}`);
  if (!entry) throw new Error(`Missing legal page: src/content/legal/${lang}/${key}.md`);
  return entry;
}

/* ------------------------------------------------------------- collections */

export type ServiceEntry = CollectionEntry<'services'>;

export async function getServices(lang: Locale): Promise<ServiceEntry[]> {
  const entries = await getCollection('services', (e) => e.data.lang === lang);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

/** Anchor id of a service on the pricing page, shared by the home teaser links. */
export function serviceAnchor(entry: ServiceEntry): string {
  return `service-${entry.data.translationKey}`;
}

export async function getFaqs(lang: Locale) {
  const entries = await getCollection('faq', (e) => e.data.lang === lang);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export async function getFeaturedFaqs(lang: Locale, limit = 5) {
  const entries = await getFaqs(lang);
  return entries.filter((e) => e.data.featured).slice(0, limit);
}

/** Published testimonials: consent-gated, newest first. */
export async function getTestimonials(lang: Locale) {
  const entries = await getCollection(
    'testimonials',
    (e) => e.data.lang === lang && e.data.consent === true,
  );
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export type GalleryEntry = CollectionEntry<'gallery'>;

/** The gallery consent rule: a photo with recognisable people needs written consent. */
export function canShowGalleryImage(entry: GalleryEntry): boolean {
  return !entry.data.identifiablePeople || entry.data.consent === true;
}

/** Gallery images of the space and team: consent rule applied, in display order. */
export async function getGallery(lang: Locale): Promise<GalleryEntry[]> {
  const entries = await getCollection(
    'gallery',
    (e) => e.data.lang === lang && canShowGalleryImage(e),
  );
  return entries.sort((a, b) => a.data.order - b.data.order);
}

/** The gallery images marked `featured`, for the home page's showcase. */
export async function getFeaturedGallery(lang: Locale): Promise<GalleryEntry[]> {
  return (await getGallery(lang)).filter((e) => e.data.featured);
}

/** Research items: featured first, then newest year first; undated items last. */
export async function getResearch(lang: Locale) {
  const entries = await getCollection('research', (e) => e.data.lang === lang);
  return entries.sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      (b.data.year ?? 0) - (a.data.year ?? 0) ||
      a.data.title.localeCompare(b.data.title),
  );
}

/** Badge tone per document type: a neutral palette, the text carries the meaning. */
export function documentTypeTone(type: DocumentType): BadgeTone {
  switch (type) {
    case 'peer-reviewed':
    case 'clinical-study':
    case 'review':
      return 'accent';
    default:
      return 'neutral';
  }
}

/* ---------------------------------------------------------------- markdown */

/** Reduces Markdown to plain text for structured data and word counts. */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Serialises JSON-LD safely for an inline script. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

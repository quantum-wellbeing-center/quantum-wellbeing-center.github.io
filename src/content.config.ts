/**
 * Content collections (Astro content layer).
 *
 * File and ID convention
 * ----------------------
 * Every collection lives in `src/content/<collection>/<lang>/<slug>.<ext>`:
 *
 *   - the entry id is `<lang>/<slug>`, for example `ro/cum-rezerv-o-sesiune`;
 *   - `lang` ("ro" | "en") is also stored in the entry data, and the loader fails the build when
 *     the folder and the field disagree;
 *   - the Romanian and English versions of one piece of content share the same `translationKey`
 *     (by convention the English slug). `scripts/check-content.mjs` verifies every key exists
 *     in both languages, flags cedilla characters and flags forbidden claim words.
 *
 * Formats: `faq` and `blog` are Markdown (`.md`: frontmatter + body); `research`,
 * `testimonials`, `gallery` and `services` are JSON (`.json`).
 *
 * Image fields (`gallery.image`, `blog.cover`) are paths relative to the entry file, e.g.
 * `../../../assets/gallery/placeholder-01.svg`, and resolve to `ImageMetadata` for `astro:assets`.
 *
 * Querying one language from a page:
 *
 *   const faqs = await getCollection('faq', (entry) => entry.data.lang === lang);
 *   const { Content } = await render(entry);   // Markdown body of a faq or blog entry
 *
 * Consent: `testimonials` and `gallery` schemas only accept `consent: true`, so an entry without
 * written consent cannot build at all. Pages must still filter on `entry.data.consent === true`
 * before rendering, as the plan requires, so the rule is visible where the content is shown.
 *
 * Research: `fileSizeBytes` and `fileType` are derived at load time from the real file in
 * `public/research/` (for local `pdf` paths) and must not be set by hand. The build fails when a
 * local PDF is missing, and when two entries in the same language point at the same PDF (the RO
 * and EN versions of one study legitimately share a file).
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { Loader, LoaderContext } from 'astro/loaders';
import { statSync } from 'node:fs';

/* ------------------------------------------------------------------ shared */

export const LANGS = ['ro', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const EVIDENCE_TYPES = [
  'peer-reviewed',
  'clinical-study',
  'pilot-study',
  'case-report',
  'review',
  'anecdotal-report',
  'other',
] as const;

export const RESEARCH_GROUPS = ['published-clinical', 'research-studies', 'additional'] as const;

export const FAQ_CATEGORIES = ['sesiuni', 'rezervari', 'siguranta', 'preturi'] as const;

export const TESTIMONIAL_SOURCES = ['google', 'in-person'] as const;

const localized = {
  lang: z.enum(LANGS),
  /** Links the RO and EN versions of one entry. By convention the English slug. */
  translationKey: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'translationKey must be a lowercase slug (a-z, 0-9, -)'),
};

/** `/research/<file>.pdf`, served from `public/research/`. */
const LOCAL_PDF = /^\/research\/[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/;
const ABSOLUTE_URL = /^https?:\/\/\S+$/;

type LocalizedGlobOptions = {
  /** Transforms the raw, unvalidated data of an entry before schema validation. */
  enrich?: (
    data: Record<string, unknown>,
    ctx: LoaderContext,
    id: string,
  ) => Record<string, unknown>;
  /**
   * Extra material mixed into the content digest. The glob loader skips entries whose digest is
   * unchanged, so anything the enrichment depends on (such as a PDF's size) must be part of it.
   */
  digestExtra?: (rawContents: string, ctx: LoaderContext) => string;
  /** Runs once after all entries are in the store. Throw to fail the build. */
  verify?: (ctx: LoaderContext) => void;
};

/**
 * Wraps the built-in `glob()` loader for `src/content/<collection>/<lang>/<slug>.<ext>` and adds
 * the per-language checks described at the top of this file.
 */
function localizedGlob(
  collection: string,
  ext: 'md' | 'json',
  options: LocalizedGlobOptions = {},
): Loader {
  const inner = glob({
    pattern: `{${LANGS.join(',')}}/**/*.${ext}`,
    base: `./src/content/${collection}`,
  });
  return {
    name: `localized-glob:${collection}`,
    load: async (ctx) => {
      const innerCtx: LoaderContext = {
        ...ctx,
        parseData: (props) =>
          ctx.parseData({
            ...props,
            data: (options.enrich
              ? options.enrich(props.data, ctx, props.id)
              : props.data) as typeof props.data,
          }),
        generateDigest: (data) =>
          typeof data === 'string' && options.digestExtra
            ? ctx.generateDigest(`${data}\n${options.digestExtra(data, ctx)}`)
            : ctx.generateDigest(data),
      };
      await inner.load(innerCtx);

      const mismatches: string[] = [];
      for (const [id, entry] of ctx.store.entries()) {
        const lang = (entry.data as { lang?: unknown }).lang;
        if (typeof lang !== 'string' || !id.startsWith(`${lang}/`)) {
          mismatches.push(`  - ${collection}/${id} (lang: ${String(lang)})`);
        }
      }
      if (mismatches.length > 0) {
        throw new Error(
          `Content error (${collection}): the "lang" field must match the language folder of the file.\n${mismatches.join('\n')}`,
        );
      }

      options.verify?.(ctx);
    },
  };
}

/* ---------------------------------------------------------------- research */

function statPdf(pdf: string, ctx: LoaderContext) {
  try {
    return statSync(new URL(`.${pdf}`, ctx.config.publicDir));
  } catch {
    return undefined;
  }
}

function fileTypeOf(pdf: string): string {
  const path = pdf.split(/[?#]/, 1)[0] ?? '';
  const ext = path.match(/\.([A-Za-z0-9]+)$/)?.[1];
  return ext ? ext.toUpperCase() : 'LINK';
}

/** Adds `fileType` and, for local files, `fileSizeBytes` to a research entry's raw data. */
function enrichResearch(
  data: Record<string, unknown>,
  ctx: LoaderContext,
  id: string,
): Record<string, unknown> {
  const { pdf } = data;
  if (typeof pdf !== 'string') return data; // the schema reports the problem
  const next: Record<string, unknown> = { ...data, fileType: fileTypeOf(pdf) };
  delete next.fileSizeBytes;
  if (LOCAL_PDF.test(pdf)) {
    const stats = statPdf(pdf, ctx);
    if (!stats) {
      throw new Error(
        `Content error (research): entry "${id}" points at "${pdf}" but there is no such file in public/research/. Add the PDF or fix the path.`,
      );
    }
    next.fileSizeBytes = stats.size;
  }
  return next;
}

/** Makes the content digest change whenever the referenced local PDF changes. */
function researchDigestExtra(rawContents: string, ctx: LoaderContext): string {
  try {
    const { pdf } = JSON.parse(rawContents) as { pdf?: unknown };
    if (typeof pdf !== 'string' || !LOCAL_PDF.test(pdf)) return '';
    const stats = statPdf(pdf, ctx);
    return stats ? `pdf:${stats.size}:${stats.mtimeMs}` : 'pdf:missing';
  } catch {
    return '';
  }
}

/** Fails the build when two entries in the same language share one PDF path or URL. */
function verifyNoDuplicatePdfs(ctx: LoaderContext): void {
  const byKey = new Map<string, string[]>();
  for (const [id, entry] of ctx.store.entries()) {
    const { lang, pdf } = entry.data as { lang: string; pdf: string };
    const key = `${lang} ${pdf.trim().toLowerCase()}`;
    byKey.set(key, [...(byKey.get(key) ?? []), id]);
  }
  const duplicates = [...byKey.entries()].filter(([, ids]) => ids.length > 1);
  if (duplicates.length === 0) return;
  const lines = duplicates.map(([key, ids]) => {
    const [lang, pdf] = key.split(' ', 2);
    return `  - [${lang}] ${pdf}\n      used by: ${ids.map((id) => `src/content/research/${id}.json`).join(', ')}`;
  });
  throw new Error(
    `Content error (research): the same PDF is listed more than once in one language. Each PDF may appear once per language; remove or merge the duplicate entries.\n${lines.join('\n')}`,
  );
}

const research = defineCollection({
  loader: localizedGlob('research', 'json', {
    enrich: enrichResearch,
    digestExtra: researchDigestExtra,
    verify: verifyNoDuplicatePdfs,
  }),
  schema: z.object({
    ...localized,
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    year: z.number().int().min(1900).max(2100).optional(),
    evidenceType: z.enum(EVIDENCE_TYPES),
    /** Publisher, journal or organisation. */
    source: z.string().min(1),
    doi: z.string().min(1).optional(),
    /** `/research/<file>.pdf` (served from public/research/) or an absolute http(s) URL. */
    pdf: z.string().refine((value) => LOCAL_PDF.test(value) || ABSOLUTE_URL.test(value), {
      message:
        'pdf must be a path like /research/<file>.pdf (a file in public/research/) or an absolute http(s) URL',
    }),
    /** Short, neutral description of what the document is. */
    summary: z.string().min(1),
    group: z.enum(RESEARCH_GROUPS),
    featured: z.boolean().default(false),
    /** Derived at load time from the real file; do not set by hand. */
    fileSizeBytes: z.number().int().nonnegative().optional(),
    /** Derived at load time from the file extension (e.g. "PDF"); do not set by hand. */
    fileType: z.string().optional(),
  }),
});

/* ------------------------------------------------------------ testimonials */

const testimonials = defineCollection({
  loader: localizedGlob('testimonials', 'json'),
  schema: z.object({
    ...localized,
    /** First name and initial only, e.g. "Andreea M.". Never a full surname. */
    name: z
      .string()
      .regex(
        /^\p{Lu}[\p{L}'-]+(?: \p{Lu}[\p{L}'-]+)* \p{Lu}\.$/u,
        'name must be "Firstname I." (first name plus initial with a full stop)',
      ),
    quote: z.string().min(1),
    date: z.coerce.date(),
    rating: z.number().int().min(1).max(5).optional(),
    source: z.enum(TESTIMONIAL_SOURCES),
    /** Written consent is required to publish. Only `true` is accepted. */
    consent: z.literal(true),
  }),
});

/* ----------------------------------------------------------------- gallery */

const gallery = defineCollection({
  loader: localizedGlob('gallery', 'json'),
  schema: ({ image }) =>
    z.object({
      ...localized,
      image: image(),
      alt: z.string().min(1),
      caption: z.string().min(1),
      /** Written consent from the people shown is required to publish. Only `true` is accepted. */
      consent: z.literal(true),
      order: z.number().int(),
    }),
});

/* --------------------------------------------------------------------- faq */

const faq = defineCollection({
  loader: localizedGlob('faq', 'md'),
  schema: z.object({
    ...localized,
    question: z.string().min(1),
    /** Category ids are shared across languages; labels live in the i18n files. */
    category: z.enum(FAQ_CATEGORIES),
    order: z.number().int(),
    /** Shown in the five-question teaser on the home page. */
    featured: z.boolean().default(false),
  }),
});

/* ---------------------------------------------------------------- services */

const services = defineCollection({
  loader: localizedGlob('services', 'json'),
  schema: z.object({
    ...localized,
    name: z.string().min(1),
    description: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    /** Plain number; format with `Intl.NumberFormat` for the page locale. */
    price: z.number().nonnegative(),
    currency: z.literal('RON').default('RON'),
    sessionsPerPackage: z.number().int().positive().optional(),
    highlighted: z.boolean().default(false),
    order: z.number().int(),
  }),
});

/* -------------------------------------------------------------------- blog */

const blog = defineCollection({
  loader: localizedGlob('blog', 'md'),
  schema: ({ image }) =>
    z.object({
      ...localized,
      title: z.string().min(1),
      description: z.string().min(1),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      cover: image(),
      coverAlt: z.string().min(1),
      author: z.string().min(1),
      tags: z.array(z.string().min(1)).default([]),
      draft: z.boolean().default(false),
    }),
});

/* ------------------------------------------------------------------- pages */

/**
 * Page copy: one Markdown file per page and language (`src/content/pages/<lang>/<page>.md`).
 * `translationKey` doubles as the page id, so the schema is a discriminated union: each page
 * has its own typed frontmatter and the Markdown body carries the long text where a page has
 * one. UI strings (button labels, column headings, status messages) live in the i18n files.
 */
export const PAGE_KEYS = [
  'home',
  'technology',
  'research',
  'testimonials',
  'pricing',
  'articles',
  'faq',
  'contact',
  'not-found',
] as const;
export type PageContentKey = (typeof PAGE_KEYS)[number];

const pageBase = {
  lang: z.enum(LANGS),
  /** Page title (h1 unless a `headline` is given) and the first part of the <title>. */
  title: z.string().min(1),
  /** Meta description, 50 to 160 characters. */
  description: z.string().min(1),
};

/** A heading plus a short lead paragraph, the pattern most sections start with. */
const headed = z.object({
  heading: z.string().min(1),
  text: z.string().min(1),
});

/** A heading, an intro, a list of short items and a closing note (guardrail wording). */
const list = z.object({
  heading: z.string().min(1),
  intro: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
  note: z.string().min(1),
});

const pages = defineCollection({
  loader: localizedGlob('pages', 'md'),
  schema: z.discriminatedUnion('translationKey', [
    z.object({
      ...pageBase,
      translationKey: z.literal('home'),
      hero: z.object({ headline: z.string().min(1), subheading: z.string().min(1) }),
      technology: headed,
      experiences: list,
      services: headed,
      research: headed,
      testimonials: headed,
      faq: headed,
      cta: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('technology'),
      subheading: z.string().min(1),
      /** The Markdown body is the "how it works" explainer. */
      reports: list,
      services: headed,
      cta: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('research'),
      subheading: z.string().min(1),
      /** The Markdown body explains how to read the library. */
      legend: z.object({
        heading: z.string().min(1),
        items: z.array(z.object({ type: z.enum(EVIDENCE_TYPES), text: z.string().min(1) })),
      }),
      groups: z.object({
        'published-clinical': headed,
        'research-studies': headed,
        additional: headed,
      }),
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('testimonials'),
      subheading: z.string().min(1),
      gallery: headed.extend({ note: z.string().min(1) }),
      reviews: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('pricing'),
      subheading: z.string().min(1),
      /** The Markdown body (optional) describes what every session includes. */
      cta: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('articles'),
      subheading: z.string().min(1),
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('faq'),
      subheading: z.string().min(1),
      cta: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('contact'),
      subheading: z.string().min(1),
      /** The Markdown body is the short intro above the contact details. */
      details: z.object({ heading: z.string().min(1) }),
      map: z.object({ heading: z.string().min(1), text: z.string().min(1) }),
      form: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('not-found'),
      subheading: z.string().min(1),
    }),
  ]),
});

/* ------------------------------------------------------------------- legal */

export const LEGAL_KEYS = ['terms', 'privacy', 'cookies'] as const;
export const COOKIE_CATEGORIES = ['necessary', 'statistics', 'marketing'] as const;

/**
 * Legal pages (`src/content/legal/<lang>/<terms|privacy|cookies>.md`). The Markdown body is the
 * document itself, structured with `##` headings that become the table of contents. Every
 * paragraph of actual legal wording is a placeholder marked TODO(legal) until the owner's
 * adviser reviews it.
 */
const legal = defineCollection({
  loader: localizedGlob('legal', 'md'),
  schema: z.object({
    ...localized,
    translationKey: z.enum(LEGAL_KEYS),
    title: z.string().min(1),
    description: z.string().min(1),
    /** Date of the last change to the text; shown as "last updated". */
    updated: z.coerce.date(),
    /** Cookie inventory, shown as a table on the cookie policy page only. */
    cookies: z
      .array(
        z.object({
          name: z.string().min(1),
          category: z.enum(COOKIE_CATEGORIES),
          purpose: z.string().min(1),
          duration: z.string().min(1),
          provider: z.string().min(1),
        }),
      )
      .optional(),
  }),
});

export const collections = { research, testimonials, gallery, faq, services, blog, pages, legal };

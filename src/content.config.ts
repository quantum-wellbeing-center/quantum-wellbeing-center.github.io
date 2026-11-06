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
 *     in both languages and flags cedilla characters.
 *
 * Formats: `faq` is Markdown (`.md`: frontmatter + body); `research`,
 * `testimonials`, `gallery` and `services` are JSON (`.json`).
 *
 * Image fields (`gallery.image`) are paths relative to the entry file, e.g.
 * `../../../assets/gallery/placeholder-01.svg`, and resolve to `ImageMetadata` for `astro:assets`.
 *
 * Querying one language from a page:
 *
 *   const faqs = await getCollection('faq', (entry) => entry.data.lang === lang);
 *   const { Content } = await render(entry);   // Markdown body of a faq entry
 *
 * Consent: the `testimonials` schema only accepts `consent: true`, so an entry without written
 * consent cannot build at all. A `gallery` entry needs `consent: true` only when
 * `identifiablePeople` is set (photos of the space need no consent). Pages must still filter on
 * these rules before rendering (see src/lib/content.ts), so the rule is visible where the
 * content is shown.
 *
 * Research: `fileSizeBytes`, `fileType` and `summaryFileSizeBytes` are derived at load time from
 * the real files in `public/research/` (for local paths) and must not be set by hand. The build
 * fails when a local PDF is missing, and when two entries in the same language point at the same
 * PDF (the RO and EN versions of one document legitimately share a file). `cover` is the first
 * page of the PDF, rendered by `npm run research:covers` into `src/assets/research/`.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { Loader, LoaderContext } from 'astro/loaders';
import { statSync } from 'node:fs';

/* ------------------------------------------------------------------ shared */

export const LANGS = ['ro', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** What kind of document a research entry is (section 7). Labels live in `documentType.*`. */
export const DOCUMENT_TYPES = [
  'peer-reviewed',
  'clinical-study',
  'pilot-study',
  'case-report',
  'review',
  'report',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

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

/** Size of a local research file, failing the build with a clear message when it is missing. */
function localFileSize(path: string, ctx: LoaderContext, id: string): number {
  const stats = statPdf(path, ctx);
  if (!stats) {
    throw new Error(
      `Content error (research): entry "${id}" points at "${path}" but there is no such file in public/research/. Add the PDF or fix the path.`,
    );
  }
  return stats.size;
}

/**
 * Adds `fileType` and, for local files, `fileSizeBytes` (and `summaryFileSizeBytes` for a local
 * `summaryPdf`) to a research entry's raw data.
 */
function enrichResearch(
  data: Record<string, unknown>,
  ctx: LoaderContext,
  id: string,
): Record<string, unknown> {
  const { pdf, summaryPdf } = data;
  if (typeof pdf !== 'string') return data; // the schema reports the problem
  const next: Record<string, unknown> = { ...data, fileType: fileTypeOf(pdf) };
  delete next.fileSizeBytes;
  delete next.summaryFileSizeBytes;
  if (LOCAL_PDF.test(pdf)) next.fileSizeBytes = localFileSize(pdf, ctx, id);
  if (typeof summaryPdf === 'string' && LOCAL_PDF.test(summaryPdf)) {
    next.summaryFileSizeBytes = localFileSize(summaryPdf, ctx, id);
  }
  return next;
}

/** Makes the content digest change whenever a referenced local PDF changes. */
function researchDigestExtra(rawContents: string, ctx: LoaderContext): string {
  try {
    const { pdf, summaryPdf } = JSON.parse(rawContents) as { pdf?: unknown; summaryPdf?: unknown };
    return [pdf, summaryPdf]
      .filter((path): path is string => typeof path === 'string' && LOCAL_PDF.test(path))
      .map((path) => {
        const stats = statPdf(path, ctx);
        return stats ? `${path}:${stats.size}:${stats.mtimeMs}` : `${path}:missing`;
      })
      .join('\n');
  } catch {
    return '';
  }
}

/** Fails the build when two entries in the same language share one PDF path or URL. */
function verifyNoDuplicatePdfs(ctx: LoaderContext): void {
  const byKey = new Map<string, string[]>();
  for (const [id, entry] of ctx.store.entries()) {
    const { lang, pdf, summaryPdf } = entry.data as {
      lang: string;
      pdf: string;
      summaryPdf?: string;
    };
    for (const path of [pdf, summaryPdf]) {
      if (!path) continue;
      const key = `${lang} ${path.trim().toLowerCase()}`;
      byKey.set(key, [...(byKey.get(key) ?? []), id]);
    }
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

/** `/research/<file>.pdf` (served from public/research/) or an absolute http(s) URL. */
const documentPath = z.string().refine((value) => LOCAL_PDF.test(value) || ABSOLUTE_URL.test(value), {
  message:
    'must be a path like /research/<file>.pdf (a file in public/research/) or an absolute http(s) URL',
});

/**
 * One document of the research page. Titles stay in the document's own language (most are in
 * English), so the RO and EN entries of a document usually differ only in `lang` and `source`.
 */
const research = defineCollection({
  loader: localizedGlob('research', 'json', {
    enrich: enrichResearch,
    digestExtra: researchDigestExtra,
    verify: verifyNoDuplicatePdfs,
  }),
  schema: ({ image }) =>
    z.object({
      ...localized,
      title: z.string().min(1),
      /** As the document names them; empty when it names nobody. */
      authors: z.array(z.string().min(1)).default([]),
      year: z.number().int().min(1900).max(2100).optional(),
      /** Set only when the document says what it is; shown as a badge. */
      documentType: z.enum(DOCUMENT_TYPES).optional(),
      /** Publisher, journal, organisation or affiliation. */
      source: z.string().min(1).optional(),
      doi: z.string().min(1).optional(),
      pdf: documentPath,
      /** A second file: a short summary of the same document. */
      summaryPdf: documentPath.optional(),
      /** Thumbnail of the first page, relative to the entry file (`npm run research:covers`). */
      cover: image().optional(),
      /** An optional one-line note shown under the meta line. */
      description: z
        .string()
        .min(1)
        .max(200, 'description is one line of at most 200 characters')
        .refine((value) => !/\r?\n/.test(value), 'description must be a single line')
        .optional(),
      /** Featured documents come first and get the wide card. */
      featured: z.boolean().default(false),
      /** Derived at load time from the real file; do not set by hand. */
      fileSizeBytes: z.number().int().nonnegative().optional(),
      /** Derived at load time from the file extension (e.g. "PDF"); do not set by hand. */
      fileType: z.string().optional(),
      /** Derived at load time from the real summary file; do not set by hand. */
      summaryFileSizeBytes: z.number().int().nonnegative().optional(),
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
    /** About the experience, the staff, the space or the booking only (section 9). */
    quote: z.string().min(1),
    date: z.coerce.date(),
    rating: z.number().int().min(1).max(5).optional(),
    source: z.enum(TESTIMONIAL_SOURCES),
    /** Written consent is required to publish. Only `true` is accepted. */
    consent: z.literal(true),
  }),
});

/* ----------------------------------------------------------------- gallery */

/**
 * Images of the centre's space, team and atmosphere only: no before/after photos. An entry
 * that shows a recognisable person must carry `consent: true`; photos of the space need not.
 */
const gallery = defineCollection({
  loader: localizedGlob('gallery', 'json'),
  schema: ({ image }) =>
    z
      .object({
        ...localized,
        image: image(),
        /** Read by screen readers only; the gallery shows no captions. */
        alt: z.string().min(1),
        /** True when a person in the photo can be recognised (team or visitors). */
        identifiablePeople: z.boolean().default(false),
        /** Written consent from the people shown. Required (and must be `true`) when `identifiablePeople` is set. */
        consent: z.boolean().optional(),
        /** Shown large in the home page's "Spațiul" section (in `order`). */
        featured: z.boolean().default(false),
        order: z.number().int(),
      })
      .refine((data) => !data.identifiablePeople || data.consent === true, {
        path: ['consent'],
        message:
          'consent: true is required when identifiablePeople is true (written consent from everyone recognisable in the photo)',
      }),
});

/* --------------------------------------------------------------------- faq */

const faq = defineCollection({
  loader: localizedGlob('faq', 'md'),
  schema: z.object({
    ...localized,
    question: z.string().min(1),
    /** Position in the single flat list on the FAQ page. */
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
    /** The duration in words ("O oră", "Două ore"): the card title on the pricing page. */
    durationLabel: z.string().min(1),
    /** Factual: what the service is, what happens during the visit, what it includes. */
    description: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    /** Plain number; format with `Intl.NumberFormat` for the page locale. */
    price: z.number().nonnegative(),
    currency: z.literal('RON').default('RON'),
    highlighted: z.boolean().default(false),
    order: z.number().int(),
    /** Full prefilled WhatsApp message for booking this service, in the entry's language. */
    whatsappMessage: z.string().min(1),
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
  'about',
  'research',
  'testimonials',
  'pricing',
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

/** One step of "Cum te programezi": a short title and one sentence. */
const step = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
});

const pages = defineCollection({
  loader: localizedGlob('pages', 'md'),
  schema: z.discriminatedUnion('translationKey', [
    z.object({
      ...pageBase,
      translationKey: z.literal('home'),
      /** Section order follows WEBSITE_PLAN.md section 6. */
      hero: z.object({
        /** "Centru de wellness" and its English equivalent. */
        eyebrow: z.string().min(1),
        headline: z.string().min(1),
        subheading: z.string().min(1),
      }),
      /** "Despre centru": a title over a row of the featured gallery photos, no other text. */
      about: z.object({ heading: z.string().min(1) }),
      services: headed,
      steps: z.object({
        heading: z.string().min(1),
        /** Optional lead under the heading; the home page currently has none. */
        text: z.string().min(1).optional(),
        items: z.array(step).length(3),
      }),
      testimonials: headed,
      faq: headed,
      cta: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('about'),
      /** The lead under the h1. */
      subheading: z.string().min(1),
      /**
       * The inventor's card. The photo is src/assets/people/sandra-rose-michael.jpg; the
       * Markdown body is the biography, one paragraph per block.
       */
      inventor: z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        photoAlt: z.string().min(1),
      }),
      /**
       * The interview: a heading over a click-to-play YouTube video. The poster is
       * src/assets/video/<youtubeId>.jpg (YouTube's maxresdefault.jpg); without one the player
       * shows a plain brand-coloured poster.
       */
      video: z.object({
        heading: z.string().min(1),
        youtubeId: z
          .string()
          .regex(
            /^[A-Za-z0-9_-]{11}$/,
            'youtubeId is the 11-character id after "v=" in the YouTube link',
          ),
        title: z.string().min(1),
      }),
      cta: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('research'),
      /** The lead under the h1. */
      subheading: z.string().min(1),
      /** The h2 over the documents, with a link to testimonials from other centres. */
      library: z.object({
        heading: z.string().min(1),
        text: z.string().min(1).optional(),
        link: z.object({ label: z.string().min(1), href: z.url() }).optional(),
      }),
      /** The booking band after the documents: the centre's name and an invitation. */
      cta: headed,
      /** The testimonials row at the end of the page. */
      testimonials: headed,
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('testimonials'),
      subheading: z.string().min(1),
      /** Just the heading over the photos: no lead text. */
      gallery: z.object({ heading: z.string().min(1) }),
    }),
    z.object({
      ...pageBase,
      translationKey: z.literal('pricing'),
      subheading: z.string().min(1),
      /** Small line above each card's duration ("Sesiune EESystem"). */
      sessionLabel: z.string().min(1),
      /** The Markdown body (optional) is a short note under the cards: what every session includes. */
      cta: headed,
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
      /** The intro paragraph above the contact rows. The Markdown body (optional) is a note under them. */
      subheading: z.string().min(1),
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
    /**
     * Cookie inventory, shown as a table on the cookie policy page. Empty by default: the site
     * sets no cookies until analytics or embeds are enabled (TODO(legal) in the policy).
     */
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
      .default([]),
  }),
});

export const collections = { research, testimonials, gallery, faq, services, pages, legal };

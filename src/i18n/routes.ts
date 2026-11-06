/**
 * Route map between languages (WEBSITE_PLAN.md section 6).
 * Dynamic segments use the `[param]` syntax and are filled by `getRoute`.
 */
import type { Locale } from '../config/site';

export const locales: readonly Locale[] = ['ro', 'en'] as const;
export const defaultLocale: Locale = 'ro';

export const routes = {
  home: { ro: '/', en: '/en/' },
  about: { ro: '/despre-eesystem/', en: '/en/about-eesystem/' },
  research: { ro: '/cercetari-stiintifice/', en: '/en/research/' },
  testimonials: { ro: '/testimoniale/', en: '/en/testimonials/' },
  pricing: { ro: '/preturi/', en: '/en/pricing/' },
  faq: { ro: '/intrebari-frecvente/', en: '/en/faq/' },
  contact: { ro: '/contact/', en: '/en/contact/' },
  terms: { ro: '/termeni-si-conditii/', en: '/en/terms/' },
  privacy: { ro: '/politica-de-confidentialitate/', en: '/en/privacy/' },
  cookies: { ro: '/politica-cookies/', en: '/en/cookies/' },
  notFound: { ro: '/404/', en: '/en/404/' },
  /** Internal, noindex design reference. */
  styleguide: { ro: '/styleguide/', en: '/styleguide/' },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageKey = keyof typeof routes;

/** Primary navigation order (section 6). FAQ lives in the footer and on the home page. */
export const primaryNav = [
  'about',
  'research',
  'testimonials',
  'pricing',
  'contact',
] as const satisfies readonly PageKey[];

export const footerUsefulNav = [
  'about',
  'research',
  'testimonials',
  'pricing',
  'faq',
  'contact',
] as const satisfies readonly PageKey[];

export const footerLegalNav = ['terms', 'privacy', 'cookies'] as const satisfies readonly PageKey[];

/** Page keys that have a `nav.*` label in the dictionaries. */
export type NavKey =
  | (typeof primaryNav)[number]
  | (typeof footerUsefulNav)[number]
  | (typeof footerLegalNav)[number]
  | 'home';

/**
 * i18n helpers: translations, route lookups, and Intl formatting.
 *
 * Usage in a page or component:
 *   const t = useTranslations(lang);
 *   t('actions.bookSession');
 *   t('footer.copyright', { year: 2026, brand: site.brandName });
 */
import type { Locale } from '../config/site';
import ro from './ro.json';
import en from './en.json';
import { routes, defaultLocale, locales, type PageKey } from './routes';

export type { Locale } from '../config/site';
export {
  routes,
  defaultLocale,
  locales,
  primaryNav,
  footerUsefulNav,
  footerLegalNav,
} from './routes';
export type { PageKey, NavKey } from './routes';

type Dictionary = typeof ro;

/** Dot-path keys of the dictionary: "nav.home", "footer.copyright", ... */
type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : DotPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = DotPaths<Dictionary>;

type NestedStrings = { [key: string]: string | NestedStrings };

const dictionaries: Record<Locale, NestedStrings> = {
  ro: ro as NestedStrings,
  en: en as NestedStrings,
};

/** Flattens a nested string dictionary into "a.b.c" keys. */
function flattenKeys(obj: NestedStrings, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : flattenKeys(value, `${prefix}${key}.`),
  );
}

/**
 * Build-time assertion: both dictionaries must have identical key sets.
 * This module is imported by BaseLayout, so a missing key fails `astro build`.
 */
export function assertDictionariesMatch(): void {
  const roKeys = new Set(flattenKeys(dictionaries.ro));
  const enKeys = new Set(flattenKeys(dictionaries.en));
  const missingInEn = [...roKeys].filter((k) => !enKeys.has(k));
  const missingInRo = [...enKeys].filter((k) => !roKeys.has(k));
  if (missingInEn.length || missingInRo.length) {
    throw new Error(
      `i18n key mismatch. Missing in en.json: [${missingInEn.join(', ')}]. ` +
        `Missing in ro.json: [${missingInRo.join(', ')}].`,
    );
  }
}
assertDictionariesMatch();

function lookup(dict: NestedStrings, key: string): string | undefined {
  let current: string | NestedStrings | undefined = dict;
  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export type TranslationParams = Record<string, string | number>;

/** Replaces `{name}` placeholders. */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Returns the string for `key` in `lang`, falling back to Romanian, then to the key itself. */
export function t(lang: Locale, key: TranslationKey, params?: TranslationParams): string {
  const value = lookup(dictionaries[lang], key) ?? lookup(dictionaries[defaultLocale], key);
  if (value === undefined) {
    throw new Error(`Missing translation "${key}" for "${lang}".`);
  }
  return interpolate(value, params);
}

/** Binds `t` to a language. */
export function useTranslations(lang: Locale) {
  return (key: TranslationKey, params?: TranslationParams): string => t(lang, key, params);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** The other language of the pair. */
export function otherLocale(lang: Locale): Locale {
  return lang === 'ro' ? 'en' : 'ro';
}

/** The BCP 47 tag used in `lang` attributes and Intl. */
export function bcp47(lang: Locale): string {
  return lang === 'ro' ? 'ro-RO' : 'en';
}

export type RouteParams = Record<string, string>;

/** Fills `[param]` segments of a route pattern. */
function fillParams(pattern: string, params?: RouteParams): string {
  return pattern.replace(/\[(\w+)\]/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`Route "${pattern}" needs a "${name}" parameter.`);
    }
    return value;
  });
}

/** Path of a page in a language, e.g. getRoute('en', 'research') → '/en/research/'. */
export function getRoute(lang: Locale, pageKey: PageKey, params?: RouteParams): string {
  return fillParams(routes[pageKey][lang], params);
}

/** Path of the same page in the other language. */
export function getAlternatePath(lang: Locale, pageKey: PageKey, params?: RouteParams): string {
  return getRoute(otherLocale(lang), pageKey, params);
}

/**
 * Prefixes an arbitrary path for a language: localizePath('en', '/x/') → '/en/x/'.
 * Romanian is the default locale and gets no prefix.
 */
export function localizePath(lang: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const withSlash = clean.endsWith('/') ? clean : `${clean}/`;
  if (lang === defaultLocale) return withSlash;
  return withSlash === '/' ? `/${lang}/` : `/${lang}${withSlash}`;
}

/** Detects the language from a path: '/en/...' → 'en', otherwise 'ro'. */
export function localeFromPath(path: string): Locale {
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'ro';
}

export function formatDate(
  lang: Locale,
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(bcp47(lang), options).format(value);
}

export function formatPrice(lang: Locale, amount: number, currency = 'RON'): string {
  return new Intl.NumberFormat(bcp47(lang), {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatNumber(lang: Locale, value: number): string {
  return new Intl.NumberFormat(bcp47(lang)).format(value);
}

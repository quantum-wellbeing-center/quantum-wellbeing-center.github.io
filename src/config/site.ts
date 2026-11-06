/**
 * Site-wide configuration: brand, contact, socials, WhatsApp messages, analytics, feature flags.
 * Every value marked TODO(content) is a placeholder the owner must replace (see WEBSITE_PLAN.md
 * section 2). Components read from here and never hard-code any of these values.
 */

export type Locale = 'ro' | 'en';

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface OpeningHoursEntry {
  day: Weekday;
  /** 24h "HH:MM"; null when closed. */
  opens: string | null;
  closes: string | null;
}

export type AnalyticsConfig =
  | { provider: 'none' }
  | { provider: 'plausible'; domain: string; scriptUrl?: string }
  | { provider: 'umami'; websiteId: string; scriptUrl: string }
  | { provider: 'gtag'; measurementId: string };

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

/** Quick-reply chips in the WhatsApp chat panel; also the topic of every booking link. */
export type ChatTopic = 'booking' | 'pricing' | 'other';

/** Building blocks of the prefilled WhatsApp message (see src/lib/whatsapp.ts). */
export interface WhatsAppMessages {
  /** Opening line of every message. */
  greeting: string;
  /** One sentence per chat topic. */
  topics: Record<ChatTopic, string>;
  /** Templates for the optional parts; `{value}` is replaced and the part is skipped when empty. */
  service: string;
  name: string;
  preferredTime: string;
}

export interface SiteConfig {
  /** Public brand name shown in the header, titles and copyright. */
  brandName: string;
  /** Short tagline used in default meta descriptions and the OG image. */
  tagline: Record<Locale, string>;
  legal: {
    legalName: string;
    cui: string;
    regCom: string;
  };
  domain: string;
  address: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  /** E.164 form used in tel: links. */
  phoneHref: string;
  /** Leave empty to hide the email everywhere (footer, top bar, contact page, schema.org). */
  email: string;
  /** Digits only, international format, for wa.me links. */
  whatsappNumber: string;
  /** Prefilled WhatsApp message parts per language. */
  whatsappMessages: Record<Locale, WhatsAppMessages>;
  openingHours: OpeningHoursEntry[];
  socials: SocialLinks;
  /** "Open in Google Maps" link to the address (new tab). */
  mapUrl: string;
  /** Google Maps embed (no API key) with a pin on the address; the contact page adds `&hl=<lang>`. */
  mapEmbedUrl: string;
  analytics: AnalyticsConfig;
  features: {
    /** Google reviews embed (third-party, consent-gated). Off by default. */
    reviewsEmbed: boolean;
    /** Floating WhatsApp button. */
    whatsappButton: boolean;
    /** Top info bar above the header. */
    topBar: boolean;
  };
  /** Brand accent in hex (theme-color and the like); keep in sync with `--accent` in tokens.css. */
  accentColor: string;
  /** Cookie consent storage version. Bump to ask visitors again after a policy change. */
  consentVersion: number;
}

/**
 * What Google Maps searches for, both for the link and the embedded map's pin. Keep in sync
 * with `address`. Google knows the centre as "DN1C 224"; "Strada Clujului 71" resolves to a
 * street of the same name in Sânnicoară instead.
 */
const mapQuery = encodeURIComponent('DN1C 224, 407335 Iclod, România');

export const site: SiteConfig = {
  brandName: 'Quantum Wellbeing Center',
  tagline: {
    ro: 'Centru de wellness în Iclod, județul Cluj', // keep the place in sync with address
    en: 'Wellness centre in Iclod, Cluj County', // keep the place in sync with address
  },
  legal: {
    legalName: 'Exemplu Wellness SRL', // TODO(content): company legal name
    cui: 'RO00000000', // TODO(content): CUI
    regCom: 'J00/000/2000', // TODO(content): Reg. Com. number
  },
  domain: 'https://quantum-wellbeing-center.github.io', // also set in astro.config.mjs and public/robots.txt
  address: {
    street: 'DN1C 224',
    city: 'Iclod',
    county: 'Cluj',
    postalCode: '407335', // Iclod village; the village has one postal code for every street
    country: 'RO',
  },
  phone: '0748 011 259',
  phoneHref: '+40748011259',
  email: '', // TODO(content): the centre has no email yet; fill it in and it appears everywhere
  whatsappNumber: '40748011259',
  whatsappMessages: {
    ro: {
      greeting: 'Bună ziua!',
      topics: {
        booking: 'Aș dori o programare.',
        pricing: 'Aș avea o întrebare despre prețuri.',
        other: 'Aș avea o întrebare.',
      },
      service: 'Serviciul: {value}.',
      name: 'Nume: {value}.',
      preferredTime: 'Ziua/ora preferată: {value}.',
    },
    en: {
      greeting: 'Hello!',
      topics: {
        booking: 'I would like to book an appointment.',
        pricing: 'I have a question about prices.',
        other: 'I have a question.',
      },
      service: 'Service: {value}.',
      name: 'Name: {value}.',
      preferredTime: 'Preferred day/time: {value}.',
    },
  },
  openingHours: [
    // TODO(content): real opening hours
    { day: 'monday', opens: '09:00', closes: '20:00' },
    { day: 'tuesday', opens: '09:00', closes: '20:00' },
    { day: 'wednesday', opens: '09:00', closes: '20:00' },
    { day: 'thursday', opens: '09:00', closes: '20:00' },
    { day: 'friday', opens: '09:00', closes: '20:00' },
    { day: 'saturday', opens: '10:00', closes: '16:00' },
    { day: 'sunday', opens: null, closes: null },
  ],
  socials: {
    // TODO(content): social profile URLs; remove the ones that do not exist
    facebook: 'https://www.facebook.com/example',
    instagram: 'https://www.instagram.com/example',
    youtube: 'https://www.youtube.com/@example',
    tiktok: 'https://www.tiktok.com/@example',
  },
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${mapQuery}`,
  mapEmbedUrl: `https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`,
  analytics: { provider: 'none' }, // TODO(content): set a provider only if the owner wants analytics
  features: {
    reviewsEmbed: false,
    whatsappButton: true,
    topBar: false, // owner asked to remove the phone/hours/email strip above the header (2026-11-05)
  },
  accentColor: '#0E7390', // brand teal-blue derived from the banner; mirrors --accent in tokens.css
  consentVersion: 1,
};

/** Analytics providers that set no cookies and need no consent banner category. */
export function isCookielessAnalytics(config: SiteConfig = site): boolean {
  return config.analytics.provider === 'plausible' || config.analytics.provider === 'umami';
}

/**
 * Whether the cookie consent banner must be shown (WEBSITE_PLAN.md section 8).
 *
 * The site sets no cookies by default, so the default answer is false: no banner, no notice,
 * no consent markup or script. The banner is needed only when the config turns on something
 * that stores data on the visitor's device: analytics that is not cookieless (gtag) or the
 * Google reviews embed. Plausible and Umami are cookieless and never trigger it.
 *
 *   needsConsentBanner()                                        → false (default config)
 *   needsConsentBanner({ ...site, analytics: { provider: 'gtag', measurementId: 'G-1' } }) → true
 *   needsConsentBanner({ ...site, features: { ...site.features, reviewsEmbed: true } })    → true
 */
export function needsConsentBanner(config: SiteConfig = site): boolean {
  const cookieAnalytics = config.analytics.provider !== 'none' && !isCookielessAnalytics(config);
  return cookieAnalytics || config.features.reviewsEmbed;
}

const weekdayOrder: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Groups consecutive days with identical hours, e.g. monday to friday 09:00 to 20:00.
 * Used by the top bar and the footer to print a compact schedule.
 */
export function groupOpeningHours(
  hours: OpeningHoursEntry[] = site.openingHours,
): { from: Weekday; to: Weekday; opens: string | null; closes: string | null }[] {
  const sorted = [...hours].sort(
    (a, b) => weekdayOrder.indexOf(a.day) - weekdayOrder.indexOf(b.day),
  );
  const groups: { from: Weekday; to: Weekday; opens: string | null; closes: string | null }[] = [];
  for (const entry of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.opens === entry.opens && last.closes === entry.closes) {
      last.to = entry.day;
    } else {
      groups.push({ from: entry.day, to: entry.day, opens: entry.opens, closes: entry.closes });
    }
  }
  return groups;
}

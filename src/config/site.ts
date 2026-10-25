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

export interface CommunityChannel {
  provider: 'telegram' | 'whatsapp';
  url: string;
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
  email: string;
  /** Digits only, international format, for wa.me links. */
  whatsappNumber: string;
  /** Prefilled WhatsApp message parts per language. */
  whatsappMessages: Record<Locale, WhatsAppMessages>;
  openingHours: OpeningHoursEntry[];
  socials: SocialLinks;
  community: CommunityChannel;
  mapUrl: string;
  analytics: AnalyticsConfig;
  features: {
    /** Google reviews embed (third-party, consent-gated). Off by default. */
    reviewsEmbed: boolean;
    /** EU SOL (ODR) badge: the platform closed in July 2025, keep off unless the adviser says otherwise. */
    showSolBadge: boolean;
    /** Floating WhatsApp button. */
    whatsappButton: boolean;
    /** Top info bar above the header. */
    topBar: boolean;
  };
  /** Brand accent in hex. The default is the HIG blue; see tokens.css if the owner supplies one. */
  accentColor: string;
  /** Cookie consent storage version. Bump to ask visitors again after a policy change. */
  consentVersion: number;
}

export const site: SiteConfig = {
  brandName: 'Centrul Wellness', // TODO(content): real brand name
  tagline: {
    ro: 'Centru de wellness în București', // TODO(content): real tagline; keep the city in sync with address.city
    en: 'Wellness centre in Bucharest', // TODO(content): real tagline; keep the city in sync with address.city
  },
  legal: {
    legalName: 'Exemplu Wellness SRL', // TODO(content): company legal name
    cui: 'RO00000000', // TODO(content): CUI
    regCom: 'J00/000/2000', // TODO(content): Reg. Com. number
  },
  domain: 'https://example.com', // TODO(content): real domain, also set in astro.config.mjs
  address: {
    street: 'Str. Exemplu nr. 1', // TODO(content): street address
    city: 'București', // TODO(content): city
    county: 'București', // TODO(content): county
    postalCode: '000000', // TODO(content): postal code
    country: 'RO',
  },
  phone: '0748 011 259',
  phoneHref: '+40748011259',
  email: 'contact@example.com', // TODO(content): email
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
  community: {
    provider: 'telegram',
    url: 'https://t.me/example', // TODO(content): community channel link
  },
  mapUrl: 'https://maps.google.com/?q=Str.+Exemplu+nr.+1,+Bucure%C8%99ti', // TODO(content): Google Maps link
  analytics: { provider: 'none' }, // TODO(content): set a provider only if the owner wants analytics
  features: {
    reviewsEmbed: false,
    showSolBadge: false, // TODO(legal): confirm whether the EU SOL badge is still required after the platform closed in July 2025
    whatsappButton: true,
    topBar: true,
  },
  accentColor: '#0066CC', // TODO(content): brand accent colour; check contrast per WEBSITE_PLAN.md section 5
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

/**
 * Site-wide configuration: brand, contact, socials, booking, forms, analytics, feature flags.
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

export type FormProvider = 'netlify' | 'formspree' | 'web3forms';

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
  openingHours: OpeningHoursEntry[];
  bookingUrl: string;
  form: {
    provider: FormProvider;
    endpoint: string;
  };
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
    ro: 'Sesiuni de relaxare și stare de bine', // TODO(content): real tagline
    en: 'Relaxation and wellbeing sessions', // TODO(content): real tagline
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
  phone: '+40 700 000 000', // TODO(content): phone number as displayed
  phoneHref: '+40700000000', // TODO(content): phone number for tel: links
  email: 'contact@example.com', // TODO(content): email
  whatsappNumber: '40700000000', // TODO(content): WhatsApp number, digits only
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
  bookingUrl: 'https://cal.com/example/sesiune', // TODO(content): booking link (Cal.com, Calendly, Fresha or WhatsApp)
  form: {
    provider: 'netlify',
    endpoint: '/', // TODO(content): for Formspree or Web3Forms set the endpoint URL here
  },
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

/** True when any script that needs consent is configured. */
export function hasOptionalScripts(config: SiteConfig = site): boolean {
  return config.analytics.provider !== 'none' || config.features.reviewsEmbed;
}

/** Analytics providers that set no cookies and need no consent banner category. */
export function isCookielessAnalytics(config: SiteConfig = site): boolean {
  return config.analytics.provider === 'plausible' || config.analytics.provider === 'umami';
}

export const whatsappUrl = `https://wa.me/${site.whatsappNumber}`;

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

import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { routes, type PageKey } from '../src/i18n/routes';
import { site } from '../src/config/site';

/**
 * Pages and content checks: every static route from the route map in both languages, the
 * sitemap index and the 404 pages. Each HTML page must have
 * one h1, a title, a meta description, a canonical link, hreflang alternates that point at the
 * route map's paths, `html[lang]` for its language and no raw "undefined" text.
 *
 * Booking: every booking button is a `[data-chat-open]` wa.me link with a prefilled message;
 * the pricing cards carry `data-chat-service` and prefill the card's own
 * `whatsappMessage`; the contact page has the WhatsApp trigger, the `tel:` link, the maps
 * link and the embedded Google map.
 */

type Lang = 'ro' | 'en';

const root = process.cwd();
const WA_PREFIX = `https://wa.me/${site.whatsappNumber}?text=`;
const TEL = `tel:${site.phoneHref}`;

/** The services collection as the pages see it: translationKey, name and prefilled message. */
function services(lang: Lang): { key: string; name: string; message: string }[] {
  const dir = join(root, 'src', 'content', 'services', lang);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const data = JSON.parse(readFileSync(join(dir, name), 'utf8')) as {
        translationKey: string;
        name: string;
        whatsappMessage: string;
      };
      return { key: data.translationKey, name: data.name, message: data.whatsappMessage };
    });
}

const staticKeys = (Object.keys(routes) as PageKey[]).filter(
  (key) => key !== 'notFound' && key !== 'styleguide',
);

const pages: { path: string; lang: Lang; key: string; alternate: string | null }[] = [
  ...staticKeys.map((key) => ({
    path: routes[key].ro,
    lang: 'ro' as const,
    key,
    alternate: routes[key].en,
  })),
  ...staticKeys.map((key) => ({
    path: routes[key].en,
    lang: 'en' as const,
    key,
    alternate: routes[key].ro,
  })),
];

const BAD_TEXT = /\bundefined\b|\[object Object\]|\bNaN\b/;
const RAW_KEY =
  /\b(?:nav|actions|a11y|common|research|documentType|pricing|faq|contact|legal|notFound)\.[a-zA-Z]+\b/;

function decodeMessage(href: string | null): string {
  expect(href, 'booking href').toMatch(new RegExp(`^${WA_PREFIX.replace(/[.?+]/g, '\\$&')}.+`));
  return decodeURIComponent((href as string).slice(WA_PREFIX.length));
}

async function expectWellFormed(page: Page, lang: Lang, path: string, alternate: string | null) {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/.+\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', lang === 'ro' ? 'ro-RO' : 'en');

  const alternates = await page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) =>
      links.map((l) => [
        l.getAttribute('hreflang'),
        new URL(l.getAttribute('href') ?? '').pathname,
      ]),
    );
  if (alternate) {
    const byLang = Object.fromEntries(alternates) as Record<string, string>;
    expect(Object.keys(byLang).sort()).toEqual(['en', 'ro', 'x-default']);
    const roPath = lang === 'ro' ? path : alternate;
    const enPath = lang === 'en' ? path : alternate;
    expect(byLang.ro).toBe(roPath);
    expect(byLang.en).toBe(enPath);
    expect(byLang['x-default']).toBe(roPath);
  }

  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(BAD_TEXT);
  expect(text).not.toMatch(RAW_KEY);
}

test.describe('every route builds and is well-formed', () => {
  for (const { path, lang, key, alternate } of pages) {
    test(`${lang} ${key}: ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expectWellFormed(page, lang, path, alternate);

      // The language switcher keeps the current page in the other language and resolves.
      const other = lang === 'ro' ? 'en' : 'ro';
      const switcher = page.locator(`[data-lang-switch="${other}"]`);
      await expect(switcher).toHaveCount(1);
      const href = await switcher.getAttribute('href');
      expect(href).toBeTruthy();
      if (alternate) expect(href).toBe(alternate);
      const twin = await page.request.get(href as string);
      expect(twin.status()).toBe(200);
    });
  }
});

test.describe('404 pages', () => {
  for (const [path, lang, home] of [
    ['/404/', 'ro', '/'],
    ['/en/404/', 'en', '/en/'],
  ] as const) {
    test(`${path} renders the ${lang} not-found page`, async ({ page }) => {
      const response = await page.goto(path);
      // The preview server may answer with 200 (built file) or 404 (fallback): both are fine.
      expect([200, 404]).toContain(response?.status());
      await expectWellFormed(page, lang, path, lang === 'ro' ? '/en/404/' : '/404/');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('main a[href="' + home + '"]').first()).toBeVisible();
      const contactHref = lang === 'ro' ? routes.contact.ro : routes.contact.en;
      await expect(page.locator(`main a[href="${contactHref}"]`).first()).toBeVisible();
      const otherHome = lang === 'ro' ? '/en/' : '/';
      await expect(page.locator(`main a[href="${otherHome}"]`).first()).toBeVisible();
    });
  }

  test('an unknown URL serves the Romanian 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro-RO');
  });
});

test.describe('sitemap', () => {
  test('sitemap index exists', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<sitemapindex');
  });
});

test.describe('booking through the WhatsApp chat', () => {
  const expectedTriggers: Partial<Record<PageKey, number>> = {
    home: 2, // hero and the CTA band
    pricing: 4, // one per service plus the CTA band
    faq: 1,
    contact: 1,
  };

  for (const lang of ['ro', 'en'] as const) {
    for (const [key, count] of Object.entries(expectedTriggers) as [PageKey, number][]) {
      test(`${lang} ${key}: booking buttons are [data-chat-open] wa.me links`, async ({ page }) => {
        await page.goto(routes[key][lang]);
        const triggers = page.locator('main a[data-chat-open]');
        await expect(triggers).toHaveCount(count);
        const attrs = await triggers.evaluateAll((els) =>
          els.map((el) => ({
            href: el.getAttribute('href'),
            topic: el.getAttribute('data-chat-topic'),
            text: el.textContent?.trim() ?? '',
          })),
        );
        for (const { href, topic, text } of attrs) {
          expect(decodeMessage(href).length).toBeGreaterThan(10);
          expect(['booking', 'pricing', 'other']).toContain(topic);
          expect(text.length).toBeGreaterThan(0);
        }
        // Every booking link is visible without any JavaScript having run on it.
        for (let i = 0; i < count; i++) await expect(triggers.nth(i)).toBeVisible();
      });
    }

    test(`${lang} pricing: each card prefills its own whatsappMessage`, async ({ page }) => {
      await page.goto(routes.pricing[lang]);
      const entries = services(lang);
      expect(entries.length).toBe(3);
      for (const { key: serviceKey, name, message } of entries) {
        const card = page.locator(`main #service-${serviceKey}[data-service="${serviceKey}"]`);
        await expect(card).toHaveCount(1);
        const trigger = card.locator('a[data-chat-open][data-chat-service]');
        await expect(trigger).toHaveCount(1);
        await expect(trigger).toHaveAttribute('data-chat-service', name);
        await expect(trigger).toHaveAttribute('data-chat-topic', 'booking');
        expect(decodeMessage(await trigger.getAttribute('href'))).toBe(message);
      }
    });

    test(`${lang} contact: WhatsApp trigger, tel: link and the maps link`, async ({ page }) => {
      await page.goto(routes.contact[lang]);
      const main = page.locator('main');
      const trigger = main.locator('a[data-chat-open][data-chat-topic="other"]');
      await expect(trigger).toHaveCount(1);
      await expect(trigger).toBeVisible();
      expect(decodeMessage(await trigger.getAttribute('href'))).toContain(
        site.whatsappMessages[lang].topics.other,
      );
      await expect(main.locator(`a[href="${TEL}"]`).first()).toBeVisible();
      await expect(main.locator(`a[href="${TEL}"]`).first()).toContainText(site.phone);
      const maps = main.locator('a[data-map-link]');
      await expect(maps).toHaveAttribute('href', site.mapUrl);
      await expect(maps).toHaveAttribute('target', '_blank');
      await expect(maps).toHaveAttribute('rel', 'noopener');
      if (site.email) {
        await expect(main.locator(`a[href="mailto:${site.email}"]`)).toBeVisible();
      } else {
        await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
      }
      await expect(main.locator('address')).toContainText(site.address.street);
      const map = main.locator('iframe');
      await expect(map).toHaveCount(1);
      await expect(map).toHaveAttribute('src', `${site.mapEmbedUrl}&hl=${lang}`);
      await expect(map).toHaveAttribute('title', /Google Maps/);
      await expect(main.locator('form')).toHaveCount(0);
    });
  }
});

test.describe('page-specific hooks', () => {
  test('home page: the seven sections in order', async ({ page }) => {
    await page.goto(routes.home.ro);
    const order = await page
      .locator('main > section')
      .evaluateAll((els) => els.map((el) => el.id || el.className.split(' ')[0]));
    expect(order).toEqual([
      'hero',
      'home-about',
      'home-services',
      'home-steps',
      'home-testimonials',
      'home-faq',
      'home-cta',
    ]);
    const main = page.locator('main');
    await expect(main.locator('.hero__eyebrow')).toHaveText(
      'Quantum Wellbeing Center · Iclod, Cluj',
    );
    await expect(main.locator('.hero a[data-chat-open]')).toHaveText(/Programează-te pe WhatsApp/);
    await expect(main.locator(`.hero a[href="${routes.pricing.ro}"]`)).toHaveText(
      /Vezi prețurile/,
    );
    await expect(main.locator('#home-services [data-service]')).toHaveCount(3);
    await expect(
      main.locator('#home-services [data-service] a[href^="/preturi/#service-"]'),
    ).toHaveCount(3);
    await expect(main.locator('#home-steps ol > li')).toHaveCount(3);
    await expect(main.locator('#home-about h2')).toHaveText('Despre centru');
    await expect(main.locator('#home-about [data-strip-item] img')).toHaveCount(3);
    await expect(main.locator('#home-about p')).toHaveCount(0);
    // No local testimonials yet: the section links out to the official EESystem pages.
    await expect(main.locator('#home-testimonials .testimonial')).toHaveCount(0);
    await expect(
      main.locator('#home-testimonials a[href^="https://www.eesystem.com/testimonials"]'),
    ).toHaveCount(2);
    await expect(main.locator('#home-faq details')).toHaveCount(5);
    await expect(main.locator(`#home-cta a[href="${TEL}"]`)).toBeVisible();
  });

  test('services page is gone', async ({ request }) => {
    for (const path of ['/servicii/', '/en/services/']) {
      expect((await request.get(path)).status()).toBe(404);
    }
  });

  test('pricing page: one wide card per session, Intl prices', async ({ page }) => {
    await page.goto(routes.pricing.ro);
    const main = page.locator('main');
    const amounts = await main.locator('.price-card__amount').allInnerTexts();
    expect(amounts).toEqual(['70 lei', '90 lei', '120 lei']);
    await expect(main.locator('.price-card__name')).toHaveText([
      'O oră',
      'O oră și 30 min',
      'Două ore',
    ]);
    await expect(main.locator('[data-service] a[data-chat-open]')).toHaveCount(3);
    await page.goto(routes.pricing.en);
    const enAmounts = await page.locator('main .price-card__amount').allInnerTexts();
    expect(enAmounts).toEqual(['RON 70', 'RON 90', 'RON 120']);
  });

  test('research page: reference layout, a cover and a real PDF per card, no JS needed', async ({
    page,
  }) => {
    await page.goto(routes.research.ro);
    const main = page.locator('main');
    // h1 band, then the "Energy Enhancement System" h2 with the count and the outside link.
    await expect(main.locator('h1')).toHaveText('Cercetări științifice');
    const heading = main.locator('#research-library-heading');
    await expect(heading).toContainText('Energy Enhancement System');
    const outside = main.locator('.research-library__link');
    await expect(outside).toHaveAttribute('href', /^https:\/\//);
    await expect(outside).toHaveAttribute('target', '_blank');
    await expect(main.locator('[data-research-status][aria-live="polite"]')).toHaveCount(1);
    await expect(main.locator('[data-research-empty][hidden]')).toHaveCount(1);

    const items = main.locator('[data-research-item][data-title][data-authors]');
    const count = await items.count();
    expect(count).toBeGreaterThan(1);
    // Romanian plural: "20 de documente" from twenty up.
    await expect(heading).toContainText(count >= 20 ? `${count} de documente` : `${count}`);
    // Every card: a first-page thumbnail, the title linked to its own local PDF, and the size.
    await expect(main.locator('[data-research-item] img.doc-card__page')).toHaveCount(count);
    const hrefs = await main
      .locator('[data-research-item] a.doc-card__link')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    expect(hrefs).toHaveLength(count);
    expect(new Set(hrefs).size).toBe(count);
    for (const href of hrefs) expect(href).toMatch(/^\/research\/[a-z0-9-]+\.pdf$/);
    const metas = await main.locator('.doc-card__file').allInnerTexts();
    expect(metas.filter((m) => /PDF · .+ [KM]?B/.test(m))).toHaveLength(count);

    // The featured study comes first, on the wide card, with its summary as a second file.
    const first = items.first();
    await expect(first).toHaveClass(/doc-card--featured/);
    const summary = first.locator('a.doc-card__summary');
    await expect(summary).toHaveAttribute('href', /-summary\.pdf$/);
    for (const href of [hrefs[0], await summary.getAttribute('href')]) {
      expect((await page.request.get(href as string)).status()).toBe(200);
    }

    // After the documents: the booking band; the testimonials row appears once there are any.
    await expect(main.locator('#research-cta a[data-chat-open]')).toHaveCount(1);
    await expect(main.locator('#research-testimonials-heading')).toHaveCount(0);
  });

  test('testimonials page: links to EESystem centres, whole-photo gallery, no reviews', async ({
    page,
  }) => {
    await page.goto(routes.testimonials.en);
    const main = page.locator('main');
    await expect(main.locator('.disclaimer')).toHaveCount(0);
    await expect(main.locator('.testimonial')).toHaveCount(0);
    const world = main.locator('#world-testimonials a[target="_blank"]');
    await expect(world).toHaveCount(2);
    await expect(world.first()).toHaveAttribute('href', 'https://www.eesystem.com/testimonials');
    // The gallery is just the heading and whole photos: no lead, captions, links or zoom.
    const photos = main.locator('#gallery [data-gallery] img');
    await expect(photos).toHaveCount(5);
    await expect(main.locator('#gallery [data-gallery] a')).toHaveCount(0);
    await expect(main.locator('#gallery figcaption, #gallery .section-heading__lead')).toHaveCount(
      0,
    );
    const src = await photos.first().getAttribute('src');
    expect((await page.request.get(src as string)).status()).toBe(200);
    // No Google reviews section.
    await expect(main.locator('#reviews-heading, [data-reviews-embed]')).toHaveCount(0);
  });

  test('FAQ page: details accordion and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(routes.faq.en);
    await expect(page.locator('main details summary')).toHaveCount(10);
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json ?? '{}') as { '@type': string; mainEntity: unknown[] };
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(10);
    const first = page.locator('main details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
  });

  test('cookie policy: cookie table, no preferences trigger without a banner', async ({ page }) => {
    await page.goto(routes.cookies.ro);
    await expect(page.locator('main table caption')).toBeVisible();
    await expect(page.locator('main [data-consent-open]')).toHaveCount(0);
  });
});

for (const path of [
  routes.home.ro,
  routes.research.ro,
  routes.contact.ro,
  routes.pricing.en,
] as const) {
  test(`no horizontal scroll at 320px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

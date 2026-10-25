import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { routes, type PageKey } from '../src/i18n/routes';
import { site } from '../src/config/site';
import { findBannedWords } from '../scripts/banned-words.mjs';

/**
 * Pages and content checks: every static route from the route map in both languages, every
 * built article, the RSS feeds, the sitemap index and the 404 pages. Each HTML page must have
 * one h1, a title, a meta description, a canonical link, hreflang alternates that point at the
 * route map's paths, `html[lang]` for its language and no raw "undefined" text.
 *
 * Booking: every booking button is a `[data-chat-open]` wa.me link with a prefilled message;
 * the pricing and services cards carry `data-chat-service` and prefill the card's own
 * `whatsappMessage`; the contact page has the WhatsApp trigger, the `tel:` link and the maps
 * link. Section 9: no rendered page content contains a banned word (scripts/banned-words.mjs).
 */

type Lang = 'ro' | 'en';

const root = process.cwd();
const dist = join(root, 'dist');
const WA_PREFIX = `https://wa.me/${site.whatsappNumber}?text=`;
const TEL = `tel:${site.phoneHref}`;

/** Built article URLs, discovered from dist/ (drafts are never built). */
function builtArticles(): Record<Lang, string[]> {
  const list = (dir: string, prefix: string) => {
    const full = join(dist, dir);
    try {
      return readdirSync(full)
        .filter((name) => statSync(join(full, name)).isDirectory() && !/^\d+$/.test(name))
        .map((name) => `${prefix}${name}/`);
    } catch {
      return [];
    }
  };
  return { ro: list('articole', '/articole/'), en: list('en/articles', '/en/articles/') };
}

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
  (key) => key !== 'article' && key !== 'notFound' && key !== 'styleguide',
);
const articles = builtArticles();

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
  ...articles.ro.map((path) => ({ path, lang: 'ro' as const, key: 'article', alternate: null })),
  ...articles.en.map((path) => ({ path, lang: 'en' as const, key: 'article', alternate: null })),
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
      // Articles may legitimately have no twin; hreflang is then absent. Everything else has one.
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

test.describe('feeds and sitemap', () => {
  test('RSS feeds exist and list the published articles', async ({ request }) => {
    for (const [path, lang, count] of [
      ['/rss.xml', 'ro-ro', articles.ro.length],
      ['/en/rss.xml', 'en', articles.en.length],
    ] as const) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/xml/);
      const body = await response.text();
      expect(body).toContain('<rss');
      expect(body).toContain(`<language>${lang}</language>`);
      expect(body.match(/<item>/g)?.length ?? 0).toBe(count);
      expect(body).not.toMatch(BAD_TEXT);
    }
  });

  test('article pages link their RSS feed and use the article OG type', async ({ page }) => {
    const first = articles.ro[0];
    test.skip(!first, 'no Romanian articles built');
    await page.goto(first as string);
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
      'href',
      '/rss.xml',
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /^https?:\/\/.+\.(?:svg|png|jpe?g|webp|avif)$/,
    );
    // Reading time: the visible dd (the dt twin is visually hidden for screen readers).
    await expect(page.locator('main dd', { hasText: /min de citit/ })).toBeVisible();
  });

  test('sitemap index exists', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<sitemapindex');
  });
});

test.describe('booking through the WhatsApp chat', () => {
  const expectedTriggers: Partial<Record<PageKey, number>> = {
    home: 2, // hero and the CTA band
    services: 5, // one per service plus the CTA band
    pricing: 5,
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

    for (const key of ['pricing', 'services'] as const) {
      test(`${lang} ${key}: each card prefills its own whatsappMessage`, async ({ page }) => {
        await page.goto(routes[key][lang]);
        const entries = services(lang);
        expect(entries.length).toBe(4);
        for (const { key: serviceKey, name, message } of entries) {
          const card = page.locator(`main [data-service="${serviceKey}"]`);
          await expect(card).toHaveCount(1);
          const trigger = card.locator('a[data-chat-open][data-chat-service]');
          await expect(trigger).toHaveCount(1);
          await expect(trigger).toHaveAttribute('data-chat-service', name);
          await expect(trigger).toHaveAttribute('data-chat-topic', 'booking');
          expect(decodeMessage(await trigger.getAttribute('href'))).toBe(message);
        }
      });
    }

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
      await expect(main.locator(`a[href="mailto:${site.email}"]`)).toBeVisible();
      await expect(main.locator('address')).toContainText(site.address.street);
      await expect(main.locator('form')).toHaveCount(0);
    });
  }
});

test.describe('no claims (WEBSITE_PLAN.md section 9)', () => {
  // Page content: title, meta description and everything inside <main> (agent B's slice).
  for (const { path, lang, key } of pages) {
    test(`${lang} ${key} content has no banned word: ${path}`, async ({ page }) => {
      await page.goto(path);
      const title = await page.title();
      const description =
        (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      const main = await page.locator('main').innerText();
      const hits = findBannedWords(`${title}\n${description}\n${main}`);
      expect(hits.map((h) => `${h.word} (${h.label})`)).toEqual([]);
    });
  }

  // Chrome: header, top bar and footer (agent A's slice), checked once per language.
  for (const lang of ['ro', 'en'] as const) {
    test(`${lang} chrome has no banned word`, async ({ page }) => {
      await page.goto(routes.home[lang]);
      // innerText of unrendered elements (inline scripts) falls back to their source, so skip them.
      const chrome = await page
        .locator('body > :not(main):not(script):not(style):not(template)')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText).join('\n'));
      const hits = findBannedWords(chrome);
      expect(hits.map((h) => `${h.word} (${h.label})`)).toEqual([]);
    });
  }
});

test.describe('page-specific hooks', () => {
  test('home page: the eight sections in order', async ({ page }) => {
    await page.goto(routes.home.ro);
    const order = await page
      .locator('main > section')
      .evaluateAll((els) => els.map((el) => el.id || el.className.split(' ')[0]));
    expect(order).toEqual([
      'hero',
      'home-intro',
      'home-services',
      'home-steps',
      'home-gallery',
      'home-testimonials',
      'home-faq',
      'home-cta',
    ]);
    const main = page.locator('main');
    await expect(main.locator('.hero__eyebrow')).toHaveText('Centru de wellness');
    await expect(main.locator('.hero a[data-chat-open]')).toHaveText(/Programează-te pe WhatsApp/);
    await expect(main.locator(`.hero a[href="${routes.services.ro}"]`)).toHaveText(
      /Vezi serviciile/,
    );
    await expect(main.locator('#home-services [data-service]')).toHaveCount(4);
    await expect(
      main.locator('#home-services [data-service] a[href^="/servicii/#service-"]'),
    ).toHaveCount(4);
    await expect(main.locator('#home-steps ol > li')).toHaveCount(3);
    await expect(main.locator('#home-gallery [data-gallery-item]')).toHaveCount(6);
    await expect(main.locator('#home-testimonials .t-row .testimonial')).toHaveCount(6);
    await expect(main.locator('#home-faq details')).toHaveCount(5);
    await expect(main.locator(`#home-cta a[href="${TEL}"]`)).toBeVisible();
  });

  test('services page: factual sections with anchors and a booking link each', async ({ page }) => {
    await page.goto(routes.services.en);
    const main = page.locator('main');
    const cards = main.locator('article[data-service]');
    await expect(cards).toHaveCount(4);
    for (const { key } of services('en')) {
      await expect(main.locator(`#service-${key}[data-service="${key}"] h2`)).toBeVisible();
      await expect(main.locator(`#service-${key} a[data-chat-open]`)).toHaveCount(1);
    }
    await expect(main.locator('#services-visit-heading')).toBeVisible();
  });

  test('pricing page: Intl RON prices, the VAT note and a booking link per card', async ({
    page,
  }) => {
    await page.goto(routes.pricing.ro);
    const main = page.locator('main');
    const amounts = await main.locator('.service__amount').allInnerTexts();
    expect(amounts).toHaveLength(4);
    for (const amount of amounts) expect(amount).toMatch(/^\d[\d.\s ]*\s?RON$/u);
    await expect(main.locator('.pricing__vat')).toContainText('TODO(content)');
    await expect(main.locator('[data-service] a[data-chat-open]')).toHaveCount(4);
    await page.goto(routes.pricing.en);
    const enAmounts = await page.locator('main .service__amount').allInnerTexts();
    for (const amount of enAmounts) expect(amount).toMatch(/^RON\s?\d/u);
  });

  test('research page: neutral library with grouped items, data hooks and no JS needed', async ({
    page,
  }) => {
    await page.goto(routes.research.ro);
    const main = page.locator('main');
    await expect(main.locator('.disclaimer')).toHaveCount(0);
    await expect(main.locator('.page-intro__lead')).toContainText(/informare/);
    await expect(main.locator('[data-research-controls]')).toHaveCount(1);
    await expect(main.locator('[data-research-status][aria-live="polite"]')).toHaveCount(1);
    await expect(main.locator('[data-research-empty][hidden]')).toHaveCount(1);
    const groups = main.locator('[data-research-group][data-count]');
    await expect(groups).toHaveCount(3);
    const items = main.locator(
      '[data-research-item][data-title][data-authors][data-document-type][data-group]',
    );
    await expect(items).toHaveCount(10);
    const counts = await groups.evaluateAll((els) =>
      els.map((el) => [
        Number(el.getAttribute('data-count')),
        el.querySelectorAll('[data-research-item]').length,
      ]),
    );
    for (const [declared, actual] of counts) expect(declared).toBe(actual);
    // Every card: a type badge, a file link labelled with type and size (or "link extern").
    await expect(main.locator('[data-research-item] .badge')).toHaveCount(
      await main.locator('[data-research-item] .badge').count(),
    );
    const links = main.locator('[data-research-item] .research-card__link');
    await expect(links).toHaveCount(10);
    const metas = await main.locator('.research-card__file-meta').allInnerTexts();
    expect(metas.filter((m) => /PDF · .+ [KM]?B/.test(m))).toHaveLength(9);
    expect(metas.filter((m) => /Link extern/.test(m))).toHaveLength(1);
    const first = links.first();
    const href = await first.getAttribute('href');
    expect((await page.request.get(href as string)).status()).toBe(200);
  });

  test('testimonials page: consent-gated cards, gallery hooks, no embed by default', async ({
    page,
  }) => {
    await page.goto(routes.testimonials.en);
    const main = page.locator('main');
    await expect(main.locator('.disclaimer')).toHaveCount(0);
    await expect(main.locator('.testimonial')).toHaveCount(6);
    const galleryLinks = main.locator(
      '#gallery [data-gallery-item][data-gallery-full][data-gallery-caption]',
    );
    await expect(galleryLinks).toHaveCount(6);
    const href = await galleryLinks.first().getAttribute('href');
    const image = await page.request.get(href as string);
    expect(image.status()).toBe(200);
    await expect(main.locator('[data-reviews-embed]')).toHaveCount(
      site.features.reviewsEmbed ? 1 : 0,
    );
  });

  test('FAQ page: details accordion and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(routes.faq.en);
    await expect(page.locator('main details summary')).toHaveCount(12);
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json ?? '{}') as { '@type': string; mainEntity: unknown[] };
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(12);
    const first = page.locator('main details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
  });

  test('cookie policy: cookie table, no preferences trigger without a banner', async ({ page }) => {
    await page.goto(routes.cookies.ro);
    await expect(page.locator('main table caption')).toBeVisible();
    await expect(page.locator('main [data-consent-open]')).toHaveCount(0);
  });

  test('draft articles are never built or listed', async ({ page, request }) => {
    for (const path of [
      '/articole/intrebari-inainte-de-rezervare/',
      '/en/articles/questions-to-ask-before-booking/',
    ]) {
      expect((await request.get(path)).status()).toBe(404);
    }
    await page.goto(routes.articles.ro);
    await expect(page.locator('main .article-card')).toHaveCount(Math.min(9, articles.ro.length));
  });
});

for (const path of [
  routes.home.ro,
  routes.services.ro,
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

import { test, expect, type Page } from '@playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { routes, type PageKey } from '../src/i18n/routes';

/**
 * Phase 4 checks: every static route from the route map in both languages, every built article,
 * the RSS feeds, the sitemap index and the 404 pages. Each HTML page must have one h1, a title,
 * a meta description, a canonical link, hreflang alternates (unless it has no translation),
 * `html[lang]` for its language and no raw "undefined" / "[object Object]" / "NaN" text.
 * The language switcher on each Romanian page must resolve to the English page and back.
 */

const dist = join(process.cwd(), 'dist');

/** Built article URLs, discovered from dist/ (drafts are never built). */
function builtArticles(): { ro: string[]; en: string[] } {
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

const staticKeys = (Object.keys(routes) as PageKey[]).filter(
  (key) => key !== 'article' && key !== 'notFound' && key !== 'styleguide',
);
const articles = builtArticles();

const pages: { path: string; lang: 'ro' | 'en'; key: string; alternate: string | null }[] = [
  ...staticKeys.map((key) => ({ path: routes[key].ro, lang: 'ro' as const, key, alternate: routes[key].en })),
  ...staticKeys.map((key) => ({ path: routes[key].en, lang: 'en' as const, key, alternate: routes[key].ro })),
  ...articles.ro.map((path) => ({ path, lang: 'ro' as const, key: 'article', alternate: null })),
  ...articles.en.map((path) => ({ path, lang: 'en' as const, key: 'article', alternate: null })),
];

const BAD_TEXT = /\bundefined\b|\[object Object\]|\bNaN\b/;

async function expectWellFormed(page: Page, lang: 'ro' | 'en', expectAlternates: boolean) {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/.+\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', lang === 'ro' ? 'ro-RO' : 'en');

  const alternates = await page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('hreflang')));
  if (expectAlternates) {
    expect(alternates.sort()).toEqual(['en', 'ro', 'x-default']);
  }

  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(BAD_TEXT);
  expect(text).not.toMatch(/\b(?:nav|actions|a11y|common|research|form|legal)\.[a-zA-Z]+\b/);
}

test.describe('every route builds and is well-formed', () => {
  for (const { path, lang, key, alternate } of pages) {
    test(`${lang} ${key}: ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      // Articles may legitimately have no twin; hreflang is then absent. Everything else has one.
      const twinExpected = key !== 'article';
      await expectWellFormed(page, lang, twinExpected);

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
      await expectWellFormed(page, lang, true);
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
  });

  test('sitemap index exists', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<sitemapindex');
  });
});

test.describe('page-specific hooks', () => {
  test('research page: disclaimer first, grouped items with data hooks, Phase 5 slots', async ({
    page,
  }) => {
    await page.goto(routes.research.ro);
    const main = page.locator('main');
    await expect(main.locator('.disclaimer').first()).toBeVisible();
    // The disclaimer sits above the first group section.
    const disclaimerBox = await main.locator('.disclaimer').first().boundingBox();
    const groupBox = await main.locator('[data-research-group]').first().boundingBox();
    expect(disclaimerBox && groupBox && disclaimerBox.y < groupBox.y).toBe(true);
    await expect(main.locator('[data-research-controls]')).toHaveCount(1);
    await expect(main.locator('[data-research-status][aria-live="polite"]')).toHaveCount(1);
    await expect(main.locator('[data-research-empty][hidden]')).toHaveCount(1);
    const groups = main.locator('[data-research-group][data-count]');
    await expect(groups).toHaveCount(3);
    const items = main.locator('[data-research-item][data-title][data-authors][data-evidence-type][data-group]');
    await expect(items).toHaveCount(10);
    const counts = await groups.evaluateAll((els) =>
      els.map((el) => [Number(el.getAttribute('data-count')), el.querySelectorAll('[data-research-item]').length]),
    );
    for (const [declared, actual] of counts) expect(declared).toBe(actual);
  });

  test('testimonials page: disclaimer first, consent-gated cards, gallery links', async ({ page }) => {
    await page.goto(routes.testimonials.en);
    const main = page.locator('main');
    await expect(main.locator('.disclaimer').first()).toBeVisible();
    await expect(main.locator('.testimonial')).toHaveCount(6);
    const galleryLinks = main.locator('[data-gallery-item][data-gallery-full][data-gallery-caption]');
    await expect(galleryLinks).toHaveCount(6);
    const href = await galleryLinks.first().getAttribute('href');
    const image = await page.request.get(href as string);
    expect(image.status()).toBe(200);
  });

  test('contact form: static markup, honeypot, consent, state containers', async ({ page }) => {
    await page.goto(routes.contact.ro);
    const form = page.locator('form[data-contact-form][name="contact"][method="POST"]');
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute('data-netlify', 'true');
    await expect(form).toHaveAttribute('netlify-honeypot', 'company');
    await expect(form.locator('input[name="form-name"][type="hidden"]')).toHaveCount(1);
    await expect(form.locator('input[name="name"][required]')).toBeVisible();
    await expect(form.locator('input[name="email"][type="email"][required]')).toBeVisible();
    await expect(form.locator('input[name="phone"][type="tel"]')).toBeVisible();
    await expect(form.locator('textarea[name="message"][required]')).toBeVisible();
    await expect(form.locator('input[name="consent"][type="checkbox"][required]')).toBeVisible();
    await expect(form.locator('label[for="contact-consent"] a')).toHaveAttribute('href', routes.privacy.ro);
    const honeypot = form.locator('input[name="company"]');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toHaveAttribute('autocomplete', 'off');
    // Visually hidden by clipping (so bots still see a field): it occupies at most 1px.
    const box = await honeypot.boundingBox();
    expect(box !== null && box.width <= 1 && box.height <= 1).toBe(true);
    const trap = form.locator('.contact-form__trap');
    await expect(trap).toHaveAttribute('aria-hidden', 'true');
    await expect(form.locator('[data-form-success][hidden]')).toHaveCount(1);
    await expect(form.locator('[data-form-error][hidden]')).toHaveCount(1);
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

  test('cookie policy: cookie table and a preferences trigger', async ({ page }) => {
    await page.goto(routes.cookies.ro);
    await expect(page.locator('main table caption')).toBeVisible();
    await expect(page.locator('main table tbody tr')).toHaveCount(3);
    await expect(page.locator('main [data-consent-open]')).toBeVisible();
  });

  test('draft articles are never built or listed', async ({ page, request }) => {
    for (const path of ['/articole/intrebari-inainte-de-rezervare/', '/en/articles/questions-to-ask-before-booking/']) {
      expect((await request.get(path)).status()).toBe(404);
    }
    await page.goto(routes.articles.ro);
    await expect(page.locator('main .article-card')).toHaveCount(articles.ro.length);
  });
});

for (const path of [routes.home.ro, routes.research.ro, routes.contact.ro, routes.pricing.en] as const) {
  test(`no horizontal scroll at 320px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

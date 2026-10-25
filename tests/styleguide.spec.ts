import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { primaryNav } from '../src/i18n/routes';

/**
 * Phase 1 and 2 checks: axe on the styleguide and home pages in both colour schemes,
 * the language switcher keeps the current page, keyboard-only navigation order, landmarks,
 * the mobile menu behaviour, no cookie banner by default, the consent offset mechanism,
 * and no horizontal scroll at 320px. The chat panel itself is covered by whatsapp.spec.ts.
 */

const schemes = ['light', 'dark'] as const;
const pages = ['/styleguide/', '/', '/en/'] as const;

async function runAxe(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}

for (const path of pages) {
  for (const scheme of schemes) {
    test(`axe: ${path} in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const results = await runAxe(page);
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([]);
    });
  }
}

test('language switcher keeps the current page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-lang-switch="en"]')).toHaveAttribute('href', '/en/');
  await expect(page.locator('[data-lang-switch="en"]')).toHaveAttribute('hreflang', 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro-RO');

  await page.goto('/en/');
  await expect(page.locator('[data-lang-switch="ro"]')).toHaveAttribute('href', '/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // hreflang alternates for ro, en and x-default.
  const alternates = await page
    .locator('link[rel="alternate"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('hreflang')));
  expect(alternates.sort()).toEqual(['en', 'ro', 'x-default']);
});

test('header renders exactly once with landmarks, one chat panel and the floating button', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('main#main')).toHaveCount(1);
  // Testimonial cards use <footer> for attribution; only the site footer is a landmark.
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.locator('nav.primary-nav[aria-label]')).toHaveCount(1);
  await expect(page.locator('a[aria-current="page"]').first()).toBeAttached();
  // Nav items come from the route map, never hard-coded.
  await expect(page.locator('.primary-nav a')).toHaveCount(primaryNav.length);
  // One chat panel per page, closed until a trigger opens it; one floating button.
  await expect(page.locator('dialog[data-chat]')).toHaveCount(1);
  await expect(page.locator('dialog[data-chat]')).toBeHidden();
  await expect(page.locator('[data-whatsapp-fab]')).toHaveCount(1);
  await expect(page.locator('[data-whatsapp-fab]')).toBeVisible();
  await expect(page.locator('[data-whatsapp-fab]')).toHaveAccessibleName(/WhatsApp/);
  const fabBox = await page.locator('[data-whatsapp-fab]').boundingBox();
  expect(fabBox && fabBox.width >= 56 && fabBox.height >= 56).toBe(true);
  // Top bar: phone, hours, email and socials from the config.
  await expect(page.locator('.topbar a[href="tel:+40748011259"]')).toHaveCount(1);
  await expect(page.locator('.topbar a[href^="mailto:"]')).toHaveCount(1);
  await expect(page.locator('.topbar .hours-inline')).toHaveCount(1);
  await expect(page.locator('.topbar .socials a')).toHaveCount(4);
});

test('LocalBusiness structured data uses HealthAndBeautyBusiness, once per page', async ({
  page,
}) => {
  await page.goto('/');
  const scripts = page.locator('script[type="application/ld+json"]');
  const payloads = await scripts.evaluateAll((els) => els.map((el) => el.textContent ?? ''));
  const businesses = payloads
    .map((json) => JSON.parse(json) as { '@type': string })
    .filter((data) => data['@type'] === 'HealthAndBeautyBusiness');
  expect(businesses).toHaveLength(1);
  const data = businesses[0] as unknown as {
    name: string;
    url: string;
    telephone: string;
    address: { '@type': string; addressLocality: string };
    openingHoursSpecification: { dayOfWeek: string[]; opens: string; closes: string }[];
    sameAs: string[];
  };
  expect(data.name).toBe('Centrul Wellness');
  expect(data.url).toMatch(/^https?:\/\/.+\/$/);
  expect(data.telephone).toBe('+40748011259');
  expect(data.address['@type']).toBe('PostalAddress');
  expect(data.openingHoursSpecification.length).toBeGreaterThan(0);
  expect(data.openingHoursSpecification[0]?.dayOfWeek).toContain('https://schema.org/Monday');
  expect(data.sameAs).toHaveLength(4);
  for (const json of payloads) expect(json).not.toMatch(/Medical/);
});

test('keyboard-only navigation: skip link, top bar, nav, language, booking, footer chat trigger', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'desktop order only');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  // Top bar phone link comes next.
  await page.keyboard.press('Tab');
  await expect(page.locator('.topbar a[href^="tel:"]')).toBeFocused();

  // Walk until the primary nav is reached, then through it.
  const navLinks = page.locator('.primary-nav a');
  const navCount = await navLinks.count();
  expect(navCount).toBe(primaryNav.length);
  for (let i = 0; i < 40; i++) {
    if (await navLinks.first().evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(navLinks.first()).toBeFocused();
  for (let i = 1; i < navCount; i++) await page.keyboard.press('Tab');
  await expect(navLinks.last()).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('[data-lang-switch]')).toBeFocused();

  // "Rezervă" is a BookingLink: a wa.me link that the chat island intercepts.
  await page.keyboard.press('Tab');
  const book = page.locator('.site-header__book');
  await expect(book).toBeFocused();
  await expect(book).toHaveAttribute('data-chat-open', /.*/);
  await expect(book).toHaveAttribute('href', /^https:\/\/wa\.me\/40748011259\?text=/);
  await expect(book).not.toHaveAttribute('target', '_blank');

  // Skip link really moves focus into main.
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();

  // Footer: the WhatsApp trigger opens the chat from the keyboard and gets focus back.
  const trigger = page.locator('footer [data-footer-whatsapp]');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('dialog[data-chat]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Altă întrebare' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('mobile menu: toggle, focus trap, escape, focus return, phone link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  // The top bar is hidden on small screens; its phone link moves into the menu.
  await expect(page.locator('.topbar')).toBeHidden();

  const toggle = page.locator('[data-menu-toggle]');
  const menu = page.locator('[data-menu]');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-controls', 'site-menu');
  await expect(menu).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/is-locked/);
  await expect(menu.locator('a').first()).toBeFocused();
  await expect(menu.locator('a[href="tel:+40748011259"]')).toBeVisible();

  // Tab from the last focusable wraps to the toggle; Shift+Tab from the toggle wraps back.
  const last = menu.locator('.site-header__book');
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/is-locked/);

  // While the sheet is open the toggle must stay visible and clickable (not covered by the sheet):
  // Playwright's click fails if another element would receive the pointer event.
  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(page.locator('.site-header__brand')).toBeVisible();
  await toggle.click({ timeout: 2000 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();

  // "Rezervă" inside the sheet opens the chat on top of it; closing the chat returns to the
  // link, with the sheet still open and the scroll lock intact.
  await toggle.click();
  await last.click();
  const dialog = page.locator('dialog[data-chat]');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(last).toBeFocused();
  await expect(menu).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/is-locked/);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/is-locked/);
});

test('no cookie banner by default: no consent markup, script, storage or cookies', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-consent]')).toHaveCount(0);
  await expect(page.locator('[data-consent-open]')).toHaveCount(0);
  // The site footer is the contentinfo landmark; testimonial cards also render <footer>.
  await expect(page.getByRole('contentinfo')).not.toContainText('Preferințe cookie');
  const hasConsentApi = await page.evaluate(() => '__openCookiePreferences' in window);
  expect(hasConsentApi).toBe(false);
  expect(await context.cookies()).toEqual([]);
  const storage = await page.evaluate(() => [localStorage.length, sessionStorage.length]);
  expect(storage).toEqual([0, 0]);
  // Every script is first-party: no analytics, no embeds.
  const scripts = await page
    .locator('script[src]')
    .evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).src));
  for (const src of scripts) expect(src).toMatch(/^http:\/\/localhost:\d+\/_astro\//);
});

test('the floating button and the chat panel respect --consent-offset', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const fab = page.locator('[data-whatsapp-fab]');
  const before = await fab.boundingBox();
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--consent-offset', '120px');
  });
  // The button animates upwards (250ms), so poll until it has settled.
  await expect
    .poll(async () => {
      const after = await fab.boundingBox();
      return before && after ? Math.round(before.y - after.y) : null;
    })
    .toBe(120);
  await fab.click();
  const dialog = page.locator('dialog[data-chat]');
  const box = await dialog.boundingBox();
  // The panel's bottom edge sits above the offset.
  expect(box && box.y + box.height <= 800 - 120).toBe(true);
});

for (const path of ['/styleguide/', '/'] as const) {
  test(`no horizontal scroll at 320px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('styleguide is noindex and renders every primitive', async ({ page }) => {
  await page.goto('/styleguide/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const main = page.locator('main');
  await expect(main.locator('.btn--primary').first()).toBeVisible();
  await expect(main.locator('.btn--secondary').first()).toBeVisible();
  await expect(main.locator('.btn--plain').first()).toBeVisible();
  await expect(main.locator('.card').first()).toBeVisible();
  await expect(main.locator('.badge').first()).toBeVisible();
  await expect(main.locator('[data-segmented-control]').first()).toBeVisible();
  await expect(main.locator('[data-icon]').first()).toBeAttached();
});

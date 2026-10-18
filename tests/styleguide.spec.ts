import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Phase 1 and 2 checks: axe on the styleguide and home pages in both colour schemes,
 * the language switcher keeps the current page, keyboard-only navigation order,
 * the mobile menu behaviour, and no horizontal scroll at 320px.
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

test('header renders exactly once with landmarks', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('main#main')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.locator('nav.primary-nav[aria-label]')).toHaveCount(1);
  await expect(page.locator('a[aria-current="page"]').first()).toBeAttached();
});

test('keyboard-only navigation: skip link, top bar, nav, language, booking, footer', async ({
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
  expect(navCount).toBe(6);
  for (let i = 0; i < 40; i++) {
    if (await navLinks.first().evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(navLinks.first()).toBeFocused();
  for (let i = 1; i < navCount; i++) await page.keyboard.press('Tab');
  await expect(navLinks.last()).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('[data-lang-switch]')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('.site-header__book')).toBeFocused();
  await expect(page.locator('.site-header__book')).toHaveAttribute('target', '_blank');
  await expect(page.locator('.site-header__book')).toHaveAttribute('rel', 'noopener');

  // Skip link really moves focus into main.
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();

  // Footer cookie preferences button is reachable and reopens the dialog.
  const prefs = page.locator('footer [data-consent-open]');
  await prefs.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('[data-consent]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('button').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(prefs).toBeFocused();
});

test('mobile menu: toggle, focus trap, escape, focus return', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

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
  await expect(menu.locator('a[href^="tel:"]')).toBeVisible();

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
});

test('cookie consent stores a versioned choice and dispatches consent-changed', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = page.locator('[data-consent]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-labelledby', 'consent-title');

  const eventPromise = page.evaluate(
    () =>
      new Promise<unknown>((resolve) =>
        window.addEventListener('consent-changed', (e) => resolve((e as CustomEvent).detail), {
          once: true,
        }),
      ),
  );
  await dialog.locator('button').first().click();
  const detail = (await eventPromise) as { version: number; choices: { necessary: boolean } };
  expect(detail.version).toBe(1);
  expect(detail.choices.necessary).toBe(true);
  await expect(dialog).toBeHidden();

  const stored = await page.evaluate(() => window.localStorage.getItem('cookie-consent'));
  expect(stored).not.toBeNull();
  const parsed = JSON.parse(stored ?? '{}') as { version: number; timestamp: string };
  expect(parsed.version).toBe(1);
  expect(typeof parsed.timestamp).toBe('string');

  await page.reload();
  await expect(dialog).toBeHidden();
  const getter = await page.evaluate(() => window.__cookieConsent?.version);
  expect(getter).toBe(1);
});

test('WhatsApp button never overlaps the open cookie banner', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const dialog = page.locator('[data-consent]');
  const fab = page.locator('[data-whatsapp-fab]');
  await expect(dialog).toBeVisible();
  // The button animates upwards (250ms), so poll until it has settled above the banner.
  await expect
    .poll(async () => {
      const d = await dialog.boundingBox();
      const f = await fab.boundingBox();
      return d && f ? f.y + f.height <= d.y + 1 : false;
    })
    .toBe(true);
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

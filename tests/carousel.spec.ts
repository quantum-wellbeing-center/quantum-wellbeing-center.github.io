import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Home page gallery carousel (GalleryCarousel.astro): every gallery entry is a slide in both
 * languages with the lightbox hooks, autoplay advances and loops, Pause sticks and flips its
 * label, Previous/Next move and wrap, hover and focus hold the timer, reduced motion means no
 * autoplay and instant scrolling, the no-JavaScript strip, axe in both colour schemes, no
 * horizontal scroll at 320px, and no cookies or storage. Timers run on Playwright's fake clock
 * so a 5 s interval costs no real time; the smooth scroll itself is native and is awaited.
 */

const INTERVAL = 5000;

/** Published gallery entries per language, read from the content folder (not hard-coded). */
function galleryCount(lang: 'ro' | 'en'): number {
  const dir = join(process.cwd(), 'src', 'content', 'gallery', lang);
  return readdirSync(dir).filter((name) => name.endsWith('.json')).length;
}

const carousel = (page: Page) => page.locator('#home-gallery [data-carousel]');
const track = (page: Page) => page.locator('#home-gallery [data-carousel-track]');
const status = (page: Page) => page.locator('#home-gallery [data-carousel-status]');
const toggle = (page: Page) => page.locator('#home-gallery [data-carousel-toggle]');
const prev = (page: Page) => page.locator('#home-gallery [data-carousel-prev]');
const next = (page: Page) => page.locator('#home-gallery [data-carousel-next]');

const scrollLeft = (page: Page) => track(page).evaluate((el) => Math.round(el.scrollLeft));
const maxScroll = (page: Page) =>
  track(page).evaluate((el) => Math.round(el.scrollWidth - el.clientWidth));

/** Scroll offset at which slide `i` sits at the snap start. */
const offsetOf = (page: Page, i: number) =>
  track(page).evaluate((el, i) => {
    const slides = el.querySelectorAll<HTMLElement>('[data-carousel-slide]');
    return Math.round((slides[i]?.offsetLeft ?? 0) - (slides[0]?.offsetLeft ?? 0));
  }, i);

/** Opens the home page with the carousel on screen (autoplay holds while it is off-screen). */
async function open(page: Page, path = '/') {
  await page.goto(path);
  await carousel(page).scrollIntoViewIfNeeded();
  await expect(carousel(page)).toHaveAttribute('data-enhanced', '');
  await expect(toggle(page)).toBeVisible();
}

/** Parks the pointer outside the carousel so hover does not hold the timer. */
async function pointerAway(page: Page) {
  await page.mouse.move(1, 1);
}

/** Moves focus out of the carousel without a click, which could scroll it off-screen. */
async function focusAway(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/** Waits for a native smooth scroll to settle on an exact offset. */
async function expectScrolledTo(page: Page, left: number) {
  await expect.poll(() => scrollLeft(page), { timeout: 5000 }).toBe(left);
}

/** Lets the carousel's settle timer (150 ms on the fake clock) read the new position. */
async function settle(page: Page) {
  await page.clock.runFor(200);
}

async function runAxe(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}

for (const [path, lang, label, slideOf] of [
  ['/', 'ro', 'Galerie foto', 'din'],
  ['/en/', 'en', 'Photo gallery', 'of'],
] as const) {
  test(`renders every gallery entry as a slide with the lightbox hooks (${lang})`, async ({
    page,
  }) => {
    const total = galleryCount(lang);
    expect(total).toBeGreaterThan(1);
    await open(page, path);
    const region = carousel(page);
    await expect(region).toHaveAttribute('role', 'region');
    await expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    await expect(region).toHaveAttribute('aria-label', label);
    const slides = region.locator('[data-carousel-slide]');
    await expect(slides).toHaveCount(total);
    await expect(slides.first()).toHaveAttribute('role', 'group');
    await expect(slides.first()).toHaveAttribute('aria-roledescription', 'slide');
    await expect(slides.first()).toHaveAttribute('aria-label', `1 ${slideOf} ${total}`);
    await expect(slides.last()).toHaveAttribute('aria-label', `${total} ${slideOf} ${total}`);
    // The same hooks as GalleryGrid, so the Phase 5 lightbox attaches to both.
    await expect(region.locator('[data-gallery]')).toHaveCount(1);
    const links = region.locator(
      '[data-gallery] [data-gallery-item][data-gallery-full][data-gallery-width][data-gallery-height][data-gallery-alt][data-gallery-caption]',
    );
    await expect(links).toHaveCount(total);
    await expect(links.first()).toHaveAttribute('data-gallery-index', '0');
    await expect(links.first()).toHaveAttribute(
      'href',
      /^\/_astro\/.+\.(?:svg|png|jpe?g|webp|avif)$/,
    );
    const images = region.locator('[data-gallery-item] img');
    await expect(images).toHaveCount(total);
    await expect(images.first()).toHaveAttribute('srcset', /\d+w/);
    await expect(images.first()).toHaveAttribute('sizes', /vw/);
    await expect(images.first()).toHaveAttribute('loading', 'eager');
    await expect(images.nth(1)).toHaveAttribute('loading', 'lazy');
    await expect(region.locator('figcaption')).toHaveCount(total);
    // Position text and 44px controls.
    await expect(status(page)).toHaveText(`1 ${slideOf} ${total}`);
    for (const control of [prev(page), next(page), toggle(page)]) {
      const box = await control.boundingBox();
      expect(box && box.width >= 44 && box.height >= 44).toBe(true);
    }
  });
}

test('autoplay advances one slide every 5 s with smooth scrolling and loops', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await pointerAway(page);
  const total = galleryCount('ro');
  await expect(toggle(page)).toHaveAccessibleName('Oprește derularea automată');
  await expect(status(page)).toHaveAttribute('aria-live', 'off');
  expect(await scrollLeft(page)).toBe(0);

  // Just short of the interval nothing moves; at the interval the second slide snaps in.
  await page.clock.runFor(INTERVAL - 500);
  expect(await scrollLeft(page)).toBe(0);
  await page.clock.runFor(600);
  await expectScrolledTo(page, await offsetOf(page, 1));
  await settle(page);
  await expect(status(page)).toHaveText(`2 din ${total}`);
  // Smooth: right after the timer fires the scroll is still in flight, not at its target.
  await page.clock.runFor(INTERVAL + 200);
  const during = await scrollLeft(page);
  const target = await offsetOf(page, 2);
  expect(during).toBeLessThan(target);
  await expectScrolledTo(page, target);
  await settle(page);

  // Keep advancing: the strip reaches its end (where the last slides fit together on wide
  // screens) and then loops back to the first slide.
  const end = await maxScroll(page);
  for (let i = 3; i < total && (await scrollLeft(page)) < end; i++) {
    await page.clock.runFor(INTERVAL + 200);
    await expectScrolledTo(page, Math.min(await offsetOf(page, i), end));
    await settle(page);
  }
  expect(await scrollLeft(page)).toBe(end);
  await page.clock.runFor(INTERVAL + 200);
  await expectScrolledTo(page, 0);
  await settle(page);
  await expect(status(page)).toHaveText(`1 din ${total}`);
});

test('Pause stops autoplay until Play; the label and the live region follow', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await toggle(page).click();
  await pointerAway(page);
  await focusAway(page);
  await expect(toggle(page)).toHaveAccessibleName('Pornește derularea automată');
  await expect(carousel(page)).not.toHaveAttribute('data-playing', '');
  await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await page.clock.runFor(INTERVAL * 2);
  expect(await scrollLeft(page)).toBe(0);

  await toggle(page).click();
  await pointerAway(page);
  await focusAway(page);
  await expect(toggle(page)).toHaveAccessibleName('Oprește derularea automată');
  await expect(carousel(page)).toHaveAttribute('data-playing', '');
  await expect(status(page)).toHaveAttribute('aria-live', 'off');
  await page.clock.runFor(INTERVAL + 200);
  await expectScrolledTo(page, await offsetOf(page, 1));
});

test('Next and Previous move one slide, wrap at both ends and restart the timer', async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  const total = galleryCount('ro');
  const end = await maxScroll(page);

  await next(page).click();
  await expectScrolledTo(page, await offsetOf(page, 1));
  await settle(page);
  await expect(status(page)).toHaveText(`2 din ${total}`);
  // Focus is on the button, so the live region speaks and the timer holds.
  await expect(next(page)).toBeFocused();
  await expect(status(page)).toHaveAttribute('aria-live', 'polite');

  await prev(page).click();
  await expectScrolledTo(page, 0);
  await settle(page);
  await expect(status(page)).toHaveText(`1 din ${total}`);

  // Previous from the first slide wraps to the end; Next from the end wraps to the first.
  await prev(page).click();
  await expectScrolledTo(page, end);
  await settle(page);
  await next(page).click();
  await expectScrolledTo(page, 0);
  await settle(page);
  await expect(status(page)).toHaveText(`1 din ${total}`);

  // Moving the pointer and focus away lets the (restarted) timer run again.
  await pointerAway(page);
  await focusAway(page);
  await expect(status(page)).toHaveAttribute('aria-live', 'off');
  await page.clock.runFor(INTERVAL + 200);
  await expectScrolledTo(page, await offsetOf(page, 1));
});

test('hovering and focusing hold the timer; leaving releases it', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await carousel(page).hover();
  await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await page.clock.runFor(INTERVAL * 2);
  expect(await scrollLeft(page)).toBe(0);
  await pointerAway(page);
  await expect(status(page)).toHaveAttribute('aria-live', 'off');

  await page.locator('#home-gallery [data-gallery-item]').first().focus();
  await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await page.clock.runFor(INTERVAL * 2);
  expect(await scrollLeft(page)).toBe(0);
  await focusAway(page);
  await expect(status(page)).toHaveAttribute('aria-live', 'off');
  await page.clock.runFor(INTERVAL + 200);
  await expectScrolledTo(page, await offsetOf(page, 1));
});

test('a user scroll restarts the timer instead of fighting it', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await pointerAway(page);
  const second = await offsetOf(page, 1);
  await page.clock.runFor(INTERVAL - 1000);
  await track(page).evaluate((el, left) => el.scrollTo({ left, behavior: 'auto' }), second);
  await settle(page);
  // The timer was reset by the scroll: a full interval later the next slide follows.
  await page.clock.runFor(1500);
  expect(await scrollLeft(page)).toBe(second);
  await page.clock.runFor(INTERVAL);
  await expectScrolledTo(page, await offsetOf(page, 2));
});

test('reduced motion: no autoplay, Play offered, scrolling is instant', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await open(page);
  await pointerAway(page);
  await expect(toggle(page)).toHaveAccessibleName('Pornește derularea automată');
  await expect(carousel(page)).not.toHaveAttribute('data-playing', '');
  await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await page.clock.runFor(INTERVAL * 2);
  expect(await scrollLeft(page)).toBe(0);
  // Next lands on the target in the same tick: no smooth scroll.
  const after = await next(page).evaluate((button) => {
    (button as HTMLButtonElement).click();
    const el = document.querySelector('#home-gallery [data-carousel-track]') as HTMLElement;
    return Math.round(el.scrollLeft);
  });
  expect(after).toBe(await offsetOf(page, 1));
  // Play starts the rotation on request.
  await toggle(page).click();
  await pointerAway(page);
  await focusAway(page);
  await expect(toggle(page)).toHaveAccessibleName('Oprește derularea automată');
  await page.clock.runFor(INTERVAL + 200);
  expect(await scrollLeft(page)).toBe(await offsetOf(page, 2));
});

test('keyboard: Tab reaches the controls before the slides, Enter operates Next', async ({
  page,
}) => {
  await open(page);
  await prev(page).focus();
  await page.keyboard.press('Tab');
  await expect(next(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expectScrolledTo(page, await offsetOf(page, 1));
  await page.keyboard.press('Tab');
  await expect(toggle(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#home-gallery [data-gallery-item]').first()).toBeFocused();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('a scroll-snap strip with every link reachable and no dead controls', async ({ page }) => {
    const total = galleryCount('ro');
    await page.goto('/');
    await carousel(page).scrollIntoViewIfNeeded();
    await expect(carousel(page)).not.toHaveAttribute('data-enhanced', '');
    await expect(page.locator('#home-gallery [data-carousel-controls]')).toBeHidden();
    await expect(toggle(page)).toBeHidden();
    await expect(page.locator('#home-gallery [data-gallery-item]')).toHaveCount(total);
    const metrics = await track(page).evaluate((el) => ({
      overflow: getComputedStyle(el).overflowX,
      snap: getComputedStyle(el).scrollSnapType,
      scrollable: el.scrollWidth > el.clientWidth,
    }));
    expect(metrics.overflow).toBe('auto');
    expect(metrics.snap).toMatch(/^x/);
    expect(metrics.scrollable).toBe(true);
    // Focusing the last link scrolls it into view; it is a working link to the full image.
    const last = page.locator('#home-gallery [data-gallery-item]').last();
    await last.focus();
    await expect(last).toBeInViewport();
    await expect(last).toHaveAttribute('href', /^\/_astro\//);
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`axe passes on the home page with the carousel in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page);
    await toggle(page).click();
    const results = await runAxe(page);
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
    ).toEqual([]);
  });
}

test('fits 320px without horizontal page scroll, also at 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page);
  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  expect(await overflow()).toBeLessThanOrEqual(0);
  const box = await carousel(page).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
  // The next slide peeks in: the first slide is narrower than the track.
  const peek = await track(page).evaluate((el) => {
    const slide = el.querySelector<HTMLElement>('[data-carousel-slide]');
    return slide ? el.clientWidth - slide.getBoundingClientRect().width : 0;
  });
  expect(peek).toBeGreaterThan(24);
  // At 200% the hero and the section headings (not this component) overflow 320px; on mobile
  // Chromium that grows the layout viewport, hence innerWidth. Measure the carousel alone: it
  // stays inside the viewport and its controls stay inside it (the buttons do not spill out).
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  const vw = await page.evaluate(() => innerWidth);
  const after = await carousel(page).boundingBox();
  expect(after && after.x >= 0 && after.x + after.width <= vw).toBe(true);
  const spill = await carousel(page).evaluate((el) => {
    const right = el.getBoundingClientRect().right;
    const widest = Math.max(
      ...Array.from(
        el.querySelectorAll('[data-carousel-controls] *'),
        (child) => child.getBoundingClientRect().right,
      ),
    );
    return Math.round(widest - right);
  });
  expect(spill).toBeLessThanOrEqual(0);
  await expect(toggle(page)).toBeVisible();
  await expect(status(page)).toBeVisible();
});

test('sets no cookies and writes no web storage', async ({ page, context }) => {
  await open(page);
  await next(page).click();
  await toggle(page).click();
  await toggle(page).click();
  expect(await context.cookies()).toEqual([]);
  const storage = await page.evaluate(() => [localStorage.length, sessionStorage.length]);
  expect(storage).toEqual([0, 0]);
});

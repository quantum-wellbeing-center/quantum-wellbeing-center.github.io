import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from '../src/i18n/routes';

/**
 * WhatsApp chat panel (WEBSITE_PLAN.md section 8): opens from every trigger, builds the exact
 * wa.me URL in both languages, keyboard behaviour (Escape, focus trap, focus return), the
 * no-JavaScript fallback, axe with the panel open in both colour schemes, no cookies or web
 * storage, service preselection from service cards, and layout at 320px, 200% text size and
 * with reduced motion. The URL is read from the send link's href; WhatsApp is never opened.
 */

const NUMBER = '40742644016';
const waUrl = (text: string) => `https://wa.me/${NUMBER}?text=${encodeURIComponent(text)}`;

const dialog = (page: Page) => page.locator('dialog[data-chat]');
const send = (page: Page) => page.locator('[data-chat-send]');
const fab = (page: Page) => page.locator('[data-whatsapp-fab]');
const chip = (page: Page, name: string) => page.getByRole('radio', { name });

/**
 * Waits for the panel's open animation (`chat-in`: a 250ms fade and rise) to finish, so axe
 * does not measure half-transparent text and bounding boxes are not shifted mid-transition.
 */
async function settled(page: Page) {
  await expect(dialog(page)).toBeVisible();
  await dialog(page).evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
}

/** Opens the panel from the header "Rezervă"; on small screens the menu has to open first. */
async function openFromHeader(page: Page, isMobile: boolean) {
  if (isMobile) await page.locator('[data-menu-toggle]').click();
  const book = page.locator('.site-header__book');
  await book.click();
  await expect(dialog(page)).toBeVisible();
  return book;
}

async function runAxe(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}

test('opens from the floating button with booking preselected and focus on the chip', async ({
  page,
}) => {
  await page.goto('/');
  await expect(dialog(page)).toBeHidden();
  await expect(fab(page)).toHaveAttribute('data-chat-open', /.*/);
  await fab(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toHaveAttribute('open', '');
  await expect(dialog(page)).toHaveAttribute('aria-label', /WhatsApp/);
  await expect(chip(page, 'Vreau o programare')).toBeChecked();
  await expect(chip(page, 'Vreau o programare')).toBeFocused();
  await expect(page.locator('body')).toHaveClass(/is-locked/);
  // Header: brand name, hours line and a close control with a 44px target.
  await expect(dialog(page).locator('.chat__title')).toContainText('Quantum Wellbeing Center');
  await expect(dialog(page).locator('.chat__hours')).toContainText('09:00');
  const close = dialog(page).locator('[data-chat-close]');
  const box = await close.boundingBox();
  expect(box && box.width >= 44 && box.height >= 44).toBe(true);
});

test('opens from the header "Rezervă" and returns focus to it on Escape', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const book = await openFromHeader(page, isMobile);
  await expect(chip(page, 'Vreau o programare')).toBeChecked();
  await expect(send(page)).toHaveAttribute('href', waUrl('Bună ziua! Aș dori o programare.'));
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(book).toBeFocused();
});

test('chips and fields build the exact wa.me URL in Romanian', async ({ page }) => {
  await page.goto('/');
  await fab(page).click();
  await page.locator('[data-chat-name]').fill('Ana');
  await page.locator('[data-chat-time]').fill('joi după-amiază');
  const expected =
    'Bună ziua! Aș dori o programare. Nume: Ana. Ziua/ora preferată: joi după-amiază.';
  await expect(send(page)).toHaveAttribute('href', waUrl(expected));
  await expect(page.locator('[data-chat-preview]')).toHaveText(expected);

  // Chips are single-select: picking "prețuri" swaps the topic sentence and keeps the fields.
  await chip(page, 'Întrebare despre prețuri').check();
  await expect(chip(page, 'Vreau o programare')).not.toBeChecked();
  await expect(send(page)).toHaveAttribute(
    'href',
    waUrl(
      'Bună ziua! Aș avea o întrebare despre prețuri. Nume: Ana. Ziua/ora preferată: joi după-amiază.',
    ),
  );

  // Free text is appended as written; trailing punctuation in fields is normalised.
  await chip(page, 'Altă întrebare').check();
  await page.locator('[data-chat-time]').fill('');
  await page.locator('[data-chat-name]').fill('Ana.');
  await page.locator('[data-chat-message]').fill('Aveți loc de parcare?');
  await expect(send(page)).toHaveAttribute(
    'href',
    waUrl('Bună ziua! Aș avea o întrebare. Nume: Ana. Aveți loc de parcare?'),
  );
  // The chips work from the keyboard: arrow keys move the selection.
  await chip(page, 'Altă întrebare').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(chip(page, 'Întrebare despre prețuri')).toBeChecked();
  await expect(send(page)).toHaveAttribute('href', /%C3%AEntrebare%20despre%20pre%C8%9Buri/);
  // The send link opens WhatsApp in a new tab; the chip targets are at least 44px tall.
  await expect(send(page)).toHaveAttribute('target', '_blank');
  await expect(send(page)).toHaveAttribute('rel', 'noopener');
  const chipBox = await page.locator('.chat__chip-label').first().boundingBox();
  expect(chipBox && chipBox.height >= 44).toBe(true);
});

test('chips and fields build the exact wa.me URL in English', async ({ page }) => {
  await page.goto('/en/');
  await fab(page).click();
  await expect(chip(page, 'I want to book')).toBeChecked();
  await page.locator('[data-chat-name]').fill('Ana');
  await page.locator('[data-chat-time]').fill('Thursday afternoon');
  await expect(send(page)).toHaveAttribute(
    'href',
    waUrl(
      'Hello! I would like to book an appointment. Name: Ana. Preferred day/time: Thursday afternoon.',
    ),
  );
  await chip(page, 'A question about prices').check();
  await expect(send(page)).toHaveAttribute(
    'href',
    waUrl(
      'Hello! I have a question about prices. Name: Ana. Preferred day/time: Thursday afternoon.',
    ),
  );
});

test('the tel: link calls the centre', async ({ page }) => {
  await page.goto('/');
  await fab(page).click();
  const call = page.locator('[data-chat-call]');
  await expect(call).toBeVisible();
  await expect(call).toHaveAttribute('href', 'tel:+40742644016');
  await expect(call).toContainText('0742 644 016');
  await expect(call).not.toHaveAttribute('target', '_blank');
});

test('Escape closes the panel, focus returns to the floating button, scroll lock is released', async ({
  page,
}) => {
  await page.goto('/');
  await fab(page).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(fab(page)).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/is-locked/);
  // The close button works too, and the panel can be reopened.
  await fab(page).click();
  await dialog(page).locator('[data-chat-close]').click();
  await expect(dialog(page)).toBeHidden();
  await expect(fab(page)).toBeFocused();
});

test('the focus trap holds while the panel is open', async ({ page }) => {
  await page.goto('/');
  await fab(page).click();
  const close = dialog(page).locator('[data-chat-close]');
  const call = page.locator('[data-chat-call]');
  // Tab from the last control wraps to the first; Shift+Tab from the first wraps to the last.
  await call.focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(call).toBeFocused();
  // Only the checked chip is a tab stop; Tab from the close control lands on it.
  await close.focus();
  await page.keyboard.press('Tab');
  await expect(chip(page, 'Vreau o programare')).toBeFocused();
  // Nothing behind the modal can take focus.
  const outside = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.site-header__brand');
    el?.focus();
    return document.activeElement === el;
  });
  expect(outside).toBe(false);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every trigger is a plain wa.me link with a prefilled message', async ({ page }) => {
    await page.goto('/');
    await expect(dialog(page)).toBeHidden();
    await expect(fab(page)).toHaveAttribute('href', waUrl('Bună ziua! Aș dori o programare.'));
    await expect(page.locator('.site-header__book')).toHaveAttribute(
      'href',
      waUrl('Bună ziua! Aș dori o programare.'),
    );
    await expect(page.locator('[data-footer-whatsapp]')).toHaveAttribute(
      'href',
      waUrl('Bună ziua! Aș avea o întrebare.'),
    );
    await page.goto('/en/');
    await expect(fab(page)).toHaveAttribute(
      'href',
      waUrl('Hello! I would like to book an appointment.'),
    );
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`axe passes with the panel open in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await fab(page).click();
    await settled(page);
    await page.locator('[data-chat-name]').fill('Ana');
    const results = await runAxe(page);
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
    ).toEqual([]);
  });
}

test('sets no cookies and writes no web storage', async ({ page, context }) => {
  await page.goto('/');
  await fab(page).click();
  await chip(page, 'Întrebare despre prețuri').check();
  await page.locator('[data-chat-name]').fill('Ana');
  await page.locator('[data-chat-message]').fill('Test');
  await page.keyboard.press('Escape');
  await fab(page).click();
  expect(await context.cookies()).toEqual([]);
  const storage = await page.evaluate(() => [localStorage.length, sessionStorage.length]);
  expect(storage).toEqual([0, 0]);
  // No third-party script is loaded: every script comes from this origin.
  const scripts = await page
    .locator('script[src]')
    .evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).src));
  for (const src of scripts) expect(src).toMatch(/^http:\/\/localhost:\d+\/_astro\//);
});

test('service-card preselection from the footer trigger uses the "other" topic', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.locator('[data-footer-whatsapp]');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(dialog(page)).toBeVisible();
  await expect(chip(page, 'Altă întrebare')).toBeChecked();
  await expect(page.locator('[data-chat-service-line]')).toBeHidden();
  await expect(send(page)).toHaveAttribute('href', waUrl('Bună ziua! Aș avea o întrebare.'));
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

// Service cards render through BookingLink with `service={d.name}` on the pricing and services
// pages, and the contact page has its own chat trigger.
for (const path of [routes.pricing.ro, routes.services.ro] as const) {
  test(`service cards on ${path} preselect booking and name the service`, async ({ page }) => {
    await page.goto(path);
    const trigger = page.locator('main [data-chat-open][data-chat-service]').first();
    await expect(trigger).toBeVisible();
    const service = (await trigger.getAttribute('data-chat-service')) as string;
    expect(service.length).toBeGreaterThan(0);
    // The no-JavaScript fallback already carries the service name.
    expect(await trigger.getAttribute('href')).toContain(
      encodeURIComponent(`Serviciul: ${service}.`),
    );
    await trigger.click();
    await expect(dialog(page)).toBeVisible();
    await expect(chip(page, 'Vreau o programare')).toBeChecked();
    await expect(page.locator('[data-chat-service-line]')).toBeVisible();
    await expect(page.locator('[data-chat-service-name]')).toHaveText(service);
    await expect(send(page)).toHaveAttribute(
      'href',
      waUrl(`Bună ziua! Aș dori o programare. Serviciul: ${service}.`),
    );
    await expect(page.locator('[data-chat-preview]')).toContainText(service);
    // Changing the topic keeps the service in the message.
    await chip(page, 'Întrebare despre prețuri').check();
    await expect(send(page)).toHaveAttribute(
      'href',
      waUrl(`Bună ziua! Aș avea o întrebare despre prețuri. Serviciul: ${service}.`),
    );
  });
}

test('the contact page opens the chat from its WhatsApp button', async ({ page }) => {
  await page.goto(routes.contact.ro);
  const trigger = page.locator('main [data-chat-open]').first();
  await expect(trigger).toBeVisible();
  expect(await trigger.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/40742644016\?text=/);
  await trigger.click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('fits a 320px viewport and 200% text size', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await fab(page).click();
  await settled(page);
  let box = await dialog(page).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 320 && box.y >= 0).toBe(true);
  await expect(send(page)).toBeVisible();
  await expect(page.locator('[data-chat-call]')).toBeVisible();

  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  // The panel is position: fixed, so it is measured against the layout viewport. Page content
  // behind it may still overflow at 200% (a page-level Phase 6 check, not the panel's); on
  // mobile Chromium such overflow grows the layout viewport, hence innerWidth/innerHeight.
  const [vw, vh] = await page.evaluate(() => [innerWidth, innerHeight]);
  box = await dialog(page).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= vw && box.y + box.height <= vh + 1).toBe(true);
  await expect(send(page)).toBeVisible();
  // The body scrolls inside the panel; the chips are still reachable.
  await chip(page, 'Altă întrebare').scrollIntoViewIfNeeded();
  await expect(chip(page, 'Altă întrebare').locator('..')).toBeVisible();
  // Nothing inside the panel is wider than the panel: button labels wrap instead of overflowing.
  const panelOverflow = await dialog(page).evaluate((el) => {
    const right = el.getBoundingClientRect().right;
    const widest = Math.max(
      ...Array.from(el.querySelectorAll('*'), (child) => child.getBoundingClientRect().right),
    );
    return Math.max(el.scrollWidth - el.clientWidth, Math.round(widest - right));
  });
  expect(panelOverflow).toBeLessThanOrEqual(0);
});

test('reduced motion removes the transform animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await fab(page).click();
  const animation = await dialog(page).evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('chat-fade');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() => dialog(page).evaluate((el) => getComputedStyle(el).animationName))
    .toBe('chat-in');
});

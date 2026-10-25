#!/usr/bin/env node
/**
 * WCAG 2.x contrast check for the design tokens in src/styles/tokens.css.
 *
 * Run: node tests/contrast.mjs
 * Exits 1 when any pair falls below its target (4.5:1 for text, 3:1 for large text / UI).
 * The pairs mirror the real combinations used by the components, so keep this list in sync
 * when a new text/background combination is introduced.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, '../src/styles/tokens.css'), 'utf8');

/** Extract `--name: value;` declarations from a CSS block body. */
function parseBlock(body) {
  const map = {};
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim();
  return map;
}

const lightBody = css.match(/:root\s*{([\s\S]*?)}/)?.[1] ?? '';
const darkBody =
  css.match(/@media \(prefers-color-scheme: dark\)\s*{\s*:root\s*{([\s\S]*?)}\s*}/)?.[1] ?? '';
const brandBody = css.match(/\.surface-brand\s*{([\s\S]*?)}/)?.[1] ?? '';
const light = parseBlock(lightBody);
const dark = { ...light, ...parseBlock(darkBody) };
/** The token mapping on dark brand surfaces (hero, CTA band); the same in both schemes. */
const brand = { ...light, ...parseBlock(brandBody) };

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}
/** Parses `rgba(r, g, b, a)` into { rgb, alpha }. */
function parseRgba(value) {
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) throw new Error(`Cannot parse colour "${value}"`);
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: m[4] ? Number(m[4]) : 1 };
}
/** Alpha-composites a translucent colour over an opaque background. */
function composite({ rgb, alpha }, bg) {
  return rgb.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
}
function lin(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance([r, g, b]) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function ratio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text tokens checked against each background, with the required ratio. */
const textTokens = [
  ['label', 4.5],
  ['label-secondary', 4.5],
  ['accent', 4.5],
  ['success', 4.5],
  ['danger', 4.5],
  ['warning', 4.5],
];
const backgrounds = ['bg', 'bg-secondary', 'bg-elevated'];

let failed = false;
const rows = [];

for (const [themeName, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const [token, target] of textTokens) {
    for (const bg of backgrounds) {
      const r = ratio(hexToRgb(theme[token]), hexToRgb(theme[bg]));
      const ok = r >= target;
      if (!ok) failed = true;
      rows.push({ theme: themeName, pair: `${token} on ${bg}`, ratio: r.toFixed(2), target, ok });
    }
  }
  // Primary button: on-accent text over the accent fill, and the fill against the page.
  const btnText = ratio(hexToRgb(theme['on-accent']), hexToRgb(theme['accent-fill']));
  if (btnText < 4.5) failed = true;
  rows.push({
    theme: themeName,
    pair: 'on-accent on accent-fill (primary button)',
    ratio: btnText.toFixed(2),
    target: 4.5,
    ok: btnText >= 4.5,
  });
  for (const bg of backgrounds) {
    const r = ratio(hexToRgb(theme['accent-fill']), hexToRgb(theme[bg]));
    if (r < 3) failed = true;
    rows.push({
      theme: themeName,
      pair: `accent-fill on ${bg} (UI)`,
      ratio: r.toFixed(2),
      target: 3,
      ok: r >= 3,
    });
  }
  // WhatsApp buttons: the glyph on the floating button is a UI part (3:1); the text label on
  // the send button needs 4.5:1 over `--whatsapp-fill`; both fills need 3:1 against the page.
  const waGlyph = ratio(hexToRgb(theme['on-whatsapp']), hexToRgb(theme.whatsapp));
  if (waGlyph < 3) failed = true;
  rows.push({
    theme: themeName,
    pair: 'on-whatsapp on whatsapp (floating button glyph, UI)',
    ratio: waGlyph.toFixed(2),
    target: 3,
    ok: waGlyph >= 3,
  });
  const waText = ratio(hexToRgb(theme['on-whatsapp']), hexToRgb(theme['whatsapp-fill']));
  if (waText < 4.5) failed = true;
  rows.push({
    theme: themeName,
    pair: 'on-whatsapp on whatsapp-fill (send button text)',
    ratio: waText.toFixed(2),
    target: 4.5,
    ok: waText >= 4.5,
  });
  for (const token of ['whatsapp', 'whatsapp-fill']) {
    for (const bg of backgrounds) {
      const r = ratio(hexToRgb(theme[token]), hexToRgb(theme[bg]));
      if (r < 3) failed = true;
      rows.push({
        theme: themeName,
        pair: `${token} on ${bg} (UI)`,
        ratio: r.toFixed(2),
        target: 3,
        ok: r >= 3,
      });
    }
  }
  // Text on tinted fills (secondary button, badges): the "-strong" token over the tint
  // composited onto each background.
  for (const tone of ['accent', 'success', 'danger', 'warning']) {
    const tint = parseRgba(theme[`${tone}-tint`]);
    for (const bg of backgrounds) {
      const surface = composite(tint, hexToRgb(theme[bg]));
      const r = ratio(hexToRgb(theme[`${tone}-strong`]), surface);
      if (r < 4.5) failed = true;
      rows.push({
        theme: themeName,
        pair: `${tone}-strong on ${tone}-tint over ${bg}`,
        ratio: r.toFixed(2),
        target: 4.5,
        ok: r >= 4.5,
      });
    }
  }
  // Neutral badge: label on --fill.
  for (const bg of backgrounds) {
    const surface = composite(parseRgba(theme.fill), hexToRgb(theme[bg]));
    const r = ratio(hexToRgb(theme.label), surface);
    if (r < 4.5) failed = true;
    rows.push({
      theme: themeName,
      pair: `label on fill over ${bg}`,
      ratio: r.toFixed(2),
      target: 4.5,
      ok: r >= 4.5,
    });
  }
  // Focus ring against each background (non-text contrast, 3:1).
  for (const bg of backgrounds) {
    const r = ratio(hexToRgb(theme['focus-ring']), hexToRgb(theme[bg]));
    if (r < 3) failed = true;
    rows.push({
      theme: themeName,
      pair: `focus-ring on ${bg} (UI)`,
      ratio: r.toFixed(2),
      target: 3,
      ok: r >= 3,
    });
  }
}

// Brand surfaces: `.surface-brand` re-maps the tokens for the hero and the CTA band. The band
// is the navy-to-teal gradient, so every pair is checked against both ends of it.
const brandBackgrounds = ['brand-navy', 'brand-teal'];
for (const bg of brandBackgrounds) {
  for (const [token, target] of [
    ['label', 4.5],
    ['label-secondary', 4.5],
    ['accent', 4.5],
  ]) {
    const r = ratio(hexToRgb(brand[token]), hexToRgb(brand[bg]));
    if (r < target) failed = true;
    rows.push({
      theme: 'brand',
      pair: `${token} on ${bg}`,
      ratio: r.toFixed(2),
      target,
      ok: r >= target,
    });
  }
  // Secondary button: white text over the translucent white tint.
  const surface = composite(parseRgba(brand['accent-tint']), hexToRgb(brand[bg]));
  const tinted = ratio(hexToRgb(brand['accent-strong']), surface);
  if (tinted < 4.5) failed = true;
  rows.push({
    theme: 'brand',
    pair: `accent-strong on accent-tint over ${bg}`,
    ratio: tinted.toFixed(2),
    target: 4.5,
    ok: tinted >= 4.5,
  });
  for (const token of ['accent-fill', 'focus-ring']) {
    const r = ratio(hexToRgb(brand[token]), hexToRgb(brand[bg]));
    if (r < 3) failed = true;
    rows.push({
      theme: 'brand',
      pair: `${token} on ${bg} (UI)`,
      ratio: r.toFixed(2),
      target: 3,
      ok: r >= 3,
    });
  }
}
// Primary button on brand surfaces: navy text on the white fill.
const brandBtn = ratio(hexToRgb(brand['on-accent']), hexToRgb(brand['accent-fill']));
if (brandBtn < 4.5) failed = true;
rows.push({
  theme: 'brand',
  pair: 'on-accent on accent-fill (primary button)',
  ratio: brandBtn.toFixed(2),
  target: 4.5,
  ok: brandBtn >= 4.5,
});
// Hero scrim (src/components/sections/Hero.astro): every line of copy sits on `--brand-navy`
// at 90% (`--hero-scrim-strong`); the band above the copy fades through 30% but carries no
// text. Worst case: text over the 90% scrim composited on a pure white pixel, since the
// banner's particle highlights reach #ffffff. The headline is large text (3:1) but is held to
// the body target here, which it clears by a wide margin.
const white = [255, 255, 255];
const heroSurface = composite({ rgb: hexToRgb(brand['brand-navy']), alpha: 0.9 }, white);
for (const token of ['label', 'label-secondary', 'accent']) {
  const r = ratio(hexToRgb(brand[token]), heroSurface);
  if (r < 4.5) failed = true;
  rows.push({
    theme: 'hero',
    pair: `${token} on navy scrim (90%) over a white pixel`,
    ratio: r.toFixed(2),
    target: 4.5,
    ok: r >= 4.5,
  });
}

console.table(rows);
if (failed) {
  console.error('Contrast check FAILED: see rows with ok=false.');
  process.exit(1);
}
console.log('All token pairs meet their WCAG 2.2 AA targets.');

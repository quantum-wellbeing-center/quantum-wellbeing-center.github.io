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
const light = parseBlock(lightBody);
const dark = { ...light, ...parseBlock(darkBody) };

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

console.table(rows);
if (failed) {
  console.error('Contrast check FAILED: see rows with ok=false.');
  process.exit(1);
}
console.log('All token pairs meet their WCAG 2.2 AA targets.');

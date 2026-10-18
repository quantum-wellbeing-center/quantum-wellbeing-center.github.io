#!/usr/bin/env node
/**
 * Content checks that complement the collection schemas in src/content.config.ts.
 *
 *   node scripts/check-content.mjs          run the checks (exit code 1 on any failure)
 *   node scripts/check-content.mjs --todos  also list every TODO(content) / TODO(legal) marker
 *
 * Checks:
 *   1. Every entry sits in `src/content/<collection>/<ro|en>/` and its `lang` field matches.
 *      This covers every collection, including the `pages` and `legal` copy collections.
 *   2. Every `translationKey` exists in both languages, within one collection, exactly once each.
 *   3. No cedilla characters (ş ţ Ş Ţ) anywhere in the content: Romanian uses comma-below ș ț.
 *   4. No forbidden claim words or disease names (section 9 of WEBSITE_PLAN.md), in either language.
 *   5. Checks 3 and 4 also run over the UI dictionaries in `src/i18n/*.json`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src', 'content');
const i18nDir = join(root, 'src', 'i18n');
const LANGS = ['ro', 'en'];
const listTodos = process.argv.includes('--todos');

/* ------------------------------------------------------------- word lists */

// Claim verbs. Nouns used in disclaimers ("tratament", "treatment") are intentionally allowed.
const FORBIDDEN = [
  // Romanian
  { label: 'ro: a vindeca', re: /\bvindec\w*/giu },
  {
    label: 'ro: a trata (verb)',
    re: /\btrat(?:ez|ezi|ează|ăm|ați|at|ată|ate|ați|ând|are|area|ării)\b/giu,
  },
  { label: 'ro: a preveni', re: /\bprev(?:in|en)\w*/giu },
  { label: 'ro: a ameliora', re: /\bamelior\w*/giu },
  { label: 'ro: a repara ADN', re: /\brepar\w*\s+(?:al\s+)?ADN/giu },
  { label: 'ro: a regenera', re: /\bregener\w*/giu },
  { label: 'ro: terapie / terapeutic', re: /\bterap\w*/giu },
  // English
  { label: 'en: cure', re: /\bcur(?:e|es|ed|ing)\b/giu },
  { label: 'en: heal', re: /\bheal(?:s|ed|ing)?\b/giu },
  { label: 'en: treat (verb)', re: /\btreat(?:s|ed|ing)?\b/giu },
  { label: 'en: prevent', re: /\bprevent\w*/giu },
  { label: 'en: alleviate / relieve', re: /\b(?:alleviat|reliev)\w*/giu },
  { label: 'en: repair DNA', re: /\brepair\w*\s+DNA\b/giu },
  { label: 'en: regenerate', re: /\bregenerat\w*/giu },
  { label: 'en: therapy / therapeutic', re: /\btherap\w*/giu },
  // Disease names, both languages
  {
    label: 'disease name',
    re: /\b(?:diabet\w*|cancer\w*|autis\w*|infertil\w*|tumo\w*|alzheimer\w*|parkinson\w*|depres\w*|anxiet\w*|insomni\w*|artrit\w*|arthrit\w*|covid\w*|boal[ăa]|boli\b|diseas\w*|illness\w*)\b/giu,
  },
];
const CEDILLA = /[şţŞŢ]/gu;

/* ------------------------------------------------------------------ files */

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(?:md|json|ya?ml)$/.test(name)) out.push(full);
  }
  return out;
}

function parseEntry(file, text) {
  if (file.endsWith('.json')) return JSON.parse(text);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (kv) data[kv[1]] = kv[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return data;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/* ----------------------------------------------------------------- checks */

const errors = [];
const todos = new Map(); // collection -> [{ file, line, text }]
const keys = new Map(); // collection -> Map<translationKey, { ro: string[], en: string[] }>
let fileCount = 0;

for (const file of walk(contentDir)) {
  fileCount += 1;
  const rel = relative(contentDir, file).split(sep);
  const display = relative(root, file);
  const [collection, lang] = rel;
  const text = readFileSync(file, 'utf8');

  if (rel.length < 3 || !LANGS.includes(lang)) {
    errors.push(`${display}: expected src/content/<collection>/<ro|en>/<slug>.<ext>`);
    continue;
  }

  let data;
  try {
    data = parseEntry(file, text);
  } catch (error) {
    errors.push(`${display}: cannot parse (${error.message})`);
    continue;
  }

  if (data.lang !== lang) {
    errors.push(`${display}: lang is "${data.lang}" but the file is in the "${lang}/" folder`);
  }
  if (typeof data.translationKey !== 'string' || data.translationKey === '') {
    errors.push(`${display}: missing translationKey`);
  } else {
    if (!keys.has(collection)) keys.set(collection, new Map());
    const byKey = keys.get(collection);
    if (!byKey.has(data.translationKey)) byKey.set(data.translationKey, { ro: [], en: [] });
    byKey.get(data.translationKey)[lang].push(display);
  }

  scanText(display, text, collection);
}

/** Diacritics, claim words and TODO markers; shared by content files and the i18n dictionaries. */
function scanText(display, text, group) {
  for (const m of text.matchAll(CEDILLA)) {
    errors.push(
      `${display}:${lineOf(text, m.index)}: cedilla character "${m[0]}" (U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}); use comma-below ș/ț`,
    );
  }

  for (const { label, re } of FORBIDDEN) {
    for (const m of text.matchAll(re)) {
      errors.push(`${display}:${lineOf(text, m.index)}: forbidden claim word "${m[0]}" (${label})`);
    }
  }

  for (const m of text.matchAll(/TODO\((?:content|legal)\)[^\n]*/gu)) {
    if (!todos.has(group)) todos.set(group, []);
    // Strip the JSON string terminator and unescape quotes so the marker reads as written.
    const marker = m[0]
      .replace(/["”„“]?,?\s*$/u, '')
      .replace(/\\"/g, '"')
      .trim();
    todos.get(group).push({ file: display, line: lineOf(text, m.index), text: marker });
  }
}

/* UI dictionaries: same diacritics and claim-word rules (key parity is asserted at build time). */
let i18nCount = 0;
for (const name of readdirSync(i18nDir).filter((n) => /^(ro|en)\.json$/.test(n))) {
  const file = join(i18nDir, name);
  const text = readFileSync(file, 'utf8');
  try {
    JSON.parse(text);
  } catch (error) {
    errors.push(`${relative(root, file)}: cannot parse (${error.message})`);
    continue;
  }
  i18nCount += 1;
  scanText(relative(root, file), text, 'i18n');
}

for (const [collection, byKey] of keys) {
  for (const [key, langs] of byKey) {
    for (const lang of LANGS) {
      if (langs[lang].length === 0) {
        const other = LANGS.find((l) => l !== lang);
        errors.push(
          `${collection}: translationKey "${key}" has no "${lang}" entry (present in ${other}: ${langs[other].join(', ')})`,
        );
      } else if (langs[lang].length > 1) {
        errors.push(
          `${collection}: translationKey "${key}" is used by ${langs[lang].length} "${lang}" entries: ${langs[lang].join(', ')}`,
        );
      }
    }
  }
}

/* ----------------------------------------------------------------- report */

const summary = [...keys.entries()]
  .map(([collection, byKey]) => `${collection}: ${byKey.size} keys`)
  .join(', ');
console.log(`Checked ${fileCount} content files (${summary}) and ${i18nCount} i18n dictionaries.`);

if (listTodos) {
  let total = 0;
  for (const [collection, items] of [...todos.entries()].sort()) {
    console.log(`\n${collection} (${items.length})`);
    for (const { file, line, text } of items) {
      total += 1;
      console.log(`  ${file}:${line}  ${text}`);
    }
  }
  console.log(`\n${total} TODO markers in total.`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(
  'All content checks passed: lang folders, translation twins, diacritics, claim words (content and i18n).',
);

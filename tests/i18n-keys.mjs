#!/usr/bin/env node
/**
 * Fails when src/i18n/ro.json and src/i18n/en.json do not share the same key set,
 * or when a Romanian string uses cedilla ş/ţ instead of comma-below ș/ț.
 * Run: node tests/i18n-keys.mjs
 * (The same key check also runs at build time in src/i18n/index.ts.)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(resolve(here, `../src/i18n/${name}.json`), 'utf8'));

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [[prefix + k, v]] : flatten(v, `${prefix}${k}.`),
  );
}

const ro = flatten(read('ro'));
const en = flatten(read('en'));
const roKeys = new Set(ro.map(([k]) => k));
const enKeys = new Set(en.map(([k]) => k));

const missingInEn = [...roKeys].filter((k) => !enKeys.has(k));
const missingInRo = [...enKeys].filter((k) => !roKeys.has(k));
const cedilla = ro.filter(([, v]) => /[şţŞŢ]/.test(v)).map(([k]) => k);

let failed = false;
if (missingInEn.length) {
  failed = true;
  console.error('Missing in en.json:', missingInEn);
}
if (missingInRo.length) {
  failed = true;
  console.error('Missing in ro.json:', missingInRo);
}
if (cedilla.length) {
  failed = true;
  console.error('Cedilla ş/ţ found (use comma-below ș/ț) in:', cedilla);
}
if (failed) process.exit(1);
console.log(`i18n OK: ${roKeys.size} keys in both languages, diacritics correct.`);

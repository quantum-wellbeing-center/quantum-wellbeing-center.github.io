#!/usr/bin/env node
/**
 * Lighthouse audit of the production build (mobile emulation, Lighthouse defaults).
 *
 *   npm run build && npm run lighthouse            # audits the plan's three key pages
 *   npm run lighthouse -- / /en/contact/           # audits the given paths instead
 *   MIN_SCORE=90 npm run lighthouse                # changes the pass threshold (default 95)
 *
 * Starts `astro preview --ignore-lock` on a spare port, runs Lighthouse against each path with
 * the Chromium that Playwright installed (no system Chrome needed; set CHROME_PATH to override),
 * prints the four category scores, writes JSON + HTML reports to lighthouse-report/, and exits 1
 * when any score is below the threshold.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const PORT = Number(process.env.PREVIEW_PORT || 4326);
const MIN_SCORE = Number(process.env.MIN_SCORE || 95);
const DEFAULT_PATHS = ['/', '/cercetari-stiintifice/', '/contact/'];
const paths = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PATHS;
const outDir = join(root, 'lighthouse-report');
mkdirSync(outDir, { recursive: true });

if (!existsSync(join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH))
    return process.env.CHROME_PATH;
  // 1. Ask Playwright for its Chromium.
  try {
    const { chromium } = require('@playwright/test');
    const p = chromium.executablePath();
    if (p && existsSync(p) && !p.includes('headless_shell')) return p;
  } catch {}
  // 2. Look through Playwright's browser cache for a full Chromium (macOS, Linux, Windows layouts).
  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
    join(homedir(), '.cache', 'ms-playwright'),
    join(homedir(), 'AppData', 'Local', 'ms-playwright'),
  ].filter(Boolean);
  const candidates = [
    'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    'chrome-linux/chrome',
    'chrome-win/chrome.exe',
  ];
  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    const dirs = readdirSync(cache)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort()
      .reverse();
    for (const d of dirs) {
      for (const c of candidates) {
        const p = join(cache, d, c);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

const chrome = findChrome();
if (!chrome) {
  console.error('No Chromium found. Run `npx playwright install chromium` or set CHROME_PATH.');
  process.exit(1);
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview server at ${url} did not start`);
}

const preview = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--ignore-lock'], {
  cwd: root,
  stdio: 'ignore',
});

const results = [];
let failed = false;
try {
  await waitFor(`http://localhost:${PORT}/`);
  for (const path of paths) {
    const url = `http://localhost:${PORT}${path}`;
    const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
    const lighthouseCli = require.resolve('lighthouse/cli/index.js');
    const run = spawnSync(
      process.execPath,
      [
        lighthouseCli,
        url,
        '--output=json',
        '--output=html',
        `--output-path=${join(outDir, slug)}`,
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
        '--only-categories=performance,accessibility,best-practices,seo',
      ],
      {
        cwd: root,
        env: { ...process.env, CHROME_PATH: chrome },
        stdio: ['ignore', 'inherit', 'inherit'],
      },
    );
    if (run.status !== 0) {
      console.error(`Lighthouse failed for ${path} (exit ${run.status})`);
      failed = true;
      continue;
    }
    // Lighthouse writes <output-path>.report.json and .report.html when several outputs are given.
    const lhr = JSON.parse(readFileSync(join(outDir, `${slug}.report.json`), 'utf8'));
    const scores = Object.fromEntries(
      Object.entries(lhr.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]),
    );
    results.push({ path, ...scores });
    if (Object.values(scores).some((s) => s < MIN_SCORE)) failed = true;
  }
} finally {
  preview.kill();
}

console.log('\nLighthouse (mobile) scores, threshold ' + MIN_SCORE + ':');
console.table(results);
console.log(`Reports: ${outDir}/`);
process.exit(failed ? 1 : 0);

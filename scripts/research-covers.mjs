#!/usr/bin/env node
/**
 * Renders the first page of every PDF in public/research/ to a cover image in
 * src/assets/research/<name>.jpg. The research cards show it as the document's thumbnail
 * (an entry points at it through its `cover` field).
 *
 * macOS only: the page is rasterised by Quick Look (`qlmanage`, which honours page rotation;
 * `sips` draws some rotated pages upside down), then resized with sharp.
 * Existing covers are kept; pass --force to redo them. Files ending in `-summary.pdf` are
 * skipped, because a summary is the second file of an entry that already has a cover.
 *
 * Run: npm run research:covers [-- --force]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pdfDir = join(root, 'public', 'research');
const outDir = join(root, 'src', 'assets', 'research');
const force = process.argv.includes('--force');
/** Wide enough for the featured card at 2x; astro:assets makes the smaller sizes. */
const WIDTH = 640;

if (process.platform !== 'darwin') {
  console.error('research-covers: this script needs macOS (it renders PDFs with qlmanage).');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'research-covers-'));
let written = 0;
try {
  const pdfs = readdirSync(pdfDir)
    .filter((file) => file.endsWith('.pdf') && !file.endsWith('-summary.pdf'))
    .sort();
  for (const file of pdfs) {
    const name = basename(file, '.pdf');
    const out = join(outDir, `${name}.jpg`);
    if (!force && existsSync(out)) continue;
    execFileSync('qlmanage', ['-t', '-s', '1400', '-o', tmp, join(pdfDir, file)], {
      stdio: 'ignore',
    });
    const png = join(tmp, `${file}.png`);
    if (!existsSync(png)) throw new Error(`research-covers: Quick Look could not render ${file}`);
    await sharp(png)
      .flatten({ background: '#ffffff' })
      .resize({ width: WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(out);
    written += 1;
    console.log(`wrote src/assets/research/${name}.jpg`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`${written} cover(s) written`);

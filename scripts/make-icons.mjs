#!/usr/bin/env node
/**
 * Renders the browser and home-screen icons from the brand banner (src/assets/photos/banner.jpg):
 * a square crop around the circuit "Q", background included. Run with: node scripts/make-icons.mjs
 *
 *   public/favicon.ico           16, 32 and 48px PNGs in one ICO (browser tab, /favicon.ico)
 *   public/icon-192.png          192px PNG (browser tab on high-density screens, Android)
 *   public/apple-touch-icon.png  180px, square corners: iOS rounds the corners itself
 *
 * After changing the icon, bump the ?v= on the icon links in src/layouts/BaseLayout.astro.
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const banner = new URL('../src/assets/photos/banner.jpg', import.meta.url).pathname;
// The "Q" in the 1553x775 banner, with a little background around it.
const crop = { left: 563, top: 0, width: 550, height: 550 };

/** The crop rendered at `size` px. Small sizes get a touch of sharpening so the lines stay crisp. */
function render(size) {
  let image = sharp(banner).extract(crop).resize(size, size, { kernel: 'lanczos3' });
  if (size <= 48) image = image.sharpen({ sigma: 0.6 }).modulate({ brightness: 1.1 });
  return image.png().toBuffer();
}

/** An ICO file holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await render(size) })),
);
const out = (name) => new URL(`../public/${name}`, import.meta.url);
writeFileSync(out('favicon.ico'), ico(icoImages));
writeFileSync(out('icon-192.png'), await render(192));
writeFileSync(out('apple-touch-icon.png'), await render(180));
console.log('Wrote public/favicon.ico (16, 32, 48), icon-192.png and apple-touch-icon.png (180)');

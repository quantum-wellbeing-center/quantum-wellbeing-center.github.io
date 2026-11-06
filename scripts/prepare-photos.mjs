#!/usr/bin/env node
/**
 * Prepares the owner's photos for the site. Reads the originals from `pictures/` (kept out of
 * the build) and writes web-sized JPEGs to `src/assets/photos/`, plus the Open Graph image to
 * `public/og-default.png`. Run with: node scripts/prepare-photos.mjs [path/to/pictures]
 * (the argument defaults to `pictures/` in the project root).
 *
 * Only crops and resizes: nothing is retouched, recoloured or composited. Every crop is listed
 * below with the reason for it, so the output is reproducible from the same three originals:
 *
 *   pictures/backgroud.jpeg   the brand banner (1600x830). It carries a flat ~28px grey frame
 *                             on all sides that is cropped off; the hero and the OG image use it.
 *   pictures/building.jpeg    the building seen from the courtyard (1500x2000, portrait).
 *   pictures/wall.jpeg        the main room (2048x2048).
 *
 * Output (long edge at most 2400px, mozjpeg at quality 82, metadata stripped):
 *
 *   banner.jpg       1553x775   the banner without its frame (home hero background)
 *   facade.jpg       1500x1000  the building and courtyard, landscape crop (gallery, contact)
 *   room.jpg         2048x1408  the main room, cropped to start below the shelf (gallery)
 *   public/og-default.png 1200x630  the banner, cover-cropped around the logo
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? join(root, 'pictures'));
if (!existsSync(source)) {
  console.error(
    `No such folder: ${source}. Pass the folder with the three originals as the first argument.`,
  );
  process.exit(1);
}
const target = join(root, 'src', 'assets', 'photos');
mkdirSync(target, { recursive: true });

const MAX_EDGE = 2400;
const JPEG = { quality: 82, mozjpeg: true };

/** The banner without its grey frame; also the source of the OG image. */
const BANNER_FRAME = { left: 31, top: 28, width: 1553, height: 775 };

/** @type {{ file: string; from: string; crop?: sharp.Region }[]} */
const photos = [
  { file: 'banner.jpg', from: 'backgroud.jpeg', crop: BANNER_FRAME },
  {
    file: 'facade.jpg',
    from: 'building.jpeg',
    crop: { left: 0, top: 700, width: 1500, height: 1000 },
  },
  // The room is cropped just below the wall shelf, so the photo starts at the framed prints.
  // No zoomed-in detail crops (owner's request, 2026-11-06): only whole views of the space.
  { file: 'room.jpg', from: 'wall.jpeg', crop: { left: 0, top: 640, width: 2048, height: 1408 } },
];

for (const { file, from, crop } of photos) {
  let image = sharp(join(source, from)).rotate();
  if (crop) image = image.extract(crop);
  const info = await image
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg(JPEG)
    .toFile(join(target, file));
  console.log(`wrote src/assets/photos/${file} (${info.width}x${info.height}, ${info.size} bytes)`);
}

// Open Graph: 1200x630 is a touch wider than the hero's 2:1, so the cover crop trims ~30px from
// the top and bottom and keeps the logo, which sits in the middle of the banner, whole.
const og = await sharp(join(source, 'backgroud.jpeg'))
  .extract(BANNER_FRAME)
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
  .png({ compressionLevel: 9, palette: true, quality: 95, dither: 0.8 })
  .toFile(join(root, 'public', 'og-default.png'));
console.log(`wrote public/og-default.png (${og.width}x${og.height}, ${og.size} bytes)`);

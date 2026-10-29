#!/usr/bin/env node
/**
 * Tiles screenshots into one image for review:
 *   node scripts/contact-sheet.mjs <out.png> <columns> <image>...
 * Each tile is labelled with its file name.
 */

import path from 'node:path';
import sharp from 'sharp';

const [out, cols, ...files] = process.argv.slice(2);
const columns = Number(cols);
const TW = 480;
const meta = await sharp(files[0]).metadata();
const TH = Math.round((TW * meta.height) / meta.width);
const GAP = 24;

const tiles = await Promise.all(
  files.map(async (f, i) => {
    const label = Buffer.from(
      `<svg width="${TW}" height="20"><rect width="100%" height="100%" fill="#000"/><text x="6" y="14" font-family="Arial" font-size="13" fill="#fff">${path.basename(f)}</text></svg>`,
    );
    const img = await sharp(f).resize(TW, TH).png().toBuffer();
    const left = (i % columns) * (TW + 10);
    const top = Math.floor(i / columns) * (TH + GAP + 10);
    return [
      { input: label, left, top },
      { input: img, left, top: top + GAP - 4 },
    ];
  }),
);

const rows = Math.ceil(files.length / columns);
await sharp({
  create: { width: columns * (TW + 10), height: rows * (TH + GAP + 10), channels: 3, background: '#777' },
})
  .composite(tiles.flat())
  .png()
  .toFile(out);
console.log(out);

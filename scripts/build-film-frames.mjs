#!/usr/bin/env node
/**
 * Landing film frame pipeline.
 *
 * The landing page scrubs the hero film with the scroll position instead of
 * playing it. Seeking a <video> element to an arbitrary time on every scroll
 * tick is decoded keyframe-first and stutters in Safari and Firefox, so the
 * film ships as a numbered sequence of WebP stills that a canvas draws one at
 * a time. A studio shot on a white cyclorama compresses to about 22 KB a
 * frame at 1600px, which puts every frame of the film in less than the 1080p
 * MP4 it replaces.
 *
 * Writes:
 *   public/film/v1/f000.webp ...   one still per source frame from FILM_START
 *   public/film/v1/engine.m4a      the rev and burnout, for the hidden payoff
 *   lib/film-manifest.ts           frame count, sizes, and per-frame car
 *                                  position, read by the scrubber at build time
 *
 * Bump VERSION when the output changes: the files are served immutable.
 *
 * v2 (2026-10-12) doubles the film to 60 stills a second with motion-
 * compensated interpolation (ffmpeg minterpolate). A slow scroll then steps
 * through real in-between frames instead of cross-fading two stills 33ms
 * apart, which is what read as judder. Phones still load every other still,
 * so their download is the same as v1.
 *
 * Usage:
 *   npm run build:frames
 *   npm run build:frames -- --input ~/Downloads/D4Drive.mp4
 *   npm run build:frames -- --input ~/Downloads/D4Drive.mp4 --fps 30   (v1's rate, no interpolation)
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';

const run = promisify(execFile);

const VERSION = 'v2';
/** Seconds into the source where the scrub begins: past the fade up from black. */
const FILM_START = 1.25;
const WIDTH = 1600;
const HEIGHT = 900;
const QUALITY = 70;
/** The engine rev and burnout, measured off the soundtrack's RMS (-23 dB to -12 dB). */
const AUDIO_FROM = 6.6;
const AUDIO_LENGTH = 3.4;

const OUT = resolve('public/film', VERSION);
const MANIFEST = resolve('lib/film-manifest.ts');

/** Stills per second of film. 60 interpolates; 30 is the source rate. */
function parseFps() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--fps');
  const fps = index === -1 ? 60 : Number(args[index + 1]);
  if (fps !== 30 && fps !== 60) throw new Error('--fps must be 30 or 60');
  return fps;
}

function parseInput() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--input');
  const input = index === -1 ? 'public/videos/d4drive-1080.mp4' : args[index + 1];
  return resolve(input.replace(/^~/, homedir()));
}

/**
 * Where the car sits in a frame, from its paint.
 *
 * The car is the only saturated red on a grey cyclorama, so a plain colour
 * threshold on a 192x108 thumbnail finds it reliably. Portrait screens crop
 * the 16:9 film hard, and this is what lets the crop follow the car instead of
 * filming an empty corner of the studio.
 */
async function locateCar(file) {
  const W = 192;
  const H = 108;
  const { data } = await sharp(file).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  let sx = 0;
  let minY = H;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 3;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 90 && r > g * 1.7 && r > b * 1.7) {
        n += 1;
        sx += x;
        if (y < minY) minY = y;
      }
    }
  }
  // Fewer than ~0.3% red pixels means the car has left (or not yet entered).
  return n < 60 ? null : { cx: sx / n / W, top: minY / H };
}

/** Fills gaps by carrying the nearest known value, then smooths over a window. */
function smooth(values, fallback, radius) {
  const filled = [...values];
  let last = null;
  for (let i = 0; i < filled.length; i += 1) {
    if (filled[i] === null) filled[i] = last;
    else last = filled[i];
  }
  let next = null;
  for (let i = filled.length - 1; i >= 0; i -= 1) {
    if (filled[i] === null) filled[i] = next ?? fallback;
    else next = filled[i];
  }
  return filled.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(filled.length - 1, i + radius); j += 1) {
      sum += filled[j];
      count += 1;
    }
    return Number((sum / count).toFixed(3));
  });
}

async function main() {
  const input = parseInput();
  try {
    await stat(input);
  } catch {
    console.error(`\nSource not found: ${input}\nPass it explicitly: npm run build:frames -- --input <path>\n`);
    process.exit(1);
  }

  const fps = parseFps();
  const scratch = await mkdtemp(join(tmpdir(), 'd4drive-frames-'));
  try {
    console.log(`\nExtracting frames from ${FILM_START}s of ${input} at ${fps} a second`);
    // Interpolate on the source's own frames before scaling, so the motion
    // search works on full detail. mci + aobmc + bidirectional search is the
    // slow, clean mode: a few minutes for the nine-second film.
    const interpolate = fps === 30 ? '' : `minterpolate=fps=${fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,`;
    await run(
      ffmpegPath,
      ['-v', 'error', '-ss', String(FILM_START), '-i', input, '-an', '-vf', `${interpolate}scale=1920:1080:flags=lanczos`, '-q:v', '1', '-qmin', '1', join(scratch, 'f%03d.jpg')],
      { maxBuffer: 1024 * 1024 * 16 },
    );
    const frames = (await readdir(scratch)).filter((f) => f.endsWith('.jpg')).sort();

    await rm(OUT, { recursive: true, force: true });
    await mkdir(OUT, { recursive: true });

    const positions = [];
    let bytes = 0;
    for (const [index, name] of frames.entries()) {
      const source = join(scratch, name);
      const target = join(OUT, `f${String(index).padStart(3, '0')}.webp`);
      await sharp(source)
        .resize({ width: WIDTH, height: HEIGHT, fit: 'cover' })
        .webp({ quality: QUALITY, effort: 5, smartSubsample: true })
        .toFile(target);
      bytes += (await stat(target)).size;
      positions.push(await locateCar(source));
    }
    console.log(`  ${frames.length} frames, ${(bytes / 1048576).toFixed(2)} MB`);

    await run(ffmpegPath, [
      '-v', 'error', '-ss', String(AUDIO_FROM), '-t', String(AUDIO_LENGTH), '-i', input, '-vn',
      '-af', `afade=t=in:d=0.25,afade=t=out:st=${AUDIO_LENGTH - 0.6}:d=0.6`,
      '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-y', join(OUT, 'engine.m4a'),
    ]);
    console.log('  engine.m4a');

    const radius = 6 * (fps / 30);
    const focus = smooth(positions.map((p) => p?.cx ?? null), 0.5, radius);
    const carTop = smooth(positions.map((p) => p?.top ?? null), 0.3, radius);

    const source = `/**
 * Generated by scripts/build-film-frames.mjs. Do not edit by hand.
 *
 * The landing film as a frame sequence: see docs/VIDEO_STATE_MACHINE.md.
 */

export const FILM_MANIFEST = {
  version: '${VERSION}',
  base: '/film/${VERSION}',
  count: ${frames.length},
  width: ${WIDTH},
  height: ${HEIGHT},
  fps: ${fps},
  /** Seconds into the source film where frame 0 sits. */
  start: ${FILM_START},
  audio: '/film/${VERSION}/engine.m4a',
  /** Horizontal centre of the car in each frame, 0 to 1. */
  focus: [${focus.join(', ')}],
  /** Top edge of the car in each frame, 0 to 1. */
  carTop: [${carTop.join(', ')}],
} as const;

export function frameSrc(index: number): string {
  return \`\${FILM_MANIFEST.base}/f\${String(index).padStart(3, '0')}.webp\`;
}
`;
    await writeFile(MANIFEST, source);
    console.log(`  ${MANIFEST}\n`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('\nFrame build failed:', error.message);
  process.exit(1);
});

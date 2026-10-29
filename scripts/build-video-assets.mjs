#!/usr/bin/env node
/**
 * Hero film asset pipeline.
 *
 * The source is 16.4 MB. Served raw it becomes the Largest Contentful Paint
 * element and the entry screen fails Core Web Vitals on anything slower than
 * office wifi. This script produces a poster still that paints immediately
 * (that is the real LCP element) plus size- and codec-appropriate variants
 * that stream behind the loader.
 *
 * Uses ffmpeg-static, so no global ffmpeg install is required.
 *
 * Usage:
 *   npm run build:assets -- --input ~/Downloads/D4Drive.mp4
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, stat, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const run = promisify(execFile);

const VIDEO_DIR = resolve('public/videos');
const POSTER_DIR = resolve('public/posters');

function parseArgs() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--input');
  let input = index !== -1 ? args[index + 1] : undefined;

  if (!input) {
    input = join(homedir(), 'Downloads', 'D4Drive.mp4');
    console.log(`No --input given, defaulting to ${input}`);
  }

  const timeIndex = args.indexOf('--poster-time');
  const posterTime = timeIndex !== -1 ? Number(args[timeIndex + 1]) : undefined;
  if (posterTime !== undefined && !(posterTime >= 0)) {
    console.error('--poster-time must be a number of seconds');
    process.exit(1);
  }

  return { input: resolve(input.replace(/^~/, homedir())), posterTime };
}

async function probe(input) {
  const { stdout } = await run(ffprobeStatic.path, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration,r_frame_rate,codec_name',
    '-show_entries', 'format=duration,size,bit_rate',
    '-of', 'json',
    input,
  ]);
  return JSON.parse(stdout);
}

/**
 * Finds the first frame that is not black.
 *
 * Many encodes open on a black or partial leader frame at exactly t=0.
 * Seeking to 0 would reveal that frame when the loader fades, which reads as
 * a broken transition. `blackdetect` reports any opening black run so
 * POSTER_TIME can be set past it rather than guessed.
 */
async function findFirstVisibleFrame(input) {
  try {
    const { stderr } = await run(
      ffmpegPath,
      ['-i', input, '-vf', 'blackdetect=d=0.01:pix_th=0.10', '-an', '-f', 'null', '-'],
      { maxBuffer: 1024 * 1024 * 8 },
    );

    const matches = [...stderr.matchAll(/black_start:(\d+\.?\d*) black_end:(\d+\.?\d*)/g)];
    const opening = matches.find((m) => Number(m[1]) < 0.05);

    if (opening) {
      // Land a couple of frames past the black run, not exactly on its edge.
      const suggested = Number(opening[2]) + 0.04;
      console.log(`  Opening black run detected, ends at ${opening[2]}s`);
      return Number(suggested.toFixed(3));
    }
  } catch {
    // blackdetect is a convenience, not a requirement. Fall through.
  }
  return 0.04;
}

async function extractPoster(input, time) {
  await mkdir(POSTER_DIR, { recursive: true });

  const common = ['-ss', String(time), '-i', input, '-frames:v', '1', '-y'];

  await run(ffmpegPath, [
    ...common,
    '-vf', 'scale=1920:-2',
    '-quality', '60',
    join(POSTER_DIR, 'poster.webp'),
  ]);

  await run(ffmpegPath, [
    ...common,
    '-vf', 'scale=1920:-2',
    '-q:v', '4',
    join(POSTER_DIR, 'poster.jpg'),
  ]);

  console.log('  poster.webp, poster.jpg');
}

async function encodeMp4(input, height, output) {
  await run(
    ffmpegPath,
    [
      '-i', input,
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-preset', 'slow',
      // CRF 23 is visually transparent for this kind of footage at these
      // sizes. Lower gains little and costs a lot of bytes on the one asset
      // that gates the entire first impression.
      '-crf', '23',
      '-vf', `scale=-2:${height}`,
      '-pix_fmt', 'yuv420p',
      // Moves the index to the front so the browser can start playing before
      // the whole file has arrived. Without this, progressive playback of a
      // remote MP4 does not work at all.
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y', output,
    ],
    { maxBuffer: 1024 * 1024 * 16 },
  );
}

async function encodeWebm(input, height, output) {
  await run(
    ffmpegPath,
    [
      '-i', input,
      '-c:v', 'libvpx-vp9',
      '-crf', '33',
      '-b:v', '0',
      '-vf', `scale=-2:${height}`,
      '-row-mt', '1',
      '-deadline', 'good',
      '-cpu-used', '2',
      '-c:a', 'libopus',
      '-b:a', '96k',
      '-y', output,
    ],
    { maxBuffer: 1024 * 1024 * 16 },
  );
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  const { input, posterTime: posterOverride } = parseArgs();

  try {
    await stat(input);
  } catch {
    console.error(`\nSource not found: ${input}`);
    console.error('Pass the path explicitly: npm run build:assets -- --input <path>\n');
    process.exit(1);
  }

  const sourceSize = (await stat(input)).size;
  console.log(`\nSource: ${input}  (${mb(sourceSize)})`);

  const meta = await probe(input);
  const stream = meta.streams?.[0] ?? {};
  const duration = Number(meta.format?.duration ?? stream.duration ?? 0);

  console.log(`  ${stream.width}x${stream.height}  ${stream.codec_name}  ${duration.toFixed(2)}s\n`);

  console.log('Finding first visible frame');
  const firstVisible = await findFirstVisibleFrame(input);
  console.log(`  First visible frame at ${firstVisible}s\n`);
  const posterTime = posterOverride ?? firstVisible;

  console.log('Extracting poster');
  await extractPoster(input, posterTime);

  await mkdir(VIDEO_DIR, { recursive: true });

  const jobs = [
    ['d4drive-1080.mp4', () => encodeMp4(input, 1080, join(VIDEO_DIR, 'd4drive-1080.mp4'))],
    ['d4drive-720.mp4', () => encodeMp4(input, 720, join(VIDEO_DIR, 'd4drive-720.mp4'))],
    ['d4drive-1080.webm', () => encodeWebm(input, 1080, join(VIDEO_DIR, 'd4drive-1080.webm'))],
    ['d4drive-720.webm', () => encodeWebm(input, 720, join(VIDEO_DIR, 'd4drive-720.webm'))],
  ];

  for (const [name, job] of jobs) {
    process.stdout.write(`Encoding ${name} `);
    const started = Date.now();
    await job();
    console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }

  console.log('\nOutput:');
  for (const dir of [POSTER_DIR, VIDEO_DIR]) {
    for (const name of await readdir(dir)) {
      const size = (await stat(join(dir, name))).size;
      const saving = ((1 - size / sourceSize) * 100).toFixed(0);
      console.log(`  ${name.padEnd(22)} ${mb(size).padStart(10)}   ${saving}% smaller than source`);
    }
  }

  if (posterOverride === undefined) {
    console.log(`\nPoster cut at ${posterTime}s. Re-run with --poster-time <POSTER_TIME> to match constants.ts.`);
  }
  console.log('Commit public/videos and public/posters so a fresh clone plays the intro.\n');
}

main().catch((error) => {
  console.error('\nAsset build failed:', error.message);
  process.exit(1);
});

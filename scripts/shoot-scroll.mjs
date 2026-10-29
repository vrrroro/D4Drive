#!/usr/bin/env node
/**
 * Viewport screenshots down a scrolling page: node scripts/shoot-scroll.mjs <out-dir> <path> <fractions...>
 *
 * Each fraction is a share of the page's scrollable height (0 to 1). Used to
 * review the landing film, whose look depends entirely on scroll position.
 * The wheel is used rather than window.scrollTo so smooth scrolling and the
 * scroll-linked values behave as they do for a visitor. SHOOT_AS signs in
 * first, like scripts/shoot.mjs.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const [outDir, route, ...fractions] = process.argv.slice(2);
const width = Number(process.env.SHOOT_W ?? 1440);
const height = Number(process.env.SHOOT_H ?? 900);

const LOGINS = {
  admin: { email: 'admin@d4drive.in', password: 'D4Drive!Admin2026' },
  customer: { email: 'ananya.k@fastmail.in', password: 'DemoRenter!2026' },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width, height },
  reducedMotion: process.env.SHOOT_REDUCED === '1' ? 'reduce' : 'no-preference',
  colorScheme: process.env.SHOOT_DARK === '1' ? 'dark' : 'light',
});
const login = LOGINS[process.env.SHOOT_AS ?? ''];
if (login) await context.request.post(`${BASE}/api/auth/login`, { data: login });
const page = await context.newPage();
await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(Number(process.env.SHOOT_BOOT ?? 3000));

const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
await page.mouse.move(width / 2, height / 2);
let at = 0;
for (const f of fractions) {
  const target = Math.round(Number(f) * max);
  // Wheel in steps so Lenis and the springs see a real scroll.
  while (Math.abs(target - at) > 2) {
    const step = Math.max(-400, Math.min(400, target - at));
    await page.mouse.wheel(0, step);
    at += step;
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(Number(process.env.SHOOT_SETTLE ?? 1400));
  const y = await page.evaluate(() => Math.round(scrollY));
  const frame = await page.evaluate(() => document.querySelector('canvas[data-frame]')?.getAttribute('data-frame') ?? '');
  const file = path.join(outDir, `${String(f).replace('.', '_')}.png`);
  await page.screenshot({ path: file });
  console.log(`${file}  scrollY=${y}/${max}  frame=${frame}`);
}
await browser.close();

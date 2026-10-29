#!/usr/bin/env node
/**
 * Screenshots for reviewing a change: node scripts/shoot.mjs <out-dir> <path>...
 *
 * Against a running server (BASE_URL, default http://localhost:3000). Signs in
 * first when SHOOT_AS is "admin" or "customer" (the seed logins). Full-page
 * shots at 1440x900, plus 390x844 when SHOOT_MOBILE=1. Output goes to the
 * directory given, which should be outside the repo (smoke-shots/ is ignored).
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const [outDir, ...paths] = process.argv.slice(2);
if (!outDir || paths.length === 0) {
  console.error('usage: node scripts/shoot.mjs <out-dir> <path>...');
  process.exit(1);
}

const LOGINS = {
  admin: { email: 'admin@d4drive.in', password: 'D4Drive!Admin2026' },
  customer: { email: 'ananya.k@fastmail.in', password: 'DemoRenter!2026' },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, channel: process.env.CHROME_PATH ? undefined : 'chrome' });

const sizes = [{ name: 'desktop', width: 1440, height: 900 }];
if (process.env.SHOOT_MOBILE === '1') sizes.push({ name: 'mobile', width: 390, height: 844 });

for (const size of sizes) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    colorScheme: process.env.SHOOT_DARK === '1' ? 'dark' : 'light',
    reducedMotion: process.env.SHOOT_REDUCED === '1' ? 'reduce' : 'no-preference',
  });
  const login = LOGINS[process.env.SHOOT_AS ?? ''];
  if (login) {
    const response = await context.request.post(`${BASE}/api/auth/login`, { data: login });
    if (!response.ok()) throw new Error(`sign-in failed: ${response.status()}`);
  }
  const page = await context.newPage();
  for (const p of paths) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(Number(process.env.SHOOT_WAIT ?? 1200));
    const file = path.join(outDir, `${size.name}${p.replace(/[^\w]+/g, '_') || '_home'}.png`);
    await page.screenshot({ path: file, fullPage: process.env.SHOOT_FULL !== '0' });
    console.log(file);
  }
  await context.close();
}
await browser.close();

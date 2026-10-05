#!/usr/bin/env node
/**
 * End-to-end smoke test against a running server.
 *
 *   npm run build && npm start      # in one terminal, with a seeded database
 *   npm run smoke                   # in another
 *
 * Drives a real Chromium through the intro (loader, gate, wrong then right
 * password, film, landing), registration, catalog, booking, invoice, an
 * admin status change after the access token is deleted (so the client must
 * refresh and retry), refresh-token replay, and the ?next open redirect.
 *
 * Uses playwright-core, which never downloads a browser. Point CHROME_PATH at
 * any Chromium; the default is where the cloud sandbox keeps one. Restart the
 * server between runs: the auth rate limiter is in memory and this script
 * signs in several times.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';


const BASE = process.env.BASE ?? 'http://localhost:3000';
const SHOTS = process.env.SHOTS ?? 'smoke-shots';
mkdirSync(SHOTS, { recursive: true });
const SANDBOX_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME_PATH = process.env.CHROME_PATH ?? (existsSync(SANDBOX_CHROME) ? SANDBOX_CHROME : undefined);
const results = [];
const problems = [];
const ok = (name, cond, detail = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!cond) process.exitCode = 1;
};

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  channel: CHROME_PATH ? undefined : 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});

function watch(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[${label}] console: ${m.text()}`);
  });
  page.on('response', (r) => { if (r.status() === 404) problems.push(`[${label}] 404: ${r.url()}`); });
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${e.message}`));
}

// 1. Intro: loader, gate, login, film, landing
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, 'intro');
  await page.goto(BASE + '/');
  ok('boot loader shows a progressbar', await page.getByRole('progressbar').isVisible());
  const dialog = page.getByRole('dialog', { name: /sign in/i });
  await dialog.waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/01-gate.png` });
  ok('auth gate opens over the frozen frame', await dialog.isVisible());
  await page.waitForTimeout(600);
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('name'));
  ok('focus moves into the gate', focused === 'email', `focused=${focused}`);
  await dialog.getByLabel('Email').fill('ananya.k@fastmail.in');
  await dialog.getByLabel('Password').fill('wrong-password-123');
  await dialog.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Those details did not match').waitFor({ timeout: 10000 });
  ok('wrong password keeps the gate open with an inline error', await dialog.isVisible());
  await dialog.getByLabel('Password').fill('DemoRenter!2026');
  await dialog.getByRole('button', { name: 'Sign in' }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/02-playing.png` });
  await page.waitForFunction(() => sessionStorage.getItem('d4drive:intro-seen') === '1', null, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/03-landing.png` });
  ok('film completes and the landing is revealed', await page.getByRole('heading', { level: 1, name: /Drive easy/ }).isVisible());
  const cookies = await ctx.cookies();
  ok('session cookies are httpOnly', cookies.filter((c) => c.name !== 'd4d_csrf').every((c) => c.httpOnly), cookies.map((c) => `${c.name}:${c.path}`).join(' '));
  ok('no token in localStorage', (await page.evaluate(() => Object.keys(localStorage).length)) === 0);
  await page.reload();
  await page.waitForTimeout(1500);
  ok('reload in the same session skips the intro', !(await page.getByRole('dialog').count()));
  await ctx.close();
}

// 2. Register on /login, then book, confirm, invoice
let reference = '';
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, 'customer');
  await page.goto(BASE + '/login?next=/cars');
  await page.getByRole('button', { name: 'Create one' }).click();
  const email = `smoke.${Date.now()}@example.in`;
  await page.getByLabel('Full name').fill('Karthik Iyer');
  await page.getByLabel('Mobile').fill('9886012345');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-long-test-passphrase');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/cars', { timeout: 15000 });
  ok('register signs in and honours ?next', page.url().endsWith('/cars'));

  const cards = page.locator('main section a[href^="/cars/"]');
  await cards.first().waitFor();
  const count = await cards.count();
  ok('catalog lists active cars', count === 9, `count=${count}`);
  const slots = await page.locator('[data-placeholder="car-photo"]').count();
  ok('every car without a photo shows a labelled slot', slots === count, `slots=${slots}`);
  await page.screenshot({ path: `${SHOTS}/04-catalog.png`, fullPage: true });

  await page.goto(BASE + '/cars?fuel=electric');
  ok('fuel filter narrows the catalog', (await cards.count()) === 2, `electric=${await cards.count()}`);

  await page.goto(BASE + '/cars');
  await cards.first().click();
  await page.waitForURL(/\/cars\/\d+$/);
  await page.getByRole('link', { name: /Reserve this car/ }).click();
  await page.waitForURL(/\/booking\/\d+$/);
  const offset = 60 + Math.floor(Math.random() * 600);
  const start = new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
  const end = new Date(Date.now() + (offset + 3) * 864e5).toISOString().slice(0, 10);
  await page.getByLabel('Pickup').fill(start);
  await page.getByLabel('Return').fill(end);
  await page.locator('#payment-method').selectOption('upi');
  await page.getByLabel('UPI ID').fill('karthik@okhdfcbank');
  await page.screenshot({ path: `${SHOTS}/05-checkout.png`, fullPage: true });
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  await page.waitForURL(/\/confirmation\//, { timeout: 15000 });
  reference = page.url().split('/').pop();
  ok('booking confirms with a reference', /^D4[A-Z0-9]{8}$/.test(reference), reference);
  await page.screenshot({ path: `${SHOTS}/06-confirmation.png`, fullPage: true });

  await page.goto(BASE + '/bookings');
  ok('booking appears on the dashboard', await page.getByText(reference).isVisible());
  const invoiceHref = await page.getByRole('link', { name: 'Invoice' }).first().getAttribute('href');
  const pdf = await page.request.get(BASE + invoiceHref);
  const bytes = await pdf.body();
  ok('invoice downloads as a PDF', pdf.status() === 200 && pdf.headers()['content-type'] === 'application/pdf' && bytes.subarray(0, 4).toString() === '%PDF', `${pdf.status()} ${pdf.headers()['content-type']}`);

  // Another user cannot read this invoice.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const login = await otherPage.request.post(BASE + '/api/auth/login', { data: { email: 'ananya.k@fastmail.in', password: 'DemoRenter!2026' } });
  const foreign = await otherPage.request.get(BASE + invoiceHref);
  ok('another customer gets 404 for this invoice', login.ok() && foreign.status() === 404, `status=${foreign.status()}`);
  await other.close();

  ok('cars API answers', (await page.request.get(BASE + '/api/cars')).ok());
  await ctx.close();
}

// 3. Admin: status transition, and refresh-on-401 through the real UI
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, 'admin');
  await page.goto(BASE + '/admin/bookings');
  await page.waitForURL(/\/login\?next=/);
  await page.getByLabel('Email').fill('admin@d4drive.in');
  await page.getByLabel('Password').fill('D4Drive!Admin2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/admin/bookings', { timeout: 15000 });
  ok('admin sign-in returns to the requested page', page.url().endsWith('/admin/bookings'));

  const row = page.locator('article', { hasText: reference });
  await row.first().waitFor({ timeout: 10000 }).catch(() => {});
  ok('admin sees the new booking', (await row.count()) === 1);
  await page.screenshot({ path: `${SHOTS}/07-admin-bookings.png`, fullPage: true });

  // Expire the access token. The next mutation must refresh and retry once.
  const before = await ctx.cookies();
  const rtBefore = before.find((c) => c.name === 'd4d_rt')?.value;
  await ctx.clearCookies({ name: 'd4d_at' });
  await row.getByRole('button', { name: /start|active|mark/i }).first().click();
  await page.getByText('Updated.').waitFor({ timeout: 10000 });
  ok('status change succeeds after a silent refresh', true);
  await page.waitForTimeout(800);
  ok('booking moved to active', (await row.innerText()).toLowerCase().includes('active'));
  const after = await ctx.cookies();
  const rtAfter = after.find((c) => c.name === 'd4d_rt')?.value;
  ok('refresh rotated the refresh token', rtBefore && rtAfter && rtBefore !== rtAfter);

  // Replay the retired refresh token from a separate client.
  await new Promise((r) => setTimeout(r, 11000));
  const thief = await browser.newContext();
  await thief.addCookies([{ name: 'd4d_rt', value: rtBefore, url: BASE + '/api/auth' }]);
  const replay = await thief.request.post(BASE + '/api/auth/refresh');
  ok('replayed refresh token is refused', replay.status() === 401);
  await thief.close();
  await ctx.clearCookies({ name: 'd4d_at' });
  const legit = await page.request.post(BASE + '/api/auth/refresh');
  ok('replay revoked the legitimate session too', legit.status() === 401);

  await page.goto(BASE + '/admin');
  ok('signed-out admin is sent to login', page.url().includes('/login'));
  await ctx.close();
}

// 4. Hostile inputs
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/login?next=https://evil.example');
  await page.getByLabel('Email').fill('ananya.k@fastmail.in');
  await page.getByLabel('Password').fill('DemoRenter!2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(3000);
  ok('open redirect via ?next is refused', page.url().startsWith(BASE), page.url());
  const noCookie = await browser.newContext();
  const r = await noCookie.request.post(BASE + '/api/auth/refresh');
  ok('refresh without a cookie is 401', r.status() === 401);
  await noCookie.close();
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
console.log(problems.length ? '\nBrowser problems:\n' + problems.join('\n') : '\nNo console errors, page errors, or CSP violations.');

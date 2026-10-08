#!/usr/bin/env node
/**
 * End-to-end smoke test against a running server.
 *
 *   npm run build && npm start      # in one terminal, with a seeded database
 *   npm run smoke                   # in another
 *
 * Drives a real Chromium through the landing film (loader, scrubbing forward
 * and back, chapters, the hand-over to sign-in, a wrong then right password),
 * registration, the fleet stack, booking, invoice, an admin status change after
 * the access token is deleted (so the client must refresh and retry),
 * refresh-token replay, and the ?next open redirect.
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
    if (m.type() === 'error') problems.push(`[${label}] console: ${m.text()} ${m.location().url ?? ''}`);
  });
  page.on('response', (r) => { if (r.status() === 404) problems.push(`[${label}] 404: ${r.url()}`); });
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${e.message}`));
}

// 1. The landing film: loader, scrub, chapters, sign-in at the end
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, 'film');
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  // The loader is server-rendered and holds for at least 900ms from
  // navigation start, so it is on screen from the first paint.
  const loader = await page.getByRole('progressbar').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
  ok('boot loader shows a progressbar', loader);
  await page.locator('[data-film-ready="true"]').waitFor({ timeout: 15000 });
  ok('loader lets go once the film has arrived', (await page.locator('[data-boot-loader]').count()) === 0);
  await page.screenshot({ path: `${SHOTS}/01-hero.png` });

  const canvas = page.locator('[data-film-canvas]');
  const frame = async () => Number(await canvas.getAttribute('data-frame'));
  const track = await page.evaluate(() => {
    const el = document.querySelector('.film-track');
    return { top: el.offsetTop, length: el.offsetHeight - innerHeight };
  });
  const scrubTo = async (p) => {
    await page.evaluate((y) => window.scrollTo(0, y), track.top + p * track.length);
    await page.waitForTimeout(1500);
  };
  ok('the film starts on its first frame', (await frame()) === 0, `frame=${await frame()}`);

  await scrubTo(0.39);
  const middle = await frame();
  ok('scrolling scrubs the film forward', middle > 100 && middle < 140, `frame=${middle}`);
  const help = page.locator('[data-chapter="roast"]');
  ok('the chapter for that moment is on screen', Number(await help.evaluate((el) => getComputedStyle(el).opacity)) > 0.9);
  await page.screenshot({ path: `${SHOTS}/02-film.png` });

  await scrubTo(0.1);
  ok('scrolling back rewinds it', (await frame()) < middle, `frame=${await frame()}`);

  await scrubTo(1);
  ok('the car leaves frame by the end of the track', (await frame()) === 263, `frame=${await frame()}`);
  ok('the smoke fades into the page', Number(await canvas.evaluate((el) => el.style.opacity)) < 0.05);

  const panel = page.locator('#sign-in');
  await panel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  ok('the film hands over to the sign-in panel', await panel.getByRole('heading', { name: 'Sign in to drive.' }).isVisible());
  await panel.getByLabel('Email').fill('ananya.k@fastmail.in');
  await panel.getByLabel('Password').fill('wrong-password-123');
  await panel.getByRole('button', { name: 'Sign in' }).click();
  await panel.getByText('did not match').waitFor({ timeout: 10000 });
  ok('wrong password keeps the panel open with an inline error', await panel.isVisible());
  await page.screenshot({ path: `${SHOTS}/03-sign-in.png` });
  await panel.getByLabel('Password').fill('DemoRenter!2026');
  await panel.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/cars', { timeout: 20000 });
  ok('signing in at the end of the film lands on the fleet', page.url().endsWith('/cars'));

  const cookies = await ctx.cookies();
  ok('session cookies are httpOnly', cookies.filter((c) => c.name !== 'd4d_csrf').every((c) => c.httpOnly), cookies.map((c) => `${c.name}:${c.path}`).join(' '));
  ok('no token in localStorage', (await page.evaluate(() => Object.keys(localStorage).length)) === 0);

  await page.goto(BASE + '/');
  await page.locator('[data-film-ready="true"]').waitFor({ timeout: 15000 });
  await page.locator('#sign-in').scrollIntoViewIfNeeded();
  ok('a signed-in visitor is welcomed instead of asked to sign in', await page.getByRole('heading', { name: /Welcome back/ }).isVisible());
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

  const cards = page.locator('.fleet-row-link');
  await cards.first().waitFor();
  const count = await cards.count();
  ok('catalog lists active cars', count === 9, `count=${count}`);
  const slots = await page.locator('[data-placeholder="car-photo"]').count();
  ok('every car in the fleet has a photograph', slots === 0, `slots=${slots}`);

  // The ghost stack: pointing at a name brings up that car's photograph.
  await page.locator('.fleet').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await cards.nth(2).hover();
  await page.waitForTimeout(700);
  const shown = await page.locator('.fleet-photo').evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) > 0.9).length);
  ok('pointing at a name shows exactly that car', shown === 1, `shown=${shown}`);
  await page.screenshot({ path: `${SHOTS}/04-catalog.png` });

  await page.goto(BASE + '/cars?fuel=electric');
  ok('fuel filter narrows the catalog', (await cards.count()) === 2, `electric=${await cards.count()}`);

  await page.goto(BASE + '/cars');
  await cards.first().click();
  await page.waitForURL(/\/cars\/\d+$/);
  await page.getByRole('link', { name: /Reserve this car/ }).first().click();
  await page.waitForURL(/\/booking\/\d+$/);
  // Every run books the same car, so a random window can overlap a booking
  // left by an earlier run, which the engine rightly refuses (409). Pick
  // fresh dates and retry rather than reporting a working refusal as a failure.
  await page.locator('#payment-method').selectOption('upi');
  await page.getByLabel('UPI ID').fill('karthik@okhdfcbank');
  for (let attempt = 0; attempt < 5 && !/\/confirmation\//.test(page.url()); attempt += 1) {
    const offset = 60 + Math.floor(Math.random() * 3000);
    const start = new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
    const end = new Date(Date.now() + (offset + 3) * 864e5).toISOString().slice(0, 10);
    await page.getByLabel('Pickup').fill(start);
    await page.getByLabel('Return').fill(end);
    if (attempt === 0) await page.screenshot({ path: `${SHOTS}/05-checkout.png`, fullPage: true });
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await page.waitForURL(/\/confirmation\//, { timeout: 8000, waitUntil: 'commit' }).catch(() => {});
  }
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
  // /admin streams behind a loading state, so the redirect lands client-side.
  await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
  ok('signed-out admin is sent to login', page.url().includes('/login'));
  await ctx.close();
}

// 4. Fallbacks: reduced motion and no JavaScript must never hide content
{
  const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await reduced.newPage();
  watch(page, 'reduced-motion');
  await page.goto(BASE + '/');
  await page.waitForTimeout(1200);
  ok('reduced motion never scrubs: no film canvas, no loader', (await page.locator('[data-film-canvas]').count()) === 0 && !(await page.locator('[data-boot-loader]').isVisible()));
  const faded = await page.locator('[data-chapter]').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
  ok('reduced motion shows every chapter as plain copy', faded === 0, `faded=${faded}`);
  ok('reduced motion offers the film on request', await page.getByRole('button', { name: 'Play the film' }).isVisible());
  ok('reduced motion creates no particle canvas', (await page.locator('canvas[data-particle-stage]').count()) === 0);
  await page.screenshot({ path: `${SHOTS}/08-reduced-motion.png` });
  await reduced.close();

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(BASE + '/');
  ok('without JavaScript the loader never covers the page', !(await staticPage.locator('[data-boot-loader]').isVisible()));
  const fadedNoJs = await staticPage.locator('[data-chapter]').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
  ok('without JavaScript every chapter is readable', fadedNoJs === 0, `faded=${fadedNoJs}`);
  await staticPage.goto(BASE + '/cars');
  ok('without JavaScript the fleet is listed', (await staticPage.locator('.fleet-row-link').count()) === 9);
  await noJs.close();
}

// 5. Hostile inputs
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

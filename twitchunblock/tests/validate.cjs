/* Run with Node 20+ and Playwright installed outside this repository:
 * PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node twitchunblock/tests/validate.cjs
 * Serve the repository root on http://127.0.0.1:8765 first. Set SITE_URL for another host.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8765';
const endpoint = 'https://api.github.com/repos/ipapplus/TwitchUnblock/releases/latest';
const assetURL = 'https://github.com/ipapplus/TwitchUnblock/releases/download/site-test/TwitchUnblock.ipa';
const release = {
  name: 'TwitchUnblock 9.9.9', tag_name: 'site-test', published_at: '2026-10-05T12:00:00Z',
  html_url: 'https://github.com/ipapplus/TwitchUnblock/releases/tag/site-test',
  draft: false, prerelease: false,
  assets: [
    { name: 'Other.ipa', state: 'uploaded', browser_download_url: assetURL.replace('TwitchUnblock.ipa', 'Other.ipa') },
    { name: 'TwitchUnblock-Test.ipa', state: 'uploaded', browser_download_url: assetURL.replace('TwitchUnblock.ipa', 'TwitchUnblock-Test.ipa') },
    { name: 'TwitchUnblock.ipa', state: 'uploaded', browser_download_url: assetURL }
  ]
};
function workerIsolation() {
  const worker = fs.readFileSync(path.resolve(__dirname, '../../sw.js'), 'utf8');
  const events = {};
  const scope = base + '/';
  vm.runInNewContext(worker, {
    URL, self: { registration: { scope }, location: new URL(scope), addEventListener: (name, handler) => events[name] = handler },
    caches: { open: () => Promise.resolve({ match: () => Promise.resolve('cached-font') }) }, fetch: () => Promise.resolve('network')
  });
  for (const resource of ['/twitchunblock/', '/twitchunblock/app.js', '/twitchunblock/style.css', '/twitchunblock/assets/app-icon.png', '/Packages', '/Release', '/packages.html']) {
    let intercepted = false;
    events.fetch({ request: { url: base + resource, method: 'GET', mode: resource.endsWith('/') ? 'navigate' : 'cors' }, respondWith: () => intercepted = true });
    assert.equal(intercepted, false, 'Root worker must pass through ' + resource);
  }
  let fontCached = false;
  events.fetch({ request: { url: base + '/26.ttf', method: 'GET', mode: 'cors' }, respondWith: () => fontCached = true });
  assert.equal(fontCached, true);
  const source = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
  assert(!source.includes('serviceWorker.register'));
  assert(!fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8').includes('rel="manifest"'));
  console.log('PASS root worker pass-through and no new registration');
}
async function setup(browser, viewport, payload = release, status = 200, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion, timezoneId: 'Asia/Riyadh', hasTouch: viewport.width < 600 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(endpoint, route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) }));
  await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await page.goto(base + '/twitchunblock/');
  await page.waitForFunction(() => !document.getElementById('release-status').textContent.startsWith('Checking'));
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}
async function layout(browser, engine, viewport) {
  const { context, page, errors } = await setup(browser, viewport);
  assert.equal(await page.locator('#release-version').textContent(), release.name);
  assert.equal(await page.locator('#release-tag').textContent(), release.tag_name);
  assert.equal(await page.locator('#release-date').getAttribute('datetime'), '2026-10-05T12:00:00.000Z');
  assert.equal(await page.locator('#release-age').textContent(), '2 days ago');
  for (const link of await page.locator('[data-ipa-link]').all()) assert.equal(await link.getAttribute('href'), assetURL);
  const measurements = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    fontLoaded: [...document.fonts].some(font => font.family.replace(/"/g, '') === 'Repo Local' && font.status === 'loaded'),
    fontFamily: getComputedStyle(document.body).fontFamily,
    bg: getComputedStyle(document.body).backgroundColor,
    direction: getComputedStyle(document.querySelector('.arabic-sample')).direction,
    unsafeLinks: [...document.querySelectorAll('a')].filter(a => a.getBoundingClientRect().height < 43.9).map(a => a.textContent)
  }));
  assert.equal(measurements.overflow, false);
  assert.equal(measurements.fontLoaded, true);
  assert(measurements.fontFamily.includes('Repo Local'));
  assert.equal(measurements.bg, 'rgb(10, 13, 20)');
  assert.equal(measurements.direction, 'rtl');
  assert.deepEqual(measurements.unsafeLinks, []);
  assert(await page.locator('a[href="https://ipapplus.github.io/"]').count() >= 1);
  assert.equal(await page.locator('a[href="https://github.com/ipapplus/TwitchUnblock"]').count(), 2);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth), '2px');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  await page.clock.runFor(86400000);
  assert.equal(await page.locator('#release-age').textContent(), '3 days ago');
  assert.deepEqual(errors, []);
  if (process.env.SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, engine + '-' + viewport.width + '.png'), fullPage: true });
    await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, engine + '-' + viewport.width + '-top.png') });
  }
  console.log('PASS', engine, viewport.width, 'layout, font, touch targets, release, IPA, focus, RTL, relative refresh');
  await context.close();
}
async function failures(browser, engine) {
  const cases = [
    { name: 'rate limit', payload: {}, status: 403 },
    { name: 'API failure', payload: {}, status: 503 },
    { name: 'malformed date', payload: { ...release, published_at: null } },
    { name: 'unsafe URL', payload: { ...release, html_url: 'javascript:alert(1)' } },
    { name: 'missing IPA', payload: { ...release, assets: [] }, destination: release.html_url },
    { name: 'unsafe IPA URL', payload: { ...release, assets: [{ name: 'TwitchUnblock.ipa', state: 'uploaded', browser_download_url: 'https://example.com/fake.ipa' }] }, destination: release.html_url },
    { name: 'ambiguous IPAs', payload: { ...release, assets: [1, 2].map(n => ({ name: 'TwitchUnblock-1.2.' + n + '.ipa', state: 'uploaded', browser_download_url: assetURL })) }, destination: release.html_url },
    { name: 'untrusted title stays text', payload: { ...release, name: '<img src=x onerror=alert(1)>' }, destination: assetURL, hasIPA: true }
  ];
  for (const test of cases) {
    const { context, page, errors } = await setup(browser, { width: 320, height: 812 }, test.payload, test.status || 200);
    for (const link of await page.locator('[data-ipa-link]').all()) {
      assert.equal(await link.getAttribute('href'), test.destination || 'https://github.com/ipapplus/TwitchUnblock/releases/latest', test.name);
      assert.equal(await link.locator('[data-download-label]').textContent(), test.hasIPA ? 'Download IPA' : 'View Releases');
    }
    if (test.hasIPA) assert.equal(await page.locator('#release-version img').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { context, page } = await setup(browser, { width: 390, height: 844 }, release, 200, 'reduce');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.button')).transitionDuration), '0s');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  await context.close();
  // A hung request aborts once; no immediate retry loop or permanently stale loading state.
  const stalled = await browser.newContext();
  const stalledPage = await stalled.newPage();
  let calls = 0;
  await stalledPage.route(endpoint, () => { calls++; });
  await stalledPage.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await stalledPage.goto(base + '/twitchunblock/');
  await stalledPage.clock.runFor(11000);
  await stalledPage.waitForFunction(() => document.getElementById('release-status').textContent.includes('couldn’t'));
  assert.equal(calls, 1);
  await stalled.close();
  console.log('PASS', engine, 'API/rate-limit/malformed/missing/ambiguous fallbacks, safe text, timeout, reduced motion');
}
async function rootRegression(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const resource of ['Packages', 'Release', 'packages.html', 'index.html', 'website.css', 'website.js', 'sw.js', '26.ttf']) {
    const response = await context.request.get(base + '/' + resource);
    assert.equal(response.status(), 200, resource);
    const remoteHash = crypto.createHash('sha256').update(await response.body()).digest('hex');
    const localHash = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../../', resource))).digest('hex');
    assert.equal(remoteHash, localHash, resource + ' changed');
  }
  await page.goto(base + '/');
  assert.equal(await page.locator('#sileo').getAttribute('href'), 'sileo://source/https://ipapplus.github.io');
  await page.getByRole('link', { name: 'Browse Tweaks' }).click();
  await page.locator('#package-list').waitFor({ state: 'visible' });
  assert(page.url().endsWith('/packages.html'));
  await page.goto(base + '/twitchunblock/');
  await page.locator('.site-header .back').click({ trial: true });
  await context.close();
  console.log('PASS root resource byte parity, Sileo source, home/package navigation');
}
(async () => {
  workerIsolation();
  for (const [name, engine] of Object.entries({ chromium, webkit })) {
    const browser = await engine.launch();
    try {
      for (const viewport of [{ width: 320, height: 812 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) await layout(browser, name, viewport);
      await failures(browser, name);
      if (name === 'chromium') await rootRegression(browser);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

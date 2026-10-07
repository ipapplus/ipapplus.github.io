/* Mocked integration tests. Fixtures are NOT live Twitch API results or credentials.
 * PLAYWRIGHT_MODULE=/path/to/playwright node twitchunblock/tests/phase2.cjs
 * Serve the repository root on port 8765; SITE_URL may point to production.
 */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8765';
const prefix = base + '/twitchunblock/';
const clientId = 'testclient';
const token = 'testtokenonly0000000000';
const user = { id: '1', login: 'viewer', display_name: 'Viewer', profile_image_url: '', description: 'Viewer account' };
const liveUser = { id: '2', login: 'livechannel', display_name: 'Live Channel', profile_image_url: '', description: 'Hello <img src=x onerror=alert(1)> مرحبًا' };
const offlineUser = { id: '3', login: 'offlinechannel', display_name: 'Offline Channel', profile_image_url: '', description: 'An offline channel' };
const stream = { user_id: '2', user_login: 'livechannel', user_name: 'Live Channel', title: 'Live <script>bad</script> مرحبًا', game_name: 'Just Chatting', viewer_count: 1234, started_at: new Date(Date.now() - 7200000).toISOString() };
const searchRow = u => ({ id: u.id, broadcaster_login: u.login, display_name: u.display_name, thumbnail_url: '', title: u.id === '2' ? stream.title : 'Last stream', game_name: 'Just Chatting', is_live: u.id === '2' });
async function setup(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: options.width || 390, height: 900 }, locale: options.language || 'en', reducedMotion: 'reduce' });
  if (options.signedIn !== false) await context.addInitScript(({ token }) => { if (!sessionStorage.getItem('test.seeded')) { sessionStorage.setItem('twitchunblock.session', JSON.stringify({ token })); sessionStorage.setItem('test.seeded','1'); } }, { token });
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  const calls = [];
  if (!options.unconfigured) await page.route('**/twitchunblock/assets/js/config.js', r => r.fulfill({ contentType: 'application/javascript', body: `window.TwitchConfig=Object.freeze({clientId:'${clientId}',redirectUri:'https://ipapplus.github.io/twitchunblock/',timeoutMs:250});` }));
  await page.route('https://id.twitch.tv/oauth2/validate', r => r.fulfill({ status: options.invalidToken ? 401 : 200, contentType: 'application/json', body: JSON.stringify({ client_id: clientId, user_id: '1', login: 'viewer', expires_in: 3600 }) }));
  await page.route('https://id.twitch.tv/oauth2/revoke', r => r.fulfill({ status: 200, body: '{}' }));
  await page.route('https://api.twitch.tv/helix/**', async r => {
    const url = new URL(r.request().url()); calls.push({ path: url.pathname, params: url.search, authorization: r.request().headers().authorization });
    const endpoint = url.pathname.slice('/helix/'.length);
    if (options.failure && endpoint === 'search/channels') {
      if (options.failure === 'timeout') return;
      if (options.failure === 'malformed') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' });
      return r.fulfill({ status: options.failure === 'rate' ? 429 : options.failure === 'invalid' ? 401 : 503, body: '{}' });
    }
    if (options.mediaFailure && endpoint==='videos') return r.fulfill({status:503,body:'{}'});
    let data;
    switch(endpoint) {
      case 'users': {
        const login = url.searchParams.get('login'); const ids = url.searchParams.getAll('id');
        data = [user,liveUser,offlineUser].filter(u => login ? u.login === login : ids.includes(u.id)); break;
      }
      case 'streams': {
        const ids = url.searchParams.getAll('user_id'); data = !ids.length || ids.includes('2') ? [stream] : []; break;
      }
      case 'search/channels': {
        const query = url.searchParams.get('query');
        data = query === 'none' || (options.exactOffline && query === 'offlinechannel') ? [] : query === 'offlinechannel' ? [searchRow(offlineUser)] : query === 'livechannel' ? [searchRow(liveUser)] : [searchRow(liveUser), searchRow(offlineUser)];
        if (url.searchParams.get('live_only') === 'true') data = data.filter(r => r.is_live); break;
      }
      case 'channels': { const id = url.searchParams.get('broadcaster_id'); data = [{ broadcaster_id: id, title: id === '2' ? stream.title : 'Last stream', game_name: 'Just Chatting' }]; break; }
      case 'videos': data = url.searchParams.get('user_id') === '3' ? [] : [{ id: '99', title: 'Recent VOD <b>text</b>', created_at: '2026-10-01T12:00:00Z', duration: '2h3m', view_count: 100 }]; break;
      case 'clips': data = url.searchParams.get('broadcaster_id') === '3' ? [] : [{ id: 'SafeClip-123', title: 'Recent clip', created_at: '2026-10-01T12:00:00Z', view_count: 10 }]; break;
      default: throw new Error('Unexpected endpoint: ' + endpoint);
    }
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({data}) });
  });
  await page.goto(prefix + (options.hash || '#home'));
  await page.waitForFunction(() => document.getElementById('home-state').textContent !== 'Loading…' && document.getElementById('home-state').textContent !== 'جارٍ التحميل…');
  return { context, page, errors, calls };
}
async function search(page, query) { await page.locator('[data-section="search"]').click(); await page.locator('#channel').fill(query); await page.locator('#search-form [type="submit"]').click(); await page.waitForFunction(() => document.querySelector('#search-results').getAttribute('aria-busy') === 'false'); }
async function matrix(browser, engine) {
 for (const width of [320,375,390,430,1440]) for (const language of ['en','ar']) {
  const { context, page, errors, calls } = await setup(browser,{width,language});
  await page.locator('#home-results .channel-card').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  assert.equal(await page.locator('html').getAttribute('dir'),language==='ar'?'rtl':'ltr');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineWidth),'2px');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#sign-in').isVisible(),false);
  assert((await page.locator('#user-session').textContent()).includes('Viewer'));
  await page.evaluate(() => document.fonts.ready);
  assert(await page.evaluate(() => [...document.fonts].some(f => f.family === 'Repo Local' && f.status === 'loaded')));
  await search(page,''); assert((await page.locator('#search-state').textContent()).includes(language==='ar'?'أدخل':'Enter'));
  await search(page,'both'); assert.equal(await page.locator('#search-results .channel-card').count(),2);
  await page.locator('#live-only').check(); await search(page,'both'); assert.equal(await page.locator('#search-results .channel-card').count(),1); await page.locator('#live-only').uncheck();
  await search(page,'none'); assert((await page.locator('#search-state').textContent()).includes(language==='ar'?'لم نعثر':'No matching'));
  await search(page,'offlinechannel');
  await page.locator('#search-results .channel-link').click();
  await page.locator('#channel-profile .pill').waitFor();
  assert.equal(await page.locator('#channel-profile .pill').textContent(),language==='ar'?'غير متصل':'Offline');
  await page.waitForFunction(() => document.querySelector('#channel-profile').getAttribute('aria-busy')==='false');
  assert((await page.locator('#channel-videos').textContent()).includes(language==='ar'?'لا توجد':'No recent'));
  await search(page,'livechannel'); await page.locator('#search-results .channel-link').click();
  await page.locator('#channel-videos .media-link').waitFor();
  assert.equal(await page.locator('#channel-profile .pill').textContent(),language==='ar'?'مباشر':'Live');
  assert.equal(await page.locator('#channel-videos .media-link').getAttribute('href'),'https://www.twitch.tv/videos/99');
  assert.equal(await page.locator('#channel-clips .media-link').getAttribute('href'),'https://clips.twitch.tv/SafeClip-123');
  assert.equal(await page.locator('#channel-profile script,#channel-profile img[src="x"]').count(),0);
  assert((await page.locator('#channel-profile').textContent()).includes('<script>bad</script>'));
  assert.equal(await page.locator('#channel-profile .project-heading bdi').getAttribute('dir'),'ltr');
  if(process.env.SCREENSHOT_DIR && width===390) {fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`${engine}-channel-${language}.png`),fullPage:true});}
  await page.locator('[data-section="history"]').click(); assert.equal(await page.locator('#history-results .channel-card').count(),2);
  await page.reload(); await page.locator('#history-results .channel-card').first().waitFor(); assert.equal(await page.locator('#history-results .channel-card').count(),2);
  await page.locator('header [data-language="'+(language==='en'?'ar':'en')+'"]').click(); await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'),language==='en'?'ar':'en');
  for (const section of ['home','search','history','settings']) {
   await page.locator('[data-section="'+section+'"]').click(); await page.locator('[data-panel="'+section+'"]').waitFor({state:'visible'});
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth),false,engine+' '+width+' '+section);
  }
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),'auto');
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a,button,input')].filter(e=>e.getBoundingClientRect().width && (e.type==='checkbox'?e.closest('label').getBoundingClientRect().height:e.getBoundingClientRect().height)<43.9).map(e=>e.id||e.textContent)),[]);
  await page.locator('#clear-history').click(); assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('twitchunblock.history') || '[]').length),0);
  assert(await page.locator('#clear-history').isDisabled());
  await page.locator('#settings-logout').click(); await page.locator('#sign-in').waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('twitchunblock.session')),null);
  await page.reload(); await page.locator('#sign-in').waitFor();
  assert.equal(await page.evaluate(() => Object.values(localStorage).some(v=>v.includes('testtokenonly'))),false);
  assert(calls.every(c=>c.authorization==='Bearer '+token)); assert.deepEqual(errors,[]);
  if (process.env.SCREENSHOT_DIR) { fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true}); await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`${engine}-phase2-${width}-${language}.png`),fullPage:true}); }
  await context.close();
 }
 console.log('PASS',engine,'MOCKED 10 widths/languages: Home/live/offline/search/filter/channel/VODs/clips/history/settings/logout/RTL/font/overflow');
}
async function failures(browser,engine) {
 for (const failure of ['rate','timeout','malformed','invalid','failed']) for (const language of ['en','ar']) {
  const {context,page,errors}=await setup(browser,{failure,language}); await search(page,'livechannel');
  const messages = {rate:'api.rateLimit',timeout:'api.timeout',malformed:'api.malformed',invalid:'auth.expired',failed:'api.failed'};
  assert.equal(await page.locator('#search-state').textContent(), await page.evaluate(k=>TwitchI18n.t(k),messages[failure]));
  if (failure==='invalid') assert.equal(await page.evaluate(()=>sessionStorage.getItem('twitchunblock.session')),null);
  assert.deepEqual(errors,[]); await context.close();
 }
 const invalid=await setup(browser,{invalidToken:true}); assert.equal(await invalid.page.evaluate(()=>sessionStorage.getItem('twitchunblock.session')),null); await invalid.context.close();
 const missing=await setup(browser,{unconfigured:true,signedIn:false}); assert(await missing.page.locator('#sign-in').isDisabled()); assert((await missing.page.locator('#auth-state').textContent()).includes('site owner')); await missing.context.close();
 const notFound=await setup(browser); await notFound.page.goto(prefix+'#channel/missing'); await notFound.page.waitForFunction(()=>document.querySelector('#channel-state').textContent.includes('could not be found')); await notFound.context.close();
 const exact=await setup(browser,{exactOffline:true}); await search(exact.page,'offlinechannel'); assert.equal(await exact.page.locator('#search-results .channel-card').count(),1); await exact.context.close();
 const media=await setup(browser,{mediaFailure:true}); await media.page.goto(prefix+'#channel/livechannel'); await media.page.locator('#channel-clips .media-link').waitFor(); assert((await media.page.locator('#channel-videos').textContent()).includes('could not be loaded')); assert.equal(await media.page.locator('#channel-profile .pill').textContent(),'Live'); await media.context.close();
 const expired=await setup(browser); await expired.page.evaluate(()=>TwitchAuth.session.expiresAt=Date.now()-1); await search(expired.page,'livechannel'); assert((await expired.page.locator('#auth-state').textContent()).includes('expired')); await expired.context.close();
 const quota=await setup(browser); await quota.page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError')}}); await quota.page.goto(prefix+'#channel/livechannel'); await quota.page.locator('#channel-profile .pill').waitFor(); await quota.page.locator('[data-section="history"]').click(); assert.equal(await quota.page.locator('#history-results .channel-card').count(),1); assert((await quota.page.locator('#history-state').textContent()).includes('could not save')); await quota.context.close();
 console.log('PASS',engine,'MOCKED localized API errors, timeout, rate limit, malformed response, invalid token, missing configuration, direct missing channel');
}
async function oauth(browser,engine) {
 const {context,page}=await setup(browser,{signedIn:false});
 const first=await page.evaluate(()=>TwitchAuth.authorizationURL()); const second=await page.evaluate(()=>TwitchAuth.authorizationURL());
 const url=new URL(second);
 assert.equal(url.origin,'https://id.twitch.tv'); assert.equal(url.searchParams.get('client_id'),clientId); assert.equal(url.searchParams.get('redirect_uri'),'https://ipapplus.github.io/twitchunblock/'); assert.equal(url.searchParams.get('response_type'),'token'); assert.equal(url.searchParams.get('scope'),''); assert.notEqual(new URL(first).searchParams.get('state'),url.searchParams.get('state')); assert.equal(url.searchParams.get('state').length,64);
 await page.route('https://id.twitch.tv/oauth2/authorize**', r=>r.fulfill({contentType:'text/html',body:'<p>Mock Twitch authorization page</p>'}));
 const [authorization] = await Promise.all([page.waitForRequest('https://id.twitch.tv/oauth2/authorize**'),page.locator('#sign-in').click()]);
 const actualURL = new URL(authorization.url());
 await page.goto(prefix+'#access_token='+token+'&token_type=bearer&state='+actualURL.searchParams.get('state')); await page.locator('#user-session').getByRole('button').waitFor();
 assert(!page.url().includes('access_token')); assert.equal(await page.evaluate(()=>sessionStorage.getItem('twitchunblock.oauth')),null);
 await page.evaluate(()=>TwitchAuth.logout());
 await page.goto('about:blank'); await page.goto(prefix+'#access_token='+token+'&token_type=bearer&state=wrong'); await page.waitForFunction(()=>document.querySelector('#auth-state').textContent.includes('could not be verified')); assert.equal(await page.evaluate(()=>sessionStorage.getItem('twitchunblock.session')),null);
 await page.evaluate(()=>TwitchAuth.authorizationURL()); const pending=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('twitchunblock.oauth')));
 await page.goto(prefix+'?error=access_denied&error_description=private&state='+pending.state); await page.waitForFunction(()=>document.querySelector('#auth-state').textContent.includes('cancelled')); assert(!page.url().includes('error'));
 await page.evaluate(()=>{TwitchAuth.authorizationURL();const p=JSON.parse(sessionStorage.getItem('twitchunblock.oauth'));p.created-=700000;sessionStorage.setItem('twitchunblock.oauth',JSON.stringify(p))});
 const stale=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('twitchunblock.oauth')).state); await page.goto('about:blank'); await page.goto(prefix+'#access_token='+token+'&token_type=bearer&state='+stale); await page.waitForFunction(()=>document.querySelector('#auth-state').textContent.includes('could not be verified')); assert.equal(await page.evaluate(()=>sessionStorage.getItem('twitchunblock.session')),null);
 await context.close(); console.log('PASS',engine,'MOCKED OAuth URL, random single-use state, valid callback, URL cleanup, invalid/expired state, denial, session-only storage');
}
(async()=>{
 for(const [name,engine] of Object.entries({chromium,webkit})) {
  if(process.env.ENGINE && process.env.ENGINE!==name)continue;
  const browser=await engine.launch(); try {await matrix(browser,name);await failures(browser,name);await oauth(browser,name);}finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1});

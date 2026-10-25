import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {icon,paths} from '../web/_player/icons.js';
import {setNumerals} from '../web/_player/format.js';
const subtitle='إرثٌ يُروى، وجمالٌ يُسمع بصوت الشيخ الدكتور عبدالرحمن الحميّن';
test('custom icons share one local, decorative SVG contract and numeral formatting',()=>{
  for(const name of Object.keys(paths)){
    const svg=icon(name);assert.ok(svg.includes('viewBox="0 0 24 24"'));assert.ok(svg.includes('aria-hidden="true"'));assert.ok(svg.includes(`data-ui-icon="${name}"`));
    assert.ok(!/https?:|href=|#(?:[a-f0-9]{3})\b|<image/i.test(svg));
  }
  setNumerals('western');assert.match(icon('rewind'),/>10<\/text>/);assert.match(icon('repeatOne'),/>1<\/text>/);
  setNumerals('eastern');assert.match(icon('forward'),/>١٠<\/text>/);assert.match(icon('repeatOne'),/>١<\/text>/);
});
test('public credits contain only the requested content, original destinations and no invented handle link',async()=>{
  const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
  const footer=html.match(/<footer\b[\s\S]*?<\/footer>/)[0],about=html.match(/<dialog id="about"[\s\S]*?<\/dialog>/)[0];
  assert.ok(footer.includes(subtitle));assert.ok(about.includes(subtitle));
  assert.equal((footer.match(/<a\b/g)||[]).length,2);assert.ok(footer.includes('https://ipapplus.github.io/'));assert.ok(footer.includes('https://x.com/ipapplus'));assert.ok(!/فواز|ريحانة|@/.test(footer));
  assert.equal((about.match(/<a\b/g)||[]).length,3);assert.ok(about.includes('https://x.com/fawaz_dr'));assert.ok(about.includes('https://app.box.com/s/3pjw0wv9i83mvv8p70wd2hhh97co4gk6/folder/37602376827'));
  assert.ok(!about.includes('الأخت'));assert.equal((about.match(/class="attribution-card"/g)||[]).length,3);assert.ok(about.includes('@REHANH_DE'));assert.ok(!/href="[^\"]*REHANH/i.test(about));
  const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match=>match[1]);
  for(const url of ['https://github.com/ipapplus/media'])assert.ok(!links.includes(url));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('social metadata is static, absolute and complete; the sharing image is an optimized 1200×630 JPEG', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  const metadata = new Map([...html.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)">/g)].map(m => [m[1], m[2]]));
  const title = 'ديوان العرب | كلماتٌ عبرت الدهور';
  const description = 'ديوان العرب، مكتبة صوتية تجمع روائع الشعر العربي وكنوز الأدب بأصوات رواتها.';
  const image = 'https://ipapplus.github.io/media/_player/social-heritage-v1.jpg';
  for (const [name, content] of Object.entries({
    'og:title':title, 'og:description':description, 'og:image':image, 'og:image:type':'image/jpeg',
    'og:image:width':'1200', 'og:image:height':'630', 'og:type':'website', 'og:locale':'ar_SA',
    'og:url':'https://ipapplus.github.io/media/', 'twitter:card':'summary_large_image',
    'twitter:title':title, 'twitter:description':description, 'twitter:image':image,
  })) assert.equal(metadata.get(name), content, name);
  assert.match(metadata.get('og:image:alt'), /جمل.*ملثم/);
  assert.equal(metadata.get('og:image:alt'), metadata.get('twitter:image:alt'));
  assert.match(html, /<link rel="canonical" href="https:\/\/ipapplus.github.io\/media\/">/);
  const jpeg = await readFile(new URL('../web/_player/social-heritage-v1.jpg', import.meta.url));
  assert.equal(jpeg.readUInt16BE(0), 0xffd8);
  assert.ok(jpeg.length < 200_000);
  let dimensions;
  for (let offset = 2; offset < jpeg.length;) {
    assert.equal(jpeg[offset], 0xff);
    const marker = jpeg[offset + 1], length = jpeg.readUInt16BE(offset + 2);
    if ([0xc0,0xc1,0xc2].includes(marker)) { dimensions = [jpeg.readUInt16BE(offset + 7), jpeg.readUInt16BE(offset + 5)]; break; }
    offset += length + 2;
  }
  assert.deepEqual(dimensions, [1200, 630]);
  // This release derives a separate sharing asset; the original must stay intact.
  const original = await readFile(new URL('../web/_player/heritage-desert.webp', import.meta.url));
  assert.equal(createHash('sha256').update(original).digest('hex'), '45bfb1ae6f12fd076eb7eb1ef183090d542311a89b9fa3a37a798fe3f06645a5');
});

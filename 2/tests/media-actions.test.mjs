import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAudioURL, downloadSize } from '../web/_player/media-actions.js';
import { isStandalone, canDownloadAudio } from '../web/_player/environment.js';
import { encodePath } from '../scripts/build.mjs';
const base='https://ipapplus.github.io/media/';
const safari={vendor:'Apple Computer, Inc.',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'};

test('audio links remain public HTTPS original encoded URLs, including Unicode, spaces, symbols and extensions',()=>{
  const id="files/شعر عربي/أغنية # & + % ? (١)/01 'مقطع'.MP3";
  const url=publicAudioURL({url:encodePath(id)},base);
  assert.equal(url,base+encodePath(id)); assert.equal(decodeURIComponent(new URL(url).pathname),'/media/'+id);
  assert.ok(!url.includes('%25D8')); assert.ok(!url.startsWith('blob:')); assert.ok(url.endsWith('.MP3'));
  assert.throws(()=>publicAudioURL({url:'blob:https://ipapplus.github.io/temporary'},base));
  assert.throws(()=>publicAudioURL({url:'http://example.com/track.mp3'},base));
});
test('decimal megabytes use manifest bytes, Arabic digits and at most two fractional digits',()=>{
  for(const [bytes,label] of [[3_500_000,'٣٫٥ م.ب'],[1_234_567,'١٫٢٣ م.ب'],[206_358,'٠٫٢١ م.ب'],[10_000,'٠٫٠١ م.ب'],[1_000_000,'١ م.ب'],[0,'٠ م.ب']]) assert.equal(downloadSize(bytes),label);
});
test('downloads are restricted to ordinary Safari; both independent standalone signals override UA',()=>{
  assert.equal(canDownloadAudio(safari,{matches:false}),true);
  assert.equal(canDownloadAudio({...safari,standalone:true},{matches:false}),false);
  assert.equal(canDownloadAudio(safari,{matches:true}),false);
  assert.equal(isStandalone({standalone:true},{matches:false}),true);
  assert.equal(isStandalone({}, {matches:true}),true);
  assert.equal(isStandalone({},null),false);
  const mac={...safari,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'};
  assert.equal(canDownloadAudio(mac,{matches:false}),true);
  assert.equal(canDownloadAudio({...mac,userAgent:mac.userAgent.replace('Macintosh; Intel Mac OS X 10_15_7','Macintosh; Intel Mac OS X 10_15'),maxTouchPoints:5},{matches:false}),true);
  for(const token of ['CriOS/140','FxiOS/140','EdgiOS/140','Edg/140','OPiOS/10','Chrome/140','Chromium/140','OPR/100','DuckDuckGo/7','GSA/100','SamsungBrowser/20','Android']) {
    assert.equal(canDownloadAudio({...safari,userAgent:safari.userAgent+' '+token},{matches:false}),false,token);
  }
  assert.equal(canDownloadAudio({vendor:'Google Inc.',userAgent:safari.userAgent},{matches:false}),false);
  assert.equal(canDownloadAudio({vendor:'Apple Computer, Inc.',userAgent:'AppleWebKit/605.1.15 Mobile/15E148'},{matches:false}),false);
});

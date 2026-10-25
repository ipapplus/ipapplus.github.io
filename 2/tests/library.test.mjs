import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scan, build, validate, encodePath, formats } from '../scripts/build.mjs';
import { FolderQueue } from '../web/_player/queue.js';
import { collectionIds, count, folderLabel, trackLabel, formatTime } from '../web/_player/library-view.js';
import { narratorForTrack } from '../web/_player/library-view.js';
const temp = async t => { const dir = await mkdtemp(path.join(os.tmpdir(),'media-test-')); t.after(() => rm(dir,{recursive:true,force:true})); return dir; };
const put = async (root,name,data='test bytes') => { await mkdir(path.dirname(path.join(root,name)),{recursive:true}); await writeFile(path.join(root,name),data); };

test('scanner preserves exact hierarchy, Unicode, URL symbols, duplicates, natural order and covers', async t => {
  const root = await temp(t);
  const names = ['files/العَرَبِيّة/Deep # & + % ?/same.mp3', 'files/العَرَبِيّة/Deep # & + % ?/02.mp3',
    'files/العَرَبِيّة/Deep # & + % ?/10.mp3', 'Other/same.mp3', "Other/a ' (test)!.M4A"];
  for (const name of names) await put(root,name);
  await put(root,'files/العَرَبِيّة/cover.jpg'); await put(root,'Other/same.png');
  await put(root,'Empty/.gitkeep'); await put(root,'node_modules/hidden.mp3'); await put(root,'.git/hidden.mp3');
  const { manifest:m } = await scan(root);
  assert.equal(m.stats.tracks,5); assert.equal(m.stats.folders,5);
  assert.deepEqual(m.tracks.map(t=>t.id).sort(),names.sort());
  for (const track of m.tracks) assert.equal(decodeURIComponent(track.url),track.id);
  const f = m.folders.find(f=>f.id.endsWith('Deep # & + % ?'));
  assert.deepEqual(f.tracks.map(id=>id.split('/').at(-1)),['02.mp3','10.mp3','same.mp3']);
  assert.equal(m.tracks.find(t=>t.id==='Other/same.mp3').artwork,'Other/same.png');
  assert.equal(m.tracks.find(t=>t.id===f.tracks[0]).artwork,encodePath('files/العَرَبِيّة/cover.jpg'));
  assert.deepEqual(m, (await scan(root)).manifest); validate(m);
  const invalid = structuredClone(m); invalid.folders[0].totalTracks++; assert.throws(()=>validate(invalid));
});
test('empty library is valid and new media is discovered without configuration', async t => {
  const root = await temp(t); assert.equal((await scan(root)).manifest.stats.tracks,0);
  for (const ext of Object.keys(formats)) await put(root,`new/song${ext}`);
  assert.equal((await scan(root)).manifest.stats.tracks,Object.keys(formats).length);
});
test('deep paths and prototype-like folder names remain valid', async t => {
  const root = await temp(t), name = `${Array.from({length:80},(_,i)=>`d${i}`).join('/')}/__proto__/constructor/عربي.mp3`;
  await put(root,name); const {manifest:m} = await scan(root);
  assert.equal(m.stats.folders,82); assert.equal(m.tracks[0].id,name); assert.equal(m.folders.find(f=>f.id==='').totalTracks,1);
});
test('unresolved LFS fails clearly, never creates a fake playable track', async t => {
  const root = await temp(t); await put(root,'pointer.mp3','version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 1000\n');
  await assert.rejects(scan(root),/Unresolved Git LFS audio/);
});
test('build copies every audio byte unchanged and excludes docs/tests from public output', async t => {
  const root = await temp(t); await cp(new URL('../web',import.meta.url),path.join(root,'web'),{recursive:true});
  const name = 'a/أسماء # + %/same.mp3', bytes = Buffer.from([1,2,3,4,255]); await put(root,name,bytes);
  await put(root,'MEDIA_PLAYER_REPORT.md','not public');
  const m = await build(root);
  assert.deepEqual(await readFile(path.join(root,'dist',name)),bytes);
  assert.equal(m.stats.tracks,1);
  await assert.rejects(readFile(path.join(root,'dist/MEDIA_PLAYER_REPORT.md')));
  await assert.rejects(readFile(path.join(root,'dist/_player/search-worker.js')));
  assert.ok(!(await readFile(path.join(root,'dist/sw.js'),'utf8')).includes('search-worker'));
  const first = await readFile(path.join(root,'dist/_player/library.json'),'utf8');
  await build(root); assert.equal(await readFile(path.join(root,'dist/_player/library.json'),'utf8'),first);
  assert.ok(!(await readFile(path.join(root,'dist/sw.js'),'utf8')).includes('__BUILD__'));
});
test('sequential playback stops at folder boundary; repeat track and folder behave independently', () => {
  const q = new FolderQueue(); q.set(['a','b','c'],'b');
  assert.equal(q.previous(),'a'); assert.equal(q.next(),'b'); assert.equal(q.next(true),'c'); assert.equal(q.next(true),null);
  q.repeat='folder'; assert.equal(q.next(true),'a'); assert.equal(q.previous(),'c');
  q.repeat='track'; assert.equal(q.next(true),'c'); assert.equal(q.next(false),null);
});
test('shuffle visits every folder track exactly once, previous follows order, repeat avoids immediate duplicate', () => {
  const q = new FolderQueue(()=>0.4); q.shuffle=true; q.set(['a','b','c','d'],'b');
  const seen = [q.current]; let next; while ((next=q.next(true))) seen.push(next);
  assert.equal(new Set(seen).size,4); assert.equal(seen.length,4); assert.equal(q.previous(),seen[2]);
  q.next(); const last=q.current; q.repeat='folder'; assert.notEqual(q.next(true),last);
  q.setShuffle(false); assert.equal(q.current, q.order[q.index]);
  const single = new FolderQueue(); single.shuffle=true; single.repeat='folder'; single.set(['only'],'only'); assert.equal(single.next(true),'only');
});
test('homepage discovers all collections through structural grouping and accepts new files folders', async t => {
  const root=await temp(t);
  for(let i=1;i<=14;i++) await put(root,`files/راوي/مجموعة ${i}/01.mp3`);
  let m=(await scan(root)).manifest, folders=new Map(m.folders.map(f=>[f.id,f]));
  assert.equal(collectionIds(folders).length,14);
  for(const id of collectionIds(folders)) assert.equal(folders.get(id).parent,'files/راوي');
  await put(root,'files/مجموعة جديدة/01.mp3');
  await put(root,'files/راوي/مجموعة 1/متفرع/02.mp3');
  m=(await scan(root)).manifest;folders=new Map(m.folders.map(f=>[f.id,f]));
  assert.equal(collectionIds(folders).length,15);
  assert.ok(collectionIds(folders).includes('files/مجموعة جديدة'));
  assert.ok(collectionIds(folders).includes('files/راوي/مجموعة 1'));
  assert.ok(!collectionIds(folders).includes('files/راوي/مجموعة 1/متفرع'));
});
test('empty and alternate repository layouts have no invented collections', async t => {
  const root=await temp(t);
  let folders=new Map((await scan(root)).manifest.folders.map(f=>[f.id,f]));
  assert.deepEqual(collectionIds(folders),[]);
  await put(root,'مجموعة/01.mp3');
  folders=new Map((await scan(root)).manifest.folders.map(f=>[f.id,f]));
  assert.deepEqual(collectionIds(folders),['مجموعة']);
});
test('Arabic presentation covers plurals, numeric titles, times and structural folder labels',()=>{
  assert.equal(count(0,'track'),'لا مقاطع'); assert.equal(count(1,'track'),'مقطع واحد');
  assert.equal(count(2,'track'),'مقطعان'); assert.equal(count(3,'track'),'٣ مقاطع');
  assert.equal(count(14,'folder'),'١٤ مجلدًا'); assert.equal(count(413,'track'),'٤١٣ مقطعًا');
  assert.equal(trackLabel({title:'01'}),'المقطع ٠١');
  assert.equal(trackLabel({title:'قصيدة عربية'}),'قصيدة عربية');
  assert.equal(formatTime(75),'١:١٥'); assert.equal(formatTime(3605),'١:٠٠:٠٥');
  assert.equal(folderLabel('files',new Map()),'المكتبة');
  assert.equal(folderLabel('',new Map()),'ديوان العرب');
});

test('narrator attribution follows the nearest explicit ancestor, never unrelated recordings', () => {
  const folders = new Map([
    ['', {name:'Media',parent:null}],
    ['files', {name:'files',parent:''}],
    ['reader', {name:'مقاطع صوتية بصوت عبدالرحمن الحميِّن',parent:'files'}],
    ['deep', {name:'المعلقات',parent:'reader'}],
    ['nested', {name:'متفرع',parent:'deep'}],
    ['other', {name:'مقاطع صوتية بصوت راوٍ آخر',parent:'deep'}],
    ['unrelated', {name:'تسجيلات مستقلة',parent:'files'}],
  ]);
  assert.equal(narratorForTrack({folder:'nested'}, folders),'عبدالرحمن الحميّن');
  assert.equal(narratorForTrack({folder:'other'}, folders),'راو آخر');
  assert.equal(narratorForTrack({folder:'unrelated'}, folders),'');
  assert.equal(narratorForTrack({folder:'missing'}, folders),'');
});
test('narrator surname retains ya shadda across Unicode spellings without changing source metadata', () => {
  const expected='الشيخ الدكتور عبدالرحمن الحميّن';
  for (const surname of ['الحمين','الحميّن','الحميِّن','الحميِّن']) {
    const name=`مقاطع صوتية بصوت الشيخ الدكتور عبدالرحمن ${surname}`;
    const folder={name,parent:null},folders=new Map([['reader',folder]]);
    const actual=narratorForTrack({folder:'reader'},folders);
    assert.equal(actual,expected);
    assert.equal(actual,actual.normalize('NFC'));
    assert.ok(actual.includes('ي\u0651ن'));
    assert.equal(folder.name,name);
  }
});
test('independent global shuffle visits all nested library tracks without repeats, preserving folder preferences', () => {
  const ids = ['files/أ/01.mp3','files/ب/02.mp3','files/ب/متفرع/03.mp3','مستقل/04.mp3'];
  const folder = new FolderQueue(), global = new FolderQueue(() => 0.25);
  folder.repeat='track'; folder.set(ids.slice(0,1),ids[0]);
  global.shuffle=true; global.set(ids,ids[2]);
  const seen = [global.current]; let next;
  while ((next=global.next(true))) seen.push(next);
  assert.deepEqual(new Set(seen),new Set(ids)); assert.equal(seen.length,ids.length);
  assert.equal(folder.current,ids[0]); assert.equal(folder.repeat,'track'); assert.equal(folder.shuffle,false);
  global.repeat='folder'; assert.notEqual(global.next(true),seen.at(-1));
});

test('shuffle toggles keep the selected track and repeat mode, and disabling restores folder order',()=>{
  const q=new FolderQueue(()=>.25),ids=['a','b','c','d'];q.set(ids,'b');q.repeat='track';
  q.setShuffle(true);assert.equal(q.current,'b');assert.equal(q.repeat,'track');assert.equal(q.next(true),'b');
  const next=q.next();assert.notEqual(next,'b');assert.equal(q.previous(),'b');assert.equal(q.next(),next);
  q.setShuffle(false);assert.equal(q.current,next);assert.equal(q.repeat,'track');assert.deepEqual(q.order,ids);
  q.repeat='folder';assert.equal(q.next(),ids[(ids.indexOf(next)+1)%ids.length]);
});
test('shuffle repeat cycles contain each track once and never repeat the boundary track',()=>{
  for(const seed of [0,.25,.5,.999]){
    const q=new FolderQueue(()=>seed),ids=['a','b','c','d'];q.shuffle=true;q.repeat='folder';q.set(ids,'c');
    let last;
    for(let cycle=0;cycle<12;cycle++){
      const seen=[];for(let i=0;i<ids.length;i++){const id=q.current;assert.notEqual(id,last);seen.push(id);last=id;q.next(true);}
      assert.deepEqual(new Set(seen),new Set(ids));
    }
  }
  const single=new FolderQueue();single.set(['only'],'only');single.setShuffle(true);
  assert.equal(single.next(true),null);assert.equal(single.previous(),'only');
  single.repeat='track';assert.equal(single.next(true),'only');assert.equal(single.next(),null);
  single.repeat='folder';assert.equal(single.next(true),'only');assert.equal(single.previous(),'only');
});

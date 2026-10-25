import { open, readdir, stat, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const formats = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.oga': 'audio/ogg',
  '.opus': 'audio/ogg; codecs="opus"', '.flac': 'audio/flac',
  '.aif': 'audio/aiff', '.aiff': 'audio/aiff', '.weba': 'audio/webm',
};
const images = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const excluded = new Set(['node_modules', 'dist', 'web', 'scripts', 'tests', 'coverage',
  'test-results', 'playwright-report', '__pycache__', 'vendor']);
const BITRATE = {
  1: { 1: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0], 2: [0,32,48,56,64,80,96,112,128,160,192,224,256,320,384,0], 3: [0,32,64,96,128,160,192,224,256,288,320,352,384,416,448,0] },
  2: { 1: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0], 2: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0], 3: [0,32,48,56,64,80,96,112,128,144,160,176,192,224,256,0] },
};
const SAMPLE_RATE = { 3: [44100,48000,32000], 2: [22050,24000,16000], 0: [11025,12000,8000] };

// Catalog paths stay unchanged. Duration is optional display metadata from the MPEG header.
export async function mp3Seconds(file, size) {
  if (!size || size < 128) return null;
  const fh = await open(file, 'r');
  try {
    const length = Math.min(size, 131072);
    const head = Buffer.alloc(length);
    const { bytesRead } = await fh.read(head, 0, length, 0);
    const buffer = head.subarray(0, bytesRead);
    let offset = 0;
    if (buffer.length >= 10 && buffer.toString('latin1', 0, 3) === 'ID3') {
      const tagSize = ((buffer[6] & 127) << 21) | ((buffer[7] & 127) << 14) | ((buffer[8] & 127) << 7) | (buffer[9] & 127);
      offset = 10 + tagSize + ((buffer[5] & 16) ? 10 : 0);
    }
    let frame = buffer;
    let origin = offset;
    if (offset + 4 > buffer.length && offset + 4 < size) {
      const extra = Buffer.alloc(8192);
      const read = await fh.read(extra, 0, extra.length, offset);
      frame = extra.subarray(0, read.bytesRead);
      origin = 0;
    }
    const audioBytes = Math.max(0, size - offset - (await taggedFooter(fh, size) ? 128 : 0));
    const end = Math.min(frame.length - 4, origin + 65536);
    for (let i = Math.max(0, origin); i < end; i++) {
      if (frame[i] !== 0xff || (frame[i + 1] & 0xe0) !== 0xe0) continue;
      const versionBits = (frame[i + 1] >> 3) & 3;
      const layer = (frame[i + 1] >> 1) & 3;
      const bitrateIndex = (frame[i + 2] >> 4) & 15;
      const sampleIndex = (frame[i + 2] >> 2) & 3;
      if (versionBits === 1 || layer === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) continue;
      const generation = versionBits === 3 ? 1 : 2;
      const bitrate = BITRATE[generation][layer][bitrateIndex] * 1000;
      const sampleRate = SAMPLE_RATE[versionBits]?.[sampleIndex];
      if (!bitrate || !sampleRate) continue;
      const samples = layer === 3 ? 384 : layer === 2 ? 1152 : (versionBits === 3 ? 1152 : 576);
      const probe = frame.subarray(i, Math.min(frame.length, i + 180));
      let marker = probe.indexOf('Xing');
      if (marker < 0) marker = probe.indexOf('Info');
      if (marker >= 0 && marker + 12 <= probe.length && (probe.readUInt32BE(marker + 4) & 1)) {
        const frames = probe.readUInt32BE(marker + 8);
        if (frames > 0 && frames < 20_000_000) return Math.max(1, Math.round(frames * samples / sampleRate));
      }
      return Math.max(1, Math.round(audioBytes * 8 / bitrate));
    }
    return null;
  } catch { return null; }
  finally { await fh.close(); }
}
async function taggedFooter(fh, size) {
  if (size < 128) return false;
  const tail = Buffer.alloc(3);
  await fh.read(tail, 0, 3, size - 128);
  return tail.toString('latin1') === 'TAG';
}
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const compare = (a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
export const encodePath = value => value.split('/').map(part =>
  encodeURIComponent(part).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');

// Iterative traversal keeps directory depth independent of the JS call stack.
export async function scan(root) {
  const folders = [], tracks = [], artwork = [];
  const pending = [{ id: '', name: 'Media', parent: null }];
  while (pending.length) {
    const folder = { ...pending.pop(), children: [], tracks: [], artwork: null, totalTracks: 0 };
    const entries = (await readdir(path.join(root, folder.id), { withFileTypes: true }))
      .sort((a, b) => compare(a.name, b.name));
    const localImages = entries.filter(e => e.isFile() && images.has(path.extname(e.name).toLowerCase()));
    const cover = localImages.find(e => /^(cover|folder|front|artwork)\./i.test(e.name)) ||
      (localImages.length === 1 ? localImages[0] : null);
    if (cover) folder.artwork = encodePath([folder.id, cover.name].filter(Boolean).join('/'));
    for (const entry of entries) {
      const id = [folder.id, entry.name].filter(Boolean).join('/');
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not supported: ${id}`);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || excluded.has(entry.name)) continue;
        folder.children.push(id);
        pending.push({ id, name: entry.name, parent: folder.id });
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (images.has(ext)) artwork.push(id);
      if (!formats[ext]) continue;
      const fullPath = path.join(root, id);
      const info = await stat(fullPath);
      // Never deploy a Git LFS pointer as if it were playable audio.
      if (info.size < 1024 && (await readFile(fullPath, 'utf8')).startsWith('version https://git-lfs.github.com/spec/')) {
        throw new Error(`Unresolved Git LFS audio: ${id}. Fetch LFS objects before building.`);
      }
      const stem = entry.name.slice(0, -path.extname(entry.name).length);
      const sidecar = localImages.find(e => e.name.slice(0, -path.extname(e.name).length) === stem);
      const track = { id, name: entry.name, title: stem, folder: folder.id,
        url: encodePath(id), format: ext.slice(1).toUpperCase(), mime: formats[ext],
        bytes: info.size, artwork: sidecar ? encodePath([folder.id, sidecar.name].filter(Boolean).join('/')) : null };
      if (ext === '.mp3') {
        const seconds = await mp3Seconds(fullPath, info.size);
        if (seconds) track.seconds = seconds;
      }
      tracks.push(track);
      folder.tracks.push(id);
    }
    folders.push(folder);
  }
  const byId = new Map(folders.map(f => [f.id, f]));
  for (const f of [...folders].reverse()) {
    f.totalTracks += f.tracks.length;
    if (f.parent !== null) byId.get(f.parent).totalTracks += f.totalTracks;
  }
  // Inherit the nearest actual cover, without inventing artist/album metadata.
  for (const f of folders) if (!f.artwork && f.parent !== null) f.artwork = byId.get(f.parent).artwork;
  for (const t of tracks) t.artwork ||= byId.get(t.folder).artwork;
  folders.sort((a, b) => compare(a.id, b.id));
  tracks.sort((a, b) => compare(a.id, b.id));
  const manifest = { version: 1, root: '', stats: { tracks: tracks.length, folders: folders.length - 1,
    audioBytes: tracks.reduce((sum, t) => sum + t.bytes, 0),
    formats: [...new Set(tracks.map(t => t.format))].sort(), artwork: artwork.length }, folders, tracks };
  validate(manifest);
  return { manifest, artwork };
}

export function validate(m) {
  const folders = new Map(m.folders.map(f => [f.id, f]));
  const tracks = new Map(m.tracks.map(t => [t.id, t]));
  if (!folders.has('') || folders.size !== m.folders.length || tracks.size !== m.tracks.length) throw new Error('Duplicate or missing manifest IDs');
  for (const f of m.folders) {
    if (f.parent !== null && (!folders.has(f.parent) || !folders.get(f.parent).children.includes(f.id))) throw new Error(`Invalid parent: ${f.id}`);
    for (const id of f.children) if (folders.get(id)?.parent !== f.id) throw new Error(`Invalid child: ${id}`);
    for (const id of f.tracks) if (tracks.get(id)?.folder !== f.id) throw new Error(`Invalid track reference: ${id}`);
    const count = f.tracks.length + f.children.reduce((sum, id) => sum + folders.get(id).totalTracks, 0);
    if (count !== f.totalTracks) throw new Error(`Invalid folder count: ${f.id}`);
  }
  for (const t of m.tracks) {
    if (!folders.get(t.folder)?.tracks.includes(t.id) || decodeURIComponent(t.url) !== t.id) throw new Error(`Invalid track: ${t.id}`);
  }
  if (folders.get('').totalTracks !== m.stats.tracks) throw new Error('Incorrect library total');
}

export async function buildFingerprint(root, json) {
  const fingerprint = createHash('sha256').update(json);
  async function hashFiles(dir) {
    for (const e of (await readdir(dir, { withFileTypes: true })).sort((a,b) => compare(a.name,b.name))) {
      if (e.isDirectory()) await hashFiles(path.join(dir, e.name));
      else fingerprint.update(await readFile(path.join(dir, e.name)));
    }
  }
  await hashFiles(path.join(root, 'web'));
  return fingerprint.digest('hex').slice(0,20);
}

export async function build(root, output = path.join(root, 'dist')) {
  if (path.resolve(output) !== path.join(path.resolve(root), 'dist')) throw new Error('Build output must be repository/dist');
  const { manifest, artwork } = await scan(root);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, 'web'), output, { recursive: true });
  for (const relative of [...manifest.tracks.map(t => t.id), ...artwork]) {
    const destination = path.join(output, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, relative), destination, { errorOnExist: true, force: false });
  }
  const json = JSON.stringify(manifest);
  await writeFile(path.join(output, '_player/library.json'), json + '\n');
  await writeFile(path.join(output, '.nojekyll'), '');
  const sw = await readFile(path.join(output, 'sw.js'), 'utf8');
  await writeFile(path.join(output, 'sw.js'), sw.replace('__BUILD__', await buildFingerprint(root,json)));
  let bytes = 0;
  const dirs = [output];
  while (dirs.length) for (const e of await readdir(dirs.pop(), { withFileTypes: true })) {
    const full = path.join(e.parentPath || e.path, e.name);
    if (e.isDirectory()) dirs.push(full); else bytes += (await stat(full)).size;
  }
  // Fail visibly instead of omitting media when approaching the Pages 1 GB limit.
  if (bytes > 1_000_000_000) throw new Error(`Site is ${bytes} bytes, above the GitHub Pages 1 GB limit. See README external hosting guidance. No audio was omitted.`);
  console.log(JSON.stringify({ ...manifest.stats, siteBytes: bytes, output }, null, 2));
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root=fileURLToPath(new URL('../', import.meta.url));
  // CLI production builds must include every tracked recording, even in a sparse checkout.
  const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(file=>formats[path.extname(file).toLowerCase()]);
  for(const file of tracked) {
    try { await stat(path.join(root,file)); }
    catch { throw Error('Production build requires the excluded audio library. Keep sparse checkout enabled; use a temporary fixture for local tests. Missing: '+file); }
  }
  if(!tracked.length)throw Error('Refusing a production build without tracked recordings');
  await build(root);
}

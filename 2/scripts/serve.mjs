import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formats, scan } from './build.mjs';

const repo = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const distRoot = path.join(repo, 'dist');
const webRoot = path.join(repo, 'web');
const filesRoot = path.join(repo, 'files');
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json',
  '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', ...formats };

let catalogPromise;
function catalog() {
  catalogPromise ??= scan(repo)
    .then(({ manifest }) => Buffer.from(`${JSON.stringify(manifest)}\n`))
    .catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
function inside(root, target) {
  const resolved = path.resolve(target);
  return resolved === root || resolved.startsWith(root + path.sep);
}
async function builtCatalog() {
  try { return (await stat(path.join(distRoot, '_player', 'library.json'))).isFile(); }
  catch { return false; }
}
// Built output keeps the deployment layout. Before that catalog exists, the same
// /media/ URLs come from web/, files/, and the scanner the build uses.
async function locate(pathname) {
  if (await builtCatalog()) {
    const target = path.resolve(distRoot, '.' + pathname.slice('/media'.length));
    if (!inside(distRoot, target)) return { status: 403 };
    return { file: target };
  }
  const relative = pathname.slice('/media/'.length);
  if (relative === '_player/library.json') return { data: await catalog(), ext: '.json' };
  const fromFiles = relative === 'files' || relative.startsWith('files/');
  const root = fromFiles ? filesRoot : webRoot;
  const target = path.resolve(root, fromFiles ? relative.slice('files/'.length) : relative);
  if (!inside(root, target)) return { status: 403 };
  return { file: target };
}
function send(res, req, data, ext) {
  const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache' };
  const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (match) {
    const start = Number(match[1]), end = Math.min(Number(match[2] || data.length - 1), data.length - 1);
    if (start > end) { res.writeHead(416, { 'Content-Range':`bytes */${data.length}` }).end(); return; }
    res.writeHead(206, { ...headers, 'Content-Range':`bytes ${start}-${end}/${data.length}`, 'Content-Length':end - start + 1 });
    res.end(req.method === 'HEAD' ? undefined : data.subarray(start, end + 1));
  } else {
    res.writeHead(200, { ...headers, 'Content-Length':data.length });
    res.end(req.method === 'HEAD' ? undefined : data);
  }
}
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/media/')) { res.writeHead(404).end(); return; }
    const located = await locate(pathname);
    if (located.status) { res.writeHead(located.status).end(); return; }
    let { data, ext, file } = located;
    if (!data) {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      data = await readFile(file);
      ext = path.extname(file);
    }
    send(res, req, data, ext);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173/media/'));

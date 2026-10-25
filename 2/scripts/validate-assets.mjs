import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import {buildFingerprint} from './build.mjs';

export const generated = new Set(['_player/library.json','.nojekyll']);
const literal = node => node?.type === 'Literal' && typeof node.value === 'string' ? node.value :
  node?.type === 'TemplateLiteral' && !node.expressions.length ? node.quasis[0].value.cooked : null;
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child,visit));
    else if (value && typeof value === 'object') walk(value,visit);
  }
}
export function references(text, file) {
  const refs = [];
  if (/\.(?:m?js)$/.test(file)) {
    const ast = parse(text,{ecmaVersion:'latest',sourceType:'module'});
    walk(ast,node => {
      if (['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type) && node.source) refs.push(literal(node.source));
      if (node.type === 'ImportExpression') {
        const value=literal(node.source);
        if (!value) throw Error(`${file}: computed import must be explicitly validated`);
        refs.push(value);
      }
      if (node.type === 'CallExpression' && node.callee.name === 'importScripts') {
        for (const arg of node.arguments) {
          const value=literal(arg);if(!value)throw Error(`${file}: computed importScripts`);refs.push(value);
        }
      }
      // The worker's complete pre-cache is an array of literal asset paths.
      if (node.type === 'VariableDeclarator' && node.id.name === 'SHELL') {
        const array = node.init?.type === 'ArrayExpression' ? node.init : node.init?.callee?.object;
        if (array?.type !== 'ArrayExpression') throw Error(`${file}: unsupported pre-cache declaration`);
        for (const item of array.elements) {
          const value=literal(item);if(value===null)throw Error(`${file}: computed pre-cache asset`);refs.push(value);
        }
      }
      if (node.type === 'NewExpression' && node.callee.name === 'URL') {
        const value=literal(node.arguments[0]);
        const base=node.arguments[1];
        if (value && base?.type==='MemberExpression' && base.object?.type==='MetaProperty') refs.push(value);
      }
    });
  } else if (/\.html$/.test(file)) {
    for(const script of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if(!/\bsrc=|application\/(?:ld\+)?json/i.test(script[1]) && script[2].trim()) refs.push(...references(script[2],`${file}.js`));
    }
    for(const style of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) refs.push(...references(style[1],`${file}.css`));
    for (const match of text.matchAll(/<(script|link|img|source)\b[^>]*>/gi)) {
      const tag=match[0];
      if (match[1].toLowerCase()==='link' && /rel=["']canonical["']/i.test(tag)) continue;
      for (const attr of tag.matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/gi)) refs.push(attr[1]);
      for (const attr of tag.matchAll(/\bsrcset=["']([^"']+)["']/gi)) refs.push(...attr[1].split(',').map(x=>x.trim().split(/\s/)[0]));
    }
  } else if (/\.css$/.test(file)) {
    for (const m of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)) refs.push(m[1]||m[2]);
  } else if (/\.webmanifest$/.test(file)) {
    const manifest=JSON.parse(text);for (const image of [...(manifest.icons||[]),...(manifest.screenshots||[])]) refs.push(image.src);
    refs.push(manifest.start_url);
  }
  return refs.filter(Boolean);
}
async function files(dir, prefix='') {
  const result=[];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const relative=path.posix.join(prefix,entry.name);
    if(entry.isDirectory())result.push(...await files(path.join(dir,entry.name),relative));
    else result.push(relative);
  }
  return result;
}
export async function validateAssets({root, built=false, tracked=true, index=false}={}) {
  root ||= fileURLToPath(new URL('../',import.meta.url));
  const web=path.join(root,built?'dist':'web');
  const list=await files(web);
  const gitFiles=tracked ? new Set(execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0')) : null;
  const failures=[];
  for(const file of list) {
    if(gitFiles && !generated.has(file) && !gitFiles.has(`web/${file}`) && !(built && gitFiles.has(file))) failures.push(`Untracked deployed source: web/${file}`);
    if(index && !generated.has(file)) {
      try {
        const staged=execFileSync('git',['show',`:web/${file}`],{cwd:root,maxBuffer:20_000_000});
        if(!staged.equals(await readFile(path.join(web,file)))) failures.push(`Unstaged deployed content: web/${file}`);
      } catch { failures.push(`Missing index entry: web/${file}`); }
    }
    if(!/\.(?:js|mjs|html|css|webmanifest)$/.test(file))continue;
    for(const ref of references(await readFile(path.join(web,file),'utf8'),file)) {
      if(/^(?:https?:|data:|blob:|mailto:|#)/.test(ref))continue;
      if(/\.m?js$/.test(file) && !ref.startsWith('.') && !ref.includes('/') && !/\.[a-z]+$/i.test(ref))throw Error(`${file}: unresolved bare module ${ref}`);
      const resolved=decodeURIComponent(ref.split(/[?#]/)[0]);
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),resolved)).replace(/\/$/,'');
      const asset=target==='.' ? 'index.html' : target;
      if(asset.startsWith('../')||asset.startsWith('/'))failures.push(`${file}: asset escapes site: ${ref}`);
      else if(!built && generated.has(asset))continue;
      else {
        try { if(!(await stat(path.join(web,asset))).isFile())throw Error(); }
        catch { failures.push(`${file}: missing ${asset}`); }
        if(gitFiles && !generated.has(asset) && !gitFiles.has(`web/${asset}`))failures.push(`${file}: dependency absent from Git: web/${asset}`);
      }
    }
  }
  // This runtime fetch uses an application URL helper rather than a literal URL base.
  if(built) {
    const library=JSON.parse(await readFile(path.join(web,'_player/library.json'),'utf8'));
    if(!library.stats.tracks) failures.push('Refusing an empty production audio library');
    if(gitFiles) {
      const recordings=[...gitFiles].filter(file=>/\.(?:mp3|m4a|aac|wav|ogg|oga|opus|flac|aif|aiff|weba)$/i.test(file));
      if(recordings.length!==library.tracks.length || recordings.some(file=>!library.tracks.some(track=>track.id===file))) failures.push('Built library does not match the complete tracked audio collection');
    }
    for(const track of library.tracks) {
      try { if((await stat(path.join(web,track.id))).size!==track.bytes)throw Error(); }
      catch { failures.push(`Missing or incomplete built audio: ${track.id}`); }
    }
    const expectedWorker=(await readFile(path.join(root,'web/sw.js'),'utf8')).replace('__BUILD__',await buildFingerprint(root,JSON.stringify(library)));
    if((await readFile(path.join(web,'sw.js'),'utf8'))!==expectedWorker)failures.push('Service worker content or generated fingerprint differs from this build');
    for(const asset of list.filter(x=>!generated.has(x)&&x!=='sw.js'&&(!gitFiles||gitFiles.has(`web/${x}`)))) {
      if(!(await readFile(path.join(web,asset))).equals(await readFile(path.join(root,'web',asset))))failures.push(`Built asset differs from source: ${asset}`);
    }
  }
  if(failures.length)throw Error(failures.join('\n'));
  console.log(`Validated ${list.length} ${built?'built':'source'} assets${tracked?' against Git':''}.`);
  return list;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  await validateAssets({built:process.argv.includes('--built'),index:process.argv.includes('--index')});
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,cp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {references,validateAssets} from '../scripts/validate-assets.mjs';
test('parser covers import/export, local dynamic imports, worker dependencies and cache entries',()=>{
  assert.deepEqual(references(`import x from './a.js';export {x} from './b.js';import('./c.js');import(\`./d.js\`);importScripts('./worker.js');const SHELL=['./','cache.css'].map(p=>p);`,'sw.js'),['./a.js','./b.js','./c.js','./d.js','./worker.js','./','cache.css']);
  assert.throws(()=>references('import(variable)','app.js'),/computed import/);
  assert.throws(()=>references("const SHELL=['a',variable].map(p=>p)",'sw.js'),/computed pre-cache/);
  assert.deepEqual(references(`<script src="app.js"></script><link rel="stylesheet" href="site.css"><img src="art.jpg">`,'index.html'),['app.js','site.css','art.jpg']);
  assert.deepEqual(references(`@import 'other.css';p{background:url('./art.webp')}`,'site.css'),['other.css','./art.webp']);
});
test('missing and untracked modules fail deployment, including the original volume.js failure',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'diwan-assets-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'web'));await writeFile(path.join(root,'web/index.html'),'<script type="module" src="app.js"></script>');
  await writeFile(path.join(root,'web/app.js'),"import './volume.js';");
  execFileSync('git',['init','-q'],{cwd:root});execFileSync('git',['add','web'],{cwd:root});
  await assert.rejects(validateAssets({root}),/missing volume.js/);
  await writeFile(path.join(root,'web/volume.js'),'export const volume=2;');
  await assert.rejects(validateAssets({root}),/Untracked deployed source/);
  execFileSync('git',['add','web/volume.js'],{cwd:root});await validateAssets({root,index:true});
  await writeFile(path.join(root,'web/volume.js'),'export const volume=1;');
  await assert.rejects(validateAssets({root,index:true}),/Unstaged deployed content/);
  await writeFile(path.join(root,'web/sw.js'),"importScripts('./missing-worker.js');const SHELL=['missing.css'];");
  await assert.rejects(validateAssets({root}),/missing missing-worker.js[\s\S]*missing missing.css/);
});
test('generated precache assets are allowed in source but required in the deployment artifact',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'diwan-generated-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'web'));await writeFile(path.join(root,'web/sw.js'),"const SHELL=['_player/library.json'];");
  await validateAssets({root,tracked:false});await cp(path.join(root,'web'),path.join(root,'dist'),{recursive:true});
  await assert.rejects(validateAssets({root,built:true,tracked:false}));
});

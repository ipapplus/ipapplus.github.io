import test from 'node:test';
import assert from 'node:assert/strict';
import {createVolumeController,normalizeLevel,volumeCurve,MAX_GAIN} from '../web/_player/volume.js';
class Param {
  constructor(){this.value=1;this.ramps=[];}
  cancelAndHoldAtTime(){} cancelScheduledValues(){} setValueAtTime(v){this.value=v;}
  linearRampToValueAtTime(v,time){this.value=v;this.ramps.push([v,time]);}
}
class Node {
  constructor(){this.gain=new Param();this.outputs=[];}
  connect(node){this.outputs.push(node);} disconnect(){this.outputs=[];}
}
class Media extends EventTarget {
  constructor(){super();this.volume=1;this.muted=false;this.paused=true;this.currentTime=17;this.playbackRate=1.25;this.src='original.mp3';}
  getAttribute(name){return name==='src'?this.src:null;} removeAttribute(){this.src='';} cloneNode(){return new Media();}
  replaceWith(next){this.replacement=next;} pause(){this.paused=true;} load(){} play(){this.paused=false;return Promise.resolve();}
}
class Context extends EventTarget {
  static created=[];
  constructor(){super();Context.created.push(this);this.state='suspended';this.currentTime=0;this.destination=new Node();this.sources=[];}
  createGain(){return new Node();} createWaveShaper(){return new Node();}
  createMediaElementSource(media){const node=new Node();this.sources.push([media,node]);return node;}
  async resume(){this.state='running';} async close(){this.state='closed';this.dispatchEvent(new Event('statechange'));}
}
const make=(options={})=>createVolumeController(new Media(),{Context,...options});
test('default unity, bounded mapping, invalid preferences and cached ownership do not start audio',()=>{
  const media=new Media(),v=createVolumeController(media,{Context});
  assert.equal(v.level,1);assert.equal(v.sliderValue,1);assert.equal(v.sliderMaximum,MAX_GAIN);assert.equal(media.paused,true);
  assert.equal(createVolumeController(media),v);assert.equal(v.context,undefined);
  for(const [input,expected] of [[-1,0],[0,0],[1,1],[2,2],[4,2],[NaN,1],['2',1],[null,1]])assert.equal(normalizeLevel(input),expected);
  assert.equal(make({saved:null}).level,1);
});
test('one media source and one output path retain gain across track changes',async()=>{
  const v=make();v.setLevel(2);const a=v.prepare(),b=v.prepare();assert.equal(a,b);assert.equal(await a,true);
  assert.equal(v.mode,'processed');assert.equal(v.gain.gain.value,2);assert.equal(v.audio.volume,1);
  assert.equal(v.context.sources.length,1);assert.equal(v.source.outputs.length,1);
  assert.deepEqual(v.source.outputs,[v.gain]);assert.deepEqual(v.gain.outputs,[v.headroom]);assert.deepEqual(v.headroom.outputs,[v.shaper]);assert.deepEqual(v.shaper.outputs,[v.context.destination]);
  v.audio.src='another.mp3';await v.prepare();assert.equal(v.context.sources.length,1);assert.equal(v.gain.gain.value,2);
  v.setLevel(0);assert.equal(v.gain.gain.value,0);v.setLevel(1);assert.equal(v.gain.gain.value,1);
});
test('mute/unmute restores the selected level, including a zero slider and saved restart',async()=>{
  const v=make();v.setLevel(1.6);await v.prepare();v.toggleMute();assert.equal(v.effectiveLevel,0);assert.equal(v.level,1.6);assert.equal(v.gain.gain.value,0);
  const restored=make({saved:JSON.parse(JSON.stringify(v.preference))});assert.equal(restored.muted,true);assert.equal(restored.audio.muted,true);
  restored.toggleMute();assert.equal(restored.level,1.6);assert.equal(restored.audio.paused,true);
  v.toggleMute();assert.equal(v.gain.gain.value,1.6);v.setLevel(0);v.toggleMute();assert.equal(v.level,1.6);
});
test('native fallback handles unsupported APIs and constructor/resume/node failures while restoring native playback',async()=>{
  class Broken extends Context {constructor(){throw Error('not available');}}
  class Denied extends Context {resume(){return Promise.reject(Error('denied'));}}
  class NodesFail extends Context {createGain(){throw Error('unavailable');}}
  for(const Constructor of [null,Broken,Denied,NodesFail]){
    const audio=new Media(),v=createVolumeController(audio,{Context:Constructor});v.setLevel(0.4);assert.equal(await v.prepare(),false);
    assert.equal(v.mode,'fallback');assert.equal(v.audio.volume,0.4);assert.equal(v.audio.paused,true);
    v.setLevel(2);assert.equal(v.audio.volume,1);assert.equal(v.sliderMaximum,1);
    v.toggleMute();assert.equal(v.audio.muted,true);v.toggleMute();assert.equal(v.audio.muted,false);
  }
});
test('resume timeout restores native output and late completion never reconnects a source',async()=>{
  let finish;
  class Hanging extends Context {resume(){return new Promise(resolve=>{finish=()=>{this.state='running';resolve();};});}}
  const v=make({Context:Hanging,resumeTimeout:10});assert.equal(await v.prepare(),false);assert.equal(v.context.sources.length,1);
  finish();await Promise.resolve();assert.equal(v.context.sources.length,1);assert.equal(v.mode,'fallback');
});
test('context suspension recovers without another source; closed or irrecoverable contexts replace routed media',async()=>{
  let replacement;
  const v=make({onReplace:(next,previous)=>{replacement=[next,previous];}});v.setLevel(1.5);await v.prepare();
  v.audio.paused=false;v.context.state='suspended';v.recover();await v.pending;
  assert.equal(v.mode,'processed');assert.equal(v.context.sources.length,1);
  const original=v.audio;await v.context.close();
  assert.equal(v.mode,'fallback');assert.notEqual(v.audio,original);assert.deepEqual(replacement,[v.audio,original]);
  assert.equal(v.audio.src,'original.mp3');assert.equal(v.audio.playbackRate,1.25);assert.equal(v.audio.paused,false);assert.equal(original.paused,true);
  v.audio.duration=100;v.audio.dispatchEvent(new Event('loadedmetadata'));assert.equal(v.audio.currentTime,17);
  assert.equal(v.source.outputs.length,0);assert.equal(v.shaper.outputs.length,0);
});
test('failed connection after source attachment recovers native output even while paused',async()=>{
  class ConnectFail extends Context {createMediaElementSource(media){const node=super.createMediaElementSource(media);node.connect=()=>{throw Error('failed');};return node;}}
  const v=make({Context:ConnectFail}),original=v.audio;assert.equal(await v.prepare(),false);assert.notEqual(v.audio,original);assert.equal(v.audio.paused,true);
});
test('foreground events never initialize processing or resume paused playback',async()=>{
  const v=make();v.recover();assert.equal(v.context,undefined);await v.prepare();v.context.state='suspended';v.recover();assert.equal(v.context.state,'suspended');assert.equal(v.audio.paused,true);
});
test('normal curve is transparent; raised levels have bounded, continuous peaks and retain quiet speech',()=>{
  const normal=volumeCurve(false),limited=volumeCurve(true);
  for(let i=0;i<normal.length;i++){
    const sample=2*(i/(normal.length-1)*2-1);
    assert.ok(Math.abs(normal[i]-sample)<1e-6);assert.ok(Math.abs(limited[i])<=0.999001);
    if(Math.abs(sample)<=0.95)assert.ok(Math.abs(limited[i]-sample)<1e-6);
    if(i)assert.ok(limited[i]>=limited[i-1]);
  }
});
test('native remote playback is never rerouted into a local graph',async()=>{
  const media=new Media();media.webkitCurrentPlaybackTargetIsWireless=true;
  const v=createVolumeController(media,{Context});assert.equal(await v.prepare(),false);assert.equal(v.context,undefined);assert.equal(v.audio,media);
  const active=make();await active.prepare();active.audio.webkitCurrentPlaybackTargetIsWireless=true;
  active.audio.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'));assert.equal(active.mode,'fallback');
});
test('native read-only volume still allows mute and keeps a persisted selection',async()=>{
  const audio=new Media();Object.defineProperty(audio,'volume',{get:()=>1,set:()=>{}});
  const v=createVolumeController(audio,{Context:null,saved:{level:0.4}});
  await new Promise(resolve=>setTimeout(resolve,170));assert.equal(v.nativeAdjustable,false);assert.equal(v.level,0.4);
  v.toggleMute();assert.equal(v.audio.muted,true);v.toggleMute();assert.equal(v.audio.muted,false);
});
test('source attachment and resume happen within the calling gesture before microtasks',async()=>{
  const v=make();let gesture=true;
  class Activated extends Context {
    createMediaElementSource(media){assert.equal(gesture,true,'source setup lost transient activation');return super.createMediaElementSource(media);}
    resume(){assert.equal(gesture,true,'resume lost transient activation');return super.resume();}
  }
  const active=make({Context:Activated});const ready=active.prepare();gesture=false;
  assert.equal(await ready,true);assert.equal(active.context.sources.length,1);
});
test('an explicit new gesture retries resume even if foreground recovery is still pending',async()=>{
  let attempts=0,finish;
  class Retry extends Context {
    resume(){attempts++;if(attempts===1)return new Promise(resolve=>{finish=resolve;});this.state='running';finish();return Promise.resolve();}
  }
  const nav={userActivation:{isActive:false}},v=make({Context:Retry,nav});
  const pending=v.prepare();nav.userActivation.isActive=true;assert.equal(v.prepare(),pending);
  assert.equal(await pending,true);assert.equal(attempts,2);assert.equal(v.context.sources.length,1);
});
test('WebKit interrupted contexts resume on foreground without replacing the graph',async()=>{
  const v=make();await v.prepare();v.audio.paused=false;v.context.state='interrupted';
  v.recover();await v.pending;assert.equal(v.context.state,'running');assert.equal(v.context.sources.length,1);
});
test('foreign-origin media remains on the native path instead of becoming CORS silence',async t=>{
  const previous=globalThis.location;globalThis.location={href:'https://example.test/media/',origin:'https://example.test'};t.after(()=>{globalThis.location=previous;});
  const media=new Media();media.src='https://foreign.test/audio.mp3';const v=createVolumeController(media,{Context});
  assert.equal(await v.prepare(),false);assert.equal(v.context.sources.length,0);assert.equal(v.audio,media);assert.equal(v.mode,'fallback');
});
test('a resume failure during hidden suspension retains the graph for the next foreground gesture',async t=>{
  const previous=globalThis.document;globalThis.document={hidden:true};t.after(()=>{globalThis.document=previous;});
  class Interrupted extends Context {resume(){return Promise.reject(Error('background'));}}
  const v=make({Context:Interrupted});assert.equal(await v.prepare(),false);assert.equal(v.mode,'processed');assert.equal(v.context.sources.length,1);
  globalThis.document.hidden=false;v.context.resume=async()=>{v.context.state='running';};assert.equal(await v.prepare(),true);
});
test('touch release can complete a resume whose earlier promise remains unresolved in WebKit',async()=>{
  let attempts=0;
  class Touch extends Context {
    resume(){if(++attempts===1)return new Promise(()=>{});this.state='running';return Promise.resolve();}
  }
  const v=make({Context:Touch}),pending=v.prepare();
  assert.equal(v.prepare({userGesture:true}),pending);assert.equal(await pending,true);assert.equal(v.mode,'processed');
});
test('asynchronous WebKit native-volume acknowledgement restores slider availability',async()=>{
  let actual=1;
  const audio=new Media();Object.defineProperty(audio,'volume',{get:()=>actual,set:value=>queueMicrotask(()=>{actual=value;audio.dispatchEvent(new Event('volumechange'));})});
  const v=createVolumeController(audio,{Context:null});v.setLevel(.4);assert.equal(v.nativeAdjustable,true,'Keep the native drag enabled while acknowledgement is pending');
  await Promise.resolve();assert.equal(v.nativeAdjustable,true);assert.equal(audio.volume,.4);
});

test('an unsolicited native readback does not classify a writable slider as read-only',()=>{
  const audio=new Media(),v=createVolumeController(audio,{Context:null});
  audio.volume=.4;audio.dispatchEvent(new Event('volumechange'));
  assert.equal(v.nativeAdjustable,true);
  v.setLevel(.6);assert.equal(audio.volume,.6);
});

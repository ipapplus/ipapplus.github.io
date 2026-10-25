// Display-independent volume state. Only this module owns the audio output graph.
export const MAX_GAIN = 2;
export function normalizeLevel(value, fallback = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(MAX_GAIN, value)) : fallback;
}

// A memoryless soft knee only affects peaks above -0.45 dBFS. The preceding
// half-gain gives the shaper headroom for inputs up to twice full scale.
// At normal levels the linear curve is transparent, including full-scale audio.
const curves = new Map();
export function volumeCurve(protect) {
  if (!curves.has(protect)) {
    const curve = new Float32Array(4097);
    for (let i = 0; i < curve.length; i++) {
      const sample = 2 * (i / (curve.length - 1) * 2 - 1), magnitude = Math.abs(sample);
      curve[i] = protect && magnitude > 0.95
        ? Math.sign(sample) * (0.95 + 0.049 * Math.tanh((magnitude - 0.95) / 0.049)) : sample;
    }
    curves.set(protect, curve);
  }
  return curves.get(protect);
}
const instances = new WeakMap();
export function createVolumeController(audio, options = {}) {
  if (!instances.has(audio)) instances.set(audio, new VolumeController(audio, options));
  return instances.get(audio);
}

class VolumeController {
  constructor(audio, { saved = {}, onChange = () => {}, onReplace = () => {}, onFallback = () => {}, onPlaybackError = () => {},
    Context = globalThis.AudioContext || globalThis.webkitAudioContext, nav = globalThis.navigator, resumeTimeout = 1500, restorePosition = true } = {}) {
    saved = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    this.audio = audio; this.Context = Context; this.nav = nav; this.resumeTimeout = resumeTimeout;
    this.restorePosition = restorePosition;
    this.onChange = onChange; this.onReplace = onReplace; this.onFallback = onFallback; this.onPlaybackError = onPlaybackError;
    this.level = normalizeLevel(saved.level); this.muted = saved.muted === true;
    this.lastLevel = normalizeLevel(saved.lastLevel, 1) || 1;
    if (this.level > 0) this.lastLevel = this.level;
    this.mode = Context ? 'native' : 'fallback'; this.nativeAdjustable = true;
    this.watchRouting(audio);this.apply();
  }
  watchRouting(audio) {
    audio.addEventListener('volumechange', () => {
      if(audio!==this.audio || this.mode==='processed') return;
      // A late or external readback is not evidence that volume is read-only.
      // Only apply() probes writes; a successful acknowledgement can restore it.
      const adjustable=Math.abs(audio.volume-Math.min(this.effectiveLevel,1))<0.01;
      if(adjustable) {
        clearTimeout(this.nativeTimer);
        if(!this.nativeAdjustable) {this.nativeAdjustable=true;this.changed();}
      }
    });
    const check=()=>{if(audio===this.audio && this.isRemote())this.fallback();};
    audio.addEventListener('webkitcurrentplaybacktargetiswirelesschanged',check);
    audio.remote?.addEventListener('connecting',check);audio.remote?.addEventListener('connect',check);
  }
  isRemote() { return this.audio.webkitCurrentPlaybackTargetIsWireless===true || ['connecting','connected'].includes(this.audio.remote?.state); }
  get effectiveLevel() { return this.muted ? 0 : this.level; }
  get preference() { return { level:this.level, muted:this.muted, lastLevel:this.lastLevel }; }
  get sliderMaximum() { return this.mode === 'fallback' ? 1 : MAX_GAIN; }
  get sliderValue() { return Math.min(this.effectiveLevel, this.sliderMaximum); }
  changed() { this.onChange(this); }
  setLevel(value) {
    this.level = normalizeLevel(value); this.muted = false;
    if (this.level > 0) this.lastLevel = this.level;
    this.apply(); this.changed();
  }
  toggleMute() {
    if (this.effectiveLevel === 0) { this.muted = false; if (!this.level) this.level = this.lastLevel; }
    else this.muted = true;
    this.apply(); this.changed();
  }
  apply() {
    const target = this.effectiveLevel;
    if (this.mode === 'processed') {
      clearTimeout(this.nativeTimer);
      const param = this.gain.gain, now = this.context.currentTime;
      clearTimeout(this.protectionTimer);
      // Keep protection while a formerly raised level ramps down through unity.
      const protect = this.level > 1 || param.value > 1;
      if (protect !== this.protect) { this.shaper.curve = volumeCurve(protect); this.protect = protect; }
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else { const value = param.value; param.cancelScheduledValues(now); param.setValueAtTime(value, now); }
      param.linearRampToValueAtTime(target, now + 0.025);
      if (protect && this.level <= 1) this.protectionTimer = setTimeout(() => {
        if (this.mode === 'processed' && this.level <= 1 && param.value <= 1.001) {
          this.shaper.curve = volumeCurve(false); this.protect = false;
        }
      }, 50);
      this.audio.volume = 1; this.audio.muted = false;
    } else {
      const native = Math.min(target, 1);
      clearTimeout(this.nativeTimer);
      try {
        this.audio.volume = native;
        if (Math.abs(this.audio.volume - native) < 0.01) this.nativeAdjustable = true;
        else {
          // WebKit acknowledges writes through its media process. Disabling the
          // range before mouse-up can strand its native drag and undo mute.
          const audio=this.audio;
          this.nativeTimer=setTimeout(()=>{
            if(audio!==this.audio||this.mode==='processed')return;
            const adjustable=Math.abs(audio.volume-native)<0.01;
            if(adjustable!==this.nativeAdjustable){this.nativeAdjustable=adjustable;this.changed();}
          },150);
        }
      } catch { this.nativeAdjustable = false; }
      // iOS can ignore .volume, but .muted still provides dependable silence.
      this.audio.muted = target === 0;
    }
  }
  // Called synchronously from a volume/play gesture; never waits before media.play().
  prepare({ userGesture = false } = {}) {
    if (this.mode === 'fallback') return Promise.resolve(false);
    if (this.isRemote()) {this.fallback();return Promise.resolve(false);}
    if (this.pending) {
      // A foreground recovery may still be waiting when the next real tap arrives.
      // Re-issue resume synchronously so WebKit receives that activation too.
      if(this.context?.state==='running') this.markResumed?.();
      else if (userGesture || this.nav?.userActivation?.isActive) {
        try { this.context.resume().then(() => this.markResumed?.()).catch(() => {}); } catch { /* Existing timeout recovers. */ }
      }
      return this.pending;
    }
    if (this.context?.state === 'running' && this.source) return Promise.resolve(true);
    try {
      if (!this.context) {
        this.context = new this.Context({ latencyHint:'interactive' });
        // Preserve media output routing: no capture, microphone, sink override or silent keepalive.
        try { if (this.nav?.audioSession) this.nav.audioSession.type = 'playback'; } catch { /* Optional Safari API. */ }
        this.context.addEventListener('statechange', () => {
          if (this.mode === 'fallback') return;
          if (this.context.state === 'closed') this.fallback();
          else if (!globalThis.document?.hidden && this.source && !this.audio.paused && !this.pending && this.context.state !== 'running') this.prepare();
        });
      }
      const context = this.context;
      let timer;
      // Attach the graph and request resume in the SAME gesture stack. In
      // particular, do not defer createMediaElementSource until resume().then().
      // Native output is restored with a replacement element if resume fails.
      if (!this.source) {
        const src = this.audio.currentSrc || this.audio.getAttribute('src');
        if (src && globalThis.location && new URL(src, location.href).origin !== location.origin) {
          this.fallback(); return Promise.resolve(false);
        }
        this.connect(); this.apply();
      }
      const ready = new Promise((resolve,reject) => {
        this.markResumed=resolve;
        if(context.state==='running') resolve();
        else context.resume().then(resolve,reject);
      });
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Audio resume timeout')), this.resumeTimeout); });
      this.pending = Promise.race([ready, timeout]).then(() => {
        if (this.mode === 'fallback') return false;
        if (context.state !== 'running') throw Error('Audio context unavailable');
        this.apply(); this.changed(); return true;
      }).catch(() => { if (!globalThis.document?.hidden) this.fallback(); return false; }).finally(() => { clearTimeout(timer); this.pending = null; this.markResumed=null; });
      return this.pending;
    } catch { this.fallback(); return Promise.resolve(false); }
  }
  connect() {
    const context = this.context;
    this.gain = context.createGain(); this.headroom = context.createGain(); this.shaper = context.createWaveShaper();
    this.headroom.gain.value = 0.5;
    this.protect = this.level > 1; this.shaper.curve = volumeCurve(this.protect); this.shaper.oversample = 'none';
    // Start at the currently audible native level, then ramp to the selection.
    this.gain.gain.value = this.audio.muted ? 0 : this.audio.volume;
    this.gain.connect(this.headroom); this.headroom.connect(this.shaper); this.shaper.connect(context.destination);
    // Configure all downstream nodes before taking ownership of media output.
    this.source = context.createMediaElementSource(this.audio);
    this.source.connect(this.gain); this.mode = 'processed';
  }
  fallback() {
    if (this.mode === 'fallback') return;
    this.mode = 'fallback';clearTimeout(this.protectionTimer);clearTimeout(this.clockTimer);
    if (this.source) {
      // Disconnecting/closing a context does NOT restore a media element's native
      // output. Replace only that element, preserving its URL, position and listeners.
      const previous = this.audio, source = previous.getAttribute('src'), playing = !previous.paused;
      const position = Number.isFinite(previous.currentTime) ? previous.currentTime : 0;
      const next = previous.cloneNode(false); next.removeAttribute('src'); next.defaultPlaybackRate = previous.playbackRate; next.playbackRate = previous.playbackRate;
      this.audio = next; instances.set(next, this); this.watchRouting(next);this.apply();
      if(this.restorePosition)next.addEventListener('loadedmetadata', () => {
        if (position && Number.isFinite(next.duration)) next.currentTime = Math.min(position, next.duration);
      }, {once:true});
      this.onReplace(next, previous); previous.replaceWith(next); previous.pause(); previous.removeAttribute('src'); previous.load();
      if (source) { next.src = source; next.playbackRate = next.defaultPlaybackRate; if (playing) next.play().catch(this.onPlaybackError); }
    }
    for (const node of [this.source, this.gain, this.headroom, this.shaper]) { try { node?.disconnect(); } catch {} }
    try { if (this.context?.state !== 'closed') this.context?.close().catch(() => {}); } catch {}
    this.apply(); this.changed(); this.onFallback();
  }
  recover() {
    // No context is created and paused playback stays paused on lifecycle events.
    if (this.source && !this.audio.paused) {
      if (this.context?.state !== 'running') this.prepare();
      else {
        // Some WebKit releases report running after suspension while the clock
        // is frozen. Check the rendering clock, never infer sound from play().
        clearTimeout(this.clockTimer);
        const time = this.context.currentTime;
        this.clockTimer = setTimeout(() => {
          if (!globalThis.document?.hidden && !this.audio.paused && this.mode === 'processed' && this.context.currentTime === time) this.fallback();
        }, 500);
      }
    }
  }
}

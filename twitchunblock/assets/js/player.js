// ═══════════════════════════════════════════════════════════════════════════
//  Lecteur vidéo maison.
//
//  Remplace Plyr. Celui-ci posait ses propres commandes et son propre plein
//  écran par-dessus la vidéo : impossible d'y loger le chat proprement, et
//  sur iPhone son plein écran basculait sur le lecteur natif d'Apple, chat
//  perdu. Ici les commandes sont les nôtres, le plein écran englobe la vidéo
//  ET le chat, et la logique reprend celle du lecteur immersif de l'app.
// ═══════════════════════════════════════════════════════════════════════════

import { t } from './i18n.js'
import { API_URL, WORKER_BASES, fixProxiedUrl, workerBaseOf } from './api.js'
import { $, esc, formatClock, icon, isIOS } from './util.js'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const HIDE_AFTER = 2800
// Empreinte du fichier attendu (identique sur les deux CDN) : un CDN
// compromis ne peut pas substituer son propre script.
const HLS_INTEGRITY = 'sha384-9v3HcdYrO3D+OPDTjZ40RXocgE4GtXVCd3/mCS62JsM93JXgI1afJVuwjFvsu6ni'
const HLS_SOURCES = [
  'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.17/hls.min.js',
]

// ── Segments par le relais du Worker (secours) ──────────────────────────
// Les segments d'un direct partent normalement en direct vers le CDN de
// Twitch (moins de requêtes sur le Worker). Chez certains (Firefox avec la
// protection renforcée, extensions, réseaux filtrés), ces requêtes
// n'aboutissent jamais : on bascule alors sur le relais, et on s'en souvient
// une semaine sur cet appareil.
const SEG_PROXY_KEY = 'tu_segment_proxy'
const SEG_PROXY_DAYS = 7
function segmentProxyOn() {
  try { return Number(localStorage.getItem(SEG_PROXY_KEY) || 0) > Date.now() } catch { return false }
}
function enableSegmentProxy() {
  try { localStorage.setItem(SEG_PROXY_KEY, String(Date.now() + SEG_PROXY_DAYS * 86400000)) } catch {}
}
/** Segment de direct servi en direct par le CDN (pas déjà relayé). */
function isDirectSegment(u) {
  try {
    const h = new URL(u).hostname
    return !WORKER_BASES.some((b) => new URL(b).hostname === h) && /(^|\.)(ttvnw\.net|twitchcdn\.net)$/.test(h) && !/(^|\.)playlist\.ttvnw\.net$/.test(h)
  } catch { return false }
}

let hlsPromise = null
/** Charge hls.js, avec un second CDN si le premier ne répond pas : sans lui,
 *  rien ne se lit hors de Safari. Appelé au démarrage pour être prêt au
 *  premier clic. */
export function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls)
  hlsPromise ??= new Promise((resolve) => {
    const next = (i) => {
      if (window.Hls) return resolve(window.Hls)
      if (i >= HLS_SOURCES.length) return resolve(null)
      const s = document.createElement('script')
      s.src = HLS_SOURCES[i]
      s.integrity = HLS_INTEGRITY
      s.crossOrigin = 'anonymous'
      s.async = true
      s.onload = () => resolve(window.Hls ?? null)
      s.onerror = () => { s.remove(); next(i + 1) }
      document.head.appendChild(s)
    }
    next(0)
  })
  return hlsPromise
}

/** Source d'abord, puis du plus fin au plus grossier, l'audio seul en dernier. */
export function sortQualities(keys) {
  const score = (k) => {
    const s = k.toLowerCase()
    if (s === 'auto') return 1e6
    if (s.includes('source') || s === 'chunked') return 1e5
    if (s.includes('audio')) return -1
    const m = s.match(/(\d+)p(\d+)?/)
    return m ? Number(m[1]) * 100 + Number(m[2] || 30) : 0
  }
  return [...keys].sort((a, b) => score(b) - score(a))
}

export function qualityLabel(k) {
  const s = String(k)
  if (s.toLowerCase() === 'chunked') return 'Source'
  if (s.toLowerCase() === 'audio_only') return 'Audio'
  return s.replace(/^(\d+p)30$/, '$1')
}

export class Player {
  /**
   * @param {HTMLElement} root
   * @param {object} o
   * @param {HTMLElement} o.fullscreenTarget  élément mis en plein écran (vidéo + chat)
   * @param {(t: number, duration: number) => void} o.onTime
   * @param {() => void} o.onToggleChat
   * @param {() => boolean} o.isChatOpen
   * @param {object} o.prefs
   * @param {() => void} o.savePrefs
   */
  constructor(root, o) {
    this.root = root
    this.o = o
    this.hls = null
    this.links = {}
    this.kind = 'vod'
    this.quality = null
    this.hideTimer = null
    this.lastTap = 0
    this.tapTimer = null
    this.dragging = false
    this.build()
  }

  build() {
    this.root.classList.add('player')
    this.root.tabIndex = 0
    this.root.innerHTML = `
      <video playsinline webkit-playsinline preload="auto"></video>
      <div class="p-spinner" hidden><span></span></div>
      <div class="p-flash" aria-hidden="true"></div>
      <button class="p-unmute" type="button" hidden>${icon('mute', 16)}<span></span></button>
      <div class="p-ui">
        <div class="p-shade"></div>
        <button class="p-big" type="button" aria-label="play">${icon('play', 30)}</button>
        <div class="p-bottom">
          <div class="p-progress" hidden>
            <div class="p-track"><div class="p-buffer"></div><div class="p-played"></div></div>
            <div class="p-knob"></div>
            <div class="p-tip" hidden></div>
          </div>
          <div class="p-bar">
            <button class="p-btn p-play" type="button">${icon('play', 22)}</button>
            <button class="p-btn p-back vod-only" type="button" data-i18n-title="back10">${icon('back10', 20)}<b>10</b></button>
            <button class="p-btn p-fwd vod-only" type="button" data-i18n-title="fwd10">${icon('fwd10', 20)}<b>10</b></button>
            <div class="p-volume">
              <button class="p-btn p-mute" type="button">${icon('volume', 21)}</button>
              <input class="p-vol" type="range" min="0" max="1" step="0.05" aria-label="volume">
            </div>
            <span class="p-time vod-only"></span>
            <button class="p-live live-only" type="button"><span class="dot"></span><span class="p-live-text"></span></button>
            <span class="p-latency live-only"></span>
            <button class="p-btn p-chapters vod-only" type="button" hidden data-i18n-title="chapters">${icon('list', 18)}<span class="p-chap-label"></span>${icon('chevronUp', 14)}</button>
            <span class="p-spacer"></span>
            <button class="p-btn p-quality" type="button" data-i18n-title="quality">${icon('settings', 20)}<span class="p-q-label"></span></button>
            <button class="p-btn p-chat" type="button" data-i18n-title="chat">${icon('chat', 20)}</button>
            <button class="p-btn p-pip" type="button" data-i18n-title="pip">${icon('pip', 20)}</button>
            <button class="p-btn p-theatre" type="button" data-i18n-title="theatre">${icon('theatre', 20)}</button>
            <button class="p-btn p-fs" type="button" data-i18n-title="fullscreen">${icon('maximize', 20)}</button>
          </div>
        </div>
      </div>
      <div class="p-menu" hidden role="menu"></div>`

    const q = (s) => $(s, this.root)
    this.video = q('video')
    this.el = {
      spinner: q('.p-spinner'), flash: q('.p-flash'), unmute: q('.p-unmute'),
      ui: q('.p-ui'), big: q('.p-big'), progress: q('.p-progress'), buffer: q('.p-buffer'),
      played: q('.p-played'), knob: q('.p-knob'), tip: q('.p-tip'),
      play: q('.p-play'), back: q('.p-back'), fwd: q('.p-fwd'), mute: q('.p-mute'), vol: q('.p-vol'),
      time: q('.p-time'), live: q('.p-live'), liveText: q('.p-live-text'), latency: q('.p-latency'),
      quality: q('.p-quality'), qLabel: q('.p-q-label'), chat: q('.p-chat'), pip: q('.p-pip'), fs: q('.p-fs'), theatre: q('.p-theatre'), chapBtn: q('.p-chapters'), chapLabel: q('.p-chap-label'),
      menu: q('.p-menu'),
    }

    const v = this.video
    const p = this.o.prefs
    v.volume = p.volume ?? 1
    v.muted = Boolean(p.muted)
    this.el.vol.value = String(v.muted ? 0 : v.volume)

    // ── Vidéo ────────────────────────────────────────────────────────────
    v.addEventListener('play', () => this.syncPlay())
    v.addEventListener('pause', () => { this.syncPlay(); this.showUI(); this.o.onPause?.() })
    v.addEventListener('waiting', () => { this.el.spinner.hidden = false })
    v.addEventListener('playing', () => { this.el.spinner.hidden = true; this.scheduleHide() })
    v.addEventListener('canplay', () => { this.el.spinner.hidden = true })
    v.addEventListener('timeupdate', () => this.onTime())
    v.addEventListener('progress', () => this.drawBuffer())
    v.addEventListener('durationchange', () => this.onTime())
    v.addEventListener('volumechange', () => this.syncVolume())
    v.addEventListener('enterpictureinpicture', () => this.root.classList.add('in-pip'))
    v.addEventListener('leavepictureinpicture', () => this.root.classList.remove('in-pip'))
    v.addEventListener('webkitpresentationmodechanged', () => {
      this.root.classList.toggle('in-pip', v.webkitPresentationMode === 'picture-in-picture')
    })

    // ── Commandes ────────────────────────────────────────────────────────
    const on = (el, fn) => el.addEventListener('click', (e) => { e.stopPropagation(); fn(e); this.showUI() })
    on(this.el.big, () => this.togglePlay())
    on(this.el.play, () => this.togglePlay())
    on(this.el.back, () => this.seekBy(-10))
    on(this.el.fwd, () => this.seekBy(10))
    on(this.el.mute, () => this.toggleMute())
    on(this.el.live, () => this.goLive())
    on(this.el.quality, () => this.toggleMenu())
    on(this.el.chapBtn, () => this.toggleChapters())
    this.video.addEventListener('timeupdate', () => this.updateChapterLabel())
    on(this.el.chat, () => this.o.onToggleChat())
    on(this.el.pip, () => this.togglePiP())
    on(this.el.fs, () => this.toggleFullscreen())
    on(this.el.theatre, () => this.o.onTheatre?.())
    on(this.el.unmute, () => { this.video.muted = false; this.el.unmute.hidden = true })
    this.el.vol.addEventListener('input', (e) => {
      e.stopPropagation()
      v.volume = Number(this.el.vol.value)
      v.muted = v.volume === 0
    })
    this.el.vol.addEventListener('click', (e) => e.stopPropagation())
    this.el.menu.addEventListener('click', (e) => this.onMenuClick(e))

    if (!document.pictureInPictureEnabled && !v.webkitSupportsPresentationMode) this.el.pip.hidden = true

    // ── Barre de progression ─────────────────────────────────────────────
    const prog = this.el.progress
    prog.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      this.dragging = true
      this.root.classList.add('scrubbing')
      prog.setPointerCapture(e.pointerId)
      this.scrubTo(e)
    })
    prog.addEventListener('pointermove', (e) => {
      this.hoverTip(e)
      if (this.dragging) this.scrubTo(e)
    })
    prog.addEventListener('pointerleave', () => { if (!this.dragging) this.el.tip.hidden = true })
    const end = (e) => {
      if (!this.dragging) return
      this.dragging = false
      this.root.classList.remove('scrubbing')
      this.el.tip.hidden = true
      const target = this.positionFrom(e)
      if (target !== null) this.video.currentTime = target
    }
    prog.addEventListener('pointerup', end)
    prog.addEventListener('pointercancel', end)
    prog.addEventListener('click', (e) => e.stopPropagation())

    // ── Affichage des commandes, gestes ──────────────────────────────────
    this.root.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.showUI() })
    this.root.addEventListener('mouseleave', () => this.scheduleHide(600))
    this.root.addEventListener('click', (e) => this.onSurfaceClick(e))
    this.root.addEventListener('dblclick', (e) => {
      if (e.target.closest('.p-bottom, .p-menu, .p-big')) return
      if (matchMedia('(pointer: fine)').matches) this.toggleFullscreen()
    })
    // Raccourcis sur toute la page (plus seulement lecteur sélectionné), tant
    // que le lecteur est affiché en grand et qu'on n'écrit pas.
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      if (this.o.keysActive ? this.o.keysActive() : this.root.contains(document.activeElement)) this.onKey(e)
    })

    document.addEventListener('fullscreenchange', () => this.syncFullscreen())
    document.addEventListener('webkitfullscreenchange', () => this.syncFullscreen())

    this.syncVolume()
    this.syncPlay()
  }

  // ── Chargement ─────────────────────────────────────────────────────────
  /**
   * @param {object} o
   * @param {Record<string,string>} o.links  qualité → URL
   * @param {'live'|'vod'} o.kind
   * @param {number} [o.startAt]
   */
  load({ links, kind, startAt = 0 }) {
    this.links = links
    this.kind = kind
    this.root.dataset.kind = kind
    this.el.progress.hidden = kind !== 'vod'
    this.setChapters([])
    // Rempli tout de suite : sinon la pastille du direct restait vide tant
    // que la vidéo n'avait pas démarré.
    this.el.liveText.textContent = t('live_now')
    this.el.live.classList.remove('behind')
    this.el.latency.textContent = ''
    this.video.playbackRate = 1
    const keys = sortQualities(Object.keys(links))
    const pref = this.o.prefs.quality
    this.quality = keys.includes(pref) ? pref : (keys.find((k) => !/audio/i.test(k)) ?? keys[0])
    this.updateQualityLabel()
    this.attach(links[this.quality], startAt)
    this.showUI()
  }

  async attach(url, startAt = 0) {
    const v = this.video
    this.destroyHls()
    this.el.spinner.hidden = false
    if (!url) return
    const token = (this.attachToken = (this.attachToken ?? 0) + 1)

    const start = () => {
      if (token !== this.attachToken) return   // vidéo remplacée entre-temps
      if (startAt > 1 && this.kind === 'vod') {
        try { v.currentTime = startAt } catch {}
      }
      this.tryPlay()
    }

    // Clip : un simple MP4, lu tel quel.
    if (/\.mp4(\?|$)/i.test(url)) {
      v.src = url
      v.addEventListener('loadedmetadata', start, { once: true })
      v.load()
      return
    }

    // hls.js dès qu'il est utilisable — iPhone compris depuis iOS 17.1 —,
    // comme l'ancienne version du site : lui seul permet de corriger à la
    // volée les adresses que le Worker ne réécrit pas (voir fixProxiedUrl).
    // Le HLS natif ne sert qu'en dernier recours.
    const native = Boolean(v.canPlayType('application/vnd.apple.mpegurl'))
    const Hls = await loadHls()
    if (token !== this.attachToken) return

    if (Hls?.isSupported()) {
      // Le relais du Worker qui a servi ces liens : le principal, ou un
      // secours si le quota du principal est atteint.
      const relay = workerBaseOf(url) ?? API_URL
      const hls = new Hls({
        // Rouvrir la requête avec l'adresse corrigée : c'est le point
        // d'accroche que hls.js offre pour réécrire une URL avant envoi.
        xhrSetup: (xhr, reqUrl) => {
          let fixed = fixProxiedUrl(reqUrl, url)
          // Secours : segments par le relais quand le direct n'aboutit pas.
          if (segmentProxyOn() && isDirectSegment(fixed)) {
            fixed = `${relay}/api/proxy?url=${encodeURIComponent(fixed)}&isVod=false`
          }
          if (fixed !== reqUrl) xhr.open('GET', fixed, true)
        },
        backBufferLength: 90,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
        startPosition: this.kind === 'vod' && startAt > 1 ? startAt : -1,
      })
      this.hls = hls
      hls.loadSource(url)
      hls.attachMedia(v)
      hls.on(Hls.Events.MANIFEST_PARSED, () => this.tryPlay())
      // En « Auto » (playlist maître), hls.js choisit le débit : on affiche
      // lequel, sinon on ne sait jamais ce qu'on regarde vraiment.
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
        const h = hls.levels?.[d.level]?.height
        this.autoLevel = h ? `${h}p` : ''
        this.updateQualityLabel()
      })
      hls.on(Hls.Events.ERROR, (_e, data) => {
        // Segment jamais arrivé (code 0 : bloqué avant d'atteindre Twitch) :
        // les prochaines tentatives passent par le relais du Worker.
        if (!segmentProxyOn() && data.type === Hls.ErrorTypes.NETWORK_ERROR
            && /^frag/i.test(data.details || '') && !data.response?.code && isDirectSegment(data.frag?.url || data.url || '')) {
          enableSegmentProxy()
          console.info('[TwitchUnblock] Segments directs bloqués : passage par le relais.')
          if (data.fatal) { hls.startLoad(); return }
        }
        if (!data.fatal) return
        // Worker hors service en pleine lecture (quota du jour atteint) : ses
        // requêtes n'aboutissent plus du tout — code 0, la page d'erreur de
        // Cloudflare n'ayant pas d'en-tête CORS. Plutôt que de relancer sans
        // fin le même Worker, main.js redemande les liens à un autre.
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !data.response?.code) {
          const down = workerBaseOf(data.frag?.url || data.context?.url || data.url || '')
          if (down && this.o.onWorkerDown?.(down)) return
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
        else this.o.onError?.()
      })
    } else if (native) {
      // Safari (iPhone surtout) : HLS natif.
      v.src = url
      v.addEventListener('loadedmetadata', start, { once: true })
      v.load()
    } else {
      this.el.spinner.hidden = true
      this.o.onError?.()
    }
  }

  /** Lecture automatique : avec le son si le navigateur l'accepte, sinon en
   *  muet avec une pastille pour le remettre — comme sur Twitch. */
  async tryPlay() {
    try {
      await this.video.play()
    } catch (err) {
      if (err?.name !== 'NotAllowedError') return
      this.video.muted = true
      try {
        await this.video.play()
        $('span', this.el.unmute).textContent = t('unmute')
        this.el.unmute.hidden = false
      } catch { this.syncPlay() }
    }
  }

  destroyHls() {
    if (this.hls) { this.hls.destroy(); this.hls = null }
    this.autoLevel = ''
  }

  destroy() {
    this.destroyHls()
    this.video.pause()
    this.video.removeAttribute('src')
    this.video.load()
    this.closeMenu()
    if (document.pictureInPictureElement === this.video) document.exitPictureInPicture().catch(() => {})
  }

  /** Mêmes vidéos, servies par un autre Worker (quota du premier atteint) :
   *  on garde la qualité, la position et les chapitres — `load` repartait
   *  de zéro. */
  swapLinks(links) {
    this.links = links
    if (!links[this.quality]) this.quality = sortQualities(Object.keys(links))[0]
    this.updateQualityLabel()
    this.attach(links[this.quality], this.kind === 'vod' ? this.video.currentTime : 0)
  }

  setQuality(key) {
    if (!this.links[key] || key === this.quality) return
    const at = this.video.currentTime
    const wasPaused = this.video.paused
    this.quality = key
    this.o.prefs.quality = key
    this.o.savePrefs()
    this.updateQualityLabel()
    this.attach(this.links[key], this.kind === 'vod' ? at : 0)
    if (wasPaused && this.kind === 'vod') this.video.addEventListener('playing', () => this.video.pause(), { once: true })
  }

  updateQualityLabel() {
    this.el.qLabel.textContent = this.quality ? qualityLabel(this.quality) : ''
  }

  /** Libellé dans le menu : « Auto · 720p » une fois le débit connu. */
  menuLabel(k) {
    const base = qualityLabel(k)
    return k.toLowerCase() === 'auto' && k === this.quality && this.autoLevel ? `${base} · ${this.autoLevel}` : base
  }

  // ── Lecture ────────────────────────────────────────────────────────────
  togglePlay() {
    if (this.video.paused) this.tryPlay()
    else this.video.pause()
  }

  seekBy(delta) {
    if (this.kind !== 'vod') return
    const v = this.video
    const d = Number.isFinite(v.duration) ? v.duration : Infinity
    v.currentTime = Math.max(0, Math.min(d - 1, v.currentTime + delta))
    this.flash(delta > 0 ? `+${delta} s` : `${delta} s`)
  }

  /**
   * Retard réel de l'image sur le direct, en secondes : l'heure à laquelle
   * l'image affichée a été filmée (EXT-X-PROGRAM-DATE-TIME, inscrite par
   * Twitch à la réception) comparée à maintenant. C'est ce qui sépare le
   * chat — en temps réel — de ce qu'on voit, encodage compris ; la seule
   * distance au bord de la playlist (`hls.latency`) en oubliait une part.
   */
  liveDelay() {
    if (this.kind !== 'live') return 0
    let playing = null
    const pd = this.hls?.playingDate
    if (pd instanceof Date && Number.isFinite(pd.getTime())) playing = pd.getTime()
    else if (typeof this.video.getStartDate === 'function') {
      // HLS natif (Safari) : date de début du flux + position.
      const start = this.video.getStartDate()?.getTime()
      if (Number.isFinite(start) && start > 0) playing = start + this.video.currentTime * 1000
    }
    let delay = playing ? (Date.now() - playing) / 1000 : this.hls?.latency
    if (!Number.isFinite(delay) || delay < 0) return 0
    return Math.min(delay, 90)
  }

  goLive() {
    const v = this.video
    if (this.hls?.liveSyncPosition) v.currentTime = this.hls.liveSyncPosition
    else if (v.seekable.length) v.currentTime = Math.max(0, v.seekable.end(v.seekable.length - 1) - 4)
    if (v.paused) this.tryPlay()
  }

  toggleMute() {
    const v = this.video
    if (v.muted || v.volume === 0) {
      v.muted = false
      if (v.volume === 0) v.volume = 0.5
    } else v.muted = true
    this.el.unmute.hidden = true
  }

  flash(text) {
    const f = this.el.flash
    f.textContent = text
    f.classList.remove('show')
    void f.offsetWidth
    f.classList.add('show')
  }

  // ── Synchronisation de l'affichage ─────────────────────────────────────
  syncPlay() {
    const paused = this.video.paused
    this.root.classList.toggle('paused', paused)
    const ic = icon(paused ? 'play' : 'pause', 22)
    this.el.play.innerHTML = ic
    this.el.play.title = t(paused ? 'play' : 'pause')
    this.el.big.innerHTML = icon(paused ? 'play' : 'pause', 30)
  }

  syncVolume() {
    const v = this.video
    const muted = v.muted || v.volume === 0
    this.el.mute.innerHTML = icon(muted ? 'mute' : 'volume', 21)
    this.el.mute.title = t(muted ? 'unmute' : 'mute')
    if (document.activeElement !== this.el.vol) this.el.vol.value = String(muted ? 0 : v.volume)
    this.el.vol.style.setProperty('--fill', `${(muted ? 0 : v.volume) * 100}%`)
    this.o.prefs.volume = v.volume
    this.o.prefs.muted = v.muted
    this.o.savePrefs()
  }

  onTime() {
    const v = this.video
    const cur = v.currentTime
    if (this.kind === 'vod') {
      const d = v.duration
      // Pendant un glissement, la barre et le compteur suivent le doigt
      // (scrubTo) : les réécrire ici avec la position courante effaçait
      // aussitôt l'instant visé.
      if (!this.dragging) {
        if (Number.isFinite(d) && d > 0) {
          this.el.time.textContent = `${formatClock(cur)} / ${formatClock(d)}`
          this.drawPosition(cur / d)
        } else this.el.time.textContent = formatClock(cur)
      }
    } else {
      // Direct : à quelle distance du bord est-on ?
      let behind = 0
      if (this.hls?.liveSyncPosition) behind = this.hls.liveSyncPosition - cur
      else if (v.seekable.length) behind = v.seekable.end(v.seekable.length - 1) - cur - 6
      const atEdge = behind < 8
      this.el.live.classList.toggle('behind', !atEdge)
      this.el.liveText.textContent = atEdge ? t('live_now') : `${t('live_now')} −${formatClock(behind)}`
      this.el.live.title = atEdge ? '' : t('go_live')
      const lat = this.liveDelay()
      this.el.latency.textContent = lat > 0 ? `${lat.toFixed(1)} s` : ''
    }
    this.o.onTime?.(cur, v.duration)
  }

  drawPosition(ratio) {
    const r = Math.max(0, Math.min(1, ratio))
    this.el.played.style.width = `${r * 100}%`
    this.el.knob.style.left = `${r * 100}%`
  }

  drawBuffer() {
    const v = this.video
    if (this.kind !== 'vod' || !v.buffered.length || !Number.isFinite(v.duration)) return
    let end = 0
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime + 1) end = Math.max(end, v.buffered.end(i))
    }
    this.el.buffer.style.width = `${(end / v.duration) * 100}%`
  }

  positionFrom(e) {
    const d = this.video.duration
    if (!Number.isFinite(d) || d <= 0) return null
    const rect = this.el.progress.getBoundingClientRect()
    const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return r * d
  }

  /** Glissement sur la barre : curseur, infobulle ET compteur suivent le
   *  doigt. Avant, le compteur gardait la position courante : sur téléphone,
   *  où le pouce cache l'infobulle, on visait à l'aveugle. */
  scrubTo(e) {
    const target = this.positionFrom(e)
    if (target === null) return
    this.drawPosition(target / this.video.duration)
    this.el.time.textContent = `${formatClock(target)} / ${formatClock(this.video.duration)}`
    this.hoverTip(e)
  }

  /** Chapitres de la VOD (changements de jeu) : repères sur la barre, et
   *  nom du chapitre dans l'infobulle. */
  setChapters(list) {
    this.chapters = list ?? []
    for (const n of this.el.progress.querySelectorAll('.p-chap')) n.remove()
    this.el.chapBtn.hidden = this.chapters.length < 2
    this.el.chapLabel.textContent = ''
    this.updateChapterLabel()
    // Durée réelle de la vidéo dès qu'elle est connue : le dernier chapitre
    // d'une VOD encore en cours d'enregistrement a une durée nulle.
    const d = this.video.duration
    const total = Math.max(Number.isFinite(d) ? d : 0, ...this.chapters.map((c) => c.start + c.duration))
    if (this.chapters.length < 2 || !total) return
    if (!this.chapDurHooked) {
      this.chapDurHooked = true
      this.video.addEventListener('durationchange', () => { if (this.chapters?.length > 1) this.setChapters(this.chapters) })
    }
    for (const c of this.chapters.slice(1)) {
      if (c.start >= total - 1) continue
      const mark = document.createElement('i')
      mark.className = 'p-chap'
      mark.style.left = `${(c.start / total) * 100}%`
      this.el.progress.appendChild(mark)
    }
  }

  hoverTip(e) {
    const target = this.positionFrom(e)
    if (target === null) return
    const rect = this.el.progress.getBoundingClientRect()
    const chap = this.chapters?.length > 1 ? this.chapters.findLast((c) => c.start <= target) : null
    this.el.tip.textContent = chap ? `${formatClock(target)} · ${chap.title}` : formatClock(target)
    this.el.tip.hidden = false
    // Bornée par sa propre largeur, mesurée une fois le texte posé : avec un
    // nom de chapitre, l'infobulle centrée sur le curseur sortait du lecteur
    // près des bords.
    const half = Math.min(this.el.tip.offsetWidth / 2, rect.width / 2)
    const x = Math.max(half, Math.min(rect.width - half, e.clientX - rect.left))
    this.el.tip.style.left = `${x}px`
  }

  // ── Commandes visibles / masquées ──────────────────────────────────────
  showUI() {
    this.root.classList.add('ui')
    this.scheduleHide()
  }

  scheduleHide(delay = HIDE_AFTER) {
    clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => {
      if (this.video.paused || this.dragging || !this.el.menu.hidden) return
      if (this.root.matches(':hover') && this.root.querySelector('.p-bottom:hover')) return
      this.root.classList.remove('ui')
    }, delay)
  }

  /** Toucher : un tap montre ou cache les commandes, un double-tap sur un
   *  côté avance ou recule de 10 s. Souris : un clic met en pause. */
  onSurfaceClick(e) {
    if (e.target.closest('.p-bottom, .p-menu, .p-big, .p-unmute')) return
    if (!this.el.menu.hidden) { this.closeMenu(); return }
    const touch = !matchMedia('(pointer: fine)').matches
    // Le clic sur l'image peut être désactivé dans les réglages (« clickPause »).
    if (!touch) { if (this.o.prefs.clickPause !== false) this.togglePlay(); this.showUI(); return }

    const now = Date.now()
    const rect = this.root.getBoundingClientRect()
    const side = e.clientX - rect.left < rect.width / 2 ? -10 : 10
    if (now - this.lastTap < 300 && this.kind === 'vod') {
      clearTimeout(this.tapTimer)
      this.seekBy(side)
      this.lastTap = 0
      return
    }
    this.lastTap = now
    clearTimeout(this.tapTimer)
    this.tapTimer = setTimeout(() => {
      if (this.root.classList.contains('ui') && !this.video.paused) this.root.classList.remove('ui')
      else this.showUI()
    }, this.kind === 'vod' ? 260 : 0)
  }

  onKey(e) {
    if (e.target.closest('input, textarea, [contenteditable]')) return
    if (e.key === 'Escape' && !this.el.menu.hidden) { this.closeMenu(); return }
    const k = e.key.toLowerCase()
    const handled = {
      ' ': () => this.togglePlay(),
      k: () => this.togglePlay(),
      f: () => this.toggleFullscreen(),
      m: () => this.toggleMute(),
      c: () => this.o.onToggleChat(),
      t: () => this.o.onTheatre?.(),
      '?': () => this.o.onHelp?.(),
      '0': () => { if (this.kind === 'vod') this.video.currentTime = 0 },
      arrowleft: () => this.seekBy(-10),
      arrowright: () => this.seekBy(10),
      j: () => this.seekBy(-10),
      l: () => this.seekBy(10),
      arrowup: () => { this.video.muted = false; this.video.volume = Math.min(1, this.video.volume + 0.1) },
      arrowdown: () => { this.video.volume = Math.max(0, this.video.volume - 0.1) },
    }[k]
    if (!handled) return
    e.preventDefault()
    handled()
    this.showUI()
  }

  // ── Menu qualité / vitesse ─────────────────────────────────────────────
  toggleMenu() {
    if (!this.el.menu.hidden) return this.closeMenu()
    const keys = sortQualities(Object.keys(this.links))
    const rate = this.video.playbackRate
    let html = `<div class="p-menu-title">${esc(t('quality'))}</div>`
    html += keys.map((k) => `<button type="button" data-q="${esc(k)}" class="${k === this.quality ? 'on' : ''}">
      <span>${esc(this.menuLabel(k))}</span>${k === this.quality ? icon('check', 16) : ''}</button>`).join('')
    if (this.kind === 'vod') {
      html += `<div class="p-menu-title">${esc(t('speed'))}</div><div class="p-speeds">`
      html += SPEEDS.map((s) => `<button type="button" data-s="${s}" class="${s === rate ? 'on' : ''}">${s === 1 ? esc(t('normal')) : `${s}×`}</button>`).join('')
      html += '</div>'
    }
    this.el.menu.innerHTML = html
    this.el.menu.hidden = false
    this.showUI()
  }

  /** Liste des chapitres : reste ouverte jusqu'au choix (ou un clic ailleurs). */
  toggleChapters() {
    if (!this.el.menu.hidden && this.el.menu.dataset.kind === 'chapters') return this.closeMenu()
    const cur = this.currentChapter()
    let html = `<div class="p-menu-title">${esc(t('chapters'))}</div>`
    html += this.chapters.map((c) => `<button type="button" data-c="${c.start}" class="${c === cur ? 'on' : ''}">
      <span class="p-chap-row"><b>${esc(formatClock(c.start))}</b> ${esc(c.title)}</span>${c === cur ? icon('check', 16) : ''}</button>`).join('')
    this.el.menu.innerHTML = html
    this.el.menu.dataset.kind = 'chapters'
    this.el.menu.hidden = false
    this.el.menu.querySelector('.on')?.scrollIntoView({ block: 'nearest' })
    this.showUI()
  }

  currentChapter() {
    const t0 = this.video.currentTime
    let cur = null
    for (const c of this.chapters ?? []) if (c.start <= t0 + 0.5) cur = c
    return cur
  }

  updateChapterLabel() {
    if (!(this.chapters?.length > 1)) return
    const cur = this.currentChapter()
    const label = cur?.title ?? ''
    if (this.el.chapLabel.textContent !== label) this.el.chapLabel.textContent = label
  }

  closeMenu() { this.el.menu.hidden = true; delete this.el.menu.dataset.kind; this.scheduleHide() }

  onMenuClick(e) {
    e.stopPropagation()
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.q) this.setQuality(b.dataset.q)
    if (b.dataset.s) this.video.playbackRate = Number(b.dataset.s)
    if (b.dataset.c) { this.video.currentTime = Number(b.dataset.c); this.updateChapterLabel() }
    this.closeMenu()
  }

  // ── Image dans l'image, plein écran ────────────────────────────────────
  async togglePiP() {
    const v = this.video
    try {
      if (v.webkitSupportsPresentationMode && typeof v.webkitSetPresentationMode === 'function') {
        v.webkitSetPresentationMode(v.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture')
      } else if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch { /* refusé par le navigateur : rien à faire */ }
  }

  get isFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement)
  }

  async toggleFullscreen() {
    const target = this.o.fullscreenTarget
    try {
      if (this.isFullscreen) {
        await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.())
      } else if (target.requestFullscreen) {
        await target.requestFullscreen({ navigationUI: 'hide' })
        // En paysage sur mobile, on verrouille l'orientation si on peut.
        screen.orientation?.lock?.('landscape').catch(() => {})
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen()
      } else if (isIOS && this.video.webkitEnterFullscreen) {
        // iPhone : seul le plein écran natif de la vidéo existe — sans le chat.
        this.video.webkitEnterFullscreen()
      }
    } catch { /* refusé : on reste en fenêtre */ }
  }

  syncFullscreen() {
    const fs = this.isFullscreen
    this.el.fs.innerHTML = icon(fs ? 'minimize' : 'maximize', 20)
    this.el.fs.title = t(fs ? 'exit_fullscreen' : 'fullscreen')
    if (!fs) screen.orientation?.unlock?.()
  }

  setChatOpen(open) {
    this.el.chat.classList.toggle('on', open)
  }
}

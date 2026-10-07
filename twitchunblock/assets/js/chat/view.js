// ═══════════════════════════════════════════════════════════════════════════
//  Panneau de chat : affichage, défilement, saisie, emotes, fiche utilisateur.
//
//  Remplace l'iframe de Twitch. Celle-ci ne savait rien faire de ce que fait
//  l'app — emotes BTTV/FFZ/7TV, historique à l'arrivée, chat des VODs — et
//  exigeait que le domaine soit déclaré comme « parent » chez Twitch.
// ═══════════════════════════════════════════════════════════════════════════

import { LiveChat } from './live.js'
import { fetchPinned } from './pinned.js'
import { fetchBotCommands } from './botcmds.js'
import { VodChat } from './vod.js'
import { parseBadgeTag } from './badges.js'
import { emoteCatalog, suggestEmotes } from './emotes.js'
import { plainText, systemMessage } from './message.js'
import { clipSlugFrom, gql } from '../api.js'
import { t } from '../i18n.js'
import { $, debounce, esc, formatClock, icon, toast } from '../util.js'

const MAX_NODES = 300

/** Bots courants : masquables d'un réglage. */
const KNOWN_BOTS = new Set(['nightbot', 'streamelements', 'moobot', 'fossabot', 'streamlabs', 'wizebot', 'soundalerts',
  'sery_bot', 'botisimo', 'own3d', 'kofistreambot', 'pokemoncommunitygame', 'deepbot', 'coebot', 'phantombot', 'creatisbot', 'blerp'])

function formatPoints(n) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n)
}

export class ChatView {
  /**
   * @param {HTMLElement} root
   * @param {object} o
   * @param {object} o.prefs          préférences (timestamps, keepDeleted, loadHistory, chatSize)
   * @param {() => {token: string|null, login: string|null, canChat: boolean, needRescope: boolean}} o.session
   * @param {() => void} o.onLogin
   * @param {() => void} [o.onHide]
   */
  constructor(root, o) {
    this.root = root
    this.o = o
    this.client = null
    this.mode = null
    this.messages = []         // gardés pour la fiche utilisateur et les mentions
    this.queue = []
    this.frame = 0
    this.stick = true
    this.pending = 0
    this.replyTo = null
    this.suggestIndex = 0
    this.suggestions = []
    /** Messages du direct mis en attente pour coller à l'image. */
    this.delayed = []
    this.delayTimer = null
    this.build()
  }

  // ── Structure ───────────────────────────────────────────────────────────
  build() {
    this.root.classList.add('chat')
    this.root.innerHTML = `
      <header class="chat-head">
        <span class="chat-title">${icon('chat', 16)}<span class="chat-title-text"></span></span>
        <span class="chat-status"></span>
        <button class="icon-btn sm chat-cmds-btn" type="button" data-i18n-title="bot_commands" title="${esc(t('bot_commands'))}">${icon('terminal', 17)}</button>
        <button class="icon-btn sm chat-hide" type="button" data-i18n-title="close">${icon('x', 18)}</button>
      </header>
      <div class="bot-cmds" hidden role="dialog"></div>
      <div class="chat-pinned" hidden role="region"></div>
      <div class="chat-events"></div>
      <button class="pin-chip" type="button" hidden>${icon('pin', 13)}<span data-i18n="pinned_short">${esc(t('pinned_short'))}</span></button>
      <div class="chat-list" role="log" aria-live="off" tabindex="0"></div>
      <button class="chat-resume" type="button" hidden>${icon('arrowDown', 14)}<span></span></button>
      <div class="chat-empty" hidden></div>
      <footer class="chat-composer" hidden>
        <div class="chat-suggest" role="listbox" hidden></div>
        <div class="emote-picker" hidden>
          <div class="emote-picker-head">
            <input class="emote-search" type="search" autocomplete="off" data-i18n-ph="emote_search_ph">
          </div>
          <div class="emote-grid"></div>
        </div>
        <div class="chat-replying" hidden><span></span><button class="icon-btn xs" type="button">${icon('x', 14)}</button></div>
        <div class="chat-input-row">
          <input class="chat-input" type="text" maxlength="500" autocomplete="off" enterkeyhint="send" spellcheck="true">
          <button class="icon-btn sm chat-emote-btn" type="button" data-i18n-title="emotes">${icon('smile', 20)}</button>
          <button class="icon-btn sm chat-send" type="button" aria-label="send">${icon('send', 18)}</button>
        </div>
        <button class="chat-login" type="button" hidden></button>
      </footer>
      <div class="user-card" hidden role="dialog"></div>`

    this.el = {
      title: $('.chat-title-text', this.root),
      status: $('.chat-status', this.root),
      list: $('.chat-list', this.root),
      resume: $('.chat-resume', this.root),
      empty: $('.chat-empty', this.root),
      composer: $('.chat-composer', this.root),
      input: $('.chat-input', this.root),
      send: $('.chat-send', this.root),
      emoteBtn: $('.chat-emote-btn', this.root),
      picker: $('.emote-picker', this.root),
      grid: $('.emote-grid', this.root),
      emoteSearch: $('.emote-search', this.root),
      suggest: $('.chat-suggest', this.root),
      replying: $('.chat-replying', this.root),
      login: $('.chat-login', this.root),
      card: $('.user-card', this.root),
      inputRow: $('.chat-input-row', this.root),
      pinned: $('.chat-pinned', this.root),
      pinBtn: $('.pin-chip', this.root),
      events: $('.chat-events', this.root),
    }

    this.el.list.addEventListener('scroll', () => this.onScroll(), { passive: true })
    $('.chat-cmds-btn', this.root).addEventListener('click', () => this.toggleBotCommands())
    // La liste change de hauteur (message épinglé déplié, clavier, fenêtre) :
    // on reste calé en bas si on suivait, sinon le suivi semble s'arrêter.
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { if (this.stick) this.scrollToBottom() }).observe(this.el.list)
    }
    this.el.resume.addEventListener('click', () => this.scrollToBottom(true))
    this.el.list.addEventListener('click', (e) => this.onListClick(e))
    $('.chat-hide', this.root).addEventListener('click', () => this.o.onHide?.())
    // Masqué, le message épinglé reste à portée : une punaise dans l'en-tête.
    this.el.pinBtn.addEventListener('click', () => {
      this.dismissedPin = null
      this.el.pinBtn.hidden = true
      if (this.pin) { this.el.pinned.hidden = true; this.renderPinned(this.pin, true) }
    })
    this.el.pinned.addEventListener('click', (e) => {
      if (e.target.closest('a')) return
      // Pseudo mentionné dans le message épinglé : même fiche que dans la liste.
      const mention = e.target.closest('[data-user]')
      if (mention) { this.onListClick(e); return }
      if (e.target.closest('[data-pin-close]')) {
        // Réduit en pastille plutôt que de disparaître : un toucher le rouvre.
        this.dismissedPin = this.pin?.id ?? null
        this.el.pinned.hidden = true
        this.el.pinBtn.hidden = false
        return
      }
      // Déplier n'a de sens que si le texte dépasse.
      if (!this.el.pinned.classList.contains('can-open')) return
      // Déplié, le message passe par-dessus le chat : la boîte garde sa
      // hauteur repliée, la liste ne bouge pas et continue de défiler.
      const box = this.el.pinned
      if (!box.classList.contains('open')) box.style.height = `${box.offsetHeight}px`
      const open = box.classList.toggle('open')
      if (!open) box.style.height = ''
      $('[data-pin-toggle]', this.el.pinned)?.setAttribute('aria-expanded', String(open))
    })

    this.el.input.addEventListener('keydown', (e) => this.onKey(e))
    this.el.input.addEventListener('input', () => this.updateSuggestions())
    this.el.input.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 150))
    this.el.send.addEventListener('click', () => this.submit())
    this.el.emoteBtn.addEventListener('click', () => this.togglePicker())
    this.el.emoteSearch.addEventListener('input', debounce(() => this.renderPicker(), 120))
    this.el.grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-emote]')
      if (b) this.insertText(b.dataset.emote)
    })
    this.el.suggest.addEventListener('mousedown', (e) => {
      const b = e.target.closest('[data-i]')
      if (b) { e.preventDefault(); this.applySuggestion(Number(b.dataset.i)) }
    })
    $('button', this.el.replying).addEventListener('click', () => this.setReply(null))
    this.el.login.addEventListener('click', () => this.o.onLogin())
    this.el.card.addEventListener('click', (e) => this.onCardClick(e))
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.hideCard(); this.hidePicker() }
    })

    this.applyPrefs()
  }

  applyPrefs() {
    const p = this.o.prefs
    this.root.style.setProperty('--chat-size', `${p.chatSize}px`)
    this.root.classList.toggle('show-time', Boolean(p.timestamps))
  }

  // ── Ouverture / fermeture ──────────────────────────────────────────────
  openLive({ channel, channelId }) {
    this.close()
    this.mode = 'live'
    this.channel = channel
    this.authFailed = false
    this.el.title.textContent = t('chat')
    this.setStatus('connecting')
    this.refreshComposer()
    const s = this.o.session()
    this.client = new LiveChat({
      channel,
      channelId,
      token: s.canChat ? s.token : null,
      login: s.canChat ? s.login : null,
      loadRecent: this.o.prefs.loadHistory,
      onEvent: (type, payload) => this.onEvent(type, payload),
    })
    this.client.start()
    this.startPinned(channel)
  }

  // ── Message épinglé ────────────────────────────────────────────────────
  /** Interrogé à l'ouverture puis toutes les 30 s : un épinglage peut
   *  arriver, changer ou disparaître en cours de live. */
  startPinned(channel) {
    clearInterval(this.pinTimer)
    const load = async () => {
      // Onglet en arrière-plan : inutile d'interroger Twitch.
      if (document.hidden && this.pin !== undefined) return
      let pin = null
      try { pin = await fetchPinned(channel) } catch { return }
      if (this.mode !== 'live' || this.channel !== channel) return
      // Un nouvel épinglage attend le retard du chat synchronisé : il ne doit
      // pas apparaître avant l'image qui le montre.
      const delay = pin && pin.id !== this.pin?.id && this.pin !== undefined ? this.o.getDelay?.() ?? 0 : 0
      if (delay >= 0.5) setTimeout(() => { if (this.channel === channel && this.mode === 'live') this.renderPinned(pin) }, delay * 1000)
      else this.renderPinned(pin)
    }
    this.pin = undefined
    load()
    this.pinTimer = setInterval(load, 20_000)
  }

  renderPinned(pin, force = false) {
    const box = this.el.pinned
    const changed = force || pin?.id !== this.pin?.id
    this.pin = pin
    clearTimeout(this.pinExpiry)
    // La pastille n'a de sens que s'il y a un message épinglé réduit.
    this.el.pinBtn.hidden = !pin || pin.id !== this.dismissedPin
    if (!pin || pin.id === this.dismissedPin) { box.hidden = true; return }
    // Fin programmée : masqué à l'échéance, sans attendre la prochaine requête.
    if (pin.endsAt) {
      const left = pin.endsAt - Date.now()
      if (left <= 0) { this.renderPinned(null); return }
      this.pinExpiry = setTimeout(() => { if (this.pin?.id === pin.id) this.renderPinned(null) }, left)
    }
    if (!changed && !box.hidden) { this.updatePinMeta(); return }

    box.classList.remove('open', 'can-open')
    box.style.height = ''
    const badges = pin.badges.map((b) => `<img class="badge" src="${esc(b.url)}" alt="" title="${esc(b.set)}">`).join('')
    box.innerHTML = `<div class="pin-panel">
      <div class="pin-row">
        <span class="pin-ic">${icon('pin', 14)}</span>
        <div class="pin-body">${badges}<span class="pin-sender" style="color:${esc(pin.color)}">${esc(pin.sender)}</span><span class="pin-colon">:</span> ${this.renderTokens(pin.tokens, this.o.session().login)}</div>
        <button class="icon-btn xs pin-toggle" type="button" data-pin-toggle aria-expanded="false" aria-label="${esc(t('pinned'))}" hidden>${icon('chevronDown', 16)}</button>
        <button class="icon-btn xs" type="button" data-pin-close aria-label="${esc(t('close'))}">${icon('x', 14)}</button>
      </div>
      <div class="pin-meta"></div>
      ${pin.endsAt && pin.startsAt ? '<div class="pin-progress"><i></i></div>' : ''}</div>`
    for (const img of box.querySelectorAll('img.badge')) img.addEventListener('error', () => img.remove(), { once: true })
    box.hidden = false
    this.updatePinMeta()

    // Chevron seulement si le texte est coupé.
    requestAnimationFrame(() => {
      const body = $('.pin-body', box)
      if (body && body.scrollWidth > body.clientWidth + 1) {
        box.classList.add('can-open')
        $('[data-pin-toggle]', box).hidden = false
      }
    })
    // Barre de durée : part de la fraction restante et file jusqu'à zéro.
    const bar = $('.pin-progress i', box)
    if (bar) {
      const total = pin.endsAt - pin.startsAt
      const left = pin.endsAt - Date.now()
      bar.style.transform = `scaleX(${Math.max(0, Math.min(1, left / total))})`
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bar.style.transition = `transform ${left}ms linear`
        bar.style.transform = 'scaleX(0)'
      }))
    }
  }

  /** Changement signalé en temps réel (Hermes) : relecture immédiate. */
  refreshPinned() {
    if (this.mode !== 'live' || !this.channel) return
    const channel = this.channel
    fetchPinned(channel).then((pin) => {
      if (this.mode === 'live' && this.channel === channel) this.renderPinned(pin)
    }).catch(() => {})
  }

  // ── Raid ───────────────────────────────────────────────────────────────
  /** Bandeau « X part en raid chez Y » avec compte à rebours. */
  showRaid(raid, { onFollow, onCancel, auto }) {
    let box = $('.chat-raid', this.el.events)
    if (!box) {
      box = document.createElement('div')
      box.className = 'chat-raid'
      this.el.events.prepend(box)
    }
    const target = esc(raid.target_display_name || raid.target_login || '')
    const avatar = /^https:\/\//.test(raid.target_profile_image ?? '') ? raid.target_profile_image.replace('%s', '70x70') : ''
    box.innerHTML = `
      ${avatar ? `<img class="raid-avatar" src="${esc(avatar)}" alt="">` : `<span class="raid-avatar">${icon('users', 16)}</span>`}
      <div class="raid-text">
        <b>${esc(t('raid_title', { u: target }))}</b>
        <span class="raid-sub">${esc(t('raid_viewers', { n: raid.viewer_count ?? 0 }))}${auto ? ` · <span class="raid-count"></span>` : ''}</span>
      </div>
      <button class="btn primary sm" type="button" data-raid-follow>${esc(t('raid_follow'))}</button>
      ${auto ? `<button class="icon-btn xs" type="button" data-raid-cancel aria-label="${esc(t('cancel'))}">${icon('x', 14)}</button>` : ''}`
    $('[data-raid-follow]', box).onclick = () => onFollow()
    const cancel = $('[data-raid-cancel]', box)
    if (cancel) cancel.onclick = () => { onCancel(); this.hideRaid() }
    // Compte à rebours jusqu'au départ (le streamer peut le lancer avant).
    clearInterval(this.raidTimer)
    const ends = Date.now() + (raid.force_raid_now_seconds ?? 90) * 1000
    const tickRaid = () => {
      const el = $('.raid-count', box)
      if (el) el.textContent = t('raid_in', { n: Math.max(0, Math.ceil((ends - Date.now()) / 1000)) })
    }
    tickRaid()
    this.raidTimer = setInterval(tickRaid, 1000)
  }

  hideRaid() {
    clearInterval(this.raidTimer)
    $('.chat-raid', this.el.events)?.remove()
  }

  // ── Prédiction ─────────────────────────────────────────────────────────
  /** Carte de prédiction en lecture seule : issues en %, points, compte à
   *  rebours, puis l'issue gagnante une minute après la résolution. */
  setPrediction(ev) {
    clearInterval(this.predTimer)
    clearTimeout(this.predHide)
    let box = $('.chat-pred', this.el.events)
    const status = ev?.status
    if (!ev || status === 'CANCELED' || status === 'CANCEL_PENDING') { box?.remove(); return }
    if (!box) {
      box = document.createElement('div')
      box.className = 'chat-pred'
      this.el.events.append(box)
      box.addEventListener('click', () => box.classList.toggle('open'))
    }
    const outcomes = ev.outcomes ?? []
    const total = Math.max(1, outcomes.reduce((n, o) => n + (o.total_points ?? 0), 0))
    const winner = ev.winning_outcome_id
    const colors = { BLUE: '#387aff', PINK: '#f5009b' }
    box.innerHTML = `
      <div class="pred-head">
        ${icon('sparkles', 14)}
        <b>${esc(ev.title ?? '')}</b>
        <span class="pred-state">${esc(status === 'RESOLVED' ? t('pred_result') : status === 'LOCKED' ? t('pred_locked') : '')}</span>
      </div>
      <div class="pred-body">
        ${outcomes.map((o) => {
          const pct = Math.round(((o.total_points ?? 0) / total) * 100)
          const color = winner && winner !== o.id ? 'var(--muted)' : colors[o.color] ?? 'var(--purple)'
          return `<div class="pred-row${winner === o.id ? ' win' : ''}">
            <div class="pred-label"><span>${winner === o.id ? '🏆 ' : ''}${esc(o.title ?? '')}</span><span>${pct}% · ${esc(formatPoints(o.total_points ?? 0))} · ${esc(String(o.total_users ?? 0))} 👤</span></div>
            <div class="pred-bar"><i style="width:${pct}%;background:${color}"></i></div>
          </div>`
        }).join('')}
      </div>`
    if (status === 'ACTIVE' && ev.created_at && ev.prediction_window_seconds) {
      const ends = Date.parse(ev.created_at) + ev.prediction_window_seconds * 1000
      const el = $('.pred-state', box)
      const tickPred = () => {
        const s = Math.max(0, Math.round((ends - Date.now()) / 1000))
        el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
      }
      tickPred()
      this.predTimer = setInterval(tickPred, 1000)
    }
    if (status === 'RESOLVED') this.predHide = setTimeout(() => box.remove(), 60_000)
  }

  /** « Épinglé par X · il y a 3 min · 12 min restantes » */
  updatePinMeta() {
    const pin = this.pin
    const meta = pin && $('.pin-meta', this.el.pinned)
    if (!meta) return
    const parts = [pin.pinnedBy ? t('pinned_by', { u: pin.pinnedBy }) : t('pinned')]
    const ago = (ms) => {
      const m = Math.floor(ms / 60000)
      return m < 1 ? t('just_now') : m < 60 ? t('minutes_ago', { n: m }) : t('hours_ago', { n: Math.floor(m / 60) })
    }
    if (pin.startsAt) parts.push(ago(Date.now() - pin.startsAt))
    if (pin.endsAt) parts.push(t('pin_left', { n: Math.max(1, Math.ceil((pin.endsAt - Date.now()) / 60000)) }))
    meta.textContent = parts.join(' · ')
  }

  openVod({ videoId, channelId, channelLogin, startAt }) {
    this.close()
    this.mode = 'vod'
    this.channel = channelLogin
    this.el.title.textContent = t('chat_vod')
    this.el.composer.hidden = true
    this.setStatus('connecting')
    this.client = new VodChat({
      videoId, channelId, channelLogin,
      onEvent: (type, payload) => this.onEvent(type, payload),
    })
    this.client.start(startAt || 0)
  }

  /** Temps de lecture, pour le chat des VODs. */
  tick(seconds) {
    if (this.mode === 'vod') this.client?.tick(seconds)
  }

  close() {
    clearInterval(this.pinTimer)
    clearTimeout(this.pinExpiry)
    clearInterval(this.raidTimer)
    clearInterval(this.predTimer)
    clearTimeout(this.predHide)
    this.el.events.innerHTML = ''
    clearInterval(this.delayTimer)
    this.delayTimer = null
    this.delayed = []
    this.pin = null
    this.dismissedPin = null
    this.el.pinned.hidden = true
    this.el.pinBtn.hidden = true
    this.client?.stop()
    this.client = null
    this.mode = null
    cancelAnimationFrame(this.frame)
    this.queue = []
    this.messages = []
    this.el.list.replaceChildren()
    this.el.empty.hidden = true
    this.pending = 0
    this.stick = true
    this.el.resume.hidden = true
    this.setReply(null)
    this.hideCard()
    this.hidePicker()
    this.hideSuggestions()
  }

  /** La session a changé (connexion, déconnexion) : on reconnecte le live. */
  sessionChanged() {
    if (this.mode === 'live' && this.channel) {
      this.openLive({ channel: this.channel, channelId: this.client?.o.channelId ?? null })
    }
  }

  // ── Évènements du client ───────────────────────────────────────────────
  onEvent(type, payload) {
    switch (type) {
      case 'status':
        this.setStatus(payload)
        // Rediffusion : rien ne s'affiche avant le premier message de la
        // vidéo. Sans indication, un panneau vide passe pour une panne.
        if (payload === 'connected' && this.mode === 'vod' && !this.el.list.childElementCount) {
          this.el.empty.textContent = t('chat_vod_empty')
          this.el.empty.hidden = false
        }
        if (payload === 'auth-failed') {
          this.enqueue(systemMessage(t('chat_rescope')))
          this.refreshComposer(true)
        }
        if (payload === 'connected') this.refreshComposer()
        break
      case 'add':
        this.el.empty.hidden = true
        if (!this.isFiltered(payload)) this.deliver(payload)
        break
      case 'batch':
        this.el.empty.hidden = true
        for (const m of payload) if (!this.isFiltered(m)) this.enqueue(m)
        break
      case 'prepend':
        this.prepend(payload.filter((m) => (this.o.prefs.keepDeleted || !m.isDeleted) && !this.isFiltered(m)))
        break
      case 'moderate':
        // Les messages encore en attente sont modérés aussi : sinon un
        // message supprimé apparaîtrait quelques secondes après sa suppression.
        for (const d of this.delayed) {
          if (payload.id ? d.msg.id === payload.id : d.msg.userName === payload.user) d.msg.isDeleted = true
        }
        if (!this.o.prefs.keepDeleted) this.delayed = this.delayed.filter((d) => !d.msg.isDeleted)
        this.moderate(payload)
        break
      case 'clear':
        this.delayed = []
        this.messages = []
        this.queue = []
        this.el.list.replaceChildren()
        this.stick = true
        this.el.resume.hidden = true
        break
      case 'empty':
        this.el.empty.textContent = t('chat_vod_empty')
        this.el.empty.hidden = false
        break
    }
  }

  setStatus(state) {
    const s = this.el.status
    s.dataset.state = state
    s.textContent = state === 'connecting' ? t('chat_connecting')
      : state === 'disconnected' ? t('chat_disconnected') : ''
  }

  // ── Rendu des messages ─────────────────────────────────────────────────
  /**
   * Synchronisation avec l'image. Le chat arrive en temps réel, la vidéo avec
   * plusieurs secondes de retard : sans compensation, on lit la réaction
   * avant de voir ce qui la provoque. Chaque message est retenu le temps du
   * retard mesuré à son arrivée, puis affiché. Nos propres messages, eux,
   * s'affichent tout de suite.
   */
  deliver(msg) {
    const delay = this.mode === 'live' && !msg.isSelf ? (this.o.getDelay?.() ?? 0) : 0
    if (delay < 0.5) { this.enqueue(msg); return }
    this.delayed.push({ msg, at: Date.now() + delay * 1000 })
    if (!this.delayTimer) this.delayTimer = setInterval(() => this.releaseDelayed(), 100)
  }

  releaseDelayed() {
    const now = Date.now()
    let n = 0
    while (n < this.delayed.length && this.delayed[n].at <= now) n++
    if (n) for (const d of this.delayed.splice(0, n)) this.enqueue(d.msg)
    if (!this.delayed.length) { clearInterval(this.delayTimer); this.delayTimer = null }
  }

  /** Les chats très actifs envoient des dizaines de messages par seconde :
   *  on les regroupe par image pour ne recalculer la mise en page qu'une fois. */
  enqueue(msg) {
    this.queue.push(msg)
    if (!this.frame) this.frame = requestAnimationFrame(() => this.flush())
  }

  flush() {
    this.frame = 0
    if (!this.queue.length) return
    const batch = this.queue.splice(0)
    const frag = document.createDocumentFragment()
    for (const m of batch) frag.appendChild(this.renderMessage(m))
    this.messages.push(...batch)
    if (this.messages.length > MAX_NODES * 2) this.messages.splice(0, this.messages.length - MAX_NODES * 2)
    this.el.list.appendChild(frag)

    const extra = this.el.list.childElementCount - MAX_NODES
    // En pause, on ne retire rien : le texte qu'on est en train de lire ne
    // doit pas glisser sous les yeux.
    if (extra > 0 && this.stick) for (let i = 0; i < extra; i++) this.el.list.firstElementChild?.remove()
    // En pause aussi, une limite haute : un chat très actif laissé remonté
    // accumulait des nœuds sans fin.
    else if (extra > MAX_NODES * 4) for (let i = 0; i < extra - MAX_NODES * 4; i++) this.el.list.firstElementChild?.remove()

    if (this.stick) this.scrollToBottom()
    else {
      this.pending += batch.filter((m) => !m.systemMsg).length
      this.showResume()
    }
  }

  prepend(older) {
    const known = new Set(this.messages.map((m) => m.id))
    const fresh = older.filter((m) => !known.has(m.id))
    if (!fresh.length) return
    const frag = document.createDocumentFragment()
    for (const m of fresh) frag.appendChild(this.renderMessage(m))
    const sep = document.createElement('div')
    sep.className = 'msg-sep'
    sep.textContent = t('chat_history')
    frag.appendChild(sep)
    this.el.list.prepend(frag)
    this.messages.unshift(...fresh)
    if (this.stick) this.scrollToBottom()
  }

  renderMessage(m) {
    const div = document.createElement('div')
    if (m.notice === 'raid') {
      // Raid entrant : carte avec un lien vers la chaîne qui arrive.
      div.className = 'msg sys notice-raid'
      div.innerHTML = `${icon('users', 15)}<span>${esc(m.systemMsg || t('raid_incoming', { u: m.raiderName, n: m.viewers }))}</span>`
        + (m.raider ? `<button class="btn ghost xs" type="button" data-open-channel="${esc(m.raider)}">${esc(t('see_channel'))}</button>` : '')
      return div
    }
    if (m.systemMsg) {
      div.className = 'msg sys' + (m.notice === 'sub' ? ' notice-sub' : '')
      div.textContent = m.systemMsg
      return div
    }

    const me = this.o.session().login
    const words = this.o.prefs.highlightWords ?? []
    // Mentionné (avec ou sans @) ou mot-clé surveillé : surligné.
    const mentionsMe = !m.isSelf && m.tokens.some((tk) => {
      const v = String(tk.value ?? '').toLowerCase().replace(/^@/, '').replace(/[.,!?:;]+$/, '')
      return (me && (tk.kind === 'mention' || tk.kind === 'text') && v === me)
        || (tk.kind === 'text' && words.includes(v))
    })
    div.className = 'msg'
      + (m.announce ? ' announce' : '')
      + (m.isHighlight ? ' hl' : '')
      + (m.isFirstMessage ? ' first' : '')
      + (mentionsMe ? ' me' : '')
      + (m.isHistorical && this.mode === 'live' ? ' old' : '')
      + (m.isDeleted ? ' deleted' : '')
    div.dataset.id = m.id
    div.dataset.user = m.userName
    if (m.announce) div.style.setProperty('--announce', m.announce)

    let html = ''
    if (m.replyTo) {
      html += `<div class="msg-reply">${icon('reply', 12)}<span>${esc(t('reply_to', { u: m.replyTo }))}${m.replyBody ? ` : ${esc(m.replyBody)}` : ''}</span></div>`
    }
    const time = this.mode === 'vod' && m.offset !== null
      ? formatClock(m.offset)
      : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    html += `<span class="msg-time">${esc(time)}</span>`
    m.badgeList ??= parseBadgeTag(m.badgeTag)
    // Une image en échec garderait sa place, vide, et décalerait le pseudo.
    for (const b of m.badgeList) html += `<img class="badge" src="${esc(b.url)}" alt="" title="${esc(b.set)}" onerror="this.remove()">`
    html += `<button class="msg-name" type="button" style="color:${esc(m.color)}">${esc(m.displayName)}</button>`
    html += m.isAction ? ' ' : '<span class="msg-colon">: </span>'
    html += `<span class="msg-body"${m.isAction ? ` style="color:${esc(m.color)}"` : ''}>${this.renderTokens(m.tokens, me)}</span>`
    div.innerHTML = html
    return div
  }

  renderTokens(tokens, me) {
    return tokens.map((tk) => {
      switch (tk.kind) {
        case 'emote':
          return `<img class="emote" src="${esc(tk.emote.url)}" alt="${esc(tk.emote.name)}" title="${esc(tk.emote.name)}" loading="lazy" decoding="async" onerror="this.replaceWith(this.alt)">`
        case 'mention': {
          const self = me && tk.value.toLowerCase() === me ? ' self' : ''
          return `<span class="mention${self}" data-user="${esc(tk.value.toLowerCase())}">@${esc(tk.value)}</span>`
        }
        case 'link': {
          const href = /^https?:\/\//i.test(tk.value) ? tk.value : `https://${tk.value}`
          // Lien de clip : lu ici plutôt que sur Twitch.
          const clip = clipSlugFrom(tk.value)
          return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer nofollow"${clip ? ` data-clip-link="${esc(clip)}"` : ''}>${esc(tk.value)}</a>`
        }
        default:
          return esc(tk.value)
      }
    }).join(' ')
  }

  moderate({ id, user }) {
    const nodes = id
      ? this.el.list.querySelectorAll(`[data-id="${CSS.escape(id)}"]`)
      : this.el.list.querySelectorAll(`[data-user="${CSS.escape(user)}"]`)
    for (const n of nodes) {
      if (this.o.prefs.keepDeleted) n.classList.add('deleted')
      else n.remove()
    }
    for (const m of this.messages) if (id ? m.id === id : m.userName === user) m.isDeleted = true
  }

  // ── Défilement ─────────────────────────────────────────────────────────
  onScroll() {
    const l = this.el.list
    const atBottom = l.scrollHeight - l.scrollTop - l.clientHeight < 40
    if (atBottom && !this.stick) {
      this.stick = true
      this.pending = 0
      this.el.resume.hidden = true
    } else if (!atBottom && this.stick && !this.autoScrolling) {
      this.stick = false
      this.showResume()
    }
  }

  scrollToBottom(force = false) {
    const l = this.el.list
    this.autoScrolling = true
    l.scrollTop = l.scrollHeight
    requestAnimationFrame(() => { this.autoScrolling = false })
    if (force) {
      this.stick = true
      this.pending = 0
      this.el.resume.hidden = true
    }
  }

  showResume() {
    const span = $('span', this.el.resume)
    span.textContent = this.pending > 0 ? t('chat_new', { n: this.pending > 99 ? '99+' : this.pending }) : t('chat_paused')
    this.el.resume.hidden = false
  }

  // ── Saisie ─────────────────────────────────────────────────────────────
  refreshComposer(rescope = false) {
    if (this.mode !== 'live') { this.el.composer.hidden = true; return }
    this.el.composer.hidden = false
    this.authFailed ||= rescope
    const s = this.o.session()
    // Le champ s'affiche dès que le jeton a les droits, sans attendre la
    // fin de la connexion : sinon « Connecte-toi pour écrire » clignotait
    // à chaque ouverture pour quelqu'un de déjà connecté.
    const writable = s.canChat && !this.authFailed
    this.el.inputRow.hidden = !writable
    this.el.login.hidden = writable
    if (writable) {
      const ready = Boolean(this.client?.canSend)
      this.el.input.placeholder = ready ? t('chat_send_ph') : t('chat_connecting')
      this.el.input.disabled = !ready
      this.el.send.disabled = !ready
    } else {
      this.el.login.textContent = (this.authFailed || s.needRescope) ? t('chat_rescope') : t('chat_readonly')
    }
  }

  submit() {
    const text = this.el.input.value.trim()
    if (!text || !this.client?.send) return
    if (this.client.send(text, this.replyTo?.id)) {
      this.el.input.value = ''
      this.setReply(null)
      this.hideSuggestions()
      this.scrollToBottom(true)
    }
  }

  onKey(e) {
    if (!this.el.suggest.hidden && this.suggestions.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const n = this.suggestions.length
        this.suggestIndex = (this.suggestIndex + (e.key === 'ArrowDown' ? 1 : n - 1)) % n
        this.renderSuggestions()
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && this.suggestIndex >= 0)) {
        e.preventDefault()
        this.applySuggestion(this.suggestIndex)
        return
      }
      if (e.key === 'Escape') { this.hideSuggestions(); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.submit()
    }
  }

  /** Mot en cours de frappe, juste avant le curseur. */
  currentWord() {
    const v = this.el.input.value
    const caret = this.el.input.selectionStart ?? v.length
    const start = v.lastIndexOf(' ', caret - 1) + 1
    return { word: v.slice(start, caret), start, end: caret }
  }

  updateSuggestions() {
    const { word } = this.currentWord()
    if (word.startsWith('@') && word.length >= 2) {
      const kw = word.slice(1).toLowerCase()
      const names = new Map()
      for (let i = this.messages.length - 1; i >= 0 && names.size < 40; i--) {
        const m = this.messages[i]
        if (m.userName && !names.has(m.userName)) names.set(m.userName, m)
      }
      for (const n of this.client?.present ?? []) if (!names.has(n)) names.set(n, null)
      this.suggestions = [...names.keys()]
        .filter((n) => n.startsWith(kw))
        .slice(0, 8)
        .map((n) => ({ kind: 'user', value: `@${names.get(n)?.displayName ?? n}`, label: names.get(n)?.displayName ?? n, color: names.get(n)?.color }))
    } else if (word.length >= 2) {
      this.suggestions = suggestEmotes(word, 8).map((e) => ({ kind: 'emote', value: e.name, label: e.name, url: e.url }))
    } else {
      this.suggestions = []
    }
    this.suggestIndex = 0
    this.renderSuggestions()
  }

  renderSuggestions() {
    if (!this.suggestions.length) return this.hideSuggestions()
    this.el.suggest.innerHTML = this.suggestions.map((s, i) => `
      <button type="button" class="suggest-item${i === this.suggestIndex ? ' active' : ''}" data-i="${i}" role="option">
        ${s.kind === 'emote' ? `<img src="${esc(s.url)}" alt="">` : `<span class="dot" style="background:${esc(s.color ?? '#bf94ff')}"></span>`}
        <span>${esc(s.label)}</span>
      </button>`).join('')
    this.el.suggest.hidden = false
  }

  hideSuggestions() {
    this.el.suggest.hidden = true
    this.suggestions = []
  }

  applySuggestion(i) {
    const s = this.suggestions[i]
    if (!s) return
    const { start, end } = this.currentWord()
    const v = this.el.input.value
    const next = `${v.slice(0, start)}${s.value} ${v.slice(end)}`
    this.el.input.value = next
    const caret = start + s.value.length + 1
    this.el.input.setSelectionRange(caret, caret)
    this.el.input.focus()
    this.hideSuggestions()
  }

  // ── Commandes des bots ─────────────────────────────────────────────────
  async toggleBotCommands() {
    const box = $('.bot-cmds', this.root)
    if (!box.hidden) { box.hidden = true; return }
    const channel = this.channel
    if (!channel) return
    box.hidden = false
    box.innerHTML = `<div class="bot-cmds-head">${icon('terminal', 16)}<b>${esc(t('bot_commands'))}</b>
        <button class="icon-btn xs" type="button" data-close>${icon('x', 16)}</button></div>
      <input class="bot-cmds-filter" type="search" autocomplete="off" placeholder="${esc(t('bot_commands_filter'))}">
      <div class="bot-cmds-list"><p class="muted small">${esc(t('loading'))}</p></div>`
    box.querySelector('[data-close]').onclick = () => { box.hidden = true }
    const sets = await fetchBotCommands(channel)
    if (box.hidden || this.channel !== channel) return
    const list = box.querySelector('.bot-cmds-list')
    const render = (q = '') => {
      q = q.trim().toLowerCase()
      const shown = sets.map((s) => ({ ...s, commands: q ? s.commands.filter((c) => c.name.toLowerCase().includes(q) || c.response.toLowerCase().includes(q)) : s.commands }))
        .filter((s) => s.commands.length)
      list.innerHTML = !sets.length
        ? `<p class="muted small">${esc(t('bot_commands_none'))}</p>`
        : shown.map((s) => `<section><h4><img src="${esc(s.icon)}" alt="">${esc(s.bot)} <span class="muted">${s.commands.length}</span></h4>
            ${s.commands.map((c) => `<button type="button" class="bot-cmd" data-cmd="${esc(c.name)}"><code>${esc(c.name)}</code>${c.response ? `<span>${esc(c.response)}</span>` : ''}</button>`).join('')}</section>`).join('')
    }
    render()
    box.querySelector('.bot-cmds-filter').oninput = (e) => render(e.target.value)
    list.onclick = async (e) => {
      const b = e.target.closest('[data-cmd]')
      if (!b) return
      // On peut écrire : la commande va dans le champ ; sinon elle est copiée.
      if (!this.el.composer.hidden && this.o.session().canChat) {
        box.hidden = true
        this.insertText(b.dataset.cmd)
      } else {
        try { await navigator.clipboard.writeText(b.dataset.cmd); b.classList.add('copied'); setTimeout(() => b.classList.remove('copied'), 900) } catch {}
      }
    }
  }

  insertText(text) {
    const input = this.el.input
    const v = input.value
    const caret = input.selectionStart ?? v.length
    const before = v.slice(0, caret)
    const pad = before && !before.endsWith(' ') ? ' ' : ''
    input.value = `${before}${pad}${text} ${v.slice(caret)}`
    const pos = caret + pad.length + text.length + 1
    input.setSelectionRange(pos, pos)
    input.focus()
  }

  setReply(msg) {
    this.replyTo = msg
    this.el.replying.hidden = !msg
    if (msg) {
      $('span', this.el.replying).textContent = t('reply_to', { u: msg.displayName })
      this.el.input.focus()
    }
  }

  // ── Sélecteur d'emotes ─────────────────────────────────────────────────
  togglePicker() {
    if (this.el.picker.hidden) {
      this.el.picker.hidden = false
      this.el.emoteSearch.value = ''
      this.renderPicker()
    } else this.hidePicker()
  }

  hidePicker() { this.el.picker.hidden = true }

  renderPicker() {
    const kw = this.el.emoteSearch.value.trim().toLowerCase()
    const { channel, global } = emoteCatalog()
    const filter = (list) => (kw ? list.filter((e) => e.name.toLowerCase().includes(kw)) : list)
    const section = (title, list) => list.length ? `
      <div class="emote-section">${esc(title)}</div>
      <div class="emote-cells">${list.slice(0, 400).map((e) =>
        `<button type="button" data-emote="${esc(e.name)}" title="${esc(e.name)}"><img src="${esc(e.url)}" alt="${esc(e.name)}" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''
    this.el.grid.innerHTML = section(t('emotes_channel'), filter(channel)) + section(t('emotes_global'), filter(global))
  }

  // ── Fiche utilisateur ──────────────────────────────────────────────────
  onListClick(e) {
    const clip = e.target.closest('[data-clip-link]')
    if (clip && this.o.onOpenClip) { e.preventDefault(); return this.o.onOpenClip(clip.dataset.clipLink) }
    const open = e.target.closest('[data-open-channel]')
    if (open) return this.o.onOpenChannel?.(open.dataset.openChannel)
    const mention = e.target.closest('.mention')
    if (mention) return this.showCard(mention.dataset.user, null)
    const row = e.target.closest('.msg:not(.sys)')
    if (!row || e.target.closest('a')) return
    const msg = this.messages.find((m) => m.id === row.dataset.id)
    this.showCard(row.dataset.user, msg)
  }

  /** Filtres du chat (réglages) : utilisateurs masqués, bots, commandes,
   *  mots masqués. Nos propres messages et ceux du système passent toujours. */
  isFiltered(m) {
    if (m.isSelf || (m.userId === 'system' && !m.userName)) return false
    const p = this.o.prefs
    const login = String(m.userName || '').toLowerCase()
    if (login && p.blockedUsers?.includes(login)) return true
    if (p.hideBots && KNOWN_BOTS.has(login)) return true
    const text = m.tokens.map((tk) => tk.value ?? tk.emote?.name ?? '').join(' ')
    if (p.hideCommands && text.trimStart().startsWith('!')) return true
    if (p.mutedWords?.length) {
      const low = text.toLowerCase()
      if (p.mutedWords.some((w) => low.includes(w))) return true
    }
    return false
  }

  /** Masquer / réafficher quelqu'un (fiche utilisateur). */
  toggleBlocked(login) {
    const p = this.o.prefs
    const list = new Set(p.blockedUsers ?? [])
    const hide = !list.has(login)
    if (hide) list.add(login); else list.delete(login)
    p.blockedUsers = [...list].slice(-500)
    this.o.onPrefsChange?.()
    if (hide) for (const n of this.el.list.querySelectorAll('.msg[data-user]')) if (n.dataset.user === login) n.remove()
    return hide
  }

  async showCard(login, msg) {
    if (!login) return
    const theirs = this.messages.filter((m) => m.userName === login).slice(-25)
    const ref = msg ?? theirs[theirs.length - 1]
    const name = ref?.displayName ?? login
    const color = ref?.color ?? '#bf94ff'
    const canReply = this.mode === 'live' && this.client?.canSend
    const card = this.el.card
    card.dataset.login = login
    card.dataset.msg = msg?.id ?? ''
    card.innerHTML = `
      <div class="user-card-head">
        <img class="avatar" alt="" hidden>
        <div class="user-card-id">
          <strong style="color:${esc(color)}">${esc(name)}</strong>
          <span class="muted">@${esc(login)}</span>
        </div>
        <button class="icon-btn sm" type="button" data-act="close">${icon('x', 18)}</button>
      </div>
      <div class="user-card-actions">
        ${canReply ? `<button class="btn sm" type="button" data-act="mention">@ ${esc(t('mention'))}</button>
        ${msg ? `<button class="btn sm" type="button" data-act="reply">${icon('reply', 14)} ${esc(t('reply'))}</button>` : ''}` : ''}
        <button class="btn sm ghost" type="button" data-act="block">${icon(this.o.prefs.blockedUsers?.includes(login) ? 'eye' : 'eyeOff', 14)} ${esc(t(this.o.prefs.blockedUsers?.includes(login) ? 'unhide_user' : 'hide_user'))}</button>
      </div>
      <div class="user-card-label">${esc(t('user_messages'))}</div>
      <div class="user-card-msgs">${theirs.length
        ? theirs.map((m) => `<div class="uc-msg${m.isDeleted ? ' deleted' : ''}"><span class="msg-time">${esc(this.mode === 'vod' && m.offset !== null ? formatClock(m.offset) : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span> ${this.renderTokens(m.tokens, null)}</div>`).join('')
        : '<div class="muted">—</div>'}</div>`
    card.hidden = false
    const list = $('.user-card-msgs', card)
    list.scrollTop = list.scrollHeight

    // L'avatar n'est qu'un plus : chargé à part, sans retarder la fiche.
    try {
      const d = await gql('query($l: String!) { user(login: $l) { profileImageURL(width: 70) } }', { l: login })
      const url = d?.user?.profileImageURL
      const img = $('.avatar', card)
      if (url && card.dataset.login === login && img) { img.src = url; img.hidden = false }
    } catch {}
  }

  onCardClick(e) {
    const act = e.target.closest('[data-act]')?.dataset.act
    if (!act) return
    const card = this.el.card
    if (act === 'close') return this.hideCard()
    if (act === 'block') {
      const hidden = this.toggleBlocked(card.dataset.login)
      toast(t(hidden ? 'user_hidden' : 'user_unhidden', { u: card.dataset.login }))
      return this.hideCard()
    }
    if (act === 'mention') {
      const m = this.messages.find((x) => x.userName === card.dataset.login)
      this.insertText(`@${m?.displayName ?? card.dataset.login}`)
      this.hideCard()
    }
    if (act === 'reply') {
      const m = this.messages.find((x) => x.id === card.dataset.msg)
      if (m) this.setReply(m)
      this.hideCard()
    }
  }

  hideCard() { this.el.card.hidden = true }
}

export { plainText }

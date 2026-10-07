// ═══════════════════════════════════════════════════════════════════════════
//  Hermes : les événements temps réel de Twitch (successeur du PubSub).
//
//  Une seule connexion WebSocket par chaîne regardée, anonyme : raids,
//  prédictions, nombre de spectateurs, fin du live, changements de message
//  épinglé. Chaque notification transporte la même chaîne JSON que l'ancien
//  PubSub, décodée ici et remise à `onEvent(topic, data)`.
// ═══════════════════════════════════════════════════════════════════════════

import { GQL_CLIENT_ID } from '../api.js'
import { uid } from '../util.js'

const URL_ = `wss://hermes.twitch.tv/v1?clientId=${GQL_CLIENT_ID}`

export class Hermes {
  /** @param {{ topics: string[], onEvent: (topic: string, data: any) => void }} o */
  constructor(o) {
    this.o = o
    this.closed = false
    this.retryDelay = 2000
    this.subs = new Map()   // id d'abonnement → topic
    this.connect(URL_)
  }

  connect(url) {
    if (this.closed) return
    let ws
    try { ws = new WebSocket(url) } catch { return this.retry() }
    this.ws = ws
    ws.onmessage = (ev) => {
      if (ws !== this.ws) return
      let msg
      try { msg = JSON.parse(ev.data) } catch { return }
      this.lastSeen = Date.now()
      if (msg.type === 'welcome') {
        this.retryDelay = 2000
        this.keepalive = (msg.welcome?.keepaliveSec ?? 15) * 1000
        this.recoveryUrl = msg.welcome?.recoveryUrl
        this.subscribeAll()
        this.watch()
      } else if (msg.type === 'notification') {
        const topic = this.subs.get(msg.notification?.subscription?.id)
        const raw = msg.notification?.pubsub
        if (!topic || typeof raw !== 'string') return
        let data
        try { data = JSON.parse(raw) } catch { return }
        try { this.o.onEvent(topic, data) } catch (e) { console.error(e) }
      } else if (msg.type === 'reconnect' && msg.reconnect?.url) {
        // Le serveur demande de changer de nœud : on suit l'adresse donnée.
        this.reopen(msg.reconnect.url)
      }
    }
    ws.onclose = () => { if (ws === this.ws) this.retry() }
  }

  subscribeAll() {
    this.subs.clear()
    for (const topic of this.o.topics) {
      const id = uid()
      this.subs.set(id, topic)
      this.ws.send(JSON.stringify({
        type: 'subscribe', id: uid(),
        subscribe: { id, type: 'pubsub', pubsub: { topic } },
        timestamp: new Date().toISOString(),
      }))
    }
  }

  /** Sans keepalive dans le délai prévu, la connexion est morte : on relance. */
  watch() {
    clearInterval(this.watchdog)
    this.watchdog = setInterval(() => {
      if (Date.now() - (this.lastSeen ?? 0) > this.keepalive * 2 + 5000) this.reopen(URL_)
    }, 5000)
  }

  reopen(url) {
    const old = this.ws
    this.ws = null
    try { old?.close() } catch {}
    this.connect(url)
  }

  retry() {
    if (this.closed) return
    clearInterval(this.watchdog)
    clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => this.connect(URL_), this.retryDelay)
    this.retryDelay = Math.min(this.retryDelay * 2, 60_000)
  }

  stop() {
    this.closed = true
    clearInterval(this.watchdog)
    clearTimeout(this.retryTimer)
    const ws = this.ws
    this.ws = null
    try { ws?.close() } catch {}
  }
}

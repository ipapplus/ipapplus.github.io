// ═══════════════════════════════════════════════════════════════════════════
//  Chat d'une rediffusion, rejoué au rythme de la lecture.
//
//  Port de Sources/Chat/VodChatService.swift, avec une différence imposée :
//  la pagination par curseur (`comments(after:)`) est refusée par Twitch
//  (« failed integrity check »), en requête brute comme en requête
//  persistée. Seule la recherche par position passe. On avance donc par
//  positions : chaque page couvre un tronçon, la suivante repart du dernier
//  instant reçu, et les doublons du recouvrement sont écartés par identifiant.
// ═══════════════════════════════════════════════════════════════════════════

import { gql } from '../api.js'
import { fromVodComment } from './message.js'
import { loadChannelBadges, loadGlobalBadges } from './badges.js'
import { loadChannelEmotes, loadGlobalEmotes } from './emotes.js'

const QUERY = `query($id: ID!, $o: Int!) {
  video(id: $id) {
    comments(contentOffsetSeconds: $o) {
      edges { node {
        id contentOffsetSeconds createdAt
        commenter { login displayName }
        message { fragments { text emote { emoteID } } userColor userBadges { setID version } }
      } }
      pageInfo { hasNextPage }
    }
  }
}`

/** Avance d'avance : on charge la suite tant qu'il reste moins que ça. */
const LOOKAHEAD = 25
/** Au-delà de cet écart entre deux instants, c'est un saut, pas la lecture. */
const SEEK_THRESHOLD = 12
/** Après un saut, combien de messages antérieurs garder pour le contexte. */
const CONTEXT = 40

export class VodChat {
  /**
   * @param {object} o
   * @param {string} o.videoId
   * @param {string|null} o.channelId
   * @param {string|null} o.channelLogin
   * @param {(type: string, payload?: any) => void} o.onEvent
   */
  constructor(o) {
    this.o = o
    this.buffer = []          // commentaires reçus, triés par position
    this.known = new Set()    // identifiants déjà reçus
    this.shownUntil = -1      // position du dernier message affiché
    this.cursor = 0           // index du prochain message à afficher
    this.fetchedUntil = -1
    this.hasMore = true
    this.fetching = false
    this.lastT = null
    this.generation = 0
    this.closed = false
  }

  async start(startAt = 0) {
    const gen = ++this.generation
    // En reprise, la vidéo signale souvent 0 s avant de sauter à la position
    // enregistrée : sans ce garde-fou, le chat repartait du début puis
    // rechargeait aussitôt — deux requêtes et un clignotement.
    this.awaitingStart = startAt > 1
    await Promise.all([
      loadGlobalBadges(),
      loadChannelBadges(this.o.channelLogin),
      loadGlobalEmotes(),
      loadChannelEmotes(this.o.channelId, this.o.channelLogin),
    ])
    if (gen !== this.generation || this.closed) return
    this.ready = true
    this.emit('status', 'connected')
    // La lecture a pu avancer pendant le chargement des emotes.
    this.reset(this.lastT ?? startAt)
  }

  stop() {
    this.closed = true
    this.generation += 1
  }

  /** Appelé à chaque mise à jour du temps de lecture. */
  tick(t) {
    if (this.closed || !Number.isFinite(t)) return
    if (this.awaitingStart) {
      if (t < 1) return
      this.awaitingStart = false
    }
    // Emotes et badges pas encore là : on retient juste la position.
    if (!this.ready) { this.lastT = t; return }
    if (this.lastT !== null && (t < this.lastT - 2 || t - this.lastT > SEEK_THRESHOLD)) {
      this.reset(t)
      return
    }
    this.lastT = t
    this.flush(t)
    if (this.hasMore && !this.fetching && t + LOOKAHEAD > this.fetchedUntil) {
      // Rien encore reçu depuis le dernier saut (première page en échec) :
      // on repart de la position de lecture, pas du début de la vidéo.
      const first = this.fetchedUntil < 0
      this.fetch(Math.max(0, Math.floor(first ? t : this.fetchedUntil)), first)
    }
  }

  /** Saut dans la vidéo : on repart d'une liste vide à cet endroit. */
  reset(t) {
    this.generation += 1
    this.buffer = []
    this.known.clear()
    this.cursor = 0
    this.shownUntil = -1
    this.fetchedUntil = -1
    this.hasMore = true
    this.fetching = false
    this.lastT = t
    this.emit('clear')
    this.fetch(Math.max(0, Math.floor(t)), true)
  }

  async fetch(offset, afterSeek = false) {
    const gen = this.generation
    this.fetching = true
    let edges = []
    let hasNext = false
    try {
      const data = await gql(QUERY, { id: this.o.videoId, o: offset })
      edges = data?.video?.comments?.edges ?? []
      hasNext = Boolean(data?.video?.comments?.pageInfo?.hasNextPage)
    } catch {
      // Réseau : rien ne bouge, le prochain tick retentera la même position.
      // Traiter l'échec comme une page vide ferait croire à la fin du chat.
      setTimeout(() => { if (gen === this.generation) this.fetching = false }, 3000)
      return
    }
    if (gen !== this.generation || this.closed) return
    this.fetching = false

    let added = 0
    let maxOffset = this.fetchedUntil
    for (const e of edges) {
      const node = e?.node
      if (!node?.id || this.known.has(node.id)) continue
      this.known.add(node.id)
      const msg = fromVodComment(node)
      maxOffset = Math.max(maxOffset, msg.offset)
      this.buffer.push(msg)
      added++
    }
    if (added) this.buffer.sort((a, b) => a.offset - b.offset)

    // Une page sans rien de neuf ferait reboucler sur la même position :
    // on force l'avance de quelques secondes.
    this.fetchedUntil = added ? maxOffset : Math.max(this.fetchedUntil, offset) + 5
    this.hasMore = hasNext || added > 0

    if (afterSeek) {
      // Les messages juste avant la position donnent le fil de la
      // conversation ; on n'en garde qu'une poignée.
      const before = this.buffer.filter((m) => m.offset <= (this.lastT ?? 0))
      const skip = Math.max(0, before.length - CONTEXT)
      this.cursor = skip
      if (!this.buffer.length) this.emit('empty')
    }
    this.flush(this.lastT ?? 0)
  }

  flush(t) {
    const batch = []
    while (this.cursor < this.buffer.length && this.buffer[this.cursor].offset <= t) {
      batch.push(this.buffer[this.cursor])
      this.cursor++
    }
    if (batch.length) this.emit('batch', batch)
    // Les commentaires déjà affichés ne servent plus : sur une longue VOD,
    // le tampon gardait toute la discussion en mémoire.
    if (this.cursor > 1000) {
      this.buffer.splice(0, this.cursor - 200)
      this.cursor = 200
    }
    if (this.known.size > 20000) this.known.clear()
  }

  emit(type, payload) {
    this.o.onEvent(type, payload)
  }
}

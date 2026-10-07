// ═══════════════════════════════════════════════════════════════════════════
//  Du message brut (IRC en direct, ou commentaire de VOD) au message affiché.
//  Port de handlePrivmsg / tokenizeChatSegment (Sources/Chat/).
// ═══════════════════════════════════════════════════════════════════════════

import { resolveEmote, twitchEmote } from './emotes.js'
import { ircText, parseEmoteRanges, prefixNick, unescapeTag } from './irc.js'
import { uid } from '../util.js'

/**
 * Éclaircit une couleur de pseudo trop sombre pour rester lisible sur fond
 * noir. Port de `Color.readableChat` (Sources/Constants.swift).
 */
export function readableColor(hex) {
  const h = String(hex || '').trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  const n = Number.parseInt(h, 16)
  let r = ((n >> 16) & 0xff) / 255
  let g = ((n >> 8) & 0xff) / 255
  let b = (n & 0xff) / 255
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  const minLum = 0.45
  if (lum < minLum) {
    const f = Math.min(1, (minLum - lum) / minLum + 0.15)
    r += (1 - r) * f
    g += (1 - g) * f
    b += (1 - b) * f
  }
  const to255 = (v) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${to255(r)}${to255(g)}${to255(b)}`
}

/** Couleur stable pour qui n'en a pas choisi : Twitch fait pareil, à partir
 *  du pseudo, plutôt que de tout afficher dans la même teinte. */
const FALLBACK = ['#ff4f4d', '#5b99ff', '#00c853', '#b388ff', '#ff7f50', '#9acd32',
  '#ff69b4', '#1e90ff', '#ffb300', '#2ec4b6', '#daa520', '#bf94ff']
function fallbackColor(name) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK[h % FALLBACK.length]
}

/** Lien sans « https:// » (« t.me/x », « discord.gg/abc ») : seulement les
 *  extensions courantes, pour ne pas transformer « lol.xd » en lien. */
const BARE_LINK = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.(com|net|org|tv|gg|me|io|fr|be|ch|de|es|it|uk|co|app|dev|ly|link|to|ru|eu|xyz|shop|store)(\/\S*)?$/

/** Découpe un segment de texte libre en liens, mentions, emotes tierces et mots. */
export function tokenizeSegment(segment) {
  const out = []
  for (const word of segment.split(' ')) {
    if (!word) continue
    const lower = word.toLowerCase()
    if (/^(https?:\/\/|www\.)\S+\.\S+/.test(lower) || BARE_LINK.test(lower)) {
      out.push({ kind: 'link', value: word })
    } else if (word.startsWith('@') && word.length > 1) {
      out.push({ kind: 'mention', value: word.slice(1) })
    } else {
      const emote = resolveEmote(word)
      out.push(emote ? { kind: 'emote', emote } : { kind: 'text', value: word })
    }
  }
  return out
}

function base(overrides) {
  return {
    id: uid(),
    userId: '',
    userName: '',
    displayName: '',
    color: '#bf94ff',
    badgeTag: '',
    badgeList: null,
    tokens: [],
    timestamp: Date.now(),
    offset: null,
    isAction: false,
    isHighlight: false,
    isFirstMessage: false,
    replyTo: null,
    replyBody: null,
    systemMsg: null,
    isHistorical: false,
    isDeleted: false,
    isSelf: false,
    ...overrides,
  }
}

/**
 * Message IRC → message affichable. `historical` bascule l'horodatage sur le
 * tag `tmi-sent-ts` : en rejeu, l'heure d'arrivée n'a aucun sens.
 */
export function fromIRC(irc, historical = false) {
  let text = ircText(irc)
  if (text === null) return null

  let isAction = false
  if (text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')) {
    text = text.slice(8, -1)
    isAction = true
  }

  // Les emotes Twitch sont données par position : on découpe autour d'elles,
  // et seuls les intervalles restants passent par la tokenisation par mot.
  const ranges = parseEmoteRanges(irc.tags.emotes ?? '', text)
  const tokens = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start < cursor) continue
    if (r.start > cursor) tokens.push(...tokenizeSegment(text.slice(cursor, r.start)))
    tokens.push({ kind: 'emote', emote: twitchEmote(r.id, text.slice(r.start, r.end)) })
    cursor = r.end
  }
  if (cursor < text.length) tokens.push(...tokenizeSegment(text.slice(cursor)))

  const login = irc.tags.login || prefixNick(irc) || ''
  const displayName = irc.tags['display-name'] || login

  let timestamp = Date.now()
  if (historical) {
    const ms = Number(irc.tags['tmi-sent-ts'])
    if (Number.isFinite(ms) && ms > 0) timestamp = ms
  }

  const replyBody = irc.tags['reply-parent-msg-body']

  return base({
    id: irc.tags.id || uid(),
    userId: irc.tags['user-id'] ?? '',
    userName: login,
    displayName,
    color: readableColor(irc.tags.color) ?? fallbackColor(login),
    badgeTag: irc.tags.badges ?? '',
    tokens,
    timestamp,
    isAction,
    isHighlight: irc.tags['msg-id'] === 'highlighted-message',
    isFirstMessage: irc.tags['first-msg'] === '1',
    replyTo: irc.tags['reply-parent-display-name'] ? unescapeTag(irc.tags['reply-parent-display-name']) : null,
    replyBody: replyBody ? unescapeTag(replyBody) : null,
    isHistorical: historical,
  })
}

/** Commentaire de VOD (GQL `video.comments`) → message affichable. */
export function fromVodComment(node) {
  const login = node?.commenter?.login ?? ''
  const tokens = []
  for (const f of node?.message?.fragments ?? []) {
    if (f?.emote?.emoteID) {
      tokens.push({ kind: 'emote', emote: twitchEmote(f.emote.emoteID, String(f.text ?? '').trim()) })
    } else if (f?.text) {
      tokens.push(...tokenizeSegment(String(f.text)))
    }
  }
  const badgeTag = (node?.message?.userBadges ?? [])
    .filter((b) => b?.setID && b?.version)
    .map((b) => `${b.setID}/${b.version}`)
    .join(',')

  return base({
    id: node?.id || uid(),
    userName: login,
    displayName: node?.commenter?.displayName || login,
    color: readableColor(node?.message?.userColor) ?? fallbackColor(login),
    badgeTag,
    tokens,
    offset: Number(node?.contentOffsetSeconds) || 0,
    timestamp: Date.parse(node?.createdAt) || Date.now(),
    isHistorical: true,
  })
}

export function systemMessage(text, extra = {}) {
  return base({ systemMsg: text, userId: 'system', ...extra })
}

const ANNOUNCE_COLORS = { PRIMARY: '#9146ff', BLUE: '#387aff', GREEN: '#00c853', ORANGE: '#ff9a00', PURPLE: '#bf94ff' }

/**
 * USERNOTICE (abonnement, raid entrant, annonce…) : le texte système, puis le
 * message éventuel de l'utilisateur. Partagé par le direct et l'historique.
 */
export function noticeMessages(irc, historical = false) {
  const out = []
  const kind = irc.tags['msg-id'] ?? ''
  const sys = unescapeTag(irc.tags['system-msg'] ?? '')
  let timestamp = Date.now()
  if (historical) {
    const ms = Number(irc.tags['tmi-sent-ts'])
    if (Number.isFinite(ms) && ms > 0) timestamp = ms
  }
  if (kind === 'raid') {
    // Raid entrant : qui arrive, avec combien de monde, et un lien vers sa chaîne.
    const login = irc.tags['msg-param-login'] ?? irc.tags.login ?? ''
    out.push(systemMessage(sys, {
      notice: 'raid', timestamp, isHistorical: historical,
      raider: /^[a-z0-9_]{1,25}$/i.test(login) ? login.toLowerCase() : null,
      raiderName: unescapeTag(irc.tags['msg-param-displayName'] ?? login),
      viewers: Number(irc.tags['msg-param-viewerCount']) || 0,
    }))
    return out
  }
  if (sys && kind !== 'announcement') {
    out.push(systemMessage(sys, { notice: /sub|gift/.test(kind) ? 'sub' : 'other', timestamp, isHistorical: historical }))
  }
  if (ircText(irc)) {
    const msg = fromIRC(irc, historical)
    if (msg) {
      out.push(kind === 'announcement'
        ? { ...msg, isHighlight: true, announce: ANNOUNCE_COLORS[irc.tags['msg-param-color']] ?? ANNOUNCE_COLORS.PRIMARY }
        : { ...msg, isHighlight: true })
    }
  }
  return out
}

/** Notre propre message : Twitch ne le renvoie pas, on l'affiche nous-mêmes. */
export function selfMessage(text, login, color) {
  return base({
    userName: login,
    displayName: login,
    color: readableColor(color) ?? '#bf94ff',
    tokens: tokenizeSegment(text),
    isSelf: true,
  })
}

/** Texte brut du message, emotes remplacées par leur nom. */
export function plainText(msg) {
  return msg.tokens.map((t) => {
    switch (t.kind) {
      case 'emote': return t.emote.name
      case 'mention': return `@${t.value}`
      default: return t.value
    }
  }).join(' ')
}

// ═══════════════════════════════════════════════════════════════════════════
//  Emotes Twitch, BTTV, FFZ et 7TV.
//
//  Port de Sources/Chat/EmoteService.swift. Les trois API tierces répondent
//  avec les en-têtes CORS qu'il faut : le navigateur les appelle en direct.
// ═══════════════════════════════════════════════════════════════════════════

const globals = new Map()   // nom → emote
const channel = new Map()   // nom → emote (canal courant)
/** Les emotes Twitch n'arrivent que par les messages : on les mémorise au vol
 *  pour l'autocomplétion et le sélecteur. */
const twitchSeen = new Map()

let globalsPromise = null
let loadedChannelId = null

async function getJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    // Une source tierce indisponible ne doit pas empêcher le chat de tourner.
    return null
  }
}

export function loadGlobalEmotes() {
  globalsPromise ??= (async () => {
    const [bttv, ffz, stv] = await Promise.all([
      getJSON('https://api.betterttv.net/3/cached/emotes/global'),
      getJSON('https://api.frankerfacez.com/v1/set/global'),
      getJSON('https://7tv.io/v3/emote-sets/global'),
    ])
    for (const e of readBTTV(bttv)) globals.set(e.name, e)
    for (const e of readFFZSets(ffz?.sets)) globals.set(e.name, e)
    for (const e of read7TV(stv?.emotes)) globals.set(e.name, e)
  })()
  return globalsPromise
}

export async function loadChannelEmotes(channelId, login) {
  if (loadedChannelId === channelId && channelId) return
  // Toujours vider : sans identifiant (infos de la chaîne indisponibles),
  // les emotes de la chaîne précédente restaient affichées.
  loadedChannelId = channelId || null
  channel.clear()
  if (!channelId) return

  const [bttv, ffz, stv] = await Promise.all([
    getJSON(`https://api.betterttv.net/3/cached/users/twitch/${channelId}`),
    getJSON(`https://api.frankerfacez.com/v1/room/${login}`),
    getJSON(`https://7tv.io/v3/users/twitch/${channelId}`),
  ])
  // Une réponse tardive d'une chaîne quittée entre-temps est ignorée.
  if (loadedChannelId !== channelId) return

  for (const e of readBTTV(bttv?.channelEmotes)) channel.set(e.name, e)
  for (const e of readBTTV(bttv?.sharedEmotes)) channel.set(e.name, e)
  for (const e of readFFZSets(ffz?.sets)) channel.set(e.name, e)
  for (const e of read7TV(stv?.emote_set?.emotes)) channel.set(e.name, e)
}

function readBTTV(arr) {
  if (!Array.isArray(arr)) return []
  return arr
    .filter((o) => typeof o?.id === 'string' && typeof o?.code === 'string')
    .map((o) => ({ id: o.id, name: o.code, url: `https://cdn.betterttv.net/emote/${o.id}/2x`, source: 'bttv' }))
}

function readFFZSets(sets) {
  if (!sets || typeof sets !== 'object') return []
  const out = []
  for (const set of Object.values(sets)) {
    if (!Array.isArray(set?.emoticons)) continue
    for (const o of set.emoticons) {
      const raw = o?.urls?.['2'] ?? o?.urls?.['1']
      if (typeof o?.name !== 'string' || typeof raw !== 'string') continue
      out.push({ id: String(o.id), name: o.name, url: raw.startsWith('//') ? `https:${raw}` : raw, source: 'ffz' })
    }
  }
  return out
}

function read7TV(arr) {
  if (!Array.isArray(arr)) return []
  const out = []
  for (const o of arr) {
    const host = o?.data?.host?.url
    if (typeof o?.id !== 'string' || typeof o?.name !== 'string' || typeof host !== 'string') continue
    out.push({ id: o.id, name: o.name, url: `https:${host}/2x.webp`, source: '7tv' })
  }
  return out
}

/** Le canal l'emporte sur le global : un streamer peut redéfinir une emote. */
export function resolveEmote(name) {
  return channel.get(name) ?? globals.get(name) ?? null
}

export function twitchEmote(id, name) {
  const existing = twitchSeen.get(name)
  if (existing) return existing
  const emote = {
    id,
    name,
    url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`,
    source: 'twitch',
  }
  twitchSeen.set(name, emote)
  return emote
}

/** Propositions pour l'autocomplétion : le préfixe l'emporte sur l'occurrence
 *  — en tapant « Kappa » on veut Kappa avant KappaPride. */
export function suggestEmotes(prefix, limit = 8) {
  const kw = prefix.toLowerCase()
  if (!kw) return []
  const starts = []
  const contains = []
  for (const e of pool()) {
    const n = e.name.toLowerCase()
    if (n.startsWith(kw)) starts.push(e)
    else if (n.includes(kw)) contains.push(e)
  }
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, limit)
}

function pool() {
  const all = new Map()
  for (const [n, e] of channel) all.set(n, e)
  for (const [n, e] of twitchSeen) if (!all.has(n)) all.set(n, e)
  for (const [n, e] of globals) if (!all.has(n)) all.set(n, e)
  return all.values()
}

/** Pour le sélecteur : celles de la chaîne d'abord, puis les globales. */
export function emoteCatalog() {
  const seen = new Set(channel.keys())
  const chan = [...channel.values()]
  const global = [...twitchSeen.values(), ...globals.values()].filter((e) => {
    if (seen.has(e.name)) return false
    seen.add(e.name)
    return true
  })
  return { channel: chan, global }
}

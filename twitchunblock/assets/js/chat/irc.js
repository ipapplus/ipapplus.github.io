// ═══════════════════════════════════════════════════════════════════════════
//  Analyse des lignes IRC de Twitch.
//
//  Port de Sources/Chat/IRCParser.swift (app iOS). Les plages d'emotes du tag
//  `emotes` sont en unités UTF-16 : les chaînes JavaScript l'étant déjà, les
//  bornes s'utilisent telles quelles.
// ═══════════════════════════════════════════════════════════════════════════

export function parseIRC(raw) {
  let rest = raw
  const tags = {}
  let prefix = null

  // 1 — Tags : @key=value;key2=value2 …
  if (rest.startsWith('@')) {
    const space = rest.indexOf(' ')
    if (space < 0) return null
    for (const pair of rest.slice(1, space).split(';')) {
      const eq = pair.indexOf('=')
      if (eq < 0) tags[pair] = ''
      else tags[pair.slice(0, eq)] = pair.slice(eq + 1)
    }
    rest = rest.slice(space + 1).trim()
  }

  // 2 — Préfixe : :nick!user@host
  if (rest.startsWith(':')) {
    const parts = rest.slice(1).split(' ')
    prefix = parts[0] ?? null
    rest = parts.slice(1).join(' ').trim()
  }

  // 3 — Commande et paramètres
  const components = rest.split(' ')
  const command = components.shift()
  if (!command) return null

  const params = []
  for (let i = 0; i < components.length; i++) {
    const c = components[i]
    if (c.startsWith(':')) {
      // Paramètre final : tout le reste de la ligne, espaces compris.
      params.push(components.slice(i).join(' ').slice(1))
      break
    }
    params.push(c)
  }

  return { raw, tags, command, params, prefix }
}

/** Pseudo extrait du préfixe `nick!user@host` (JOIN et PART n'ont pas de tags). */
export function prefixNick(msg) {
  if (!msg.prefix) return null
  const nick = msg.prefix.split('!')[0] ?? msg.prefix
  return nick.includes('@') ? null : nick.toLowerCase()
}

/** Corps du message, c'est-à-dire le paramètre final. */
export function ircText(msg) {
  return msg.params.length > 1 ? (msg.params[1] ?? null) : null
}

/** Twitch échappe les espaces et quelques caractères dans les valeurs de tags. */
export function unescapeTag(value) {
  return String(value)
    .replace(/\\s/g, ' ')
    .replace(/\\:/g, ';')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '\\')
}

/**
 * Plages d'emotes Twitch depuis le tag `emotes`.
 * Format : `id:debut-fin,debut-fin/id2:debut-fin`, bornes incluses.
 */
export function parseEmoteRanges(raw, text) {
  if (!raw) return []
  const out = []
  for (const part of raw.split('/')) {
    const [id, ranges] = part.split(':')
    if (!id || !ranges) continue
    for (const r of ranges.split(',')) {
      const [a, b] = r.split('-')
      const start = Number(a)
      const end = Number(b)
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue
      if (start < 0 || end >= text.length) continue
      out.push({ id, start, end: end + 1 })
    }
  }
  return out.sort((x, y) => x.start - y.start)
}

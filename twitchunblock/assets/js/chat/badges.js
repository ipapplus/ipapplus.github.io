// ═══════════════════════════════════════════════════════════════════════════
//  Badges de chat.
//
//  L'app passe par Helix, qui exige d'être connecté. Ici GQL suffit : la
//  requête est publique, et les badges s'affichent donc aussi pour qui lit
//  le chat sans compte.
// ═══════════════════════════════════════════════════════════════════════════

import { gql } from '../api.js'

const globalBadges = {}   // set → { version → url }
const channelBadges = {}
let globalsPromise = null
let loadedLogin = null

function index(list, into) {
  for (const b of list ?? []) {
    if (!b?.setID || !b?.imageURL) continue
    ;(into[b.setID] ??= {})[b.version] = b.imageURL
  }
}

export function loadGlobalBadges() {
  globalsPromise ??= gql('query { badges { setID version imageURL(size: DOUBLE) } }')
    .then((d) => index(d?.badges, globalBadges))
    .catch(() => {})
  return globalsPromise
}

export async function loadChannelBadges(login) {
  if (!login || loadedLogin === login) return
  loadedLogin = login
  for (const k of Object.keys(channelBadges)) delete channelBadges[k]
  try {
    const d = await gql(
      'query($l: String!) { user(login: $l) { broadcastBadges { setID version imageURL(size: DOUBLE) } } }',
      { l: login },
    )
    if (loadedLogin === login) index(d?.user?.broadcastBadges, channelBadges)
  } catch { /* décoratif : leur absence ne casse rien */ }
}

/** Le badge de chaîne l'emporte : un abonnement a son propre visuel par canal. */
export function resolveBadge(set, version) {
  return channelBadges[set]?.[version] ?? globalBadges[set]?.[version] ?? ''
}

/** `subscriber/12,premium/1` → liste d'URLs prêtes à afficher. */
export function parseBadgeTag(raw) {
  if (!raw) return []
  const out = []
  for (const part of raw.split(',')) {
    const [set, version] = part.split('/')
    if (!set || !version) continue
    const url = resolveBadge(set, version)
    if (url) out.push({ id: `${set}/${version}`, set, url })
  }
  return out
}

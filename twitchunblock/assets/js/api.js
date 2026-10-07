// ═══════════════════════════════════════════════════════════════════════════
//  Accès réseau : le Worker (flux vidéo, sauvegarde), Helix (compte connecté)
//  et GQL (métadonnées publiques, sans connexion).
// ═══════════════════════════════════════════════════════════════════════════

import { store } from './store.js'
import { appUrl } from './deployment.js'

// Auto-hébergement : public/config.js peut remplacer l'adresse du Worker
// (« same-origin » = le site et le Worker servis ensemble, comme sous Docker)
// et l'application Twitch utilisée pour la connexion.
const CFG = window.TU_CONFIG ?? {}
export const API_URL = CFG.apiUrl === 'same-origin' ? location.origin : (CFG.apiUrl || location.origin)

// ── Workers de secours ─────────────────────────────────────────────────────
// Le Worker gratuit est limité à 100 000 requêtes par jour et par compte
// Cloudflare : au-delà, il répond « error code: 1027 » (HTTP 429) jusqu'à
// minuit UTC. Un second Worker, déployé sur un autre compte (README,
// « Fallback Worker »), prend alors le relais pour tout ce qui ne dépend pas
// de la base D1 : lives, VODs, relais vidéo, commandes Moobot. Sauvegarde,
// comptage et annonces restent sur le principal : leurs données y sont.
// Une instance avec sa propre adresse (config.js) n'hérite pas des secours
// officiels : elle donne les siens dans `fallbackApiUrls`, ou aucun.
const DEFAULT_FALLBACK_URLS = []
const FALLBACK_URLS = CFG.fallbackApiUrls ?? (CFG.apiUrl ? [] : DEFAULT_FALLBACK_URLS)
const originOf = (u) => { try { return new URL(u).origin } catch { return null } }
/** Le principal d'abord, puis les secours, dans l'ordre. */
export const WORKER_BASES = [...new Set([API_URL, ...FALLBACK_URLS.map(originOf).filter(Boolean)])]

// Worker mis de côté sur cet appareil, pour ne pas le retenter à chaque
// requête. La page d'erreur de Cloudflare n'a pas d'en-tête CORS : le
// navigateur ne voit qu'un échec réseau, jamais le code 1027. Un Worker qui
// échoue alors qu'un autre répond est donc écarté 30 minutes, puis retenté —
// son quota repart à minuit UTC.
const DOWN_KEY = 'tu_worker_down'
const DOWN_MS = 30 * 60_000
// Copie en mémoire : la mise à l'écart tient aussi quand le navigateur refuse
// le stockage (navigation privée, cookies bloqués) — sinon chaque requête
// repassait d'abord par le Worker en panne.
const downMem = {}
function downStored() {
  try { return JSON.parse(localStorage.getItem(DOWN_KEY) || '{}') || {} } catch { return {} }
}
const isDown = (base) => Math.max(downStored()[base] || 0, downMem[base] || 0) > Date.now()

/** Écarte un Worker en panne. `false` s'il n'y a aucun autre Worker vers
 *  qui se tourner : l'appelant garde alors son comportement habituel. */
export function markWorkerDown(base) {
  if (WORKER_BASES.length < 2 || !WORKER_BASES.includes(base)) return false
  const until = Date.now() + DOWN_MS
  downMem[base] = until
  const m = downStored()
  m[base] = until
  try { localStorage.setItem(DOWN_KEY, JSON.stringify(m)) } catch {}
  return true
}

/** Worker (principal ou secours) qui a servi cette adresse, sinon null. */
export function workerBaseOf(url) {
  const o = originOf(url)
  return WORKER_BASES.includes(o) ? o : null
}

/**
 * JSON d'une route du Worker qui ne touche pas à la base D1, en passant au
 * Worker suivant quand l'un d'eux ne répond pas (quota atteint) — ceux qui
 * répondent d'abord, les Workers écartés en dernier recours.
 * Une réponse d'erreur du Worker lui-même (404 « VOD introuvable »…) n'est
 * pas une panne : un autre Worker dirait la même chose.
 */
export async function workerJson(path, { timeout = 0 } = {}) {
  const bases = WORKER_BASES.filter((b) => !isDown(b))
  const failed = []
  for (const base of [...bases, ...WORKER_BASES.filter((b) => !bases.includes(b))]) {
    const ctrl = timeout ? new AbortController() : null
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null
    let res
    try {
      res = await fetch(base + path, ctrl ? { signal: ctrl.signal } : undefined)
    } catch (e) {
      // Trop lent n'est pas « hors service » : le service derrière le
      // Worker peut traîner (Moobot), un autre Worker n'y changerait rien.
      if (e?.name === 'AbortError') throw e
      failed.push(base)
      continue
    } finally {
      clearTimeout(timer)
    }
    if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
      failed.push(base)
      continue
    }
    // Ce Worker répond : ceux qui ont échoué avant lui sont bien en panne —
    // pas la connexion de l'appareil —, on les écarte un moment.
    for (const b of failed) markWorkerDown(b)
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`)
      err.status = res.status
      throw err
    }
    return res.json()
  }
  // Aucun Worker joignable : erreur sans statut, affichée comme un problème
  // de réseau, pas comme une vidéo introuvable.
  throw new Error('Worker injoignable')
}
/** Liens donnés aux applis externes (VLC, Outplayer, Infuse) : par le proxy
 *  (`true`) ou en direct depuis Twitch (`false`, ne charge pas le Worker).
 *  Décidé ici plutôt que par chaque visiteur. La lecture sur le site, elle,
 *  passe toujours par le proxy : le CDN des VODs n'accepte que twitch.tv. */
export const EXTERNAL_LINKS_VIA_PROXY = true
export const GITHUB_URL = CFG.githubUrl || 'https://github.com/ipapplus/TwitchUnblock-Web'
export const APP_GITHUB_URL = CFG.nativeUrl || 'https://github.com/ipapplus/TwitchUnblock'
export const DISCORD_URL = CFG.discordUrl || ''
export const FEATURES = Object.freeze({usage: false, announcements: false, ...CFG.features})
export const HELIX_CLIENT_ID = CFG.twitchClientId || ''
export const GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
/** Seule adresse de retour déclarée chez Twitch : elle ne doit pas changer. */
export const REDIRECT_URI = CFG.redirectUri || appUrl()
/** `chat:read` / `chat:edit` en plus de l'ancien périmètre : sans eux, l'IRC
 *  refuse le jeton et on ne peut que lire le chat en anonyme. */
export const SCOPES = ['user:read:follows', 'chat:read', 'chat:edit']

const LOGIN_RE = /^[a-z0-9_]{1,25}$/

export function cleanLogin(raw) {
  const login = String(raw || '').trim().toLowerCase().replace(/^@/, '')
  return LOGIN_RE.test(login) ? login : null
}

async function json(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// ── GQL public ─────────────────────────────────────────────────────────────
/** Toujours avec des variables : un nom saisi n'est jamais recollé tel quel
 *  dans le texte de la requête. */
export async function gql(query, variables = {}) {
  const data = await json('https://gql.twitch.tv/gql', {
    method: 'POST',
    headers: { 'Client-ID': GQL_CLIENT_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  return data?.data ?? null
}

/** Infos d'une chaîne : identité, et le live en cours s'il y en a un. */
export async function getChannelInfo(login) {
  const data = await gql(`query($l: String!) {
    user(login: $l) {
      id login displayName profileImageURL(width: 150) lastBroadcast { startedAt }
      stream { id title viewersCount createdAt game { displayName name } previewImageURL(width: 640, height: 360) }
      broadcastSettings { title game { displayName } }
    }
  }`, { l: login })
  return data?.user ?? null
}

export async function searchChannels(query) {
  const data = await gql(`query($q: String!) {
    searchUsers(userQuery: $q, first: 6) {
      edges { node { login displayName profileImageURL(width: 70) stream { viewersCount } } }
    }
  }`, { q: query })
  return (data?.searchUsers?.edges ?? []).map((e) => e.node).filter(Boolean)
}

/** Forme commune des cartes de live, quelle que soit la source. */
function streamFromGQL(n) {
  return {
    login: n?.broadcaster?.login ?? '',
    name: n?.broadcaster?.displayName ?? n?.broadcaster?.login ?? '',
    avatar: n?.broadcaster?.profileImageURL ?? '',
    title: n?.title ?? '',
    game: n?.game?.displayName ?? '',
    viewers: n?.viewersCount ?? 0,
    thumb: n?.previewImageURL ?? '',
    startedAt: n?.createdAt ?? null,
  }
}

/** Chaînes (avatar + live éventuel) par GQL public, 100 par requête.
 *  [{ login, name, avatar, stream }] ; stream au format des cartes, ou null. */
export async function getChannelsByLogins(logins) {
  const out = []
  for (let i = 0; i < logins.length; i += 100) {
    const data = await gql(`query($l: [String!]) { users(logins: $l) { login displayName profileImageURL(width: 70)
      lastBroadcast { startedAt }
      videos(first: 1, type: ARCHIVE, sort: TIME) { edges { node { publishedAt lengthSeconds } } }
      stream { title viewersCount createdAt previewImageURL(width: 440, height: 248) game { displayName } } } }`, { l: logins.slice(i, i + 100) })
    for (const u of data?.users ?? []) {
      if (!u?.login) continue
      // Fin du dernier live : la dernière VOD (début + durée) ou, si plus
      // tard, le dernier live lancé.
      const v = u.videos?.edges?.[0]?.node
      const vodEnd = v ? Date.parse(v.publishedAt) + (v.lengthSeconds || 0) * 1000 : NaN
      const started = Date.parse(u.lastBroadcast?.startedAt)
      const best = Math.max(Number.isFinite(vodEnd) ? vodEnd : 0, Number.isFinite(started) ? started : 0)
      out.push({ login: u.login, name: u.displayName || u.login, avatar: u.profileImageURL || '', lastEnd: best ? new Date(best).toISOString() : null, stream: u.stream ? streamFromGQL({ ...u.stream, broadcaster: u }) : null })
    }
  }
  return out
}

/** Toutes les chaînes suivies par le compte (Helix, pages de 100, 1 000 max). */
export async function getFollowedLogins(userId) {
  const logins = []
  let after = ''
  do {
    const data = await helix(`channels/followed?user_id=${encodeURIComponent(userId)}&first=100${after ? `&after=${encodeURIComponent(after)}` : ''}`)
    for (const f of data?.data ?? []) if (f.broadcaster_login) logins.push(f.broadcaster_login.toLowerCase())
    after = data?.pagination?.cursor ?? ''
  } while (after && logins.length < 1000)
  return logins
}

// ── Catégories (GQL public) ────────────────────────────────────────────────
const CAT_FIELDS = 'id name displayName boxArtURL(width: 188, height: 250) viewersCount'
const catFrom = (n) => ({ id: n.id, name: n.displayName || n.name, box: n.boxArtURL || '', viewers: n.viewersCount ?? null })

/** Catégories les plus regardées. { items, cursor } */
export async function getTopCategories(cursor = null) {
  const data = await gql(`query($c: Cursor) { games(first: 40, after: $c) { edges { cursor node { ${CAT_FIELDS} } } pageInfo { hasNextPage } } }`, { c: cursor })
  const edges = data?.games?.edges ?? []
  return { items: edges.map((e) => catFrom(e.node)), cursor: data?.games?.pageInfo?.hasNextPage ? edges.at(-1)?.cursor ?? null : null }
}

export async function searchCategories(q) {
  const data = await gql(`query($q: String!) { searchCategories(query: $q, first: 30) { edges { node { ${CAT_FIELDS} } } } }`, { q })
  return (data?.searchCategories?.edges ?? []).map((e) => catFrom(e.node))
}

/** Audience et jaquette à jour de catégories connues (suivies). */
export async function getCategoriesByIds(ids) {
  ids = ids.slice(0, 60)
  if (!ids.length) return []
  // Une requête, un alias par catégorie (pas de filtre par identifiants).
  const vars = Object.fromEntries(ids.map((id, i) => [`i${i}`, String(id)]))
  const q = `query(${ids.map((_, i) => `$i${i}: ID`).join(', ')}) { ${ids.map((_, i) => `g${i}: game(id: $i${i}) { ${CAT_FIELDS} }`).join(' ')} }`
  const data = await gql(q, vars)
  return ids.map((_, i) => data?.[`g${i}`]).filter(Boolean).map(catFrom)
}

/** Lives d'une catégorie. { items, cursor } */
export async function getCategoryStreams(id, cursor = null) {
  const data = await gql(`query($id: ID!, $c: Cursor) { game(id: $id) { streams(first: 30, after: $c) {
    edges { cursor node { title viewersCount createdAt previewImageURL(width: 440, height: 248) game { displayName }
      broadcaster { login displayName profileImageURL(width: 50) } } } pageInfo { hasNextPage } } } }`, { id, c: cursor })
  const edges = data?.game?.streams?.edges ?? []
  return { items: edges.map((e) => streamFromGQL(e.node)).filter((s) => s.login), cursor: data?.game?.streams?.pageInfo?.hasNextPage ? edges.at(-1)?.cursor ?? null : null }
}

/** Lesquelles de ces chaînes sont en live (suivis sans compte), par GQL public. */
export async function getLiveByLogins(logins) {
  const out = []
  for (let i = 0; i < logins.length; i += 100) {
    const data = await gql(`query($l: [String!]) { users(logins: $l) { login displayName profileImageURL(width: 50)
      stream { title viewersCount createdAt previewImageURL(width: 440, height: 248) game { displayName } } } }`, { l: logins.slice(i, i + 100) })
    for (const u of data?.users ?? []) {
      if (u?.stream) out.push(streamFromGQL({ ...u.stream, broadcaster: u }))
    }
  }
  return out.sort((a, b) => b.viewers - a.viewers)
}

export function streamFromHelix(s) {
  return {
    login: s.user_login,
    name: s.user_name || s.user_login,
    avatar: '',
    title: s.title ?? '',
    game: s.game_name ?? '',
    viewers: s.viewer_count ?? 0,
    thumb: String(s.thumbnail_url ?? '').replace('{width}', '440').replace('{height}', '248'),
    startedAt: s.started_at ?? null,
  }
}

/** Top des lives, sans connexion : la requête GQL est publique. L'ancien
 *  site passait par Helix et réservait donc l'accueil aux comptes connectés. */
export async function getTopStreams(language) {
  const data = await gql(`query($n: Int!, $langs: [Language!]) {
    streams(first: $n, options: { broadcasterLanguages: $langs }) {
      edges { node {
        title viewersCount createdAt previewImageURL(width: 440, height: 248)
        broadcaster { login displayName profileImageURL(width: 50) }
        game { displayName }
      } }
    }
  }`, { n: 24, langs: language ? [language.toUpperCase()] : null })
  return (data?.streams?.edges ?? []).map((e) => streamFromGQL(e.node)).filter((s) => s.login)
}

/** Photos de profil d'une liste de chaînes, en une requête. */
export async function getAvatars(logins) {
  if (!logins.length) return {}
  try {
    const data = await gql('query($l: [String!]) { users(logins: $l) { login profileImageURL(width: 50) } }', { l: logins.slice(0, 100) })
    const out = {}
    for (const u of data?.users ?? []) if (u?.login) out[u.login] = u.profileImageURL
    return out
  } catch {
    return {}
  }
}

export async function getVodMeta(id) {
  const data = await gql(`query($id: ID!) {
    video(id: $id) {
      id title lengthSeconds createdAt
      previewThumbnailURL(width: 320, height: 180)
      owner { id login displayName profileImageURL(width: 70) }
      game { displayName }
    }
  }`, { id })
  return data?.video ?? null
}

// ── Worker ─────────────────────────────────────────────────────────────────
// Dans le navigateur, la lecture passe TOUJOURS par le proxy : le CDN des
// VODs de Twitch ne renvoie aucun en-tête CORS, un lien direct est donc
// bloqué — chargement infini et « CORS error » dans la console. Le réglage
// « proxy » ne concerne plus que les liens donnés aux applis externes
// (VLC, Infuse…), voir `directUrl`.
export function getLive(login) {
  return workerJson(`/api/get-live?name=${encodeURIComponent(login)}&proxy=true`)
}

export function getVodLinks(id) {
  return workerJson(`/api/get-m3u8?id=${encodeURIComponent(id)}&proxy=true`)
}

/** Adresse d'origine derrière un lien du proxy, pour les applis externes. */
export function directUrl(link) {
  try {
    const u = new URL(link)
    if (workerBaseOf(link) && u.pathname === '/api/proxy') return u.searchParams.get('url') || link
  } catch {}
  return link
}

/**
 * Corrige les adresses relatives que le Worker ne réécrit pas.
 *
 * Twitch sert désormais ses VODs en fMP4, avec un segment d'initialisation
 * déclaré par `#EXT-X-MAP:URI="init-0.mp4"`. Le Worker réécrit les lignes de
 * segments mais pas les attributs URI des balises : le lecteur résolvait
 * donc `init-0.mp4` par rapport au Worker (`/api/init-0.mp4`, 404) et la
 * vidéo ne démarrait jamais. On renvoie ces adresses vers le proxy, à côté
 * de la playlist d'origine.
 */
export function fixProxiedUrl(url, playlistUrl) {
  try {
    const u = new URL(url)
    // Le Worker qui a servi la playlist : le principal, ou un secours.
    const base = workerBaseOf(playlistUrl) ?? API_URL
    // Sous-playlists de direct (Luminous, playlist.ttvnw.net) laissées en
    // direct par le Worker : leurs jetons sont liés à l'adresse IP du Worker,
    // le navigateur s'y faisait refuser (403) et « Auto » ne démarrait pas.
    if (/(^|\.)playlist\.ttvnw\.net$|(^|\.)luminous\.dev$/.test(u.hostname)) {
      return `${base}/api/proxy?url=${encodeURIComponent(url)}&isVod=false`
    }
    if (u.origin !== base || u.pathname === '/api/proxy') return url
    const source = new URL(playlistUrl).searchParams.get('url')
    if (!source) return url
    const name = u.pathname.replace(/^\/api\//, '').replace(/^\//, '')
    const target = new URL(name + u.search, source).href
    return `${base}/api/proxy?url=${encodeURIComponent(target)}&isVod=true`
  } catch {
    return url
  }
}

export function getChannelVideos(login) {
  return workerJson(`/api/get-channel-videos?name=${encodeURIComponent(login)}`)
}

// ── Récupération de VODs supprimées ──────────────────────────────────────────
// Tout passe par le Worker : le navigateur ne peut joindre ni la source de
// métadonnées ni le CDN de Twitch (CORS).
export function getRecoverableStreams(channel) {
  return workerJson(`/api/recover-list?channel=${encodeURIComponent(channel)}`)
}
/** Liens d'une diffusion supprimée, ou lève (404) si le CDN ne la sert plus. */
export function resolveRecovery(login, streamID, epoch) {
  return workerJson(`/api/recover-resolve?login=${encodeURIComponent(login)}&streamID=${encodeURIComponent(streamID)}&epoch=${encodeURIComponent(epoch)}`)
}

// La sauvegarde exige le jeton Twitch de son propriétaire : le Worker le fait
// confirmer par Twitch et vérifie qu'il correspond à l'identifiant.
const authHeader = () => (store.token ? { Authorization: `Bearer ${store.token}` } : {})

export async function syncPull(userId) {
  try {
    return await json(`${API_URL}/api/sync/get?userId=${encodeURIComponent(userId)}`, { headers: authHeader() })
  } catch {
    return null
  }
}

export async function syncPush(userId, data) {
  try {
    const body = JSON.stringify({ userId, data })
    await fetch(`${API_URL}/api/sync/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body,
      // Permet à l'envoi de finir quand l'onglet se ferme (limite : 64 Ko).
      keepalive: body.length < 60_000,
    })
  } catch { /* la sauvegarde distante est un plus, pas une dépendance */ }
}

// ── Helix (compte connecté) ────────────────────────────────────────────────
function helix(path) {
  return json(`https://api.twitch.tv/helix/${path}`, {
    headers: { Authorization: `Bearer ${store.token}`, 'Client-Id': HELIX_CLIENT_ID },
  })
}

/** Vérifie le jeton et renvoie son titulaire et ses droits. `null` = expiré. */
export async function validateToken(token) {
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${token}` },
    })
    if (!res.ok) return null
    const v = await res.json()
    if (v.client_id !== HELIX_CLIENT_ID || !(v.expires_in > 0)) return null
    return { userId: v.user_id, login: v.login, scopes: v.scopes ?? [] }
  } catch {
    // Hors ligne : on ne déconnecte pas pour autant.
    return { userId: null, login: null, scopes: [], offline: true }
  }
}

export async function getMe() {
  const data = await helix('users')
  return data?.data?.[0] ?? null
}

export async function getFollowedStreams(userId) {
  const data = await helix(`streams/followed?user_id=${encodeURIComponent(userId)}&first=40`)
  const streams = (data?.data ?? []).map(streamFromHelix)
  // Helix ne donne pas les photos de profil : complétées en une requête.
  const avatars = await getAvatars(streams.map((s) => s.login))
  for (const s of streams) s.avatar = avatars[s.login] ?? ''
  return streams
}

export function loginUrl() {
  // Valeur aléatoire vérifiée au retour (index.html et main.js).
  const state = crypto.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now()
  try { localStorage.setItem('tu_oauth_state', state) } catch {}
  const params = new URLSearchParams({
    state,
    client_id: HELIX_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: SCOPES.join(' '),
  })
  return `https://id.twitch.tv/oauth2/authorize?${params}`
}

// ── Clips ──────────────────────────────────────────────────────────────────
/** Clips d'une chaîne, les plus vus sur la période (LAST_DAY, LAST_WEEK,
 *  LAST_MONTH, ALL_TIME). */
/** Highlights d'une chaîne (les 50 plus récents). */
export async function getHighlights(login) {
  const data = await gql(`query($l: String!) { user(login: $l) {
    videos(first: 50, type: HIGHLIGHT, sort: TIME) { edges { node {
      id title lengthSeconds createdAt publishedAt viewCount previewThumbnailURL(width: 320, height: 180)
    } } }
  } }`, { l: login })
  return (data?.user?.videos?.edges ?? []).map((e) => e.node).filter((v) => v?.id)
}

/** Playlists (collections) d'une chaîne, avec leurs vidéos — vides exclues. */
export async function getCollections(login) {
  const data = await gql(`query($l: String!) {
    user(login: $l) { collections(first: 20) { edges { node {
      id title description
      items(first: 50) { totalCount edges { node { ... on Video {
        id title lengthSeconds createdAt viewCount
        previewThumbnailURL(width: 320, height: 180)
      } } } }
    } } } }
  }`, { l: login })
  return (data?.user?.collections?.edges ?? [])
    .map((e) => e.node)
    .filter(Boolean)
    .map((c) => ({ ...c, videos: (c.items?.edges ?? []).map((e) => e.node).filter((v) => v?.id), total: c.items?.totalCount ?? 0 }))
    .filter((c) => c.videos.length)
}

export async function getClips(login, period = 'LAST_WEEK') {
  const data = await gql(`query($l: String!, $p: ClipsPeriod) {
    user(login: $l) { clips(first: 24, criteria: { period: $p, sort: VIEWS_DESC }) { edges { node {
      slug title viewCount durationSeconds createdAt thumbnailURL(width: 480, height: 272)
      curator { displayName }
    } } } }
  }`, { l: login, p: period })
  return (data?.user?.clips?.edges ?? []).map((e) => e.node).filter((c) => c?.slug)
}

/** Un clip prêt à lire : MP4 signé, et de quoi rejouer le chat de la VOD
 *  d'origine à cet instant quand elle existe encore. */
export async function getClip(slug) {
  const data = await gql(`query($s: ID!) { clip(slug: $s) {
    slug title viewCount durationSeconds createdAt
    broadcaster { id login displayName profileImageURL(width: 70) }
    game { displayName }
    video { id } videoOffsetSeconds
    playbackAccessToken(params: { platform: "web", playerType: "site", playerBackend: "mediaplayer" }) { signature value }
    videoQualities { quality frameRate sourceURL }
  } }`, { s: slug })
  const c = data?.clip
  if (!c?.playbackAccessToken || !c.videoQualities?.length) return null
  const sig = `sig=${encodeURIComponent(c.playbackAccessToken.signature)}&token=${encodeURIComponent(c.playbackAccessToken.value)}`
  const links = {}
  for (const q of c.videoQualities) {
    if (!/^https:\/\//.test(q.sourceURL ?? '')) continue
    const label = `${q.quality}p${q.frameRate >= 50 ? Math.round(q.frameRate) : ''}`
    links[label] = `${q.sourceURL}${q.sourceURL.includes('?') ? '&' : '?'}${sig}`
  }
  return { ...c, links }
}

/** « clips.twitch.tv/Slug » ou « twitch.tv/chaine/clip/Slug » → Slug. */
export function clipSlugFrom(url) {
  const m = String(url).match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:clips\.twitch\.tv\/|twitch\.tv\/[a-z0-9_]+\/clip\/)([A-Za-z0-9_-]{3,100})/i)
  return m ? m[1] : null
}

/** Chapitres d'une VOD (changements de jeu). */
export async function getVodChapters(id) {
  const data = await gql(`query($id: ID!) { video(id: $id) { moments(first: 50, momentRequestType: VIDEO_CHAPTER_MARKERS) {
    edges { node { positionMilliseconds durationMilliseconds description } }
  } } }`, { id })
  return (data?.video?.moments?.edges ?? [])
    .map((e) => e.node)
    .filter(Boolean)
    .map((n) => ({ start: (n.positionMilliseconds ?? 0) / 1000, duration: (n.durationMilliseconds ?? 0) / 1000, title: n.description ?? '' }))
    .sort((a, b) => a.start - b.start)
}

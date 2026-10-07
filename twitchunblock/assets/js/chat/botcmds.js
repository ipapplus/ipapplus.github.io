// ═══════════════════════════════════════════════════════════════════════════
//  Commandes des bots du chat, lues sans écrire « !commands » : mêmes API
//  publiques que l'extension « View Twitch Commands In Chat » (1011025m).
//  Nightbot, StreamElements et Fossabot acceptent les appels du navigateur ;
//  Moobot les refuse (CORS) : il passe par le Worker.
// ═══════════════════════════════════════════════════════════════════════════

import { workerJson } from '../api.js'

const ICONS = {
  Moobot: 'https://static-cdn.jtvnw.net/jtv_user_pictures/663db70b-80e7-424b-a54f-ed88f7ac9355-profile_image-50x50.png',
  Nightbot: 'https://static-cdn.jtvnw.net/jtv_user_pictures/nightbot-profile_image-2345338c09b4d468-50x50.png',
  StreamElements: 'https://static-cdn.jtvnw.net/jtv_user_pictures/streamelements-profile_image-a89b9d61499d365f-50x50.png',
  Fossabot: 'https://static-cdn.jtvnw.net/jtv_user_pictures/719a0ffa-6c86-4321-83f1-44990fd644bc-profile_image-50x50.png',
}

async function json(url, headers) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal })
    return res.ok ? await res.json() : null
  } catch { return null } finally { clearTimeout(timer) }
}

const bang = (n) => (String(n).trim().startsWith('!') ? String(n).trim() : `!${String(n).trim()}`)

async function nightbot(ch) {
  const id = (await json(`https://api.nightbot.tv/1/channels/t/${ch}`))?.channel?._id
  if (!id) return null
  const list = (await json('https://api.nightbot.tv/1/commands', { 'Nightbot-Channel': id }))?.commands ?? []
  return list.map((c) => ({ name: String(c.name ?? ''), response: String(c.message ?? '') })).filter((c) => c.name)
}

async function streamElements(ch) {
  const id = (await json(`https://api.streamelements.com/kappa/v2/channels/${ch}`))?._id
  if (!id) return null
  const list = await json(`https://api.streamelements.com/kappa/v2/bot/commands/${id}/public`)
  return (Array.isArray(list) ? list : [])
    .filter((c) => c.command && c.enabled !== false && c.hidden !== true)
    .map((c) => ({ name: bang(c.command), response: String(c.reply ?? '') }))
}

async function fossabot(ch) {
  const id = (await json(`https://api.fossabot.com/v2/cached/channels/by-slug/${ch}`))?.channel?.id
  if (!id) return null
  const list = (await json(`https://api.fossabot.com/v2/cached/channels/${id}/commands`))?.commands ?? []
  return list.filter((c) => c.name && c.enabled_online !== false).map((c) => ({ name: bang(c.name), response: String(c.response ?? '') }))
}

// Par le Worker, ou son secours quand le quota du jour est atteint.
async function moobot(ch) {
  try {
    return (await workerJson(`/api/bot-commands/moobot?channel=${ch}`, { timeout: 10_000 }))?.commands ?? null
  } catch { return null }
}

const cache = new Map()   // chaîne → { at, sets }

/** [{ bot, icon, commands: [{ name, response }] }], bots sans commande exclus. */
export async function fetchBotCommands(channel) {
  const ch = encodeURIComponent(String(channel).toLowerCase())
  const hit = cache.get(ch)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.sets
  const [n, s, f, m] = await Promise.all([nightbot(ch), streamElements(ch), fossabot(ch), moobot(ch)])
  const sets = [['Nightbot', n], ['StreamElements', s], ['Fossabot', f], ['Moobot', m]]
    .filter(([, cmds]) => cmds?.length)
    .map(([bot, cmds]) => ({ bot, icon: ICONS[bot], commands: cmds.sort((a, b) => a.name.localeCompare(b.name)) }))
  cache.set(ch, { at: Date.now(), sets })
  return sets
}

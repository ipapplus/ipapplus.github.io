// Original interface glyphs, MIT licensed; see icons/UI-ICONS-LICENSE.txt.
// Directions are intentional: transport follows the LTR timeline; navigation is RTL.
import { digits } from './format.js';
export const paths = {
  x:'<path d="M4 3h4l12 18h-4L4 3Zm16 0-6.5 7M4 21l6.5-7"/>',
  website:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
  speaker:'<path d="m11 5-5 4H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  silent:'<path d="m11 5-5 4H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
  typography:'<path d="M13 6.5c-1.4-2-5.5-1.5-5.5 1.2 0 1.8 2.1 2.4 4.4 2.4H14l-5.2 2.7c-5.3 2.8-3.6 7.4 2 7.2M17 6h4m-4 6h3m-3 6h4"/>',
  link:'<path d="m9 15 6-6m-7 3-2 2a4 4 0 0 0 6 6l2-2M10 6l2-2a4 4 0 0 1 6 6l-2 2"/>',
  install:'<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M12 6v9m-3-3 3 3 3-3m-5 6h4"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  cache:'<path d="M7 18H6a4 4 0 0 1-.5-8A6.5 6.5 0 0 1 18 8a5 5 0 0 1 .5 10H17M12 11v10m-3-3 3 3 3-3"/>',
  saved:'<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
  share:'<path d="M8 8H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2M12 15V2m-4 4 4-4 4 4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none"/>',
  account:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5 18c1-5 13-5 14 0"/>',
  book:'<path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Zm0 0v15M6 8l3 .5M6 12l3 .5m6-4 3-.5m-3 5 3-.5"/>',
  wave:'<path d="M4 10v4m4-7v10m4-14v18m4-14v10m4-7v4"/>',
  library:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  folder:'<path d="M3 7a2.5 2.5 0 0 1 2.5-2.5H9l2 2h7.5A2.5 2.5 0 0 1 21 9v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18V7Z"/>',
  settings:'<path d="M3 7h3.5m5 0H21M3 17h9.5m5 0H21"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
  back:'<path d="m9 5 7 7-7 7"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  arrow:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  play:'<path d="M8 4.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5a1 1 0 0 0-.5-.14Z"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1.1"/><rect x="14" y="4" width="4" height="16" rx="1.1"/>',
  previous:'<rect x="4" y="5" width="2.5" height="14" rx=".8"/><path d="M19 5.5a.8.8 0 0 0-1.2-.7l-10 6.5a.8.8 0 0 0 0 1.4l10 6.5a.8.8 0 0 0 1.2-.7v-13Z"/>',
  next:'<rect x="17.5" y="5" width="2.5" height="14" rx=".8"/><path d="M5 5.5a.8.8 0 0 1 1.2-.7l10 6.5a.8.8 0 0 1 0 1.4l-10 6.5a.8.8 0 0 1-1.2-.7v-13Z"/>',
  shuffle:'<path d="M3 6h2c4 0 8 12 12 12h4m-4-4 4 4-4 3M3 18h2c1.6 0 3.1-1.9 4.7-4.4M14 9c1-1.8 2-3 3-3h4m-4-3 4 3-4 4"/>',
  repeat:'<path d="m17 3 4 4-4 4M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4m14 0v2a2 2 0 0 1-2 2H3"/>',
  repeatOne:'<path d="m17 3 4 4-4 4M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4m14 0v2a2 2 0 0 1-2 2H3"/><text x="12" y="15" text-anchor="middle" font-size="9" fill="currentColor" stroke="none">1</text>',
  note:'<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  expand:'<path d="M15 3h6v6m-6 0 6-6M3 15v6h6m-6 0 6-6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  rewind:'<path d="m7 3-4 4 4 4M3 7h9a8 8 0 1 1-7 12"/><text x="12" y="17" text-anchor="middle" font-size="8" fill="currentColor" stroke="none">10</text>',
  forward:'<path d="m17 3 4 4-4 4m4-4h-9a8 8 0 1 0 7 12"/><text x="12" y="17" text-anchor="middle" font-size="8" fill="currentColor" stroke="none">10</text>',
  speed:'<path d="M4 18a9 9 0 1 1 16 0M12 13l5-6M5 13h1m12 0h1m-8-8v1"/><circle cx="12" cy="13" r="1.2"/>',
  moon:'<path d="M20.5 14.7A8.7 8.7 0 0 1 9.3 3.5a9 9 0 1 0 11.2 11.2Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
};
const filled = new Set(['play','pause','previous','next']);
export function icon(name) {
  const glyph = Object.hasOwn(paths, name) ? name : 'note';
  const body = paths[glyph].replace(/(<text[^>]*>)(.*?)(<\/text>)/g, (_,a,b,c) => a + digits(b) + c);
  return `<svg class="ui-icon${filled.has(glyph) ? ' ui-icon--filled' : ''}" data-ui-icon="${glyph}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

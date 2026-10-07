// Derive the installation directory from this module, not the origin root.
export const APP_BASE = new URL('../../', import.meta.url)
export const appUrl = (path = '') => new URL(path, APP_BASE).href

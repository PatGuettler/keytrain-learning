const GITHUB_PAGES_REPO = 'guardian-md'

/** App base path with trailing slash, e.g. `/` or `/guardian-md/` */
export function getAppBase(): string {
  const envBase = import.meta.env.BASE_URL
  if (envBase && envBase !== '/') {
    return envBase.endsWith('/') ? envBase : `${envBase}/`
  }
  // Fallback when build base was `/` but app is served from GitHub Pages subpath
  if (typeof window !== 'undefined') {
    const prefix = `/${GITHUB_PAGES_REPO}`
    if (window.location.pathname === prefix || window.location.pathname.startsWith(`${prefix}/`)) {
      return `${prefix}/`
    }
  }
  return '/'
}

/** React Router basename (no trailing slash) */
export function getRouterBasename(): string {
  const base = getAppBase()
  if (base === '/') return '/'
  return base.replace(/\/$/, '')
}

/** In-app route path for React Router (no base prefix — Router basename handles it) */
export function routePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

/** Full URL path from site origin (for window.location, email redirects) */
export function absoluteAppPath(path: string): string {
  const clean = path.replace(/^\//, '')
  return `${getAppBase()}${clean}`
}

export function absoluteAppUrl(path: string): string {
  return `${window.location.origin}${absoluteAppPath(path)}`
}

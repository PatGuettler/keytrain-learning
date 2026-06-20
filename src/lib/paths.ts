/** App base path with trailing slash, e.g. `/` */
export function getAppBase(): string {
  const envBase = import.meta.env.BASE_URL
  if (envBase && envBase !== '/') {
    return envBase.endsWith('/') ? envBase : `${envBase}/`
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

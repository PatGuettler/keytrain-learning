import { useLocation } from 'react-router-dom'

/** Base path for phishing UI — `/admin/phishing` or `/org-admin/phishing`. */
export function usePhishingBasePath(): string {
  const { pathname } = useLocation()
  return pathname.startsWith('/org-admin') ? '/org-admin/phishing' : '/admin/phishing'
}

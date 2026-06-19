import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useUiStore } from './store/uiStore'
import { applyTheme } from './lib/theme'
import { bootstrapAuthFromUrl } from './services/auth.service'

applyTheme(useUiStore.getState().theme)

/** Restore deep link after GitHub Pages 404.html → app root redirect */
function restoreGhPagesSpaRedirect() {
  const redirect = sessionStorage.getItem('redirect')
  if (!redirect) return
  sessionStorage.removeItem('redirect')
  try {
    const target = new URL(redirect)
    if (target.origin !== window.location.origin) return
    const path = target.pathname + target.search + target.hash
    const current = window.location.pathname + window.location.search + window.location.hash
    if (path !== current) {
      window.history.replaceState(null, '', path)
      // Notify React Router after restoring a GitHub Pages deep link.
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  } catch {
    /* ignore malformed URL */
  }
}

restoreGhPagesSpaRedirect()

void bootstrapAuthFromUrl().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})

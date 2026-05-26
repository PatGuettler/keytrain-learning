import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useUiStore } from './store/uiStore'

// Restore theme on load
const theme = useUiStore.getState().theme
document.documentElement.classList.toggle('dark', theme === 'dark')

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
    }
  } catch {
    /* ignore malformed URL */
  }
}

restoreGhPagesSpaRedirect()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

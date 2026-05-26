import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useUiStore } from './store/uiStore'

// Restore theme on load
const theme = useUiStore.getState().theme
document.documentElement.classList.toggle('dark', theme === 'dark')

// GitHub Pages SPA redirect
const redirect = sessionStorage.redirect
delete sessionStorage.redirect
if (redirect && redirect !== window.location.href) {
  window.history.replaceState(null, '', redirect)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/manrope'
import App from './App'
import { InstallScreen, installPlatform } from './install'
import './styles.css'

// L'app refuse de s'afficher dans un cadre (iframe) d'un autre site (anti-clickjacking).
const framed = window.top !== window.self
if (framed) {
  try { window.top!.location.replace(window.location.href) } catch { /* navigation bloquée */ }
} else {
  registerSW({ immediate: true })
  // Sur téléphone, hors de l'app installée : on demande d'installer l'app.
  const platform = installPlatform()
  if (!platform) {
    // Demande au navigateur de ne pas purger les données locales.
    navigator.storage?.persist?.().catch(() => {})
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {platform ? <InstallScreen platform={platform} /> : <App />}
    </StrictMode>,
  )
}

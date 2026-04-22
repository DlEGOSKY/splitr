import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '../css/base.css'
import '../css/animations.css'
import '../css/components.css'
import '../css/themes.css'
import '../css/ux-improvements.css'
import '../css/modules/stats.css'
import '../css/modules/settings.css'
import '../css/modules/paywall.css'
import '../css/modules/result.css'
import '../css/modules/templates.css'
import '../css/modules/moments.css'
import '../css/modules/cinema.css'
import '../css/modules/ritual.css'
import '../css/modules/personality.css'

// Exponer funciones de preview en window para testing desde consola
// These lazy-load the heavy animation chunk only when called
declare global {
  interface Window {
    previewIntro: (skinId: string) => Promise<void>
    listIntros: () => Promise<string[]>
    previewLottie: (type: 'fire' | 'storm' | 'crosshair') => Promise<void>
  }
}
window.previewIntro = (skinId: string) => import('./utils/intros').then(m => m.previewIntro(skinId))
window.listIntros = () => import('./utils/intros').then(m => m.listIntros())
window.previewLottie = (type: 'fire' | 'storm' | 'crosshair') => import('./utils/intros').then(m => m.previewLottie(type))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

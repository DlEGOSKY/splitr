import { useCallback, useEffect, useState } from 'react'

/**
 * Modo cine — toggle que transforma la pantalla en una experiencia
 * más inmersiva para mostrar el sorteo en grupo:
 *   - Header minimizado
 *   - Grid de participantes agrandado
 *   - Vignette intensificado
 *   - Vista fullscreen nativa si el navegador la soporta
 *
 * Es OPT-IN y NO persiste entre sesiones — es un estado del momento.
 * Una clase `cinema-mode` se añade a <body> para permitir overrides CSS.
 */
const BODY_CLASS = 'cinema-mode'

export function useCinemaMode() {
  const [active, setActive] = useState(false)

  // Sincroniza clase en body cuando cambia el estado
  useEffect(() => {
    const body = document.body
    if (active) body.classList.add(BODY_CLASS)
    else body.classList.remove(BODY_CLASS)
    return () => body.classList.remove(BODY_CLASS)
  }, [active])

  // Detecta si el usuario sale de fullscreen por ESC → apaga cinema también
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && active) {
        setActive(false)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [active])

  const toggle = useCallback(async () => {
    const next = !active
    setActive(next)

    // Fullscreen nativo — intentamos, pero no fallamos si no se puede
    try {
      if (next) {
        const el = document.documentElement
        if (el.requestFullscreen && !document.fullscreenElement) {
          await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
    } catch {
      // Usuario rechazó o no soportado — el modo CSS sigue activo de todas formas
    }
  }, [active])

  return { active, toggle }
}

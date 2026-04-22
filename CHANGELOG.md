# Changelog — Splitr

Todos los cambios notables del proyecto se documentan aquí.

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
Versionado: [SemVer](https://semver.org/lang/es/)

---

## [3.0.0] — 2026-04-17

Migración completa de Vanilla JS a React 19 + TypeScript + Vite, más una suite de mejoras de UX, performance y producto.

### Added

#### Arquitectura
- React 19 + TypeScript + Vite 6 como stack base
- Zustand store con persistencia automática en localStorage
- Framer Motion para transiciones de pantalla, countdown, winner reveal
- VitePWA con Service Worker generado automáticamente (workbox)
- Lazy-loading de overlays pesados y `intros/animations.ts` (303 KB)
- ErrorBoundary a nivel App
- OfflineIndicator con detección online/offline

#### Features de producto
- **13 modos de sorteo** (normal, eliminación, equipo, orden, duelo, venganza, moneda, dado, bomba, dividir, ruleta rusa, voz, torneo)
- **Modo Team completo**: resultado muestra equipo ganador con chips de teammates
- **Stats reales**: summary cards, activity 7 días, mode breakdown, donut chart
- **Export CSV** del historial con BOM UTF-8 (Excel-friendly)
- **Deep links**: pre-carga de estado vía `?q=...&mode=...&names=...`
- **Share de grupos** con Web Share API + fallback clipboard
- **Backup/restore** completo en JSON
- **Reset selectivo** (historial, grupos, todo) con confirmación
- **Paywall narrativa donativo** con tiers visuales
- **Haptic patterns** diferenciados (tap, success, error, ramp, winner)
- **Confetti** en winner reveal
- **Parallax sutil** en home background
- **Theme morph** con View Transitions API
- **Preload hints** de assets críticos en `index.html`

#### Accesibilidad
- Respeto de `prefers-reduced-motion` en animaciones
- ARIA labels en todos los botones icon-only
- Focus management en modales
- Contraste mejorado en texto sobre glow

#### Modularización CSS
- `css/modules/stats.css` — summary cards, activity, modes, empty, history toolbar
- `css/modules/settings.css` — secciones, toggles, actions, confirm dialog
- `css/modules/paywall.css` — donation narrative, bundle CTA, tiers
- `css/modules/result.css` — teammate chips

### Changed

- **Bundle inicial**: 450 KB → **427 KB** (132 KB gzip)
- **CSS total**: 142 → **139 KB** (26 KB gzip) tras eliminar duplicados
- **`ux-improvements.css`**: 2352 → 1483 líneas (-37%) tras modularización
- Paywall: texto y CTA rediseñados, emojis reemplazados por SVG icons
- Countdown: animación simplificada (fix doble rebote)
- Home: botón SORTEAR ahora sticky al fondo con backdrop glow
- Stats: pantalla transparente (antes recuadro flotante sobre textura)
- SettingsModal: reescrito con 5 secciones profesionales
- `sessionHistory`: ahora acepta export CSV
- Icons: añadidos `heart`, `check`, `loader` en `utils/icons.tsx`

### Fixed

- Countdown con doble rebote en números 2 y 1
- Banner paywall con texto cortado en pantallas estrechas
- Recuadro negro sólido en StatsScreen sobre textura paper
- Warning de build por import mixto de Toast en HomeScreen
- Scroll del botón SORTEAR cuando había muchos participantes
- CSS duplicados cross-file (stats-empty, settings-toggle-*, paywall-bundle-*)

### Removed

Movido a `_legacy/` (no eliminado por si TWA actual lo necesita):
- `js/` — 17 archivos Vanilla JS pre-migración (440 KB)
- `test/` — tests Vanilla JS
- `index.old.html` (62 KB) — HTML monolítico
- `sw.js` — Service Worker manual
- `manifest.json` — manifest manual (VitePWA lo genera)
- `_config.yml` — config Jekyll
- `{css,js,icons}/` — carpeta basura de shell

### Internal

- `package.json` version sync a 3.0.0 (estaba desactualizado en 2.0.0)
- `PaywallModal.tsx` sin emojis (cumple `PROJECT_RULES.md`)
- `useSorteo.ts`: TODO de modo team resuelto, captura `teammateIds`
- `SorteoResult.teammates?: string[]` nuevo campo opcional
- Documentación completa actualizada: README, ARCHITECTURE, ROADMAP

---

## [2.0.0] — 2025 (pre-migración)

### Última versión Vanilla JS
- PWA funcional con 8 modos + paywall + stats + temas
- Arquitectura Vanilla modular con 17 archivos JS
- `ui.js` monolítico de ~3665 líneas como orquestador
- Publicada en Play Store como TWA
- Base visual cyberpunk/neón establecida

Todo el código v2 se preserva en `_legacy/js/` como referencia histórica.

---

## Convenciones

- **Breaking changes**: se marcan explícitamente con `**BREAKING**`
- **Features**: cambios `Added`
- **Refactors**: cambios `Changed` o `Internal`
- **Bug fixes**: cambios `Fixed`
- **Borrados**: `Removed`

## Links

- Repo: https://github.com/DIEGOSKY/splitr
- Docs: [`docs/`](docs/)
- Roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md)

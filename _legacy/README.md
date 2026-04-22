# _legacy

Código pre-migración a React/Vite/TypeScript. No se usa en runtime actualmente.

## Contenido

### `js/` — Vanilla JS original
Toda la lógica antes de migrar a React en v3. Archivos:
- `main.js`, `main-safe.js` — entry points
- `ui.js` (140KB!) — toda la UI monolítica
- `intros.js` (75KB) — animaciones de modos (ahora en `src/utils/intros/animations.ts`)
- `state.js`, `storage.js` — estado (ahora `src/store/useSplitStore.ts`)
- `audio.js`, `billing.js`, `icons.js`, `participants.js`, `paywall.js`,
  `performance.js`, `roulette.js`, `russian.js`, `selector.js`,
  `settings.js`, `stats.js`, `themes.js` — todos migrados a `src/`

### `test/` — Tests vanilla originales
Scripts que corrían antes de la migración. Ya no funcionan en el stack React/Vite:
- `edge-case-tests.js`, `stability-tests.js`, `pwa-validator.js`
- `index.html` — runner visual de tests
- `manual-checklist.md` — lista manual de QA

Para v3 se necesitan tests con Vitest (pendiente aprobación).

### `index.old.html` (62KB)
HTML monolítico pre-migración con todos los overlays inline. Hoy `index.html`
es solo un shell de 27 líneas para Vite.

### `sw.js`
Service Worker manual antiguo. Referenciaba rutas de `/js/*.js` que ya no existen.
VitePWA ahora genera automáticamente el SW en `dist/sw.js` con workbox.

### `manifest.json`
Manifest PWA manual (start_url `/splitr/index.html`, para GitHub Pages).
VitePWA genera `dist/manifest.webmanifest` con el `manifest` del `vite.config.ts`.

### `_config.yml`
Config de Jekyll / GitHub Pages. Al usar Vite build no es necesario.

## Por qué se conserva

1. Referencia histórica de features que podrían necesitar backport
2. Algunos valores/algoritmos específicos podrían faltar en la migración
3. Play Store TWA original aún corre una variante — hasta que se publique v3 como actualización, seguirá siendo útil como fuente de verdad

## Cuándo borrar

Después de que v3 esté publicada y estabilizada en Play Store ≥ 2 semanas sin issues críticos.

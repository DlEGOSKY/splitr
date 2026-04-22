# ROADMAP.md — Splitr v3

Estado al: 2026-04-17 · Versión: 3.0.0

---

## ✅ Completado

### Migración base (pre-sprints)
- Migración Vanilla JS → React 19 + TypeScript + Vite 6
- Zustand con persistencia localStorage
- VitePWA con Service Worker automático (workbox)
- Framer Motion para transiciones clave
- Lazy-loading de overlays pesados y `intros/animations.ts` (303 KB)

### Sprint A — Responsive + bugs
- Countdown con animación fluida (sin doble rebote)
- `#app` container responsive (móvil/tablet/desktop/XL)
- Botón SORTEAR sticky al fondo con backdrop glow
- Fix visibilidad de grid en pantallas anchas

### Sprint B — Stats redesign
- Pantalla transparente (no recuadro flotante)
- Summary cards (total, ganadores únicos, modo top, día top)
- Activity timeline 7 días con barras animadas
- Mode breakdown chips con fill proporcional
- Empty state rico con skeleton preview

### Sprint C — Ajustes profesionales
- Modal ajustes reescrito en 5 secciones (General/Audio/Visual/Datos/Sobre)
- `utils/backup.ts`: export/import JSON, wipe selectivo
- Reset confirm dialog para acciones destructivas
- Sincronización `APP_VERSION: 3.0.0` con `package.json`

### Sprint D — Splitr Pro donativo
- Narrativa personal de dev indie
- Bundle CTA rediseñado (fix texto cortado)
- Tier label + thanks footer
- Restore button menos prominente

### Sprint E — Features F6
- CSV export del historial con BOM UTF-8 (Excel-friendly)
- Deep links `?q=...&mode=...&names=...` con auto-apply
- Share de grupos con Web Share API + fallback clipboard
- Toast de confirmación en todas las acciones

### Sprint F — Calidad de producto (F5)
- `ErrorBoundary` a nivel App
- `OfflineIndicator` transient banner
- Preload hints en `index.html`
- Fonts preconnect

### Sprint G — Deuda técnica
- CSS modularizado: `modules/stats.css`, `settings.css`, `paywall.css`, `result.css`
- `ux-improvements.css`: 2352 → 1483 líneas (-37%)
- Legacy Vanilla movido a `_legacy/js/` (440 KB fuera del path activo)

### Sprint I — Deuda técnica crítica
- `package.json` sync a versión 3.0.0
- Fix warning de build (Toast mixed import en HomeScreen)
- Cleanup root: `index.old.html`, `sw.js`, `manifest.json`, `_config.yml`, `test/`, `{css,js,icons}/` → todos a `_legacy/`
- Emojis reemplazados en PaywallModal por SVG icons (heart, check, loader)
- Modo **Team** completo: `SorteoResult.teammates[]` + ResultOverlay con chips de equipo
- Duplicados CSS cross-file eliminados (stats-empty, settings-toggle-*, paywall-bundle-*)
- CSS bundle: 142 → 139 KB

### Sprint J — Docs refresh
- README.md reescrito para v3
- `docs/ARCHITECTURE.md` reescrito (React/TS/Vite/Zustand/Framer Motion)
- `docs/ROADMAP.md` actualizado (este archivo)
- `CHANGELOG.md` creado

---

## 🔄 Pendiente

### Sprint K — Features basadas en fortalezas
Ideas propuestas en `docs/ANALISIS_V3.md` sección 5:

- **K.1 Templates rápidos** — botón "Plantillas" con 5-6 casos predefinidos (paga-cena, equipos-futbol, torneo-8) usando deep links
- **K.2 Replay del sorteo** — botón "Ver de nuevo" en ResultOverlay que rejuega la secuencia guardada
- **K.3 Voice commands extendidos** — parser en `useVoice` para "agregar X", "borrar todos", "cambiar modo Y"
- **K.4 Stats insights** — análisis automático sobre `sessionHistory` (racha, día más activo, top 3)
- **K.5 Skins temporada** — pack Halloween/Navidad/Año Nuevo con 2-3 skins nuevas

### Sprint L — Testing (pendiente aprobación de deps)
- Vitest + @testing-library (~0 KB runtime, solo dev)
- Tests unitarios de `selector.ts`, `deepLink.ts`, `backup.ts`, `audio.ts`
- Tests de componentes críticos (Toast, ErrorBoundary, useSorteo)
- CI básico en GitHub Actions

### Sprint M — Monetización real
Solo cuando haya 3+ meses de datos reales para decidir:
- A/B test del paywall (si el producto tiene analytics instalado)
- Nuevas skins Pro basadas en data
- Descuentos temporales / bundles

---

## 🧹 Deuda técnica restante

| Área | Acción | Prioridad |
|------|--------|-----------|
| `components.css` 4150L | Migrar por dominios (buttons, modals, grid, overlays) | Media |
| `ux-improvements.css` 1483L | Terminar de modularizar lo que queda | Baja |
| ~15 duplicados internos en `components.css` | Unificar gap/values inconsistentes | Baja |
| 0 tests | Introducir Vitest (ver Sprint L) | Alta |
| `DEPLOYMENT.md` | Reescribir para flujo Vite + TWA actual | Baja |
| Modo team UI | Polish visual de chips de teammates | Baja |

---

## 🎯 Prioridades futuras

1. **Testing** (Sprint L) — sin tests es imposible refactorizar con confianza
2. **Features K** — construir sobre lo sólido (templates, replay, voice)
3. **CSS cleanup final** — unificar components.css cuando haya tests de regresión visual
4. **Release v3 en Play Store** — cuando todo lo anterior esté estable

---

## Regla general

> No agregar features llamativas antes de:
> - ✅ rendimiento (resuelto)
> - ✅ arquitectura (resuelto post Sprint I)
> - ✅ claridad visual (resuelto post Sprint B/C/D)
> - 🔄 tests (pendiente)

Con los sprints A-J completos, Splitr está en **estado "listo para construir encima"**. La decisión sigue siendo: pagar la deuda de testing (L) antes de la siguiente ola de features (K).

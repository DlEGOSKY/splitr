# Análisis exhaustivo Splitr v3 — Abril 2026

Revisión archivo por archivo post-migración React/TypeScript/Vite.
Fecha: 2026-04-17 · Versión analizada: 3.0.0

---

## 1. Resumen ejecutivo

Splitr v3 es un producto **sólido y funcionalmente completo**: PWA instalable, 13+ modos, stats reales, paywall donativo, deep links, export CSV, share link, persistencia local, temas y personalización.

El **build es limpio** (tsc + vite sin errores), el lazy-loading funciona, las animaciones pesadas están en chunks separados.

Sin embargo hay **deuda técnica acumulada** de la migración v2→v3 que conviene saldar antes de seguir construyendo encima:
- CSS con **triple capa de definiciones** (`components.css` + `ux-improvements.css` + `modules/*.css`) con **clases duplicadas** y estilos contradictorios
- **Archivos de configuración obsoletos** en root que referencian código legacy
- **Docs desactualizados** (describen la app Vanilla pre-migración)
- **Violaciones menores** de reglas del proyecto (emojis en `PaywallModal`)
- **1 warning de build** por import mixto de `Toast`

---

## 2. Inventario físico

### 2.1 Código fuente React/TS (47 archivos en `src/`)

| Categoría | Archivos | Tamaño líder |
|-----------|----------|-------------|
| Screens | 2 | `HomeScreen.tsx` **497 líneas** |
| Components | 20 | `SettingsModal.tsx` 15KB |
| Hooks | 6 | `useSorteo.ts` 4.6KB |
| Utils | 14 | `intros/animations.ts` **303KB** |
| Store | 1 | `useSplitStore.ts` |

### 2.2 CSS (8 archivos en `css/`)

| Archivo | Líneas | KB | Estado |
|---------|--------|-----|--------|
| `components.css` | **4150** | **118** | MONSTRUO sin modularizar |
| `ux-improvements.css` | 1288 | 42 | Parcialmente migrado |
| `animations.css` | ~450 | 14 | OK |
| `themes.css` | ~550 | 14 | OK |
| `base.css` | ~220 | 6.5 | OK |
| `modules/stats.css` | 367 | 9.6 | ✅ Nuevo |
| `modules/settings.css` | 250 | 6.4 | ✅ Nuevo |
| `modules/paywall.css` | 163 | 4.1 | ✅ Nuevo |

### 2.3 Archivos de root

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `index.html` | Entry Vite | ✅ OK (27 líneas) |
| `index.old.html` | **62KB** legacy HTML | ⚠️ Basura |
| `manifest.json` | PWA manifest manual | ⚠️ Conflicto con VitePWA |
| `sw.js` | Service Worker manual | ⚠️ Obsoleto (cachea rutas de `js/` legacy) |
| `_config.yml` | Jekyll? (25 bytes) | ❓ Sospechoso |
| `_legacy/js/` | Código pre-React (440KB) | ✅ Bien aislado |
| `test/` | Tests vanilla pre-React | ⚠️ No corren con Vite |
| `{css,js,icons}/` | Carpeta con nombre literal | ❌ Basura |
| `.well-known/` | Android TWA asset links | ✅ OK (vacío todavía) |

### 2.4 Documentación

| Archivo | Estado |
|---------|--------|
| `README.md` | ⚠️ Menciona Vanilla, no React |
| `AGENTS.md` | ✅ Actualizado |
| `PROJECT_RULES.md` | ✅ Actualizado |
| `DEPLOYMENT.md` | ⚠️ Guía de despliegue vieja |
| `docs/ARCHITECTURE.md` | ❌ Describe arquitectura Vanilla obsoleta |
| `docs/PERFORMANCE.md` | ⚠️ Principios OK, detalles desactualizados |
| `docs/ROADMAP.md` | ❌ Habla de `ui.js` que ya no existe |
| `docs/SCALABILITY.md` | ✅ Principios válidos |
| `docs/TECH_OPTIONS.md` | ❌ Pregunta "¿migrar?" que ya se respondió |
| `docs/UI_SYSTEM.md` | ✅ Principios válidos |
| `docs/UPGRADE_PLAN.md` | ✅ Ejecutado (F1-F5 ✅) |

---

## 3. Fortalezas

### 3.1 Arquitectura React bien implementada
- Zustand como store único, persistencia selectiva por dominio
- Hooks bien separados (`useSorteo`, `useHoldToSpin`, `useVoice`, `useParallax`, `useRipple`, `useInstallPrompt`)
- Lazy loading agresivo (Bomb, Roulette, Split, Coin, Dice, Russian, Paywall, AnimationPreview)
- `intros/animations.ts` (303KB) en chunk separado → bundle inicial queda en 132KB gzip

### 3.2 Separación de responsabilidades
- Lógica de sorteo pura en `utils/selector.ts` (crypto random ponderado)
- Persistencia explícita en `store/useSplitStore.ts`
- Audio/haptics desacoplados en `utils/audio.ts` + `utils/haptics.ts`
- Backup/export aislado en `utils/backup.ts`
- Deep links aislados en `utils/deepLink.ts`

### 3.3 PWA real
- VitePWA con precache automático
- Offline indicator (`OfflineIndicator.tsx`)
- Manifest con shortcuts, maskable icons, categorías
- Installable + theme-color + viewport-fit

### 3.4 UX pulido reciente
- Framer Motion integrado (Sprint UPGRADE F2): transiciones de pantalla, layout animations, swipe-to-dismiss, countdown cinematográfico
- Error Boundary
- Toast system reutilizable
- Haptic patterns diferenciados
- Share API nativo con fallback
- CSV export UTF-8 BOM (Excel-friendly)

### 3.5 Identidad visual conservada
- Cyberpunk/neón intacto
- 20 temas funcionales
- Skins Pro con animaciones premium
- Los principios de `UI_SYSTEM.md` (dramático, oscuro, neón) se respetan

### 3.6 Seguridad de crypto random
- `selectOne()` usa `crypto.getRandomValues()` con modulo bias correction
- No `Math.random()` para selección ponderada

---

## 4. Debilidades / falencias

### 4.1 CSS con deuda crítica (PRIORIDAD ALTA)

**Problema**: triple capa de definiciones con clases duplicadas.

Ejemplos confirmados:
| Clase | En `components.css` | En `ux-improvements.css` | En `modules/stats.css` |
|-------|--------------------|-----------------------|------------------------|
| `.stats-empty` | L1400 (con `::before` glow) | — | L185 (simple) |
| `.stats-empty-text` | L1441 (`font-display`, 700) | — | L198 (600) |
| `.stats-empty-icon` | L4613 (opacity 0.3) | — | L193 (opacity 0.6) |

`.paywall-bundle-cta` aparece **3 veces** con estilos distintos:
- `components.css:4082` — original
- `components.css:4464` — segundo intento
- `modules/paywall.css:49` — versión actual

`.settings-toggle-row`, `.settings-toggle-info`, `.settings-section-*` también duplicados entre `components.css` y `modules/settings.css`.

**Impacto**:
- Confusión al editar (¿qué archivo gana?)
- CSS cascade gana el último, dejando líneas muertas en archivos previos
- Bundle final de CSS **140KB** (25KB gzip) — aceptable pero mejorable
- Mantenimiento frágil: cambiar una regla puede tener efectos contradictorios

**Solución**: auditoría completa + extracción del resto de `components.css` a módulos.

### 4.2 `HomeScreen.tsx` sigue siendo el orquestador pesado (497 líneas)

Contiene:
- Todas las callbacks de los 8+ overlays
- Lógica de deep links
- Manejo de `sortear()` con múltiples ramas por modo
- Integración con useHoldToSpin, useVoice, useSorteo
- Render de 10+ modales condicionales

AGENTS.md dice "reducir el tamaño del orquestador principal cuando sea posible". 497 líneas no es crítico pero es divisible en:
- `HomeScreen.tsx` (UI root)
- `hooks/useOverlayRouter.ts` (lógica de qué overlay mostrar según modo)
- `hooks/useDeepLinkSync.ts` (el useEffect actual)

### 4.3 Violaciones de `PROJECT_RULES.md`

**"Do not add emojis anywhere"** — agregué en sprints recientes:
- `PaywallModal.tsx:125` → 🎉
- `PaywallModal.tsx:130` → ⏳
- `PaywallModal.tsx:135` → 🍕
- `PaywallModal.tsx:147` → ☕

Además en `utils/intros/animations.ts:1400` → 🏆 y L3125 → 💎 (pre-existentes, dentro de canvas, probablemente OK pero listados).

Los `♥` en `SettingsModal` y `PaywallModal` son caracteres Unicode (dingbat), técnicamente no son emoji → permitidos.

### 4.4 Archivos obsoletos en root

- `index.old.html` (62KB) — HTML monolítico de la era Vanilla, **completamente muerto**
- `manifest.json` (root) — conflicto con el que genera VitePWA (diferente `start_url`)
- `sw.js` (root) — referencia rutas `./js/main.js`, `./js/ui.js` que ya no existen (movidas a `_legacy/`)
- `{css,js,icons}/` — carpeta vacía con nombre literal incluyendo llaves (basura de shell)
- `test/` — 5 archivos de tests vanilla que no corren con Vite ni saben de React
- `_config.yml` — 25 bytes, probablemente config de Jekyll/GitHub Pages abandonada

### 4.5 Docs desactualizados

`docs/ARCHITECTURE.md` describe la arquitectura **previa a la migración**:
- Menciona `ui.js` (3665 líneas) — archivo ahora en `_legacy/`
- No menciona React, TypeScript, Zustand, Vite, Framer Motion
- Tablas de módulos referencian `ui.js`, `intros.js` (ya migrados)

`docs/ROADMAP.md` tiene prioridades marcadas ✅ que son del tiempo Vanilla. La Prioridad 5 "decisión tecnológica" ya está respondida (React).

`docs/TECH_OPTIONS.md` pregunta "¿migrar a React?" — decisión ya tomada.

`DEPLOYMENT.md` describe pasos para desplegar la PWA Vanilla. No cubre `vite build` ni despliegue de la versión React.

### 4.6 Warning de build

```
Toast.tsx is dynamically imported by HomeScreen.tsx but also statically imported by
App.tsx, GroupsModal.tsx, PaywallModal.tsx, SettingsModal.tsx, useVoice.ts,
StatsScreen.tsx, shareResult.ts, dynamic import will not move module into another chunk.
```

`HomeScreen.tsx` lo importa **estáticamente** en la línea 4 y **dinámicamente** en las líneas 464 y 480. Incoherente. El lazy import no ayuda porque el módulo ya está en el bundle principal.

### 4.7 TODO pendiente en código

`src/hooks/useSorteo.ts:64` — modo team solo devuelve el primero del equipo:
```ts
winnerId = team[0] // El primero del equipo seleccionado
// TODO: Mostrar todo el equipo en el resultado
```
El modo Team está **incompleto** a nivel de UI de resultado.

### 4.8 Sin tests automatizados

No hay Vitest/Jest. El directorio `test/` contiene scripts vanilla que nadie ejecuta. Fuera de `tsc --noEmit`, no hay garantías automáticas de no-regresión.

### 4.9 Package.json con información desactualizada

```json
"version": "2.0.0"
```
La constante `APP_VERSION` en el código dice `3.0.0`. Divergencia.

---

## 5. Ideas nuevas basadas en fortalezas

Explotando lo que ya existe sin agregar complejidad.

### 5.1 Aprovechar deep links para **templates predefinidos**

Ya tenemos `?q=...&mode=...&names=...`. Con un mini "catálogo" de templates:
```
?template=paga-cena          → modo normal + 4 slots vacíos
?template=equipos-futbol     → modo team + 10 slots
?template=torneo-8           → modo tournament + 8 slots
```
Botón en home: **"Plantillas rápidas"** → lista de 5-6 casos comunes.

### 5.2 Aprovechar `exportHistoryCSV` para **stats insights**

Tenemos datos reales en `sessionHistory`. Podemos mostrar:
- "Modo más usado esta semana"
- "Día más activo"
- "Racha actual"
- "Top 3 participantes por victorias" (ya parcial)

Todo esto sale de datos que ya tenemos.

### 5.3 Aprovechar `buildDeepLink` para **persistencia en la nube gratis**

Sin backend, el link ES el estado. Si el usuario guarda el link en Google Keep/Notes, tiene backup cross-device. Documentar esto en Help.

### 5.4 Aprovechar `savedGroups` + `shareGroup` para **grupos colaborativos sin backend**

Usuario A crea grupo → comparte link → usuario B lo importa. Los cambios no sincronizan pero es un MVP de "colaboración" sin costo de infra.

### 5.5 Aprovechar `billing.ts` + `skins.ts` para **skins de temporada**

Ya hay infra de IAP. Añadir pack temático (Halloween, Navidad, Año Nuevo) con 2-3 skins nuevas. Cero refactor, solo contenido.

### 5.6 Aprovechar `useVoice` para **modo manos libres completo**

Ya reconoce "sortear". Extender a:
- "Agregar Juan"
- "Borrar todos"
- "Cambiar a modo duelo"
- "Repetir último sorteo"

Gran win de accesibilidad + feeling premium.

### 5.7 Aprovechar Framer Motion para **"replay" del sorteo**

Después de revelar ganador, botón "Ver de nuevo" que rejuega la animación desde la secuencia guardada. Fácil con `AnimatePresence`.

---

## 6. Plan actualizado — Sprints pendientes

### Sprint I — Deuda técnica CRÍTICA (SIGUIENTE)
**Objetivo**: dejar el código en estado mantenible antes de añadir features nuevas.

#### I.1 CSS audit completo (1-2 sesiones)
- Migrar `components.css` (4150L) en módulos dominio:
  - `modules/buttons.css`
  - `modules/modals.css`
  - `modules/overlays.css`
  - `modules/grid.css`
  - `modules/mode-selector.css`
  - `modules/theme-panel.css`
- Eliminar duplicados con `modules/stats.css`, `settings.css`, `paywall.css`
- Verificar que no haya regresiones visuales

#### I.2 Cleanup root (30 min)
- Borrar `index.old.html`
- Borrar `{css,js,icons}/` (carpeta basura)
- Borrar `_config.yml` si no se usa
- Revisar `test/` — mover a `_legacy/test/` o borrar
- Decidir `manifest.json` root vs VitePWA (probablemente borrar el root)
- Decidir `sw.js` root vs VitePWA generado (probablemente borrar el root)

#### I.3 Fix warning de build (5 min)
- Quitar los `import('../components/Toast')` dinámicos de `HomeScreen.tsx:464,480`
- Usar el `showToast` ya importado estáticamente

#### I.4 Completar modo Team (1 sesión)
- Cambiar `SorteoResult` para aceptar `winners: string[]`
- Actualizar `ResultOverlay` para mostrar equipo completo si es team mode
- Eliminar TODO de `useSorteo.ts:64`

#### I.5 Revertir emojis de PaywallModal
- Reemplazar 🍕 🎉 ⏳ ☕ con SVG icons (ya tenemos `utils/icons.tsx`)
- Mantener la narrativa pero sin violar la regla

#### I.6 Sync package.json version
- `"version": "2.0.0"` → `"3.0.0"`

---

### Sprint J — Docs refresh (1 sesión)
**Objetivo**: que los docs reflejen la realidad.

- Reescribir `docs/ARCHITECTURE.md` para v3 (React/TS/Vite/Zustand/Framer Motion)
- Actualizar `docs/ROADMAP.md` con sprints A-H completos
- Actualizar `docs/PERFORMANCE.md` con métricas actuales (426KB/132KB gzip)
- Archivar `docs/TECH_OPTIONS.md` como histórico
- Actualizar `README.md` con stack real y estado v3
- Reescribir `DEPLOYMENT.md` para flujo Vite build → GitHub Pages/Netlify
- Crear `CHANGELOG.md` con historial v2 → v3

---

### Sprint K — Features basadas en fortalezas
**Objetivo**: construir encima de lo sólido, no sobre arena.

#### K.1 Templates rápidos (idea 5.1)
- Botón "Plantillas" en home
- 5-6 casos predefinidos con deep links

#### K.2 Replay sorteo (idea 5.7)
- Botón "Ver de nuevo" en ResultOverlay
- Reusa secuencia de AnimationStep ya guardada

#### K.3 Voice commands extendidos (idea 5.6)
- Parser de comandos naturales en `useVoice`
- Integración con acciones del store

---

### Sprint L — Testing (cuando la deuda esté saldada)
- Instalar Vitest (pedir aprobación)
- Tests unitarios de `selector.ts`, `deepLink.ts`, `backup.ts`, `selector.ts`, `audio.ts`
- Tests de componentes con @testing-library
- CI en GitHub Actions

---

### Sprint M — F7 Monetización real (último)
Solo cuando 3+ meses de datos reales justifiquen decisiones.

---

## 7. Métricas finales tras el análisis

### Build actual
```
Main bundle:    426.5 KB (132.6 KB gzip)
Animations:     137.1 KB (36.3 KB gzip) — lazy
CSS:            140.4 KB (25.7 KB gzip) — modular parcial
PWA precache:   740.9 KB (16 entries)
Build time:     ~5s
TypeScript:     clean
Warnings:       1 (Toast mixed import)
```

### Code quality
```
TypeScript errors:  0
Lint errors:        0 (salvo falsos positivos de intros module)
TODOs en código:    1 (modo team)
Tests:              0
CSS duplicates:     ~10 clases confirmadas
Archivos muertos:   ~7 en root
```

### Fortaleza del producto
- UX: **A-** (Framer Motion eleva el nivel)
- Arquitectura: **B+** (deuda CSS baja la nota)
- Performance: **A-** (bundle inicial 132KB gzip)
- Features: **A** (completo y diferenciado)
- Mantenibilidad: **B** (docs desactualizados + CSS triple capa)

## Conclusión

Splitr v3 **ya es un producto real**. El trabajo de los sprints A-H lo sacó de "app impresionante" a "app usable con narrativa propia".

Pero para que el producto crezca más sin volverse frágil, el **Sprint I (deuda técnica)** es la siguiente prioridad innegociable. Después de eso, el producto tiene superficie para crecer en contenido (templates, skins temáticos, voice commands) sin seguir inflando archivos.

**La próxima decisión del dev debería ser**: pagar deuda (Sprint I) antes de añadir features (Sprint K).

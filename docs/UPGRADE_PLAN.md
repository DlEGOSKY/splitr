# UPGRADE_PLAN.md — Splitr v2 → v3

## Estado actual
- Stack: Vite + React 19 + TypeScript + Zustand (correcto, no cambiar)
- Build: 450KB JS / 118KB CSS / PWA con SW
- 17 componentes, 5 hooks, 10 utils
- CSS polish completado, inline styles minimizados
- `intros.ts` pesa 302KB (⚠️ ~67% del JS total)

---

## FASE 1 — Performance & Arquitectura (alta prioridad)

### 1.1 Code-split intros.ts (~302KB)
**Impacto:** Reducir bundle inicial de 450KB a ~180KB
**Cómo:** Lazy import con `React.lazy()` + dynamic `import()`. Cada intro se carga solo cuando se necesita su modo.
**Archivos:** `src/utils/intros.ts` → dividir en módulos por modo
**Esfuerzo:** Medio

### 1.2 Lazy-load overlays pesados
**Impacto:** Faster initial load, menos memoria idle
**Cómo:** `React.lazy()` para BombOverlay, RouletteOverlay, SplitOverlay, CoinOverlay, DiceOverlay
**Archivos:** `src/screens/HomeScreen.tsx`
**Esfuerzo:** Bajo

### 1.3 React.memo en componentes puros
**Impacto:** Menos re-renders innecesarios
**Cómo:** Memo en ParticipantGrid avatares individuales, ModeSelector, ThemePanel swatches
**Archivos:** Grid, selectors, theme
**Esfuerzo:** Bajo

### 1.4 Mover AudioContext a un singleton limpio
**Impacto:** Evitar múltiples instancias, mejor gestión de lifecycle
**Cómo:** Ya es singleton pero no se limpia. Agregar cleanup en visibility change.
**Archivos:** `src/utils/audio.ts`
**Esfuerzo:** Bajo

---

## FASE 2 — Framer Motion (dependencia única, máximo impacto)

### 2.1 Instalar framer-motion (~15KB gzip)
**Justificación:** Es la única dependencia que transformaría la percepción de calidad. Spring physics reales en vez de cubic-bezier aproximados. Layout animations automáticas. Gesture system integrado.

### 2.2 Transiciones de pantalla Home ↔ Stats
**Impacto:** Se siente como app nativa en vez de swap abrupto
**Cómo:** `AnimatePresence` + slide/fade transitions
**Archivos:** `src/App.tsx`
**Esfuerzo:** Bajo

### 2.3 Layout animations en ParticipantGrid
**Impacto:** Al agregar/eliminar participantes, los demás se reordenan con spring animation
**Cómo:** `motion.div` con `layoutId` en cada avatar-wrap
**Archivos:** `src/components/ParticipantGrid.tsx`
**Esfuerzo:** Medio

### 2.4 Modal gestures — swipe to dismiss
**Impacto:** Se siente como bottom sheet nativo de iOS/Android
**Cómo:** `motion.div` con `drag="y"` + `dragConstraints` + `onDragEnd` dismiss
**Archivos:** Todos los modales (Settings, Groups, Help, Paywall)
**Esfuerzo:** Medio

### 2.5 Countdown cinematográfico
**Impacto:** El countdown se siente como una intro de película
**Cómo:** Spring scale con overshoot, blur→focus, camera shake sutil
**Archivos:** `src/components/CountdownOverlay.tsx`
**Esfuerzo:** Bajo

### 2.6 Winner reveal secuencial
**Impacto:** El momento más dramático de la app se siente A-tier
**Cómo:** Secuencia: blur background → spotlight expand → avatar spring in → name glitch → confetti
**Archivos:** `src/components/ResultOverlay.tsx`
**Esfuerzo:** Medio

---

## FASE 3 — Micro-interacciones UX

### 3.1 Skeleton loading en grid vacío
**Impacto:** No hay "nada" en pantalla, siempre hay affordance visual
**Cómo:** Ghost circles con shimmer animation cuando hay 0 participantes
**Archivos:** `src/components/ParticipantGrid.tsx`, CSS
**Esfuerzo:** Bajo

### 3.2 Input auto-scroll + flash al agregar participante
**Impacto:** Feedback visual de que se agregó exitosamente
**Cómo:** Scroll to new avatar + brief highlight glow
**Archivos:** `src/screens/HomeScreen.tsx`, `src/components/ParticipantGrid.tsx`
**Esfuerzo:** Bajo

### 3.3 Haptic patterns diferenciados
**Impacto:** Cada acción se siente distinta al tacto
**Cómo:** Crear un `haptics.ts` con patrones: tap (8ms), success (15,10,30), error (50,20,50), winner (50,30,100,30,200)
**Archivos:** Nuevo `src/utils/haptics.ts`, reemplazar `navigator.vibrate` directos
**Esfuerzo:** Bajo

### 3.4 Sound polish — reverb + envelope
**Impacto:** Sonidos más "diseñados", menos chip-tune
**Cómo:** Agregar ConvolverNode con impulse response corto, refinar ADSR envelopes
**Archivos:** `src/utils/audio.ts`
**Esfuerzo:** Medio

### 3.5 Long-press to edit name (inline)
**Impacto:** UX directa para renombrar sin modal
**Cómo:** contentEditable o input overlay al hacer long-press en nombre del avatar
**Archivos:** `src/components/ParticipantGrid.tsx`
**Esfuerzo:** Medio

### 3.6 Drag-to-reorder avatares
**Impacto:** Control directo del orden
**Cómo:** Con framer-motion `Reorder` component
**Archivos:** `src/components/ParticipantGrid.tsx`
**Esfuerzo:** Medio (trivial si framer-motion ya está)

---

## FASE 4 — Visual premium

### 4.1 Parallax sutil en home background
**Impacto:** Profundidad visual sin costo de performance
**Cómo:** CSS transform con scroll listener (throttled), solo 2-3px de movimiento
**Archivos:** CSS + HomeScreen
**Esfuerzo:** Bajo

### 4.2 Theme morph transition
**Impacto:** Cambiar tema se siente como magia
**Cómo:** Clip-path circle expand desde el swatch tocado
**Archivos:** `src/components/ThemePanel.tsx`, CSS
**Esfuerzo:** Medio

### 4.3 Stats donut chart con animación de stroke
**Impacto:** Los datos cobran vida
**Cómo:** SVG stroke-dasharray animado con delay escalonado per segment
**Archivos:** `src/screens/StatsScreen.tsx`
**Esfuerzo:** Medio

### 4.4 Gradient text en títulos clave
**Impacto:** Más personalidad visual
**Cómo:** `background-clip: text` con gradient del tema activo
**Archivos:** CSS
**Esfuerzo:** Bajo

### 4.5 Glassmorphism adaptativo por tema
**Impacto:** Cada tema tiene su propia personalidad en modales
**Cómo:** CSS vars por tema para modal bg opacity, border tint, glow color
**Archivos:** CSS themes
**Esfuerzo:** Bajo

---

## FASE 5 — Calidad de producto

### 5.1 Error Boundaries
**Impacto:** La app nunca muestra pantalla blanca
**Cómo:** `ErrorBoundary` component en App level + per-screen
**Archivos:** Nuevo `src/components/ErrorBoundary.tsx`
**Esfuerzo:** Bajo

### 5.2 Accessibility audit
**Impacto:** Usable por todos, mejor score en auditorías
**Cómo:** Focus trap en modales, aria-live regions, skip links, keyboard nav completo
**Archivos:** Modales, overlays, grid
**Esfuerzo:** Medio

### 5.3 PWA enhanced — offline indicator
**Impacto:** El usuario sabe qué pasa sin conexión
**Cómo:** Detectar online/offline, mostrar badge sutil
**Archivos:** Nuevo hook + App.tsx
**Esfuerzo:** Bajo

### 5.4 Preload critical assets
**Impacto:** First paint más rápido
**Cómo:** Preload fonts en index.html, prefetch overlays
**Archivos:** `index.html`, `vite.config.ts`
**Esfuerzo:** Bajo

---

## Orden recomendado de implementación

| # | Tarea | Fase | Impacto | Esfuerzo |
|---|-------|------|---------|----------|
| 1 | Code-split intros.ts | 1.1 | 🔴 Alto | Medio |
| 2 | Lazy-load overlays | 1.2 | 🔴 Alto | Bajo |
| 3 | Instalar framer-motion | 2.1 | 🔴 Alto | Bajo |
| 4 | Transiciones de pantalla | 2.2 | 🔴 Alto | Bajo |
| 5 | Layout animations grid | 2.3 | 🔴 Alto | Medio |
| 6 | Modal swipe-to-dismiss | 2.4 | 🟡 Medio | Medio |
| 7 | Winner reveal secuencial | 2.6 | 🔴 Alto | Medio |
| 8 | Countdown cinematográfico | 2.5 | 🟡 Medio | Bajo |
| 9 | Skeleton loading | 3.1 | 🟡 Medio | Bajo |
| 10 | Haptic patterns | 3.3 | 🟡 Medio | Bajo |
| 11 | Error Boundaries | 5.1 | 🟡 Medio | Bajo |
| 12 | Gradient text títulos | 4.4 | 🟢 Bajo | Bajo |
| 13 | Glassmorphism por tema | 4.5 | 🟢 Bajo | Bajo |
| 14 | React.memo optimization | 1.3 | 🟡 Medio | Bajo |
| 15 | Stats donut animado | 4.3 | 🟡 Medio | Medio |
| 16 | Sound polish | 3.4 | 🟡 Medio | Medio |
| 17 | Theme morph transition | 4.2 | 🟢 Bajo | Medio |
| 18 | Drag-to-reorder | 3.6 | 🟡 Medio | Medio |
| 19 | Inline name editing | 3.5 | 🟡 Medio | Medio |
| 20 | Accessibility audit | 5.2 | 🟡 Medio | Medio |

---

## Dependencia única propuesta
```
framer-motion: ~15KB gzip
```
Justificación: Habilita fases 2.2–2.6, 3.6. Una sola dependencia que afecta 6+ mejoras.
Sin ella: se pueden hacer versiones CSS-only de la mayoría, pero con calidad inferior.

## Lo que NO se recomienda
- ❌ Cambiar de stack (ya estás en el correcto)
- ❌ Agregar Tailwind (tu CSS system es más personalizado y ya está maduro)
- ❌ Agregar state management extra (Zustand es suficiente)
- ❌ SSR/Next.js (innecesario para PWA client-only)
- ❌ Testing framework ahora (priorizar UX primero, tests después)

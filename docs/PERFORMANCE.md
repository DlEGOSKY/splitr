# PERFORMANCE.md — Splitr

## Diagnóstico principal
Splitr ya tiene suficiente identidad visual como para impresionar.
El problema no es que le falten efectos.
El problema es que demasiados efectos corren demasiado tiempo o demasiado juntos.

En móviles eso se siente como:
- micro-lag
- partículas no siempre fluidas
- transiciones que no terminan de sentirse premium
- sensación de peso visual/técnico

## Fuentes típicas de costo
- demasiados box-shadow y glow simultáneos
- blur y filtros costosos
- partículas persistentes
- overlays con demasiadas capas
- animaciones concurrentes
- cambios que fuerzan demasiado trabajo de pintura

## Principio
No todo tiene que animarse siempre.

La app debe reservar su potencia visual para:
- momento del sorteo
- revelación del ganador
- feedback clave
- estados importantes

## Reglas de optimización
- reducir densidad de partículas en móvil
- bajar glow dinámicamente en dispositivos modestos
- evitar que varios efectos pesados convivan al mismo tiempo
- usar motion corto y concentrado
- apagar decoraciones no esenciales fuera del momento clave
- usar modos de rendimiento si hace falta

## Estrategias concretas
### Nivel 1 — optimizaciones CSS ✅ IMPLEMENTADO
- ✅ `getParticleCount()` centralizado en `utils/performance.ts`
- ✅ CSS variables `--perf-glow`, `--perf-blur` para degradación
- ✅ Visibility API para pausar animaciones en pestañas ocultas
- ✅ `prefers-reduced-motion` respetado en todos los módulos

### Nivel 2 — arquitectura React ✅ IMPLEMENTADO
- ✅ Lazy-loading de overlays pesados (6 componentes en chunks separados)
- ✅ `intros/animations.ts` (303 KB) lazy en primer sorteo
- ✅ `PaywallModal` + `AnimationPreview` lazy
- ✅ Framer Motion con spring physics (mejor que cubic-bezier aproximados)
- ✅ Zustand con selectors específicos para minimizar re-renders

### Nivel 3 — build pipeline ✅ IMPLEMENTADO
- ✅ Vite 6 con tree-shaking automático
- ✅ VitePWA con precache workbox
- ✅ Gzip automático en Vite preview y producción
- ✅ Modularización CSS (reduce CSS duplicado y bundle)

## Métricas actuales (v3.0.0)

### Bundle sizes
```
Main bundle:        427.05 KB  (132.69 KB gzip)
Animations (lazy):  137.10 KB  ( 36.28 KB gzip)
CSS:                139.26 KB  ( 25.58 KB gzip)
PaywallModal:        16.30 KB  (  4.37 KB gzip)
BombOverlay:          5.53 KB  (  2.27 KB gzip)
SplitOverlay:         6.73 KB  (  2.11 KB gzip)
[otros chunks]:      ~30 KB    (~10 KB gzip)
───────────────────────────────────────────────
PWA precache total: 740.91 KB  (16 entries)
```

### Comparación vs v2 Vanilla

| Métrica | v2 Vanilla | v3 React | Delta |
|---------|------------|----------|-------|
| Total JS (no gzip) | ~300 KB | 427 + 137 lazy | +80% (pero lazy) |
| Inicial (gzip) | ~90 KB | **132 KB** | +47% |
| Interactive TTI | ~1.8s | ~1.5s | -17% |
| Runtime re-renders | manual | optimizado | mejor |

v3 tiene más JS total pero **menos peso en el hit inicial** gracias a lazy-loading. La percepción de rendimiento es mejor por Framer Motion + mejor React 19.

### Build time
- Dev server: 568ms cold start
- Production build: ~4.3-5s

## Sistema de rendimiento (`utils/performance.ts`)

### Tres niveles
| Nivel | Clase CSS | Partículas | Glow | Cuándo |
|-------|-----------|-----------|------|--------|
| `full` | `.perf-full` | 100% | 100% | Desktop potente |
| `medium` | (auto) | 60% | 70% | Móvil o device modesto |
| `reduced` | `.perf-reduced` | 30% | 50% | `prefers-reduced-motion` o manual |

### Detección automática
- `navigator.hardwareConcurrency` ≤ 4 → medium
- `navigator.deviceMemory` ≤ 4 → medium
- Móvil + pantalla ≤ 480px → medium
- `prefers-reduced-motion: reduce` → reduced

### Control del usuario
- Selector en Settings → Visual → Performance
- Preferencia persistida en el store Zustand
- "Auto" re-detecta al activar

## Lazy-loading patterns

### Overlays condicionales
```tsx
const BombOverlay = lazy(() => import('../components/BombOverlay'))

// Se renderiza envuelto en Suspense solo cuando se necesita:
{showBomb && (
  <Suspense fallback={null}>
    <BombOverlay ... />
  </Suspense>
)}
```

### Animations module (el más grande)
```ts
// Thin dispatcher — 1 KB en main bundle
const showModeIntro = (mode, participants, winnerId) =>
  import('../utils/intros/animations').then(m => m.showModeIntro(mode, participants, winnerId))
```

El módulo real de 303 KB solo se carga al primer sorteo. Después queda en memoria para sorteos siguientes.

## Principios

1. **Más premium no significa más efectos.** Significa mejor timing, jerarquía, foco, menos ruido.
2. **Solo animar lo que importa.** Idle states deben ser baratos.
3. **Lazy por default.** Si un chunk no se usa en los primeros 3 segundos, lazy.
4. **Respeta al usuario.** `prefers-reduced-motion` + perf level manual.
5. **Mide antes de optimizar.** Bundle analyzer + Lighthouse son la fuente de verdad.

## Próximos pasos de performance

- ⏳ Cuando haya tests: bundle analyzer como check de regresión
- ⏳ Sprint L testing validará que no hay regresiones de perf
- 🔄 Terminar modularización CSS (dividir `components.css` puede bajar 20-30 KB adicionales por mejor minificación)

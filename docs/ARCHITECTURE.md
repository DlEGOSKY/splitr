# ARCHITECTURE.md — Splitr v3

## Objetivo
Definir cómo está organizada Splitr post-migración a React/TypeScript/Vite y hacia dónde debe evolucionar.

## Stack actual

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| UI | React 19 + TypeScript | Componentes claros, tipado, escalable |
| Build | Vite 6 + VitePWA | Dev rápido, chunks, SW automático |
| Estado | Zustand (persist middleware) | Simple, sin boilerplate, localStorage integrado |
| Animaciones | Framer Motion + CSS keyframes | Spring physics reales, layout anims |
| Audio | Web Audio API nativa | Sin dependencias, latencia mínima |
| Icons | SVG inline (`utils/icons.tsx`) | Sin fuentes de iconos externas |

**Build actual (post-optimización):**
- Bundle inicial: **427 KB** (132 KB gzip)
- Animations chunk (lazy): 137 KB (36 KB gzip)
- CSS: 139 KB (26 KB gzip)
- PWA precache: 16 entries (~740 KB)

## Estructura física

```
src/
├── main.tsx               # Entry + CSS imports + window.previewIntro
├── App.tsx                # ErrorBoundary → screens router
├── types.ts               # Participant, Mode, Phase, Prefs, AnimationStep
├── vite-env.d.ts
├── store/
│   └── useSplitStore.ts   # Zustand store global persistido
├── screens/
│   ├── HomeScreen.tsx     # ~500L — orquestador principal
│   └── StatsScreen.tsx    # Summary, history, activity, modes
├── components/            # 20 componentes
├── hooks/                 # 6 hooks
└── utils/                 # 14 utilidades puras
    └── intros/
        └── animations.ts  # 303 KB — lazy-loaded
```

## Centros del sistema

### A. Estado (`store/useSplitStore.ts`)
Zustand store persistido en localStorage. Contiene:
- `participants[]`, `question`, `mode`, `phase`, `winnerId`, `lastWinnerId`
- `prefs` (sound, vibration, particles, flash, glow, speed, theme)
- `savedGroups[]`, `sessionHistory[]`, `unlockedSkins{}`
- `duelIds[]`, `timesChosen{}`

**Principio:** el store es la única fuente de verdad para estado compartido. Estado local de UI (modales abiertos, inputs) vive en los componentes.

### B. Selección (`utils/selector.ts`)
Algoritmo puro sin side-effects:
- `secureRandom(max)` — modulo-bias-corrected sobre `crypto.getRandomValues`
- `selectOne(participants)` — pool ponderado por `6 - luck`
- `selectOneWithRevenge(participants, targetId)` — peso extra al target
- `selectMultiple(participants, n)` — sin repetición
- `selectOrder(participants)` — ordenamiento completo
- `buildAnimationSequence(active, winnerId, duration)` — timeline para el barrido

### C. Orquestación del sorteo (`hooks/useSorteo.ts`)
Coordina:
1. Resolución del ganador según `mode` (normal/team/revenge/elimination/etc.)
2. Construcción de secuencia de animación
3. Disparo de `onFlash(id)` y `onReveal(result)` con timers
4. Audio (scan tick, fanfare) y haptics (ramp, success)
5. Confetti al revelar ganador
6. Auto-eliminación en modo elimination
7. Retorna `teammates[]` para modo team

### D. Persistencia (`utils/backup.ts`)
- `exportBackup()` — serializa store a JSON descargable
- `importBackup(json)` — valida schema y restaura
- `wipeAllData()` — reset selectivo con confirmación
- `exportHistoryCSV(history)` — CSV con BOM UTF-8 para Excel

### E. Deep links (`utils/deepLink.ts`)
- `parseDeepLink()` — lee `?q=...&mode=...&names=...` al montar
- `buildDeepLink(payload)` — construye URL compartible
- `clearDeepLink()` — limpia params post-aplicación (sin reload)
- `copyToClipboard()` — fallback para navegadores viejos

### F. Audio/Haptics (`utils/audio.ts` + `utils/haptics.ts`)
- Singleton `AudioContext` lazy
- Web Audio para tick/fanfare/add/error/buildup
- Patrones hápticos: tap, success, error, ramp, winner

### G. Animaciones premium (`utils/intros/animations.ts`)
Canvas por modo y skin. **303 KB** — lazy-loaded en primer uso:
```ts
const showModeIntro = (mode, participants, winnerId) =>
  import('../utils/intros/animations').then(m => m.showModeIntro(...))
```

## CSS modular

### Estrategia actual
1. Base estructural en `css/base.css`, `animations.css`, `themes.css`
2. Estilos UI heredados en `css/components.css` (4150L — en migración)
3. Refinamientos UX en `css/ux-improvements.css`
4. Módulos nuevos por dominio en `css/modules/`:
   - `stats.css` — summary cards, activity, modes, empty states, history toolbar
   - `settings.css` — secciones, toggles, actions, confirm dialog
   - `paywall.css` — donation narrative, bundle CTA, tiers
   - `result.css` — teammates chips (modo team)

### Orden de imports (`main.tsx`)
Los módulos se importan **después** de `components.css` para que su cascade gane en caso de duplicado:
```ts
import '../css/base.css'
import '../css/animations.css'
import '../css/components.css'
import '../css/themes.css'
import '../css/ux-improvements.css'
import '../css/modules/stats.css'
import '../css/modules/settings.css'
import '../css/modules/paywall.css'
import '../css/modules/result.css'
```

## Contratos entre componentes

### HomeScreen → Overlays
Overlays se pasan callbacks como props:
```tsx
<BombOverlay
  visible={showBomb}
  participants={participants}
  onComplete={(wId) => { ... setResultData(...) }}
/>
```

### useSorteo callback pattern
```ts
runSorteo(
  (id) => setFlashingId(id),        // onFlash
  (result) => setResultData(result), // onReveal
  preSelectedWinner                   // optional pre-selection
)
```

### Store selectors en componentes
Preferir selectors específicos para evitar re-renders:
```ts
const participants = useSplitStore(s => s.participants)
// NO: const { participants, mode, ... } = useSplitStore()
```

## Lazy loading

**Chunks separados** (cargan solo cuando se necesitan):
- `BombOverlay`, `RouletteOverlay`, `SplitOverlay`, `CoinOverlay`, `DiceOverlay`, `RussianRouletteOverlay`
- `PaywallModal`, `AnimationPreview`
- `intros/animations.ts` (303 KB) — lazy al primer sorteo
- `skins.ts` — lazy

## Deuda técnica vigente

| Área | Detalle | Prioridad |
|------|---------|-----------|
| CSS | `components.css` 4150L sin terminar de modularizar; ~15 duplicados internos | Media |
| CSS | `ux-improvements.css` 1483L aún mezcla responsabilidades | Media |
| Tests | 0 tests automatizados (`_legacy/test/` es vanilla legacy) | Alta |
| Docs | `DEPLOYMENT.md` referencia flujo pre-Vite | Baja |
| Modo team | UI básica implementada pero visualmente simple | Baja |

## Principios de evolución

1. **Estado primero**: si algo es compartido, va al store. Si es local de UI, no.
2. **Componentes puros**: side-effects en hooks, no en render.
3. **Utils puros**: zero-dependencia externa, zero side-effects, zero store access.
4. **Lazy cuando pese**: cualquier chunk >30KB debe ser lazy.
5. **Modularizar por dominio**: no por tipo de archivo.
6. **Contrato > implementación**: si un componente requiere 5 callbacks, rediseñar.

## Carpetas de limpieza

- `_legacy/js/` — código Vanilla pre-migración (440 KB, no en runtime)
- `_legacy/test/` — tests vanilla pre-migración
- `_legacy/index.old.html`, `sw.js`, `manifest.json`, `_config.yml` — artefactos pre-Vite

Borrar cuando v3 esté publicada y estable en Play Store ≥ 2 semanas.

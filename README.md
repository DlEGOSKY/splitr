# Splitr — selector social con impacto

PWA instalable para convertir una decisión incómoda en un evento: quién paga, quién lava, quién expone, quién va primero.

**Versión actual:** 3.0.0
**Stack:** React 19 · TypeScript · Vite · Zustand · Framer Motion
**Plataforma:** PWA (web + Android TWA vía Play Store)

---

## Qué hace Splitr

- **13 modos de sorteo**: normal, eliminación, equipo, orden, duelo, venganza, moneda, dado, bomba, dividir, ruleta rusa, voz, torneo
- **Selección criptográficamente segura** con ponderación por suerte (1-5) y soporte de venganza
- **Personalización profunda**: 20 temas, 8 skins Pro desbloqueables, glow/speed ajustables
- **Persistencia local**: grupos guardados, historial de sorteos, preferencias
- **Stats reales**: summary cards, actividad 7 días, mode breakdown, donut chart, export CSV
- **Share & import**: deep links (`?q=...&mode=...&names=...`), share de grupos con Web Share API, backup JSON
- **Offline-first**: Service Worker con precache automático (VitePWA)
- **Accesibilidad**: ErrorBoundary, offline indicator, `prefers-reduced-motion`

---

## Getting started

```bash
# Instalar dependencias
npm install

# Dev server (abre http://localhost:5173)
npm run dev

# Build para producción (salida en dist/)
npm run build

# Preview del build
npm run preview
```

### Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19 + TypeScript |
| Build | Vite 6 + VitePWA |
| Estado | Zustand (persistido en localStorage) |
| Animaciones | Framer Motion + CSS keyframes |
| Audio | Web Audio API (sin librerías) |
| Icons | SVG inline (`src/utils/icons.tsx`) |
| Testing | Pendiente (ver ROADMAP) |

---

## Arquitectura rápida

```
src/
├── main.tsx              # Entry point + CSS imports
├── App.tsx               # Root: ErrorBoundary, OfflineIndicator, screens router
├── types.ts              # Participant, Mode, Phase, Prefs
├── store/
│   └── useSplitStore.ts  # Zustand store global persistido
├── screens/
│   ├── HomeScreen.tsx    # Pantalla principal con todos los overlays
│   └── StatsScreen.tsx   # Summary, history, activity, modes
├── components/
│   ├── ModeSelector.tsx, ParticipantGrid.tsx
│   ├── CountdownOverlay.tsx, ResultOverlay.tsx
│   ├── Settings/Groups/Help/PaywallModal.tsx
│   ├── Bomb/Coin/Dice/Split/Roulette/RussianOverlay.tsx
│   └── Toast.tsx, ErrorBoundary.tsx, OfflineIndicator.tsx
├── hooks/
│   ├── useSorteo.ts      # Orquestador del flujo de sorteo
│   ├── useHoldToSpin.ts, useVoice.ts, useParallax.ts
│   └── useInstallPrompt.ts
└── utils/
    ├── selector.ts       # Crypto-random weighted algorithm
    ├── audio.ts, haptics.ts, particles.ts
    ├── backup.ts, deepLink.ts, shareResult.ts
    ├── skins.ts, billing.ts
    └── intros/animations.ts  # 303KB — lazy-loaded

css/
├── base.css, components.css, animations.css, themes.css
├── ux-improvements.css   # Refinamientos del sprint UX
└── modules/              # Modularización por dominio
    ├── stats.css, settings.css, paywall.css, result.css
```

Detalles en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Reglas del proyecto

Antes de contribuir, leer en orden de autoridad:

1. **`AGENTS.md`** — cómo trabajar con la base, qué no romper
2. **`PROJECT_RULES.md`** — reglas no-negociables (sin emojis, sin deps sin aprobación)
3. **`docs/ARCHITECTURE.md`** — estructura y contratos
4. **`docs/PERFORMANCE.md`** — presupuesto visual, niveles de rendimiento
5. **`docs/UI_SYSTEM.md`** — identidad visual neón/cyberpunk
6. **`docs/SCALABILITY.md`** — qué crecer y qué no
7. **`docs/ROADMAP.md`** — sprints hechos y pendientes

---

## Estado del producto

### Completo y estable
- Migración Vanilla → React 19 + TypeScript + Vite
- PWA instalable con offline-first
- 13 modos, 20 temas, 8 skins Pro
- Stats reales, history, export CSV
- Deep links + share links
- Paywall con narrativa donativo
- Framer Motion en transiciones clave

### En roadmap (ver `docs/ROADMAP.md`)
- Tests unitarios (Vitest)
- Templates rápidos para casos comunes
- Replay del sorteo
- Voice commands extendidos
- Migración completa de `components.css` a módulos

---

## Filosofía

> Más premium no significa más efectos.
> Más premium significa mejor timing, mejor jerarquía, mejor foco, menos ruido.

Splitr debe sentirse **rápido, claro, dramático y mantenible** — en ese orden.

# PROJECT_RULES.md — Splitr

## Core directive
Improve Splitr without breaking the existing product, focusing on performance, modularity, and sustainable polish.

## Source of truth
Always follow:
- AGENTS.md
- README.md
- docs/ARCHITECTURE.md
- docs/PERFORMANCE.md
- docs/UI_SYSTEM.md
- docs/TECH_OPTIONS.md
- docs/ROADMAP.md
- docs/SCALABILITY.md

## Non-negotiables
- Do not break current PWA behavior
- Do not remove core finished features casually
- Do not add dependencies without approval
- Do not increase animation load before optimizing existing effects
- Do not refactor unrelated areas
- Do not turn the product into a generic minimal app
- Do not lose the current identity
- Do not add emojis anywhere

## Product goal
Splitr must feel:
- dramatic
- intentional
- smooth
- mobile-friendly
- premium
- maintainable
- scalable

## Work mode
1. identify one bottleneck
2. describe the strategy
3. touch only the relevant files
4. keep changes small and safe
5. preserve current feature coverage

## Fixed architecture principles
- sorteo logic stays isolated
- storage stays explicit
- audio/haptics stay optional and controlled
- effects should degrade gracefully on weaker devices
- large UI orchestrators should be reduced over time

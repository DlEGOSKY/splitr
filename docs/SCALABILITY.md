# SCALABILITY.md — Splitr

## ¿Es escalable?
Sí, pero con una condición:
no si sigue creciendo de la misma manera que hasta ahora.

Splitr es escalable en potencial, porque ya tiene:
- concepto claro
- producto real
- base PWA funcional
- persistencia local
- múltiples modos
- sistema visual propio

Pero para que siga siendo escalable en práctica, necesita:
- arquitectura más dividida
- menos carga en el módulo central
- performance budget real
- decisiones más frías sobre qué efectos merecen vivir

## Qué mejoras disponibles hay
- modo rendimiento para móviles modestos
- sistema de partículas adaptativo
- reveal engine más fino
- stats e historial más claros
- mejor gestión de grupos
- mejor haptic/audio tuning
- mejores transiciones entre overlays
- modularización por feature
- temas más consistentes
- ruta futura de migración a React/TS si el producto crece

## Qué falta
- una capa clara de feature modules
- criterio formal de performance
- reglas de diseño para no seguir sobrecargando
- documentación técnica de evolución
- roadmap de stack a mediano plazo

## Conclusión
Splitr no necesita otra idea.
Necesita entrar en una nueva etapa de madurez.

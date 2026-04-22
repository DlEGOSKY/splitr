# TECH_OPTIONS.md — Splitr

## Pregunta real
¿Conviene seguir en Vanilla PWA o migrar a otra tecnología?

La respuesta honesta es:
depende del objetivo de Splitr en la fase siguiente.

## Opción A — seguir en Vanilla JS
### Cuándo conviene
- si quieres mantener máxima ligereza
- si solo vas a optimizar, modularizar y pulir
- si el producto seguirá siendo una sola experiencia compacta
- si quieres conservar empaquetado simple como PWA/TWA

### Pros
- control total
- bundle mínimo
- sin overhead de framework
- buen fit para PWA simple

### Contras
- el mantenimiento se vuelve duro cuando la UI crece mucho
- overlays, estados y animaciones complejas escalan peor
- más disciplina manual en arquitectura

## Opción B — migrar a Vite + React + TypeScript
### Cuándo conviene
- si quieres seguir agregando módulos
- si quieres arquitectura más sostenible
- si quieres dividir la UI mejor
- si la app va a crecer bastante en settings, stats, cuentas, compras o personalización

### Pros
- componentes más claros
- estado más mantenible
- mejor escalabilidad estructural
- mejor testabilidad
- más fácil separar pantallas, modales y features

### Contras
- migración toma trabajo
- no arregla performance por sí solo
- si migras mal, puedes terminar igual de pesada

## Opción C — React + Capacitor/TWA
### Cuándo conviene
- si el objetivo es móvil como plataforma principal
- si luego quieres capacidades nativas más fuertes
- si apuntas más fuerte a Play Store como app-producto

### Pros
- mejor camino si quieres evolucionar a algo más “app”
- más control sobre experiencia móvil instalada

### Contras
- más complejidad
- más superficie técnica
- innecesario si aún no validas la siguiente etapa del producto

## Opción D — Next.js
### Cuándo conviene
- casi nunca para Splitr en su forma actual

### Comentario
Para esta app, Next.js normalmente sería exceso si el producto sigue siendo una PWA muy frontend y autocontenida.

## Recomendación real
### si quieres mejorar sin rehacer:
Quédate en Vanilla y entra a una fase de modularización fuerte.

### si quieres que Splitr crezca en serio:
La mejor migración futura sería:
Vite + React + TypeScript

## Lo que falta antes de decidir migración
- definir roadmap real de producto
- decidir si habrá cuentas, sync o backend
- decidir si habrá monetización más compleja
- decidir si la app seguirá siendo compacta o crecerá en módulos

# AGENTS.md — Splitr

## Propósito del proyecto
Mejorar Splitr como producto real ya funcional, sin destruir lo que ya logró.

Splitr ya tiene:
- identidad visual fuerte
- varios modos
- PWA instalable
- personalización
- persistencia local
- stats y grupos
- efectos y feedback

El objetivo ya no es “hacer que exista”.
El objetivo es hacer que se sienta mejor, corra mejor y escale mejor.

## Fuente de verdad
Antes de implementar cualquier cambio, leer y respetar:
- README.md
- PROJECT_RULES.md
- docs/ARCHITECTURE.md
- docs/PERFORMANCE.md
- docs/UI_SYSTEM.md
- docs/TECH_OPTIONS.md
- docs/ROADMAP.md
- docs/SCALABILITY.md

Si hay conflicto:
1. PERFORMANCE.md manda en lo que afecta fluidez
2. ARCHITECTURE.md manda en separación técnica
3. UI_SYSTEM.md manda en identidad visual y experiencia
4. TECH_OPTIONS.md manda en decisiones de evolución tecnológica
5. ROADMAP.md manda en prioridades
6. SCALABILITY.md manda en qué tanto crecer sin romper
7. README.md da la visión general

## Filosofía de trabajo
- primero estabilizar, luego adornar
- primero bajar fricción, luego meter más impacto
- primero dividir responsabilidades, luego agregar features
- no romper funcionalidades que ya están cerradas
- no refactorizar medio proyecto a la vez

## Meta del producto
Splitr debe sentirse:
- rápido
- claro
- dramático
- premium
- ligero para móvil
- mantenible
- escalable con criterio

## Reglas de implementación
- no agregar más efectos por defecto si ya existe lag
- no convertir cada pantalla en un festival de animaciones simultáneas
- no meter nuevas dependencias sin aprobación
- no tocar demasiados módulos a la vez
- mantener compatibilidad con PWA
- respetar que la app ya está publicada en prueba cerrada
- separar lógica visual de lógica de sorteo y de persistencia
- reducir el tamaño del “orquestador” principal cuando sea posible

## Reglas de UI
- conservar identidad cyberpunk/neón, pero con más control
- el glow no debe pesar más que la legibilidad
- los modales deben sentirse limpios, no pesados
- las animaciones deben ser intensas solo cuando importa
- la home debe seguir siendo protagonista, no saturada

## Reglas de respuesta
Antes de codificar:
- explicar estrategia en 2-3 líneas
- decir qué módulo se tocará
- listar archivos a crear o modificar

Después de codificar:
- listar archivos tocados
- explicar qué quedó funcionando
- mencionar el siguiente paso lógico sin implementarlo

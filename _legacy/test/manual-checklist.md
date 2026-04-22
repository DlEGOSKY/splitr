# 🧪 Manual Testing Checklist - Splitr

## Objetivo
Verificar manualmente funcionalidades críticas que no se pueden automatizar completamente.

---

## ✅ Módulos Extraídos

### Themes Module
- [ ] Cambiar tema desde el panel de temas
- [ ] Verificar que el tema se persiste al recargar
- [ ] Probar todos los 20 temas disponibles
- [ ] Verificar que meta theme-color cambia en PWA
- [ ] Comprobar feedback háptico al cambiar tema

### Settings Module  
- [ ] Abrir modal de configuración
- [ ] Cambiar cada setting y verificar que se guarda
- [ ] Probar sliders de glow y velocidad en tiempo real
- [ ] Verificar que pregunta por defecto se aplica
- [ ] Comprobar modo de rendimiento (auto/manual)

### Stats Module
- [ ] Ver estadísticas después de varios sorteos
- [ ] Cambiar entre tabs Stats/Historial
- [ ] Verificar gráfico donut con datos reales
- [ ] Comprobar persistencia de stats entre sesiones
- [ ] Probar con muchos participantes (20+)

### Paywall Module
- [ ] Abrir modal de compra desde skin bloqueada
- [ ] Verificar que muestra skins correctas por modo
- [ ] Probar botón "Restaurar compras"
- [ ] Cerrar modal sin comprar

### Roulette Module
- [ ] Activar modo ruleta en settings
- [ ] Hacer sorteo y verificar animación de casino
- [ ] Comprobar que respeta settings de partículas
- [ ] Verificar sonido de ruleta

### Russian Module
- [ ] Cambiar a modo "Ruleta Rusa"
- [ ] Hacer varios sorteos hasta que quede 1 superviviente
- [ ] Verificar animación de "muerte"
- [ ] Comprobar que no se puede continuar con 1 participante

### Intros Module
- [ ] Probar intro de cada modo (Normal, Eliminación, etc.)
- [ ] Verificar que intros Pro funcionan si están desbloqueadas
- [ ] Comprobar que respeta configuración de velocidad
- [ ] Verificar que no hay lag en dispositivos lentos

### Performance Module
- [ ] Verificar detección automática de dispositivo lento
- [ ] Cambiar modo de rendimiento manualmente
- [ ] Comprobar que partículas se reducen en modo bajo
- [ ] Verificar que efectos se adaptan al rendimiento

---

## ✅ Funcionalidades Core

### Participantes
- [ ] Agregar participante con Enter
- [ ] Agregar participante con botón
- [ ] Eliminar participante individual
- [ ] Editar nombre de participante
- [ ] Cambiar nivel de suerte (1-5 estrellas)
- [ ] Verificar que no se pueden agregar duplicados
- [ ] Probar nombres muy largos (50+ caracteres)
- [ ] Probar caracteres especiales (emojis, acentos)

### Modos de Sorteo
- [ ] **Normal**: Sorteo básico con 1 ganador
- [ ] **Eliminación**: Eliminar hasta que quede 1
- [ ] **Equipo**: Seleccionar equipo de N personas
- [ ] **Orden**: Revelar orden completo 1º, 2º, 3º...
- [ ] **Duelo**: Seleccionar 2, luego duelo entre ellos
- [ ] **Venganza**: Seleccionar target, luego sorteo especial
- [ ] **Ruleta Rusa**: Eliminar de a 1 hasta el final
- [ ] **Bomba**: Countdown + explosión
- [ ] **Dados**: Tirar dados virtuales

### Controles de Sorteo
- [ ] Hold-to-spin funciona correctamente
- [ ] Countdown 3-2-1 con timing correcto
- [ ] Animación de barrido/selección
- [ ] Resultado final con efectos
- [ ] Botón "Sortear de nuevo"
- [ ] Botón "Siguiente" en modos secuenciales

---

## ✅ UX Improvements

### Timings Mejorados
- [ ] Countdown se siente más natural (500ms base)
- [ ] Toast de error dura más que toast de info
- [ ] Modales abren con spring suave
- [ ] Entrada de participantes más elegante

### Jerarquía Visual
- [ ] Modales se ven más organizados
- [ ] Headers tienen menos glow, más legibilidad
- [ ] Inputs tienen focus states claros
- [ ] Botones tienen jerarquía primary/secondary/danger

### Cansancio Visual Reducido
- [ ] Avatares parpadean menos frecuentemente
- [ ] Glow idle es más sutil
- [ ] Partículas son menos agresivas
- [ ] Elementos no críticos no parpadean

### Accesibilidad
- [ ] Navegación por teclado funciona
- [ ] Focus visible en todos los elementos
- [ ] prefers-reduced-motion respetado
- [ ] Contraste adecuado en texto importante

---

## ✅ PWA y Compatibilidad

### Instalación PWA
- [ ] Banner de instalación aparece
- [ ] Instalación funciona en Chrome/Edge
- [ ] Ícono correcto en home screen
- [ ] Splash screen al abrir
- [ ] Funciona offline básico

### Responsive Design
- [ ] **Mobile (320px)**: Todo visible y usable
- [ ] **Tablet (768px)**: Layout se adapta bien
- [ ] **Desktop (1200px+)**: Aprovecha espacio extra
- [ ] **Landscape móvil**: No se rompe el layout

### Navegadores
- [ ] **Chrome**: Funcionalidad completa
- [ ] **Firefox**: Sin errores críticos
- [ ] **Safari**: Compatibilidad básica
- [ ] **Edge**: Funcionalidad completa
- [ ] **Mobile Safari**: PWA funciona

---

## ✅ Performance

### Dispositivos Lentos
- [ ] Carga inicial < 3 segundos
- [ ] Animaciones fluidas (no choppy)
- [ ] Partículas reducidas automáticamente
- [ ] No lag en sorteos con 20+ participantes

### Memoria
- [ ] No aumenta memoria después de 50 sorteos
- [ ] Imágenes/canvas se limpian correctamente
- [ ] Event listeners no se acumulan

### Almacenamiento
- [ ] localStorage no crece indefinidamente
- [ ] Datos corruptos se manejan gracefully
- [ ] Backup/restore de configuración

---

## ✅ Edge Cases Críticos

### Datos Extremos
- [ ] 0 participantes: botón deshabilitado
- [ ] 1 participante: botón deshabilitado  
- [ ] 50+ participantes: grid responsive
- [ ] Nombres de 100+ caracteres: truncados
- [ ] Caracteres especiales: escapados correctamente

### Estados Inconsistentes
- [ ] Eliminar participante durante animación
- [ ] Cambiar modo durante sorteo
- [ ] Cerrar app durante animación
- [ ] Perder conexión durante intro Pro

### Límites del Sistema
- [ ] localStorage lleno: manejo graceful
- [ ] Sin permisos de vibración: no error
- [ ] Sin audio: no error
- [ ] Canvas no soportado: fallback

---

## ✅ Regresiones Comunes

### Después de Modularización
- [ ] Todos los imports funcionan
- [ ] No hay variables undefined
- [ ] Event listeners siguen funcionando
- [ ] Callbacks se pasan correctamente

### Después de UX Improvements
- [ ] Animaciones no se rompieron
- [ ] CSS no tiene conflictos
- [ ] Timings no son demasiado lentos/rápidos
- [ ] Accesibilidad no empeoró

---

## 🚨 Criterios de Fallo

**Bloquean release:**
- [ ] No se puede hacer sorteo básico
- [ ] Crash al abrir cualquier modal
- [ ] Datos se pierden al recargar
- [ ] PWA no instala en Chrome
- [ ] Ilegible en móvil

**Requieren fix:**
- [ ] Lag notable en animaciones
- [ ] Configuración no se guarda
- [ ] Modo específico no funciona
- [ ] Accesibilidad rota

**Pueden esperar:**
- [ ] Efectos visuales menores
- [ ] Compatibilidad con navegadores antiguos
- [ ] Optimizaciones de performance

---

## 📝 Notas de Testing

**Dispositivos recomendados:**
- iPhone SE (pantalla pequeña)
- iPad (tablet)
- Android mid-range (performance medio)
- Desktop 1080p (estándar)

**Escenarios de uso:**
- Usuario nuevo (primera vez)
- Usuario frecuente (muchos sorteos)
- Sesión larga (30+ minutos)
- Multitarea (cambiar apps)

**Datos de prueba:**
- 2-3 participantes (mínimo)
- 10-15 participantes (típico)
- 30+ participantes (estrés)
- Nombres normales y extremos

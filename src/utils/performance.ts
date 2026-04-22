interface PerformanceInfo {
  isSlowDevice: boolean
  isMobile: boolean
  prefersReducedMotion: boolean
  isBackgrounded: boolean
  level: 'full' | 'medium' | 'reduced'
}

const perf: PerformanceInfo = {
  isSlowDevice: false,
  isMobile: false,
  prefersReducedMotion: false,
  isBackgrounded: false,
  level: 'full',
}

function detectDeviceCapabilities(): PerformanceInfo {
  const cores = navigator.hardwareConcurrency || 4
  const mem = (navigator as any).deviceMemory || 4
  const isTouchOnly = window.matchMedia('(hover: none)').matches
  const isSmallScreen = window.innerWidth <= 480
  
  perf.isMobile = isTouchOnly || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  perf.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  // Dispositivo lento: muy pocos cores, muy poca memoria, o móvil muy pequeño
  perf.isSlowDevice = cores <= 2 || mem <= 2 || (perf.isMobile && isSmallScreen && cores <= 4)
  
  // Determinar nivel de rendimiento
  if (perf.prefersReducedMotion) {
    perf.level = 'reduced'
  } else if (perf.isSlowDevice) {
    perf.level = 'medium'
  } else {
    perf.level = 'full'
  }
  
  return perf
}

function applyPerformanceMode() {
  const html = document.documentElement
  
  html.classList.remove('perf-full', 'perf-medium', 'perf-reduced')
  html.removeAttribute('data-perf')
  
  if (perf.level === 'reduced') {
    html.classList.add('perf-reduced')
    html.setAttribute('data-perf', 'low')
  } else if (perf.level === 'medium') {
    html.classList.add('perf-medium')
    html.setAttribute('data-perf', 'medium')
  } else {
    html.classList.add('perf-full')
    html.setAttribute('data-perf', 'high')
  }
}

function handleVisibilityChange() {
  perf.isBackgrounded = document.hidden
  
  if (perf.isBackgrounded) {
    document.documentElement.classList.add('app-backgrounded')
  } else {
    document.documentElement.classList.remove('app-backgrounded')
  }
}

export function initPerformance() {
  detectDeviceCapabilities()
  applyPerformanceMode()
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // Re-detect on resize (orientation change)
  window.addEventListener('resize', () => {
    setTimeout(() => {
      detectDeviceCapabilities()
      applyPerformanceMode()
    }, 100)
  })
  
  return perf
}

export function getPerformanceLevel() {
  return perf.level
}

export function setPerformanceLevel(level: 'full' | 'medium' | 'reduced') {
  perf.level = level
  applyPerformanceMode()
}

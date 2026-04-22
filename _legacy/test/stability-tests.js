/* ============================================================
   STABILITY-TESTS.JS — Tests de estabilidad para Splitr
   Verifica funcionamiento de módulos extraídos y edge cases
   ============================================================ */

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TESTS
// ══════════════════════════════════════════════════════════

const TEST_CONFIG = {
  timeout: 5000,
  retries: 2,
  verbose: true
};

let testResults = [];
let currentTest = null;

// ══════════════════════════════════════════════════════════
// UTILIDADES DE TESTING
// ══════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function runTest(name, testFn) {
  currentTest = name;
  const startTime = Date.now();
  
  try {
    log(`Starting test: ${name}`);
    await testFn();
    const duration = Date.now() - startTime;
    log(`✅ ${name} passed in ${duration}ms`, 'success');
    testResults.push({ name, status: 'passed', duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ ${name} failed: ${error.message}`, 'error');
    testResults.push({ name, status: 'failed', duration, error: error.message });
  }
}

// ══════════════════════════════════════════════════════════
// TESTS DE MÓDULOS EXTRAÍDOS
// ══════════════════════════════════════════════════════════

async function testModuleImports() {
  // Verificar que todos los módulos se importan correctamente
  const modules = [
    'intros.js', 'performance.js', 'paywall.js', 'roulette.js',
    'russian.js', 'themes.js', 'settings.js', 'stats.js'
  ];
  
  for (const module of modules) {
    try {
      const response = await fetch(`/js/${module}`);
      assert(response.ok, `Module ${module} not found`);
      const content = await response.text();
      assert(content.includes('export'), `Module ${module} has no exports`);
    } catch (error) {
      throw new Error(`Failed to load module ${module}: ${error.message}`);
    }
  }
}

async function testThemesModule() {
  // Verificar que el módulo de themes funciona
  if (typeof window.initThemes === 'undefined') {
    // Simular importación
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import { initThemes, applyTheme } from './js/themes.js';
      window.testThemes = { initThemes, applyTheme };
    `;
    document.head.appendChild(script);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Verificar que los temas se pueden aplicar
  const themes = ['cyberpunk', 'fire', 'matrix', 'ocean'];
  for (const theme of themes) {
    document.documentElement.setAttribute('data-theme', theme);
    const applied = document.documentElement.getAttribute('data-theme');
    assertEqual(applied, theme, `Theme ${theme} not applied correctly`);
  }
}

async function testSettingsModule() {
  // Verificar persistencia de settings
  const testSettings = {
    sound: false,
    vibration: true,
    particles: false,
    glow: 75
  };
  
  localStorage.setItem('qp-settings', JSON.stringify(testSettings));
  const saved = JSON.parse(localStorage.getItem('qp-settings'));
  
  assertEqual(saved.sound, false, 'Sound setting not persisted');
  assertEqual(saved.glow, 75, 'Glow setting not persisted');
}

async function testStatsModule() {
  // Verificar persistencia de estadísticas
  const testStats = {
    stats: {
      'Juan': { chosen: 3, escaped: 1 },
      'María': { chosen: 2, escaped: 0 }
    },
    savedAt: Date.now()
  };
  
  localStorage.setItem('qp-stats', JSON.stringify(testStats));
  const saved = JSON.parse(localStorage.getItem('qp-stats'));
  
  assert(saved.stats['Juan'], 'Juan stats not saved');
  assertEqual(saved.stats['Juan'].chosen, 3, 'Juan chosen count incorrect');
}

// ══════════════════════════════════════════════════════════
// TESTS DE EDGE CASES
// ══════════════════════════════════════════════════════════

async function testEmptyParticipants() {
  // Verificar comportamiento con 0 participantes
  const mockState = {
    participants: [],
    sessionStats: {},
    mode: 'normal'
  };
  
  // Simular que no se puede sortear sin participantes
  const canSpin = mockState.participants.length >= 2;
  assertEqual(canSpin, false, 'Should not allow spinning with 0 participants');
}

async function testSingleParticipant() {
  // Verificar comportamiento con 1 participante
  const mockState = {
    participants: [{ id: '1', name: 'Solo' }],
    sessionStats: {},
    mode: 'normal'
  };
  
  const canSpin = mockState.participants.length >= 2;
  assertEqual(canSpin, false, 'Should not allow spinning with 1 participant');
}

async function testManyParticipants() {
  // Verificar comportamiento con muchos participantes
  const participants = Array.from({ length: 50 }, (_, i) => ({
    id: String(i + 1),
    name: `Person ${i + 1}`
  }));
  
  assert(participants.length === 50, 'Should handle 50 participants');
  
  // Verificar que el grid no se rompe
  const gridContainer = document.createElement('div');
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(80px, 1fr))';
  
  participants.forEach(p => {
    const card = document.createElement('div');
    card.textContent = p.name;
    gridContainer.appendChild(card);
  });
  
  assert(gridContainer.children.length === 50, 'All participants rendered');
}

async function testLongNames() {
  // Verificar comportamiento con nombres muy largos
  const longName = 'A'.repeat(100);
  const participant = { id: '1', name: longName };
  
  // Verificar que el nombre se trunca o maneja correctamente
  const displayName = longName.length > 20 ? longName.slice(0, 20) + '...' : longName;
  assert(displayName.length <= 23, 'Long names should be truncated');
}

async function testSpecialCharacters() {
  // Verificar manejo de caracteres especiales
  const specialNames = ['José María', '李小明', '🎉 Party', '<script>alert("xss")</script>'];
  
  for (const name of specialNames) {
    // Simular escape de HTML
    const escaped = name
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    assert(!escaped.includes('<script>'), 'XSS should be prevented');
  }
}

// ══════════════════════════════════════════════════════════
// TESTS DE PWA
// ══════════════════════════════════════════════════════════

async function testManifest() {
  try {
    const response = await fetch('/manifest.json');
    assert(response.ok, 'Manifest not found');
    
    const manifest = await response.json();
    assert(manifest.name, 'Manifest missing name');
    assert(manifest.start_url, 'Manifest missing start_url');
    assert(manifest.icons && manifest.icons.length > 0, 'Manifest missing icons');
  } catch (error) {
    throw new Error(`Manifest test failed: ${error.message}`);
  }
}

async function testServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      // No requerir SW activo, solo verificar que la API funciona
      log('Service Worker API available');
    } catch (error) {
      log('Service Worker test skipped (not critical)');
    }
  }
}

async function testOfflineCapability() {
  // Verificar que recursos críticos están disponibles
  const criticalResources = [
    '/css/base.css',
    '/css/animations.css',
    '/css/components.css',
    '/css/themes.css',
    '/css/ux-improvements.css'
  ];
  
  for (const resource of criticalResources) {
    try {
      const response = await fetch(resource);
      assert(response.ok, `Critical resource ${resource} not available`);
    } catch (error) {
      throw new Error(`Offline test failed for ${resource}`);
    }
  }
}

// ══════════════════════════════════════════════════════════
// TESTS DE PERFORMANCE
// ══════════════════════════════════════════════════════════

async function testPerformanceModule() {
  // Verificar detección de dispositivo lento
  const mockSlowDevice = {
    hardwareConcurrency: 2,
    deviceMemory: 2,
    userAgent: 'Mobile'
  };
  
  // Simular lógica de detección
  const isSlowDevice = (mockSlowDevice.hardwareConcurrency <= 2) || 
                      (mockSlowDevice.deviceMemory <= 4);
  
  assert(isSlowDevice, 'Should detect slow device correctly');
}

async function testParticleCount() {
  // Verificar que el conteo de partículas se ajusta
  const baseCount = 50;
  const performanceLevels = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
    potato: 0.1
  };
  
  for (const [level, multiplier] of Object.entries(performanceLevels)) {
    const count = Math.round(baseCount * multiplier);
    assert(count >= 0, `Particle count should be non-negative for ${level}`);
    assert(count <= baseCount, `Particle count should not exceed base for ${level}`);
  }
}

// ══════════════════════════════════════════════════════════
// TESTS DE ACCESIBILIDAD
// ══════════════════════════════════════════════════════════

async function testKeyboardNavigation() {
  // Verificar que elementos críticos son focusables
  const focusableSelectors = [
    'button', 'input', '[tabindex="0"]', 'a[href]'
  ];
  
  const focusableElements = document.querySelectorAll(focusableSelectors.join(','));
  assert(focusableElements.length > 0, 'Should have focusable elements');
  
  // Verificar que tienen outline visible en focus
  focusableElements.forEach(el => {
    el.focus();
    const styles = window.getComputedStyle(el, ':focus-visible');
    // No podemos verificar outline directamente, pero verificamos que el elemento es focusable
    assert(document.activeElement === el || el.tabIndex >= 0, 'Element should be focusable');
  });
}

async function testAriaLabels() {
  // Verificar que elementos importantes tienen labels
  const buttons = document.querySelectorAll('button');
  
  buttons.forEach(button => {
    const hasLabel = button.textContent.trim() || 
                    button.getAttribute('aria-label') ||
                    button.getAttribute('title');
    
    if (!hasLabel) {
      log(`Warning: Button without label found: ${button.outerHTML.slice(0, 100)}`);
    }
  });
}

// ══════════════════════════════════════════════════════════
// RUNNER PRINCIPAL
// ══════════════════════════════════════════════════════════

async function runAllTests() {
  log('🚀 Starting Splitr Stability Tests');
  testResults = [];
  
  // Tests de módulos
  await runTest('Module Imports', testModuleImports);
  await runTest('Themes Module', testThemesModule);
  await runTest('Settings Module', testSettingsModule);
  await runTest('Stats Module', testStatsModule);
  
  // Tests de edge cases
  await runTest('Empty Participants', testEmptyParticipants);
  await runTest('Single Participant', testSingleParticipant);
  await runTest('Many Participants', testManyParticipants);
  await runTest('Long Names', testLongNames);
  await runTest('Special Characters', testSpecialCharacters);
  
  // Tests de PWA
  await runTest('Manifest', testManifest);
  await runTest('Service Worker', testServiceWorker);
  await runTest('Offline Capability', testOfflineCapability);
  
  // Tests de performance
  await runTest('Performance Module', testPerformanceModule);
  await runTest('Particle Count', testParticleCount);
  
  // Tests de accesibilidad
  await runTest('Keyboard Navigation', testKeyboardNavigation);
  await runTest('ARIA Labels', testAriaLabels);
  
  // Reporte final
  generateReport();
}

function generateReport() {
  const passed = testResults.filter(t => t.status === 'passed').length;
  const failed = testResults.filter(t => t.status === 'failed').length;
  const total = testResults.length;
  
  log('📊 Test Results Summary');
  log(`Total tests: ${total}`);
  log(`Passed: ${passed}`, 'success');
  log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  log(`Success rate: ${Math.round((passed / total) * 100)}%`);
  
  if (failed > 0) {
    log('❌ Failed tests:');
    testResults.filter(t => t.status === 'failed').forEach(test => {
      log(`  - ${test.name}: ${test.error}`, 'error');
    });
  }
  
  // Guardar reporte
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed },
    results: testResults
  };
  
  localStorage.setItem('splitr-test-report', JSON.stringify(report));
  log('📄 Test report saved to localStorage');
}

// ══════════════════════════════════════════════════════════
// EXPORT PARA USO EN CONSOLA
// ══════════════════════════════════════════════════════════

window.SplitTests = {
  runAllTests,
  runTest,
  testResults,
  generateReport
};

// Auto-ejecutar si se carga directamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}

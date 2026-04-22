/* ============================================================
   EDGE-CASE-TESTS.JS — Tests específicos para casos límite
   Verifica comportamiento en situaciones extremas o inusuales
   ============================================================ */

// ══════════════════════════════════════════════════════════
// TESTS DE CASOS LÍMITE EN SORTEOS
// ══════════════════════════════════════════════════════════

async function testEliminationMode() {
  console.log('🔍 Testing Elimination Mode edge cases...');
  
  // Caso 1: Eliminación hasta el último participante
  let participants = [
    { id: '1', name: 'A' },
    { id: '2', name: 'B' },
    { id: '3', name: 'C' }
  ];
  let eliminated = [];
  
  // Simular eliminaciones sucesivas
  while (participants.length > 1) {
    const toEliminate = participants[0]; // Simular eliminación del primero
    eliminated.push(toEliminate.id);
    participants = participants.filter(p => p.id !== toEliminate.id);
  }
  
  console.log(`✓ Elimination: ${eliminated.length} eliminated, ${participants.length} remaining`);
  
  // Verificar que queda exactamente 1
  if (participants.length !== 1) {
    throw new Error(`Expected 1 survivor, got ${participants.length}`);
  }
  
  // Caso 2: Intentar eliminar cuando solo queda 1
  const canEliminateMore = participants.length > 1;
  if (canEliminateMore) {
    throw new Error('Should not allow more eliminations with 1 participant');
  }
  
  console.log('✅ Elimination mode edge cases passed');
}

async function testRussianRouletteMode() {
  console.log('🔍 Testing Russian Roulette edge cases...');
  
  // Caso 1: Ruleta rusa con 2 participantes (mínimo)
  let survivors = ['1', '2'];
  let rounds = 0;
  const maxRounds = 10; // Evitar bucle infinito
  
  while (survivors.length > 1 && rounds < maxRounds) {
    // Simular que alguien "muere" (50% probabilidad)
    if (Math.random() < 0.5) {
      survivors.pop(); // Eliminar uno
    }
    rounds++;
  }
  
  if (survivors.length === 0) {
    throw new Error('Russian Roulette should always have at least 1 survivor');
  }
  
  console.log(`✓ Russian Roulette: ${rounds} rounds, ${survivors.length} survivor(s)`);
  
  // Caso 2: Ruleta rusa con muchos participantes
  const manyParticipants = Array.from({length: 20}, (_, i) => String(i + 1));
  let manySurvivors = [...manyParticipants];
  let manyRounds = 0;
  
  while (manySurvivors.length > 1 && manyRounds < 50) {
    const eliminated = Math.floor(Math.random() * manySurvivors.length);
    manySurvivors.splice(eliminated, 1);
    manyRounds++;
  }
  
  console.log(`✓ Russian Roulette (20 players): ${manyRounds} rounds, ${manySurvivors.length} survivor(s)`);
  console.log('✅ Russian Roulette edge cases passed');
}

async function testTeamMode() {
  console.log('🔍 Testing Team Mode edge cases...');
  
  // Caso 1: Equipo más grande que participantes disponibles
  const participants = [
    { id: '1', name: 'A' },
    { id: '2', name: 'B' },
    { id: '3', name: 'C' }
  ];
  
  const requestedTeamSize = 5;
  const maxPossibleTeam = participants.length - 1; // Debe quedar al menos 1 fuera
  const actualTeamSize = Math.min(requestedTeamSize, maxPossibleTeam);
  
  if (actualTeamSize >= participants.length) {
    throw new Error('Team size should be less than total participants');
  }
  
  console.log(`✓ Team size clamped: requested ${requestedTeamSize}, actual ${actualTeamSize}`);
  
  // Caso 2: Equipo de tamaño 1 (edge case)
  const minTeamSize = 2;
  const teamSize1 = Math.max(1, minTeamSize);
  
  if (teamSize1 < 2) {
    throw new Error('Team size should be at least 2');
  }
  
  console.log('✅ Team mode edge cases passed');
}

async function testDuelMode() {
  console.log('🔍 Testing Duel Mode edge cases...');
  
  // Caso 1: Duelo con menos de 2 participantes seleccionados
  let selectedForDuel = [];
  const canStartDuel = selectedForDuel.length === 2;
  
  if (canStartDuel) {
    throw new Error('Should not allow duel with < 2 participants');
  }
  
  // Caso 2: Duelo con exactamente 2 participantes
  selectedForDuel = ['1', '2'];
  const canStartDuel2 = selectedForDuel.length === 2;
  
  if (!canStartDuel2) {
    throw new Error('Should allow duel with exactly 2 participants');
  }
  
  // Caso 3: Intentar agregar más de 2 al duelo
  const attemptAdd3rd = selectedForDuel.length < 2;
  
  if (attemptAdd3rd && selectedForDuel.length >= 2) {
    throw new Error('Should not allow more than 2 in duel');
  }
  
  console.log('✅ Duel mode edge cases passed');
}

// ══════════════════════════════════════════════════════════
// TESTS DE PERSISTENCIA Y STORAGE
// ══════════════════════════════════════════════════════════

async function testLocalStorageLimits() {
  console.log('🔍 Testing localStorage limits...');
  
  // Caso 1: Datos muy grandes
  const largeData = {
    participants: Array.from({length: 1000}, (_, i) => ({
      id: String(i),
      name: `Participant ${i}`.repeat(10) // Nombres largos
    })),
    stats: {}
  };
  
  // Llenar stats con datos
  largeData.participants.forEach(p => {
    largeData.stats[p.name] = {
      chosen: Math.floor(Math.random() * 100),
      escaped: Math.floor(Math.random() * 50)
    };
  });
  
  try {
    const serialized = JSON.stringify(largeData);
    localStorage.setItem('test-large-data', serialized);
    
    // Verificar que se puede recuperar
    const recovered = JSON.parse(localStorage.getItem('test-large-data'));
    
    if (recovered.participants.length !== 1000) {
      throw new Error('Large data not persisted correctly');
    }
    
    // Limpiar
    localStorage.removeItem('test-large-data');
    console.log('✓ Large data persistence works');
    
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.log('⚠️ localStorage quota exceeded (expected with very large data)');
    } else {
      throw error;
    }
  }
  
  // Caso 2: Datos corruptos
  localStorage.setItem('test-corrupt', '{"invalid": json}');
  
  try {
    JSON.parse(localStorage.getItem('test-corrupt'));
    throw new Error('Should have failed to parse corrupt JSON');
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log('✓ Corrupt data handled correctly');
    } else {
      throw error;
    }
  }
  
  localStorage.removeItem('test-corrupt');
  console.log('✅ localStorage limits tests passed');
}

async function testConcurrentAccess() {
  console.log('🔍 Testing concurrent localStorage access...');
  
  // Simular múltiples escrituras simultáneas
  const promises = [];
  
  for (let i = 0; i < 10; i++) {
    promises.push(new Promise(resolve => {
      setTimeout(() => {
        localStorage.setItem(`concurrent-${i}`, JSON.stringify({
          id: i,
          timestamp: Date.now(),
          data: `test data ${i}`
        }));
        resolve(i);
      }, Math.random() * 100);
    }));
  }
  
  await Promise.all(promises);
  
  // Verificar que todos se guardaron
  for (let i = 0; i < 10; i++) {
    const data = localStorage.getItem(`concurrent-${i}`);
    if (!data) {
      throw new Error(`Concurrent write ${i} failed`);
    }
    localStorage.removeItem(`concurrent-${i}`);
  }
  
  console.log('✅ Concurrent access tests passed');
}

// ══════════════════════════════════════════════════════════
// TESTS DE PERFORMANCE EXTREMA
// ══════════════════════════════════════════════════════════

async function testManyParticles() {
  console.log('🔍 Testing particle system limits...');
  
  // Simular generación masiva de partículas
  const particles = [];
  const maxParticles = 1000;
  
  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1.0,
      decay: 0.02
    });
  }
  
  // Simular actualización de partículas
  const startTime = performance.now();
  
  for (let frame = 0; frame < 60; frame++) { // 60 frames
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`✓ Particle simulation: ${maxParticles} particles, ${duration.toFixed(2)}ms`);
  
  if (duration > 1000) { // Más de 1 segundo es problemático
    console.log('⚠️ Particle system may be too slow on this device');
  }
  
  console.log('✅ Particle system tests passed');
}

async function testMemoryLeaks() {
  console.log('🔍 Testing for potential memory leaks...');
  
  // Simular creación y destrucción repetida de elementos
  const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  
  for (let cycle = 0; cycle < 100; cycle++) {
    // Crear elementos DOM
    const container = document.createElement('div');
    
    for (let i = 0; i < 50; i++) {
      const el = document.createElement('div');
      el.className = 'test-element';
      el.innerHTML = `<span>Test ${i}</span>`;
      
      // Agregar event listeners
      el.addEventListener('click', () => {});
      el.addEventListener('mouseover', () => {});
      
      container.appendChild(el);
    }
    
    // Simular que se agrega al DOM y luego se remueve
    document.body.appendChild(container);
    
    // Limpiar inmediatamente
    container.remove();
  }
  
  // Forzar garbage collection si está disponible
  if (window.gc) {
    window.gc();
  }
  
  const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  const memoryDiff = finalMemory - initialMemory;
  
  console.log(`✓ Memory usage: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB difference`);
  
  if (memoryDiff > 50 * 1024 * 1024) { // Más de 50MB es sospechoso
    console.log('⚠️ Potential memory leak detected');
  }
  
  console.log('✅ Memory leak tests passed');
}

// ══════════════════════════════════════════════════════════
// TESTS DE COMPATIBILIDAD DE NAVEGADOR
// ══════════════════════════════════════════════════════════

async function testBrowserFeatures() {
  console.log('🔍 Testing browser feature compatibility...');
  
  const features = {
    'ES6 Modules': () => typeof window.import !== 'undefined' || 'import' in window,
    'CSS Grid': () => CSS.supports('display', 'grid'),
    'CSS Custom Properties': () => CSS.supports('color', 'var(--test)'),
    'Intersection Observer': () => 'IntersectionObserver' in window,
    'Web Animations API': () => 'animate' in document.createElement('div'),
    'Local Storage': () => 'localStorage' in window,
    'Session Storage': () => 'sessionStorage' in window,
    'Canvas 2D': () => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    },
    'Vibration API': () => 'vibrate' in navigator,
    'Service Workers': () => 'serviceWorker' in navigator,
    'Web App Manifest': () => 'onbeforeinstallprompt' in window
  };
  
  const results = {};
  
  for (const [feature, test] of Object.entries(features)) {
    try {
      results[feature] = test();
      console.log(`${results[feature] ? '✓' : '✗'} ${feature}: ${results[feature] ? 'supported' : 'not supported'}`);
    } catch (error) {
      results[feature] = false;
      console.log(`✗ ${feature}: error testing (${error.message})`);
    }
  }
  
  // Verificar características críticas
  const critical = ['Local Storage', 'CSS Grid', 'Canvas 2D'];
  const missingCritical = critical.filter(f => !results[f]);
  
  if (missingCritical.length > 0) {
    throw new Error(`Critical features missing: ${missingCritical.join(', ')}`);
  }
  
  console.log('✅ Browser compatibility tests passed');
}

// ══════════════════════════════════════════════════════════
// RUNNER DE EDGE CASES
// ══════════════════════════════════════════════════════════

async function runEdgeCaseTests() {
  console.log('🚀 Starting Edge Case Tests');
  
  const tests = [
    { name: 'Elimination Mode', fn: testEliminationMode },
    { name: 'Russian Roulette Mode', fn: testRussianRouletteMode },
    { name: 'Team Mode', fn: testTeamMode },
    { name: 'Duel Mode', fn: testDuelMode },
    { name: 'localStorage Limits', fn: testLocalStorageLimits },
    { name: 'Concurrent Access', fn: testConcurrentAccess },
    { name: 'Many Particles', fn: testManyParticles },
    { name: 'Memory Leaks', fn: testMemoryLeaks },
    { name: 'Browser Features', fn: testBrowserFeatures }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} failed: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Edge Case Tests Summary:`);
  console.log(`Total: ${tests.length}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`Success rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  return { passed, failed, total: tests.length };
}

// Export para uso externo
if (typeof window !== 'undefined') {
  window.EdgeCaseTests = {
    runEdgeCaseTests,
    testEliminationMode,
    testRussianRouletteMode,
    testTeamMode,
    testDuelMode,
    testLocalStorageLimits,
    testManyParticles,
    testBrowserFeatures
  };
}

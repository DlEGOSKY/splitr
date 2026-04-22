/* ============================================================
   MAIN-SAFE.JS — Versión segura que carga módulos paso a paso
   Para diagnosticar problemas de importación
   ============================================================ */

console.log('🚀 Starting safe module loading...');

async function loadModuleSafely(modulePath, moduleName) {
  try {
    console.log(`📦 Loading ${moduleName}...`);
    const module = await import(modulePath);
    console.log(`✅ ${moduleName} loaded successfully`);
    return module;
  } catch (error) {
    console.error(`❌ Failed to load ${moduleName}:`, error);
    throw new Error(`${moduleName} failed: ${error.message}`);
  }
}

async function initSplitSafe() {
  try {
    // 1. Cargar state primero (es la base)
    const stateModule = await loadModuleSafely('./state.js', 'State');
    const { state } = stateModule;
    
    // 2. Cargar participantes (depende de state)
    const participantsModule = await loadModuleSafely('./participants.js', 'Participants');
    
    // 3. Cargar audio (independiente)
    const audioModule = await loadModuleSafely('./audio.js', 'Audio');
    const { initAudio } = audioModule;
    
    // 4. Cargar storage (independiente)
    const storageModule = await loadModuleSafely('./storage.js', 'Storage');
    
    // 5. Cargar performance (independiente)
    const performanceModule = await loadModuleSafely('./performance.js', 'Performance');
    const { initPerformance } = performanceModule;
    
    // 6. Cargar themes (puede depender de performance)
    const themesModule = await loadModuleSafely('./themes.js', 'Themes');
    const { initThemes, setupTheme } = themesModule;
    
    // 7. Inicializar lo básico
    console.log('🔧 Initializing basic systems...');
    
    // Mostrar pantalla principal
    document.getElementById('screen-home')?.classList.add('active');
    
    // Inicializar performance
    initPerformance();
    
    // Inicializar themes
    initThemes({ getPrefs: () => ({ vibration: true }) });
    setupTheme();
    
    // Inicializar audio en primer toque
    const unlockAudio = () => {
      initAudio();
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    
    // Mostrar mensaje de éxito
    console.log('✅ Safe mode initialized successfully');
    
    // Agregar indicador visual
    const indicator = document.createElement('div');
    indicator.innerHTML = '🔧 MODO SEGURO - Funcionalidad básica';
    indicator.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 9999;
      background: rgba(255, 170, 0, 0.9); color: #000;
      padding: 8px 12px; border-radius: 4px; font-size: 12px;
      font-family: monospace; font-weight: bold;
    `;
    document.body.appendChild(indicator);
    
    return true;
    
  } catch (error) {
    console.error('❌ Safe initialization failed:', error);
    
    // Mostrar error mínimo
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: monospace; background: #0a0a0a; color: #ff0066; min-height: 100vh; text-align: center;">
        <h1>🚨 Error Crítico</h1>
        <p>No se pudo cargar ni siquiera el modo seguro.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <button onclick="location.reload()" style="padding: 10px 20px; margin: 10px; background: #333; color: #fff; border: 1px solid #666; border-radius: 4px; cursor: pointer;">🔄 Recargar</button>
        <a href="/index-simple.html" style="color: #00aaff; text-decoration: none; padding: 10px 20px; border: 1px solid #00aaff; border-radius: 4px; display: inline-block; margin: 10px;">🔧 Diagnóstico</a>
      </div>
    `;
    
    return false;
  }
}

// Ejecutar inicialización segura
initSplitSafe();

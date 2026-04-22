/* ============================================================
   PWA-VALIDATOR.JS — Verificador de compatibilidad PWA
   Valida manifest, service worker, íconos y criterios PWA
   ============================================================ */

class PWAValidator {
  constructor() {
    this.results = [];
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
    
    if (type === 'error') this.errors.push(message);
    if (type === 'warning') this.warnings.push(message);
  }

  async validateManifest() {
    this.log('🔍 Validating Web App Manifest...');
    
    try {
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        throw new Error(`Manifest not found (${response.status})`);
      }

      const manifest = await response.json();
      
      // Campos obligatorios
      const required = ['name', 'start_url', 'display', 'icons'];
      for (const field of required) {
        if (!manifest[field]) {
          this.log(`Missing required field: ${field}`, 'error');
        } else {
          this.log(`✓ ${field}: ${typeof manifest[field] === 'string' ? manifest[field] : 'present'}`);
        }
      }

      // Validar íconos
      if (manifest.icons && Array.isArray(manifest.icons)) {
        this.log(`Found ${manifest.icons.length} icons`);
        
        const sizes = manifest.icons.map(icon => icon.sizes).filter(Boolean);
        const hasLargeIcon = sizes.some(size => {
          const [width] = size.split('x').map(Number);
          return width >= 512;
        });
        
        if (!hasLargeIcon) {
          this.log('No large icon (512x512+) found', 'warning');
        }

        // Verificar que los íconos existen
        for (const icon of manifest.icons.slice(0, 3)) { // Solo verificar los primeros 3
          try {
            const iconResponse = await fetch(icon.src);
            if (iconResponse.ok) {
              this.log(`✓ Icon ${icon.src} accessible`);
            } else {
              this.log(`Icon ${icon.src} not accessible (${iconResponse.status})`, 'error');
            }
          } catch (error) {
            this.log(`Icon ${icon.src} failed to load: ${error.message}`, 'error');
          }
        }
      }

      // Validar display mode
      const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
      if (!validDisplayModes.includes(manifest.display)) {
        this.log(`Invalid display mode: ${manifest.display}`, 'warning');
      }

      // Validar start_url
      if (manifest.start_url) {
        try {
          const startResponse = await fetch(manifest.start_url);
          if (startResponse.ok) {
            this.log('✓ start_url accessible');
          } else {
            this.log(`start_url not accessible (${startResponse.status})`, 'error');
          }
        } catch (error) {
          this.log(`start_url failed: ${error.message}`, 'error');
        }
      }

      this.log('✅ Manifest validation completed', 'success');
      return manifest;

    } catch (error) {
      this.log(`Manifest validation failed: ${error.message}`, 'error');
      return null;
    }
  }

  async validateServiceWorker() {
    this.log('🔍 Validating Service Worker...');
    
    if (!('serviceWorker' in navigator)) {
      this.log('Service Worker not supported', 'warning');
      return false;
    }

    try {
      // Verificar si hay un SW registrado
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        this.log('✓ Service Worker registered');
        
        if (registration.active) {
          this.log('✓ Service Worker active');
        } else if (registration.installing) {
          this.log('Service Worker installing...', 'warning');
        } else if (registration.waiting) {
          this.log('Service Worker waiting for activation', 'warning');
        }

        // Verificar scope
        this.log(`SW scope: ${registration.scope}`);
        
      } else {
        this.log('No Service Worker registered', 'warning');
        
        // Intentar verificar si existe sw.js
        try {
          const swResponse = await fetch('/sw.js');
          if (swResponse.ok) {
            this.log('sw.js file exists but not registered', 'warning');
          } else {
            this.log('No sw.js file found', 'info');
          }
        } catch (error) {
          this.log('No service worker file detected', 'info');
        }
      }

      return !!registration;

    } catch (error) {
      this.log(`Service Worker validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async validateHTTPS() {
    this.log('🔍 Validating HTTPS...');
    
    const isHTTPS = location.protocol === 'https:';
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    
    if (isHTTPS) {
      this.log('✓ Served over HTTPS');
      return true;
    } else if (isLocalhost) {
      this.log('✓ Localhost (HTTPS not required for development)');
      return true;
    } else {
      this.log('Not served over HTTPS - PWA features limited', 'error');
      return false;
    }
  }

  async validateInstallability() {
    this.log('🔍 Validating PWA Installability...');
    
    // Verificar beforeinstallprompt
    let installPromptSupported = false;
    
    const checkInstallPrompt = () => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 1000);

        window.addEventListener('beforeinstallprompt', (e) => {
          clearTimeout(timeout);
          resolve(true);
        }, { once: true });
      });
    };

    installPromptSupported = await checkInstallPrompt();
    
    if (installPromptSupported) {
      this.log('✓ Install prompt supported');
    } else {
      this.log('Install prompt not triggered (may already be installed)', 'warning');
    }

    // Verificar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.log('✓ Currently running as installed PWA');
    } else {
      this.log('Running in browser (not installed)');
    }

    return true;
  }

  async validateOfflineCapability() {
    this.log('🔍 Validating Offline Capability...');
    
    // Lista de recursos críticos que deberían estar disponibles offline
    const criticalResources = [
      '/',
      '/index.html',
      '/css/base.css',
      '/css/animations.css',
      '/css/components.css',
      '/css/themes.css',
      '/js/ui.js',
      '/manifest.json'
    ];

    let offlineCount = 0;
    
    for (const resource of criticalResources) {
      try {
        // Intentar cargar desde cache
        const cache = await caches.open('splitr-v1');
        const cachedResponse = await cache.match(resource);
        
        if (cachedResponse) {
          this.log(`✓ ${resource} available offline`);
          offlineCount++;
        } else {
          this.log(`${resource} not cached`, 'warning');
        }
      } catch (error) {
        this.log(`Cache check failed for ${resource}`, 'warning');
      }
    }

    if (offlineCount > 0) {
      this.log(`${offlineCount}/${criticalResources.length} critical resources cached`);
    } else {
      this.log('No offline capability detected', 'warning');
    }

    return offlineCount > 0;
  }

  async validatePerformance() {
    this.log('🔍 Validating Performance...');
    
    // Verificar tiempo de carga
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    this.log(`Page load time: ${loadTime}ms`);
    
    if (loadTime > 3000) {
      this.log('Page load time > 3s - may affect PWA score', 'warning');
    } else {
      this.log('✓ Good page load time');
    }

    // Verificar First Contentful Paint si está disponible
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.log(`First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
              if (entry.startTime > 2000) {
                this.log('FCP > 2s - may affect PWA score', 'warning');
              } else {
                this.log('✓ Good First Contentful Paint');
              }
            }
          }
        });
        
        observer.observe({ entryTypes: ['paint'] });
        
        // Limpiar observer después de 2 segundos
        setTimeout(() => observer.disconnect(), 2000);
        
      } catch (error) {
        this.log('Performance Observer not available', 'info');
      }
    }

    return true;
  }

  async validateAccessibility() {
    this.log('🔍 Validating Basic Accessibility...');
    
    // Verificar meta viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      this.log('✓ Viewport meta tag present');
    } else {
      this.log('Missing viewport meta tag', 'error');
    }

    // Verificar lang attribute
    if (document.documentElement.lang) {
      this.log(`✓ Language specified: ${document.documentElement.lang}`);
    } else {
      this.log('Missing lang attribute', 'warning');
    }

    // Verificar title
    if (document.title && document.title.trim()) {
      this.log(`✓ Page title: "${document.title}"`);
    } else {
      this.log('Missing or empty page title', 'error');
    }

    // Verificar botones sin texto
    const buttonsWithoutText = Array.from(document.querySelectorAll('button')).filter(btn => {
      return !btn.textContent.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('title');
    });

    if (buttonsWithoutText.length > 0) {
      this.log(`${buttonsWithoutText.length} buttons without accessible text`, 'warning');
    } else {
      this.log('✓ All buttons have accessible text');
    }

    return true;
  }

  async runAllValidations() {
    this.log('🚀 Starting PWA Validation Suite');
    this.results = [];
    this.errors = [];
    this.warnings = [];

    const validations = [
      { name: 'HTTPS', fn: () => this.validateHTTPS() },
      { name: 'Manifest', fn: () => this.validateManifest() },
      { name: 'Service Worker', fn: () => this.validateServiceWorker() },
      { name: 'Installability', fn: () => this.validateInstallability() },
      { name: 'Offline Capability', fn: () => this.validateOfflineCapability() },
      { name: 'Performance', fn: () => this.validatePerformance() },
      { name: 'Accessibility', fn: () => this.validateAccessibility() }
    ];

    for (const validation of validations) {
      try {
        this.log(`\n--- ${validation.name} ---`);
        const result = await validation.fn();
        this.results.push({ name: validation.name, passed: !!result });
      } catch (error) {
        this.log(`${validation.name} validation failed: ${error.message}`, 'error');
        this.results.push({ name: validation.name, passed: false, error: error.message });
      }
    }

    this.generateReport();
  }

  generateReport() {
    this.log('\n📊 PWA Validation Report');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const score = Math.round((passed / total) * 100);
    
    this.log(`Score: ${score}% (${passed}/${total} validations passed)`);
    
    if (this.errors.length > 0) {
      this.log(`\n❌ ${this.errors.length} Error(s):`);
      this.errors.forEach(error => this.log(`  • ${error}`));
    }
    
    if (this.warnings.length > 0) {
      this.log(`\n⚠️ ${this.warnings.length} Warning(s):`);
      this.warnings.forEach(warning => this.log(`  • ${warning}`));
    }

    // PWA Readiness Assessment
    this.log('\n🎯 PWA Readiness Assessment:');
    
    if (score >= 90) {
      this.log('🟢 Excellent - Ready for PWA deployment', 'success');
    } else if (score >= 75) {
      this.log('🟡 Good - Minor improvements recommended', 'warning');
    } else if (score >= 60) {
      this.log('🟠 Fair - Several issues need attention', 'warning');
    } else {
      this.log('🔴 Poor - Major PWA requirements missing', 'error');
    }

    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      score,
      results: this.results,
      errors: this.errors,
      warnings: this.warnings,
      userAgent: navigator.userAgent,
      url: location.href
    };

    localStorage.setItem('pwa-validation-report', JSON.stringify(report));
    this.log('\n📄 Report saved to localStorage');

    return report;
  }
}

// Export para uso en consola
window.PWAValidator = PWAValidator;

// Auto-ejecutar si se carga directamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const validator = new PWAValidator();
    validator.runAllValidations();
  });
} else {
  const validator = new PWAValidator();
  validator.runAllValidations();
}

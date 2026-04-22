/* ============================================================
   ROULETTE.JS — Animación de ruleta de casino
   Ruleta giratoria con sectores de participantes que desacelera hasta el ganador.
   ============================================================ */

import { getParticleCount } from './performance.js';

// ══════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════

let rouletteOverlay = null;
let rouletteCanvas = null;
let rouletteLabel = null;
let _rafId = null;

// Callbacks necesarios
let spawnParticlesFn = null;
let triggerImpactFlashFn = null;
let playWinnerFanfareFn = null;
let getPrefsFn = null;

// ══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════

/**
 * Inicializa el módulo de ruleta con las referencias DOM y callbacks necesarios.
 * @param {Object} config - Configuración
 * @param {Function} config.spawnParticles - Función para generar partículas
 * @param {Function} config.triggerImpactFlash - Función para flash de impacto
 * @param {Function} config.playWinnerFanfare - Función para reproducir sonido
 * @param {Function} config.getPrefs - Función que retorna las preferencias del usuario
 */
export function initRoulette({ spawnParticles, triggerImpactFlash, playWinnerFanfare, getPrefs }) {
  spawnParticlesFn = spawnParticles;
  triggerImpactFlashFn = triggerImpactFlash;
  playWinnerFanfareFn = playWinnerFanfare;
  getPrefsFn = getPrefs;

  // Referencias DOM
  rouletteOverlay = document.getElementById('roulette-overlay');
  rouletteCanvas = document.getElementById('roulette-canvas');
  rouletteLabel = document.getElementById('roulette-label');
}

// ══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════

/**
 * Animación de ruleta de casino que gira y desacelera hasta el ganador.
 * Dibuja la ruleta en canvas con los avatares de los participantes.
 */
export function runRouletteAnimation(participants, winnerId) {
  return new Promise(resolve => {
    if (!rouletteCanvas || !rouletteOverlay) { resolve(); return; }

    const N          = participants.length;
    const sliceAngle = (Math.PI * 2) / N;
    const winnerIdx  = participants.findIndex(p => p.id === winnerId);
    if (winnerIdx === -1) { resolve(); return; }

    // Paleta curada igual que los avatares del grid
    const PALETTE = [120,150,80,55,30,0,330,300,270,240,200,170];
    const sectorColors = participants.map((_, i) => {
      const hue  = PALETTE[i % PALETTE.length];
      const hue2 = (hue + 28) % 360;
      return { hue, hue2,
        light:  `hsl(${hue},  95%, 62%)`,
        mid:    `hsl(${hue},  85%, 42%)`,
        dark:   `hsl(${hue},  80%, 28%)`,
        glow:   `hsla(${hue}, 95%, 65%, 0.9)`,
      };
    });

    // Canvas — más grande y nítido
    const size = Math.min(window.innerWidth * 0.86, window.innerHeight * 0.58, 360);
    const DPR  = window.devicePixelRatio || 2;
    rouletteCanvas.width  = size * DPR;
    rouletteCanvas.height = size * DPR;
    rouletteCanvas.style.width  = `${size}px`;
    rouletteCanvas.style.height = `${size}px`;

    const winnerColors = sectorColors[winnerIdx];
    rouletteOverlay.style.setProperty('--result-rgb',
      `${Math.round(parseInt(winnerColors.hue)/360*255)},200,100`);

    const ctx = rouletteCanvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // reset + scale, evita acumulación
    const cx = size / 2, cy = size / 2;
    const R  = size / 2 - 6;   // radio de la rueda
    const Ri = R * 0.13;        // radio del centro

    // ── Calcular ángulo destino ──
    // El puntero está ARRIBA (-π/2). Para que el CENTRO del sector ganador quede ahí:
    const targetAngle = -winnerIdx * sliceAngle - sliceAngle/2;

    // ── Configurar animación ──
    const prefs = getPrefsFn?.() || {};
    const speedMult = (prefs.speed || 100) / 100;
    const DURATION  = Math.round(2800 / speedMult); // 2.8s base
    const EXTRA_SPINS = 4; // vueltas extra para dramatismo
    const totalRotation = targetAngle - EXTRA_SPINS * Math.PI * 2;

    let startTime = null;
    let currentAngle = 0;
    let lastTickTime = 0;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function drawWheel(angle) {
      ctx.clearRect(0, 0, size, size);

      // ── Sectores ──
      participants.forEach((p, i) => {
        const startAngle = angle + i * sliceAngle;
        const endAngle   = angle + (i + 1) * sliceAngle;
        const colors = sectorColors[i];

        // Sector base
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors.mid;
        ctx.fill();

        // Gradiente radial para profundidad
        const grad = ctx.createRadialGradient(cx, cy, Ri, cx, cy, R);
        grad.addColorStop(0, colors.light + '40');
        grad.addColorStop(0.7, colors.mid + '20');
        grad.addColorStop(1, colors.dark + '60');
        ctx.fillStyle = grad;
        ctx.fill();

        // Borde del sector
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ── Texto del participante ──
        const midAngle = startAngle + sliceAngle / 2;
        const textRadius = R * 0.65;
        const textX = cx + Math.cos(midAngle) * textRadius;
        const textY = cy + Math.sin(midAngle) * textRadius;

        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(midAngle + Math.PI / 2); // perpendicular al radio

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(Math.max(10, size * 0.028))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 3;

        const name = p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name;
        ctx.fillText(name, 0, 0);
        ctx.restore();
      });

      // ── Centro de la ruleta ──
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Ri);
      centerGrad.addColorStop(0, '#2a2a3a');
      centerGrad.addColorStop(0.7, '#1a1a2a');
      centerGrad.addColorStop(1, '#0a0a1a');
      ctx.beginPath();
      ctx.arc(cx, cy, Ri, 0, Math.PI * 2);
      ctx.fillStyle = centerGrad;
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── Puntero (flecha hacia abajo desde arriba) ──
      const pointerSize = R * 0.08;
      ctx.beginPath();
      ctx.moveTo(cx, cy - R - 3);
      ctx.lineTo(cx - pointerSize, cy - R + pointerSize);
      ctx.lineTo(cx + pointerSize, cy - R + pointerSize);
      ctx.closePath();
      ctx.fillStyle = '#ff4444';
      ctx.fill();
      ctx.strokeStyle = '#aa0000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function playTick(speed) {
      // Tick más frecuente cuando va rápido, menos cuando va lento
      const volume = Math.min(0.3, speed * 0.8);
      if (volume > 0.05) {
        // Crear un tick sintético simple
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
          // Fallback silencioso si no hay audio context
        }
      }
    }

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      if (progress < 1) {
        // ── Animación en progreso ──
        const easedProgress = easeOutCubic(progress);
        currentAngle = totalRotation * easedProgress;
        drawWheel(currentAngle);

        // ── Efectos de sonido y vibración ──
        const speed = 1 - easedProgress; // velocidad decrece
        const currentIdx = Math.floor((-currentAngle / sliceAngle + 0.5) % N + N) % N;
        
        // Tick de sonido cuando pasa por un sector (throttled)
        if (timestamp - lastTickTime > (50 + speed * 100)) {
          lastTickTime = timestamp;
          if (prefs.vibration && 'vibrate' in navigator && speed > 0.1)
            navigator.vibrate(speed > 0.5 ? 5 : speed > 0.2 ? 8 : 15);
          playTick(speed);
        }
        if (rouletteLabel) rouletteLabel.textContent = participants[currentIdx]?.name ?? '';

        _rafId = requestAnimationFrame(tick);
      } else {
        // ── Frame final — winnerIdx exacto, siempre correcto ──
        drawWheel(targetAngle);
        if (rouletteLabel) {
          rouletteLabel.textContent    = participants[winnerIdx].name;
          rouletteLabel.style.color     = winnerColors.light;
          rouletteLabel.style.textShadow = `0 0 20px ${winnerColors.glow}`;
        }

        if (prefs.flash) triggerImpactFlashFn?.();
        if (prefs.sound) playWinnerFanfareFn?.();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([40, 20, 80]);
        if (prefs.particles) spawnParticlesFn?.(winnerColors.light);

        setTimeout(() => {
          rouletteOverlay.style.display = 'none';
          if (rouletteLabel) {
            rouletteLabel.style.color      = '';
            rouletteLabel.style.textShadow = '';
          }
          resolve();
        }, 1100);
      }
    }

    rouletteOverlay.style.display = 'flex';
    if (rouletteLabel) rouletteLabel.textContent = '';
    _rafId = requestAnimationFrame(tick);
  });
}

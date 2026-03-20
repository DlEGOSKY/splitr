import { CONFIG } from './config.js';

export class SeededRandom {
    constructor(seed) { this.seed = seed; }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

export class CanvasManager {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.fxParticles = []; 
        this.bgParticles = []; 
        
        // Configuración por defecto
        this.themeColor = { r: 59, g: 130, b: 246 }; 
        this.activeMood = null;
        
        this.resize();
        this.initBackground(); 
        window.addEventListener('resize', () => { this.resize(); this.initBackground(); });
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Convertir Hex a RGB para efectos de transparencia
    hexToRgb(hex) {
        if (!hex) return { r: 59, g: 130, b: 246 };
        // Si entra un nombre de color o variable, devolvemos un default seguro
        if (!hex.startsWith('#')) return { r: 59, g: 130, b: 246 };
        
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { 
            r: parseInt(result[1], 16), 
            g: parseInt(result[2], 16), 
            b: parseInt(result[3], 16) 
        } : { r: 59, g: 130, b: 246 };
    }

    setMood(styleId) {
        if(styleId && styleId.startsWith('#')) { 
            this.themeColor = this.hexToRgb(styleId); 
        } 
        else if (styleId === 't_matrix') { this.themeColor = { r: 0, g: 255, b: 65 }; this.activeMood = 'MATRIX'; } 
        else if (styleId === 't_gold') { this.themeColor = { r: 255, g: 215, b: 0 }; this.activeMood = 'GOLD'; } 
        else if (styleId === 't_hot') { this.themeColor = { r: 255, g: 0, b: 255 }; this.activeMood = 'HOT'; }
        else if (styleId === 't_void') { this.themeColor = { r: 100, g: 100, b: 255 }; this.activeMood = 'VOID'; }
        else if (styleId === 't_retro') { this.themeColor = { r: 132, g: 204, b: 22 }; this.activeMood = 'RETRO'; }
        // NUEVOS
        else if (styleId === 't_crimson') { this.themeColor = { r: 239, g: 68, b: 68 }; this.activeMood = 'DANGER'; }
        else if (styleId === 't_blueprint') { this.themeColor = { r: 255, g: 255, b: 255 }; this.activeMood = 'TECH'; }
        else if (styleId === 't_win95') { this.themeColor = { r: 0, g: 0, b: 128 }; this.activeMood = 'OS'; }
        
        else { this.themeColor = { r: 59, g: 130, b: 246 }; this.activeMood = null; }
    }

    initBackground() {
        this.bgParticles = [];
        // Reducir partículas: 18000 en lugar de 12000 — mucho más liviano
        const count = Math.min(40, Math.floor((this.canvas.width * this.canvas.height) / 22000));
        for (let i = 0; i < count; i++) {
            this.bgParticles.push({
                x: Math.random() * this.canvas.width, 
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.4, 
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 1.5 + 0.5,
                char: Math.random() > 0.5 ? '1' : '0'
            });
        }
    }

    explode(x, y, color) {
        if (window.app && window.app.settings && !window.app.settings.performance) return;

        const count = 20;
        const rect = this.canvas.getBoundingClientRect(); 
        const finalX = x || rect.width / 2;
        const finalY = y || rect.height / 2;
        
        for (let i = 0; i < count; i++) {
            this.fxParticles.push({
                x: finalX, y: finalY, 
                vx: (Math.random() - 0.5) * 15, 
                vy: (Math.random() - 0.5) * 15,
                life: 1.0, 
                color: color || `rgb(${this.themeColor.r},${this.themeColor.g},${this.themeColor.b})`,
                size: Math.random() * 5 + 2,
                char: Math.random() > 0.5 ? '1' : '0'
            });
        }
    }

    // DIBUJADO GENÉRICO (Sirve para Fondo y Explosiones)
    // DIBUJADO GENÉRICO (ACTUALIZADO)
    drawParticle(ctx, p, colorOverride = null) {
        let type = 'circle';
        // Detectar tipo equipado
        if (window.app && window.app.shop && window.app.shop.equipped) {
            const pId = window.app.shop.equipped.particle;
            if (pId.includes('square')) type = 'square';
            else if (pId.includes('star')) type = 'star';
            else if (pId.includes('code')) type = 'code';
            else if (pId.includes('bio')) type = 'bio';   // NUEVO
            else if (pId.includes('money')) type = 'money'; // NUEVO
            else if (pId.includes('heart')) type = 'heart'; // NUEVO
        }

        if(colorOverride) ctx.fillStyle = colorOverride;

        // Lógica de dibujado
        if(type === 'square') { 
            ctx.fillRect(p.x - p.size, p.y - p.size, p.size*2, p.size*2); 
        } 
        else if (type === 'star') { 
            this.drawStar(ctx, p.x, p.y, 5, p.size*2, p.size);
        } 
        else if (type === 'code') { 
            ctx.font = `${p.size*4}px monospace`;
            ctx.fillText(p.char || '1', p.x, p.y); 
        }
        // --- NUEVOS EFECTOS (Usando Emojis) ---
        else if (type === 'bio') {
            ctx.font = `${p.size*4}px Arial`;
            ctx.fillText("☣️", p.x, p.y);
        }
        else if (type === 'money') {
            ctx.font = `${p.size*4}px Arial`;
            ctx.fillStyle = '#85bb65'; // Forzar color billete
            ctx.fillText("$", p.x, p.y);
        }
        else if (type === 'heart') {
            ctx.font = `${p.size*4}px Arial`;
            ctx.fillText("❤️", p.x, p.y);
        }

        // EN drawParticle(ctx, p, colorOverride = null) ...

        // ... (código anterior square, star, code) ...

        // --- NUEVOS EFECTOS ---
        else if (type === 'pizza') {
            ctx.font = `${p.size*4}px Arial`;
            ctx.fillText("🍕", p.x, p.y);
        }
        else if (type === 'note') {
            ctx.font = `${p.size*4}px Arial`;
            ctx.fillStyle = colorOverride || '#fff';
            // Alternar entre corchea y semicorchea
            ctx.fillText(p.size > 3 ? "♪" : "♫", p.x, p.y);
        }
        else if (type === 'bubble') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.strokeStyle = colorOverride || 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.stroke(); // Solo borde, sin relleno (hollow)
            // Brillo blanco pequeño
            ctx.beginPath();
            ctx.arc(p.x - p.size*0.3, p.y - p.size*0.3, p.size*0.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fill();
        }
        
        // ... (resto del código)
        // --------------------------------------
        else { 
            // Círculo por defecto
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); 
        }

        
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    pauseBackground() { this._paused = true; }
    resumeBackground() { 
        this._paused = false;
        this.fxParticles = [];
    }

    loop() {
        if (this._paused) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            requestAnimationFrame(() => this.loop());
            return;
        }
        // Limpiar
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Color Base (del tema actual)
        const c = this.themeColor;
        this.ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.4)`; // Partículas semi-transparentes
        this.ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.1)`;
        this.ctx.lineWidth = 1;

        // 1. DIBUJAR FONDO (Red Neuronal)
        const DIST_SQ = 9000; // 100px² — evitar Math.sqrt en el inner loop
        for (let i = 0; i < this.bgParticles.length; i++) {
            let p = this.bgParticles[i];
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > this.canvas.width)  p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
            this.drawParticle(this.ctx, p);

            if (this.activeMood !== 'MATRIX') {
                for (let j = i + 1; j < this.bgParticles.length; j++) {
                    let p2 = this.bgParticles[j];
                    const dx = p.x - p2.x, dy = p.y - p2.y;
                    const dSq = dx*dx + dy*dy;
                    if (dSq < DIST_SQ) {
                        this.ctx.beginPath();
                        this.ctx.globalAlpha = (1 - dSq / DIST_SQ) * 0.5;
                        this.ctx.moveTo(p.x, p.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.stroke();
                    }
                }
            }
        }
        this.ctx.globalAlpha = 1;

        // 2. DIBUJAR EXPLOSIONES (FX)
        for (let i = this.fxParticles.length - 1; i >= 0; i--) {
            let p = this.fxParticles[i];
            p.x += p.vx; 
            p.y += p.vy; 
            p.life -= 0.02;
            
            if (p.life <= 0) { 
                this.fxParticles.splice(i, 1); 
            } else {
                this.ctx.globalAlpha = p.life; 
                this.drawParticle(this.ctx, p, p.color);
            }
        }
        this.ctx.globalAlpha = 1;

        requestAnimationFrame(() => this.loop());
    }
}

/**
 * Algoritmo de Decodificación (Fuerza Bruta JS) [cite: 65, 68]
 * Sustituye caracteres aleatoriamente por glifos "Cyber" hasta fijar el valor final.
 */
export function resolveText(element, targetString, duration = 800) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/?#$!@%&*";
    let iterations = 0;
    const maxIterations = 15;
    
    const interval = setInterval(() => {
        element.innerText = targetString
            .split("")
            .map((char, index) => {
                // La probabilidad de fijar el carácter aumenta con cada iteración [cite: 70]
                if (index < iterations) return targetString[index];
                return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("");

        if (iterations >= targetString.length) clearInterval(interval);
        iterations += targetString.length / maxIterations;
    }, duration / maxIterations);
}
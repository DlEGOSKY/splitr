import { CONFIG } from '../config.js';

export class MathRushGame {
    constructor(canvas, audio, onQuit) {
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.speed = 2;
        this.isRunning = false;
        this.equations = [];
        this.spawnTimer = null;
        this.gameLoopId = null;
        
        this.uiScore = document.getElementById('ui-score');
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('math-styles')) return;
        const style = document.createElement('style');
        style.id = 'math-styles';
        // ... (ESTILOS IGUALES, SIN CAMBIOS) ...
        style.innerHTML = `
            .math-menu-container { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s; background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%); }
            .math-start-card { background: rgba(15, 23, 42, 0.8); border: 2px solid #3b82f6; border-radius: 16px; padding: 30px; text-align: center; width: 280px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 20px rgba(59, 130, 246, 0.2); display: flex; flex-direction: column; align-items: center; gap: 15px; }
            .math-start-card:hover { transform: scale(1.05); background: rgba(59, 130, 246, 0.1); border-color: #60a5fa; box-shadow: 0 0 30px rgba(59, 130, 246, 0.4); }
            .math-start-icon { font-size: 4rem; color: #3b82f6; text-shadow: 0 0 15px #3b82f6; }
            .math-start-title { font-family: var(--font-display); font-size: 1.5rem; color: white; letter-spacing: 2px; }
            .math-cost { font-family: monospace; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 4px; }
            .math-lives-indicator { position: absolute; top: 80px; left: 50%; transform: translateX(-50%); font-size: 1.5rem; z-index: 30; filter: drop-shadow(0 0 5px rgba(239,68,68,0.5)); letter-spacing: 5px; animation: pulse 2s infinite; pointer-events: none; }
            @keyframes pulse { 0%,100% { opacity: 1; transform: translateX(-50%) scale(1); } 50% { opacity: 0.8; transform: translateX(-50%) scale(0.95); } }
            .zone-indicator { position: absolute; bottom: 0; width: 50%; height: 120px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 30px; font-weight: bold; font-size: 1.2rem; letter-spacing: 2px; z-index: 0; pointer-events: none; }
            .zone-true { left: 0; background: linear-gradient(to top, rgba(16, 185, 129, 0.15), transparent); color: #10b981; border-top: 2px solid rgba(16, 185, 129, 0.5); }
            .zone-false { right: 0; background: linear-gradient(to top, rgba(239, 68, 68, 0.15), transparent); color: #ef4444; border-top: 2px solid rgba(239, 68, 68, 0.5); }
            .math-card { position: absolute; left: 50%; transform: translateX(-50%); background: #0f172a; border: 2px solid #3b82f6; color: white; padding: 15px 20px; border-radius: 12px; font-family: monospace; font-size: 1.5rem; font-weight: bold; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); z-index: 10; width: 200px; text-align: center; pointer-events: none; }
            .math-card.correct { border-color: #10b981; background: #10b981; color: black; animation: popOut 0.2s forwards; }
            .math-card.wrong { border-color: #ef4444; background: #ef4444; animation: shake 0.3s; }
            @keyframes popOut { to { transform: translateX(-50%) scale(1.5); opacity: 0; } }
            .math-touch-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; display: flex; }
            .touch-zone { flex: 1; height: 100%; cursor: pointer; }
            .touch-zone:active { background: rgba(255,255,255,0.05); }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) { 
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {} 
            // Salida segura
            if(this.onQuit) this.onQuit(0);
            return; 
        }
        
        this.uiContainer.innerHTML = `<div class="math-menu-container"><h2 style="color: #fff; text-shadow: 0 0 15px #3b82f6; margin-bottom:10px; font-size: 2.5rem;">MATH RUSH</h2><p style="color:#94a3b8; font-size:0.9rem; margin-bottom:40px; letter-spacing: 1px;">CÁLCULO DE EMERGENCIA</p><div class="math-start-card" id="btn-math-start"><i class="fa-solid fa-calculator math-start-icon"></i><span class="math-start-title">INICIAR</span><span class="math-cost">COSTO: $15</span></div><button class="btn btn-secondary" id="btn-math-back" style="margin-top:40px; width: 200px;">VOLVER</button></div>`;
        document.getElementById('btn-math-start').onclick = () => this.payAndStart();
        // Salida segura desde el menú
        document.getElementById('btn-math-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart() {
        window.app.credits -= 15;
        try { document.getElementById('val-credits').innerText = window.app.credits; } catch(e){}
        try { this.audio.playBuy(); } catch(e) {}
        this.start();
    }

    // ... (start, handleKeyInput, spawnEquation, checkAnswer, success, fail, loop IGUALES) ...
    start() {
        this.isRunning = true;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.speed = 0.4;
        this.equations = [];
        if(this.uiScore) this.uiScore.innerText = '0';
        this.uiContainer.innerHTML = `
            <div class="math-lives-indicator" id="mr-lives"><i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i><i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i><i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i></div>
            <div class="zone-indicator zone-true">VERDAD (Izq)</div>
            <div class="zone-indicator zone-false">FALSO (Der)</div>
            <div id="math-track" style="position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; pointer-events:none;"></div>
            <div class="math-touch-layer"><div class="touch-zone" id="touch-left"></div><div class="touch-zone" id="touch-right"></div></div>`;
        
        // Listener seguro que se borra al final
        this.keyHandler = this.handleKeyInput.bind(this);
        window.addEventListener('keydown', this.keyHandler);
        
        document.getElementById('touch-left').onpointerdown = (e) => { e.preventDefault(); this.checkAnswer(true); };
        document.getElementById('touch-right').onpointerdown = (e) => { e.preventDefault(); this.checkAnswer(false); };
        this.spawnEquation();
        this.loop();
    }

    handleKeyInput(e) {
        if(!this.isRunning) return;
        if (e.key === 'ArrowLeft' || e.key === 'a') this.checkAnswer(true);
        if (e.key === 'ArrowRight' || e.key === 'd') this.checkAnswer(false);
    }

    spawnEquation() {
        if (!this.isRunning) return;
        const maxNum = 5 * this.level;
        const a = Math.floor(Math.random() * maxNum) + 1;
        const b = Math.floor(Math.random() * maxNum) + 1;
        const isPlus = Math.random() > 0.5;
        const realRes = isPlus ? a + b : a - b;
        const isTrue = Math.random() > 0.5;
        let displayRes = realRes;
        if (!isTrue) {
            const offset = Math.random() > 0.5 ? (Math.floor(Math.random()*3)+1) : 10;
            displayRes = Math.random() > 0.5 ? realRes + offset : realRes - offset;
            if(displayRes === realRes) displayRes += 1;
        }
        const opSymbol = isPlus ? '+' : '-';
        const el = document.createElement('div');
        el.className = 'math-card';
        el.innerText = `${a} ${opSymbol} ${b} = ${displayRes}`;
        el.style.top = '-15%';
        document.getElementById('math-track').appendChild(el);
        this.equations.push({ el: el, y: -15, isTrue: isTrue, active: true });
        const spawnDelay = Math.max(800, 2500 - (this.level * 150));
        this.spawnTimer = setTimeout(() => this.spawnEquation(), spawnDelay);
    }

    checkAnswer(playerChoice) {
        const target = this.equations.find(eq => eq.active);
        if (!target) return;
        if (playerChoice === target.isTrue) this.success(target); else this.fail(target);
    }

    success(eq) {
        eq.active = false;
        eq.el.classList.add('correct');
        setTimeout(() => eq.el.remove(), 200);
        this.equations = this.equations.filter(e => e !== eq);
        this.score += 10;
        try { this.audio.playClick(); } catch(e){}
        if(this.uiScore) this.uiScore.innerText = this.score;
        if (this.score % 50 === 0) {
            this.level++;
            this.speed += 0.05;
            try { this.audio.playWin(1); window.app.showToast("VELOCIDAD UP!", "Nivel Aumentado", "gold"); } catch(e){}
        }
    }

    fail(eq) {
        if(eq) {
            eq.active = false;
            eq.el.classList.add('wrong');
            setTimeout(() => eq.el.remove(), 300);
            this.equations = this.equations.filter(e => e !== eq);
        }
        this.lives--;
        try { this.audio.playLose(); } catch(e){}
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 300);
        const livesStr = '<i class="fa-solid fa-heart" style="color:#ec4899;margin:0 3px;"></i>'.repeat(this.lives) + '<i class="fa-solid fa-xmark" style="color:#334155;margin:0 3px;font-size:0.9rem;"></i>'.repeat(3-this.lives);
        const livesEl = document.getElementById('mr-lives');
        if(livesEl) livesEl.innerHTML = livesStr;
        if (this.lives <= 0) this.gameOver();
    }

    loop() {
        if(!this.isRunning) return;
        this.equations.forEach(eq => {
            if (eq.active) {
                eq.y += this.speed;
                eq.el.style.top = eq.y + '%';
                if (eq.y > 90) this.fail(eq);
            }
        });
        this.gameLoopId = requestAnimationFrame(() => this.loop());
    }

    // --- CORRECCIÓN CRÍTICA ---
    pause() {
        if(!this.isRunning) return;
        this._wasPaused = true;
        if(this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId=null; }
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isRunning){ this.lastTime=performance.now(); this.gameLoopId=requestAnimationFrame(()=>this.loop()); }
    }


    gameOver() {
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        if(this.spawnTimer) clearTimeout(this.spawnTimer);
        
        // Limpiamos el listener del teclado para no dejar basura
        window.removeEventListener('keydown', this.keyHandler);
        
        // Llamada Inteligente
        if(this.onQuit) this.onQuit(this.score);
    }
}
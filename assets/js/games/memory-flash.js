import { CONFIG } from '../config.js';

export class MemoryFlashGame {
    // NOTA: onQuit es el Smart Callback
    constructor(canvas, audio, onQuit) {
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.sequence = [];
        this.playerInput = [];
        this.level = 1;
        this.mode = 'NORMAL'; 
        this.gridSize = 3; 
        this.isPlayerTurn = false;
        this.isRunning = false;

        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('pattern-styles')) return;
        const style = document.createElement('style');
        style.id = 'pattern-styles';
        // ... (TUS ESTILOS SE MANTIENEN IGUALES) ...
        style.innerHTML = `
            .pattern-grid { display: grid; gap: 12px; margin-top: 20px; pointer-events: none; transition: all 0.3s ease; }
            .pattern-grid.active { pointer-events: auto; }
            .pattern-cell { background: rgba(15, 23, 42, 0.9); border: 2px solid #334155; border-radius: 8px; cursor: pointer; transition: transform 0.1s, background 0.1s, box-shadow 0.1s; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
            .pattern-cell:active { transform: scale(0.95); }
            .pattern-cell.lit { background: #06b6d4; border-color: #fff; box-shadow: 0 0 25px #06b6d4, inset 0 0 15px rgba(255,255,255,0.5); z-index: 10; }
            .pattern-cell.correct { background: #10b981; border-color: #fff; box-shadow: 0 0 25px #10b981; }
            .pattern-cell.wrong { background: #ef4444; border-color: #fff; box-shadow: 0 0 25px #ef4444; animation: shake 0.3s; }
            .turn-indicator { font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 10px; height: 30px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; transition: color 0.3s; }
            .grid-upgrade-anim { animation: gridExpand 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55); }
            @keyframes gridExpand { 0% { transform: scale(0.8); opacity: 0; filter: blur(10px); } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); filter: blur(0); } }
            .upgrade-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; color: #fbbf24; font-weight: bold; text-shadow: 0 0 20px #fbbf24; pointer-events: none; z-index: 100; text-align: center; width: 100%; animation: zoomFade 1.5s forwards; }
            @keyframes zoomFade { 0% { opacity:0; transform: translate(-50%,-50%) scale(0.5); } 20% { opacity:1; transform: translate(-50%,-50%) scale(1.2); } 80% { opacity:1; } 100% { opacity:0; transform: translate(-50%,-50%) scale(1.5); } }
            .info-modal { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(5px); z-index: 2000; display: none; flex-direction: column; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.3s; }
            .info-modal.active { display: flex; }
            .info-content { background: #0f172a; border: 1px solid var(--primary); border-radius: 10px; padding: 20px; max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 0 30px rgba(0,0,0,0.8); }
            .info-row { display: flex; gap: 15px; margin-bottom: 15px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
            .info-icon { font-size: 1.5rem; width: 40px; text-align: center; }
            .info-text h4 { margin: 0; color: white; font-size: 1rem; }
            .info-text p { margin: 0; color: #94a3b8; font-size: 0.8rem; }
            .mode-select-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; width: 100%; max-width: 600px; padding: 10px; }
            .cyber-mode-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 5px; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
            .cyber-mode-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.08); }
            .cyber-mode-card i { font-size: 2rem; margin-bottom: 5px; transition: transform 0.2s; }
            .cyber-mode-card:hover i { transform: scale(1.2); }
            .cyber-mode-card span { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 1px; }
            .cyber-mode-card small { font-size: 0.6rem; color: #64748b; text-transform: uppercase; }
            .mode-normal { border-color: #06b6d4; color: #06b6d4; } .mode-normal:hover { box-shadow: 0 0 15px rgba(6, 182, 212, 0.2); }
            .mode-evolution { border-color: #fbbf24; color: #fbbf24; } .mode-evolution:hover { box-shadow: 0 0 15px rgba(251, 191, 36, 0.2); }
            .mode-nightmare { border-color: #ef4444; color: #ef4444; } .mode-nightmare:hover { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
            .mode-reverse { border-color: #f43f5e; color: #f43f5e; } .mode-reverse:hover { box-shadow: 0 0 15px rgba(244, 63, 94, 0.2); }
            .mode-chaos { border-color: #a855f7; color: #a855f7; } .mode-chaos:hover { box-shadow: 0 0 15px rgba(168, 85, 247, 0.2); }
            .btn-info { position: absolute; top: 20px; right: 20px; background: transparent; border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.7); border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center; }
            .btn-info:hover { border-color: white; color: white; background: rgba(255,255,255,0.1); }
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
        
        // ... (TU HTML DE INICIO ESTABA PERFECTO, LO MANTENGO) ...
        this.uiContainer.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; animation: fadeIn 0.5s;">
                <button class="btn-info" id="btn-info-modal"><i class="fa-solid fa-info"></i></button>
                <h2 style="color: #fff; text-shadow: 0 0 15px var(--cyan); margin-bottom:10px;">SECUENCIA NEURONAL</h2>
                <p style="color:#64748b; font-size:0.8rem; margin-bottom:30px;">SELECCIONA PROTOCOLO DE ENTRENAMIENTO</p>
                <div class="mode-select-grid">
                    <div class="cyber-mode-card mode-normal" id="mode-normal"><i class="fa-solid fa-microchip"></i><span>NORMAL</span><small>Clásico 3x3</small></div>
                    <div class="cyber-mode-card mode-evolution" id="mode-evolution"><i class="fa-solid fa-dna"></i><span>EVOLUTION</span><small>Grilla Dinámica</small></div>
                    <div class="cyber-mode-card mode-nightmare" id="mode-nightmare"><i class="fa-solid fa-skull"></i><span>NIGHTMARE</span><small>Memoria Infinita</small></div>
                    <div class="cyber-mode-card mode-reverse" id="mode-reverse"><i class="fa-solid fa-rotate-left"></i><span>BACKTRACE</span><small>Inverso</small></div>
                    <div class="cyber-mode-card mode-chaos" id="mode-chaos"><i class="fa-solid fa-shuffle"></i><span>CHAOS</span><small>Aleatorio</small></div>
                </div>
                <button class="btn btn-secondary" id="btn-mem-back" style="margin-top:30px; width: 200px;">VOLVER AL LOBBY</button>
            </div>
            <div class="info-modal" id="info-modal-overlay">
                <div class="info-content">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                        <h3 style="color:var(--primary); margin:0;">GLOSARIO DE MODOS</h3>
                        <button id="close-info" style="background:none; border:none; color:white; cursor:pointer; font-size:1.2rem;">✕</button>
                    </div>
                    <div class="info-row"><div class="info-icon" style="color:#06b6d4"><i class="fa-solid fa-microchip"></i></div><div class="info-text"><h4>NORMAL</h4><p>Modo clásico. La secuencia se acumula (A, AB, ABC...). Grilla fija de 3x3.</p></div></div>
                    <div class="info-row"><div class="info-icon" style="color:#fbbf24"><i class="fa-solid fa-dna"></i></div><div class="info-text"><h4>EVOLUTION</h4><p>Dificultad adaptativa. Empieza en 2x2. Al nivel 4 sube a 3x3 y al 9 sube a 4x4. La secuencia se reinicia al cambiar.</p></div></div>
                    <div class="info-row"><div class="info-icon" style="color:#ef4444"><i class="fa-solid fa-skull"></i></div><div class="info-text"><h4>NIGHTMARE</h4><p>Como Evolution, pero la secuencia <strong>NO</strong> se reinicia al crecer la grilla. Solo para expertos.</p></div></div>
                    <div class="info-row"><div class="info-icon" style="color:#f43f5e"><i class="fa-solid fa-rotate-left"></i></div><div class="info-text"><h4>BACKTRACE</h4><p>Debes ingresar la secuencia en orden inverso. Si ves 1-2-3, marcas 3-2-1.</p></div></div>
                    <div class="info-row"><div class="info-icon" style="color:#a855f7"><i class="fa-solid fa-shuffle"></i></div><div class="info-text"><h4>CHAOS</h4><p>La secuencia cambia totalmente en cada ronda. No se acumula. Pura memoria a corto plazo.</p></div></div>
                </div>
            </div>
        `;

        document.getElementById('mode-normal').onclick = () => this.payAndStart('NORMAL');
        document.getElementById('mode-evolution').onclick = () => this.payAndStart('EVOLUTION');
        document.getElementById('mode-nightmare').onclick = () => this.payAndStart('NIGHTMARE');
        document.getElementById('mode-reverse').onclick = () => this.payAndStart('REVERSE');
        document.getElementById('mode-chaos').onclick = () => this.payAndStart('CHAOS');
        
        // Salida segura
        document.getElementById('btn-mem-back').onclick = () => { if(this.onQuit) this.onQuit(0); };

        const modal = document.getElementById('info-modal-overlay');
        document.getElementById('btn-info-modal').onclick = () => modal.classList.add('active');
        document.getElementById('close-info').onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => { if(e.target === modal) modal.classList.remove('active'); };
    }

    payAndStart(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.mode = mode;
        if (this.mode === 'EVOLUTION' || this.mode === 'NIGHTMARE') { this.gridSize = 2; } 
        else { this.gridSize = 3; }
        this.renderGame();
        this.start();
    }

    // ... (renderGame, start, nextRound, playSequence, handleInput, playTone, setStatus, wait, SON IGUALES) ...
    renderGame() {
        let label = this.mode;
        let color = "#06b6d4";
        let iconHtml = '<i class="fa-solid fa-microchip"></i>';
        if(this.mode === 'EVOLUTION') { label = "EVOLUCIÓN"; color = "#fbbf24"; iconHtml = '<i class="fa-solid fa-dna"></i>'; }
        if(this.mode === 'NIGHTMARE') { label = "NIGHTMARE"; color = "#ef4444"; iconHtml = '<i class="fa-solid fa-skull"></i>'; }
        if(this.mode === 'REVERSE') { label = "BACKTRACE"; color = "#f43f5e"; iconHtml = '<i class="fa-solid fa-rotate-left"></i>'; }
        if(this.mode === 'CHAOS') { label = "CAOS"; color = "#a855f7"; iconHtml = '<i class="fa-solid fa-shuffle"></i>'; }
        const cellSize = this.gridSize === 2 ? 100 : (this.gridSize === 3 ? 80 : 60);
        
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
                <div style="display:flex; gap:10px; align-items:center; color:${color}; margin-bottom:10px; border:1px solid ${color}; padding:5px 15px; border-radius:20px; background:rgba(0,0,0,0.5);">
                    ${iconHtml} <span style="font-family:var(--font-display); letter-spacing:2px;">${label}</span>
                </div>
                <div class="turn-indicator" id="turn-msg">Iniciando...</div>
                <div class="pattern-grid grid-upgrade-anim" id="p-grid" style="grid-template-columns: repeat(${this.gridSize}, 1fr); width: fit-content;">
                    ${Array(this.gridSize * this.gridSize).fill(0).map((_, i) => `<div class="pattern-cell" data-id="${i}" style="width:${cellSize}px; height:${cellSize}px;"></div>`).join('')}
                </div>
                <div style="margin-top:30px; font-family:monospace; color:#94a3b8;">NIVEL: <span id="mem-lvl" style="color:#fff; font-weight:bold;">1</span></div>
            </div>`;
        const cells = document.querySelectorAll('.pattern-cell');
        cells.forEach(cell => {
            cell.addEventListener('mousedown', (e) => this.handleInput(e));
            cell.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInput(e); });
        });
    }

    start() {
        this.isRunning = true; this.sequence = []; this.playerInput = []; this.level = 1;
        setTimeout(() => this.nextRound(), 1000);
    }

    nextRound() {
        if(!this.isRunning) return;
        this.isPlayerTurn = false; this.playerInput = [];
        const currentScore = (this.mode === 'CHAOS') ? this.level : this.sequence.length;
        this.level = currentScore + 1;
        document.getElementById('mem-lvl').innerText = this.level;
        if (this.mode === 'EVOLUTION' || this.mode === 'NIGHTMARE') {
            let newSize = this.gridSize;
            if (this.level === 4 && this.gridSize < 3) newSize = 3;
            if (this.level === 9 && this.gridSize < 4) newSize = 4;
            if (newSize !== this.gridSize) {
                this.gridSize = newSize;
                if (this.mode === 'EVOLUTION') this.sequence = []; 
                const overlay = document.createElement('div'); overlay.className = 'upgrade-text';
                overlay.innerHTML = this.mode === 'NIGHTMARE' ? '<i class="fa-solid fa-triangle-exclamation"></i> SOBRECARGA' : '<i class="fa-solid fa-network-wired"></i> EXPANSIÓN';
                this.uiContainer.appendChild(overlay);
                try { this.audio.playWin(3); } catch(e) {}
                setTimeout(() => { this.renderGame(); setTimeout(() => this.nextRound(), 1000); }, 1500);
                return; 
            }
        }
        const grid = document.getElementById('p-grid');
        if(grid) grid.classList.remove('active');
        this.setStatus("OBSERVA", "#06b6d4");
        const maxCells = this.gridSize * this.gridSize;
        if (this.mode === 'CHAOS') { this.sequence = []; for(let i=0; i < this.level; i++) this.sequence.push(Math.floor(Math.random() * maxCells)); } 
        else { this.sequence.push(Math.floor(Math.random() * maxCells)); }
        this.playSequence();
    }

    async playSequence() {
        await this.wait(500);
        const cells = document.querySelectorAll('.pattern-cell');
        for (let id of this.sequence) {
            if(!this.isRunning) return;
            if(cells[id]) {
                cells[id].classList.add('lit');
                this.playTone(id);
                let speed = Math.max(150, 600 - (this.level * 25));
                if(this.mode === 'NIGHTMARE') speed = Math.max(120, 500 - (this.level * 30));
                await this.wait(speed);
                cells[id].classList.remove('lit');
                await this.wait(100);
            }
        }
        if(!this.isRunning) return;
        this.isPlayerTurn = true;
        if (this.mode === 'REVERSE') this.setStatus("REPETIR AL REVÉS", "#f43f5e"); else this.setStatus("TU TURNO", "#fff");
        const grid = document.getElementById('p-grid');
        if(grid) grid.classList.add('active');
    }

    handleInput(e) {
        if(!this.isRunning || !this.isPlayerTurn) return;
        const id = parseInt(e.target.dataset.id);
        const cell = e.target;
        cell.classList.add('lit'); this.playTone(id); setTimeout(() => cell.classList.remove('lit'), 150);
        const currentStep = this.playerInput.length;
        let expectedId;
        if (this.mode === 'REVERSE') { const reverseIndex = this.sequence.length - 1 - currentStep; expectedId = this.sequence[reverseIndex]; } 
        else { expectedId = this.sequence[currentStep]; }
        if (id === expectedId) {
            this.playerInput.push(id);
            if (this.playerInput.length === this.sequence.length) {
                this.isPlayerTurn = false; document.getElementById('p-grid').classList.remove('active'); this.setStatus("OK", "#10b981"); setTimeout(() => this.nextRound(), 800);
            }
        } else {
            cell.classList.remove('lit'); cell.classList.add('wrong'); this.setStatus("ERROR DE DATOS", "#ef4444");
            this.gameOver();
        }
    }

    playTone(id) {
        try { const baseFreq = 200; const step = 600 / (this.gridSize * this.gridSize); const freq = baseFreq + (id * step); if (this.audio.playTone) this.audio.playTone(freq, 'sine', 0.1); else this.audio.playClick(); } catch(e) {}
    }
    setStatus(text, color) { const el = document.getElementById('turn-msg'); if(el) { el.innerText = text; el.style.color = color; el.style.textShadow = `0 0 10px ${color}`; } }
    wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    // --- CORRECCIÓN CRÍTICA: Fin de Juego ---
    gameOver() {
        this.isRunning = false;
        try { this.audio.playLose(); } catch(e) {}

        let multiplier = 5;
        if(this.mode === 'EVOLUTION') multiplier = 8;
        if(this.mode === 'NIGHTMARE') multiplier = 15;
        if(this.mode === 'REVERSE') multiplier = 8;

        const finalScore = Math.max(0, this.level - 1);
        const prize = finalScore * multiplier;
        
        setTimeout(() => {
            // Dar créditos manualmente porque es lógica del juego
            if(window.app) {
                window.app.credits += prize;
                window.app.save();
            }
            
            // Delegar la tarjeta al main
            if(this.onQuit) this.onQuit(finalScore);
        }, 800);
    }
    pause() {
        if(this._paused) return;
        this._paused = true;
        this.isRunning = false;
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        this.isRunning = true;
    }
}

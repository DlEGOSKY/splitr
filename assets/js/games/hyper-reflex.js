import { CONFIG } from '../config.js';

export class GameReflex {
    // NOTA: 'onQuit' ahora es la función inteligente 'onGameOverSmart' del main.js
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas || window.app.canvas;
        this.audio = audio || window.app.audio;
        this.onQuit = onQuit; 
        
        this.state = 'MENU'; 
        this.round = 0;
        this.maxRounds = 5;
        this.times = [];
        this.startTime = 0;
        this.timeoutId = null;
        this.mode = 'NORMAL'; 
        
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('reflex-styles')) return;
        const style = document.createElement('style');
        style.id = 'reflex-styles';
        // ... (TUS ESTILOS IGUALES, SIN CAMBIOS) ...
        style.innerHTML = `
            .reflex-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; cursor: pointer; -webkit-tap-highlight-color: transparent; }
            .reflex-core { width: 180px; height: 180px; border-radius: 50%; position: relative; display: flex; align-items: center; justify-content: center; transition: all 0.1s; }
            .reflex-core.waiting { border: 4px solid rgba(239,68,68,0.5); background: radial-gradient(circle, #450a0a 0%, #000 80%); box-shadow: 0 0 30px rgba(239,68,68,0.2); animation: corePulse 0.8s infinite; }
            .reflex-core.active { background: #fff; border-color: #fff; box-shadow: 0 0 60px #fff, 0 0 100px #ec4899; transform: scale(1.1); }
            .reflex-core.fail { background: #ef4444; border-color: #ef4444; box-shadow: 0 0 50px #ef4444; }
            .reflex-ring { position: absolute; border-radius: 50%; border: 2px solid transparent; border-top-color: #ef4444; border-bottom-color: #ef4444; animation: spin 2s linear infinite; opacity: 0.6; pointer-events: none; }
            .reflex-ring:nth-child(1) { width: 100%; height: 100%; animation-duration: 3s; }
            .reflex-ring:nth-child(2) { width: 70%; height: 70%; animation-duration: 1.5s; animation-direction: reverse; }
            .reflex-core.active .reflex-ring { animation: expandRing 0.4s ease-out forwards; border-color: #ec4899; }
            .reflex-ms { font-family: 'Orbitron', sans-serif; font-size: 2.5rem; color: white; z-index: 20; text-shadow: 0 0 10px black; pointer-events: none; }
            .reflex-msg { position: absolute; bottom: -40px; font-size: 0.8rem; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; }
            @keyframes corePulse { 0% { transform: scale(1); } 50% { transform: scale(0.97); } 100% { transform: scale(1); } }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes expandRing { to { width: 250px; height: 250px; opacity: 0; border-width: 0; } }
        `;
        document.head.appendChild(style);
    }

    init() {
        if(window.app.credits < 15) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Requiere $15", "danger"); } catch(e){}
            if(this.onQuit) this.onQuit(0);
            return;
        }

        const modes = [
            { id:'mode-normal',   mc:'var(--reflex,#f97316)', icon:'fa-bolt',             name:'ESTÁNDAR',  desc:'5 rondas · promedio final'  },
            { id:'mode-hardcore', mc:'#ef4444',               icon:'fa-skull-crossbones', name:'LETAL',     desc:'< 250ms o game over'        },
            { id:'mode-endless',  mc:'#a855f7',               icon:'fa-infinity',         name:'ENDLESS',   desc:'Hasta que falles · sin límite'},
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">HYPER REFLEX</div>
                <div style="font-size:0.65rem;color:var(--reflex,#f97316);letter-spacing:3px;font-family:monospace;">CALIBRACIÓN SINÁPTICA</div>
                <div style="width:120px;height:1px;background:var(--reflex,#f97316);margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;">
                ${modes.map(m=>`
                <div style="
                    width:160px;min-height:160px;
                    background:rgba(10,16,30,0.9);
                    border:1px solid ${m.mc}25;
                    border-radius:14px;
                    display:flex;flex-direction:column;
                    align-items:center;justify-content:center;
                    gap:10px;cursor:pointer;
                    transition:transform 0.15s,border-color 0.15s,box-shadow 0.15s;
                    padding:20px 12px;position:relative;overflow:hidden;"
                    id="${m.id}"
                    onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                    onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;border-radius:14px 14px 0 0;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:2rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.8rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.62rem;color:#475569;font-family:monospace;letter-spacing:1px;text-transform:uppercase;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="reflex-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;

        document.getElementById('mode-normal').onclick   = () => this.startGame('NORMAL');
        document.getElementById('mode-hardcore').onclick = () => this.startGame('HARDCORE');
        document.getElementById('mode-endless').onclick  = () => this.startGame('ENDLESS');
        document.getElementById('reflex-back').onclick   = () => { if(this.onQuit) this.onQuit(0); };
    }

    startGame(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.mode = mode;
        this.round = 0;
        this.times = [];
        this.maxRounds = mode === 'ENDLESS' ? 999 : 5;
        this.canvas.setMood('REFLEX');
        this.prepareRound();
    }

    // ... (prepareRound, activateSignal, handleClick, handleSuccess SON IGUALES) ...
    prepareRound() {
        this.state = 'WAITING';
        this.round++;
        this.uiContainer.innerHTML = `
            <div class="reflex-container" id="reflex-trigger">
                <div class="reflex-core waiting" id="reflex-core">
                    <div class="reflex-ring"></div><div class="reflex-ring"></div>
                    <div class="reflex-msg">ESPERA LA SEÑAL...</div>
                </div>
                <div style="margin-top:50px; font-family:monospace; color:#94a3b8;">RONDA ${this.round} / ${this.maxRounds}</div>
            </div>`;
        const trigger = document.getElementById('reflex-trigger');
        trigger.onmousedown = (e) => { e.preventDefault(); this.handleClick(); };
        trigger.ontouchstart = (e) => { e.preventDefault(); this.handleClick(); };
        const delay = Math.random() * 3000 + 2000;
        this.timeoutId = setTimeout(() => { this.activateSignal(); }, delay);
    }

    activateSignal() {
        if (this.state !== 'WAITING') return;
        this.state = 'ACTIVE';
        this.startTime = performance.now(); 
        const core = document.getElementById('reflex-core');
        if(core) {
            core.className = 'reflex-core active';
            core.innerHTML = '<div class="reflex-ms">!</div><div class="reflex-msg" style="color:white; font-weight:bold;">¡PULSA!</div>';
        }
        try { this.audio.playTone(800, 'square', 0.1); } catch(e){}
    }

    handleClick() {
        if (this.state === 'WAITING') { this.handleFail("¡DEMASIADO PRONTO!"); } 
        else if (this.state === 'ACTIVE') {
            const endTime = performance.now();
            const reactionTime = Math.floor(endTime - this.startTime);
            this.handleSuccess(reactionTime);
        }
    }

    handleSuccess(ms) {
        this.state = 'RESULT';
        this.times.push(ms);
        const core = document.getElementById('reflex-core');
        core.innerHTML = `<div class="reflex-ms">${ms}<span style="font-size:1rem">ms</span></div>`;
        if (this.mode === 'HARDCORE' && ms > 250) { this.handleFail("¡LENTO! (>250ms)"); return; }
        let color = CONFIG.COLORS.REFLEX;
        let msg = "BUENO";
        if (ms < 200) { color = CONFIG.COLORS.GOLD; msg = "¡DIVINO!"; try { this.audio.playWin(2); } catch(e){} }
        else if (ms < 300) { color = CONFIG.COLORS.SUCCESS; msg = "EXCELENTE"; try { this.audio.playClick(); } catch(e){} }
        else { color = "#94a3b8"; msg = "NORMAL"; try { this.audio.playClick(); } catch(e){} }
        core.style.borderColor = color;
        core.style.boxShadow = `0 0 30px ${color}`;
        try { window.app.showToast(`${ms}ms`, msg, "default"); } catch(e){}
        setTimeout(() => {
            if (this.round < this.maxRounds) { this.prepareRound(); } 
            else { this.finishGame(); }
        }, 1500);
    }

    handleFail(reason) {
        this.state = 'RESULT';
        clearTimeout(this.timeoutId);
        const core = document.getElementById('reflex-core');
        if(core) {
            core.className = 'reflex-core fail';
            core.innerHTML = `<i class="fa-solid fa-xmark" style="font-size:4rem; color:white;"></i><div class="reflex-msg" style="color:white;">${reason}</div>`;
        }
        try { this.audio.playLose(); } catch(e){}
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 500);

        if (this.mode === 'HARDCORE' || this.mode === 'ENDLESS') {
            // Fin inmediato en estos modos
            setTimeout(() => this.finishGame(true), 1500);
        } else {
            this.times.push(1000); 
            try { window.app.showToast("FALLO", "+1000ms Penalización", "danger"); } catch(e){}
            setTimeout(() => {
                if (this.round < this.maxRounds) this.prepareRound();
                else this.finishGame();
            }, 1500);
        }
    }

    // --- CORRECCIÓN CRÍTICA ---
    pause() {
        if(this._paused) return;
        this._paused = true;
        clearTimeout(this.timeoutId);
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        if(this.state === 'WAITING') this.prepareRound();
    }
    finishGame(failed = false) {
        let score = 0;
        
        if (!failed && this.times.length > 0) {
            const sum = this.times.reduce((a, b) => a + b, 0);
            const avg = Math.floor(sum / this.times.length);
            
            // Puntuación inversa: Menos tiempo = más puntos
            // Base 1000 - promedio
            score = Math.max(0, 1000 - avg);
            if (this.mode === 'HARDCORE') score *= 2;
            if (this.mode === 'ENDLESS')  score = this.round * 10 + score; // bonus por rondas completadas

            // Guardar récord de milisegundos para logros
            if(window.app) window.app.saveStat('bestReflex', avg);
            
            let creditsEarned = Math.floor(score / 10);
            window.app.credits += creditsEarned;
            try { window.app.addScore(score, creditsEarned); } catch(e){}
        }

        // Llamada Inteligente: Le pasamos el Score calculado
        if(this.onQuit) this.onQuit(score);
    }
}
import { CONFIG } from '../config.js';

// Paleta de 6 colores — nombres y hex
const PALETTE = [
    { name:'ROJO',    hex:'#ef4444', dark:'#7f1d1d' },
    { name:'AZUL',    hex:'#3b82f6', dark:'#1e3a8a' },
    { name:'VERDE',   hex:'#22c55e', dark:'#14532d' },
    { name:'AMARILLO',hex:'#fbbf24', dark:'#78350f' },
    { name:'MORADO',  hex:'#a855f7', dark:'#3b0764' },
    { name:'ROSADO',  hex:'#ec4899', dark:'#831843' },
];

export class ColorTrapGame {
    constructor(canvas, audio, onGameOver) {
        this.audio = audio;
        this.onGameOver = onGameOver;
        this.score = 0; this.streak = 0; this.lives = 3;
        this.timeLeft = 4.0; this.maxTime = 4.0;
        this.isRunning = false;
        this.gameLoopId = null; this.lastTime = 0;
        this.mode = 'STANDARD';
        this.currentWord = null; this.inkColor = null;
        this.targetType = 'TEXT'; this.options = [];
        this.speedMult = 1.0;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('ct-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'ct-styles-v2';
        s.innerHTML = `
        .ct-root { display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:calc(100vh - 56px);padding:16px 20px;width:100%;box-sizing:border-box;gap:12px; }

        /* HUD */
        .ct-hud { display:flex;gap:8px;width:100%;max-width:520px; }
        .ct-stat { flex:1;background:rgba(10,16,30,0.85);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:7px 12px;display:flex;flex-direction:column;gap:2px; }
        .ct-stat-lbl { font-size:0.52rem;color:#334155;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .ct-stat-val { font-family:var(--font-display);font-size:0.9rem;color:white; }

        /* Carta central */
        .ct-card {
            width:100%;max-width:520px;
            background:rgba(8,14,26,0.9);
            border:1.5px solid rgba(255,255,255,0.08);
            border-radius:20px;
            padding:28px 24px 16px;
            display:flex;flex-direction:column;align-items:center;gap:14px;
            position:relative;overflow:hidden;
            backdrop-filter:blur(6px);
            box-shadow:0 20px 50px rgba(0,0,0,0.5);
            flex-shrink:0;
        }
        .ct-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--ctt,rgba(255,255,255,0.1));transition:background 0.2s; }

        .ct-instruction { font-size:0.6rem;color:#334155;letter-spacing:2.5px;font-family:monospace;text-transform:uppercase;text-align:center; }
        .ct-instruction strong { color:#94a3b8; }
        .ct-instruction .highlight { color:var(--primary); }

        .ct-word { font-family:var(--font-display);font-size:3.5rem;font-weight:bold;letter-spacing:2px;text-shadow:0 0 30px currentColor;line-height:1;transition:color 0.15s; }

        /* Barra de tiempo */
        .ct-time-track { width:100%;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden; }
        .ct-time-fill { height:100%;border-radius:3px;transition:width 0.05s linear,background 0.3s; }

        /* Botones de respuesta */
        .ct-opts { display:grid;gap:10px;width:100%;max-width:520px; }
        .ct-opts.grid-2 { grid-template-columns:1fr 1fr; }
        .ct-opts.grid-4 { grid-template-columns:1fr 1fr; }

        .ct-btn {
            padding:16px 10px;
            background:rgba(10,16,30,0.7);
            border:1.5px solid rgba(255,255,255,0.08);
            border-radius:12px;
            color:white;
            font-family:var(--font-display);
            font-size:0.85rem;
            letter-spacing:1.5px;
            cursor:pointer;
            transition:all 0.1s;
            position:relative;overflow:hidden;
            display:flex;align-items:center;justify-content:center;gap:8px;
        }
        .ct-btn::after { content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--btn-c,rgba(255,255,255,0.1));transition:background 0.2s; }
        .ct-btn:hover { background:rgba(255,255,255,0.06);transform:translateY(-2px);border-color:rgba(255,255,255,0.2); }
        .ct-btn:active { transform:scale(0.97); }
        .ct-btn.correct { background:rgba(34,197,94,0.15) !important; border-color:#22c55e !important; animation:ctCorrect 0.3s ease; }
        .ct-btn.wrong   { background:rgba(239,68,68,0.15) !important; border-color:#ef4444 !important; animation:ctWrong 0.25s ease; }
        @keyframes ctCorrect { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
        @keyframes ctWrong   { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }

        /* Streak badge */
        .ct-streak-badge { background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);color:#fbbf24;font-size:0.65rem;padding:4px 12px;border-radius:20px;font-family:monospace;letter-spacing:1px;display:none;align-items:center;gap:5px; }
        .ct-streak-badge.show { display:inline-flex;animation:fadeIn 0.2s ease; }

        /* Lives */
        .ct-lives { display:flex;gap:5px;align-items:center; }
        .ct-life { font-size:0.9rem;color:#ec4899;transition:all 0.2s; }
        .ct-life.lost { color:#334155;transform:scale(0.7); }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 15){
            try{ window.app.showToast("FONDOS INSUFICIENTES","Costo: $15","danger"); }catch(e){}
            if(this.onGameOver) this.onGameOver(0); return;
        }

        const modes = [
            { id:'ct-standard', mc:'#fbbf24', icon:'fa-palette',        name:'ESTÁNDAR', desc:'Texto vs color · 4 opciones'  },
            { id:'ct-stroop',   mc:'#a855f7', icon:'fa-brain',          name:'STROOP',   desc:'Solo el color importa · sin texto' },
            { id:'ct-survival', mc:'#ef4444', icon:'fa-heart',          name:'SURVIVAL', desc:'3 vidas · no puedes fallar 3 veces' },
            { id:'ct-blitz',    mc:'#22c55e', icon:'fa-bolt-lightning',  name:'BLITZ',    desc:'2 segundos por ronda · solo 2 opciones' },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">COLOR TRAP</div>
                <div style="font-size:0.65rem;color:#fbbf24;letter-spacing:3px;font-family:monospace;">CONFLICTO COGNITIVO</div>
                <div style="width:120px;height:1px;background:#fbbf24;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:500px;width:100%;padding:0 10px;">
                ${modes.map(m=>`
                <div style="background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;min-height:130px;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.5rem;color:${m.mc};filter:drop-shadow(0 0 6px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.58rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="ct-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;

        document.getElementById('ct-standard').onclick = () => this.payAndStart('STANDARD');
        document.getElementById('ct-stroop').onclick   = () => this.payAndStart('STROOP');
        document.getElementById('ct-survival').onclick = () => this.payAndStart('SURVIVAL');
        document.getElementById('ct-blitz').onclick    = () => this.payAndStart('BLITZ');
        document.getElementById('ct-back').onclick     = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    payAndStart(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try{ this.audio.playBuy(); }catch(e){}
        this.mode = mode;
        this.start();
    }

    start() {
        this.isRunning = true; this.score = 0; this.streak = 0; this.lives = 3;
        this.maxTime  = this.mode==='BLITZ' ? 2.0 : 4.0;
        this.timeLeft = this.maxTime;
        this.lastTime = performance.now();
        const gs = document.getElementById('ui-score'); if(gs) gs.innerText='0';
        this.nextRound();
        this.loop(performance.now());
    }

    nextRound() {
        if(!this.isRunning) return;
        // Velocidad aumenta con la puntuación
        const speedMod = Math.min(2.0, Math.floor(this.score/5)*0.15);
        this.maxTime  = Math.max(this.mode==='BLITZ'?1.2:1.8, (this.mode==='BLITZ'?2.0:4.0)-speedMod);
        this.timeLeft = this.maxTime;

        const pool = PALETTE;
        // Elegir palabra y color de tinta
        this.currentWord = pool[Math.floor(Math.random()*pool.length)];
        // 70% de veces son diferentes (el truco del stroop)
        if(Math.random()>0.3){
            const diff = pool.filter(c=>c.name!==this.currentWord.name);
            this.inkColor = diff[Math.floor(Math.random()*diff.length)];
        } else {
            this.inkColor = this.currentWord;
        }

        // Qué tiene que responder el jugador
        if(this.mode==='STROOP'){
            this.targetType = 'COLOR'; // siempre debe responder con el color de tinta
        } else if(this.mode==='BLITZ'){
            this.targetType = Math.random()>0.5?'COLOR':'TEXT'; // alterna
        } else {
            this.targetType = 'TEXT'; // en estándar y survival siempre es texto
            if(Math.random()>0.6) this.targetType = 'COLOR';
        }

        const correctAns = this.targetType==='TEXT' ? this.currentWord : this.inkColor;

        // Construir opciones
        const optionCount = this.mode==='BLITZ' ? 2 : 4;
        const wrong = pool.filter(c=>c.name!==correctAns.name).sort(()=>Math.random()-0.5).slice(0, optionCount-1);
        this.options = [correctAns, ...wrong].sort(()=>Math.random()-0.5);

        this.renderUI();
    }

    renderUI() {
        const isColorTarget = this.targetType==='COLOR';
        const instrText = isColorTarget
            ? `SELECCIONA EL COLOR DE <span class="highlight">TINTA</span>`
            : `SELECCIONA EL <span class="highlight">SIGNIFICADO</span>`;
        const optCount = this.options.length;
        const cardAccent = isColorTarget ? this.inkColor.hex : this.currentWord.hex;

        this.uiContainer.innerHTML = `
        <div class="ct-root">
            <!-- HUD -->
            <div class="ct-hud">
                <div class="ct-stat"><div class="ct-stat-lbl">SCORE</div><div class="ct-stat-val" id="ct-score">0</div></div>
                <div class="ct-stat"><div class="ct-stat-lbl">RACHA</div><div class="ct-stat-val" id="ct-streak" style="color:#fbbf24;">0</div></div>
                ${this.mode==='SURVIVAL'?`<div class="ct-stat"><div class="ct-stat-lbl">VIDAS</div><div class="ct-lives" id="ct-lives">${'<i class="fa-solid fa-heart ct-life"></i>'.repeat(3)}</div></div>`:``}
                <div class="ct-stat"><div class="ct-stat-lbl">MODO</div><div class="ct-stat-val" style="font-size:0.68rem;color:#334155;">${this.mode}</div></div>
            </div>

            <!-- Carta -->
            <div class="ct-card" style="--ctt:${cardAccent};">
                <div class="ct-instruction">${instrText}</div>
                <div class="ct-word" style="color:${this.inkColor.hex};">${this.currentWord.name}</div>
                <div class="ct-time-track">
                    <div class="ct-time-fill" id="ct-time-fill" style="width:100%;background:${cardAccent};box-shadow:0 0 8px ${cardAccent}40;"></div>
                </div>
            </div>

            <!-- Streak badge — FUERA de la carta -->
            ${this.streak>=3?`<div class="ct-streak-badge show" id="ct-sb"><i class="fa-solid fa-fire"></i> RACHA ×${this.streak}</div>`:'<div id="ct-sb"></div>'}

            <!-- Opciones -->
            <div class="ct-opts ${optCount===2?'grid-2':'grid-4'}">
                ${this.options.map(opt=>`
                <button class="ct-btn" data-name="${opt.name}" style="--btn-c:${opt.hex};">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${opt.hex};flex-shrink:0;box-shadow:0 0 6px ${opt.hex};"></span>
                    ${opt.name}
                </button>`).join('')}
            </div>
        </div>`;

        // Actualizar contadores
        const scoreEl = document.getElementById('ct-score');
        if(scoreEl) scoreEl.innerText = this.score;
        const streakEl = document.getElementById('ct-streak');
        if(streakEl){ streakEl.innerText = this.streak; streakEl.style.color = this.streak>=5?'#ef4444':this.streak>=3?'#f97316':'#fbbf24'; }

        // Binds
        document.querySelectorAll('.ct-btn').forEach(btn => {
            btn.onclick = (e) => this.handleInput(e.currentTarget.dataset.name, e.currentTarget);
        });
    }

    handleInput(selectedName, btnEl) {
        if(!this.isRunning) return;
        const correct = this.targetType==='TEXT' ? this.currentWord.name : this.inkColor.name;
        if(selectedName === correct){
            this.score++; this.streak++;
            if(btnEl) btnEl.classList.add('correct');
            try{ this.audio.playWin(this.streak>4?3:1); }catch(e){}
            const gs = document.getElementById('ui-score'); if(gs) gs.innerText = this.score;
            // Bonus de velocidad por racha
            if(this.streak >= 5) this.maxTime = Math.max(this.mode==='BLITZ'?1.0:1.5, this.maxTime - 0.1);
            setTimeout(()=>this.nextRound(), 120);
        } else {
            this.streak = 0;
            if(btnEl) btnEl.classList.add('wrong');
            try{ this.audio.playLose(); }catch(e){}
            document.body.classList.add('shake-screen'); setTimeout(()=>document.body.classList.remove('shake-screen'),300);
            if(this.mode==='SURVIVAL'){
                this.lives--;
                const hearts = document.querySelectorAll('.ct-life');
                if(hearts[this.lives]) hearts[this.lives].classList.add('lost');
                if(this.lives<=0){ setTimeout(()=>this.gameOver(),300); return; }
                setTimeout(()=>this.nextRound(), 300);
            } else {
                setTimeout(()=>this.gameOver(), 300);
            }
        }
    }

    loop(ts) {
        if(!this.isRunning) return;
        if(!this.lastTime) this.lastTime = ts;
        const dt = (ts-this.lastTime)/1000; this.lastTime = ts;
        if(dt>0.15){ this.gameLoopId=requestAnimationFrame(t=>this.loop(t)); return; }
        this.timeLeft -= dt;
        const pct = Math.max(0,(this.timeLeft/this.maxTime)*100);
        const fill = document.getElementById('ct-time-fill');
        if(fill){ fill.style.width=pct+'%'; if(pct<30){fill.style.background='#ef4444';fill.style.boxShadow='0 0 10px #ef4444';} }
        if(this.timeLeft<=0){ this.gameOver(); return; }
        this.gameLoopId = requestAnimationFrame(t=>this.loop(t));
    }

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
        if(!this.isRunning) return;
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        try{ this.audio.playLose(); }catch(e){}
        if(this.onGameOver) this.onGameOver(this.score);
    }
}

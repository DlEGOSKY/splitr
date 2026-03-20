import { CONFIG } from '../config.js';

// Grupos de símbolos — sin espacios en los nombres de clase FA
const SYMBOL_GROUPS = [
    { normal: 'circle',       glitch: 'circle-dot'       },
    { normal: 'square',       glitch: 'square-minus'     },
    { normal: 'star',         glitch: 'star-half-stroke' },
    { normal: 'diamond',      glitch: 'gem'              },
    { normal: 'moon',         glitch: 'sun'              },
    { normal: 'bolt',         glitch: 'bolt-lightning'   },
    { normal: 'shield',       glitch: 'shield-halved'    },
    { normal: 'lock',         glitch: 'lock-open'        },
    { normal: 'eye',          glitch: 'eye-slash'        },
    { normal: 'circle-xmark', glitch: 'circle-check'    },
    { normal: 'wifi',         glitch: 'wifi-slash'       },  // fa-wifi-slash puede no existir
    { normal: 'heart',        glitch: 'heart-crack'      },
    { normal: 'flag',         glitch: 'flag-checkered'   },
    { normal: 'bell',         glitch: 'bell-slash'       },
];

export class GlitchHuntGame {
    constructor(canvas, audio, onQuit) {
        this.audio = audio; this.onQuit = onQuit;
        this.score = 0; this.level = 1;
        this.timeLeft = 5.0; this.isRunning = false;
        this.gameLoopId = null; this.lastTime = 0;
        this.gridSize = 3; this.targetIndex = -1;
        this.mode = 'STANDARD';
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('gh-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'gh-styles-v2';
        s.innerHTML = `
        .gh-root { display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:calc(100vh - 56px);padding:16px 20px;width:100%;box-sizing:border-box;gap:10px; }
        .gh-hud { display:flex;gap:10px;width:100%;max-width:520px; }
        .gh-stat { flex:1;background:rgba(10,16,30,0.85);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:8px 14px;display:flex;flex-direction:column;gap:2px; }
        .gh-stat-lbl { font-size:0.55rem;color:#334155;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .gh-stat-val { font-family:var(--font-display);font-size:1rem;color:white; }

        .gh-grid { display:grid;gap:10px;padding:16px;background:rgba(168,85,247,0.04);border:1px solid rgba(168,85,247,0.15);border-radius:16px;box-shadow:0 0 30px rgba(168,85,247,0.1); }
        .gh-cell { background:rgba(10,16,30,0.8);border:1px solid rgba(255,255,255,0.07);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;position:relative;aspect-ratio:1; }
        .gh-cell:hover { background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.15);transform:scale(1.04); }
        .gh-cell:active { transform:scale(0.95); }
        .gh-cell-icon { font-size:1.8rem;transition:transform 0.15s; }
        .gh-cell.normal .gh-cell-icon { color:#334155; }
        .gh-cell.glitch-target .gh-cell-icon { color:#a855f7; }

        /* Feedback: correcto */
        .gh-cell.hit { background:rgba(168,85,247,0.2) !important; border-color:#a855f7 !important; animation:ghHit 0.3s ease; }
        @keyframes ghHit { 0%{transform:scale(1)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        /* Feedback: error */
        .gh-cell.miss { background:rgba(239,68,68,0.2) !important; border-color:#ef4444 !important; animation:ghMiss 0.25s ease; }
        @keyframes ghMiss { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }

        /* Barra de tiempo */
        .gh-time-wrap { width:100%;max-width:520px; }
        .gh-time-lbl { display:flex;justify-content:space-between;font-size:0.58rem;color:#334155;font-family:monospace;margin-bottom:4px; }
        .gh-time-track { height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden; }
        .gh-time-fill { height:100%;border-radius:3px;transition:width 0.1s linear,background 0.3s; }

        /* Glitch visual en el target — parpadeo sutil */
        .gh-cell.glitch-target { animation:ghTargetFlicker ${0}s ease-in-out infinite; }
        @keyframes ghTargetGlow { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 12px rgba(168,85,247,0.4)} }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 15){ try{window.app.showToast("FONDOS INSUFICIENTES","Costo: $15","danger");}catch(e){} if(this.onQuit)this.onQuit(0); return; }

        const modes = [
            { id:'gh-standard', mc:'#a855f7', icon:'fa-magnifying-glass', name:'ESTÁNDAR', desc:'Iconos distintos, tiempo 5s' },
            { id:'gh-mirror',   mc:'#3b82f6', icon:'fa-left-right',       name:'ESPEJO',   desc:'Uno está girado — más sutil' },
            { id:'gh-blitz',    mc:'#ef4444', icon:'fa-fire',             name:'BLITZ',    desc:'2 segundos · 6×6 cuadrícula' },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">GLITCH HUNT</div>
                <div style="font-size:0.65rem;color:#a855f7;letter-spacing:3px;font-family:monospace;">ENCUENTRA LA ANOMALÍA</div>
                <div style="width:120px;height:1px;background:#a855f7;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:160px;min-height:160px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="gh-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('gh-standard').onclick = () => this.payAndStart('STANDARD');
        document.getElementById('gh-mirror').onclick   = () => this.payAndStart('MIRROR');
        document.getElementById('gh-blitz').onclick    = () => this.payAndStart('BLITZ');
        document.getElementById('gh-back').onclick     = () => { if(this.onQuit)this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try{ this.audio.playBuy(); }catch(e){}
        this.mode = mode; this.start();
    }

    start() {
        this.isRunning = true; this.score = 0; this.level = 1;
        this.gridSize = this.mode==='BLITZ' ? 5 : 3;
        this.timeLeft = this.mode==='BLITZ' ? 2.0 : 5.0;
        this.lastTime = performance.now();

        this.uiContainer.innerHTML = `
        <div class="gh-root">
            <div class="gh-hud">
                <div class="gh-stat"><div class="gh-stat-lbl">NIVEL</div><div class="gh-stat-val" id="gh-level">1</div></div>
                <div class="gh-stat"><div class="gh-stat-lbl">ACIERTOS</div><div class="gh-stat-val" id="gh-score">0</div></div>
                <div class="gh-stat"><div class="gh-stat-lbl">MODO</div><div class="gh-stat-val" style="font-size:0.7rem;color:#a855f7;">${this.mode}</div></div>
            </div>
            <div id="gh-grid-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;width:100%;"></div>
            <div class="gh-time-wrap">
                <div class="gh-time-lbl"><span>TIEMPO RESTANTE</span><span id="gh-time-lbl">${this.timeLeft.toFixed(1)}s</span></div>
                <div class="gh-time-track"><div class="gh-time-fill" id="gh-time-fill" style="width:100%;background:#a855f7;"></div></div>
            </div>
        </div>`;
        this.buildGrid();
        this.gameLoopId = requestAnimationFrame(ts => this.loop(ts));
    }

    buildGrid() {
        const total = this.gridSize * this.gridSize;
        this.targetIndex = Math.floor(Math.random() * total);

        const group = SYMBOL_GROUPS[Math.floor(Math.random() * SYMBOL_GROUPS.length)];
        this.currentNormalIcon = group.normal;
        this.currentGlitchIcon = group.glitch;

        const size = this.gridSize <= 3 ? '88px' : this.gridSize <= 4 ? '72px' : '56px';
        const iconSize = this.gridSize <= 3 ? '1.8rem' : this.gridSize <= 4 ? '1.4rem' : '1rem';

        const grid = document.createElement('div');
        grid.className = 'gh-grid';
        grid.style.gridTemplateColumns = `repeat(${this.gridSize},${size})`;

        for(let i = 0; i < total; i++){
            const isTarget = (i === this.targetIndex);
            // Construir el HTML del icono sin prefijo fa- duplicado
            let iconHTML;
            if(isTarget && this.mode === 'MIRROR'){
                iconHTML = `<i class="fa-solid fa-${this.currentNormalIcon} gh-cell-icon" style="font-size:${iconSize};transform:scaleX(-1);display:inline-block;"></i>`;
            } else {
                const iconName = isTarget ? this.currentGlitchIcon : this.currentNormalIcon;
                iconHTML = `<i class="fa-solid fa-${iconName} gh-cell-icon" style="font-size:${iconSize};"></i>`;
            }

            const flickerStyle = (this.level > 5 && isTarget) ? `animation:ghTargetGlow ${0.8+Math.random()*0.4}s ease-in-out infinite;` : '';

            const cell = document.createElement('div');
            cell.className = `gh-cell ${isTarget ? 'glitch-target' : 'normal'}`;
            cell.style.cssText = `width:${size};height:${size};${flickerStyle}`;
            cell.innerHTML = iconHTML;
            cell.onclick = () => this.handleClick(i, isTarget, cell);
            grid.appendChild(cell);
        }

        const wrap = document.getElementById('gh-grid-wrap');
        if(wrap){ wrap.innerHTML = ''; wrap.appendChild(grid); }
    }

    handleClick(idx, isTarget, cellEl) {
        if(!this.isRunning) return;
        if(isTarget){
            cellEl.classList.add('hit');
            this.score++; this.level++;
            this.timeLeft = this.mode==='BLITZ' ? 2.0 : Math.min(5.0, this.timeLeft + 0.5);
            try{ this.audio.playWin(1); }catch(e){}
            // Aumentar dificultad: cuadrícula más grande en niveles altos
            if(this.level > 5 && this.gridSize < 5 && this.mode!=='BLITZ') this.gridSize = 4;
            if(this.level > 9 && this.gridSize < 6 && this.mode!=='BLITZ') this.gridSize = 5;
            const s=document.getElementById('gh-score'); if(s)s.innerText=this.score;
            const l=document.getElementById('gh-level'); if(l)l.innerText=this.level;
            setTimeout(()=>this.buildGrid(), 220);
        } else {
            cellEl.classList.add('miss');
            this.timeLeft = Math.max(0, this.timeLeft - 1.0);
            try{ this.audio.playLose(); }catch(e){}
            document.body.classList.add('shake-screen'); setTimeout(()=>document.body.classList.remove('shake-screen'),300);
        }
    }

    loop(ts) {
        if(!this.isRunning) return;
        const dt = (ts - this.lastTime) / 1000; this.lastTime = ts;
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        const pct = (this.timeLeft / (this.mode==='BLITZ'?2.0:5.0)) * 100;
        const fill = document.getElementById('gh-time-fill');
        const lbl  = document.getElementById('gh-time-lbl');
        if(fill){ fill.style.width=pct+'%'; fill.style.background=pct<30?'#ef4444':pct<60?'#f97316':'#a855f7'; }
        if(lbl)  lbl.innerText = this.timeLeft.toFixed(1)+'s';
        if(this.timeLeft<=0){ this.gameOver(); return; }
        this.gameLoopId = requestAnimationFrame(ts2=>this.loop(ts2));
    }

    pause() {
        if(!this.isRunning) return;
        this._wasPaused = true;
        if(this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId=null; }
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isRunning){ this.lastTime=performance.now(); this.gameLoopId=requestAnimationFrame(ts=>this.loop(ts)); }
    }


    gameOver() {
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        if(this.onQuit) this.onQuit(this.score);
    }
}

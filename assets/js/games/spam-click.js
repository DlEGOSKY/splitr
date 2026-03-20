import { CONFIG } from '../config.js';

export class SpamClickGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas; this.audio = audio; this.onQuit = onQuit;
        this.score = 0; this.timeLeft = 5.0;
        this.targetClicks = 40; this.isPlaying = false; this.isEnding = false;
        this.timerInterval = null; this.mode = 'NORMAL';
        this.cpsHistory = []; this.lastClickTime = 0;
        this.heatLevel = 0; this.comboStreak = 0;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('spam-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'spam-styles-v2';
        s.innerHTML = `
        .sc-root { display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:calc(100vh - 56px);padding:20px;width:100%;box-sizing:border-box;gap:12px; }

        /* REACTOR — botón principal */
        .sc-reactor { width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,#1e293b 30%,#0f172a 100%);border:4px solid var(--sc-color,#f97316);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;position:relative;box-shadow:0 0 30px var(--sc-glow,rgba(249,115,22,0.2));transition:box-shadow 0.1s;user-select:none;-webkit-tap-highlight-color:transparent;flex-shrink:0; }
        .sc-reactor:active { transform:scale(0.92) !important; }
        .sc-reactor.hot { --sc-glow:rgba(239,68,68,0.5); border-color:#ef4444; background:radial-gradient(circle,#450a0a 30%,#0f172a 100%); }
        .sc-reactor.win { border-color:#10b981 !important; box-shadow:0 0 50px #10b981 !important; background:radial-gradient(circle,#064e3b,#0f172a) !important; pointer-events:none; }
        .sc-reactor.lose { border-color:#ef4444 !important; box-shadow:0 0 50px #ef4444 !important; background:radial-gradient(circle,#450a0a,#0f172a) !important; pointer-events:none; }

        /* Anillos giratorios del reactor */
        .sc-ring { position:absolute;border-radius:50%;border:2px solid transparent;pointer-events:none; }
        .sc-ring-1 { inset:-12px;border-top-color:var(--sc-color,#f97316);border-bottom-color:var(--sc-color,#f97316);opacity:0.3;animation:scSpin 3s linear infinite; }
        .sc-ring-2 { inset:-22px;border-left-color:var(--sc-color,#f97316);opacity:0.15;animation:scSpin 5s linear infinite reverse; }
        @keyframes scSpin { to { transform:rotate(360deg); } }
        .sc-count { font-family:var(--font-display);font-size:3.5rem;color:white;z-index:2;line-height:1; }
        .sc-label { font-size:0.65rem;color:#475569;font-family:monospace;letter-spacing:2px;z-index:2; }

        /* HUD stats */
        .sc-stats { display:flex;gap:10px;width:100%;max-width:480px; }
        .sc-stat { flex:1;background:rgba(10,16,30,0.85);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:8px 14px;display:flex;flex-direction:column;gap:2px; }
        .sc-stat-lbl { font-size:0.55rem;color:#334155;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .sc-stat-val { font-family:var(--font-display);font-size:1rem;color:white; }

        /* Barra de calor */
        .sc-heat-wrap { width:100%;max-width:480px; }
        .sc-heat-lbl { display:flex;justify-content:space-between;font-size:0.58rem;color:#334155;font-family:monospace;margin-bottom:4px; }
        .sc-heat-track { height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;position:relative; }
        .sc-heat-fill { height:100%;border-radius:4px;transition:width 0.08s linear; }
        .sc-target-tick { position:absolute;top:0;height:100%;width:2px;background:white;opacity:0.6;box-shadow:0 0 4px white; }

        /* CPS en tiempo real */
        .sc-cps-display { font-family:var(--font-display);font-size:0.75rem;color:#475569;text-align:center;min-height:20px; }
        .sc-cps-display.fast { color:#f97316;animation:cpsPulse 0.3s ease; }
        .sc-cps-display.insane { color:#ef4444;animation:cpsPulse 0.2s ease; }
        @keyframes cpsPulse { 0%{transform:scale(1.3)} 100%{transform:scale(1)} }

        /* Feedback de click */
        .sc-click-feedback { position:absolute;pointer-events:none;font-family:var(--font-display);font-size:0.7rem;color:#f97316;animation:scFbFly 0.6s ease both;z-index:10; }
        @keyframes scFbFly { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-40px)} }
        `;
        document.head.appendChild(s);
    }

    init() {
        const modes = [
            { id:'mode-normal',   mc:'#f97316', icon:'fa-hammer',      name:'NORMAL', desc:'40 clics / 5 segundos' },
            { id:'mode-turbo',    mc:'#ef4444', icon:'fa-fire',        name:'TURBO',  desc:'60 clics / 5 segundos' },
            { id:'mode-blitz',    mc:'#a855f7', icon:'fa-bolt-lightning', name:'BLITZ', desc:'50 clics / 3 segundos' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">SPAM CLICK</div>
                <div style="font-size:0.65rem;color:#f97316;letter-spacing:3px;font-family:monospace;">SOBRECARGA EL NÚCLEO</div>
                <div style="width:120px;height:1px;background:#f97316;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:150px;min-height:150px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.78rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;letter-spacing:1px;text-align:center;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="btn-spam-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('mode-normal').onclick = () => this.start('NORMAL');
        document.getElementById('mode-turbo').onclick  = () => this.start('TURBO');
        document.getElementById('mode-blitz').onclick  = () => this.start('BLITZ');
        document.getElementById('btn-spam-back').onclick = () => { if(this.onQuit) this.onQuit(0); };
    }

    start(mode) {
        if(window.app.credits < 10){ try{window.app.showToast("FONDOS INSUFICIENTES","Costo: $10","danger");}catch(e){} return; }
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.mode = mode;
        this.targetClicks = mode==='TURBO'?60:mode==='BLITZ'?50:40;
        this.timeLeft     = mode==='BLITZ'?3.0:5.0;
        this.isPlaying = true; this.isEnding = false;
        this.score = 0; this.heatLevel = 0; this.comboStreak = 0; this.cpsHistory = [];
        try{this.audio.playBuy();}catch(e){}

        const modeColor = mode==='TURBO'?'#ef4444':mode==='BLITZ'?'#a855f7':'#f97316';
        const targetPct = mode==='TURBO'?90:mode==='BLITZ'?95:80;

        this.uiContainer.innerHTML = `
        <div class="sc-root">
            <!-- Stats -->
            <div class="sc-stats">
                <div class="sc-stat">
                    <div class="sc-stat-lbl">TIEMPO</div>
                    <div class="sc-stat-val" id="sc-timer" style="color:${modeColor};">${this.timeLeft.toFixed(2)}s</div>
                </div>
                <div class="sc-stat">
                    <div class="sc-stat-lbl">CLICS</div>
                    <div class="sc-stat-val" id="sc-count">0</div>
                </div>
                <div class="sc-stat">
                    <div class="sc-stat-lbl">META</div>
                    <div class="sc-stat-val" style="color:#334155;">${this.targetClicks}</div>
                </div>
            </div>

            <!-- Reactor -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:12px;flex:1;justify-content:center;">
                <div class="sc-reactor" id="sc-reactor" style="--sc-color:${modeColor};--sc-glow:${modeColor}30;">
                    <div class="sc-ring sc-ring-1"></div>
                    <div class="sc-ring sc-ring-2"></div>
                    <div class="sc-count" id="sc-big-count">0</div>
                    <div class="sc-label">PULSA</div>
                </div>
                <div class="sc-cps-display" id="sc-cps">CPS: —</div>
            </div>

            <!-- Barra de calor -->
            <div class="sc-heat-wrap">
                <div class="sc-heat-lbl">
                    <span>CALOR DEL NÚCLEO</span>
                    <span id="sc-heat-pct">0%</span>
                </div>
                <div class="sc-heat-track">
                    <div class="sc-target-tick" style="left:${targetPct}%;"></div>
                    <div class="sc-heat-fill" id="sc-heat-fill" style="width:0%;background:linear-gradient(90deg,#3b82f6,${modeColor});"></div>
                </div>
            </div>
        </div>`;

        const reactor = document.getElementById('sc-reactor');
        const handleClick = (e) => {
            if(!this.isPlaying||this.isEnding) return;
            if(e.cancelable) e.preventDefault();
            this.score++;
            this.lastClickTime = Date.now();
            this.cpsHistory.push(this.lastClickTime);
            // CPS: clics en último segundo
            const now = Date.now();
            this.cpsHistory = this.cpsHistory.filter(t=>now-t<=1000);
            const cps = this.cpsHistory.length;

            // Actualizar contadores
            const countEl = document.getElementById('sc-big-count');
            const countEl2 = document.getElementById('sc-count');
            if(countEl) countEl.innerText = this.score;
            if(countEl2) countEl2.innerText = this.score;

            // Calor
            this.heatLevel = Math.min(100,(this.score/this.targetClicks)*100);
            const fillEl = document.getElementById('sc-heat-fill');
            const pctEl  = document.getElementById('sc-heat-pct');
            if(fillEl) fillEl.style.width = this.heatLevel+'%';
            if(pctEl)  pctEl.innerText = Math.round(this.heatLevel)+'%';

            // CPS display
            const cpsEl = document.getElementById('sc-cps');
            if(cpsEl){
                cpsEl.textContent = `CPS: ${cps}`;
                cpsEl.className = 'sc-cps-display'+(cps>=12?' insane':cps>=8?' fast':'');
            }

            // Calor visual del reactor
            if(this.heatLevel>70) reactor.classList.add('hot');

            // Feedback flotante
            const fb = document.createElement('div');
            fb.className = 'sc-click-feedback';
            fb.textContent = cps>=10?'+2!':'+1';
            fb.style.cssText = `left:${40+Math.random()*20}%;top:${30+Math.random()*20}%;`;
            reactor.appendChild(fb);
            setTimeout(()=>fb.remove(),600);

            // Animación del botón
            reactor.style.transform = `scale(0.92) translate(${Math.random()*6-3}px,${Math.random()*6-3}px)`;
            setTimeout(()=>{ reactor.style.transform='scale(1)'; },60);

            // Audio tonal
            try{this.audio.playTone(180+(this.score*8),'square',0.04);}catch(e){}
        };

        reactor.addEventListener('mousedown', handleClick);
        reactor.addEventListener('touchstart', handleClick, {passive:false});

        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(()=>{
            if(this.isEnding) return;
            this.timeLeft = Math.max(0, this.timeLeft - 0.05);
            const el = document.getElementById('sc-timer');
            if(el){
                el.innerText = this.timeLeft.toFixed(2)+'s';
                if(this.timeLeft<1.5) el.style.color='#ef4444';
            }
            if(this.timeLeft<=0) this.endRun();
        },50);
    }

    endRun() {
        if(this.isEnding) return;
        this.isEnding = true; this.isPlaying = false;
        if(this.timerInterval) clearInterval(this.timerInterval);
        const passed = this.score >= this.targetClicks;
        const reactor = document.getElementById('sc-reactor');
        if(reactor){
            reactor.innerHTML = passed
                ? `<i class="fa-solid fa-check" style="font-size:4rem;color:#10b981;"></i><div style="font-size:0.7rem;color:#10b981;margin-top:8px;font-family:var(--font-display);letter-spacing:2px;">SUPERADO</div>`
                : `<i class="fa-solid fa-xmark" style="font-size:4rem;color:#ef4444;"></i><div style="font-size:0.7rem;color:#ef4444;margin-top:8px;font-family:var(--font-display);letter-spacing:2px;">INSUFICIENTE</div>`;
            reactor.classList.add(passed?'win':'lose');
        }
        if(passed){
            try{this.audio.playWin(3);}catch(e){}
            const bonus = Math.max(0,(this.score-this.targetClicks)*2);
            const prize = (this.mode==='TURBO'?100:this.mode==='BLITZ'?80:30)+bonus;
            window.app.credits+=prize;
            try{window.app.showToast('NÚCLEO SOBRECARGADO',`+${prize} CR`,'success');}catch(e){}
            if(this.canvas) try{this.canvas.explode(window.innerWidth/2,window.innerHeight/2,'#f97316');}catch(e){}
        } else {
            try{this.audio.playLose();}catch(e){}
            try{window.app.showToast('FALLO DE PRESIÓN','Clics insuficientes','danger');}catch(e){}
        }
        document.getElementById('val-credits').innerText = window.app.credits;
        setTimeout(()=>{ if(this.onQuit) this.onQuit(this.score); },1400);
    }

    pause() {
        if(this.isPaused || !this.timerInterval) return;
        this.isPaused = true;
        this.pausedTimeLeft = this.timeLeft;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    resume() {
        if(!this.isPaused) return;
        this.isPaused = false;
        // Reanudar el timer con el tiempo restante
        const fill = document.getElementById('sc-timer-fill');
        const startTime = Date.now();
        const duration = this.pausedTimeLeft * 1000;
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            this.timeLeft = this.pausedTimeLeft - elapsed/1000;
            if(fill) fill.style.width = Math.max(0,(this.timeLeft/this.totalTime)*100)+'%';
            if(this.timeLeft <= 0) this.finish();
        }, 50);
    }
}

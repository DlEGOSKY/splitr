import { CONFIG } from '../config.js';
import { resolveText } from '../utils.js';

// Datos de países extintos con banderas reales
const EXTINCT = [
    { id:'SUN', name:'Unión Soviética',      flag:'https://flagcdn.com/w160/su.png',  align:'Pacto de Varsovia',  era:'1922–1991' },
    { id:'YUG', name:'Yugoslavia',           flag:'https://flagcdn.com/w160/yu.png',  align:'No Alineados',       era:'1943–1992' },
    { id:'DDR', name:'Alemania Oriental',    flag:'https://upload.wikimedia.org/wikipedia/commons/a/a1/Flag_of_East_Germany.svg', align:'Pacto de Varsovia', era:'1949–1990' },
    { id:'CSK', name:'Checoslovaquia',       flag:'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flag_of_Czechoslovakia.svg', align:'Pacto de Varsovia', era:'1918–1993' },
    { id:'UAR', name:'Rep. Árabe Unida',     flag:'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_the_United_Arab_Republic.svg', align:'No Alineados', era:'1958–1961' },
    { id:'VDR', name:'Vietnam del Norte',    flag:'https://flagcdn.com/w160/vn.png',  align:'Pacto de Varsovia',  era:'1945–1976' },
    { id:'PRK', name:'Korea del Sur (antigua)',flag:'https://flagcdn.com/w160/kr.png', align:'OTAN/Occidente',   era:'1948–1987' },
    { id:'RHO', name:'Rhodesia',             flag:'https://upload.wikimedia.org/wikipedia/commons/3/3d/Flag_of_Rhodesia_%281968%E2%80%931979%29.svg', align:'No Alineados', era:'1965–1979' },
];

export class GeoNetGame {
    constructor(canvas, audio, onQuit) {
        this.audio = audio;
        this.onQuit = onQuit;
        this.countryMap = new Map();
        this.score = 0;
        this.lives = 3;
        this.isRunning = false;
        this.isProcessing = false;
        this.currentQuestion = null;
        this.currentCheckFn = () => false;
        this.timer = null;
        this.mode = 'NORMAL';
        this.currentCountry = null;
        this.isOverclocked = false;
        this.currentBlur = 20;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('geo-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'geo-styles-v2';
        s.innerHTML = `
        .geo-root { display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:calc(100vh - 56px);padding:14px 20px;width:100%;box-sizing:border-box;gap:10px; }
        .geo-hud { display:flex;gap:8px;width:100%;max-width:640px; }
        .geo-stat { flex:1;background:rgba(10,16,30,0.85);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:7px 12px;display:flex;flex-direction:column;gap:2px; }
        .geo-stat-lbl { font-size:0.52rem;color:#334155;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .geo-stat-val { font-family:var(--font-display);font-size:0.9rem;color:white; }
        .geo-lives { display:flex;gap:4px;align-items:center; }
        .geo-life { font-size:0.8rem;color:#ef4444;transition:all 0.2s; }
        .geo-life.lost { color:#334155;transform:scale(0.7); }

        /* Timer bar */
        .geo-timer-track { width:100%;max-width:640px;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;flex-shrink:0; }
        .geo-timer-fill { height:100%;border-radius:2px;transition:width 0.1s linear; background:var(--primary); }

        /* Pantalla de pregunta */
        .geo-card { width:100%;max-width:640px;background:rgba(8,14,26,0.9);border:1.5px solid;border-radius:18px;display:flex;align-items:center;justify-content:center;flex:1;position:relative;overflow:hidden; }
        .geo-card::after { content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01) 1px,transparent 1px,transparent 4px);pointer-events:none; }
        .geo-display { font-family:var(--font-display);color:var(--primary);text-align:center;line-height:1;letter-spacing:4px;text-shadow:0 0 30px currentColor;padding:16px; }
        .geo-display.size-xl { font-size:5rem; }
        .geo-display.size-lg { font-size:3.5rem; }
        .geo-display.size-md { font-size:2.5rem; }

        /* Opciones */
        .geo-options { display:grid;gap:10px;width:100%;max-width:640px;grid-template-columns:1fr 1fr; }
        .geo-btn { background:rgba(10,16,30,0.8);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;padding:14px 10px;border-radius:12px;cursor:pointer;font-family:var(--font-display);font-size:0.78rem;letter-spacing:0.5px;transition:all 0.1s;display:flex;align-items:center;justify-content:center;gap:8px; }
        .geo-btn:hover { background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.25);transform:translateY(-2px); }
        .geo-btn.correct { background:rgba(16,185,129,0.25)!important;border-color:#10b981!important;color:#10b981!important;font-weight:bold; }
        .geo-btn.wrong   { background:rgba(239,68,68,0.25)!important; border-color:#ef4444!important;animation:geoShake 0.35s both; }
        @keyframes geoShake { 10%,90%{transform:translateX(-2px)} 30%,70%{transform:translateX(3px)} 50%{transform:translateX(-5px)} }

        /* Bandera GHOST */
        .geo-flag-wrap { width:100%;max-width:540px;height:200px;display:flex;align-items:center;justify-content:center;background:#000;border:1.5px solid #334155;border-radius:14px;overflow:hidden;position:relative; }
        .geo-flag-img { max-width:90%;max-height:85%;transition:filter 0.5s ease; }
        .geo-enhance-btn { font-size:0.7rem;font-family:monospace;letter-spacing:1.5px;padding:7px 16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:8px;cursor:pointer;transition:all 0.15s; }
        .geo-enhance-btn:hover { background:rgba(239,68,68,0.2);border-color:#ef4444; }

        /* Terminal input */
        .geo-terminal-input { background:rgba(0,0,0,0.8);border:1.5px solid var(--primary);color:var(--primary);font-family:monospace;font-size:1.2rem;padding:14px 20px;width:100%;max-width:480px;text-align:center;text-transform:uppercase;outline:none;border-radius:10px;box-shadow:0 0 20px rgba(59,130,246,0.15),inset 0 0 15px rgba(59,130,246,0.05);letter-spacing:2px; }

        /* Modo INTEL — flags pequeñas */
        .geo-intel-flag { font-size:2.5rem;margin-right:4px; }

        /* War mode — 3 opciones */
        .geo-options.cols-3 { grid-template-columns:1fr 1fr 1fr; }
        `;
        document.head.appendChild(s);
    }

    async init() {
        this.uiContainer.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;">
                <div style="font-size:2.5rem;color:var(--primary);filter:drop-shadow(0 0 10px var(--primary));">
                    <i class="fa-solid fa-globe fa-spin"></i>
                </div>
                <div style="font-family:monospace;color:#475569;font-size:0.75rem;letter-spacing:3px;">SINCRONIZANDO DATOS GEOPOLÍTICOS...</div>
            </div>`;
        try {
            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,borders,capital,flags,region,population');
            const data = await res.json();
            data.forEach(c => { if(c.cca2) this.countryMap.set(c.cca2, c); });
        } catch(e) {
            console.error('GeoNet data error', e);
        }
        this.showMenu();
    }

    showMenu() {
        this.isRunning = false;
        const modes = [
            { id:'m-normal',   mc:'#3b82f6', icon:'fa-earth-americas',          name:'NORMAL',    desc:'Adivina el país por su código' },
            { id:'m-intel',    mc:'#06b6d4', icon:'fa-building-columns',        name:'CAPITALES', desc:'Dado el país, elige su capital' },
            { id:'m-frontier', mc:'#f97316', icon:'fa-map-location-dot',        name:'FRONTERA',  desc:'¿Con qué países comparte borde?' },
            { id:'m-war',      mc:'#fbbf24', icon:'fa-person-military-to-person',name:'GUERRA FRÍA',desc:'¿OTAN, Varsovia o Neutral?' },
            { id:'m-ghost',    mc:'#ef4444', icon:'fa-ghost',                   name:'FANTASMAS', desc:'Repúblicas extintas — desglitchea la bandera' },
            { id:'m-terminal', mc:'#10b981', icon:'fa-terminal',                name:'TERMINAL',  desc:'Escribe el nombre del país desde su código ISO' },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:24px;width:100%;padding:16px;box-sizing:border-box;">
            <div style="text-align:center;">
                <div id="geo-title" style="font-family:var(--font-display);font-size:2.2rem;letter-spacing:8px;color:var(--primary);text-shadow:0 0 20px var(--primary);margin-bottom:4px;">GEO-NET</div>
                <div style="font-size:0.62rem;color:#334155;font-family:monospace;letter-spacing:3px;">SELECCIONA PROTOCOLO DE ENLACE</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:640px;">
                ${modes.map(m=>`
                <div style="background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all 0.15s;padding:16px 10px;position:relative;overflow:hidden;min-height:130px;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.6rem;color:${m.mc};filter:drop-shadow(0 0 6px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.72rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.58rem;color:#475569;font-family:monospace;text-align:center;line-height:1.4;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <div style="display:flex;gap:12px;align-items:center;">
                <button id="btn-overclock" style="font-size:0.62rem;font-family:monospace;letter-spacing:2px;padding:6px 14px;background:${this.isOverclocked?'rgba(251,191,36,0.2)':'rgba(255,255,255,0.04)'};border:1px solid ${this.isOverclocked?'rgba(251,191,36,0.5)':'rgba(255,255,255,0.1)'};color:${this.isOverclocked?'#fbbf24':'#475569'};border-radius:6px;cursor:pointer;transition:all 0.15s;">
                    <i class="fa-solid fa-bolt"></i> OVERCLOCK: ${this.isOverclocked?'ON':'OFF'}
                </button>
                <button class="btn btn-secondary" onclick="window.app.game?.onQuit(0)" style="font-size:0.72rem;">
                    <i class="fa-solid fa-arrow-left"></i> DESCONECTAR
                </button>
            </div>
        </div>`;

        try{ resolveText(document.getElementById('geo-title'), 'GEO-NET'); }catch(e){}
        document.getElementById('m-normal').onclick   = () => this.startSession('NORMAL');
        document.getElementById('m-intel').onclick    = () => this.startSession('INTEL');
        document.getElementById('m-frontier').onclick = () => this.startSession('FRONTERA');
        document.getElementById('m-war').onclick      = () => this.startSession('WAR');
        document.getElementById('m-ghost').onclick    = () => this.startSession('GHOST');
        document.getElementById('m-terminal').onclick = () => this.startSession('TERMINAL');
        document.getElementById('btn-overclock').onclick = () => {
            this.isOverclocked = !this.isOverclocked;
            try{ this.audio.playTone(this.isOverclocked?800:400,'square',0.1); }catch(e){}
            this.showMenu();
        };
    }

    startSession(mode) {
        this.mode = mode; this.score = 0; this.lives = 3;
        this.isRunning = true; this.currentCountry = null;
        this.nextQuestion();
    }

    nextQuestion() {
        if(!this.isRunning) return;
        this.isProcessing = false;
        this.currentBlur = 22;
        const all = Array.from(this.countryMap.values());

        if(this.mode === 'TERMINAL') {
            this.currentQuestion = all[Math.floor(Math.random()*all.length)];
            this.renderTerminal();
        } else if(this.mode === 'GHOST') {
            this.currentQuestion = EXTINCT[Math.floor(Math.random()*EXTINCT.length)];
            this.currentCheckFn = btn => btn.dataset.id === this.currentQuestion.id;
            this.renderGhost();
        } else if(this.mode === 'WAR') {
            // Mix países extintos + modernos reales
            const warPool = [...EXTINCT, ...all.filter(c=>c.region).slice(0,20)];
            this.currentQuestion = warPool[Math.floor(Math.random()*warPool.length)];
            // Para países modernos asignar alignment según región
            if(!this.currentQuestion.align){
                const region = this.currentQuestion.region || '';
                if(region==='Europe'||region==='Americas') this.currentQuestion.align='OTAN/Occidente';
                else if(['Russia','China','Cuba'].includes(this.currentQuestion.name?.common)) this.currentQuestion.align='Pacto de Varsovia';
                else this.currentQuestion.align='No Alineados';
            }
            this.currentCheckFn = btn => btn.dataset.val === this.currentQuestion.align;
            this.renderWar();
        } else if(this.mode === 'FRONTERA') {
            // Elegir país con fronteras
            const withBorders = all.filter(c => c.borders && c.borders.length > 0);
            if(!this.currentCountry) this.currentCountry = withBorders[Math.floor(Math.random()*withBorders.length)];
            const neighbors = (this.currentCountry.borders||[]).map(id=>this.countryMap.get(id)).filter(Boolean);
            if(neighbors.length === 0){ this.currentCountry = null; this.nextQuestion(); return; }
            this.currentQuestion = neighbors[Math.floor(Math.random()*neighbors.length)];
            // FIX: verificar que el botón elegido ES el vecino correcto (no cualquier vecino)
            const correctId = this.currentQuestion.cca2;
            this.currentCheckFn = btn => btn.dataset.id === correctId;
            // Distractores: países que NO son vecinos del país central
            const nonNeighbors = all.filter(c => 
                c.cca2 !== correctId && 
                c.cca2 !== this.currentCountry.cca2 &&
                !(this.currentCountry.borders||[]).includes(c.cca2)
            );
            const distractors = nonNeighbors.sort(()=>Math.random()-0.5).slice(0, 3);
            this.renderFrontera([this.currentQuestion, ...distractors]);
        } else if(this.mode === 'INTEL') {
            this.currentQuestion = all.filter(c=>c.capital&&c.capital.length>0)[Math.floor(Math.random()*all.filter(c=>c.capital&&c.capital.length>0).length)];
            if(!this.currentQuestion){ this.nextQuestion(); return; }
            this.currentCheckFn = btn => btn.dataset.id === this.currentQuestion.cca2;
            const opts = [this.currentQuestion, ...this.getRandom(all,3,this.currentQuestion.cca2)];
            this.renderIntel(opts);
        } else { // NORMAL
            this.currentQuestion = all[Math.floor(Math.random()*all.length)];
            this.currentCheckFn = btn => btn.dataset.id === this.currentQuestion.cca2;
            const opts = [this.currentQuestion, ...this.getRandom(all,3,this.currentQuestion.cca2)];
            this.renderNormal(opts);
        }
    }

    renderHUD() {
        return `
        <div class="geo-hud">
            <div class="geo-stat"><div class="geo-stat-lbl">SCORE</div><div class="geo-stat-val" id="geo-score">${this.score}</div></div>
            <div class="geo-stat"><div class="geo-stat-lbl">MODO</div><div class="geo-stat-val" style="font-size:0.7rem;color:#475569;">${this.mode}${this.isOverclocked?' ⚡':''}</div></div>
            <div class="geo-stat"><div class="geo-stat-lbl">VIDAS</div>
                <div class="geo-lives">${'<i class="fa-solid fa-heart geo-life"></i>'.repeat(this.lives)}${'<i class="fa-solid fa-heart geo-life lost"></i>'.repeat(3-this.lives)}</div>
            </div>
        </div>
        <div class="geo-timer-track"><div class="geo-timer-fill" id="geo-timer-fill" style="width:100%;"></div></div>`;
    }

    renderNormal(opts) {
        opts.sort(()=>Math.random()-0.5);
        const code = this.currentQuestion.cca2 || '??';
        const sizeClass = code.length <= 2 ? 'size-xl' : 'size-lg';
        this.uiContainer.innerHTML = `
        <div class="geo-root">
            ${this.renderHUD()}
            <div class="geo-card" style="border-color:rgba(59,130,246,0.3);">
                <div class="geo-display ${sizeClass}" style="color:#00cfff;">${code}</div>
            </div>
            <div class="geo-options">${opts.map(o=>`<button class="geo-btn" data-id="${o.cca2}">${o.name.common}</button>`).join('')}</div>
        </div>`;
        this.startTimer(this.isOverclocked?3.5:2);
        this.bindEvents();
    }

    renderIntel(opts) {
        opts.sort(()=>Math.random()-0.5);
        const capital = this.currentQuestion.capital?.[0] || '???';
        const nameLen = capital.length;
        const sizeClass = nameLen > 15 ? 'size-md' : nameLen > 9 ? 'size-lg' : 'size-xl';
        // Opciones muestran nombre del país + bandera emoji aproximada
        this.uiContainer.innerHTML = `
        <div class="geo-root">
            ${this.renderHUD()}
            <div class="geo-card" style="border-color:rgba(6,182,212,0.3);">
                <div style="text-align:center;">
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;letter-spacing:3px;margin-bottom:10px;">CAPITAL IDENTIFICADA:</div>
                    <div class="geo-display ${sizeClass}" style="color:#06b6d4;">${capital}</div>
                </div>
            </div>
            <div class="geo-options">${opts.map(o=>`<button class="geo-btn" data-id="${o.cca2}">${o.name.common}</button>`).join('')}</div>
        </div>`;
        this.startTimer(this.isOverclocked?3.5:2);
        this.bindEvents();
    }

    renderFrontera(opts) {
        opts.sort(()=>Math.random()-0.5);
        const centerName = this.currentCountry.name.common;
        this.uiContainer.innerHTML = `
        <div class="geo-root">
            ${this.renderHUD()}
            <div class="geo-card" style="border-color:rgba(249,115,22,0.3);">
                <div style="text-align:center;padding:16px;">
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;letter-spacing:3px;margin-bottom:8px;">PAÍS CENTRAL:</div>
                    <div class="geo-display size-lg" style="color:#f97316;">${centerName}</div>
                    <div style="font-size:0.62rem;color:#334155;font-family:monospace;margin-top:8px;">¿Cuál comparte frontera?</div>
                </div>
            </div>
            <div class="geo-options">${opts.map(o=>`<button class="geo-btn" data-id="${o.cca2}">${o.name.common}</button>`).join('')}</div>
        </div>`;
        this.startTimer(this.isOverclocked?3.5:2);
        this.bindEvents();
    }

    renderGhost() {
        const opts = [this.currentQuestion, ...this.getRandom(EXTINCT,3,this.currentQuestion.id)].sort(()=>0.5-Math.random());
        this.uiContainer.innerHTML = `
        <div class="geo-root">
            ${this.renderHUD()}
            <div style="width:100%;max-width:640px;display:flex;flex-direction:column;align-items:center;gap:8px;">
                <div style="font-size:0.6rem;color:#ef4444;font-family:monospace;letter-spacing:3px;">SEÑAL CORROMPIDA — DESGLITCHEA LA BANDERA</div>
                <div class="geo-flag-wrap">
                    <img src="${this.currentQuestion.flag}" class="geo-flag-img" id="geo-flag" style="filter:blur(${this.currentBlur}px) contrast(180%);" onerror="this.style.display='none';">
                </div>
                <button class="geo-enhance-btn" id="btn-enhance">
                    <i class="fa-solid fa-magnifying-glass"></i> MEJORAR SEÑAL (${Math.ceil(this.currentBlur/5)} créditos de blur)
                </button>
            </div>
            <div class="geo-options">${opts.map(o=>`<button class="geo-btn" data-id="${o.id}">${o.name} <span style="font-size:0.62rem;color:#475569;">${o.era}</span></button>`).join('')}</div>
        </div>`;
        document.getElementById('btn-enhance').onclick = () => {
            this.currentBlur = Math.max(0, this.currentBlur - 5);
            const f = document.getElementById('geo-flag');
            if(f) f.style.filter = `blur(${this.currentBlur}px) contrast(180%)`;
            const btn = document.getElementById('btn-enhance');
            if(btn) btn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> MEJORAR SEÑAL (${Math.max(0,Math.ceil(this.currentBlur/5))} créditos de blur)`;
        };
        this.bindEvents();
        this.startTimer(this.isOverclocked?2.5:1.5);
    }

    renderWar() {
        const name = this.currentQuestion.name?.common || this.currentQuestion.name;
        this.uiContainer.innerHTML = `
        <div class="geo-root">
            ${this.renderHUD()}
            <div class="geo-card" style="border-color:rgba(251,191,36,0.3);">
                <div style="text-align:center;padding:16px;">
                    <div style="font-size:0.6rem;color:#fbbf24;font-family:monospace;letter-spacing:3px;margin-bottom:8px;">GUERRA FRÍA — CLASIFICA EL PAÍS:</div>
                    <div class="geo-display ${name.length>15?'size-md':'size-lg'}" style="color:#fbbf24;">${name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;margin-top:8px;">¿A qué bando pertenecía ca. 1960?</div>
                </div>
            </div>
            <div class="geo-options cols-3">
                <button class="geo-btn" data-val="OTAN/Occidente" style="border-color:rgba(59,130,246,0.3);"><i class="fa-solid fa-shield" style="color:#3b82f6;"></i> OTAN</button>
                <button class="geo-btn" data-val="Pacto de Varsovia" style="border-color:rgba(239,68,68,0.3);"><i class="fa-solid fa-star" style="color:#ef4444;"></i> VARSOVIA</button>
                <button class="geo-btn" data-val="No Alineados" style="border-color:rgba(148,163,184,0.3);"><i class="fa-solid fa-scale-balanced" style="color:#94a3b8;"></i> NEUTRAL</button>
            </div>
        </div>`;
        this.bindEvents();
        this.startTimer(this.isOverclocked?3.5:2);
    }

    renderTerminal() {
        const code = this.currentQuestion.cca2 || '??';
        this.uiContainer.innerHTML = `
        <div class="geo-root">
            ${this.renderHUD()}
            <div class="geo-card" style="border-color:rgba(16,185,129,0.3);">
                <div style="text-align:center;">
                    <div style="font-size:0.6rem;color:#10b981;font-family:monospace;letter-spacing:3px;margin-bottom:10px;">CÓDIGO ISO — IDENTIFICA EL PAÍS:</div>
                    <div class="geo-display size-xl" style="color:#10b981;">${code}</div>
                    <div style="font-size:0.6rem;color:#334155;font-family:monospace;margin-top:8px;">TECLEA EL NOMBRE EN INGLÉS O ESPAÑOL</div>
                </div>
            </div>
            <input type="text" class="geo-terminal-input" id="geo-input" autofocus autocomplete="off" spellcheck="false"
                   placeholder="Escribe el nombre del país...">
        </div>`;
        const input = document.getElementById('geo-input');
        if(input){
            input.focus();
            input.onkeydown = e => {
                if(e.key === 'Enter'){
                    const val = input.value.trim().toLowerCase();
                    const correct = this.currentQuestion.name.common.toLowerCase();
                    const correctEs = (this.currentQuestion.translations?.spa?.common||'').toLowerCase();
                    const dist = Math.min(this.getLevenshtein(val,correct), correctEs?this.getLevenshtein(val,correctEs):99);
                    this.handleAnswer(input, dist <= 2);
                }
            };
        }
        this.startTimer(this.isOverclocked?2.5:1.5);
    }

    bindEvents() {
        document.querySelectorAll('.geo-btn').forEach(btn => {
            btn.onclick = () => this.handleAnswer(btn, this.currentCheckFn(btn));
        });
    }

    handleAnswer(element, isCorrect) {
        if(this.isProcessing || !this.isRunning) return;
        this.isProcessing = true;
        if(this.timer) clearInterval(this.timer);

        if(isCorrect){
            if(element?.classList) element.classList.add('correct');
            this.score += this.isOverclocked ? 20 : 10;
            const s = document.getElementById('geo-score'); if(s) s.innerText = this.score;
            try{ this.audio.playWin(1); }catch(e){}
            // En FRONTERA avanzar al siguiente país vecino
            if(this.mode === 'FRONTERA' && element?.dataset?.id){
                this.currentCountry = this.countryMap.get(element.dataset.id) || this.currentCountry;
            }
            setTimeout(() => this.nextQuestion(), 700);
        } else {
            this.takeDamage(element);
        }
    }

    takeDamage(element) {
        if(!this.isRunning) return;
        this.lives--;
        if(element?.classList) element.classList.add('wrong');
        try{ this.audio.playLose(); }catch(e){}
        // Mostrar respuesta correcta
        document.querySelectorAll('.geo-btn').forEach(btn => {
            if(this.currentCheckFn(btn)) btn.classList.add('correct');
        });
        // Actualizar corazones
        const heartsEls = document.querySelectorAll('.geo-life');
        heartsEls.forEach((h,i) => { if(i >= this.lives) h.classList.add('lost'); });
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 350);
        if(this.lives <= 0) setTimeout(() => this.gameOver(), 900);
        else setTimeout(() => this.nextQuestion(), 1100);
    }

    startTimer(speed) {
        if(this.timer) clearInterval(this.timer);
        let pct = 100;
        const fill = document.getElementById('geo-timer-fill');
        this.timer = setInterval(() => {
            pct -= speed;
            if(fill){ fill.style.width = Math.max(0,pct)+'%'; if(pct<30)fill.style.background='#ef4444'; else if(pct<60)fill.style.background='#f97316'; else fill.style.background='var(--primary)'; }
            if(pct <= 0){ clearInterval(this.timer); this.takeDamage(null); }
        }, 100);
    }

    getLevenshtein(a,b) {
        const m=Array.from({length:b.length+1},(_,i)=>[i]);
        for(let j=1;j<=a.length;j++)m[0][j]=j;
        for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)
            m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:Math.min(m[i-1][j-1]+1,m[i][j-1]+1,m[i-1][j]+1);
        return m[b.length][a.length];
    }

    getRandom(arr, count, excludeArr) {
        const ex = Array.isArray(excludeArr) ? excludeArr : [excludeArr];
        return arr.filter(i=>(i.cca2||i.id)&&!ex.includes(i.cca2||i.id)).sort(()=>0.5-Math.random()).slice(0,count);
    }

    gameOver() {
        if(!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timer);
        this.onQuit(this.score);
    }
    pause() {
        this._paused = true;
        this.isRunning = false;
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        this.isRunning = true;
    }
}

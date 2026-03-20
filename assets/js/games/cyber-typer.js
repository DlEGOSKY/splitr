import { CONFIG } from '../config.js';

const WORD_BANKS = {
    hacking: ["SYSTEM","HACK","ROOT","ADMIN","ACCESS","PROXY","SERVER","NODE","BREACH","VIRUS","WORM","TROJAN","FIREWALL","ENCRYPT","MALWARE","KERNEL","SHELL","SUDO","BASH","EXPLOIT","PAYLOAD","BYPASS","INJECT","TOKEN","CIPHER","RANSOM","BOTNET","SPOOF","PHISH","DDOS"],
    code:    ["FUNCTION","VARIABLE","ARRAY","OBJECT","CLASS","IMPORT","EXPORT","RETURN","ASYNC","AWAIT","PROMISE","CALLBACK","CLOSURE","ITERATOR","PROTOTYPE","BOOLEAN","INTEGER","STRING","POINTER","MEMORY"],
    network: ["ROUTER","SWITCH","PACKET","LATENCY","BANDWIDTH","PROTOCOL","SOCKET","GATEWAY","SUBNET","FIREWALL","PROXY","TUNNEL","CIPHER","HASH","SSL","TLS","VPN","DNS","API","TCP"],
    hard:    ["CRYPTOCURRENCY","VULNERABILITY","AUTHENTICATION","INFRASTRUCTURE","DECRYPTION","PENETRATION","ADMINISTRATOR","INITIALIZATION","CONFIGURATION","POLYMORPHISM"],
};

export class CyberTyperGame {
    constructor(canvas, audio, onGameOver) {
        this.audio = audio;
        this.onGameOver = onGameOver;
        this.activeWords = [];
        this.score = 0; this.level = 1; this.lives = 3; this.combo = 0;
        this.spawnRate = 2000; this.fallSpeed = 0.5;
        this.lastSpawn = 0; this.lastTime = 0;
        this.inputBuffer = '';
        this.isRunning = false;
        this.gameLoopId = null;
        this.mode = 'STANDARD';
        this.wordBank = [];
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('typer-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'typer-styles-v2';
        s.innerHTML = `
        .ct2-root { position:absolute;inset:0;overflow:hidden; }
        .ct2-word { position:absolute;font-family:'Courier New',monospace;font-weight:bold;font-size:1.1rem;text-shadow:0 0 8px currentColor;white-space:nowrap;transform:translateX(-50%);padding:3px 8px;background:rgba(0,0,0,0.55);border-radius:4px;border:1px solid currentColor;border-opacity:0.3;transition:color 0.1s; }
        .ct2-word.matched { color:#fff !important; text-shadow:0 0 15px white !important; transform:translateX(-50%) scale(1.05); }
        .ct2-word .ct2-typed { color:#fff; text-shadow:0 0 8px #fff; }
        .ct2-word .ct2-remain { color:currentColor; opacity:0.9; }

        /* Input display */
        .ct2-input-zone { position:absolute;bottom:0;left:0;right:0;height:90px;background:linear-gradient(to top,rgba(0,0,0,0.85),transparent);display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px;pointer-events:none; }
        .ct2-input-display { font-family:'Courier New',monospace;font-size:2rem;text-shadow:0 0 12px currentColor;display:flex;align-items:center;gap:2px; }
        .ct2-cursor { display:inline-block;width:2px;height:1.8rem;background:currentColor;margin-left:3px;animation:ct2Blink 0.8s step-end infinite; }
        @keyframes ct2Blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* Línea de peligro */
        .ct2-danger-line { position:absolute;bottom:90px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(239,68,68,0.4),transparent);pointer-events:none; }
        .ct2-danger-line::after { content:'ZONA CRÍTICA';position:absolute;right:10px;top:-10px;font-size:0.55rem;color:rgba(239,68,68,0.5);font-family:monospace;letter-spacing:2px; }

        /* HUD */
        .ct2-hud { position:absolute;top:16px;left:0;right:0;display:flex;justify-content:center;gap:12px;pointer-events:none;z-index:10; }
        .ct2-hud-cell { background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:5px 14px;display:flex;flex-direction:column;align-items:center;gap:1px; }
        .ct2-hud-lbl { font-size:0.52rem;color:#475569;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .ct2-hud-val { font-family:var(--font-display);font-size:0.9rem;color:white; }

        /* Combo popup */
        .ct2-combo-pop { position:absolute;pointer-events:none;font-family:var(--font-display);font-size:1rem;font-weight:bold;color:#fbbf24;text-shadow:0 0 10px #fbbf24;animation:ct2ComboFly 0.6s ease both;z-index:20; }
        @keyframes ct2ComboFly { from{opacity:1;transform:translateY(0) scale(1.2)} to{opacity:0;transform:translateY(-40px) scale(0.8)} }

        /* Explosion word */
        @keyframes ct2WordExplode { to{opacity:0;transform:translateX(-50%) scale(2);} }
        .ct2-word.exploding { animation:ct2WordExplode 0.25s ease forwards; }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 20){
            try{ window.app.showToast("FONDOS INSUFICIENTES","Costo: $20","danger"); }catch(e){}
            if(this.onGameOver) this.onGameOver(); return;
        }

        const modes = [
            { id:'ct-std',   mc:'#00ff41', icon:'fa-terminal',      name:'ESTÁNDAR',  desc:'Palabras de hacking cayendo' },
            { id:'ct-code',  mc:'#3b82f6', icon:'fa-code',          name:'CÓDIGO',    desc:'Términos de programación' },
            { id:'ct-blitz', mc:'#ef4444', icon:'fa-fire',          name:'BLITZ',     desc:'Velocidad extrema · palabras cortas' },
            { id:'ct-boss',  mc:'#fbbf24', icon:'fa-skull',         name:'BOSS MODE', desc:'Palabras largas · 1 vida' },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;background:rgba(0,8,0,0.6);">
            <div style="text-align:center;">
                <div style="font-family:'Courier New',monospace;font-size:1.6rem;color:#00ff41;letter-spacing:4px;text-shadow:0 0 20px #00ff41;margin-bottom:4px;">CYBER TYPER</div>
                <div style="font-size:0.65rem;color:#00aa33;letter-spacing:3px;font-family:monospace;">SELECCIONA PROTOCOLO</div>
                <div style="width:120px;height:1px;background:#00ff41;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:520px;width:100%;padding:0 10px;">
                ${modes.map(m=>`
                <div style="background:rgba(0,10,0,0.85);border:1px solid ${m.mc}20;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;min-height:130px;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.6)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}20';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.5rem;color:${m.mc};filter:drop-shadow(0 0 6px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.72rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.58rem;color:#1a3a1a;font-family:monospace;text-align:center;line-height:1.4;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="ct-back" style="width:180px;border-color:#1a3a1a;color:#334155;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;

        document.getElementById('ct-std').onclick   = () => this.payAndStart('STANDARD');
        document.getElementById('ct-code').onclick  = () => this.payAndStart('CODE');
        document.getElementById('ct-blitz').onclick = () => this.payAndStart('BLITZ');
        document.getElementById('ct-boss').onclick  = () => this.payAndStart('BOSS');
        document.getElementById('ct-back').onclick  = () => { if(this.onGameOver) this.onGameOver(); };
    }

    payAndStart(mode) {
        window.app.credits -= 20;
        document.getElementById('val-credits').innerText = window.app.credits;
        try{ this.audio.playBuy(); }catch(e){}
        this.mode = mode;
        // Seleccionar banco de palabras
        if(mode === 'CODE')   this.wordBank = [...WORD_BANKS.code, ...WORD_BANKS.network];
        else if(mode === 'BOSS') this.wordBank = [...WORD_BANKS.hard, ...WORD_BANKS.hacking.filter(w=>w.length>6)];
        else if(mode === 'BLITZ') this.wordBank = WORD_BANKS.hacking.filter(w=>w.length<=5);
        else this.wordBank = [...WORD_BANKS.hacking, ...WORD_BANKS.network];
        this.start();
    }

    getWordColor() {
        const colors = {
            STANDARD: ['#00ff41','#00cc33','#88ff88'],
            CODE:     ['#3b82f6','#60a5fa','#93c5fd'],
            BLITZ:    ['#ef4444','#f97316','#fbbf24'],
            BOSS:     ['#fbbf24','#a855f7','#ef4444'],
        };
        const pool = colors[this.mode] || colors.STANDARD;
        return pool[Math.floor(Math.random()*pool.length)];
    }

    start() {
        this.isRunning = true; this.score = 0; this.level = 1; this.combo = 0;
        this.activeWords = []; this.inputBuffer = '';
        this.spawnRate = this.mode==='BLITZ'?1200:this.mode==='BOSS'?3000:2000;
        this.fallSpeed = this.mode==='BLITZ'?1.2:this.mode==='BOSS'?0.3:0.5;
        this.lives = this.mode==='BOSS'?1:3;
        this.lastSpawn = performance.now();
        this.lastTime  = performance.now();

        const gs = document.getElementById('ui-score'); if(gs)gs.innerText='0';

        const modeColor = { STANDARD:'#00ff41', CODE:'#3b82f6', BLITZ:'#ef4444', BOSS:'#fbbf24' }[this.mode]||'#00ff41';

        this.uiContainer.innerHTML = `
            <div class="ct2-root" id="ct2-word-layer"></div>
            <div class="ct2-danger-line"></div>
            <div class="ct2-hud">
                <div class="ct2-hud-cell"><div class="ct2-hud-lbl">SCORE</div><div class="ct2-hud-val" id="ct2-score">0</div></div>
                <div class="ct2-hud-cell"><div class="ct2-hud-lbl">COMBO</div><div class="ct2-hud-val" id="ct2-combo" style="color:#fbbf24;">×1</div></div>
                <div class="ct2-hud-cell"><div class="ct2-hud-lbl">VIDAS</div><div class="ct2-hud-val" id="ct2-lives">${'<i class="fa-solid fa-heart" style="color:#ef4444;margin:0 2px;"></i>'.repeat(this.lives)}</div></div>
                <div class="ct2-hud-cell"><div class="ct2-hud-lbl">NIVEL</div><div class="ct2-hud-val" id="ct2-level">1</div></div>
            </div>
            <div class="ct2-input-zone">
                <div class="ct2-input-display" style="color:${modeColor};" id="ct2-input-display">
                    <span id="ct2-input-text"></span>
                    <span class="ct2-cursor" style="background:${modeColor};"></span>
                </div>
            </div>
            <input type="text" id="ct2-hidden" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;

        const inp = document.getElementById('ct2-hidden');
        inp.focus();
        this.uiContainer.onclick = () => inp.focus();
        inp.addEventListener('input',   this.handleInput);
        inp.addEventListener('keydown', this.handleKeyDown);

        this.gameLoopId = requestAnimationFrame(t => this.loop(t));
    }

    handleInput(e) {
        if(!this.isRunning) return;
        const val = e.target.value.toUpperCase().replace(/[^A-Z]/g,'');
        this.inputBuffer = val;
        this.updateDisplay();
        this.checkWord();
    }

    handleKeyDown(e) {
        if(!this.isRunning) return;
        if(e.key.match(/^[a-zA-Z]$/)) try{ this.audio.playTone(300+Math.random()*100,'square',0.04); }catch(err){}
        if(e.key==='Escape') this.clearInput();
    }

    updateDisplay() {
        const el = document.getElementById('ct2-input-text');
        if(el) el.textContent = this.inputBuffer;
        // Highlight la palabra que más coincide
        const layer = document.getElementById('ct2-word-layer');
        if(!layer) return;
        document.querySelectorAll('.ct2-word').forEach(el => {
            const word = el.dataset.word;
            if(this.inputBuffer.length > 0 && word.startsWith(this.inputBuffer)){
                const typed = el.querySelector('.ct2-typed');
                const remain = el.querySelector('.ct2-remain');
                if(typed) typed.textContent = this.inputBuffer;
                if(remain) remain.textContent = word.slice(this.inputBuffer.length);
                el.classList.add('matched');
            } else {
                const typed = el.querySelector('.ct2-typed');
                const remain = el.querySelector('.ct2-remain');
                if(typed) typed.textContent = '';
                if(remain) remain.textContent = word;
                el.classList.remove('matched');
            }
        });
    }

    checkWord() {
        const matches = this.activeWords.filter(w => w.text === this.inputBuffer);
        if(matches.length > 0){
            const w = matches[0];
            this.destroyWord(w);
            this.clearInput();
        }
    }

    destroyWord(w) {
        if(w.el){ w.el.classList.add('exploding'); setTimeout(()=>w.el?.remove(),250); }
        this.activeWords = this.activeWords.filter(a=>a!==w);
        this.combo++;
        const mult = Math.min(5, 1+Math.floor(this.combo/3));
        const pts  = w.text.length * 10 * mult;
        this.score += pts;

        // Combo popup
        if(this.combo > 2){
            const pop = document.createElement('div');
            pop.className = 'ct2-combo-pop';
            pop.textContent = `×${mult} COMBO!`;
            pop.style.cssText = `left:${w.x}px;top:${w.y-30}px;`;
            document.getElementById('ct2-word-layer')?.appendChild(pop);
            setTimeout(()=>pop.remove(),600);
        }

        try{ this.audio.playWin(this.combo>5?5:1); }catch(e){}
        const gs=document.getElementById('ui-score'); if(gs) gs.innerText=this.score;
        const sc=document.getElementById('ct2-score'); if(sc) sc.innerText=this.score.toLocaleString();
        const cb=document.getElementById('ct2-combo'); if(cb){ cb.innerText=`×${mult}`; cb.style.color=mult>3?'#ef4444':'#fbbf24'; }

        // Acelerar con la puntuación
        this.spawnRate = Math.max(this.mode==='BLITZ'?500:800, this.spawnRate - pts*0.5);
        this.fallSpeed = Math.min(this.mode==='BLITZ'?4:2.5, this.fallSpeed + 0.01);
        if(this.score > this.level * 200){ this.level++; document.getElementById('ct2-level').innerText=this.level; }
    }

    clearInput() {
        this.inputBuffer = '';
        this.combo = 0;
        const cb=document.getElementById('ct2-combo'); if(cb){cb.innerText='×1';cb.style.color='#fbbf24';}
        const inp=document.getElementById('ct2-hidden'); if(inp)inp.value='';
        const el=document.getElementById('ct2-input-text'); if(el)el.textContent='';
        document.querySelectorAll('.ct2-word').forEach(el=>{el.classList.remove('matched');const r=el.querySelector('.ct2-remain');const t=el.querySelector('.ct2-typed');if(t)t.textContent='';if(r)r.textContent=el.dataset.word;});
    }

    spawnWord() {
        const layer = document.getElementById('ct2-word-layer');
        if(!layer) return;
        const text  = this.wordBank[Math.floor(Math.random()*this.wordBank.length)];
        const color = this.getWordColor();
        const x     = 80 + Math.random()*(window.innerWidth-160);
        const el    = document.createElement('div');
        el.className    = 'ct2-word';
        el.dataset.word = text;
        el.style.cssText = `left:${x}px;top:-30px;color:${color};border-color:${color}50;`;
        el.innerHTML    = `<span class="ct2-typed"></span><span class="ct2-remain">${text}</span>`;
        layer.appendChild(el);
        const w = { text, el, x, y:-30, speed: this.fallSpeed };
        this.activeWords.push(w);
        return w;
    }

    loop(ts) {
        if(!this.isRunning) return;
        const dt = ts - this.lastTime; this.lastTime = ts;

        // Spawn
        if(ts - this.lastSpawn > this.spawnRate){ this.spawnWord(); this.lastSpawn=ts; }

        // Mover palabras
        const dangerY = window.innerHeight - 90;
        for(let i=this.activeWords.length-1; i>=0; i--){
            const w = this.activeWords[i];
            w.y += w.speed;
            if(w.el) w.el.style.top = w.y+'px';
            if(w.y > dangerY){
                // Falló — quitar vida
                if(w.el) w.el.remove();
                this.activeWords.splice(i,1);
                this.lives--;
                this.combo = 0;
                try{ this.audio.playLose(); }catch(e){}
                document.body.classList.add('shake-screen');
                setTimeout(()=>document.body.classList.remove('shake-screen'),300);
                const livesEl=document.getElementById('ct2-lives');
                if(livesEl) livesEl.innerHTML='<i class="fa-solid fa-heart" style="color:#ef4444;margin:0 2px;"></i>'.repeat(Math.max(0,this.lives))+'<i class="fa-solid fa-heart-crack" style="color:#334155;margin:0 2px;"></i>'.repeat(Math.max(0,3-Math.max(this.lives,0)));
                if(this.lives<=0){ this.gameOver(); return; }
            }
        }

        this.gameLoopId = requestAnimationFrame(t=>this.loop(t));
    }

    pause() {
        if(!this.isRunning) return;
        this._wasPaused = true;
        if(this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId = null; }
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isRunning) this.gameLoopId = requestAnimationFrame(t => this.loop(t));
    }


    gameOver() {
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        window.removeEventListener('keydown', this.handleKeyDown);
        const inp=document.getElementById('ct2-hidden');
        if(inp){ inp.removeEventListener('input',this.handleInput); inp.removeEventListener('keydown',this.handleKeyDown); }
        try{ this.audio.playLose(); }catch(e){}
        if(this.onGameOver) this.onGameOver(this.score);
    }
}

import { CONFIG } from '../config.js';

const SUIT_DATA = {
    H: { fa:'♥', icon:'fa-heart',   color:'#ef4444', name:'Corazones', label:'RED',  glow:'rgba(239,68,68,0.5)'  },
    D: { fa:'♦', icon:'fa-diamond', color:'#f97316', name:'Diamantes', label:'RED',  glow:'rgba(249,115,22,0.5)' },
    C: { fa:'♣', icon:'fa-clover',  color:'#3b82f6', name:'Tréboles',  label:'BLACK',glow:'rgba(59,130,246,0.5)' },
    S: { fa:'♠', icon:'fa-spade',   color:'#8b5cf6', name:'Picas',     label:'BLACK',glow:'rgba(139,92,246,0.5)' }
};
const RANK_LABELS = { J:'JOTA', Q:'REINA', K:'REY', A:'AS' };

export class GuessCardGame {
    constructor(canvas, audio, onQuit) {
        this.canvas  = canvas;
        this.audio   = audio;
        this.onQuit  = onQuit;
        this.deck    = [];
        this.currentCard = null;
        this.score   = 0;
        this.round   = 0;
        this.winStreak   = 0;
        this.totalWins   = 0;
        this.totalLosses = 0;
        this.pendingBet  = null; // { type, prediction }
        this.isRevealing = false;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('oracle-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'oracle-styles-v2';
        s.innerHTML = `
        .oracle-root { display:flex; flex-direction:column; align-items:center; justify-content:space-between; height:calc(100vh - 56px); padding:14px 20px 18px; width:100%; gap:10px; box-sizing:border-box; }

        /* Stats bar */
        .oracle-stats { display:flex; gap:8px; width:100%; max-width:520px; }
        .oracle-stat { flex:1; background:rgba(10,16,30,0.85); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:8px 12px; display:flex; flex-direction:column; gap:2px; }
        .oracle-stat-lbl { font-size:0.55rem; color:#334155; letter-spacing:2px; font-family:monospace; text-transform:uppercase; }
        .oracle-stat-val { font-family:var(--font-display); font-size:1rem; color:white; display:flex; align-items:center; gap:5px; }

        /* Carta */
        .oracle-card-wrap { position:relative; flex:1; display:flex; align-items:center; justify-content:center; width:100%; }
        .oracle-card { width:190px; height:270px; border-radius:18px; border:2px solid; display:flex; flex-direction:column; justify-content:space-between; padding:14px; position:relative; overflow:hidden; transition:all 0.4s cubic-bezier(0.2,0,0,1); }
        .oracle-card::after { content:''; position:absolute; inset:0; background:repeating-linear-gradient(0deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01) 1px,transparent 1px,transparent 4px); pointer-events:none; }
        .oracle-card.hidden { background:repeating-linear-gradient(135deg,#2e1065,#2e1065 10px,#4c1d95 10px,#4c1d95 20px); border-color:#a855f7; box-shadow:0 0 40px rgba(168,85,247,0.4); animation:oracleFloat 3s ease-in-out infinite; }
        .oracle-card.hidden .oracle-card-qmark { font-size:5rem; color:#a855f7; filter:drop-shadow(0 0 16px #a855f7); animation:oraclePulse 2s ease-in-out infinite; }
        .oracle-card.revealed { background:linear-gradient(145deg,#0d1525,#1a2540); }
        .oracle-card-corner { display:flex; flex-direction:column; align-items:center; gap:2px; line-height:1; }
        .oracle-card-rank { font-family:var(--font-display); font-size:1.4rem; font-weight:bold; }
        .oracle-card-suit-sm { font-size:1rem; }
        .oracle-card-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:5rem; opacity:0.12; pointer-events:none; }
        .oracle-card-revealed-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:5rem; pointer-events:none; filter:drop-shadow(0 0 20px currentColor); opacity:0.7; }

        /* Plataforma bajo la carta */
        .oracle-platform { width:160px; height:20px; background:radial-gradient(ellipse at center,rgba(168,85,247,0.5) 0%,transparent 70%); border-radius:50%; margin-top:6px; transition:background 0.4s; }

        /* Bet panel */
        .oracle-bet-panel { width:100%; max-width:520px; background:rgba(8,14,26,0.85); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; backdrop-filter:blur(6px); }
        .oracle-bet-title { font-size:0.6rem; color:#334155; letter-spacing:3px; font-family:monospace; text-transform:uppercase; text-align:center; }

        /* Botones de color */
        .oracle-color-row { display:flex; gap:10px; }
        .oracle-color-btn { flex:1; height:72px; border:2px solid; background:rgba(0,0,0,0.3); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; cursor:pointer; transition:all 0.15s; clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px); position:relative; overflow:hidden; }
        .oracle-color-btn:hover { transform:translateY(-3px); }
        .oracle-color-btn.btn-red  { border-color:#ef4444; color:#ef4444; }
        .oracle-color-btn.btn-red:hover  { box-shadow:0 8px 20px rgba(239,68,68,0.35); background:rgba(239,68,68,0.08); }
        .oracle-color-btn.btn-black { border-color:#8b5cf6; color:#8b5cf6; }
        .oracle-color-btn.btn-black:hover { box-shadow:0 8px 20px rgba(139,92,246,0.35); background:rgba(139,92,246,0.08); }
        .oracle-color-btn-name { font-family:var(--font-display); font-size:1rem; letter-spacing:2px; }
        .oracle-color-btn-multi { font-size:0.6rem; color:#475569; font-family:monospace; }

        /* Botones de palo */
        .oracle-suit-row { display:flex; gap:8px; justify-content:center; }
        .oracle-suit-btn { width:72px; height:72px; border:2px solid; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; cursor:pointer; transition:all 0.15s; background:rgba(0,0,0,0.3); }
        .oracle-suit-btn:hover { transform:scale(1.1) rotate(3deg); }
        .oracle-suit-btn-fa { font-size:1.6rem; }
        .oracle-suit-btn-multi { font-size:0.58rem; font-family:monospace; color:#475569; }

        /* Info de pago */
        .oracle-payout-bar { display:flex; align-items:center; justify-content:center; gap:16px; }
        .oracle-payout-item { display:flex; align-items:center; gap:6px; font-size:0.65rem; font-family:monospace; color:#475569; }
        .oracle-payout-badge { padding:2px 8px; border-radius:4px; border:1px solid; font-size:0.6rem; }

        /* Reveal state */
        .oracle-reveal-panel { width:100%; max-width:520px; background:rgba(8,14,26,0.85); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; text-align:center; backdrop-filter:blur(6px); }
        .oracle-result-badge { display:inline-flex; align-items:center; gap:8px; padding:8px 20px; border-radius:10px; font-family:var(--font-display); font-size:0.85rem; letter-spacing:2px; border:1px solid; margin:0 auto; }
        .oracle-result-badge.win  { color:#22c55e; border-color:#22c55e40; background:rgba(34,197,94,0.08); }
        .oracle-result-badge.loss { color:#ef4444; border-color:#ef444440; background:rgba(239,68,68,0.08); }
        .oracle-card-identity { font-size:0.75rem; color:#64748b; font-family:monospace; letter-spacing:1px; margin-top:2px; }
        .oracle-next-btn { width:100%; padding:13px; border:1px solid #a855f7; background:rgba(168,85,247,0.1); color:#a855f7; border-radius:10px; font-family:var(--font-display); font-size:0.82rem; letter-spacing:2px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .oracle-next-btn:hover { background:rgba(168,85,247,0.2); box-shadow:0 0 20px rgba(168,85,247,0.3); }

        /* Historial de rondas */
        .oracle-round-history { display:flex; gap:4px; justify-content:center; flex-wrap:wrap; min-height:18px; }
        .oracle-round-dot { width:10px; height:10px; border-radius:50%; border:1px solid; flex-shrink:0; }
        .oracle-round-dot.win  { background:#22c55e40; border-color:#22c55e; }
        .oracle-round-dot.loss { background:#ef444440; border-color:#ef4444; }

        /* Animaciones */
        @keyframes oracleFloat { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-8px)} }
        @keyframes oraclePulse { 0%,100%{opacity:0.8;filter:drop-shadow(0 0 10px #a855f7)} 50%{opacity:1;filter:drop-shadow(0 0 24px #a855f7)} }
        @keyframes oracleReveal { from{transform:rotateY(90deg);opacity:0} to{transform:rotateY(0);opacity:1} }
        .oracle-card.revealed { animation:oracleReveal 0.35s cubic-bezier(0.2,0,0,1.3) both; }
        `;
        document.head.appendChild(s);
    }

    createDeck() {
        const suits=['H','D','C','S'];
        const defs=[{r:'2',v:2},{r:'3',v:3},{r:'4',v:4},{r:'5',v:5},{r:'6',v:6},{r:'7',v:7},{r:'8',v:8},{r:'9',v:9},{r:'10',v:10},{r:'J',v:11},{r:'Q',v:12},{r:'K',v:13},{r:'A',v:14}];
        const deck=[];
        for(const s of suits) for(const d of defs) deck.push({suit:s,rank:d.r,value:d.v});
        return this.shuffle(deck);
    }
    shuffle(a){ let c=a.length,r; while(c){r=Math.floor(Math.random()*c--);[a[c],a[r]]=[a[r],a[c]];} return a; }
    drawCard(){ if(!this.deck||!this.deck.length) this.deck=this.createDeck(); return this.deck.pop(); }

    getHiddenCardHTML() {
        return `<div class="oracle-card hidden" style="align-items:center;justify-content:center;">
            <div class="oracle-card-qmark"><i class="fa-solid fa-question"></i></div>
        </div>`;
    }

    getRevealedCardHTML(card) {
        const si = SUIT_DATA[card.suit] || SUIT_DATA.S;
        return `<div class="oracle-card revealed" style="border-color:${si.color}; box-shadow:0 0 30px ${si.glow},inset 0 0 20px rgba(0,0,0,0.5); color:${si.color};">
            <div class="oracle-card-corner">
                <span class="oracle-card-rank">${card.rank}</span>
                <span class="oracle-card-suit-sm">${si.fa}</span>
            </div>
            <div class="oracle-card-revealed-center" style="color:${si.color};">${si.fa}</div>
            <div class="oracle-card-corner" style="align-self:flex-end;transform:rotate(180deg);">
                <span class="oracle-card-rank">${card.rank}</span>
                <span class="oracle-card-suit-sm">${si.fa}</span>
            </div>
        </div>`;
    }

    pause() { this._paused = true; }
    resume() { this._paused = false; }
    buildRoundHistory() {
        return this.roundHistory.map(r =>
            `<div class="oracle-round-dot ${r}" title="${r}"></div>`
        ).join('');
    }

    init() {
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'oc-classic', mc:'#a855f7', icon:'fa-eye',          name:'CLÁSICO',  desc:'Predice color y palo · mazo completo' },
            { id:'oc-blitz',   mc:'#ef4444', icon:'fa-bolt',         name:'BLITZ',    desc:'Solo color · 3 segundos por carta'     },
            { id:'oc-expert',  mc:'#fbbf24', icon:'fa-star',         name:'EXPERTO',  desc:'Adivina el palo exacto · x3 puntos'    },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">THE ORACLE</div>
                <div style="font-size:0.65rem;color:#a855f7;letter-spacing:3px;font-family:monospace;">ADIVINACIÓN CUÁNTICA</div>
                <div style="width:120px;height:1px;background:#a855f7;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:160px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.76rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="oc-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('oc-classic').onclick = () => this.startWithMode('CLASSIC');
        document.getElementById('oc-blitz').onclick   = () => this.startWithMode('BLITZ');
        document.getElementById('oc-expert').onclick  = () => this.startWithMode('EXPERT');
        document.getElementById('oc-back').onclick    = () => { if(this.onQuit) this.onQuit(0); };
    }

    startWithMode(mode) {
        this.mode = mode;
        try{ this.canvas.setMood('MYSTERY'); }catch(e){}
        this.score=0; this.round=0; this.winStreak=0; this.totalWins=0; this.totalLosses=0;
        this.roundHistory=[];
        this.deck=this.createDeck();
        const gs=document.getElementById('ui-score'); if(gs)gs.innerText='0';
        this.nextRound();
    }

    nextRound() {
        this.round++;
        this.isRevealing=false;
        this.pendingBet=null;
        this.currentCard=this.drawCard();
        this.renderBetting();
    }

    renderBetting() {
        // Recalcular probabilidades del mazo restante
        const remaining = this.deck.length;
        const redLeft  = this.deck.filter(c=>c.suit==='H'||c.suit==='D').length + (this.currentCard?.suit==='H'||this.currentCard?.suit==='D'?1:0);
        const blackLeft = remaining - redLeft + 2;
        const pRed   = remaining > 0 ? Math.round((redLeft/(remaining+1))*100)  : 50;
        const pBlack = 100 - pRed;

        // Probabilidades por palo
        const suitCounts = {};
        for(const c of this.deck) suitCounts[c.suit]=(suitCounts[c.suit]||0)+1;
        const total = this.deck.length + 1;

        this.uiContainer.innerHTML = `
        <div class="oracle-root">
            <!-- Stats -->
            <div class="oracle-stats">
                <div class="oracle-stat">
                    <div class="oracle-stat-lbl">RONDA</div>
                    <div class="oracle-stat-val">${this.round}</div>
                </div>
                <div class="oracle-stat">
                    <div class="oracle-stat-lbl">ACIERTOS</div>
                    <div class="oracle-stat-val" style="color:#22c55e;">${this.totalWins}</div>
                </div>
                <div class="oracle-stat">
                    <div class="oracle-stat-lbl">RACHA</div>
                    <div class="oracle-stat-val" style="color:#a855f7;">
                        ${this.winStreak}
                        ${this.winStreak>=3?'<i class="fa-solid fa-fire" style="font-size:0.85rem;color:#f97316;"></i>':''}
                    </div>
                </div>
                <div class="oracle-stat">
                    <div class="oracle-stat-lbl">CARTAS REST.</div>
                    <div class="oracle-stat-val" style="color:#64748b;">${this.deck.length}</div>
                </div>
            </div>

            <!-- Historial -->
            <div class="oracle-round-history">${this.buildRoundHistory()}</div>

            <!-- Carta oculta + plataforma -->
            <div class="oracle-card-wrap">
                <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
                    <div id="oracle-card-el">${this.getHiddenCardHTML()}</div>
                    <div class="oracle-platform"></div>
                </div>
            </div>

            <!-- Panel de apuesta -->
            <div class="oracle-bet-panel">
                <div class="oracle-bet-title">SELECCIONA TU PREDICCIÓN</div>

                <!-- Color -->
                <div class="oracle-color-row">
                    <div class="oracle-color-btn btn-red" id="bet-red">
                        <div style="display:flex;gap:6px;align-items:center;">
                            <i class="fa-solid fa-heart" style="font-size:1.1rem;"></i>
                            <i class="fa-solid fa-diamond" style="font-size:1.1rem;"></i>
                        </div>
                        <div class="oracle-color-btn-name">ROJO</div>
                        <div class="oracle-color-btn-multi">${pRed}% · WIN ×2</div>
                    </div>
                    <div class="oracle-color-btn btn-black" id="bet-black">
                        <div style="display:flex;gap:6px;align-items:center;">
                            <i class="fa-solid fa-clover" style="font-size:1.1rem;"></i>
                            <i class="fa-solid fa-spade" style="font-size:1.1rem;"></i>
                        </div>
                        <div class="oracle-color-btn-name">NEGRO</div>
                        <div class="oracle-color-btn-multi">${pBlack}% · WIN ×2</div>
                    </div>
                </div>

                <!-- Palos exactos -->
                <div class="oracle-suit-row">
                    ${['H','D','C','S'].map(suit=>{
                        const si=SUIT_DATA[suit];
                        const cnt=suitCounts[suit]||0;
                        const pct=Math.round((cnt/total)*100);
                        return `<div class="oracle-suit-btn" id="bet-${suit}" style="border-color:${si.color}50; color:${si.color};">
                            <i class="fa-solid ${si.icon} oracle-suit-btn-fa"></i>
                            <div style="font-size:0.6rem;font-family:monospace;color:${si.color};letter-spacing:0.5px;">${pct}%</div>
                            <div class="oracle-suit-btn-multi">×4</div>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Info de pago -->
                <div class="oracle-payout-bar">
                    <div class="oracle-payout-item">
                        <i class="fa-solid fa-coins" style="color:var(--gold);"></i>
                        COSTE: 10 CR POR APUESTA
                    </div>
                    <div class="oracle-payout-item" style="color:#334155;">|</div>
                    <div class="oracle-payout-item">
                        <i class="fa-solid fa-arrow-up" style="color:#22c55e;"></i>
                        RACHA ×3 = BONUS ×2
                    </div>
                </div>
            </div>
        </div>`;

        // Bind botones
        document.getElementById('bet-red').onclick   = ()=>this.placeBet('COLOR','RED');
        document.getElementById('bet-black').onclick = ()=>this.placeBet('COLOR','BLACK');
        ['H','D','C','S'].forEach(s=>{ document.getElementById(`bet-${s}`).onclick=()=>this.placeBet('SUIT',s); });
    }

    placeBet(type, prediction) {
        if(this.isRevealing) return;
        if(window.app.credits < 10){
            try{ this.audio.playLose(); window.app.showToast('SIN CRÉDITOS','Recarga requerida','danger'); }catch(e){}
            return;
        }
        this.isRevealing = true;
        window.app.credits -= 10;
        const vcEl = document.getElementById('val-credits'); if(vcEl) vcEl.innerText=window.app.credits;
        try{ this.audio.playBuy(); }catch(e){}

        // Animación de la carta: gira antes de revelar
        const cardEl = document.getElementById('oracle-card-el');
        if(cardEl){ cardEl.style.transition='all 0.3s'; cardEl.style.transform='scale(0.85) rotateY(90deg)'; cardEl.style.opacity='0.3'; }

        setTimeout(()=>{
            if(cardEl){ cardEl.innerHTML=this.getRevealedCardHTML(this.currentCard); cardEl.style.transform=''; cardEl.style.opacity='1'; }
            this.resolveBet(type, prediction);
        }, 300);
    }

    resolveBet(type, prediction) {
        const si = SUIT_DATA[this.currentCard.suit];
        const actualColor = si.label; // 'RED' | 'BLACK'
        const actualSuit  = this.currentCard.suit;
        let win=false, payout=0;

        if(type==='COLOR' && prediction===actualColor){ win=true; payout=20; }
        else if(type==='SUIT' && prediction===actualSuit){ win=true; payout=40; }

        // Bonus por racha
        if(win){
            this.totalWins++;
            this.winStreak++;
            let finalPayout = payout;
            if(this.winStreak>=3) finalPayout = payout * 2; // Racha x3 = doble pago
            window.app.credits += finalPayout;
            this.score++;
            const gs=document.getElementById('ui-score'); if(gs)gs.innerText=this.score;
            this.roundHistory.push('win');
            try{
                window.app.showToast(
                    this.winStreak>=3?`¡RACHA x${this.winStreak}!`:'SINCRONIZACIÓN',
                    `+${finalPayout} CR${this.winStreak>=3?' (BONUS)':''}`,
                    'success'
                );
                this.audio.playWin(this.winStreak>=3?10:3);
                if(this.canvas) this.canvas.explode(window.innerWidth/2,window.innerHeight/2,si.color);
            }catch(e){}
        } else {
            this.totalLosses++;
            this.winStreak=0;
            this.roundHistory.push('loss');
            try{ window.app.showToast('PREDICCIÓN FALLIDA','Datos corruptos','danger'); this.audio.playLose(); }catch(e){}
            document.body.classList.add('shake-screen');
            setTimeout(()=>document.body.classList.remove('shake-screen'),400);
        }

        const vcEl=document.getElementById('val-credits'); if(vcEl)vcEl.innerText=window.app.credits;
        window.app.save();

        // Mostrar panel de resultado
        this.renderRevealResult(win, payout, type, prediction);
    }

    renderRevealResult(win, payout, betType, prediction) {
        const si = SUIT_DATA[this.currentCard.suit];
        const rankLabel = RANK_LABELS[this.currentCard.rank] || this.currentCard.rank;
        const actualBonus = this.winStreak>=3 ? payout*2 : payout;
        const streakBonus = this.winStreak>=3;

        // Inyectar solo el panel inferior
        const oldPanel = this.uiContainer.querySelector('.oracle-bet-panel');
        if(oldPanel){
            oldPanel.outerHTML = `
            <div class="oracle-reveal-panel">
                <div class="oracle-result-badge ${win?'win':'loss'}">
                    <i class="fa-solid ${win?'fa-check':'fa-xmark'}"></i>
                    ${win?(streakBonus?`RACHA x${this.winStreak} — +${actualBonus} CR`:`ACIERTO — +${payout} CR`):'FALLO — Racha perdida'}
                </div>
                <div class="oracle-card-identity">
                    <i class="fa-solid ${si.icon}" style="color:${si.color};"></i>
                    ${rankLabel} de ${si.name}
                </div>
                <button class="oracle-next-btn" id="oracle-next">
                    <i class="fa-solid fa-rotate-right"></i> INICIAR NUEVA LECTURA
                </button>
            </div>`;
            const nb = this.uiContainer.querySelector('#oracle-next');
            if(nb) nb.onclick = ()=>this.nextRound();
        }

        // Actualizar plataforma con el color del palo revelado
        const platform = this.uiContainer.querySelector('.oracle-platform');
        if(platform) platform.style.background=`radial-gradient(ellipse at center,${si.glow} 0%,transparent 70%)`;
    }
}

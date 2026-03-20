import { CONFIG } from '../config.js';

// Iconos FA para los palos — sin emojis, todo vectorial
const SUIT_ICONS = {
    H: { icon: 'fa-heart',   fa: '♥', color: '#ef4444', glow: 'rgba(239,68,68,0.4)'   },
    D: { icon: 'fa-diamond', fa: '♦', color: '#f97316', glow: 'rgba(249,115,22,0.4)'  },
    C: { icon: 'fa-clover',  fa: '♣', color: '#3b82f6', glow: 'rgba(59,130,246,0.4)'  },
    S: { icon: 'fa-spade',   fa: '♠', color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)'  }
};

// Iconos FA para cartas especiales
const SPECIAL_ICONS = {
    JOKER: { icon:'fa-bug',       color:'#22c55e', label:'GLITCH'  },
    WALL:  { icon:'fa-lock',      color:'#fbbf24', label:'FIREWALL'},
    CACHE: { icon:'fa-database',  color:'#eab308', label:'CACHE'   },
    VIRUS: { icon:'fa-biohazard', color:'#ef4444', label:'VIRUS'   },
    PROXY: { icon:'fa-question',  color:'#a855f7', label:'PROXY'   },
    EMP:   { icon:'fa-bolt',      color:'#06b6d4', label:'EMP'     }
};

export class HigherLowerGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.deck = [];
        this.currentCard = null;
        this.score = 0;
        this.streak = 0;
        this.history = [];
        this.difficulty = 'NORMAL';
        this.lastMoveTime = 0;
        this.comboCounter = 0;
        this.isFrenzy = false;
        this.virusTimer = null;
        this.animationTimer = null;
        this.blitzTimerInterval = null;
        this.blitzTimeLeft = 60;
        this.shieldActive = false;
        this.peekedCard = null;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('hl-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'hl-styles-v2';
        s.innerHTML = `
        /* HL Game — Layout */
        .hl-root { display:flex; flex-direction:column; align-items:center; justify-content:space-between; height:calc(100vh - 56px); padding:16px 20px; width:100%; gap:12px; box-sizing:border-box; }

        /* Modo select */
        .hl-mode-grid { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; }
        .hl-mode-card { width:160px; min-height:160px; background:rgba(10,16,30,0.9); border:1px solid rgba(255,255,255,0.07); border-radius:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; cursor:pointer; transition:transform 0.15s,border-color 0.15s,box-shadow 0.15s; padding:20px 12px; position:relative; overflow:hidden; }
        .hl-mode-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--mc,#3b82f6); opacity:0.6; }
        .hl-mode-card:hover { transform:translateY(-4px); border-color:var(--mc,#3b82f6); box-shadow:0 8px 24px rgba(0,0,0,0.4); }
        .hl-mode-card:hover::before { opacity:1; box-shadow:0 0 10px var(--mc,#3b82f6); }
        .hl-mode-icon { font-size:2rem; }
        .hl-mode-name { font-family:var(--font-display); font-size:0.8rem; letter-spacing:2px; }
        .hl-mode-desc { font-size:0.62rem; color:#475569; font-family:monospace; letter-spacing:1px; text-transform:uppercase; }

        /* HUD interno del juego */
        .hl-hud { display:flex; gap:10px; align-items:center; width:100%; max-width:520px; }
        .hl-stat { background:rgba(10,16,30,0.85); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:8px 16px; display:flex; flex-direction:column; gap:2px; flex:1; }
        .hl-stat-label { font-size:0.55rem; color:#334155; letter-spacing:2px; font-family:monospace; text-transform:uppercase; }
        .hl-stat-val { font-family:var(--font-display); font-size:1.1rem; color:white; display:flex; align-items:center; gap:6px; }
        .hl-blitz-track { flex:2; display:flex; flex-direction:column; gap:3px; }
        .hl-blitz-bar-bg { height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden; }
        .hl-blitz-bar-fill { height:100%; background:linear-gradient(90deg,#fbbf24,#f97316); border-radius:2px; transition:width 0.9s linear; }

        /* Carta */
        .hl-card-wrap { flex:1; display:flex; align-items:center; justify-content:center; width:100%; position:relative; }
        .hl-card { width:170px; height:240px; border-radius:16px; border:2px solid; background:linear-gradient(145deg,#0d1525 0%,#1a2540 100%); display:flex; flex-direction:column; justify-content:space-between; padding:12px; position:relative; overflow:hidden; transition:all 0.25s cubic-bezier(0.2,0,0,1.3); box-shadow:0 0 30px var(--sc,rgba(59,130,246,0.2)),inset 0 0 20px rgba(0,0,0,0.5); }
        .hl-card::after { content:''; position:absolute; inset:0; background:repeating-linear-gradient(0deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01) 1px,transparent 1px,transparent 4px); pointer-events:none; }
        .hl-card-corner { display:flex; flex-direction:column; align-items:center; gap:2px; line-height:1; }
        .hl-card-rank { font-family:var(--font-display); font-size:1.3rem; font-weight:bold; }
        .hl-card-suit-sm { font-size:0.9rem; }
        .hl-card-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:4.5rem; opacity:0.15; pointer-events:none; }
        .hl-card-special-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:3.5rem; }
        .hl-shield-badge { position:absolute; top:10px; left:50%; transform:translateX(-50%); background:rgba(16,185,129,0.9); color:white; font-size:0.6rem; padding:3px 10px; border-radius:20px; font-family:monospace; letter-spacing:1.5px; display:flex; align-items:center; gap:5px; white-space:nowrap; z-index:10; }

        /* Controles */
        .hl-controls { display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; max-width:520px; }
        .hl-btn-row { display:flex; gap:40px; align-items:center; }
        .hl-action-btn { width:80px; height:80px; border-radius:50%; border:2px solid; background:rgba(0,0,0,0.4); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.1s,box-shadow 0.15s; gap:4px; }
        .hl-action-btn:hover { transform:scale(1.08); }
        .hl-action-btn:active { transform:scale(0.94); }
        .hl-action-btn .btn-icon { font-size:1.6rem; }
        .hl-action-btn .btn-pct { font-size:0.6rem; font-family:monospace; letter-spacing:0.5px; }
        .hl-btn-lower { border-color:#ef4444; color:#ef4444; box-shadow:0 0 0 0 rgba(239,68,68,0.4); }
        .hl-btn-lower:hover { box-shadow:0 0 20px rgba(239,68,68,0.5); }
        .hl-btn-higher { border-color:#22c55e; color:#22c55e; box-shadow:0 0 0 0 rgba(34,197,94,0.4); }
        .hl-btn-higher:hover { box-shadow:0 0 20px rgba(34,197,94,0.5); }

        /* Skills */
        .hl-skill-row { display:flex; gap:8px; padding:8px 12px; background:rgba(0,0,0,0.4); border-radius:10px; border:1px solid rgba(255,255,255,0.06); }
        .hl-skill { width:52px; height:52px; border:1px solid #334155; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.15s,transform 0.1s; background:rgba(255,255,255,0.03); gap:3px; }
        .hl-skill:hover:not(.off) { border-color:rgba(255,255,255,0.3); transform:translateY(-2px); }
        .hl-skill.off { opacity:0.3; cursor:not-allowed; filter:grayscale(1); }
        .hl-skill-ico { font-size:1.1rem; }
        .hl-skill-cost { font-size:0.58rem; font-family:monospace; color:#475569; }

        /* Historia */
        .hl-history { display:flex; gap:5px; height:44px; align-items:center; }
        .hl-mini-card { width:28px; height:40px; border-radius:5px; border:1px solid; background:linear-gradient(145deg,#0d1525,#1a2540); display:flex; align-items:center; justify-content:center; font-size:0.75rem; }

        /* Carta especial — WALL */
        .hl-wall { width:100%; height:100%; border-radius:14px; background:repeating-linear-gradient(45deg,#1f2937,#1f2937 10px,#374151 10px,#374151 20px); border:2px solid #fbbf24; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; }
        .hl-wall-hp { background:#fbbf24; color:black; font-size:0.65rem; padding:2px 10px; border-radius:4px; font-family:var(--font-display); font-weight:bold; letter-spacing:1px; }

        /* Efectos */
        @keyframes hl-enter { from{transform:translateX(40px) scale(0.9);opacity:0} to{transform:none;opacity:1} }
        @keyframes hl-exit  { to{transform:translateX(-40px) scale(0.9);opacity:0} }
        .hl-card.entering { animation:hl-enter 0.25s cubic-bezier(0.2,0,0,1.3) both; }
        `;
        document.head.appendChild(s);
    }

    createDeck() {
        const suits = ['H','D','C','S'];
        const defs = [{r:'2',v:2},{r:'3',v:3},{r:'4',v:4},{r:'5',v:5},{r:'6',v:6},
                      {r:'7',v:7},{r:'8',v:8},{r:'9',v:9},{r:'10',v:10},
                      {r:'J',v:11},{r:'Q',v:12},{r:'K',v:13},{r:'A',v:14}];
        let deck = [];
        for(const s of suits) for(const d of defs) deck.push({type:'NORMAL',suit:s,rank:d.r,value:d.v});
        deck.push({type:'JOKER',value:99});
        deck.push({type:'WALL', value:50,hp:4});
        deck.push({type:'CACHE',value:10,suit:'D',rank:'$'});
        deck.push({type:'VIRUS',value:7, suit:'S',rank:'!'});
        deck.push({type:'PROXY',value:Math.floor(Math.random()*13)+2,suit:'C',rank:'?'});
        deck.push({type:'EMP',  value:8, suit:'S',rank:'~'});
        return this.shuffle(deck);
    }
    shuffle(arr){ let c=arr.length,r; while(c){r=Math.floor(Math.random()*c--);[arr[c],arr[r]]=[arr[r],arr[c]];} return arr; }
    drawCard(){ if(!this.deck||!this.deck.length) this.deck=this.createDeck(); return this.deck.pop()||{type:'NORMAL',suit:'S',rank:'A',value:14}; }

    getCardHTML(card, mini=false) {
        if(!card) return '';
        if(mini) {
            if(card.type !== 'NORMAL') {
                const sp = SPECIAL_ICONS[card.type] || SPECIAL_ICONS.PROXY;
                return `<div class="hl-mini-card" style="border-color:${sp.color}; color:${sp.color};"><i class="fa-solid ${sp.icon}" style="font-size:0.8rem;"></i></div>`;
            }
            const si = SUIT_ICONS[card.suit] || SUIT_ICONS.S;
            return `<div class="hl-mini-card" style="border-color:${si.color}50; color:${si.color};"><span style="font-size:0.65rem;font-family:var(--font-display);">${card.rank}</span></div>`;
        }

        // Cartas especiales
        if(card.type === 'WALL') return `
            <div class="hl-wall" onclick="window.app.game.hitWall()">
                <i class="fa-solid fa-lock" style="font-size:2.8rem;color:#fbbf24;filter:drop-shadow(0 0 10px #fbbf24);"></i>
                <div style="font-family:var(--font-display);font-size:0.75rem;color:#fbbf24;letter-spacing:2px;">FIREWALL</div>
                <div class="hl-wall-hp"><i class="fa-solid fa-shield-halved"></i> HP: ${card.hp}</div>
                <div style="font-size:0.58rem;color:#94a3b8;font-family:monospace;">PULSA PARA ROMPER</div>
            </div>`;

        const sp = SPECIAL_ICONS[card.type];
        if(sp) return `
            <div class="hl-card" style="border-color:${sp.color}; --sc:${sp.color}40; align-items:center; justify-content:center;">
                <i class="fa-solid ${sp.icon} hl-card-special-center" style="color:${sp.color}; opacity:0.9; filter:drop-shadow(0 0 14px ${sp.color});"></i>
                <div style="position:absolute;bottom:14px;font-size:0.65rem;color:${sp.color};font-family:var(--font-display);letter-spacing:2px;">${sp.label}</div>
            </div>`;

        const si = SUIT_ICONS[card.suit] || SUIT_ICONS.S;
        return `
            <div class="hl-card entering" style="border-color:${si.color}; color:${si.color}; --sc:${si.glow};">
                <div class="hl-card-corner">
                    <span class="hl-card-rank">${card.rank}</span>
                    <span class="hl-card-suit-sm">${si.fa}</span>
                </div>
                <div class="hl-card-center">${si.fa}</div>
                <div class="hl-card-corner" style="align-self:flex-end;transform:rotate(180deg);">
                    <span class="hl-card-rank">${card.rank}</span>
                    <span class="hl-card-suit-sm">${si.fa}</span>
                </div>
            </div>`;
    }

    hitWall() {
        if(!this.currentCard||this.currentCard.type!=='WALL') return;
        this.currentCard.hp--;
        try{ this.audio.playClick(); }catch(e){}
        const el = document.getElementById('hl-main-card');
        if(el){ el.style.transform=`translate(${Math.random()*8-4}px,${Math.random()*8-4}px)`; setTimeout(()=>{ if(el) el.style.transform=''; },60); }
        if(this.currentCard.hp<=0){
            try{ window.app.showToast('FIREWALL DESTRUIDO','Acceso recuperado','gold'); }catch(e){}
            this.currentCard=this.drawCard(); this.renderTable();
        } else this.renderTable();
    }

    triggerVirusFail(){ if(!this.virusTimer)return; try{window.app.showToast('¡VIRUS EJECUTADO!','Sistema corrompido','danger');}catch(e){} try{this.audio.playLose();}catch(e){} this.endGameLogic(); }
    pause() {
        this._paused = true;
        if(this.blitzTimerInterval) { clearInterval(this.blitzTimerInterval); this.blitzTimerInterval = null; }
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        if(this.currentMode === 'BLITZ' && this.blitzTimeLeft > 0) this.startBlitzTimer();
    }
    startBlitzTimer(){ this.blitzTimeLeft=60; if(this.blitzTimerInterval)clearInterval(this.blitzTimerInterval); this.blitzTimerInterval=setInterval(()=>{ this.blitzTimeLeft--; const t=document.getElementById('hl-blitz-fill'); if(t) t.style.width=(this.blitzTimeLeft/60*100)+'%'; const tv=document.getElementById('hl-timer-val'); if(tv) tv.textContent=this.blitzTimeLeft+'s'; if(this.blitzTimeLeft<=0){clearInterval(this.blitzTimerInterval);this.endGameLogic();} },1000); }

    init() {
        window.app.game=this;
        if(window.app.credits<15){ try{window.app.showToast('FONDOS INSUFICIENTES','Costo: 15 CR','danger');}catch(e){} if(this.onQuit)this.onQuit(0); return; }
        this.showDifficultySelect();
    }

    showDifficultySelect() {
        const modes = [
            { id:'mode-normal',   mc:'#3b82f6', icon:'fa-layer-group',       name:'ESTÁNDAR',  desc:'Racha infinita' },
            { id:'mode-hardcore', mc:'#ef4444', icon:'fa-skull-crossbones',   name:'LETAL',     desc:'1 Fallo = Fin'  },
            { id:'mode-blitz',    mc:'#fbbf24', icon:'fa-bolt',               name:'BLITZ',     desc:'60 segundos'    }
        ];
        this.uiContainer.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
                <div style="text-align:center;">
                    <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">HIGH / LOW</div>
                    <div style="font-size:0.65rem;color:var(--primary);letter-spacing:3px;font-family:monospace;">SELECCIONA NIVEL DE ACCESO</div>
                    <div style="width:120px;height:1px;background:var(--primary);margin:10px auto 0;opacity:0.5;"></div>
                </div>
                <div class="hl-mode-grid">
                    ${modes.map(m=>`
                    <div class="hl-mode-card" id="${m.id}" style="--mc:${m.mc};">
                        <i class="fa-solid ${m.icon} hl-mode-icon" style="color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                        <div class="hl-mode-name" style="color:${m.mc};">${m.name}</div>
                        <div class="hl-mode-desc">${m.desc}</div>
                    </div>`).join('')}
                </div>
                <button class="btn btn-secondary" id="btn-hl-back" style="width:180px;">
                    <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
                </button>
            </div>`;
        document.getElementById('mode-normal').onclick  = () => this.payAndStart('NORMAL');
        document.getElementById('mode-hardcore').onclick = () => this.payAndStart('HARDCORE');
        document.getElementById('mode-blitz').onclick   = () => this.payAndStart('BLITZ');
        document.getElementById('btn-hl-back').onclick  = () => { if(this.onQuit)this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits-=15;
        document.getElementById('val-credits').innerText=window.app.credits;
        try{this.audio.playBuy();}catch(e){}
        this.difficulty=mode;
        this.startGameLoop();
    }

    startGameLoop() {
        this.deck=this.createDeck(); this.resetRoundState();
        this.currentCard=this.drawCard();
        while(this.currentCard.type!=='NORMAL') this.currentCard=this.drawCard();
        if(this.difficulty==='BLITZ') this.startBlitzTimer();
        this.renderTable();
    }

    resetRoundState() {
        this.score=0; this.streak=0; this.history=[]; this.shieldActive=false; this.peekedCard=null; this.isFrenzy=false; this.comboCounter=0;
        if(this.virusTimer){clearTimeout(this.virusTimer);this.virusTimer=null;}
        if(this.animationTimer){clearTimeout(this.animationTimer);this.animationTimer=null;}
        if(this.blitzTimerInterval){clearInterval(this.blitzTimerInterval);this.blitzTimerInterval=null;}
        document.body.classList.remove('frenzy-mode');
    }

    renderTable() {
        try {
            if(this.virusTimer){clearTimeout(this.virusTimer);this.virusTimer=null;}
            if(this.animationTimer){clearTimeout(this.animationTimer);this.animationTimer=null;}
            if(!this.currentCard) this.currentCard=this.drawCard();
            const isSpecial = !['NORMAL','CACHE','EMP'].includes(this.currentCard.type);
            const isWall    = this.currentCard.type==='WALL';
            const isEmp     = this.currentCard.type==='EMP';
            const isVirus   = this.currentCard.type==='VIRUS';

            if(isVirus){ try{this.audio.playTone(600,'sawtooth',0.5);}catch(e){} this.virusTimer=setTimeout(()=>this.triggerVirusFail(),4000); }

            const val=this.currentCard.value||0;
            const probH=(isSpecial||isEmp)?0:Math.max(5,Math.min(100,((14-val)/13)*100));
            const probL=(isSpecial||isEmp)?0:Math.max(5,Math.min(100,((val-2)/13)*100));
            const canSwap   = window.app.credits>=35;
            const canOracle = window.app.credits>=75 && !this.peekedCard && !isEmp;
            const canShield = window.app.credits>=150 && !this.shieldActive;
            const hideCtrl  = isWall;

            const blitzHUD = this.difficulty==='BLITZ' ? `
                <div class="hl-blitz-track">
                    <div class="hl-stat-label">TIEMPO — <span id="hl-timer-val">${this.blitzTimeLeft}s</span></div>
                    <div class="hl-blitz-bar-bg"><div id="hl-blitz-fill" class="hl-blitz-bar-fill" style="width:${this.blitzTimeLeft/60*100}%;"></div></div>
                </div>` : '';

            const streakColor = this.isFrenzy ? '#ef4444' : this.streak>=5 ? '#f97316' : '#94a3b8';

            this.uiContainer.innerHTML = `
            <div class="hl-root">
                <!-- HUD -->
                <div class="hl-hud">
                    <div class="hl-stat">
                        <div class="hl-stat-label">SCORE</div>
                        <div class="hl-stat-val">${this.score.toLocaleString()}</div>
                    </div>
                    <div class="hl-stat">
                        <div class="hl-stat-label">${this.isFrenzy?'FRENESÍ':'RACHA'}</div>
                        <div class="hl-stat-val" style="color:${streakColor};">
                            ${this.streak}
                            ${this.streak>0?`<i class="fa-solid fa-fire" style="font-size:0.9rem;"></i>`:''}
                        </div>
                    </div>
                    ${blitzHUD}
                </div>

                <!-- CARTA -->
                <div class="hl-card-wrap">
                    ${this.shieldActive?`<div class="hl-shield-badge"><i class="fa-solid fa-shield-halved"></i> ESCUDO ACTIVO</div>`:''}
                    <div id="hl-main-card" style="width:170px;height:240px;">
                        ${this.getCardHTML(this.currentCard)}
                    </div>
                </div>

                <!-- CONTROLES -->
                <div class="hl-controls">
                    ${!hideCtrl ? `
                    <div class="hl-btn-row">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                            <div class="hl-action-btn hl-btn-lower" id="btn-low">
                                <i class="fa-solid fa-chevron-down btn-icon"></i>
                                ${probL>0?`<span class="btn-pct" style="color:#ef4444;">${Math.round(probL)}%</span>`:''}
                            </div>
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                            <div class="hl-action-btn hl-btn-higher" id="btn-high">
                                <i class="fa-solid fa-chevron-up btn-icon"></i>
                                ${probH>0?`<span class="btn-pct" style="color:#22c55e;">${Math.round(probH)}%</span>`:''}
                            </div>
                        </div>
                    </div>` : `<div style="color:#fbbf24;font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;"><i class="fa-solid fa-lock"></i> ROMPE EL FIREWALL</div>`}

                    <div class="hl-skill-row">
                        <div class="hl-skill ${!canSwap?'off':''}" id="skill-swap">
                            <i class="fa-solid fa-shuffle hl-skill-ico" style="color:#a855f7;"></i>
                            <span class="hl-skill-cost">$35</span>
                        </div>
                        <div class="hl-skill ${!canOracle||isEmp?'off':''}" id="skill-oracle">
                            <i class="fa-solid fa-eye hl-skill-ico" style="color:#3b82f6;"></i>
                            <span class="hl-skill-cost">$75</span>
                        </div>
                        <div class="hl-skill ${!canShield?'off':''}" id="skill-shield">
                            <i class="fa-solid fa-shield-halved hl-skill-ico" style="color:${this.shieldActive?'#10b981':'#f97316'};"></i>
                            <span class="hl-skill-cost">$150</span>
                        </div>
                    </div>

                    <div class="hl-history">${this.history.map(c=>this.getCardHTML(c,true)).join('')}</div>
                </div>
            </div>`;

            if(!hideCtrl){
                document.getElementById('btn-low').onclick  = ()=>this.makeMove('LOWER');
                document.getElementById('btn-high').onclick = ()=>this.makeMove('HIGHER');
            }
            document.getElementById('skill-swap').onclick   = ()=>{ if(canSwap)   this.activateSkill('SWAP',35);   };
            document.getElementById('skill-oracle').onclick = ()=>{ if(canOracle&&!isEmp) this.activateSkill('ORACLE',75);  };
            document.getElementById('skill-shield').onclick = ()=>{ if(canShield) this.activateSkill('SHIELD',150); };
        } catch(e){ console.error('HL Render Error:',e); this.startGameLoop(); }
    }

    activateSkill(type,cost) {
        window.app.credits-=cost;
        try{this.audio.playBuy();}catch(e){}
        if(type==='SHIELD'){ this.shieldActive=true; try{window.app.showToast('BLINDAJE','Activo','success');}catch(e){} }
        else if(type==='SWAP'){ if(this.virusTimer)clearTimeout(this.virusTimer); this.currentCard=this.drawCard(); this.peekedCard=null; try{window.app.showToast('REROLL','Nueva carta','purple');}catch(e){} }
        else if(type==='ORACLE'){
            if(!this.peekedCard)this.peekedCard=this.drawCard();
            let hint='???';
            if(this.peekedCard.type==='NORMAL'&&this.currentCard.type==='NORMAL') hint=this.peekedCard.value>this.currentCard.value?'MAYOR ▲':'MENOR ▼';
            else if(this.peekedCard.type==='JOKER') hint='GLITCH (WIN)';
            else hint='PELIGRO';
            try{window.app.showToast('ORÁCULO',`Predicción: ${hint}`,'purple');}catch(e){}
        }
        this.renderTable();
    }

    makeMove(guess) {
        if(this.virusTimer){clearTimeout(this.virusTimer);this.virusTimer=null;}
        const now=Date.now();
        if(now-this.lastMoveTime<1800){this.comboCounter++;if(this.comboCounter>=3&&!this.isFrenzy){this.isFrenzy=true;try{window.app.showToast('¡FRENESÍ!','Puntos x2','danger');}catch(e){} document.body.classList.add('frenzy-mode');}}
        else{this.comboCounter=0;this.isFrenzy=false;document.body.classList.remove('frenzy-mode');}
        this.lastMoveTime=now;
        const bL=document.getElementById('btn-low'); const bH=document.getElementById('btn-high');
        if(bL)bL.style.pointerEvents='none'; if(bH)bH.style.pointerEvents='none';
        try{this.audio.playClick();}catch(e){}
        const next=this.peekedCard||(this.peekedCard=null,this.drawCard());
        this.peekedCard=null;
        const el=document.getElementById('hl-main-card');
        if(el){el.style.transition='all 0.2s';el.style.transform='translateX(-40px)';el.style.opacity='0';}
        this.animationTimer=setTimeout(()=>this.resolve(guess,next),200);
    }

    resolve(guess,nextCard) {
        if(!this.currentCard)this.currentCard={value:0};
        if(!nextCard)nextCard=this.drawCard();
        const curVal=this.currentCard.value||0, nextVal=nextCard.value||0;
        const isJoker=this.currentCard.type==='JOKER'||nextCard.type==='JOKER';
        const isWall=nextCard.type==='WALL';
        let outcome='LOSE', isCrit=false;
        if(isJoker){outcome='WIN';try{window.app.showToast('GLITCH','Acceso concedido','gold');}catch(e){}}
        else if(isWall){outcome='WIN';}
        else if(curVal===nextVal) outcome='TIE';
        else if((guess==='HIGHER'&&nextVal>curVal)||(guess==='LOWER'&&nextVal<curVal)){
            outcome='WIN';
            const p=(guess==='HIGHER')?(14-curVal)/13:(curVal-2)/13;
            if(p<0.25) isCrit=true;
        }
        if(this.currentCard){this.history.push(this.currentCard);if(this.history.length>7)this.history.shift();}
        this.currentCard=nextCard;
        this.renderTable();
        const newEl=document.getElementById('hl-main-card');
        if(newEl){newEl.style.transition='none';newEl.style.transform='translateX(40px)';newEl.style.opacity='0';void newEl.offsetWidth;newEl.style.transition='all 0.25s cubic-bezier(0.2,0,0,1.3)';newEl.style.transform='';newEl.style.opacity='1';}

        if(outcome==='WIN'){
            if(!isWall){
                this.streak++;
                let pts=10;
                if(this.difficulty==='HARDCORE')pts*=2;
                if(this.isFrenzy)pts*=2;
                if(isCrit)pts*=3;
                this.score+=pts;
                try{window.app.addScore(pts,Math.floor(pts/2));}catch(e){}
                if(nextCard.type==='CACHE'){window.app.credits+=25;try{window.app.showToast('DATA CACHE','+25 CR','gold');}catch(e){}}
                try{isCrit?this.audio.playWin(10):this.audio.playWin(this.streak>3?5:1);}catch(e){}
            } else try{window.app.showToast('FIREWALL','Bloqueo detectado','danger');}catch(e){}
        } else if(outcome==='TIE'){
            try{window.app.showToast('EMPATE','Salvado','default');this.audio.playTone(300,'square',0.1);}catch(e){}
        } else {
            if(this.shieldActive){
                this.shieldActive=false;
                try{this.audio.playShieldBreak();window.app.showToast('ESCUDO ROTO','Salvado','success');}catch(e){}
                document.body.classList.add('shake-screen');setTimeout(()=>document.body.classList.remove('shake-screen'),500);
                this.renderTable();
            } else {
                try{this.audio.playLose();}catch(e){}
                document.body.classList.add('shake-screen');setTimeout(()=>document.body.classList.remove('shake-screen'),500);
                this.isFrenzy=false;document.body.classList.remove('frenzy-mode');
                if(this.difficulty==='BLITZ'){
                    this.streak=0; this.blitzTimeLeft=Math.max(0,this.blitzTimeLeft-5);
                    try{window.app.showToast('PENALIZACIÓN','-5 Segundos','danger');}catch(e){}
                    this.renderTable();
                } else if(this.difficulty==='HARDCORE') this.endGameLogic();
                else{try{window.app.showToast('FALLO','Racha 0','danger');}catch(e){} this.streak=0; this.renderTable();}
            }
        }
    }

    endGameLogic() {
        if(this.virusTimer)clearTimeout(this.virusTimer);
        if(this.blitzTimerInterval)clearInterval(this.blitzTimerInterval);
        if(this.onQuit)this.onQuit(this.score);
    }
}

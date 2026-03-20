import { CONFIG } from '../config.js';

// Tipos de objetivo por modo
const TARGET_TYPES = {
    NORMAL:    { colors:['#ef4444'], sizes:[80,120,160], lives:3, spawnMs:1400 },
    PRECISION: { colors:['#3b82f6','#ef4444'], sizes:[40,60,90], lives:3, spawnMs:1800 },
    SURVIVAL:  { colors:['#ef4444','#f97316','#fbbf24'], sizes:[50,90,130], lives:5, spawnMs:1100 },
};

export class NeonSniperGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas; this.audio = audio; this.onQuit = onQuit;
        this.score = 0; this.misses = 0; this.isRunning = false;
        this.targets = []; this.bullets = 5; this.maxBullets = 5;
        this.isReloading = false; this.spawnRate = 1200; this.lastSpawn = 0;
        this.mode = 'NORMAL'; this.streak = 0; this.accuracy = 0;
        this.totalShots = 0; this.totalHits = 0;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.handleInput = this.handleInput.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.gameLoopRef = null;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('sniper-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'sniper-styles-v2';
        s.innerHTML = `
        .sniper-cursor-active { cursor:none !important; }
        #sniper-stage { position:fixed;top:0;left:0;width:100%;height:100%;z-index:9000;pointer-events:none; }

        /* Objetivos */
        .sniper-target { position:absolute;border-radius:50%;transform:translate(-50%,-50%);pointer-events:auto !important;cursor:crosshair;transition:none; }
        .st-ring { position:absolute;inset:0;border-radius:50%;border:3px solid;animation:stPulse 1.5s ease-in-out infinite; }
        .st-center { position:absolute;width:20%;height:20%;background:currentColor;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 0 8px currentColor; }
        .st-cross-h { position:absolute;top:50%;left:20%;width:60%;height:1px;background:currentColor;opacity:0.4;pointer-events:none; }
        .st-cross-v { position:absolute;left:50%;top:20%;width:1px;height:60%;background:currentColor;opacity:0.4;pointer-events:none; }
        @keyframes stPulse { 0%,100%{opacity:0.9;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.95)} }

        /* Objetivo especial — parpadea rápido y vale el doble */
        .sniper-target.bonus { animation:bonusBlink 0.3s ease-in-out infinite; }
        @keyframes bonusBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Mira */
        #sniper-scope { position:fixed;width:72px;height:72px;border:1.5px solid rgba(239,68,68,0.9);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);z-index:9999;display:none;box-shadow:0 0 0 100vmax rgba(0,0,0,0.55);transition:transform 0.04s; }
        #sniper-scope::before { content:'';position:absolute;top:50%;left:15%;width:70%;height:1px;background:rgba(239,68,68,0.7); }
        #sniper-scope::after  { content:'';position:absolute;left:50%;top:15%;width:1px;height:70%;background:rgba(239,68,68,0.7); }
        #sniper-scope-dot { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;background:#ef4444;border-radius:50%;box-shadow:0 0 6px #ef4444; }

        /* Munición */
        .ammo-rack { position:absolute;bottom:24px;right:24px;display:flex;gap:6px;pointer-events:none;z-index:9100;flex-direction:column;align-items:flex-end; }
        .ammo-mode-badge { font-size:0.58rem;color:#475569;font-family:monospace;letter-spacing:1.5px;margin-bottom:4px; }
        .ammo-shells { display:flex;gap:4px; }
        .ammo-shell { width:10px;height:30px;background:#fbbf24;border:1px solid #b45309;border-radius:2px;box-shadow:0 0 5px rgba(251,191,36,0.4);transition:all 0.2s; }
        .ammo-shell.empty { background:rgba(255,255,255,0.08);border-color:#2d3748;opacity:0.4;transform:translateY(8px) rotate(8deg); }

        /* Flash disparo */
        .muzzle-flash { position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:9150; }

        /* Hit feedback */
        .hit-feedback { position:fixed;pointer-events:none;font-family:var(--font-display);font-size:1rem;font-weight:bold;z-index:9200;animation:hitFly 0.7s ease both;text-shadow:0 0 10px currentColor; }
        @keyframes hitFly { from{opacity:1;transform:translateY(0) scale(1.2)} to{opacity:0;transform:translateY(-60px) scale(0.8)} }

        /* Miss flash */
        .miss-flash { position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(239,68,68,0.12);pointer-events:none;z-index:9149;animation:missFade 0.4s ease both; }
        @keyframes missFade { from{opacity:1} to{opacity:0} }

        /* HUD interior */
        .ns-hud { position:absolute;top:20px;left:0;right:0;display:flex;justify-content:center;gap:16px;pointer-events:none;z-index:9100; }
        .ns-stat { background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:5px 14px;display:flex;flex-direction:column;align-items:center;gap:1px; }
        .ns-stat-lbl { font-size:0.52rem;color:#475569;letter-spacing:2px;font-family:monospace; }
        .ns-stat-val { font-family:var(--font-display);font-size:0.95rem;color:white; }

        /* Recarga */
        .reload-banner { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);border:1px solid rgba(239,68,68,0.4);border-radius:10px;padding:12px 24px;color:#ef4444;font-family:var(--font-display);font-size:0.8rem;letter-spacing:2px;animation:reloadBlink 0.4s infinite;pointer-events:none;display:none;z-index:9200; }
        @keyframes reloadBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 15){
            try{window.app.showToast("FONDOS INSUFICIENTES","Costo: $15","danger");}catch(e){}
            if(this.onQuit) this.onQuit(0); return;
        }

        const modes = [
            { id:'mode-normal',    mc:'#ef4444', icon:'fa-crosshairs',  name:'CACERÍA',    desc:'Blancos estándar · 3 fallos = fin' },
            { id:'mode-precision', mc:'#3b82f6', icon:'fa-bullseye',    name:'PRECISIÓN',  desc:'Blancos pequeños · puntería importa' },
            { id:'mode-survival',  mc:'#fbbf24', icon:'fa-skull',       name:'SUPERVIVENCIA', desc:'5 fallos · velocidad creciente' },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;text-shadow:0 0 20px #ef4444;">NEON SNIPER</div>
                <div style="font-size:0.65rem;color:#ef4444;letter-spacing:3px;font-family:monospace;">PRECISIÓN TÁCTICA</div>
                <div style="width:120px;height:1px;background:#ef4444;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:165px;min-height:165px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:20px 14px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;letter-spacing:0.5px;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="btn-ns-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;

        document.getElementById('mode-normal').onclick    = ()=>this.payAndStart('NORMAL');
        document.getElementById('mode-precision').onclick = ()=>this.payAndStart('PRECISION');
        document.getElementById('mode-survival').onclick  = ()=>this.payAndStart('SURVIVAL');
        document.getElementById('btn-ns-back').onclick    = ()=>{ if(this.onQuit)this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits-=15;
        document.getElementById('val-credits').innerText=window.app.credits;
        try{this.audio.playBuy();}catch(e){}
        this.mode=mode;
        this.start();
    }

    start() {
        const cfg = TARGET_TYPES[this.mode];
        this.isRunning=true; this.score=0; this.misses=0; this.targets=[];
        this.bullets=5; this.spawnRate=cfg.spawnMs; this.lastSpawn=0;
        this.streak=0; this.totalShots=0; this.totalHits=0;
        this.maxLives = cfg.lives;

        document.body.classList.add('sniper-cursor-active');
        this.uiContainer.innerHTML = `
            <div id="sniper-stage"></div>
            <div id="sniper-scope"><div id="sniper-scope-dot"></div></div>
            <div class="muzzle-flash" id="flash"></div>
            <div class="reload-banner" id="reload-alert">RECARGANDO…</div>
            <div class="ns-hud">
                <div class="ns-stat"><div class="ns-stat-lbl">BLANCOS</div><div class="ns-stat-val" id="ns-score">0</div></div>
                <div class="ns-stat"><div class="ns-stat-lbl">RACHA</div><div class="ns-stat-val" id="ns-streak">0</div></div>
                <div class="ns-stat"><div class="ns-stat-lbl">VIDAS</div><div class="ns-stat-val" id="ns-lives" style="color:#ef4444;">${'●'.repeat(cfg.lives)}</div></div>
                <div class="ns-stat"><div class="ns-stat-lbl">PUNTERÍA</div><div class="ns-stat-val" id="ns-acc">—</div></div>
            </div>
            <div class="ammo-rack">
                <div class="ammo-mode-badge">${this.mode}</div>
                <div class="ammo-shells" id="ammo-container">${'<div class="ammo-shell"></div>'.repeat(5)}</div>
                <div style="font-size:0.6rem;color:#475569;font-family:monospace;margin-top:4px;">CLIC DER / R = RECARGAR</div>
            </div>`;

        document.getElementById('sniper-scope').style.display='block';
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleInput);
        window.addEventListener('touchstart', this.handleInput, {passive:false});
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('contextmenu', this.handleContextMenu);
        this.loop(performance.now());
    }

    handleMouseMove(e){ const s=document.getElementById('sniper-scope'); if(s){s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';} }
    handleInput(e){
        if(!this.isRunning) return;
        let x,y,right=false;
        if(e.type==='touchstart'){e.preventDefault();x=e.touches[0].clientX;y=e.touches[0].clientY;}
        else{if(e.target.tagName==='BUTTON')return;x=e.clientX;y=e.clientY;if(e.button===2)right=true;}
        if(right)this.reload();else this.shoot(x,y);
    }
    handleKeyDown(e){ if(e.key.toLowerCase()==='r')this.reload(); }
    handleContextMenu(e){ e.preventDefault(); return false; }

    shoot(x,y) {
        if(this.isReloading) return;
        if(this.bullets<=0){ try{this.audio.playTone(800,'square',0.05);}catch(e){} const ra=document.getElementById('reload-alert'); if(ra)ra.style.display='block'; return; }
        this.bullets--; this.totalShots++;
        this.updateAmmoUI();
        // Flash
        const flash=document.getElementById('flash'); if(flash){flash.style.opacity='0.4';setTimeout(()=>flash.style.opacity='0',50);}
        // Mira
        const sc=document.getElementById('sniper-scope'); if(sc){sc.style.transform='translate(-50%,-50%) scale(1.3)';setTimeout(()=>sc.style.transform='translate(-50%,-50%) scale(1)',80);}
        try{this.audio.playTone(120,'sawtooth',0.08);}catch(e){}
        // Hit test
        const els=document.elementsFromPoint(x,y);
        const hit=els.find(el=>el.classList.contains('sniper-target')||el.classList.contains('st-center')||el.classList.contains('st-ring'));
        if(hit){
            const tEl=hit.classList.contains('sniper-target')?hit:hit.closest('.sniper-target');
            if(tEl){ const id=parseFloat(tEl.dataset.id); this.eliminateTarget(id,x,y); }
        }
        this.updateAccuracy();
    }

    eliminateTarget(id,x,y) {
        const idx=this.targets.findIndex(t=>t.id===id);
        if(idx===-1) return;
        const t=this.targets[idx];
        if(t.el) t.el.remove();
        this.targets.splice(idx,1);
        this.score++; this.totalHits++; this.streak++;
        const isBonus=t.bonus;
        const pts=isBonus?2:1;
        this.score += pts-1;

        // Hit feedback
        const fb=document.createElement('div');
        fb.className='hit-feedback';
        fb.style.cssText=`left:${x}px;top:${y}px;color:${t.color};`;
        fb.textContent=isBonus?'×2!':'HIT';
        document.body.appendChild(fb);
        setTimeout(()=>fb.remove(),700);

        document.getElementById('ns-score').innerText=this.score;
        document.getElementById('ns-streak').innerText=this.streak;
        try{this.canvas.explode(x,y,t.color);}catch(e){}
        try{this.audio.playWin(this.streak>4?5:1);}catch(e){}
        if(this.spawnRate>600) this.spawnRate-=15;
    }

    spawnTarget() {
        const cfg=TARGET_TYPES[this.mode];
        const w=window.innerWidth,h=window.innerHeight,pad=120;
        const x=pad+Math.random()*(w-pad*2),y=70+Math.random()*(h-140);
        const size=cfg.sizes[Math.floor(Math.random()*cfg.sizes.length)];
        const color=cfg.colors[Math.floor(Math.random()*cfg.colors.length)];
        const isBonus=Math.random()<0.12; // 12% bonus
        const life=Math.max(1200,3200-(this.score*40));
        this.targets.push({id:Date.now()+Math.random(),x,y,size,color,isBonus,bonus:isBonus,birth:Date.now(),life,el:null});
    }

    updateAmmoUI(){
        const shells=document.querySelectorAll('.ammo-shell');
        shells.forEach((s,i)=>{ if(i<this.bullets)s.classList.remove('empty');else s.classList.add('empty'); });
    }
    updateAccuracy(){
        const pct=this.totalShots>0?Math.round((this.totalHits/this.totalShots)*100):0;
        const el=document.getElementById('ns-acc'); if(el) el.innerText=pct+'%';
    }
    updateLives(){
        const cfg=TARGET_TYPES[this.mode];
        const el=document.getElementById('ns-lives');
        if(el){ const remaining=cfg.lives-this.misses; el.innerHTML='●'.repeat(Math.max(0,remaining))+'<span style="opacity:0.2;">●</span>'.repeat(this.misses); }
    }

    reload(){
        if(this.isReloading||this.bullets===this.maxBullets) return;
        this.isReloading=true;
        const ra=document.getElementById('reload-alert'); if(ra){ra.style.display='block';}
        try{this.audio.playTone(600,'sine',0.2);}catch(e){}
        setTimeout(()=>{
            this.bullets=this.maxBullets; this.isReloading=false; this.updateAmmoUI();
            const ra2=document.getElementById('reload-alert'); if(ra2)ra2.style.display='none';
        },750);
    }

    takeDamage(){
        this.misses++; this.streak=0;
        document.getElementById('ns-streak').innerText='0';
        this.updateLives();
        // Miss flash
        const mf=document.createElement('div'); mf.className='miss-flash'; document.body.appendChild(mf); setTimeout(()=>mf.remove(),400);
        document.body.classList.add('shake-screen'); setTimeout(()=>document.body.classList.remove('shake-screen'),300);
        try{this.audio.playLose();}catch(e){}
        const cfg=TARGET_TYPES[this.mode];
        if(this.misses>=cfg.lives) this.gameOver();
    }

    loop(ts) {
        if(!this.isRunning) return;
        if(ts-this.lastSpawn>this.spawnRate){this.spawnTarget();this.lastSpawn=ts;}
        const now=Date.now();
        const stage=document.getElementById('sniper-stage');
        for(let i=this.targets.length-1;i>=0;i--){
            const t=this.targets[i];
            const age=now-t.birth, prog=age/t.life;
            if(!t.el){
                const el=document.createElement('div');
                el.className='sniper-target'+(t.isBonus?' bonus':'');
                el.dataset.id=t.id;
                el.style.cssText=`left:${t.x}px;top:${t.y}px;width:${t.size}px;height:${t.size}px;color:${t.color};background:${t.color}22;border:2px solid ${t.color};box-shadow:0 0 20px ${t.color}60;`;
                el.innerHTML=`<div class="st-ring" style="color:${t.color};border-color:${t.color};"></div><div class="st-center"></div><div class="st-cross-h"></div><div class="st-cross-v"></div>`;
                stage.appendChild(el); t.el=el;
            }
            if(prog>=1){if(t.el)t.el.remove();this.targets.splice(i,1);this.takeDamage();if(!this.isRunning)return;}
            else{
                // Reducir tamaño a medida que expira
                const cur=t.size*(1-prog*0.75);
                t.el.style.width=cur+'px';t.el.style.height=cur+'px';
                // Intensificar color al expirar
                const opacity=0.2+prog*0.6;
                t.el.style.background=`${t.color}${Math.floor(opacity*255).toString(16).padStart(2,'0')}`;
            }
        }
        this.gameLoopRef=requestAnimationFrame(t=>this.loop(t));
    }

    pause() {
        if(!this.isRunning) return;
        this._wasPaused = true;
        if(this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId = null; }
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isRunning) this.loop();
    }


    gameOver(){
        this.isRunning=false;
        if(this.gameLoopRef)cancelAnimationFrame(this.gameLoopRef);
        window.removeEventListener('mousemove',this.handleMouseMove);
        window.removeEventListener('mousedown',this.handleInput);
        window.removeEventListener('touchstart',this.handleInput);
        window.removeEventListener('keydown',this.handleKeyDown);
        window.removeEventListener('contextmenu',this.handleContextMenu);
        document.body.classList.remove('sniper-cursor-active');
        if(this.onQuit) this.onQuit(this.score);
    }
}

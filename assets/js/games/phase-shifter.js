import { CONFIG } from '../config.js';

export class PhaseShifterGame {
    constructor(canvas, audio, onQuit) {
        this.audio = audio; this.onQuit = onQuit;
        this.score = 0; this.isRunning = false;
        this.cursorPos = 50; this.speed = 1.5; this.direction = 1;
        this.zoneWidth = 30; this.animationId = null;
        this.mode = 'STANDARD';
        this.lives = 3;             // Modo survival
        this.multiZone = false;     // Modo MULTI: múltiples zonas
        this.zones = [];            // [{center, width}]
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.handleInput = this.handleInput.bind(this);
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('phase-styles-v2')) return;
        const s = document.createElement('style');
        s.id = 'phase-styles-v2';
        s.innerHTML = `
        .ps-root { display:flex;flex-direction:column;align-items:center;justify-content:center;height:calc(100vh - 56px);gap:16px;width:100%;padding:20px;box-sizing:border-box; }
        .ps-score-big { font-family:var(--font-display);font-size:5rem;line-height:1;color:#ec4899;text-shadow:0 0 30px rgba(236,72,153,0.6);transition:transform 0.1s; }
        .ps-score-big.pop { transform:scale(1.25) !important; }
        .ps-track { width:100%;max-width:620px;height:64px;background:rgba(255,255,255,0.03);border:1.5px solid rgba(255,255,255,0.08);border-radius:32px;position:relative;overflow:hidden; }
        .ps-track-grid { position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:20px 100%;pointer-events:none; }
        .ps-zone { position:absolute;top:0;height:100%;left:50%;transform:translateX(-50%);transition:width 0.15s ease,background 0.1s; }
        .ps-zone-inner { position:absolute;inset:0;border-left:2px solid #ec4899;border-right:2px solid #ec4899;background:rgba(236,72,153,0.2);box-shadow:0 0 16px rgba(236,72,153,0.35);border-radius:inherit; }
        .ps-zone.hit .ps-zone-inner { background:rgba(255,255,255,0.7);box-shadow:0 0 30px white; }
        .ps-zone.miss .ps-zone-inner { background:rgba(239,68,68,0.3);border-color:#ef4444; }
        .ps-cursor { position:absolute;top:0;bottom:0;width:5px;background:#fff;box-shadow:0 0 18px white,0 0 6px white;transform:translateX(-50%);z-index:10;border-radius:3px; }
        .ps-cursor-trail { position:absolute;top:0;bottom:0;width:20px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15));transform:translateX(-100%);z-index:9;border-radius:3px; }
        .ps-lives { display:flex;gap:6px;align-items:center; }
        .ps-heart { width:14px;height:14px;color:#ec4899;font-size:0.85rem;transition:all 0.2s; }
        .ps-heart.lost { color:#334155;transform:scale(0.7); }
        .ps-info { font-size:0.62rem;color:#334155;font-family:monospace;letter-spacing:2px;text-transform:uppercase; }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 10){ try{window.app.showToast("FONDOS INSUFICIENTES","Costo: $10","danger");}catch(e){} if(this.onQuit)this.onQuit(0); return; }

        const modes = [
            { id:'ps-classic', mc:'#ec4899', icon:'fa-minus',          name:'CLÁSICO',     desc:'Zona se estrecha' },
            { id:'ps-survival',mc:'#ef4444', icon:'fa-heart',          name:'SURVIVAL',    desc:'3 vidas · más rápido' },
            { id:'ps-multi',   mc:'#a855f7', icon:'fa-grip-horizontal', name:'MULTI-ZONA', desc:'Varias zonas válidas' },
        ];

        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">PHASE SHIFTER</div>
                <div style="font-size:0.65rem;color:#ec4899;letter-spacing:3px;font-family:monospace;">DETÉN EN EL CENTRO</div>
                <div style="width:120px;height:1px;background:#ec4899;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:155px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.78rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;letter-spacing:1px;text-transform:uppercase;text-align:center;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="ps-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        modes.forEach(m => { document.getElementById(m.id).onclick = () => this.payAndStart(m.id.replace('ps-','')); });
        document.getElementById('ps-back').onclick = () => { if(this.onQuit)this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        try{ this.audio.playBuy(); }catch(e){}
        this.mode = mode==='classic'?'CLASSIC':mode==='survival'?'SURVIVAL':'MULTI';
        this.start();
    }

    start() {
        this.isRunning = true; this.score = 0; this.lives = 3;
        this.speed = this.mode==='MULTI' ? 1.2 : 1.0;
        this.zoneWidth = this.mode==='MULTI' ? 20 : 40;
        this.cursorPos = 0; this.direction = 1;
        this.multiZone = (this.mode==='MULTI');

        this.uiContainer.innerHTML = `
        <div class="ps-root">
            <div style="display:flex;align-items:center;gap:20px;">
                <div class="ps-score-big" id="ps-score">0</div>
                ${this.mode==='SURVIVAL'?`<div class="ps-lives" id="ps-lives">${'<i class="fa-solid fa-heart ps-heart"></i>'.repeat(3)}</div>`:''}
            </div>
            <div class="ps-track" id="ps-track">
                <div class="ps-track-grid"></div>
                <div class="ps-zone" id="ps-zone" style="width:${this.zoneWidth}%;"><div class="ps-zone-inner"></div></div>
                <div class="ps-cursor-trail" id="ps-trail"></div>
                <div class="ps-cursor" id="ps-cursor" style="left:0%;"></div>
            </div>
            <div class="ps-info">ESPACIO / CLICK PARA DETENER</div>
        </div>
        <div id="ps-click-layer" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9000;cursor:pointer;"></div>`;

        if(this.multiZone) this._buildMultiZones();

        const layer = document.getElementById('ps-click-layer');
        if(layer){ layer.addEventListener('mousedown', this.handleInput); layer.addEventListener('touchstart',e=>{e.preventDefault();this.handleInput(e);}); }
        window.addEventListener('keydown', this.handleInput);
        this.loop();
    }

    _buildMultiZones() {
        // 3 zonas válidas distribuidas
        this.zones = [20, 50, 80].map(c => ({center:c, width:18}));
        const track = document.getElementById('ps-track');
        document.getElementById('ps-zone').style.display = 'none';
        this.zones.forEach((z,i) => {
            const div = document.createElement('div');
            div.className = 'ps-zone'; div.id = `ps-zone-${i}`;
            div.style.cssText = `left:${z.center}%;width:${z.width}%;transform:translateX(-50%);`;
            div.innerHTML = '<div class="ps-zone-inner"></div>';
            track.appendChild(div);
        });
    }

    handleInput(e) {
        if(!this.isRunning) return;
        if(e.type==='keydown'&&e.code!=='Space') return;
        const hit = this.multiZone
            ? this.zones.some(z => this.cursorPos >= z.center-z.width/2 && this.cursorPos <= z.center+z.width/2)
            : (this.cursorPos >= 50-this.zoneWidth/2 && this.cursorPos <= 50+this.zoneWidth/2);
        if(hit) this.success(); else this.fail();
    }

    success() {
        this.score++;
        try{ this.audio.playWin(1); }catch(e){}
        const scoreEl = document.getElementById('ps-score');
        if(scoreEl){ scoreEl.classList.add('pop'); setTimeout(()=>scoreEl.classList.remove('pop'),120); scoreEl.innerText=this.score; }
        const zone = document.getElementById('ps-zone');
        if(zone){ zone.classList.add('hit'); setTimeout(()=>zone.classList.remove('hit'),120); }
        // Acelerar y estrechar
        this.speed = Math.min(4.5, this.speed+0.18);
        if(!this.multiZone) this.zoneWidth = Math.max(4, this.zoneWidth*0.88);
        const z = document.getElementById('ps-zone'); if(z) z.style.width=this.zoneWidth+'%';
        this.cursorPos = Math.random()<0.5?0:100; this.direction = this.cursorPos===0?1:-1;
    }

    fail() {
        if(!this.isRunning) return;
        const zone = document.getElementById('ps-zone'); if(zone){ zone.classList.add('miss'); setTimeout(()=>zone.classList.remove('miss'),200); }
        try{ this.audio.playLose(); }catch(e){}
        document.body.classList.add('shake-screen'); setTimeout(()=>document.body.classList.remove('shake-screen'),300);
        if(this.mode==='SURVIVAL'){
            this.lives--;
            const hearts = document.querySelectorAll('.ps-heart');
            hearts.forEach((h,i)=>{ if(i>=this.lives)h.classList.add('lost'); });
            if(this.lives<=0) this.gameOver();
        } else this.gameOver();
    }

    loop() {
        if(!this.isRunning) return;
        this.cursorPos += this.speed * this.direction;
        if(this.cursorPos>=100){this.cursorPos=100;this.direction=-1;}
        else if(this.cursorPos<=0){this.cursorPos=0;this.direction=1;}
        const cursor=document.getElementById('ps-cursor'); if(cursor) cursor.style.left=this.cursorPos+'%';
        const trail=document.getElementById('ps-trail'); if(trail){ trail.style.left=this.cursorPos+'%'; trail.style.transform=`translateX(${this.direction>0?'-100%':'0%'})`; }
        this.animationId = requestAnimationFrame(()=>this.loop());
    }

    pause() {
        if(!this.isRunning) return;
        this._wasPaused = true;
        if(this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isRunning) this.loop();
    }


    gameOver() {
        this.isRunning = false;
        if(this.animationId) cancelAnimationFrame(this.animationId);
        const layer=document.getElementById('ps-click-layer'); if(layer)layer.remove();
        window.removeEventListener('keydown', this.handleInput);
        const prize = this.score * 5;
        window.app.credits += prize; window.app.save();
        setTimeout(()=>{ if(this.onQuit)this.onQuit(this.score); },400);
    }
}

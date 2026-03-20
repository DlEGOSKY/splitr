import { CONFIG } from '../config.js';

export class VoidDodgerGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.ctx = canvas.ctx;
        this.audio = audio;
        this.onQuit = onQuit;
        this.score = 0;
        this.isRunning = false;
        this.mode = 'NORMAL';
        this.wave = 1;
        this.waveKills = 0;
        this.killsToNextWave = 8;
        this.bossActive = false;
        this.boss = null;
        this.player = { x: 0, y: 0, r: 8, speed: 1, invulnerable: false, invTimer: 0 };
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.startTime = 0;
        this.gameLoopId = null;
        this.mousePos = { x: 0, y: 0 };
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.handleMove = this.handleMove.bind(this);
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('void-styles')) return;
        const s = document.createElement('style');
        s.id = 'void-styles';
        s.innerHTML = `
            .vd-hud { position:absolute;top:70px;width:100%;text-align:center;pointer-events:none;z-index:20; }
            .vd-timer { font-family:var(--font-display);font-size:2.8rem;color:#fff;text-shadow:0 0 15px white; }
            .vd-wave-badge { font-family:var(--font-display);font-size:0.7rem;letter-spacing:3px;color:#a855f7;margin-top:4px; }
            .vd-msg { position:absolute;top:38%;width:100%;text-align:center;font-family:var(--font-display);font-size:1.8rem;color:#fbbf24;opacity:0;pointer-events:none;transition:opacity 0.3s;text-shadow:0 0 20px #fbbf24; }
            .vd-msg.show { opacity:1;animation:vdFloat 1.2s forwards; }
            .vd-boss-bar { position:absolute;top:50px;left:50%;transform:translateX(-50%);width:60%;display:none; }
            .vd-boss-bar.visible { display:block; }
            .vd-boss-lbl { font-size:0.55rem;color:#ef4444;font-family:monospace;letter-spacing:2px;text-align:center;margin-bottom:3px; }
            .vd-boss-track { height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden; }
            .vd-boss-fill { height:100%;background:#ef4444;border-radius:3px;transition:width 0.2s;box-shadow:0 0 8px #ef4444; }
            @keyframes vdFloat { 0%{transform:translateY(0);opacity:1}100%{transform:translateY(-60px);opacity:0} }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 10) {
            try { window.app.showToast('FONDOS INSUFICIENTES','Costo: $10','danger'); } catch(e) {}
            if(this.onQuit) this.onQuit(0); return;
        }
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'vd-normal', mc:'#ffffff', icon:'fa-circle',      name:'NORMAL',   desc:'Oleadas de enemigos · jefe cada 3 oleadas' },
            { id:'vd-endless',mc:'#a855f7', icon:'fa-infinity',    name:'ENDLESS',  desc:'Sin oleadas · dificultad infinita'          },
            { id:'vd-hardcore',mc:'#ef4444',icon:'fa-skull',       name:'HARDCORE', desc:'Enemigos x2 · sin power-ups'                },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;background:radial-gradient(circle,rgba(255,255,255,0.03) 0%,transparent 70%);">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">VOID DODGER</div>
                <div style="font-size:0.65rem;color:#94a3b8;letter-spacing:3px;font-family:monospace;">EVASIÓN TÁCTICA</div>
                <div style="width:120px;height:1px;background:white;margin:10px auto 0;opacity:0.2;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:160px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}50';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.4;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.76rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="vd-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('vd-normal').onclick   = () => this.payAndStart('NORMAL');
        document.getElementById('vd-endless').onclick  = () => this.payAndStart('ENDLESS');
        document.getElementById('vd-hardcore').onclick = () => this.payAndStart('HARDCORE');
        document.getElementById('vd-back').onclick     = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart(mode) {
        this.mode = mode;
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        try { this.canvas.setMood('VOID'); } catch(e) {}
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.wave = 1;
        this.waveKills = 0;
        this.killsToNextWave = this.mode === 'HARDCORE' ? 12 : 8;
        this.bossActive = false;
        this.boss = null;
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.startTime = Date.now();
        const w = this.canvas.canvas.width;
        const h = this.canvas.canvas.height;
        this.player = { x: w/2, y: h/2, r: 8, invulnerable: false, invTimer: 0 };
        this.mousePos = { x: w/2, y: h/2 };
        this.uiContainer.innerHTML = `
            <div class="vd-hud">
                <div class="vd-timer" id="vd-score">0.0</div>
                <div class="vd-wave-badge" id="vd-wave">OLEADA 1</div>
            </div>
            <div class="vd-boss-bar" id="vd-boss-bar">
                <div class="vd-boss-lbl" id="vd-boss-lbl">JEFE</div>
                <div class="vd-boss-track"><div class="vd-boss-fill" id="vd-boss-fill" style="width:100%;"></div></div>
            </div>
            <div class="vd-msg" id="vd-msg"></div>`;
        window.addEventListener('mousemove', this.handleMove);
        window.addEventListener('touchmove', this.handleMove, { passive: false });
        this.loop();
    }

    handleMove(e) {
        if(!this.isRunning) return;
        const rect = this.canvas.canvas.getBoundingClientRect();
        if(e.touches) {
            this.mousePos.x = e.touches[0].clientX - rect.left;
            this.mousePos.y = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        }
    }

    spawnEnemy(forced = false) {
        const w = this.canvas.canvas.width, h = this.canvas.canvas.height;
        let x, y, dist;
        do {
            const side = Math.floor(Math.random() * 4);
            if(side===0){x=Math.random()*w;y=-20;}
            else if(side===1){x=w+20;y=Math.random()*h;}
            else if(side===2){x=Math.random()*w;y=h+20;}
            else{x=-20;y=Math.random()*h;}
            dist = Math.hypot(x-this.player.x, y-this.player.y);
        } while(dist < 180);

        const waveMult = 1 + (this.wave - 1) * 0.12;
        const hardMult = this.mode === 'HARDCORE' ? 1.6 : 1;
        const baseSpeed = (2 + this.score * 0.08) * waveMult * hardMult;
        const angle = Math.atan2(this.player.y-y, this.player.x-x) + (Math.random()-0.5)*0.5;
        const waveColors = ['#ffffff','#ef4444','#a855f7','#f97316','#3b82f6','#10b981'];
        const color = waveColors[Math.min(this.wave-1, waveColors.length-1)];
        this.enemies.push({ x, y, vx: Math.cos(angle)*baseSpeed, vy: Math.sin(angle)*baseSpeed, r: 5+Math.random()*5, color, hp: 1 });
    }

    spawnBoss() {
        const w = this.canvas.canvas.width, h = this.canvas.canvas.height;
        const bossColors = ['#ef4444','#f97316','#a855f7','#fbbf24'];
        const color = bossColors[Math.min(Math.floor((this.wave-3)/3), bossColors.length-1)];
        this.boss = { x: w/2, y: -60, r: 28, hp: 12 + this.wave*2, maxHp: 12+this.wave*2, color, phase: 0, phaseTimer: 0 };
        this.bossActive = true;
        const bar = document.getElementById('vd-boss-bar');
        const lbl = document.getElementById('vd-boss-lbl');
        if(bar) bar.classList.add('visible');
        if(lbl) lbl.textContent = `JEFE — OLEADA ${this.wave}`;
        this.showMsg(`⚠ JEFE DETECTADO ⚠`, '#ef4444');
        try { this.audio.playWin(3); } catch(e) {}
    }

    spawnPowerUp() {
        if(this.mode === 'HARDCORE') return;
        const w = this.canvas.canvas.width, h = this.canvas.canvas.height;
        const types = ['SHIELD','SLOW','CLEAR'];
        const type = types[Math.floor(Math.random()*types.length)];
        this.powerups.push({ x: Math.random()*(w-100)+50, y: Math.random()*(h-100)+50, type, r: 14, life: 300 });
    }

    showMsg(text, color = '#fbbf24') {
        const el = document.getElementById('vd-msg');
        if(el) { el.innerText = text; el.style.color = color; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    }

    addParticles(x, y, color, count = 8) {
        for(let i = 0; i < count; i++) {
            const angle = (Math.PI*2/count)*i + Math.random()*0.5;
            const speed = 2 + Math.random()*3;
            this.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, r: 2+Math.random()*2, color, life: 30+Math.random()*20, maxLife: 50 });
        }
    }

    checkWaveProgress() {
        if(this.mode === 'ENDLESS') return;
        if(this.bossActive) return;
        if(this.waveKills >= this.killsToNextWave) {
            this.wave++;
            this.waveKills = 0;
            this.killsToNextWave = Math.floor(this.killsToNextWave * 1.2) + 2;
            const waveEl = document.getElementById('vd-wave');
            if(waveEl) waveEl.textContent = `OLEADA ${this.wave}`;
            this.showMsg(`OLEADA ${this.wave}`, '#a855f7');
            try { this.audio.playWin(2); } catch(e) {}
            // Jefe cada 3 oleadas
            if(this.wave % 3 === 0) {
                setTimeout(() => this.spawnBoss(), 1500);
            }
        }
    }

    updateBoss(ctx) {
        if(!this.boss) return;
        const b = this.boss;
        b.phaseTimer++;
        // Movimiento en fase: oscila + se acerca
        const t = b.phaseTimer * 0.02;
        b.x += Math.sin(t * 1.3) * 3;
        b.y += 0.5;
        const w = this.canvas.canvas.width, h = this.canvas.canvas.height;
        if(b.y > h * 0.35) b.y = h * 0.35; // Se detiene en 35% de altura
        if(b.x < b.r) b.x = b.r;
        if(b.x > w-b.r) b.x = w-b.r;

        // El jefe dispara enemigos pequeños cada 2s
        if(b.phaseTimer % 120 === 0) {
            const angle = Math.atan2(this.player.y-b.y, this.player.x-b.x);
            for(let i = -1; i <= 1; i++) {
                const a = angle + i * 0.3;
                this.enemies.push({ x: b.x, y: b.y, vx: Math.cos(a)*4, vy: Math.sin(a)*4, r: 5, color: b.color, hp: 1 });
            }
        }

        // Dibujar jefe
        ctx.save();
        ctx.translate(b.x, b.y);
        // Anillo pulsante
        ctx.beginPath(); ctx.arc(0, 0, b.r + 8 + Math.sin(t*5)*4, 0, Math.PI*2);
        ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.4; ctx.stroke();
        // Cuerpo
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 20; ctx.shadowColor = b.color;
        ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI*2); ctx.fill();
        // Cruz interior
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-b.r*0.6, 0); ctx.lineTo(b.r*0.6, 0); ctx.moveTo(0, -b.r*0.6); ctx.lineTo(0, b.r*0.6); ctx.stroke();
        ctx.restore();

        // Actualizar barra de vida
        const fill = document.getElementById('vd-boss-fill');
        if(fill) fill.style.width = (b.hp/b.maxHp*100)+'%';

        // Colisión jugador con jefe
        const dist = Math.hypot(b.x-this.player.x, b.y-this.player.y);
        if(dist < b.r + this.player.r) {
            if(this.player.invulnerable) {
                b.hp -= 2; this.addParticles(b.x, b.y, b.color, 6);
                if(b.hp <= 0) this.killBoss();
            } else { this.gameOver(); }
        }
    }

    killBoss() {
        this.addParticles(this.boss.x, this.boss.y, this.boss.color, 20);
        try { this.canvas.explode(this.boss.x, this.boss.y, this.boss.color); } catch(e) {}
        try { this.audio.playWin(8); } catch(e) {}
        const reward = 50 + this.wave * 20;
        window.app.credits += reward;
        window.app.save();
        this.showMsg(`JEFE ELIMINADO +${reward}CR`, '#fbbf24');
        const bar = document.getElementById('vd-boss-bar');
        if(bar) bar.classList.remove('visible');
        this.boss = null;
        this.bossActive = false;
    }

    updateAndDraw(ctx) {
        const w = this.canvas.canvas.width, h = this.canvas.canvas.height;

        // Jugador
        this.player.x += (this.mousePos.x - this.player.x) * 0.2;
        this.player.y += (this.mousePos.y - this.player.y) * 0.2;
        ctx.save(); ctx.translate(this.player.x, this.player.y);
        if(this.player.invulnerable) {
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, this.player.r+5+Math.sin(Date.now()/100)*2, 0, Math.PI*2); ctx.stroke();
            this.player.invTimer--; if(this.player.invTimer<=0) this.player.invulnerable = false;
        }
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 15; ctx.shadowColor = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, this.player.r, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Partículas
        for(let i = this.particles.length-1; i >= 0; i--) {
            const p = this.particles[i];
            p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92; p.life--;
            ctx.globalAlpha = p.life/p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r*(p.life/p.maxLife), 0, Math.PI*2); ctx.fill();
            if(p.life<=0) this.particles.splice(i,1);
        }
        ctx.globalAlpha = 1;

        // Power-ups
        for(let i = this.powerups.length-1; i >= 0; i--) {
            const p = this.powerups[i]; p.life--;
            ctx.save(); ctx.translate(p.x, p.y);
            const scale = 1+Math.sin(Date.now()/200)*0.15; ctx.scale(scale,scale);
            const pColor = p.type==='SHIELD'?'#00ffff':p.type==='SLOW'?'#10b981':'#f97316';
            ctx.fillStyle = pColor; ctx.shadowColor = pColor; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = '9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(p.type[0], 0, 0);
            ctx.restore();
            if(Math.hypot(p.x-this.player.x, p.y-this.player.y) < p.r+this.player.r) {
                if(p.type==='SHIELD') { this.player.invulnerable=true; this.player.invTimer=200; this.showMsg('¡ESCUDO!','#00ffff'); }
                else if(p.type==='SLOW') { this.enemies.forEach(e=>{e.vx*=0.45;e.vy*=0.45;}); this.showMsg('¡RALENTIZADO!','#10b981'); }
                else if(p.type==='CLEAR') { this.addParticles(w/2,h/2,'#f97316',16); this.enemies=this.enemies.slice(0,Math.floor(this.enemies.length/2)); this.showMsg('¡CAMPO LIMPIADO!','#f97316'); }
                try{this.audio.playWin(1);}catch(e){}
                this.powerups.splice(i,1); continue;
            }
            if(p.life<=0) this.powerups.splice(i,1);
        }

        // Jefe
        if(this.bossActive && this.boss) this.updateBoss(ctx);

        // Enemigos
        for(let i = this.enemies.length-1; i >= 0; i--) {
            const e = this.enemies[i]; e.x+=e.vx; e.y+=e.vy;
            ctx.fillStyle = e.color; ctx.shadowBlur = 8; ctx.shadowColor = e.color;
            ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            const dist = Math.hypot(e.x-this.player.x, e.y-this.player.y);
            if(dist < e.r+this.player.r) {
                if(this.player.invulnerable) {
                    this.addParticles(e.x, e.y, e.color, 5);
                    this.enemies.splice(i,1);
                    this.waveKills++;
                    this.checkWaveProgress();
                    try{this.audio.playTone(200,'square',0.05);}catch(e){}
                } else { this.gameOver(); return; }
                continue;
            }
            if(e.x<-60||e.x>w+60||e.y<-60||e.y>h+60) { this.enemies.splice(i,1); }
        }
    }

    loop() {
        if(!this.isRunning) return;
        this.score = (Date.now()-this.startTime)/1000;
        const scoreEl = document.getElementById('vd-score');
        if(scoreEl) scoreEl.innerText = this.score.toFixed(1);

        const hardMult = this.mode==='HARDCORE' ? 2 : 1;
        const waveMult = 1+(this.wave-1)*0.15;
        const spawnChance = Math.min(0.12, (0.02+this.score*0.003)*waveMult*hardMult);
        if(Math.random()<spawnChance) this.spawnEnemy();
        if(Math.random()<0.004 && !this.mode==='HARDCORE') this.spawnPowerUp();

        this.ctx.fillStyle = 'rgba(0,0,0,0.12)'; this.ctx.fillRect(0,0,this.canvas.canvas.width,this.canvas.canvas.height);
        this.updateAndDraw(this.ctx);
        this.gameLoopId = requestAnimationFrame(()=>this.loop());
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

    gameOver() {
        this.isRunning = false;
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        window.removeEventListener('mousemove', this.handleMove);
        window.removeEventListener('touchmove', this.handleMove);
        try { this.audio.playLose(); } catch(e) {}
        try { this.canvas.explode(this.player.x, this.player.y, '#fff'); } catch(e) {}
        const finalScore = Math.floor(this.score * 10) + (this.wave-1)*50;
        const bonusCredits = Math.floor(this.score * 2) + (this.wave-1)*10;
        window.app.credits += bonusCredits;
        window.app.save();
        if(this.onQuit) this.onQuit(finalScore);
    }
}

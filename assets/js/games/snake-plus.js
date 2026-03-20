import { CONFIG } from '../config.js';

export class SnakePlusGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas     = canvas;
        this.ctx        = canvas.ctx;
        this.audio      = audio;
        this.onGameOver = onGameOver;
        this.animId     = null;
        this.mode       = 'NORMAL';
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('snake-styles')) return;
        const s = document.createElement('style');
        s.id = 'snake-styles';
        s.innerHTML = `
            .sp-hud { position:absolute;top:70px;left:0;right:0;display:flex;justify-content:center;gap:32px;pointer-events:none;z-index:20; }
            .sp-hud-item { text-align:center; }
            .sp-hud-val { font-family:var(--font-display);font-size:1.4rem;color:white; }
            .sp-hud-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
        `;
        document.head.appendChild(s);
    }

    init() {
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'sp-classic', mc:'#10b981', icon:'fa-snake',       name:'CLÁSICO',   desc:'Snake tradicional · manzanas' },
            { id:'sp-turbo',   mc:'#f97316', icon:'fa-forward-fast', name:'TURBO',     desc:'Velocidad creciente · x2 pts' },
            { id:'sp-portal',  mc:'#a855f7', icon:'fa-circle-dot',   name:'PORTALES',  desc:'Teletransportación + power-ups' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">SNAKE <span style="color:#10b981;">++</span></div>
                <div style="font-size:0.65rem;color:#10b981;letter-spacing:3px;font-family:monospace;">PROTOCOLO SERPIENTE</div>
                <div style="width:120px;height:1px;background:#10b981;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="sp-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('sp-classic').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('sp-turbo').onclick   = () => this.startWithMode('TURBO');
        document.getElementById('sp-portal').onclick  = () => this.startWithMode('PORTAL');
        document.getElementById('sp-back').onclick    = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode = mode;
        try { this.canvas.setMood('BIO'); } catch(e) {}
        this.uiContainer.innerHTML = `
            <div class="sp-hud">
                <div class="sp-hud-item"><div class="sp-hud-val" id="sp-score">0</div><div class="sp-hud-lbl">PUNTOS</div></div>
                <div class="sp-hud-item"><div class="sp-hud-val" id="sp-length" style="color:#10b981;">1</div><div class="sp-hud-lbl">LONGITUD</div></div>
                <div class="sp-hud-item"><div class="sp-hud-val" id="sp-level" style="color:#f97316;">1</div><div class="sp-hud-lbl">NIVEL</div></div>
            </div>`;

        const W = this.canvas.canvas.width;
        const H = this.canvas.canvas.height;
        this.CELL = 20;
        this.COLS = Math.floor(W / this.CELL);
        this.ROWS = Math.floor(H / this.CELL);
        this.score    = 0;
        this.level    = 1;
        this.dir      = { x: 1, y: 0 };
        this.nextDir  = { x: 1, y: 0 };
        this.snake    = [
            { x: Math.floor(this.COLS/2), y: Math.floor(this.ROWS/2) },
            { x: Math.floor(this.COLS/2)-1, y: Math.floor(this.ROWS/2) },
            { x: Math.floor(this.COLS/2)-2, y: Math.floor(this.ROWS/2) },
        ];
        this.food     = [];
        this.powerups = [];
        this.portals  = [];
        this.particles= [];
        this.tickMs   = mode === 'TURBO' ? 90 : 120;
        this.lastTick = 0;
        this.alive    = true;
        this.spawnFood();
        if(mode === 'PORTAL') this.spawnPortals();

        this.keyHandler = (e) => {
            const map = { ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
                          w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0},
                          W:{x:0,y:-1}, S:{x:0,y:1}, A:{x:-1,y:0}, D:{x:1,y:0} };
            const nd = map[e.key];
            if(nd && !(nd.x === -this.dir.x && nd.y === -this.dir.y)) {
                this.nextDir = nd;
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', this.keyHandler);
        this.loop();
    }

    spawnFood(count = 1) {
        for(let i = 0; i < count; i++) {
            let pos;
            do { pos = { x: Math.floor(Math.random()*this.COLS), y: Math.floor(Math.random()*this.ROWS) }; }
            while(this.snake.some(s=>s.x===pos.x&&s.y===pos.y));
            this.food.push({ x: pos.x, y: pos.y, pulse: 0 });
        }
    }

    spawnPortals() {
        const c = this.CELL;
        const pA = { x: 3, y: 3, pair: 1, color: '#3b82f6' };
        const pB = { x: this.COLS-4, y: this.ROWS-4, pair: 1, color: '#f97316' };
        this.portals = [pA, pB];
    }

    spawnPowerUp() {
        const types = [
            { t:'SPEED',  color:'#fbbf24', icon:'⚡', label:'VELOCIDAD' },
            { t:'SLOW',   color:'#3b82f6', icon:'❄',  label:'LENTO'     },
            { t:'DOUBLE', color:'#a855f7', icon:'×2', label:'DOBLE'     },
        ];
        const pick = types[Math.floor(Math.random()*types.length)];
        let pos;
        do { pos = { x: Math.floor(Math.random()*this.COLS), y: Math.floor(Math.random()*this.ROWS) }; }
        while(this.snake.some(s=>s.x===pos.x&&s.y===pos.y));
        this.powerups.push({ ...pos, ...pick, life: 200 });
    }

    addParticles(px, py, color, n=8) {
        for(let i=0;i<n;i++) {
            const a=(Math.PI*2/n)*i; const sp=1+Math.random()*2;
            this.particles.push({ x:px,y:py, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:3, color, life:20+Math.random()*15, maxLife:35 });
        }
    }

    update() {
        this.dir = { ...this.nextDir };
        const head = { x: (this.snake[0].x + this.dir.x + this.COLS) % this.COLS,
                       y: (this.snake[0].y + this.dir.y + this.ROWS) % this.ROWS };

        // Portal teleport
        if(this.mode === 'PORTAL') {
            const portal = this.portals.find(p => p.x === head.x && p.y === head.y);
            if(portal) {
                const other = this.portals.find(p => p.pair === portal.pair && p !== portal);
                if(other) { head.x = other.x; head.y = other.y; }
                try { this.audio.playTone(600,'sine',0.1); } catch(e) {}
            }
        }

        // Self collision
        if(this.snake.some(s => s.x===head.x && s.y===head.y)) { this.die(); return; }

        this.snake.unshift(head);
        let grew = false;

        // Food check
        const fi = this.food.findIndex(f => f.x===head.x && f.y===head.y);
        if(fi !== -1) {
            this.food.splice(fi, 1);
            const pts = this.mode==='TURBO' ? this.level*2 : this.level;
            this.score += pts;
            grew = true;
            this.addParticles(head.x*this.CELL+this.CELL/2, head.y*this.CELL+this.CELL/2, '#10b981');
            try { this.audio.playTone(440+this.score*2,'sine',0.1); } catch(e) {}
            this.spawnFood();
            if(this.food.length === 0) this.spawnFood(); // safety

            // Subir nivel
            if(this.score > 0 && this.score % (this.mode==='TURBO' ? 8 : 5) === 0) {
                this.level++;
                this.tickMs = Math.max(50, this.tickMs - 5);
                if(this.mode==='PORTAL' && Math.random()<0.5) this.spawnPowerUp();
                try { this.audio.playWin(1); } catch(e) {}
            }
            this.updateHUD();
        }

        // Powerup check
        const pi = this.powerups.findIndex(p => p.x===head.x && p.y===head.y);
        if(pi !== -1) {
            const pu = this.powerups[pi];
            this.powerups.splice(pi,1);
            this.addParticles(head.x*this.CELL+this.CELL/2, head.y*this.CELL+this.CELL/2, pu.color, 10);
            if(pu.t==='SPEED')  { this.tickMs = Math.max(40, this.tickMs-20); setTimeout(()=>{this.tickMs+=20;},5000); }
            if(pu.t==='SLOW')   { this.tickMs += 40; setTimeout(()=>{this.tickMs-=40;},5000); }
            if(pu.t==='DOUBLE') { this.score += this.level; grew = true; }
            try { this.audio.playWin(2); window.app.showToast(pu.label,'Power-up activado','success'); } catch(e) {}
        }

        if(!grew) this.snake.pop();

        // Powerup decay
        for(let i=this.powerups.length-1;i>=0;i--){ this.powerups[i].life--; if(this.powerups[i].life<=0) this.powerups.splice(i,1); }
    }

    updateHUD() {
        const sc = document.getElementById('sp-score');    if(sc) sc.innerText = this.score;
        const ln = document.getElementById('sp-length');   if(ln) ln.innerText = this.snake.length;
        const lv = document.getElementById('sp-level');    if(lv) lv.innerText = this.level;
    }

    draw() {
        const ctx = this.ctx;
        const C = this.CELL;
        const W = this.canvas.canvas.width;
        const H = this.canvas.canvas.height;
        ctx.fillStyle = 'rgba(5,8,18,0.85)';
        ctx.fillRect(0, 0, W, H);

        // Grid sutil
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 0.5;
        for(let x=0;x<=this.COLS;x++) { ctx.beginPath(); ctx.moveTo(x*C,0); ctx.lineTo(x*C,H); ctx.stroke(); }
        for(let y=0;y<=this.ROWS;y++) { ctx.beginPath(); ctx.moveTo(0,y*C); ctx.lineTo(W,y*C); ctx.stroke(); }

        // Portales
        this.portals.forEach(p => {
            const px = p.x*C+C/2, py = p.y*C+C/2;
            ctx.beginPath(); ctx.arc(px,py,C*0.45,0,Math.PI*2);
            ctx.fillStyle = p.color+'22'; ctx.fill();
            ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke();
            ctx.font = `${C*0.5}px monospace`; ctx.fillStyle = p.color;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText('⬤', px, py);
        });

        // Power-ups
        this.powerups.forEach(p => {
            const px = p.x*C+C/2, py = p.y*C+C/2;
            const pulse = Math.sin(Date.now()*0.006)*0.15+0.85;
            ctx.save(); ctx.translate(px,py); ctx.scale(pulse,pulse);
            ctx.fillStyle = p.color+'33'; ctx.strokeStyle = p.color; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.roundRect(-C*0.4,-C*0.4,C*0.8,C*0.8,4); ctx.fill(); ctx.stroke();
            ctx.font = `${C*0.45}px monospace`; ctx.fillStyle = p.color;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(p.icon, 0, 1);
            ctx.restore();
        });

        // Comida
        this.food.forEach(f => {
            f.pulse = (f.pulse || 0) + 0.08;
            const px = f.x*C+C/2, py = f.y*C+C/2;
            const scale = 1+Math.sin(f.pulse)*0.12;
            ctx.save(); ctx.translate(px,py); ctx.scale(scale,scale);
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
            ctx.beginPath(); ctx.arc(0,0,C*0.32,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        });

        // Serpiente
        this.snake.forEach((seg, i) => {
            const t = 1 - i/this.snake.length;
            const green = Math.floor(155 + t*100);
            const px = seg.x*C, py = seg.y*C;
            ctx.fillStyle = i===0 ? '#fff' : `rgb(0,${green},60)`;
            ctx.shadowBlur = i===0 ? 12 : 4;
            ctx.shadowColor = i===0 ? '#fff' : '#10b981';
            ctx.beginPath();
            ctx.roundRect(px+1, py+1, C-2, C-2, i===0?5:3);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Partículas
        for(let i=this.particles.length-1;i>=0;i--) {
            const p = this.particles[i];
            p.x+=p.vx; p.y+=p.vy; p.life--;
            ctx.globalAlpha = p.life/p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(p.life/p.maxLife),0,Math.PI*2); ctx.fill();
            if(p.life<=0) this.particles.splice(i,1);
        }
        ctx.globalAlpha = 1;
    }

    loop(ts=0) {
        if(!this.alive) return;
        if(ts - this.lastTick >= this.tickMs) {
            this.update();
            this.lastTick = ts;
        }
        this.draw();
        this.animId = requestAnimationFrame(t => this.loop(t));
    }

    die() {
        this.alive = false;
        if(this.animId) cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.keyHandler);
        try { this.audio.playLose(); } catch(e) {}
        try { this.canvas.explode(
            this.snake[0].x*this.CELL+this.CELL/2,
            this.snake[0].y*this.CELL+this.CELL/2, '#10b981'); } catch(e) {}
        setTimeout(() => { if(this.onGameOver) this.onGameOver(this.score); }, 800);
    }

    pause() {
        if(!this.alive) return;
        this._paused = true;
        if(this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        this.loop();
    }
    cleanup() {
        if(this.animId) cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.keyHandler);
    }
}

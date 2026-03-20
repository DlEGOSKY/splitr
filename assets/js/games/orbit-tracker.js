import { CONFIG } from '../config.js';

export class OrbitTrackerGame {
    constructor(canvas, audio, onQuit) {
        this.bgCanvas = canvas;  // referencia al CanvasManager (para explosiones)
        this.audio = audio;
        this.onQuit = onQuit;
        this.score = 0;
        this.startTime = 0;
        this.isRunning = false;
        this.animationId = null;
        this.mouseX = 0; this.mouseY = 0;
        this.orbs = [];           // múltiples orbes
        this.energy = 60;
        this.mode = 'STANDARD';
        this.level = 1;
        this.lockedCount = 0;     // orbes en lock simultáneo
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.handleMove = this.handleMove.bind(this);
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('ot-styles')) return;
        const s = document.createElement('style');
        s.id = 'ot-styles';
        s.innerHTML = `
        .ot-canvas { position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none; }
        .ot-hud { position:absolute;top:16px;left:0;right:0;display:flex;justify-content:center;gap:14px;pointer-events:none;z-index:10; }
        .ot-stat { background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:5px 14px;display:flex;flex-direction:column;align-items:center;gap:1px; }
        .ot-stat-lbl { font-size:0.52rem;color:#475569;letter-spacing:2px;font-family:monospace;text-transform:uppercase; }
        .ot-stat-val { font-family:var(--font-display);font-size:0.9rem;color:white; }
        .ot-energy-track { width:180px;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden; }
        .ot-energy-fill { height:100%;border-radius:4px;transition:width 0.1s,background 0.3s; }
        `;
        document.head.appendChild(s);
    }

    init() {
        if(window.app.credits < 10){
            try{ window.app.showToast("FONDOS INSUFICIENTES","Costo: $10","danger"); }catch(e){}
            if(this.onQuit) this.onQuit(0); return;
        }
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'ot-std',   mc:'#22d3ee', icon:'fa-circle-nodes', name:'ESTÁNDAR',  desc:'Un orbe · mantén el cursor encima' },
            { id:'ot-multi', mc:'#a855f7', icon:'fa-atom',         name:'MULTIORBE', desc:'Hasta 3 orbes simultáneos' },
            { id:'ot-chaos', mc:'#ef4444', icon:'fa-tornado',      name:'CAOS',      desc:'Velocidad extrema · orbes que se dividen' },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">ORBIT TRACKER</div>
                <div style="font-size:0.65rem;color:#22d3ee;letter-spacing:3px;font-family:monospace;">SEGUIMIENTO ORBITAL</div>
                <div style="width:120px;height:1px;background:#22d3ee;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:165px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.75rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="ot-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('ot-std').onclick   = () => this.payAndStart('STANDARD');
        document.getElementById('ot-multi').onclick = () => this.payAndStart('MULTI');
        document.getElementById('ot-chaos').onclick = () => this.payAndStart('CHAOS');
        document.getElementById('ot-back').onclick  = () => { if(this.onQuit) this.onQuit(0); };
    }

    payAndStart(mode) {
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        try{ this.audio.playBuy(); }catch(e){}
        this.mode = mode;
        this.start();
    }

    start() {
        this.isRunning = true; this.score = 0; this.energy = 60; this.level = 1; this.lockedCount = 0;
        this.startTime = Date.now();

        // Crear canvas propio para este juego (no el de fondo)
        this.uiContainer.innerHTML = `
            <canvas class="ot-canvas" id="ot-canvas"></canvas>
            <div class="ot-hud">
                <div class="ot-stat">
                    <div class="ot-stat-lbl">TIEMPO</div>
                    <div class="ot-stat-val" id="ot-score">0.0s</div>
                </div>
                <div class="ot-stat">
                    <div class="ot-stat-lbl">ENERGÍA</div>
                    <div class="ot-energy-track">
                        <div class="ot-energy-fill" id="ot-energy" style="width:60%;background:#22d3ee;"></div>
                    </div>
                </div>
                <div class="ot-stat">
                    <div class="ot-stat-lbl">LOCKS</div>
                    <div class="ot-stat-val" id="ot-locks" style="color:#22d3ee;">0</div>
                </div>
            </div>`;

        const cvs = document.getElementById('ot-canvas');
        cvs.width  = window.innerWidth;
        cvs.height = window.innerHeight;
        this.ctx   = cvs.getContext('2d');

        // Inicializar orbes según modo
        const maxOrbs = this.mode === 'MULTI' ? 1 : this.mode === 'CHAOS' ? 2 : 1;
        this.orbs = [];
        for(let i = 0; i < maxOrbs; i++) this.spawnOrb();

        this.mouseX = cvs.width/2;
        this.mouseY = cvs.height/2;

        window.addEventListener('mousemove', this.handleMove);
        window.addEventListener('touchmove', this.handleMove, {passive:false});
        this.loop();
    }

    spawnOrb() {
        const W = this.ctx?.canvas?.width || window.innerWidth;
        const H = this.ctx?.canvas?.height || window.innerHeight;
        const pad = 80;
        const speed = this.mode === 'CHAOS' ? 3 + this.level*0.5 : 1.5 + this.level*0.2;
        this.orbs.push({
            x: pad + Math.random()*(W-pad*2),
            y: pad + Math.random()*(H-pad*2),
            tx: pad + Math.random()*(W-pad*2),
            ty: pad + Math.random()*(H-pad*2),
            radius: this.mode === 'CHAOS' ? 28 : 40,
            speed: speed,
            isLocked: false,
            lockTime: 0,
            color: ['#22d3ee','#a855f7','#10b981','#f97316'][this.orbs.length % 4],
            pulse: 0
        });
    }

    handleMove(e) {
        if(!this.isRunning) return;
        const cvs = document.getElementById('ot-canvas');
        if(!cvs) return;
        const rect = cvs.getBoundingClientRect();
        if(e.touches){
            this.mouseX = e.touches[0].clientX - rect.left;
            this.mouseY = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        }
    }

    loop() {
        if(!this.isRunning) return;
        const ctx = this.ctx;
        const W = ctx.canvas.width, H = ctx.canvas.height;
        const pad = 80;
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000;

        // Clear
        ctx.clearRect(0,0,W,H);

        this.lockedCount = 0;
        let totalEnergy = 0;

        this.orbs.forEach((orb, i) => {
            // Mover orbe hacia destino
            const dx = orb.tx - orb.x, dy = orb.ty - orb.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const spd = orb.speed * (1 + this.level * 0.05);
            orb.x += (dx/dist) * spd;
            orb.y += (dy/dist) * spd;

            // Nuevo destino cuando llega
            if(dist < spd + 5){
                orb.tx = pad + Math.random()*(W-pad*2);
                orb.ty = pad + Math.random()*(H-pad*2);
            }

            // Detectar lock
            const dMouse = Math.sqrt((this.mouseX-orb.x)**2 + (this.mouseY-orb.y)**2);
            orb.isLocked = dMouse < orb.radius;
            if(orb.isLocked){
                this.lockedCount++;
                orb.lockTime += 1/60;
                orb.pulse = Math.sin(now/200) * 0.3 + 0.7;
                totalEnergy += 1.2;
                // Micro explosión ocasional
                if(Math.random() > 0.97 && this.bgCanvas){
                    try{ this.bgCanvas.explode(orb.x, orb.y, orb.color); }catch(e){}
                }
            } else {
                orb.pulse = 0;
                totalEnergy -= 1.0 / this.orbs.length;
            }

            // Dibujar estela
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius + 15, 0, Math.PI*2);
            ctx.strokeStyle = orb.color + '20';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Orbe principal
            const glowSize = orb.isLocked ? 25 : 8;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI*2);
            ctx.shadowBlur = glowSize;
            ctx.shadowColor = orb.color;
            ctx.fillStyle = orb.isLocked ? orb.color + '50' : orb.color + '15';
            ctx.fill();
            ctx.strokeStyle = orb.color;
            ctx.lineWidth = orb.isLocked ? 3 : 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Cruz de mira dentro del orbe
            if(orb.isLocked){
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.globalAlpha = orb.pulse;
                ctx.beginPath(); ctx.moveTo(orb.x-12,orb.y); ctx.lineTo(orb.x+12,orb.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(orb.x,orb.y-12); ctx.lineTo(orb.x,orb.y+12); ctx.stroke();
                ctx.globalAlpha = 1;

                // Línea cursor → orbe
                ctx.beginPath();
                ctx.moveTo(this.mouseX, this.mouseY);
                ctx.lineTo(orb.x, orb.y);
                ctx.strokeStyle = orb.color + '40';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });

        // Cursor
        ctx.beginPath();
        ctx.arc(this.mouseX, this.mouseY, 6, 0, Math.PI*2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
        ctx.fill(); ctx.shadowBlur = 0;

        // Actualizar energía
        this.energy = Math.max(0, Math.min(100, this.energy + totalEnergy));
        this.score = elapsed;

        // Subir nivel
        if(elapsed > this.level * 10){
            this.level++;
            if(this.mode === 'MULTI' && this.orbs.length < 3) this.spawnOrb();
            try{ window.app.showToast(`NIVEL ${this.level}`, 'Velocidad aumentada', 'default'); }catch(e){}
        }

        // Actualizar HUD
        const scoreEl = document.getElementById('ot-score');
        if(scoreEl) scoreEl.innerText = elapsed.toFixed(1)+'s';
        const energyEl = document.getElementById('ot-energy');
        if(energyEl){ energyEl.style.width = this.energy+'%'; energyEl.style.background = this.energy<25?'#ef4444':this.energy<50?'#f97316':'#22d3ee'; }
        const locksEl = document.getElementById('ot-locks');
        if(locksEl) locksEl.innerText = this.lockedCount + '/' + this.orbs.length;

        if(this.energy <= 0){ this.gameOver(); return; }

        this.animationId = requestAnimationFrame(() => this.loop());
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
        window.removeEventListener('mousemove', this.handleMove);
        window.removeEventListener('touchmove', this.handleMove);
        try{ this.audio.playLose(); }catch(e){}
        if(this.onQuit) this.onQuit(parseFloat(this.score.toFixed(1)));
    }
}

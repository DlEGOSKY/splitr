import { CONFIG } from '../config.js';

export class BioScanGame {
    // NOTA: Cambié el nombre del argumento 'onQuit' a 'onGameOver' para que tenga sentido semántico
    constructor(canvas, audio, onGameOver) {
        this.canvas = canvas;
        this.audio = audio;
        this.onGameOver = onGameOver; // Esta es la función inteligente del main
        this.breeds = [];
        this.currentBreed = null;
        this.timerInterval = null;
        this.score = 0;
        this.isProcessing = false;
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('bio-styles')) return;
        const style = document.createElement('style');
        style.id = 'bio-styles';
        // ... (MISMOS ESTILOS QUE YA TENÍAS, NO CAMBIAN) ...
        style.innerHTML = `
            .bio-scanner-frame { position: relative; width: 280px; height: 280px; border: 2px solid #84cc16; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 0 20px rgba(132, 204, 22, 0.2); background: #000; }
            .bio-image { width: 100%; height: 100%; object-fit: cover; filter: sepia(100%) hue-rotate(50deg) saturate(300%) blur(10px); transition: filter 0.1s linear; }
            .bio-laser { position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: #84cc16; box-shadow: 0 0 15px #84cc16; animation: scanMove 2s linear infinite; z-index: 10; opacity: 0.8; }
            @keyframes scanMove { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
            .bio-hud-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; background: linear-gradient(to right, #84cc16 2px, transparent 2px) 0 0, linear-gradient(to bottom, #84cc16 2px, transparent 2px) 0 0, linear-gradient(to left, #84cc16 2px, transparent 2px) 100% 0, linear-gradient(to bottom, #84cc16 2px, transparent 2px) 100% 0, linear-gradient(to left, #84cc16 2px, transparent 2px) 100% 100%, linear-gradient(to top, #84cc16 2px, transparent 2px) 100% 100%, linear-gradient(to right, #84cc16 2px, transparent 2px) 0 100%, linear-gradient(to top, #84cc16 2px, transparent 2px) 0 100%; background-size: 20px 20px; background-repeat: no-repeat; opacity: 0.5; }
            .bio-option-btn { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(132, 204, 22, 0.3); color: #a3e635; padding: 15px; font-size: 0.9rem; text-transform: uppercase; cursor: pointer; transition: all 0.2s; border-radius: 4px; }
            .bio-option-btn:hover:not(:disabled) { background: rgba(132, 204, 22, 0.2); box-shadow: 0 0 15px rgba(132, 204, 22, 0.4); border-color: #84cc16; color: white; }
            .bio-option-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.8); }
            .bio-option-btn.correct { background: #10b981 !important; color: black !important; border-color: #fff !important; box-shadow: 0 0 20px #10b981; }
            .bio-option-btn.wrong { background: #ef4444 !important; color: white !important; animation: shake 0.3s; }
        `;
        document.head.appendChild(style);
    }

    async init() {
        if(window.app.credits < 20){
            try{ window.app.showToast("FONDOS INSUFICIENTES","Costo: $20","danger"); }catch(e){}
            if(this.onGameOver) this.onGameOver(0); return;
        }
        this.showModeSelect();
    }

    showModeSelect() {
        const modes = [
            { id:'bs-normal', mc:'#84cc16', icon:'fa-dna',      name:'ANÁLISIS',   desc:'Identifica la raza · desenfoque lento' },
            { id:'bs-speed',  mc:'#fbbf24', icon:'fa-bolt',     name:'VELOCIDAD',  desc:'Timer reducido · respuesta rápida'     },
            { id:'bs-expert', mc:'#ef4444', icon:'fa-flask',    name:'EXPERTO',    desc:'6 opciones · doble dificultad'         },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">BIO-SCAN</div>
                <div style="font-size:0.65rem;color:#84cc16;letter-spacing:3px;font-family:monospace;">IDENTIFICACIÓN BIOLÓGICA</div>
                <div style="width:120px;height:1px;background:#84cc16;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="bs-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('bs-normal').onclick = () => this.payAndStart('NORMAL');
        document.getElementById('bs-speed').onclick  = () => this.payAndStart('SPEED');
        document.getElementById('bs-expert').onclick = () => this.payAndStart('EXPERT');
        document.getElementById('bs-back').onclick   = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    async payAndStart(mode) {
        this.mode = mode;
        this.optionCount = mode === 'EXPERT' ? 6 : 4;
        this.timerSpeed = mode === 'SPEED' ? 1.2 : 0.5;

        if(this.breeds.length === 0) {
            this.uiContainer.innerHTML = '<div class="loader"></div><p style="margin-top:10px;color:var(--bio)">CARGANDO BASE DE DATOS...</p>';
            try {
                const res = await fetch('https://dog.ceo/api/breeds/list/all');
                const data = await res.json();
                this.breeds = Object.keys(data.message);
            } catch(e) {
                this.uiContainer.innerHTML = '<p style="color:var(--accent)">ERROR DE RED.</p>';
                setTimeout(() => { if(this.onGameOver) this.onGameOver(0); }, 2000);
                return;
            }
        }

        window.app.credits -= 20;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.audio.playBuy();
        try{ this.canvas.setMood('BIO'); }catch(e){}
        this.score = 0;
        this.nextRound();
    }

    // ... (nextRound, formatBreed, render, startTimer SON IGUALES, COPIALOS DE TU CÓDIGO ANTERIOR) ...
    async nextRound() {
        this.isProcessing = false;
        clearInterval(this.timerInterval);
        this.uiContainer.innerHTML = '<div class="loader"></div><p style="margin-top:10px; color:var(--bio)">ANALIZANDO ADN...</p>';
        try {
            const res = await fetch('https://dog.ceo/api/breeds/image/random');
            const data = await res.json();
            const breedPart = data.message.split('/breeds/')[1].split('/')[0];
            this.currentBreed = breedPart; 
            const options = [breedPart];
            while(options.length < (this.optionCount||4)) {
                const r = this.breeds[Math.floor(Math.random() * this.breeds.length)];
                if(!options.includes(r)) options.push(r);
            }
            options.sort(() => Math.random() - 0.5);
            this.render(data.message, options);
        } catch(e) {
            if(this.onGameOver) this.onGameOver(this.score);
        }
    }

    pause() {
        this._paused = true;
        if(this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        if(!this.isProcessing) this.startTimer();
    }
    formatBreed(str) { return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }

    render(imgUrl, options) {
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; max-width:500px;">
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:10px;">
                    <div style="font-size:0.8rem; color:var(--bio); letter-spacing:2px;">OBJETIVO #${this.score + 1}</div>
                    <div style="font-size:0.8rem; color:#94a3b8;">TIEMPO DE ANÁLISIS</div>
                </div>
                <div class="bio-scanner-frame">
                    <div class="bio-hud-overlay"></div>
                    <div class="bio-laser"></div>
                    <img src="${imgUrl}" class="bio-image" id="bio-img">
                </div>
                <div class="timer-bar-bg" style="margin-bottom:20px;">
                    <div class="timer-bar-fill" id="b-timer" style="background:var(--bio); width:100%;"></div>
                </div>
                <div class="trivia-answers">
                    ${options.map(opt => `<button class="bio-option-btn" data-val="${opt}">${this.formatBreed(opt)}</button>`).join('')}
                </div>
            </div>`;
        this.startTimer();
        document.querySelectorAll('.bio-option-btn').forEach(btn => {
            btn.onclick = () => this.check(btn.dataset.val === this.currentBreed, btn);
        });
    }

    startTimer() {
        const timerBar = document.getElementById('b-timer');
        const bioImg = document.getElementById('bio-img');
        let timeLeft = 100;
        if(bioImg) bioImg.style.filter = `blur(15px) grayscale(100%) sepia(100%) hue-rotate(50deg)`;
        // timerSpeed handled
        this.timerInterval = setInterval(() => {
            timeLeft -= (this.timerSpeed||0.5);
            if(timerBar) {
                timerBar.style.width = timeLeft + "%";
                if(timeLeft < 20) timerBar.style.backgroundColor = CONFIG.COLORS.ACCENT;
            }
            if(bioImg) {
                const blurVal = (timeLeft / 100) * 15;
                const filterVal = timeLeft / 100;
                bioImg.style.filter = `blur(${blurVal}px) grayscale(${filterVal * 100}%) sepia(${filterVal * 100}%) hue-rotate(${filterVal * 50}deg)`;
            }
            if(timeLeft <= 0) this.timeOut();
        }, 50);
    }

    // --- AQUÍ ESTÁ EL CAMBIO CLAVE ---
    timeOut() {
        clearInterval(this.timerInterval);
        if (this.isProcessing) return;
        this.isProcessing = true;

        const btns = document.querySelectorAll('.bio-option-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.val === this.currentBreed) b.classList.add('correct');
        });

        this.audio.playLose();
        window.app.showToast("SUJETO PERDIDO", "Tiempo agotado", "danger");
        
        // Esperamos 2 segundos para ver el error y llamamos al MAIN
        setTimeout(() => {
            if(this.onGameOver) this.onGameOver(this.score); // ✅ USAMOS LA INTELIGENCIA DEL MAIN
        }, 2000);
    }

    check(isCorrect, clickedBtn) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        clearInterval(this.timerInterval);

        const img = document.getElementById('bio-img');
        if(img) img.style.filter = 'none';
        
        const btns = document.querySelectorAll('.bio-option-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.val === this.currentBreed) {
                b.classList.add('correct');
                b.style.opacity = "1";
            } else if(b === clickedBtn && !isCorrect) {
                b.classList.add('wrong');
            } else {
                b.style.opacity = "0.3";
            }
        });

        if(isCorrect) {
            this.audio.playWin(1);
            this.score++;
            window.app.credits += 40; 
            window.app.showToast("ADN CONFIRMADO", "+$40", "success");
            window.app.save();
            document.getElementById('val-credits').innerText = window.app.credits;
            if(window.app.canvas) window.app.canvas.explode(null, null, CONFIG.COLORS.BIO);
            setTimeout(() => this.nextRound(), 1500); 
        } else {
            this.audio.playLose();
            // Esperamos 1.5s y llamamos al MAIN
            setTimeout(() => {
                if(this.onGameOver) this.onGameOver(this.score); // ✅ AQUÍ TAMBIÉN
            }, 1500);
        }
    }
}
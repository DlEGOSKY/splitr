import { CONFIG } from '../config.js';

export class VaultCrackerGame {
    // NOTA: onQuit es el Smart Callback
    constructor(canvas, audio, onQuit) {
        this.audio = audio;
        this.onQuit = onQuit;
        
        this.secretCode = [];
        this.currentGuess = [];
        this.history = [];
        this.attempts = 0;
        this.maxAttempts = 8;
        this.codeLength = 4; 
        this.difficulty = 'NORMAL';
        
        this.keyStatus = {}; 
        this.revealedIndices = [];
        this.score = 0; // Añadido para rastrear score final
        
        this.isRunning = false;
        this.uiContainer = document.getElementById('game-ui-overlay');
        
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('vault-styles')) return;
        const style = document.createElement('style');
        style.id = 'vault-styles';
        // ... (ESTILOS IGUALES QUE YA TIENES) ...
        style.innerHTML = `
            .mode-select-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; width: 100%; max-width: 600px; padding: 10px; }
            .cyber-mode-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 5px; height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
            .cyber-mode-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.08); }
            .cyber-mode-card i { font-size: 2.2rem; margin-bottom: 5px; transition: transform 0.2s; }
            .cyber-mode-card:hover i { transform: scale(1.2); }
            .cyber-mode-card span { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 1px; }
            .cyber-mode-card small { font-size: 0.6rem; color: #64748b; text-transform: uppercase; }
            .mode-vc-easy { border-color: #10b981; color: #10b981; }
            .mode-vc-norm { border-color: #3b82f6; color: #3b82f6; }
            .mode-vc-hard { border-color: #ef4444; color: #ef4444; }
            .vault-display { background: #000; border: 2px solid #334155; border-radius: 8px; padding: 15px; width: 100%; max-width: 350px; margin-bottom: 10px; font-family: monospace; font-size: 2.5rem; text-align: center; color: white; letter-spacing: 10px; min-height: 70px; display: flex; align-items: center; justify-content: center; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
            .vault-display.error { animation: shake 0.3s; border-color: #ef4444; color:#ef4444; text-shadow:0 0 10px #ef4444; }
            .vault-display.success { border-color: #10b981; color:#10b981; text-shadow: 0 0 20px #10b981; }
            .vault-keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; max-width: 320px; }
            .vault-key { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; height: 60px; font-size: 1.5rem; color: white; cursor: pointer; transition: all 0.1s; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); }
            .vault-key:active { transform: scale(0.95); background: rgba(255,255,255,0.1); }
            .vault-key.action-del { color: #ef4444; border-color: #ef4444; }
            .vault-key.action-ok { color: #10b981; border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
            .vault-key.used-bad { opacity: 0.2; border-color: #333; color: #555; pointer-events:none; } 
            .vault-key.used-good { border-color: #fbbf24; color: #fbbf24; box-shadow: 0 0 5px #fbbf24; }
            .vault-key.used-perfect { border-color: #10b981; background: rgba(16, 185, 129, 0.2); color: #10b981; box-shadow: 0 0 10px #10b981; }
            .vault-history { flex-grow: 1; width: 100%; max-width: 350px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05); max-height: 250px; }
            .history-row { display: flex; justify-content: center; gap: 8px; padding: 5px; margin-bottom: 5px; }
            .digit-box { width: 35px; height: 40px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: bold; font-size: 1.2rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
            .digit-box.green { background: #10b981; color: black; border-color: #10b981; box-shadow: 0 0 10px #10b981; }
            .digit-box.yellow { background: #fbbf24; color: black; border-color: #fbbf24; }
            .digit-box.grey { background: rgba(255,255,255,0.05); color: #555; border-color: #333; }
            .skill-dock { display: flex; gap: 20px; margin-bottom: 20px; padding: 10px; justify-content: center; }
            .skill-btn { width: 140px; height: 50px; border: 1px solid; background: rgba(15, 23, 42, 0.9); color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; cursor: pointer; transition: 0.2s; position: relative; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); font-family: var(--font-display); letter-spacing: 1px; font-size: 0.9rem; }
            .skill-btn::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: currentColor; opacity: 0.5; }
            .skill-btn:hover:not(.disabled) { transform: scale(1.05); box-shadow: 0 0 15px currentColor; background: rgba(255,255,255,0.1); }
            .skill-btn.disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); border-color: #555 !important; color: #555 !important; box-shadow: none !important; }
            .info-modal { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.95); backdrop-filter: blur(5px); z-index: 2000; display: none; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
            .info-modal.active { display: flex; }
            .btn-info { position: absolute; top: 20px; right: 20px; background: transparent; border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.7); border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center; }
        `;
        document.head.appendChild(style);
    }

    init() {
        window.app.game = this;
        if(window.app.credits < 15) {
            try { window.app.showToast("FONDOS INSUFICIENTES", "Costo: $15", "danger"); } catch(e) {}
            // Salida segura
            if(this.onQuit) this.onQuit(0);
            return;
        }
        this.showMenu();
    }

    showMenu() {
        // ... (HTML DEL MENÚ IGUAL) ...
        this.uiContainer.innerHTML = `
            <div style="text-align:center; animation: fadeIn 0.5s; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%;">
                <button class="btn-info" id="btn-show-info"><i class="fa-solid fa-info"></i></button>
                <div style="margin-bottom:30px; border-bottom:1px solid var(--primary); padding-bottom:10px; width:80%; max-width:400px;">
                    <h2 style="color: #fff; text-shadow: 0 0 15px var(--primary); margin:0; font-size:1.8rem; letter-spacing:3px;">VAULT CRACKER</h2>
                    <small style="color:var(--primary); letter-spacing:2px;">SELECCIONA SEGURIDAD</small>
                </div>
                <div class="mode-select-grid">
                    <div class="cyber-mode-card mode-vc-easy" id="mode-easy"><i class="fa-solid fa-unlock"></i><span>LOCAL</span><small>3 Dígitos</small></div>
                    <div class="cyber-mode-card mode-vc-norm" id="mode-normal"><i class="fa-solid fa-building-columns"></i><span>BANCO</span><small>4 Dígitos</small></div>
                    <div class="cyber-mode-card mode-vc-hard" id="mode-hard"><i class="fa-solid fa-dungeon"></i><span>FEDERAL</span><small>5 Dígitos</small></div>
                </div>
                <button class="btn btn-secondary" id="btn-vc-back" style="margin-top:30px; width: 200px;">VOLVER AL LOBBY</button>
            </div>
            <div class="info-modal" id="info-modal-overlay">
                <div class="info-content" style="background:#0f172a; padding:20px; border:1px solid var(--primary); border-radius:10px; max-width:400px;">
                    <h3 style="color:var(--primary); margin:0 0 20px 0;">MANUAL DE DECODIFICACIÓN</h3>
                    <ul style="color:#94a3b8; font-size:0.85rem; text-align:left; padding-left:20px;">
                        <li style="margin-bottom:10px;"><strong style="color:#10b981">VERDE:</strong> Correcto y en posición.</li>
                        <li style="margin-bottom:10px;"><strong style="color:#fbbf24">AMARILLO:</strong> Número correcto, posición errónea.</li>
                        <li><strong style="color:#555">GRIS:</strong> Número incorrecto.</li>
                    </ul>
                    <button class="btn" style="width:100%; margin-top:20px;" id="btn-close-info">ENTENDIDO</button>
                </div>
            </div>
        `;

        document.getElementById('mode-easy').onclick = () => this.payAndStart(3, 'EASY');
        document.getElementById('mode-normal').onclick = () => this.payAndStart(4, 'NORMAL');
        document.getElementById('mode-hard').onclick = () => this.payAndStart(5, 'HARD');
        // Salida segura
        document.getElementById('btn-vc-back').onclick = () => { if(this.onQuit) this.onQuit(0); };

        const modal = document.getElementById('info-modal-overlay');
        document.getElementById('btn-show-info').onclick = () => modal.classList.add('active');
        document.getElementById('btn-close-info').onclick = () => modal.classList.remove('active');
    }

    payAndStart(digits, difficulty) {
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        try { this.audio.playBuy(); } catch(e) {}
        this.codeLength = digits;
        this.difficulty = difficulty;
        this.maxAttempts = (digits * 2) + 2; 
        this.start();
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.attempts = 0;
        this.history = [];
        this.currentGuess = [];
        this.keyStatus = {}; 
        this.revealedIndices = []; 
        this.secretCode = this.generateCode(this.codeLength);
        this.renderGame();
    }

    // ... (generateCode, activateSkill, renderGame, renderKeypad, getKeyHTML, input, updateDisplayOnly, submitGuess IGUALES) ...
    generateCode(length) { let nums = [0,1,2,3,4,5,6,7,8,9]; nums.sort(() => Math.random() - 0.5); return nums.slice(0, length); }
    activateSkill(type) {
        if (!this.isRunning) return;
        if (type === 'FILTER') {
            if(window.app.credits < 30) return;
            window.app.credits -= 30;
            let wrongNums = [];
            for(let i=0; i<=9; i++) { if (!this.secretCode.includes(i) && this.keyStatus[i] !== 'WRONG') { wrongNums.push(i); } }
            wrongNums.sort(() => Math.random() - 0.5);
            const toRemove = wrongNums.slice(0, 3);
            toRemove.forEach(n => this.keyStatus[n] = 'WRONG'); 
            try { this.audio.playTone(800, 'square', 0.1); } catch(e){}
            try { window.app.showToast("FILTRO ACTIVO", "3 Errores eliminados", "purple"); } catch(e){}
        } else if (type === 'REVEAL') {
            if(window.app.credits < 75) return;
            window.app.credits -= 75;
            let unknownIndices = [];
            for(let i=0; i<this.codeLength; i++) { if(!this.revealedIndices.includes(i)) unknownIndices.push(i); }
            if(unknownIndices.length > 0) {
                const idxToReveal = unknownIndices[Math.floor(Math.random() * unknownIndices.length)];
                const val = this.secretCode[idxToReveal];
                this.revealedIndices.push(idxToReveal);
                this.keyStatus[val] = 'CORRECT'; 
                try { this.audio.playWin(1); } catch(e){}
                try { window.app.showToast("BRUTE FORCE", `Dígito ${idxToReveal+1} descifrado`, "gold"); } catch(e){}
            }
        }
        document.getElementById('val-credits').innerText = window.app.credits;
        this.renderGame();
    }

    renderGame() {
        let displayHTML = '';
        for(let i=0; i<this.codeLength; i++) {
            if (this.revealedIndices.includes(i)) { displayHTML += `<span style="margin:0 5px; color:#10b981; text-shadow:0 0 10px #10b981;">${this.secretCode[i]}</span>`; } 
            else if (i < this.currentGuess.length) { displayHTML += `<span style="margin:0 5px;">${this.currentGuess[i]}</span>`; } 
            else { displayHTML += `<span style="color:#334155; margin:0 5px;">_</span>`; }
        }
        let historyHTML = this.history.map(entry => {
            let rowHTML = '';
            entry.result.forEach((res, idx) => {
                let val = entry.guess[idx];
                let colorClass = 'grey';
                if(res === 'CORRECT') colorClass = 'green';
                if(res === 'EXIST') colorClass = 'yellow';
                rowHTML += `<div class="digit-box ${colorClass}">${val}</div>`;
            });
            return `<div class="history-row">${rowHTML}</div>`;
        }).join('');
        const canBuyFilter = window.app.credits >= 30;
        const canBuyReveal = window.app.credits >= 75;
        this.uiContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; height:100%; width:100%; padding: 20px 0;">
                <div style="width:100%; text-align:center; color:#94a3b8; margin-bottom:5px; font-family:var(--font-display);">INTENTOS: <span style="color:white; font-size:1.2rem;">${this.maxAttempts - this.attempts}</span></div>
                <div class="vault-history" id="vault-history">${historyHTML}<div style="text-align:center; font-size:0.7rem; color:#555; padding-top:10px;">HISTORIAL DE ACCESO</div></div>
                <div class="skill-dock">
                    <div class="skill-btn ${canBuyFilter ? '' : 'disabled'}" onclick="window.app.game.activateSkill('FILTER')" style="color:#a855f7; border-color:#a855f7;"><i class="fa-solid fa-filter skill-icon"></i><span>FILTRAR</span><span class="skill-cost">$30</span></div>
                    <div class="skill-btn ${canBuyReveal ? '' : 'disabled'}" onclick="window.app.game.activateSkill('REVEAL')" style="color:#fbbf24; border-color:#fbbf24;"><i class="fa-solid fa-key skill-icon"></i><span>REVELAR</span><span class="skill-cost">$75</span></div>
                </div>
                <div class="vault-display" id="main-display">${displayHTML}</div>
                <div class="vault-keypad" id="keypad"></div>
            </div>`;
        this.renderKeypad();
        const histEl = document.getElementById('vault-history');
        if(histEl) histEl.scrollTop = histEl.scrollHeight;
    }

    renderKeypad() {
        const keypad = document.getElementById('keypad');
        if(!keypad) return;
        let html = '';
        for(let i=1; i<=9; i++) html += this.getKeyHTML(i);
        html += `<div class="vault-key action-del" onclick="window.app.game.input('DEL')"><i class="fa-solid fa-delete-left"></i></div>`;
        html += this.getKeyHTML(0);
        html += `<div class="vault-key action-ok" onclick="window.app.game.input('OK')"><i class="fa-solid fa-check"></i></div>`;
        keypad.innerHTML = html;
    }

    getKeyHTML(num) {
        let statusClass = '';
        if (this.keyStatus[num] === 'CORRECT') statusClass = 'used-perfect';
        else if (this.keyStatus[num] === 'EXIST') statusClass = 'used-good';
        else if (this.keyStatus[num] === 'WRONG') statusClass = 'used-bad';
        return `<div class="vault-key ${statusClass}" onclick="window.app.game.input(${num})">${num}</div>`;
    }

    input(val) {
        if (!this.isRunning) return;
        if (val === 'DEL') { if (this.currentGuess.length > 0) { this.currentGuess.pop(); try { this.audio.playClick(); } catch(e) {} this.updateDisplayOnly(); } } 
        else if (val === 'OK') {
            if (this.currentGuess.length === this.codeLength) { this.submitGuess(); } 
            else { const disp = document.getElementById('main-display'); if(disp) { disp.style.borderColor = '#ef4444'; setTimeout(() => disp.style.borderColor = '#334155', 200); } try { this.audio.playTone(150, 'sawtooth', 0.1); } catch(e) {} }
        } else {
            if (this.currentGuess.length < this.codeLength) {
                if (!this.currentGuess.includes(val)) { this.currentGuess.push(val); try { this.audio.playTone(300 + (val*50), 'sine', 0.05); } catch(e) {} this.updateDisplayOnly(); } 
                else { try { this.audio.playTone(100, 'square', 0.05); } catch(e) {} }
            }
        }
    }

    updateDisplayOnly() {
        let displayHTML = '';
        for(let i=0; i<this.codeLength; i++) {
            if (this.revealedIndices.includes(i)) { displayHTML += `<span style="margin:0 5px; color:#10b981; text-shadow:0 0 10px #10b981;">${this.secretCode[i]}</span>`; } 
            else if (i < this.currentGuess.length) { displayHTML += `<span style="margin:0 5px;">${this.currentGuess[i]}</span>`; } 
            else { displayHTML += `<span style="color:#334155; margin:0 5px;">_</span>`; }
        }
        const disp = document.getElementById('main-display');
        if(disp) disp.innerHTML = displayHTML;
    }

    submitGuess() {
        this.attempts++;
        let result = [];
        let corrects = 0;
        const guess = [...this.currentGuess];
        const secret = [...this.secretCode];
        guess.forEach((num, idx) => {
            if (num === secret[idx]) { result.push('CORRECT'); this.keyStatus[num] = 'CORRECT'; corrects++; } 
            else if (secret.includes(num)) { result.push('EXIST'); if (this.keyStatus[num] !== 'CORRECT') this.keyStatus[num] = 'EXIST'; } 
            else { result.push('WRONG'); this.keyStatus[num] = 'WRONG'; }
        });
        this.history.push({ guess: [...this.currentGuess], result: result });
        this.currentGuess = [];
        if (corrects === this.codeLength) { this.winGame(); } 
        else if (this.attempts >= this.maxAttempts) { this.loseGame(); } 
        else { try { this.audio.playClick(); } catch(e) {} this.renderGame(); }
    }

    winGame() {
        this.isRunning = false;
        try { this.audio.playWin(3); } catch(e) {}
        this.renderGame();
        const disp = document.getElementById('main-display');
        if(disp) { disp.classList.add('success'); disp.innerHTML = "ACCESO CONCEDIDO"; }
        let basePoints = 100;
        if (this.difficulty === 'NORMAL') basePoints = 200;
        if (this.difficulty === 'HARD') basePoints = 400;
        const bonus = (this.maxAttempts - this.attempts) * 20;
        this.score = basePoints + bonus;
        setTimeout(() => this.gameOver(), 1500);
    }

    loseGame() {
        this.isRunning = false;
        try { this.audio.playLose(); } catch(e) {}
        this.renderGame();
        const disp = document.getElementById('main-display');
        if(disp) { disp.classList.add('error'); disp.innerHTML = this.secretCode.join(' '); }
        this.score = 0;
        setTimeout(() => this.gameOver(), 3000);
    }

    // --- CORRECCIÓN CRÍTICA ---
    gameOver() {
        this.uiContainer.innerHTML = '';
        
        // Delegamos todo al main
        if(this.onQuit) this.onQuit(this.score);
    }
    pause() {
        this._paused = true;
        this.isRunning = false;
    }
    resume() {
        if(!this._paused) return;
        this._paused = false;
        this.isRunning = true;
        if(this.loop) this.loop();
    }
}

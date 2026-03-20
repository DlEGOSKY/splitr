import { CONFIG, TRIVIA_DATA, FLAGS_DATA } from './config.js';

// --- GAME 1: Higher / Lower ---
export class HigherLowerGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.deckId = null;
        this.currentCard = null;
        this.score = 0;
        this.streak = 0;
        this.history = [];
        this.difficulty = 'NORMAL';
        this.shieldActive = false;
        this.peekedCard = null;
        this.uiContainer = document.getElementById('game-ui-overlay');
    }

    async init() { this.showDifficultySelect(); }

    showDifficultySelect() {
        this.uiContainer.innerHTML = `
            <h2 style="color: #fff; text-shadow: 0 0 15px var(--primary);">MODO DE JUEGO</h2>
            <div style="display:flex; gap:20px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
                <button class="btn" id="mode-normal" style="flex-direction:column; gap:5px;"><span>🔵 NORMAL</span><span style="font-size:0.7rem; opacity:0.7;">Estándar</span></button>
                <button class="btn" id="mode-hardcore" style="flex-direction:column; gap:5px; background:#be123c;"><span>☠️ HARDCORE</span><span style="font-size:0.7rem; opacity:0.7;">Doble o Nada</span></button>
            </div>`;
        document.getElementById('mode-normal').onclick = () => { this.difficulty = 'NORMAL'; this.audio.playClick(); this.startGameLoop(); };
        document.getElementById('mode-hardcore').onclick = () => { this.difficulty = 'HARDCORE'; this.audio.playShieldBreak(); this.startGameLoop(); };
    }

    async startGameLoop() {
        this.uiContainer.innerHTML = '<div class="loader"></div>';
        try {
            const res = await fetch(`${CONFIG.API.DECK}/new/shuffle/?deck_count=1`);
            const data = await res.json();
            this.deckId = data.deck_id;
            this.resetRoundState();
            this.currentCard = await this.fetchCard();
            this.updateHUD();
            this.renderTable();
        } catch(e) { this.uiContainer.innerHTML = '<p>Error de conexión.</p>'; setTimeout(() => this.onQuit(), 2000); }
    }

    resetRoundState() {
        this.score = 0;
        this.streak = 0;
        this.history = [];
        this.shieldActive = false;
        this.peekedCard = null;
    }

    async fetchCard() {
        let res = await fetch(`${CONFIG.API.DECK}/${this.deckId}/draw/?count=1`);
        let data = await res.json();
        if (data.remaining < 2) await fetch(`${CONFIG.API.DECK}/${this.deckId}/shuffle/`);
        return data.cards[0];
    }

    getCardValue(card) {
        const val = card.value;
        if (val === "ACE") return 14; if (val === "KING") return 13; if (val === "QUEEN") return 12; if (val === "JACK") return 11;
        return parseInt(val) || 0;
    }

    renderTable() {
        const isHolo = ['KING','QUEEN','JACK','ACE'].includes(this.currentCard.value);
        const val = this.getCardValue(this.currentCard);
        const probHigher = Math.max(5, Math.min(100, ((14 - val) / 13) * 100));
        const probLower = Math.max(5, Math.min(100, ((val - 2) / 13) * 100));
        const canBuySwap = window.app.credits >= CONFIG.SKILLS.SWAP.cost;
        const canBuyOracle = window.app.credits >= CONFIG.SKILLS.ORACLE.cost && !this.peekedCard;
        const canBuyShield = window.app.credits >= CONFIG.SKILLS.SHIELD.cost && !this.shieldActive;
        const showMeters = this.difficulty === 'NORMAL';

        this.uiContainer.innerHTML = `
            <div class="card-stage ${this.shieldActive ? 'shielded' : ''}" id="card-stage">
                <div class="holo-overlay"></div>
                <img src="${this.currentCard.image}" class="playing-card ${isHolo ? 'holo' : ''}" id="main-card">
            </div>
            <div class="game-interactions">
                <div class="controls-container">
                    <div class="control-group">
                        <div class="btn-decision btn-lower" id="btn-low">▼</div>
                        <div class="risk-meter" style="opacity:${showMeters?1:0}"><div class="risk-fill" style="width:${probLower}%; background:${probLower>50?'var(--success)':'var(--accent)'}"></div></div>
                    </div>
                    <div class="control-group">
                        <div class="btn-decision btn-higher" id="btn-high">▲</div>
                        <div class="risk-meter" style="opacity:${showMeters?1:0}"><div class="risk-fill" style="width:${probHigher}%; background:${probHigher>50?'var(--success)':'var(--accent)'}"></div></div>
                    </div>
                </div>
                <div class="skills-bar">
                    <button class="skill-btn ${!canBuySwap ? 'disabled' : ''}" id="skill-swap"><span class="skill-icon">🔄</span><span class="skill-cost">$35</span></button>
                    <button class="skill-btn ${!canBuyOracle ? 'disabled' : ''}" id="skill-oracle"><span class="skill-icon">🔮</span><span class="skill-cost">$75</span></button>
                    <button class="skill-btn ${!canBuyShield ? 'disabled' : ''}" id="skill-shield"><span class="skill-icon">🛡️</span><span class="skill-cost">$150</span></button>
                </div>
            </div>
            <div class="history-bar">${this.history.map(img => `<div class="history-card" style="background-image:url(${img})"></div>`).join('')}</div>
        `;

        document.getElementById('btn-low').onclick = () => this.makeMove('LOWER');
        document.getElementById('btn-high').onclick = () => this.makeMove('HIGHER');
        document.getElementById('skill-swap').onclick = () => { if(canBuySwap) this.activateSkill('SWAP'); };
        document.getElementById('skill-oracle').onclick = () => { if(canBuyOracle) this.activateSkill('ORACLE'); };
        document.getElementById('skill-shield').onclick = () => { if(canBuyShield) this.activateSkill('SHIELD'); };
    }

    async activateSkill(type) {
        const skill = CONFIG.SKILLS[type];
        window.app.credits -= skill.cost;
        this.audio.playBuy();
        this.updateHUD();
        
        if (type === 'SHIELD') { this.shieldActive = true; this.showFloatingText("ESCUDO ACTIVO", "var(--success)"); this.renderTable(); }
        if (type === 'SWAP') { this.currentCard = await this.fetchCard(); this.peekedCard = null; this.renderTable(); this.showFloatingText("SWAP!", "var(--purple)"); }
        if (type === 'ORACLE') {
            if (!this.peekedCard) this.peekedCard = await this.fetchCard();
            const val = this.getCardValue(this.peekedCard);
            const curVal = this.getCardValue(this.currentCard);
            let hint = val === curVal ? "IGUAL" : (val > curVal ? "MAYOR" : "MENOR");
            this.showFloatingText(`ORÁCULO: ES ${hint}`, "var(--purple)");
            this.renderTable();
        }
    }

    async makeMove(guess) {
        document.getElementById('btn-low').style.pointerEvents = 'none';
        document.getElementById('btn-high').style.pointerEvents = 'none';
        this.audio.playClick();

        let nextCard;
        if (this.peekedCard) { nextCard = this.peekedCard; this.peekedCard = null; }
        else { nextCard = await this.fetchCard(); }
        
        const img = new Image(); img.src = nextCard.image;
        img.onload = () => {
            document.getElementById('main-card').classList.add('card-exit');
            setTimeout(() => { this.resolve(guess, nextCard); }, 300); 
        };
    }

    resolve(guess, nextCard) {
        const curVal = this.getCardValue(this.currentCard);
        const nextVal = this.getCardValue(nextCard);
        let probability = 0.5;
        if (guess === 'HIGHER') probability = (14 - curVal) / 13; else probability = (curVal - 2) / 13;
        probability = Math.max(0.1, Math.min(0.9, probability));
        const pointsPot = Math.floor((1 / probability) * 10);
        
        let outcome = 'LOSE';
        if (curVal === nextVal) outcome = 'TIE';
        else if ((guess === 'HIGHER' && nextVal > curVal) || (guess === 'LOWER' && nextVal < curVal)) outcome = 'WIN';
        if (this.difficulty === 'HARDCORE' && outcome === 'TIE') outcome = 'LOSE';

        this.history.push(this.currentCard.image);
        if(this.history.length > 5) this.history.shift();
        this.currentCard = nextCard;
        this.renderTable();
        document.getElementById('main-card').classList.add('card-enter');

        if (outcome === 'WIN') {
            this.streak++;
            const multiplier = 1 + (Math.floor(this.streak / 3) * 0.5);
            const hardcoreMult = this.difficulty === 'HARDCORE' ? 2 : 1;
            const totalPoints = Math.floor(pointsPot * multiplier * hardcoreMult);
            const creditsEarned = Math.max(5, Math.floor(totalPoints / 5)); 
            
            this.score += totalPoints;
            window.app.credits += creditsEarned;
            
            this.showFloatingText(`+${totalPoints} (+$${creditsEarned})`, '#fbbf24');
            this.audio.playWin(this.streak);
            this.canvas.explode(null, null, CONFIG.COLORS.GOLD);
            this.canvas.setMood(this.streak);
        } else if (outcome === 'TIE') {
            this.showFloatingText("¡EMPATE! (SALVADO)", "var(--neutral)");
            this.audio.playTone(300, 'square', 0.1); 
        } else {
            if (this.shieldActive) {
                this.shieldActive = false;
                this.audio.playShieldBreak();
                this.showFloatingText("¡ESCUDO ROTO!", "var(--success)");
                document.body.classList.add('shake-screen');
                setTimeout(() => document.body.classList.remove('shake-screen'), 500);
                this.renderTable();
            } else {
                this.audio.playLose();
                document.body.classList.add('shake-screen');
                setTimeout(() => document.body.classList.remove('shake-screen'), 500);
                this.showFloatingText("GAME OVER", "#f43f5e");
                setTimeout(() => this.onQuit(), 2000);
                return;
            }
        }
        this.updateHUD();
    }

    showFloatingText(text, color) {
        const el = document.createElement('div'); el.className = 'popup-score';
        el.innerText = text; el.style.color = color; el.style.left = '50%'; el.style.top = '40%'; el.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
    }

    updateHUD() {
        document.getElementById('ui-score').innerText = this.score;
        document.getElementById('val-credits').innerText = window.app.credits;
        const sBadge = document.getElementById('ui-streak');
        if(this.streak > 1) { sBadge.innerText = `🔥 x${this.streak}`; sBadge.classList.add('active'); }
        else { sBadge.classList.remove('active'); }
    }
}

// --- GAME 2: THE ORACLE ---
export class GuessCardGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.deckId = null;
        this.currentCard = null;
        this.isRevealed = false;
        this.uiContainer = document.getElementById('game-ui-overlay');
    }

    async init() {
        this.canvas.setMood('MYSTERY');
        this.uiContainer.innerHTML = '<div class="loader"></div>';
        try {
            const res = await fetch(`${CONFIG.API.DECK}/new/shuffle/?deck_count=1`);
            const data = await res.json();
            this.deckId = data.deck_id;
            await this.nextRound();
        } catch(e) { this.uiContainer.innerHTML = '<p>Error de conexión.</p>'; setTimeout(() => this.onQuit(), 2000); }
    }

    async nextRound() {
        this.isRevealed = false;
        let res = await fetch(`${CONFIG.API.DECK}/${this.deckId}/draw/?count=1`);
        let data = await res.json();
        if (data.remaining < 2) await fetch(`${CONFIG.API.DECK}/${this.deckId}/shuffle/`);
        this.currentCard = data.cards[0];
        this.renderTable();
    }

    renderTable() {
        this.uiContainer.innerHTML = `
            <div style="perspective:1000px">
                <div class="card-flipper" id="oracle-card">
                    <div class="card-front"><img src="${this.currentCard.image}" style="width:100%; height:100%; border-radius:15px;"></div>
                    <div class="card-back">❓</div>
                </div>
            </div>
            <h2 style="font-size:1.2rem; margin-bottom:10px;">MAKE YOUR PROPHECY</h2>
            <div class="bet-grid">
                <button class="bet-btn" id="bet-red" style="border-color:#f43f5e"><span style="color:#f43f5e">🟥 RED</span><small>Cost: 10 | Win: 20</small></button>
                <button class="bet-btn" id="bet-black" style="border-color:#94a3b8"><span style="color:#94a3b8">⬛ BLACK</span><small>Cost: 10 | Win: 20</small></button>
                <div style="grid-column: span 2; display:flex; gap:10px; justify-content:center; margin-top:10px;">
                    <button class="bet-btn" id="bet-h" style="padding:10px; width:60px;">♥️</button>
                    <button class="bet-btn" id="bet-d" style="padding:10px; width:60px;">♦️</button>
                    <button class="bet-btn" id="bet-c" style="padding:10px; width:60px;">♣️</button>
                    <button class="bet-btn" id="bet-s" style="padding:10px; width:60px;">♠️</button>
                </div>
            </div>
        `;
        
        const handleBet = (type, prediction) => {
            if (window.app.credits < 10) { this.audio.playLose(); this.showFloatingText("NO CREDITS!", "var(--accent)"); return; }
            window.app.credits -= 10;
            this.audio.playBuy();
            document.getElementById('val-credits').innerText = window.app.credits;
            this.reveal(type, prediction);
        };

        document.getElementById('bet-red').onclick = () => handleBet('COLOR', 'RED');
        document.getElementById('bet-black').onclick = () => handleBet('COLOR', 'BLACK');
        document.getElementById('bet-h').onclick = () => handleBet('SUIT', 'HEARTS');
        document.getElementById('bet-d').onclick = () => handleBet('SUIT', 'DIAMONDS');
        document.getElementById('bet-c').onclick = () => handleBet('SUIT', 'CLUBS');
        document.getElementById('bet-s').onclick = () => handleBet('SUIT', 'SPADES');
    }

    reveal(type, prediction) {
        const card = document.getElementById('oracle-card');
        card.classList.add('flipped');
        this.audio.playClick();
        const actualSuit = this.currentCard.suit;
        const actualColor = (actualSuit === 'HEARTS' || actualSuit === 'DIAMONDS') ? 'RED' : 'BLACK';
        
        let win = false; let payout = 0;
        if (type === 'COLOR' && prediction === actualColor) { win = true; payout = 20; }
        else if (type === 'SUIT' && prediction === actualSuit) { win = true; payout = 40; }

        setTimeout(() => {
            if (win) {
                window.app.credits += payout;
                this.showFloatingText(`WIN! +${payout}`, "var(--success)");
                this.audio.playWin(5);
                this.canvas.explode(null, null, CONFIG.COLORS.GOLD);
            } else { this.showFloatingText("LOST", "var(--accent)"); this.audio.playLose(); }
            document.getElementById('val-credits').innerText = window.app.credits;
            const btn = document.createElement('button'); btn.className = 'btn'; btn.style.marginTop = '20px'; btn.innerText = 'Next Card'; btn.onclick = () => this.nextRound();
            this.uiContainer.appendChild(btn);
        }, 600);
    }

    showFloatingText(text, color) {
        const el = document.createElement('div'); el.className = 'popup-score';
        el.innerText = text; el.style.color = color; el.style.left = '50%'; el.style.top = '20%'; el.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
    }
}

// --- GAME 3: TRIVIA ---
export class TriviaGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.score = 0;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.timerInterval = null;
    }

    init() {
        if(window.app.credits < 15) {
            this.uiContainer.innerHTML = `<h2>FONDOS INSUFICIENTES</h2><p>Costo: $15</p><button class="btn btn-secondary" id="btn-t-back">Volver</button>`;
            document.getElementById('btn-t-back').onclick = () => this.onQuit();
            return;
        }
        window.app.credits -= 15;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.audio.playBuy();
        this.canvas.setMood('TECH');
        this.score = 0;
        this.nextQuestion();
    }

    async nextQuestion() {
        this.uiContainer.innerHTML = '<div class="loader"></div><p>Escaneando Red Neuronal...</p>';
        await new Promise(r => setTimeout(r, 500)); 
        const randomQ = TRIVIA_DATA[Math.floor(Math.random() * TRIVIA_DATA.length)];
        const qData = { category: randomQ.c, question: randomQ.q, correct_answer: randomQ.a, incorrect_answers: randomQ.i };
        this.renderQuestion(qData);
    }

    renderQuestion(qData) {
        const answers = [...qData.incorrect_answers, qData.correct_answer].sort(() => Math.random() - 0.5);
        this.uiContainer.innerHTML = `
            <div class="trivia-container">
                <small style="color:var(--cyan); letter-spacing:2px;">${qData.category}</small>
                <div class="trivia-q">${qData.question}</div>
                <div class="timer-bar-bg"><div class="timer-bar-fill" id="t-timer"></div></div>
                <div class="trivia-answers">${answers.map(a => `<button class="trivia-btn" data-val="${a}">${a}</button>`).join('')}</div>
            </div>`;

        const timerBar = document.getElementById('t-timer');
        let timeLeft = 100;
        this.timerInterval = setInterval(() => {
            timeLeft -= 0.5;
            if(timerBar) {
                timerBar.style.width = timeLeft + "%";
                if(timeLeft < 30) timerBar.style.backgroundColor = 'var(--accent)';
                else if(timeLeft < 60) timerBar.style.backgroundColor = 'var(--gold)';
                else timerBar.style.backgroundColor = 'var(--cyan)';
            }
            if(timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.resolve(false, null, qData.correct_answer);
            }
        }, 50);

        document.querySelectorAll('.trivia-btn').forEach(btn => {
            btn.onclick = () => {
                clearInterval(this.timerInterval);
                this.resolve(btn.dataset.val === qData.correct_answer, btn, qData.correct_answer);
            };
        });
    }

    resolve(isCorrect, clickedBtn, correctAnswer) {
        const btns = document.querySelectorAll('.trivia-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.val === correctAnswer) b.style.background = CONFIG.COLORS.SUCCESS;
            else if(b === clickedBtn && !isCorrect) b.style.background = CONFIG.COLORS.ACCENT;
            else b.style.opacity = 0.5;
        });

        if(isCorrect) {
            this.audio.playWin(1);
            this.score += 30; window.app.credits += 30;
            this.showFloatingText("¡CORRECTO! +$30", CONFIG.COLORS.SUCCESS);
            this.canvas.explode(null, null, CONFIG.COLORS.CYAN);
            setTimeout(() => { this.nextQuestion(); }, 1500);
        } else {
            this.audio.playLose();
            this.showFloatingText("ERROR DE DATOS", "#f43f5e");
            setTimeout(() => {
                 this.uiContainer.innerHTML = `<h2>CONEXIÓN PERDIDA</h2><p style="margin-bottom:20px">Puntuación Final: ${this.score}</p><button class="btn" id="btn-t-retry">Reintentar (-$15)</button><button class="btn btn-secondary" id="btn-t-quit">Salir</button>`;
                document.getElementById('btn-t-retry').onclick = () => this.init();
                document.getElementById('btn-t-quit').onclick = () => this.onQuit();
            }, 1500);
        }
        document.getElementById('val-credits').innerText = window.app.credits;
    }

    showFloatingText(text, color) {
        const el = document.createElement('div'); el.className = 'popup-score';
        el.innerText = text; el.style.color = color; el.style.left = '50%'; el.style.top = '20%'; el.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
    }
}

// --- GAME 4: BIO SCAN ---
export class BioScanGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.breeds = [];
        this.currentBreed = null;
        this.timerInterval = null;
        this.uiContainer = document.getElementById('game-ui-overlay');
    }

    async init() {
        if(window.app.credits < 20) {
            this.uiContainer.innerHTML = `<h2>ACCESO DENEGADO</h2><p>Créditos necesarios: $20</p><button class="btn btn-secondary" id="btn-b-back">Volver</button>`;
            document.getElementById('btn-b-back').onclick = () => this.onQuit();
            return;
        }
        
        if(this.breeds.length === 0) {
            this.uiContainer.innerHTML = '<div class="loader"></div><p>Descargando Base de Datos...</p>';
            try {
                const res = await fetch('https://dog.ceo/api/breeds/list/all');
                const data = await res.json();
                this.breeds = Object.keys(data.message);
            } catch(e) {
                this.uiContainer.innerHTML = '<p>Error de Red.</p>';
                setTimeout(() => this.onQuit(), 2000);
                return;
            }
        }

        window.app.credits -= 20;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.audio.playBuy();
        this.canvas.setMood('BIO');
        this.nextRound();
    }

    async nextRound() {
        this.uiContainer.innerHTML = '<div class="loader"></div><p>Analizando ADN...</p>';
        try {
            const res = await fetch('https://dog.ceo/api/breeds/image/random');
            const data = await res.json();
            
            const breedPart = data.message.split('/breeds/')[1].split('/')[0];
            this.currentBreed = breedPart; 
            const displayBreed = this.formatBreed(breedPart);

            const options = [breedPart];
            while(options.length < 4) {
                const r = this.breeds[Math.floor(Math.random() * this.breeds.length)];
                if(!options.includes(r)) options.push(r);
            }
            options.sort(() => Math.random() - 0.5);

            this.render(data.message, options);
        } catch(e) {
            this.uiContainer.innerHTML = '<p>Fallo en Escáner.</p>';
            setTimeout(() => this.onQuit(), 2000);
        }
    }

    formatBreed(str) {
        return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    render(imgUrl, options) {
        this.uiContainer.innerHTML = `
            <div class="bio-image-container">
                <img src="${imgUrl}" class="bio-image" id="bio-img">
                <div class="bio-scan-line"></div>
            </div>
            <div class="timer-bar-bg" style="max-width:300px; margin:0 auto 20px;"><div class="timer-bar-fill" id="b-timer" style="background:var(--bio)"></div></div>
            <div class="trivia-answers">
                ${options.map(opt => `<button class="trivia-btn bio-btn" data-val="${opt}">${this.formatBreed(opt)}</button>`).join('')}
            </div>
        `;

        const timerBar = document.getElementById('b-timer');
        const bioImg = document.getElementById('bio-img');
        let timeLeft = 100;
        
        if(bioImg) bioImg.style.filter = `blur(20px) grayscale(100%)`;

        this.timerInterval = setInterval(() => {
            timeLeft -= 0.6; 
            if(timerBar) timerBar.style.width = timeLeft + "%";
            if(bioImg) {
                const blurVal = (timeLeft / 100) * 20;
                const grayVal = (timeLeft / 100) * 100;
                bioImg.style.filter = `blur(${blurVal}px) grayscale(${grayVal}%)`;
            }

            if(timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.resolve(false, null);
            }
        }, 50);

        document.querySelectorAll('.bio-btn').forEach(btn => {
            btn.onclick = () => {
                clearInterval(this.timerInterval);
                this.resolve(btn.dataset.val === this.currentBreed, btn);
            };
        });
    }

    resolve(isCorrect, clickedBtn) {
        const img = document.getElementById('bio-img');
        if(img) img.style.filter = 'none';
        
        const btns = document.querySelectorAll('.bio-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.val === this.currentBreed) b.style.background = CONFIG.COLORS.SUCCESS;
            else if(b === clickedBtn && !isCorrect) b.style.background = CONFIG.COLORS.ACCENT;
            else b.style.opacity = 0.5;
        });

        if(isCorrect) {
            this.audio.playWin(1);
            window.app.credits += 40; 
            this.showFloatingText("ADN CONFIRMADO +$40", CONFIG.COLORS.SUCCESS);
            this.canvas.explode(null, null, CONFIG.COLORS.BIO);
            setTimeout(() => this.nextRound(), 2000); 
        } else {
            this.audio.playLose();
            this.showFloatingText("MUESTRA CONTAMINADA", "#f43f5e");
            setTimeout(() => {
                 this.uiContainer.innerHTML = `
                    <h2>BIO-HAZARD DETECTADO</h2>
                    <button class="btn" id="btn-b-retry">Nueva Muestra (-$20)</button>
                    <button class="btn btn-secondary" id="btn-b-quit">Descontaminar</button>
                `;
                document.getElementById('btn-b-retry').onclick = () => this.init();
                document.getElementById('btn-b-quit').onclick = () => this.onQuit();
            }, 2000);
        }
        document.getElementById('val-credits').innerText = window.app.credits;
    }

    showFloatingText(text, color) {
        const el = document.createElement('div'); el.className = 'popup-score';
        el.innerText = text; el.style.color = color; el.style.left = '50%'; el.style.top = '20%'; el.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
    }
}

// --- GAME 5: GEO NET ---
export class GeoNetGame {
    constructor(canvas, audio, onQuit) {
        this.canvas = canvas;
        this.audio = audio;
        this.onQuit = onQuit;
        this.currentFlag = null;
        this.timerInterval = null;
        this.uiContainer = document.getElementById('game-ui-overlay');
    }

    async init() {
        if(window.app.credits < 25) {
            this.uiContainer.innerHTML = `<h2>ACCESO DENEGADO</h2><p>Créditos necesarios: $25</p><button class="btn btn-secondary" id="btn-g-back">Volver</button>`;
            document.getElementById('btn-g-back').onclick = () => this.onQuit();
            return;
        }
        window.app.credits -= 25;
        document.getElementById('val-credits').innerText = window.app.credits;
        this.audio.playBuy();
        this.canvas.setMood('GEO');
        this.nextRound();
    }

    async nextRound() {
        this.uiContainer.innerHTML = '<div class="loader"></div><p>Triangulando Señal...</p>';
        await new Promise(r => setTimeout(r, 500)); 
        
        const correct = FLAGS_DATA[Math.floor(Math.random() * FLAGS_DATA.length)];
        this.currentFlag = correct;

        const options = [correct];
        while(options.length < 4) {
            const r = FLAGS_DATA[Math.floor(Math.random() * FLAGS_DATA.length)];
            if(!options.includes(r)) options.push(r);
        }
        options.sort(() => Math.random() - 0.5);

        this.render(correct, options);
    }

    render(correctData, options) {
        this.uiContainer.innerHTML = `
            <div class="geo-flag-container">
                <img src="https://flagcdn.com/w320/${correctData.code}.png" class="geo-flag">
            </div>
            <div class="timer-bar-bg" style="max-width:300px; margin:0 auto 20px;"><div class="timer-bar-fill" id="g-timer" style="background:var(--geo)"></div></div>
            <div class="trivia-answers">
                ${options.map(opt => `<button class="trivia-btn geo-btn" data-val="${opt.code}">${opt.name}</button>`).join('')}
            </div>
        `;

        const timerBar = document.getElementById('g-timer');
        let timeLeft = 100;
        this.timerInterval = setInterval(() => {
            timeLeft -= 0.5;
            if(timerBar) timerBar.style.width = timeLeft + "%";
            if(timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.resolve(false, null);
            }
        }, 50);

        document.querySelectorAll('.geo-btn').forEach(btn => {
            btn.onclick = () => {
                clearInterval(this.timerInterval);
                this.resolve(btn.dataset.val === this.currentFlag.code, btn);
            };
        });
    }

    resolve(isCorrect, clickedBtn) {
        const btns = document.querySelectorAll('.geo-btn');
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.val === this.currentFlag.code) b.style.background = CONFIG.COLORS.SUCCESS;
            else if(b === clickedBtn && !isCorrect) b.style.background = CONFIG.COLORS.ACCENT;
            else b.style.opacity = 0.5;
        });

        if(isCorrect) {
            this.audio.playWin(1);
            window.app.credits += 55; 
            this.showFloatingText("UBICACIÓN SEGURA +$55", CONFIG.COLORS.SUCCESS);
            this.canvas.explode(null, null, CONFIG.COLORS.GEO);
            setTimeout(() => this.nextRound(), 2000); 
        } else {
            this.audio.playLose();
            this.showFloatingText("SEÑAL PERDIDA", "#f43f5e");
            setTimeout(() => {
                 this.uiContainer.innerHTML = `
                    <h2>DESCONECTADO</h2>
                    <button class="btn" id="btn-g-retry">Reconectar (-$25)</button>
                    <button class="btn btn-secondary" id="btn-g-quit">Salir</button>
                `;
                document.getElementById('btn-g-retry').onclick = () => this.init();
                document.getElementById('btn-g-quit').onclick = () => this.onQuit();
            }, 2000);
        }
        document.getElementById('val-credits').innerText = window.app.credits;
    }

    showFloatingText(text, color) {
        const el = document.createElement('div'); el.className = 'popup-score';
        el.innerText = text; el.style.color = color; el.style.left = '50%'; el.style.top = '20%'; el.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
    }
}

// --- GAME 6: HYPER REFLEX ---
export class GameReflex {
    constructor() { 
        this.t0 = 0; 
        this.to = null; 
        this.uiContainer = document.getElementById('game-ui-overlay');
    }
    init() {
        if(window.app.credits < 10) {
            this.uiContainer.innerHTML = `<h2>ACCESO DENEGADO</h2><p>Créditos necesarios: $10</p><button class="btn btn-secondary" id="btn-r-back">Volver</button>`;
            document.getElementById('btn-r-back').onclick = () => window.app.endGame();
            return;
        }
        window.app.credits -= 10;
        document.getElementById('val-credits').innerText = window.app.credits;
        window.app.audio.playBuy();
        window.app.canvas.setMood('REFLEX');
        this.wait();
    }
    wait() {
        this.uiContainer.innerHTML = `<h2>ESPERA...</h2><div class="reflex-target waiting" id="ref-btn">⛔</div>`;
        const delay = 2000 + Math.random() * 3000;
        this.to = setTimeout(() => this.go(), delay);
        document.getElementById('ref-btn').onmousedown = () => this.fail();
    }
    go() {
        this.t0 = Date.now();
        this.uiContainer.innerHTML = `<h2>¡AHORA!</h2><div class="reflex-target go" id="ref-btn">CLICK!</div>`;
        window.app.audio.playClick();
        document.getElementById('ref-btn').onmousedown = () => this.hit();
    }
    hit() {
        const ms = Date.now() - this.t0;
        window.app.saveStat('bestReflex', ms);
        if(ms < 300) {
            window.app.credits += 100;
            window.app.addScore(100, 0); 
            window.app.audio.playWin(5); 
            window.app.showFloatingText(`${ms}ms (+$100)`, CONFIG.COLORS.SUCCESS);
        } else {
            window.app.showFloatingText(`${ms}ms (LENTO)`, CONFIG.COLORS.GOLD);
        }
        document.getElementById('val-credits').innerText = window.app.credits;
        setTimeout(()=>window.app.endGame(), 2000);
    }
    fail() {
        clearTimeout(this.to);
        window.app.audio.playLose(); 
        window.app.showFloatingText("¡MUY PRONTO!", CONFIG.COLORS.ACCENT);
        setTimeout(()=>window.app.endGame(), 1500);
    }
}
import { CONFIG } from '../config.js';

// ─────────────────────────────────────────────
//  Alfabetos / cifrados
// ─────────────────────────────────────────────
const CIPHERS = {
    CAESAR: {
        name: 'CÉSAR',
        encode(ch, shift) {
            const base = /[A-Z]/.test(ch) ? 65 : 97;
            return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
        },
        hint: shift => `Shift +${shift}`
    },
    MORSE: {
        name: 'MORSE',
        map: { A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---',
               K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-',
               U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..' },
        encode(ch) { return this.map[ch.toUpperCase()] || ch; }
    },
    BINARY: {
        name: 'BINARIO',
        encode(ch) { return ch.charCodeAt(0).toString(2).padStart(8,'0'); }
    },
    ROT13: {
        name: 'ROT-13',
        encode(ch) {
            if(/[A-Za-z]/.test(ch)) {
                const base = ch >= 'a' ? 97 : 65;
                return String.fromCharCode((ch.charCodeAt(0) - base + 13) % 26 + base);
            }
            return ch;
        },
        hint: () => 'ROT-13'
    },
    ATBASH: {
        name: 'ATBASH',
        encode(ch) {
            if(/[A-Z]/.test(ch)) return String.fromCharCode(90 - (ch.charCodeAt(0) - 65));
            if(/[a-z]/.test(ch)) return String.fromCharCode(122 - (ch.charCodeAt(0) - 97));
            return ch;
        },
        hint: () => 'A↔Z'
    }
};

const WORDS = [
    'CIPHER','DECODE','MATRIX','SYSTEM','NEURAL','PROTOCOL',
    'NETWORK','SIGNAL','ACCESS','BREACH','CRYPTO','SHADOW',
    'VECTOR','BINARY','KERNEL','SOCKET','DAEMON','PACKET',
    'REBOOT','SCRIPT','BUFFER','SYNTAX','MODULE','LAMBDA',
    'VERTEX','PIXEL','TOGGLE','STREAM','FILTER','MEMORY'
];

export class CipherDecodeGame {
    constructor(canvas, audio, onGameOver) {
        this.canvas      = canvas;
        this.audio       = audio;
        this.onGameOver  = onGameOver;
        this.uiContainer = document.getElementById('game-ui-overlay');
        this.score       = 0;
        this.lives       = 3;
        this.mode        = 'NORMAL';
        this.round       = 0;
        this.timeLeft    = 0;
        this.timerInt    = null;
        this.isProcessing = false;
        this.injectStyles();
    }

    injectStyles() {
        if(document.getElementById('cipher-styles')) return;
        const s = document.createElement('style');
        s.id = 'cipher-styles';
        s.innerHTML = `
            .cd-root { display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;padding:20px 16px 16px;gap:14px;box-sizing:border-box; }
            .cd-header { display:flex;align-items:center;justify-content:space-between;width:100%;max-width:520px; }
            .cd-stat { text-align:center; }
            .cd-stat-val { font-family:var(--font-display);font-size:1.2rem;color:white; }
            .cd-stat-lbl { font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px; }
            .cd-timer-bar { width:100%;max-width:520px;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden; }
            .cd-timer-fill { height:100%;border-radius:2px;transition:width 0.1s linear,background 0.3s; }
            .cd-cipher-box { background:rgba(10,16,30,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px 28px;text-align:center;width:100%;max-width:520px;box-sizing:border-box; }
            .cd-cipher-lbl { font-size:0.55rem;color:#334155;font-family:monospace;letter-spacing:2px;margin-bottom:8px; }
            .cd-encoded { font-family:var(--font-display);font-size:1.2rem;color:var(--primary);letter-spacing:3px;word-break:break-all; }
            .cd-hint { font-size:0.6rem;color:#475569;font-family:monospace;margin-top:6px; }
            .cd-prompt { font-size:0.68rem;color:#94a3b8;font-family:monospace;letter-spacing:1px; }
            .cd-options { display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:520px; }
            .cd-opt { background:rgba(10,16,30,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 12px;font-family:var(--font-display);font-size:0.8rem;letter-spacing:2px;color:#94a3b8;cursor:pointer;transition:all 0.15s;text-align:center; }
            .cd-opt:hover { border-color:var(--primary);color:white;background:rgba(59,130,246,0.08); }
            .cd-opt.correct { background:rgba(16,185,129,0.15);border-color:#10b981;color:#10b981; }
            .cd-opt.wrong   { background:rgba(239,68,68,0.12);border-color:#ef4444;color:#ef4444; }
            .cd-opt:disabled,.cd-opt[disabled] { pointer-events:none; }
            .cd-lives { display:flex;gap:6px;align-items:center; }
            .cd-heart { color:#ef4444;font-size:0.9rem;transition:all 0.2s; }
            .cd-heart.lost { color:#1e293b;filter:grayscale(1); }
        `;
        document.head.appendChild(s);
    }

    init() { this.showModeSelect(); }

    showModeSelect() {
        const modes = [
            { id:'cd-normal', mc:'#6366f1', icon:'fa-lock',         name:'NORMAL',  desc:'César + ROT-13 · 20s por ronda'   },
            { id:'cd-morse',  mc:'#f59e0b', icon:'fa-signal',       name:'MORSE',   desc:'Código morse · 15s por ronda'     },
            { id:'cd-expert', mc:'#ef4444', icon:'fa-skull',        name:'EXPERTO', desc:'Todos los cifrados · 10s por ronda'},
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">CIPHER DECODE</div>
                <div style="font-size:0.65rem;color:#6366f1;letter-spacing:3px;font-family:monospace;">DESCIFRADO NEURAL</div>
                <div style="width:120px;height:1px;background:#6366f1;margin:10px auto 0;opacity:0.5;"></div>
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
            <button class="btn btn-secondary" id="cd-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('cd-normal').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('cd-morse').onclick  = () => this.startWithMode('MORSE');
        document.getElementById('cd-expert').onclick = () => this.startWithMode('EXPERT');
        document.getElementById('cd-back').onclick   = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode  = mode;
        this.score = 0;
        this.lives = mode === 'EXPERT' ? 2 : 3;
        this.round = 0;
        this.isProcessing = false;
        try { this.canvas.setMood('VAULT'); } catch(e) {}
        this.nextRound();
    }

    pickCipher() {
        if(this.mode === 'MORSE')  return 'MORSE';
        if(this.mode === 'NORMAL') return Math.random() < 0.5 ? 'CAESAR' : 'ROT13';
        // EXPERT: todos
        const all = ['CAESAR','MORSE','BINARY','ROT13','ATBASH'];
        return all[Math.floor(Math.random() * all.length)];
    }

    nextRound() {
        this.isProcessing = false;
        this.round++;
        clearInterval(this.timerInt);

        const word     = WORDS[Math.floor(Math.random() * WORDS.length)];
        const cipherKey = this.pickCipher();
        const cipher   = CIPHERS[cipherKey];
        const shift    = Math.floor(Math.random() * 10) + 3;

        let encoded;
        if(cipherKey === 'CAESAR') {
            encoded = word.split('').map(c => cipher.encode(c, shift)).join('');
        } else if(cipherKey === 'MORSE') {
            encoded = word.split('').map(c => cipher.encode(c)).join('  ');
        } else {
            encoded = word.split('').map(c => cipher.encode(c)).join(' ');
        }

        // Generar 3 distractores
        const wrongWords = WORDS.filter(w => w !== word)
            .sort(() => Math.random()-0.5).slice(0, 3);
        const options = [word, ...wrongWords].sort(() => Math.random()-0.5);

        const timeLimit = this.mode === 'EXPERT' ? 10 : this.mode === 'MORSE' ? 15 : 20;
        this.timeLeft   = timeLimit;

        const livesHTML = Array.from({length: this.mode==='EXPERT'?2:3}, (_,i) =>
            `<span class="cd-heart ${i >= this.lives ? 'lost' : ''}">♥</span>`).join('');

        const hintText = cipherKey === 'CAESAR'
            ? `Cifrado César · ${cipher.hint(shift)}`
            : `Cifrado ${cipher.name}`;

        this.uiContainer.innerHTML = `
        <div class="cd-root">
            <div class="cd-header">
                <div class="cd-stat"><div class="cd-stat-val" id="cd-score">${this.score}</div><div class="cd-stat-lbl">PUNTOS</div></div>
                <div class="cd-stat"><div class="cd-stat-val" id="cd-timer" style="color:#f97316;">${timeLimit}</div><div class="cd-stat-lbl">TIEMPO</div></div>
                <div class="cd-stat"><div class="cd-lives" id="cd-lives">${livesHTML}</div><div class="cd-stat-lbl">VIDAS</div></div>
            </div>
            <div class="cd-timer-bar"><div class="cd-timer-fill" id="cd-tfill" style="width:100%;background:var(--primary);"></div></div>
            <div class="cd-cipher-box">
                <div class="cd-cipher-lbl">${cipher.name} · RONDA ${this.round}</div>
                <div class="cd-encoded">${encoded}</div>
                <div class="cd-hint">${hintText}</div>
            </div>
            <div class="cd-prompt">¿Cuál es la palabra original?</div>
            <div class="cd-options">
                ${options.map(opt => `
                <div class="cd-opt" data-word="${opt}" onclick="window.cipherGame.check('${opt}', '${word}', this)">
                    ${opt}
                </div>`).join('')}
            </div>
        </div>`;

        window.cipherGame = this;
        this.startTimer(timeLimit);
    }

    startTimer(total) {
        const fill  = document.getElementById('cd-tfill');
        const label = document.getElementById('cd-timer');
        let elapsed = 0;
        this.timerInt = setInterval(() => {
            elapsed += 0.1;
            this.timeLeft = total - elapsed;
            const pct = Math.max(0, (this.timeLeft / total) * 100);
            if(fill) {
                fill.style.width = pct + '%';
                fill.style.background = pct > 50 ? 'var(--primary)' : pct > 25 ? '#f97316' : '#ef4444';
            }
            if(label) label.innerText = Math.ceil(this.timeLeft);
            if(this.timeLeft <= 0) {
                clearInterval(this.timerInt);
                this.handleTimeout();
            }
        }, 100);
    }

    check(chosen, correct, el) {
        if(this.isProcessing) return;
        this.isProcessing = true;
        clearInterval(this.timerInt);

        const isCorrect = chosen === correct;
        const allOpts   = document.querySelectorAll('.cd-opt');
        allOpts.forEach(o => {
            o.setAttribute('disabled','true');
            if(o.dataset.word === correct) o.classList.add('correct');
        });

        if(isCorrect) {
            el.classList.add('correct');
            const timeBonus = Math.floor(this.timeLeft * 2);
            const pts = 10 + timeBonus;
            this.score += pts;
            const sc = document.getElementById('cd-score');
            if(sc) sc.innerText = this.score;
            try { this.audio.playWin(2); } catch(e) {}
            try { window.app.showToast(`+${pts} PTS`, `Tiempo bonus: +${timeBonus}`, 'success'); } catch(e) {}
        } else {
            el.classList.add('wrong');
            this.lives--;
            try { this.audio.playLose(); } catch(e) {}
            // Actualizar corazones
            const lv = document.getElementById('cd-lives');
            if(lv) {
                const hearts = lv.querySelectorAll('.cd-heart');
                if(hearts[this.lives]) hearts[this.lives].classList.add('lost');
            }
        }

        setTimeout(() => {
            if(this.lives <= 0) { this.gameOver(); }
            else { this.nextRound(); }
        }, 1200);
    }

    handleTimeout() {
        if(this.isProcessing) return;
        this.isProcessing = true;
        this.lives--;
        const allOpts = document.querySelectorAll('.cd-opt');
        allOpts.forEach(o => { o.setAttribute('disabled','true'); });
        try { this.audio.playLose(); } catch(e) {}
        try { window.app.showToast('TIEMPO AGOTADO', '−1 vida', 'danger'); } catch(e) {}
        const lv = document.getElementById('cd-lives');
        if(lv) { const hearts = lv.querySelectorAll('.cd-heart'); if(hearts[this.lives]) hearts[this.lives].classList.add('lost'); }
        setTimeout(() => {
            if(this.lives <= 0) { this.gameOver(); }
            else { this.nextRound(); }
        }, 1000);
    }

    gameOver() {
        clearInterval(this.timerInt);
        try { this.audio.playLose(); } catch(e) {}
        if(this.onGameOver) this.onGameOver(this.score);
    }

    pause()   { clearInterval(this.timerInt); }
    resume()  { if(this.timeLeft > 0) this.startTimer(this.timeLeft); }
    cleanup() { clearInterval(this.timerInt); delete window.cipherGame; }
}

import { CONFIG } from './config.js';
import { CanvasManager, SeededRandom } from './utils.js';
import { AudioController } from './audio.js'; 
import { ShopSystem } from './shop.js';

// --- JUEGOS ---
import { HigherLowerGame } from './games/higher-lower.js';
import { GuessCardGame } from './games/guess-card.js';
import { TriviaGame } from './games/trivia.js';
import { BioScanGame } from './games/bio-scan.js';
import { GeoNetGame } from './games/geo-net.js';
import { GameReflex } from './games/hyper-reflex.js';
import { SpamClickGame } from './games/spam-click.js';
import { NeonSniperGame } from './games/neon-sniper.js';
import { OrbitLockGame } from './games/orbit-lock.js';
import { MemoryFlashGame } from './games/memory-flash.js';
import { VaultCrackerGame } from './games/vault-cracker.js';
import { PhaseShifterGame } from './games/phase-shifter.js';
import { MathRushGame } from './games/math-rush.js';
import { ColorTrapGame } from './games/color-trap.js';
import { HoloMatchGame } from './games/holo-match.js';
import { VoidDodgerGame } from './games/void-dodger.js';
import { GlitchHuntGame } from './games/glitch-hunt.js';
import { OrbitTrackerGame } from './games/orbit-tracker.js';
import { CyberTyperGame } from './games/cyber-typer.js';
// --- NUEVO JUEGO IMPORTADO ---
import { CyberPongGame } from './games/cyber-pong.js';
import { SnakePlusGame }  from './games/snake-plus.js';
import { CipherDecodeGame } from './games/cipher-decode.js';

const app = {
    state: CONFIG.STATES.WELCOME,
    credits: 100, 
    canvas: null,
    audio: null,
    shop: null,
    game: null,
    activeGameId: null,
    stats: { gamesPlayed: 0, xp: 0, level: 1, avatar: 'fa-user-astronaut', passClaimed: [], unlockedGames: [] }, 
    highScores: {},
    daily:  { date: '', tasks: [], claimed: false },
    weekly: { week: '', tasks: [], claimed: false },
    streak: { days: 0, lastDate: '', best: 0 },
    invest: { date: '', amount: 0, risk: '', resolved: false, result: 0 },
    settings: { 
        audio: { master: 0.5, sfx: 1.0, music: 0.5 },
        performance: true 
    },
    lastHovered: null,

    init() {
        this.canvas = new CanvasManager();
        this.audio = new AudioController();
        this.shop = new ShopSystem();
        window.app = this; 

        // Inicializar audio con el primer clic del usuario
        document.addEventListener('click', () => { if(this.audio) this.audio.init(); }, { once: true });

        this.gameClasses = {
            'higher-lower': HigherLowerGame, 'guess-card': GuessCardGame, 'trivia': TriviaGame,
            'bio-scan': BioScanGame, 'geo-net': GeoNetGame, 'hyper-reflex': GameReflex,
            'spam-click': SpamClickGame, 'neon-sniper': NeonSniperGame, 'orbit-lock': OrbitLockGame,
            'memory-flash': MemoryFlashGame, 'vault-cracker': VaultCrackerGame, 'phase-shifter': PhaseShifterGame,
            'math-rush': MathRushGame, 'color-trap': ColorTrapGame, 'holo-match': HoloMatchGame,
            'void-dodger': VoidDodgerGame, 'glitch-hunt': GlitchHuntGame, 'orbit-tracker': OrbitTrackerGame,
            'cyber-typer': CyberTyperGame,
            'cyber-pong':    CyberPongGame,
            'snake-plus':    SnakePlusGame,
            'cipher-decode': CipherDecodeGame
        };

        let save = localStorage.getItem('arcade_save');
        if(save) { 
            try {
                let d = JSON.parse(save); 
                this.credits = d.credits || 100; 
                this.stats = d.stats || this.stats;
                
                // Asegurar inicialización de estadísticas
                if(!this.stats.xp) this.stats.xp = 0;
                if(!this.stats.level) this.stats.level = 1;
                if(!this.stats.avatar) this.stats.avatar = 'fa-user-astronaut';
                if(!this.stats.passClaimed) this.stats.passClaimed = []; 
                if(!this.stats.unlockedGames) this.stats.unlockedGames = []; 
                
                this.highScores = d.highScores || {}; 
                
                if(d.shop) { 
                    this.shop.load(d.shop); 
                    this.applyTheme(this.shop.equipped.theme); 
                }
                if(d.daily)  this.daily  = d.daily;
                if(d.weekly) this.weekly = d.weekly;
                if(d.streak) this.streak = d.streak;
                if(d.invest) this.invest = d.invest;
                if(d.settings) {
                    if(d.settings.audio) this.audio.vol = d.settings.audio;
                    if(d.settings.performance !== undefined) this.settings.performance = d.settings.performance;
                }
            } catch(e) { console.error("Error cargando save", e); }
        }
        
        // --- PARCHE DE MIGRACIÓN ---
        this.runMigrationFix();
        // ---------------------------

        this.checkDailyReset();
        this.checkWeeklyReset();
        this.checkStreakUpdate();
        this.checkInvestment();
        this.renderMenu();
        this.updateUI();
        
        // Retrasar ligeramente la pantalla de bienvenida para asegurar carga
        setTimeout(() => this.changeState(CONFIG.STATES.WELCOME), 100);
        
        this.setupEventListeners();
    },

    // --- FUNCIÓN DE MIGRACIÓN ---
    runMigrationFix() {
        // Si ya reclamaste el nivel 5 pero no tienes 'cyber-pong' desbloqueado...
        if (this.stats.passClaimed && this.stats.passClaimed.includes(5) && !this.stats.unlockedGames.includes('cyber-pong')) {
            console.log("MIGRATION FIX: Desbloqueando Cyber Pong automáticamente...");
            this.stats.unlockedGames.push('cyber-pong');
            this.save();
        }
        // Aseguramos que unlockedGames sea un array válido siempre
        if (!Array.isArray(this.stats.unlockedGames)) {
            this.stats.unlockedGames = [];
        }
    },

    setupEventListeners() {
        const safeBind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };

        // Botones Principales
        safeBind('btn-start', () => {
            this.audio.playClick();
            this.changeState(CONFIG.STATES.MENU);
            if(this.shop.equipped.theme) this.audio.playHover();
        });
        // Mostrar stats si ya jugó antes
        const wrReturning = document.getElementById('welcome-returning');
        const wrLabel     = document.getElementById('wr-label');
        const wrStats     = document.getElementById('wr-stats');
        if(wrReturning && this.stats.gamesPlayed > 0) {
            wrReturning.style.display = 'flex';
            if(wrLabel) wrLabel.textContent = 'Bienvenido de vuelta — ' + this.getRankName(this.stats.level || 1).toUpperCase();
            if(wrStats) wrStats.textContent = this.stats.gamesPlayed + ' partidas · LVL ' + (this.stats.level||1) + ' · ' + this.credits.toLocaleString() + ' CR';
        }
        safeBind('btn-profile', () => this.showProfile());
        safeBind('btn-shop', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.SHOP); this.shop.init(); });
        safeBind('btn-shop-back', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); });
        safeBind('btn-daily',  () => { this.audio.playClick(); this.renderDailyScreen();  this.changeState(CONFIG.STATES.DAILY);  });
        safeBind('btn-weekly', () => { this.audio.playClick(); this.renderWeeklyScreen(); this.changeState(CONFIG.STATES.WEEKLY); });
        safeBind('btn-random-game', () => {
            this.audio.playClick();
            const available = Object.keys(this.gameClasses);
            const pick = available[Math.floor(Math.random() * available.length)];
            this.showToast('PROTOCOLO ALEATORIO', CONFIG.GAMES_LIST.find(g=>g.id===pick)?.name || pick, 'purple');
            setTimeout(() => this.launch(pick), 600);
        });
        safeBind('btn-daily-back', () => { this.audio.playClick(); this.changeState(CONFIG.STATES.MENU); });
        
        // BOTÓN NEON PASS
        safeBind('btn-pass', () => { 
            this.audio.playClick(); 
            this.changeState('pass');
            setTimeout(() => this.renderPassScreen(), 60);
        });
        safeBind('btn-pass-back', () => { 
            this.audio.playClick(); 
            this.hidePassTooltip();
            this.changeState(CONFIG.STATES.MENU); 
        });

        // Modales
        const closeProfileBtn = document.getElementById('btn-close-profile');
        if(closeProfileBtn) closeProfileBtn.onclick = (e) => { e.preventDefault(); this.closeProfile(); };
        
        const closeInfoBtn = document.getElementById('btn-close-info');
        if(closeInfoBtn) closeInfoBtn.onclick = (e) => { e.preventDefault(); document.getElementById('modal-info').classList.add('hidden'); };

        // SETTINGS
        safeBind('btn-settings', () => {
            this.audio.playClick();
            const modal = document.getElementById('modal-settings');
            if(modal) {
                modal.classList.remove('hidden');
                const updateSlider = (id, val) => { const el = document.getElementById(id); if(el) el.value = val * 100; };
                updateSlider('rng-master', this.audio.vol.master);
                updateSlider('rng-sfx',    this.audio.vol.sfx);
                updateSlider('rng-music',  this.audio.vol.music);
                const updateText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = Math.round(val * 100) + '%'; };
                updateText('val-master', this.audio.vol.master);
                updateText('val-sfx',    this.audio.vol.sfx);
                updateText('val-music',  this.audio.vol.music);
                const perfCheck = document.getElementById('chk-performance');
                if(perfCheck) perfCheck.checked = this.settings.performance;
                const scanlinesCheck = document.getElementById('chk-scanlines');
                if(scanlinesCheck) scanlinesCheck.checked = this.settings.scanlines || false;
                const shakeCheck = document.getElementById('chk-shake');
                if(shakeCheck) shakeCheck.checked = this.settings.shake !== false;
                const reduceCheck = document.getElementById('chk-reduce-motion');
                if(reduceCheck) reduceCheck.checked = this.settings.reduceMotion || false;
                // Info del sistema
                const sysGames = document.getElementById('sys-games'); if(sysGames) sysGames.innerText = this.stats.gamesPlayed || 0;
                const sysLevel = document.getElementById('sys-level');  if(sysLevel) sysLevel.innerText = this.stats.level || 1;
            }
        });

        safeBind('btn-close-settings', () => {
            this.audio.playClick();
            const modal = document.getElementById('modal-settings');
            if(modal) modal.classList.add('hidden');
            this.save();
        });

        safeBind('btn-reset-data', () => {
            if(confirm('¿Borrar todos los datos? Esta acción no se puede deshacer.')) {
                localStorage.removeItem('arcade_save');
                location.reload();
            }
        });

        // Sliders de Audio
        const bindSlider = (id, type, labelId) => {
            const el = document.getElementById(id);
            if(el) {
                el.oninput = (e) => {
                    const val = e.target.value;
                    const label = document.getElementById(labelId);
                    if(label) label.innerText = val + '%';
                    this.audio.setVolume(type, val);
                };
                el.onchange = () => this.audio.playHover();
            }
        };
        bindSlider('rng-master', 'master', 'val-master');
        bindSlider('rng-sfx',   'sfx',    'val-sfx');
        bindSlider('rng-music', 'music',  'val-music');

        // Checkbox Performance
        const perfCheck = document.getElementById('chk-performance');
        if(perfCheck) perfCheck.onchange = (e) => { this.settings.performance = e.target.checked; this.audio.playClick(); };

        // Nuevos toggles
        const scanlinesCheck = document.getElementById('chk-scanlines');
        if(scanlinesCheck) scanlinesCheck.onchange = (e) => {
            this.settings.scanlines = e.target.checked;
            document.querySelector('.scanlines')?.style.setProperty('display', e.target.checked ? 'block' : 'none');
            this.audio.playClick();
        };
        const shakeCheck = document.getElementById('chk-shake');
        if(shakeCheck) shakeCheck.onchange = (e) => { this.settings.shake = e.target.checked; this.audio.playClick(); };
        const reduceCheck = document.getElementById('chk-reduce-motion');
        if(reduceCheck) reduceCheck.onchange = (e) => {
            this.settings.reduceMotion = e.target.checked;
            document.body.classList.toggle('reduce-motion', e.target.checked);
            this.audio.playClick();
        };

        // LOOT BOX
        safeBind('btn-buy-lootbox', () => this.buyLootBox());

        // ABORTAR JUEGO — ahora solo btn-quit en el HUD
        safeBind('btn-quit', () => { this.audio.playClick(); this.endGame(); });

        // Hover Sounds — SFX por categoría
        const CAT_FREQS = { REFLEJOS:600, MEMORIA:400, MENTAL:500, ACCION:350, CONOCIMIENTO:450 };
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.btn, .nav-tab, .game-card-v2, .shop-card-v2, .daily-card, .gcv2-info, .pv2-avatar-opt, .np-card, .sc-btn, .scv2-btn');
            if (target) {
                if (this.lastHovered !== target) {
                    this.lastHovered = target;
                    if(target.classList.contains('game-card-v2')) {
                        const gid  = target.dataset.gameId;
                        const game = gid && CONFIG.GAMES_LIST.find(g => g.id === gid);
                        const freq = (game && game.cat) ? (CAT_FREQS[game.cat] || 400) : 400;
                        try { this.audio.playTone(freq, 'sine', 0.04, 0.08); } catch(err) {}
                    } else {
                        this.audio.playHover();
                    }
                }
            } else {
                this.lastHovered = null;
            }
        });
        
        // Consola de Depuración
        document.addEventListener('keydown', (e) => { if (e.key === 'F1' || e.code === 'F1') { e.preventDefault(); this.toggleConsole(); } });

        // Escape y P para pausar/reanudar durante el juego
        document.addEventListener('keydown', (e) => {
            const isGame = document.getElementById('screen-game')?.classList.contains('active');
            if(!isGame) return;
            if(e.code === 'Escape' || e.code === 'KeyP') {
                e.preventDefault();
                if(this._pauseOverlayEl) this._autoResume();
                else this._manualPause();
            }
        });
        const consoleInput = document.getElementById('console-input');
        if(consoleInput) consoleInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') this.execCommand(e.target.value); });
        const debugTrigger = document.getElementById('debug-trigger');
        if(debugTrigger) debugTrigger.onclick = () => this.toggleConsole();

        // === PAUSA AUTOMÁTICA — pestaña oculta o app en segundo plano ===
        const handleVisibility = () => {
            if (document.hidden) this._autoPause();
            else this._autoResume();
        };
        const handleBlur  = () => this._autoPause();
        const handleFocus = () => this._autoResume();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur',  handleBlur);
        window.addEventListener('focus', handleFocus);
    },

    // ---- Sistema de auto-pausa ----
    _pauseOverlayEl: null,
    _manualPause() {
        const isGame = document.getElementById('screen-game')?.classList.contains('active');
        if(!isGame || this._pauseOverlayEl) return;
        this._autoPause(true);
    },

    _autoPause(manual = false) {
        // Solo pausar si hay un juego activo corriendo
        const isGame = document.getElementById('screen-game')?.classList.contains('active');
        if(!isGame || this._pauseOverlayEl) return;

        // Pausar el background canvas y el juego si tiene método pause
        try { this.canvas.pauseBackground(); } catch(e) {}
        if(this.game && typeof this.game.pause === 'function') {
            try { this.game.pause(); } catch(e) {}
        }

        const overlay = document.createElement('div');
        overlay.id = 'pause-overlay';
        overlay.innerHTML = `
            <div class="pause-panel">
                <div class="pause-icon-ring">
                    <i class="fa-solid fa-pause"></i>
                </div>
                <div class="pause-title">PAUSA</div>
                <div class="pause-sub">${manual ? 'Pausa manual activada' : 'Ventana perdió el foco'}</div>
                <div class="pause-actions">
                    <button class="pause-btn pause-btn-primary" id="pause-resume-btn">
                        <i class="fa-solid fa-play"></i> CONTINUAR
                    </button>
                    <button class="pause-btn pause-btn-danger" id="pause-quit-btn">
                        <i class="fa-solid fa-xmark"></i> ABANDONAR
                    </button>
                </div>
                <div class="pause-hint">ESC · P para continuar</div>
            </div>`;
        document.body.appendChild(overlay);
        this._pauseOverlayEl = overlay;

        document.getElementById('pause-resume-btn').onclick = () => this._autoResume();
        document.getElementById('pause-quit-btn').onclick = () => {
            this._autoResume();
            setTimeout(() => { const btn = document.getElementById('btn-quit'); if(btn) btn.click(); }, 100);
        };
    },

    _autoResume() {
        if(!this._pauseOverlayEl) return;
        this._pauseOverlayEl.classList.add('pause-hiding');
        setTimeout(() => { this._pauseOverlayEl?.remove(); this._pauseOverlayEl = null; }, 250);
        try { this.canvas.resumeBackground(); } catch(e) {}
        if(this.game && typeof this.game.resume === 'function') {
            try { this.game.resume(); } catch(e) {}
        }
    },

    changeState(newState) {
        document.querySelectorAll('.screen').forEach(s => { 
            s.classList.remove('active'); 
            setTimeout(() => { 
                if(!s.classList.contains('active')) s.classList.add('hidden'); 
            }, 400); 
        });

        let nextScreenId = '';
        if(newState === CONFIG.STATES.WELCOME) nextScreenId = 'screen-welcome';
        if(newState === CONFIG.STATES.MENU) nextScreenId = 'screen-menu';
        if(newState === CONFIG.STATES.GAME) nextScreenId = 'screen-game';
        if(newState === CONFIG.STATES.SHOP) nextScreenId = 'screen-shop';
        if(newState === CONFIG.STATES.DAILY)  nextScreenId = 'screen-daily';
        if(newState === CONFIG.STATES.WEEKLY) nextScreenId = 'screen-weekly';
        if(newState === 'pass') nextScreenId = 'screen-pass';

        const nextScreen = document.getElementById(nextScreenId);
        if(nextScreen) {
            nextScreen.classList.remove('hidden');
            
            if(newState === CONFIG.STATES.GAME) {
                // Resetear HUD al entrar en juego
                const valCr = document.getElementById('val-credits');
                if(valCr) valCr.innerText = this.credits;
                const scoreEl = document.getElementById('ui-score');
                if(scoreEl) scoreEl.innerText = '0';
                const streakBadge = document.getElementById('ui-streak');
                if(streakBadge) streakBadge.classList.remove('visible');
            }

            if(newState === CONFIG.STATES.SHOP) {
                document.getElementById('shop-credits').innerText = this.credits;
            }

            requestAnimationFrame(() => { 
                setTimeout(() => { 
                    nextScreen.classList.add('active');
                    nextScreen.classList.add('entering');
                    setTimeout(() => nextScreen.classList.remove('entering'), 350);
                    if(newState === CONFIG.STATES.MENU) {
                        this.renderMenu();
                        this.updateUI(); 
                    }
                }, 50); 
            });
        }
    },

    // --- LÓGICA DEL PASE DE BATALLA ---
    renderPassScreen() {
        if (!this.stats.passClaimed) this.stats.passClaimed = [];

        const lvl = this.stats.level || 1;
        const xp  = this.stats.xp    || 0;
        const req = this.getReqXP(lvl);
        const pct = Math.min(100, (xp / req) * 100);

        // Actualizar cabecera XP
        const lvlEl  = document.getElementById('np-level');
        const fillEl = document.getElementById('np-xp-fill');
        const glowEl = document.getElementById('np-xp-glow');
        const textEl = document.getElementById('np-xp-text');
        if(lvlEl)  lvlEl.innerText    = lvl;
        if(fillEl) fillEl.style.width = `${pct}%`;
        if(glowEl) glowEl.style.width = `${pct}%`;
        if(textEl) textEl.innerText   = `${Math.floor(xp)} / ${req} XP`;

        const claimable = CONFIG.BATTLE_PASS.filter(n => lvl >= n.lvl && !this.stats.passClaimed.includes(n.lvl)).length;
        const badge   = document.getElementById('np-claimable-badge');
        const countEl = document.getElementById('np-claimable-count');
        if(badge)   badge.classList.toggle('visible', claimable > 0);
        if(countEl) countEl.innerText = claimable;

        const container = document.getElementById('np-track');
        if (!container) return;

        const typeLabels = { CREDITS:'Créditos', PARTICLE:'Efecto FX', THEME:'Tema', AVATAR:'Avatar', HARDWARE:'Mejora', GAME_UNLOCK:'Juego' };

        // Colores y efectos por rareza
        const rarityFx = {
            common:    { glow:'rgba(100,116,139,0.25)', ring:'#64748b',  anim:'none',              stars:0 },
            rare:      { glow:'rgba(59,130,246,0.35)',  ring:'#3b82f6',  anim:'none',              stars:1 },
            epic:      { glow:'rgba(168,85,247,0.45)',  ring:'#a855f7',  anim:'epicPulse 2s ease-in-out infinite', stars:2 },
            legendary: { glow:'rgba(245,158,11,0.6)',   ring:'#f59e0b',  anim:'legendaryFlame 1.5s ease-in-out infinite', stars:3 },
        };

        let html = '';
        CONFIG.BATTLE_PASS.forEach((node, idx) => {
            const isUnlocked = lvl >= node.lvl;
            const isClaimed  = this.stats.passClaimed.includes(node.lvl);
            const rarity     = node.rarity || 'common';
            const fx         = rarityFx[rarity] || rarityFx.common;

            if (idx > 0) {
                const prevUnlocked = lvl >= CONFIG.BATTLE_PASS[idx-1].lvl;
                html += `<div class="np-connector ${prevUnlocked?'active':''}"></div>`;
            }

            // Estrellas de rareza
            const starsHTML = fx.stars > 0
                ? `<div class="np-stars">${'<i class="fa-solid fa-star np-star"></i>'.repeat(fx.stars)}</div>`
                : '';

            // Partículas orbitales para legendary
            const orbitsHTML = rarity === 'legendary' && isUnlocked && !isClaimed
                ? `<div class="np-orbit-ring"></div><div class="np-orbit-dot"></div>`
                : '';

            let action = '';
            if (isUnlocked && !isClaimed) {
                action = `<button class="np-btn-claim rarity-${rarity}" onclick="event.stopPropagation(); window.app.claimPassReward(${node.lvl})">
                    <i class="fa-solid fa-gift"></i> RECLAMAR
                </button>`;
            } else if (!isUnlocked) {
                action = `<div class="np-lock-badge"><i class="fa-solid fa-lock"></i> ${node.lvl}</div>`;
            } else {
                action = `<div class="np-claimed-check"><i class="fa-solid fa-check"></i></div>`;
            }

            const iconClass = node.icon.includes(' ') ? node.icon : 'fa-solid ' + node.icon;
            const cardStyle = isUnlocked && !isClaimed
                ? `--rarity-glow:${fx.glow}; --rarity-ring:${fx.ring}; animation:${fx.anim};`
                : `--rarity-glow:${fx.glow}; --rarity-ring:${fx.ring};`;

            html += `
            <div class="np-node">
                <div class="np-card rarity-${rarity} ${isUnlocked?'unlocked':''} ${isClaimed?'claimed':''}"
                     style="${cardStyle} animation-delay:${idx*40}ms;"
                     data-lvl="${node.lvl}" data-rarity="${rarity}"
                     data-name="${node.name}" data-type="${typeLabels[node.type]||node.type}"
                     data-desc="${node.desc||''}"
                     onmouseenter="window.app.showPassTooltip(event,this)"
                     onmouseleave="window.app.hidePassTooltip()">
                    <div class="np-level-badge">LVL ${node.lvl}</div>
                    ${orbitsHTML}
                    ${starsHTML}
                    <div class="np-reward-icon ${rarity==='legendary'&&isUnlocked&&!isClaimed?'np-icon-glow':''}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="np-reward-name">${node.name}</div>
                    <div class="np-type-badge">${typeLabels[node.type]||node.type}</div>
                    ${action}
                </div>
            </div>`;
        });

        container.innerHTML = html;

        setTimeout(() => {
            const firstClaim = container.querySelector('.unlocked:not(.claimed) .np-btn-claim');
            const target = firstClaim ? firstClaim.closest('.np-node') : container.querySelector('.np-card:not(.unlocked)');
            if(target) target.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
        }, 250);
    },

    // Tooltip del pass
    showPassTooltip(event, card) {
        const tt = document.getElementById('np-tooltip');
        if (!tt) return;
        const rarity  = card.dataset.rarity;
        const rarityColors = { common: '#64748b', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };
        const rarityLabels = { common: 'COMÚN', rare: 'RARO', epic: 'ÉPICO', legendary: 'LEGENDARIO' };
        tt.querySelector('#np-tt-rarity').style.color = rarityColors[rarity] || '#fff';
        tt.querySelector('#np-tt-rarity').innerText   = rarityLabels[rarity] || rarity.toUpperCase();
        tt.querySelector('#np-tt-name').innerText     = card.dataset.name;
        tt.querySelector('#np-tt-type').innerText     = card.dataset.type;
        tt.querySelector('#np-tt-desc').innerText     = card.dataset.desc;
        tt.style.borderColor = (rarityColors[rarity] || '#fff') + '40';
        // Posicionar encima del card
        const rect = card.getBoundingClientRect();
        tt.style.left = `${rect.left + rect.width / 2 - 90}px`;
        tt.style.top  = `${rect.top - 110}px`;
        tt.classList.add('visible');
    },
    hidePassTooltip() {
        const tt = document.getElementById('np-tooltip');
        if(tt) tt.classList.remove('visible');
    },

    claimPassReward(lvl) {
        const reward = CONFIG.BATTLE_PASS.find(n => n.lvl === lvl);
        if (!reward) return;
        if (!this.stats.passClaimed) this.stats.passClaimed = [];
        if (this.stats.passClaimed.includes(lvl)) return;

        this.stats.passClaimed.push(lvl);

        if (reward.type === 'CREDITS') {
            this.addScore(0, reward.val);
        } else if (['THEME','PARTICLE','AVATAR','HARDWARE'].includes(reward.type)) {
            if (!this.shop.inventory.includes(reward.val)) this.shop.inventory.push(reward.val);
        } else if (reward.type === 'GAME_UNLOCK') {
            if(!this.stats.unlockedGames) this.stats.unlockedGames = [];
            if(!this.stats.unlockedGames.includes(reward.val)) {
                this.stats.unlockedGames.push(reward.val);
                this.showToast("¡JUEGO DESBLOQUEADO!", "Cyber Pong disponible", "gold");
            }
        }

        // Efectos por rareza
        const rarityColors = {
            common: '#64748b', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b'
        };
        const color = rarityColors[reward.rarity] || '#d946ef';

        if (reward.rarity === 'legendary') {
            this.audio.playWin(10);
            // Triple explosión para legendary
            setTimeout(() => this.canvas.explode(window.innerWidth*0.3, window.innerHeight*0.5, color), 0);
            setTimeout(() => this.canvas.explode(window.innerWidth*0.5, window.innerHeight*0.3, '#ffffff'), 150);
            setTimeout(() => this.canvas.explode(window.innerWidth*0.7, window.innerHeight*0.5, color), 300);
        } else if (reward.rarity === 'epic') {
            this.audio.playWin(7);
            this.canvas.explode(window.innerWidth/2, window.innerHeight/2, color);
        } else {
            this.audio.playWin(3);
            this.canvas.explode(window.innerWidth/2, window.innerHeight/2, color);
        }

        const rarityLabel = { common:'COMÚN', rare:'RARO', epic:'ÉPICO', legendary:'LEGENDARIO' };
        this.showToast(`[${rarityLabel[reward.rarity]||''}] ${reward.name}`, reward.desc || '', 'purple');

        this.save();
        this.renderPassScreen();
    },

    // --- FUNCIÓN DE INFORMACIÓN (MODAL TÁCTICO) ---
    showGameInfo(gameId) {
        if(window.event) window.event.stopPropagation();
        this.audio.playClick();

        const info = CONFIG.GAME_INFO[gameId];
        const meta = CONFIG.GAMES_LIST.find(g => g.id === gameId);
        if(!info || !meta) return;

        const color     = CONFIG.COLORS[meta.color] || '#3b82f6';
        const score     = this.getBest(gameId);
        const rank      = this.calculateRank(gameId, score);
        const rankColors = { S:'#fbbf24', A:'#10b981', B:'#3b82f6', F:'#475569' };
        const rankColor  = rankColors[rank] || '#475569';
        const diffIcons  = { Timing:'fa-stopwatch', Reflejos:'fa-bolt', Memoria:'fa-brain', Precisión:'fa-crosshairs', Mental:'fa-brain', Cognitivo:'fa-puzzle-piece', Conocimiento:'fa-graduation-cap', Estándar:'fa-gamepad' };
        const diffIcon   = `fa-solid ${diffIcons[info.diff] || 'fa-gamepad'}`;

        const modal   = document.getElementById('modal-info');
        const content = document.getElementById('info-content');

        content.innerHTML = `
        <div class="gi-root">
            <!-- Fondo con color del juego -->
            <div class="gi-bg" style="--gc:${color};"></div>

            <!-- Header del juego -->
            <div class="gi-header">
                <div class="gi-icon-ring" style="--gc:${color};">
                    <i class="${meta.icon}"></i>
                </div>
                <div class="gi-title-block">
                    <div class="gi-game-name">${meta.name.toUpperCase()}</div>
                    <div class="gi-game-sub" style="color:${color};">${meta.desc}</div>
                </div>
                <div class="gi-rank-display" style="--rc:${rankColor};">
                    <div class="gi-rank-letter">${rank}</div>
                    <div class="gi-rank-label">RÉCORD</div>
                    <div class="gi-rank-score">${score > 0 ? score : '—'}</div>
                </div>
            </div>

            <!-- Divisor -->
            <div class="gi-divider" style="background:linear-gradient(90deg,${color}40,${color}10,transparent);"></div>

            <!-- Info cards -->
            <div class="gi-cards">
                <div class="gi-card">
                    <div class="gi-card-lbl"><i class="fa-solid fa-crosshairs"></i> OBJETIVO</div>
                    <div class="gi-card-val">${info.desc}</div>
                </div>
                <div class="gi-card">
                    <div class="gi-card-lbl"><i class="fa-solid fa-microchip"></i> MECÁNICA</div>
                    <div class="gi-card-val">${info.mech}</div>
                </div>
                <div class="gi-card gi-card-highlight" style="border-color:${color}30; background:${color}08;">
                    <div class="gi-card-lbl" style="color:${color};"><i class="fa-solid fa-trophy"></i> CONDICIÓN DE VICTORIA</div>
                    <div class="gi-card-val" style="color:white; font-weight:600;">${info.obj}</div>
                </div>
            </div>

            <!-- Stat pills -->
            <div class="gi-pills">
                <div class="gi-pill">
                    <i class="${diffIcon}" style="color:${color};"></i>
                    <span>${info.diff || 'Estándar'}</span>
                </div>
                <div class="gi-pill">
                    <i class="fa-solid fa-bolt" style="color:#fbbf24;"></i>
                    <span>XP ALTO</span>
                </div>
                <div class="gi-pill">
                    <i class="fa-solid fa-gamepad" style="color:#a855f7;"></i>
                    <span>${Object.keys(this.highScores).includes(gameId) ? 'JUGADO' : 'SIN JUGAR'}</span>
                </div>
            </div>

            <!-- Botón -->
            <button class="gi-play-btn" style="--gc:${color};"
                    onclick="document.getElementById('modal-info').classList.add('hidden'); window.app.launch('${gameId}');">
                <i class="fa-solid fa-play"></i>
                JUGAR AHORA
            </button>
        </div>`;

        modal.classList.remove('hidden');
    },

    // --- RENDER MENU ---
    activeFilter: 'ALL',

    setLobbyFilter(cat, btn) {
        this.activeFilter = cat;
        document.querySelectorAll('.lf-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        this.audio.playClick();
        this.renderMenu();
    },


    // ─── TUTORIAL INTERACTIVO ───────────────────────────────
    startTutorial() {
        if(this.stats.tutorialDone) return;
        this.tutStep = 0;
        const steps = [
            { target: '.main-nav-brand',    title: 'PROTOCOLOS',        desc: 'Bienvenido al sistema. Aquí verás el nombre y el botón de partida aleatoria.',               pos: 'bottom' },
            { target: '.main-nav-tabs',     title: 'NAVEGACIÓN',        desc: 'Accede al Protocolo Diario, Misiones Semanales, Neon Pass, Tienda y tu Perfil.',            pos: 'bottom' },
            { target: '.lobby-filters',     title: 'FILTROS',           desc: 'Filtra los juegos por categoría: Reflejos, Memoria, Mental, Acción o Conocimiento.',        pos: 'bottom' },
            { target: '.game-card-v2',      title: 'JUEGOS',            desc: 'Haz click para jugar. El ícono (i) muestra info del juego. Acumulas récords y XP.',         pos: 'right'  },
            { target: '.status-bar',        title: 'ESTADO DEL AGENTE', desc: 'Tu rango, barra de XP, créditos y racha diaria. Todo progresa con cada partida.',           pos: 'top'    },
        ];
        this._tutSteps = steps;
        this._showTutStep(0);
    },

    _showTutStep(idx) {
        this._removeTutorial();
        const steps = this._tutSteps;
        if(idx >= steps.length) { this._finishTutorial(); return; }

        const step = steps[idx];
        const el   = document.querySelector(step.target);
        if(!el) { this._showTutStep(idx + 1); return; }

        const rect = el.getBoundingClientRect();
        const pad  = 8;

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';

        // Spotlight
        const spot = document.createElement('div');
        spot.className = 'tutorial-spotlight';
        spot.style.cssText = [
            'left:'   + (rect.left   - pad) + 'px',
            'top:'    + (rect.top    - pad) + 'px',
            'width:'  + (rect.width  + pad*2) + 'px',
            'height:' + (rect.height + pad*2) + 'px',
        ].join(';');
        overlay.appendChild(spot);

        // Tooltip
        const tt   = document.createElement('div');
        tt.className = 'tutorial-tooltip';

        // Dots
        const dotsHTML = steps.map((_,i) =>
            '<div class="tut-dot' + (i===idx?' active':'') + '"></div>'
        ).join('');

        tt.innerHTML = [
            '<div class="tut-step">PASO ' + (idx+1) + ' / ' + steps.length + '</div>',
            '<div class="tut-title">' + step.title + '</div>',
            '<div class="tut-desc">'  + step.desc  + '</div>',
            '<div class="tut-actions">',
            '  <div class="tut-dots">' + dotsHTML + '</div>',
            '  <div style="display:flex;gap:6px;">',
            '    <button class="tut-btn-skip" id="tut-skip">SALTAR</button>',
            '    <button class="tut-btn-next" id="tut-next">' + (idx===steps.length-1?'LISTO':'SIGUIENTE') + '</button>',
            '  </div>',
            '</div>',
        ].join('');

        // Posición del tooltip
        const ttW = 280, ttH = 150;
        let ttLeft, ttTop;
        if(step.pos === 'bottom') {
            ttLeft = Math.min(rect.left, window.innerWidth  - ttW - 16);
            ttTop  = rect.bottom + pad + 10;
        } else if(step.pos === 'top') {
            ttLeft = Math.min(rect.left, window.innerWidth  - ttW - 16);
            ttTop  = rect.top - ttH - pad - 10;
        } else {
            ttLeft = rect.right + pad + 10;
            ttTop  = rect.top;
        }
        ttLeft = Math.max(8, ttLeft);
        ttTop  = Math.max(8, ttTop);
        tt.style.left = ttLeft + 'px';
        tt.style.top  = ttTop  + 'px';
        overlay.appendChild(tt);
        document.body.appendChild(overlay);

        // Eventos
        tt.querySelector('#tut-next').onclick = () => { try{this.audio.playClick();}catch(e){} this._showTutStep(idx + 1); };
        tt.querySelector('#tut-skip').onclick = () => { try{this.audio.playClick();}catch(e){} this._finishTutorial(); };
        this.tutStep = idx;
    },

    _removeTutorial() {
        const el = document.getElementById('tutorial-overlay');
        if(el) el.remove();
    },

    _finishTutorial() {
        this._removeTutorial();
        this.stats.tutorialDone = true;
        this.save();
        this.showToast('SISTEMA DOMINADO', 'Tutorial completado. ¡A jugar!', 'success');
    },

    renderRecommendation() {
        const el = document.getElementById('lobby-recommend');
        if(!el) return;

        const scored = CONFIG.GAMES_LIST.filter(g => {
            const locked = g.unlockReq && !(this.stats.unlockedGames||[]).includes(g.id);
            return !locked;
        }).map(g => ({
            g,
            best:  this.getBest(g.id),
            rank:  this.calculateRank(g.id, this.getBest(g.id)),
            color: CONFIG.COLORS[g.color] || '#3b82f6'
        }));

        // Prioridad: juegos sin récord (rank F con score 0), luego juegos con rank bajo
        const noRecord = scored.filter(x => x.best === 0);
        const lowRank  = scored.filter(x => x.rank === 'F' && x.best > 0);
        const pick     = noRecord.length > 0
            ? noRecord[Math.floor(Math.random() * Math.min(noRecord.length, 5))]
            : lowRank.length > 0
                ? lowRank[Math.floor(Math.random() * Math.min(lowRank.length, 5))]
                : scored.sort((a,b) => a.best - b.best)[0];

        if(!pick) { el.style.display = 'none'; return; }

        const msg = pick.best === 0 ? 'Sin récord aún' : `Récord actual: ${pick.best.toLocaleString()} pts`;
        const dailyTask = this.daily.tasks?.find(t => t.gameId === pick.g.id && !t.done);

        el.style.display = 'block';
        el.innerHTML = `
        <div style="margin:0 0 8px;padding:10px 16px;background:rgba(10,16,30,0.7);border:1px solid ${pick.color}20;border-left:3px solid ${pick.color};border-radius:12px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.15s;"
             onmouseenter="this.style.background='rgba(10,16,30,0.95)';this.style.borderColor='${pick.color}40';"
             onmouseleave="this.style.background='rgba(10,16,30,0.7)';this.style.borderColor='${pick.color}20';"
             onclick="window.app.launch('${pick.g.id}')">
            <div style="width:36px;height:36px;border-radius:10px;background:${pick.color}12;border:1px solid ${pick.color}20;display:flex;align-items:center;justify-content:center;color:${pick.color};font-size:1rem;flex-shrink:0;">
                <i class="${pick.g.icon}"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.58rem;color:#334155;font-family:monospace;letter-spacing:2px;margin-bottom:1px;">PROTOCOLO RECOMENDADO</div>
                <div style="font-family:var(--font-display);font-size:0.8rem;color:white;letter-spacing:1px;">${pick.g.name}</div>
                <div style="font-size:0.6rem;color:#475569;margin-top:1px;">${msg}${dailyTask ? ' · <span style="color:#f97316;">Misión diaria pendiente</span>' : ''}</div>
            </div>
            <div style="font-size:0.65rem;color:${pick.color};font-family:monospace;display:flex;align-items:center;gap:5px;flex-shrink:0;">
                JUGAR <i class="fa-solid fa-play" style="font-size:0.55rem;"></i>
            </div>
        </div>`;
    },

    renderMenu() {
        const container = document.getElementById('main-menu-grid');
        if(!container) return;
        if(!this.stats.unlockedGames) this.stats.unlockedGames = [];

        // Tutorial primera vez
        if(!this.stats.tutorialDone && this.stats.gamesPlayed === 0) {
            setTimeout(() => this.startTutorial(), 800);
        }
        // Banner de recomendación
        this.renderRecommendation();

        container.innerHTML = CONFIG.GAMES_LIST.filter(g => {
            if(!g.id || g.unlockLevel) return true; // siempre incluir bloqueados visualmente
            return this.activeFilter === 'ALL' || g.cat === this.activeFilter;
        }).map(g => {
            const color    = CONFIG.COLORS[g.color] || '#fff';
            const score    = this.getBest(g.id);
            const rank     = this.calculateRank(g.id, score);
            const rankColors = { S:'#fbbf24', A:'#10b981', B:'#3b82f6', F:'#ef4444' };
            const rankColor  = rankColors[rank] || '#475569';
            const isLocked   = g.unlockReq && !this.stats.unlockedGames.includes(g.id);

            if(isLocked) {
                return `
                    <div class="game-card-v2 locked"
                         onclick="window.app.showToast('ACCESO DENEGADO','Neon Pass Nivel 5 requerido','danger')">
                        <div class="gcv2-body">
                            <div class="gcv2-icon" style="color:#334155;font-size:1.8rem;">
                                <i class="fa-solid fa-lock"></i>
                            </div>
                            <div class="gcv2-name" style="color:#334155;">CLASIFICADO</div>
                            <div class="gcv2-desc">${g.name}</div>
                        </div>
                    </div>`;
            }

            return `
                <div class="game-card-v2" data-game-id="${g.id}"
                     style="border-color:${color}25; --gc:${color};"
                     onmouseenter="this.style.borderColor='${color}60'; this.style.boxShadow='0 8px 24px ${color}20';"
                     onmouseleave="this.style.borderColor='${color}25'; this.style.boxShadow='';">
                    <button class="gcv2-info" onclick="event.stopPropagation(); window.app.showGameInfo('${g.id}')">
                        <i class="fa-solid fa-info"></i>
                    </button>
                    <div class="gcv2-body" onclick="window.app.launch('${g.id}')">
                        <div class="gcv2-icon" style="color:${color};">
                            <i class="${g.icon}"></i>
                        </div>
                        <div class="gcv2-name">${g.name}</div>
                        <div class="gcv2-desc">${g.desc}</div>
                    </div>
                    <div class="gcv2-footer">
                        <div class="gcv2-score">REC <span>${score > 0 ? score.toLocaleString() : '—'}</span></div>
                        <div class="gcv2-rank" style="background:${rankColor}20; color:${rankColor};">${rank}</div>
                    </div>
                </div>`;
        }).join('');
    },

    // --- RESTO DE FUNCIONES ---

    // Sentinel para distinguir "salí del lobby sin jugar" vs "jugué y saqué 0"
    _EXIT_CLEAN: Symbol('exit_clean'),

    launch(gameId, GameClass = null) {
    this.audio.playClick();
    const ClassRef = GameClass || this.gameClasses[gameId];
    if(!ClassRef) return;
    
    this.stats.gamesPlayed++;
    this.activeGameId = gameId; 
    this.save();
    this.changeState(CONFIG.STATES.GAME);
    
    const ui = document.getElementById('game-ui-overlay');
    ui.innerHTML = '';
    ui.removeAttribute('style');

    const EXIT = this._EXIT_CLEAN;

    const onGameOverSmart = (finalScore = EXIT) => {
        // EXIT o null/undefined → salida del lobby sin haber jugado
        const isCleanExit = (finalScore === EXIT || finalScore === null || finalScore === undefined);
        
        if (!isCleanExit) {
            this.saveHighScore(gameId, finalScore);
        }

        this.showGameOverScreen(
            isCleanExit ? null : finalScore,
            gameId,
            () => { if (this.game && this.game.init) this.game.init(); },
            () => { if (this.game && this.game.cleanup) this.game.cleanup(); this.endGame(); }
        );
    };

    // Parchear todos los juegos que llaman onQuit(0) desde el menú de selección
    // para que usen el sentinel de salida limpia
    const patchedCallback = (score) => {
        if (score === 0 && this.game && !this.game._hasStarted) {
            onGameOverSmart(EXIT);
        } else {
            onGameOverSmart(score);
        }
    };

    this.game = new ClassRef(this.canvas, this.audio, patchedCallback);
    this.game.gameId = gameId;
    this.game._hasStarted = false; // Flag que los juegos activan al iniciar la partida real

    // Parchear métodos que indican que la partida real comenzó
    const markStarted = () => { if(this.game) this.game._hasStarted = true; };
    ['startGame','start','startRound','startGameLoop','prepareRound','go','nextRound','nextQuestion'].forEach(method => {
        if(typeof this.game[method] === 'function') {
            const orig = this.game[method].bind(this.game);
            this.game[method] = (...args) => { markStarted(); return orig(...args); };
        }
    });
    
    setTimeout(() => this.game.init(), 100);
},

    endGame() {
        if (this.game) {
            let xpGain = 10;
            if (typeof this.game.score === 'number' && this.game.score > 0) xpGain += Math.min(100, Math.floor(this.game.score));
            
            if (this.shop.inventory.includes('up_xp')) {
                xpGain = Math.ceil(xpGain * 1.15); 
            }
            
            this.gainXP(xpGain);
            if (typeof this.game.score === 'number' && this.activeGameId) {
                // Marcar misión diaria
                const task = this.daily.tasks.find(t => t.gameId === this.activeGameId);
                if (task && !task.done && this.game.score >= task.target) {
                    task.done = true;
                    this.showToast('¡MISIÓN CUMPLIDA!', 'Objetivo alcanzado', 'daily');
                    this.audio.playWin(5);
                    this.save();
                }
                // Marcar misión semanal
                const wtask = this.weekly.tasks?.find(t => t.gameId === this.activeGameId);
                if (wtask && !wtask.done && this.game.score >= wtask.target) {
                    wtask.done = true;
                    this.showToast('¡MISIÓN SEMANAL!', wtask.label, 'gold');
                    const wDone = this.weekly.tasks.filter(t=>t.done).length;
                    if(wDone === this.weekly.tasks.length) {
                        setTimeout(()=>this.showToast('¡TODAS LAS MISIONES!','Reclama tu recompensa semanal','purple'),1000);
                    }
                    this.save();
                }
            }
            this.checkAchievements(); clearInterval(this.game.timerInterval);
            if(this.game.animationId) cancelAnimationFrame(this.game.animationId);
            if(this.game.cleanup) this.game.cleanup();
        }
        this.game = null;
        this.activeGameId = null;
        this.canvas.setMood(0);
        this.changeState(CONFIG.STATES.MENU);
    },

    saveHighScore(gameId, score) {
        if (!gameId || typeof score !== 'number') return;
        
        // Inicializar estructura si no existe
        if (!this.highScores[gameId] || typeof this.highScores[gameId] === 'number') {
            const oldBest = typeof this.highScores[gameId] === 'number' ? this.highScores[gameId] : 0;
            this.highScores[gameId] = { best: oldBest, history: [] };
        }
        
        const entry = this.highScores[gameId];
        
        // Añadir al historial (máximo 10 entradas)
        entry.history.unshift({ score, date: new Date().toLocaleDateString('es', { day:'2-digit', month:'2-digit' }) });
        if (entry.history.length > 10) entry.history.pop();
        
        // Actualizar récord
        if (score > entry.best) {
            entry.best = score;
            this.showToast("¡NUEVO RÉCORD!", `Score: ${score}`, "gold");
            this.audio.playWin(10);
        }
        
        this.save();
    },

    // Helper para obtener el best score independientemente del formato
    getBest(gameId) {
        const entry = this.highScores[gameId];
        if (!entry) return 0;
        if (typeof entry === 'number') return entry;
        return entry.best || 0;
    },

    showGameOverScreen(score, gameId, onRetry, onQuit) {
        if (score === null || score === undefined) {
            const ui = document.getElementById('game-ui-overlay');
            if(ui) ui.innerHTML = '';
            this.updateUI();
            // Volver al menú inmediatamente — salida limpia sin tarjeta
            if(typeof onQuit === 'function') onQuit();
            return;
        }

        this.setCritical(false);
        const ui = document.getElementById('game-ui-overlay');

        // Lógica de negocio
        const rank = this.calculateRank(gameId, score);
        let prize = 0;
        if(rank === 'S') prize = Math.floor(score * 1.5) + 50;
        else if(rank === 'A') prize = Math.floor(score * 1.2) + 20;
        else if(rank === 'B') prize = Math.floor(score);
        else prize = Math.floor(score * 0.5);
        if (['higher-lower', 'guess-card', 'bio-scan', 'geo-net'].includes(gameId)) prize = 0;
        if (prize > 0 && this.shop.inventory.includes('up_credit')) prize = Math.ceil(prize * 1.10);
        if (prize > 0) { this.credits += prize; this.save(); }
        // Tracking para logros
        if(prize > (this.stats.bestPrize||0)) this.stats.bestPrize = prize;
        if(rank === 'S') this.stats.hasRankS = true;
        if(new Date().getHours() >= 0 && new Date().getHours() < 4) this.stats.playedLate = true;

        // XP ganado
        let xpGain = 10 + Math.min(100, Math.floor(score));
        if (this.shop.inventory.includes('up_xp')) xpGain = Math.ceil(xpGain * 1.15);
        const prevXP = this.stats.xp;
        const prevLvl = this.stats.level;

        const gameMeta = CONFIG.GAMES_LIST.find(g => g.id === gameId);
        const gameColor = gameMeta ? (CONFIG.COLORS[gameMeta.color] || '#3b82f6') : '#3b82f6';

        const rankData = {
            S: { color: '#fbbf24', label: 'ÉLITE',   sub: 'RENDIMIENTO EXCEPCIONAL', bg: 'rgba(251,191,36,0.06)' },
            A: { color: '#10b981', label: 'EXPERTO', sub: 'MISIÓN COMPLETADA',        bg: 'rgba(16,185,129,0.06)' },
            B: { color: '#3b82f6', label: 'AGENTE',  sub: 'PROTOCOLO EJECUTADO',      bg: 'rgba(59,130,246,0.06)' },
            F: { color: '#ef4444', label: 'CRÍTICO', sub: 'PROTOCOLO FALLIDO',        bg: 'rgba(239,68,68,0.06)'  }
        };
        const rd = rankData[rank] || rankData.F;
        const isGood = rank === 'S' || rank === 'A';

        if(isGood) this.audio.playWin(rank === 'S' ? 10 : 5);
        else this.audio.playLose();

        // Tarjeta de resultado equipada
        const cardStyle = this.shop?.equipped?.callcard || 'default';

        // Badge de referencia del universo de la callcard
        const ccRef = CONFIG.SHOP.find(s=>s.val===cardStyle&&s.type==='CALLCARD');
        const refBadge = (ccRef?.ref) ? `<div class="cod-ref-badge">// ${ccRef.ref}</div>` : '';

        ui.innerHTML = `
        <div class="cod-overlay cc-${cardStyle}" id="cod-overlay">
            <!-- Canvas para efecto de fondo de la callcard -->
            <canvas class="cc-canvas" id="cc-canvas"></canvas>
            ${refBadge}

            <!-- Franja de rango (entra desde la izquierda) -->
            <div class="cod-rank-stripe" id="cod-stripe" style="background:${rd.color}18; border-color:${rd.color}30;">
                <div class="cod-rank-badge" style="color:${rd.color}; border-color:${rd.color}; box-shadow:0 0 40px ${rd.color}40;" id="cod-rank-letter">${rank}</div>
                <div class="cod-rank-texts">
                    <div class="cod-rank-class" style="color:${rd.color};">${rd.label}</div>
                    <div class="cod-rank-sub">${rd.sub}</div>
                </div>
                <div class="cod-game-badge" style="color:${gameColor}; border-color:${gameColor}30;">
                    ${gameMeta ? `<i class="${gameMeta.icon}"></i> ${gameMeta.name.toUpperCase()}` : 'PROTOCOLO'}
                </div>
            </div>

            <!-- Panel de datos (entra desde la derecha) -->
            <div class="cod-data-panel" id="cod-data">

                <!-- Agente -->
                <div class="cod-agent-row">
                    <div class="cod-agent-avatar" style="border-color:${gameColor}50; background:${gameColor}10;">
                        <i class="fa-solid ${this.stats.avatar || 'fa-user-astronaut'}" style="color:${gameColor};"></i>
                    </div>
                    <div class="cod-agent-info">
                        <div class="cod-agent-name">AGENTE</div>
                        <div class="cod-agent-rank">${this.getRankName(this.stats.level)}</div>
                        ${(() => {
                            const t = CONFIG.TITLES && CONFIG.TITLES.find(t => t.id === this.stats.equippedTitle);
                            return t ? '<div style="font-size:0.52rem;color:#a855f7;font-family:monospace;letter-spacing:1px;margin-top:1px;">' + t.name + '</div>' : '';
                        })()}
                    </div>
                    <div class="cod-agent-level" style="color:${gameColor};">LVL ${this.stats.level}</div>
                </div>

                <!-- Métricas -->
                <div class="cod-metrics">
                    <div class="cod-metric" id="cod-score">
                        <div class="cod-m-label"><i class="fa-solid fa-crosshairs"></i> PUNTUACIÓN</div>
                        <div class="cod-m-val" data-target="${score}">0</div>
                    </div>
                    <div class="cod-metric" id="cod-prize">
                        <div class="cod-m-label"><i class="fa-solid fa-coins"></i> CRÉDITOS</div>
                        <div class="cod-m-val" style="color:var(--gold);" data-target="${prize}">+0</div>
                    </div>
                    <div class="cod-metric" id="cod-xp">
                        <div class="cod-m-label"><i class="fa-solid fa-bolt"></i> XP GANADO</div>
                        <div class="cod-m-val" style="color:#a855f7;" data-target="${xpGain}">+0</div>
                    </div>
                </div>

                <!-- Barra XP -->
                <div class="cod-xp-section">
                    <div class="cod-xp-label">
                        <span>PROGRESIÓN NEURAL</span>
                        <span id="cod-xp-nums">LVL ${prevLvl}</span>
                    </div>
                    <div class="cod-xp-track">
                        <div class="cod-xp-fill" id="cod-xp-bar" style="width:0%; background:linear-gradient(90deg, var(--primary), #a855f7);"></div>
                        <div class="cod-xp-gain-marker" id="cod-xp-marker" style="opacity:0; background:#a855f7;"></div>
                    </div>
                </div>

                <!-- Comparador de rivales -->
                ${(() => {
                    const sortedRivals = [...CONFIG.RIVALS].sort((a,b) => a.xp - b.xp);
                    const playerXP = (this.stats.level * 100) + (this.stats.xp || 0);
                    const beaten   = sortedRivals.filter(r => playerXP >= r.xp);
                    const next     = sortedRivals.find(r => playerXP < r.xp);
                    const scoreBeaten = sortedRivals.filter(r => score >= (r.xp/100));
                    if(!next && !beaten.length) return '';
                    let html = '<div class="cod-rivals">';
                    if(beaten.length > 0) {
                        const top = beaten[beaten.length-1];
                        html += `<div class="cod-rival beaten"><i class="fa-solid fa-trophy" style="color:${top.color};"></i> SUPERASTE A <span style="color:${top.color};">${top.name}</span></div>`;
                    }
                    if(next) {
                        const diff = next.xp - playerXP;
                        html += `<div class="cod-rival next"><i class="fa-solid fa-angle-up"></i> ${diff.toLocaleString()} XP para superar a <span style="color:${next.color};">${next.name}</span></div>`;
                    }
                    html += '</div>';
                    return html;
                })()}

                <!-- Acciones -->
                <div class="cod-actions">
                    <button class="cod-btn cod-btn-secondary" id="univ-quit">
                        <i class="fa-solid fa-arrow-left"></i> SALIR
                    </button>
                    <button class="cod-btn cod-btn-primary" id="univ-retry"
                            style="border-color:${rd.color}; color:${rd.color}; background:${rd.color}12;">
                        <i class="fa-solid fa-rotate-right"></i> REINTENTAR
                    </button>
                </div>

                <div class="cod-footer">ARCADE_OS v3.5 // SESIÓN ${Math.floor(Math.random()*99999).toString().padStart(5,'0')}</div>
            </div>
        </div>`;

        // Iniciar efecto de callcard en canvas de fondo
        this._startCallcardEffect(cardStyle, rd.color);

        // Explosión de partículas en S/A
        if(isGood && this.canvas) {
            setTimeout(() => this.canvas.explode(window.innerWidth*0.5, window.innerHeight*0.5, rd.color), 600);
            if(rank === 'S') {
                setTimeout(() => this.canvas.explode(window.innerWidth*0.25, window.innerHeight*0.5, rd.color), 900);
                setTimeout(() => this.canvas.explode(window.innerWidth*0.75, window.innerHeight*0.5, rd.color), 1100);
            }
        }

        // Animar contadores
        const animateCounter = (el, target, prefix='', duration=1200) => {
            if(!el) return;
            const start = performance.now();
            const isScore = prefix === '';
            const update = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const ease = 1 - Math.pow(1-t, 3);
                const val = Math.floor(ease * target);
                el.textContent = isScore ? val.toLocaleString() : `+${val.toLocaleString()}`;
                if(t < 1) requestAnimationFrame(update);
                else el.textContent = isScore ? target.toLocaleString() : `+${target.toLocaleString()}`;
            };
            requestAnimationFrame(update);
        };

        // Secuencia de animaciones
        setTimeout(() => {
            const stripe = document.getElementById('cod-stripe');
            const data   = document.getElementById('cod-data');
            if(stripe) stripe.classList.add('slide-in');
            if(data)   data.classList.add('slide-in');
        }, 100);

        setTimeout(() => animateCounter(document.querySelector('#cod-score .cod-m-val'), score), 600);
        setTimeout(() => animateCounter(document.querySelector('#cod-prize .cod-m-val'), prize, '+'), 900);
        setTimeout(() => animateCounter(document.querySelector('#cod-xp .cod-m-val'), xpGain, '+'), 1100);

        // Animar XP bar
        setTimeout(() => {
            const req = this.getReqXP(prevLvl);
            const startPct = Math.min(100, (prevXP / req) * 100);
            const endXP = prevXP + xpGain;
            const endPct = Math.min(100, (endXP / req) * 100);
            const bar = document.getElementById('cod-xp-bar');
            const marker = document.getElementById('cod-xp-marker');
            const numsEl = document.getElementById('cod-xp-nums');
            if(bar) {
                bar.style.transition = 'none';
                bar.style.width = `${startPct}%`;
                setTimeout(() => {
                    bar.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)';
                    bar.style.width = `${Math.min(100, endPct)}%`;
                    if(marker) {
                        marker.style.left = `${startPct}%`;
                        marker.style.opacity = '1';
                        setTimeout(() => { marker.style.left=`${Math.min(99, endPct)}%`; marker.style.transition='left 1.2s cubic-bezier(0.4,0,0.2,1)'; }, 50);
                    }
                }, 50);
            }
            if(numsEl) numsEl.textContent = `${Math.floor(prevXP)} → ${Math.floor(prevXP + xpGain)} / ${req} XP`;
        }, 1200);

        document.getElementById('univ-retry').onclick = () => { ui.innerHTML = ''; onRetry(); };
        document.getElementById('univ-quit').onclick  = () => { ui.innerHTML = ''; onQuit();  };
        this.updateUI();
    },

    updateUI() {
        const get = id => document.getElementById(id);
        const credits   = get('menu-credits');
        const valCr     = get('val-credits');
        const lvlEl     = get('player-level');
        const rankEl    = get('player-rank');
        const xpBar     = get('xp-bar');
        const xpText    = get('xp-text');
        // Nav icon + status avatar
        const navIcon    = get('profile-nav-icon');
        const statusIcon = get('status-avatar-icon');

        if(credits)  credits.innerText  = this.credits.toLocaleString();
        if(valCr)    valCr.innerText    = this.credits.toLocaleString();

        const lvl = this.stats.level || 1;
        const xp  = this.stats.xp    || 0;
        const req = this.getReqXP(lvl);
        const pct = Math.min(100, (xp / req) * 100);

        if(lvlEl)    lvlEl.innerText    = lvl;
        if(rankEl)   rankEl.innerText   = this.getRankName(lvl).toUpperCase();
        if(xpBar)    xpBar.style.width  = `${pct}%`;
        if(xpText)   xpText.innerText   = `${Math.floor(xp)} / ${req} XP`;

        // Título equipado en status bar
        const titleEl = get('status-title');
        if(titleEl) {
            const t = CONFIG.TITLES?.find(t => t.id === this.stats.equippedTitle);
            titleEl.textContent = t ? t.name : '';
            titleEl.style.display = t ? 'block' : 'none';
        }

        const avatarClass = `fa-solid ${this.stats.avatar || 'fa-user-astronaut'}`;
        if(navIcon)    navIcon.className    = avatarClass;
        if(statusIcon) statusIcon.className = avatarClass;

        // Streak display
        const streakBar  = get('streak-bar');
        const streakDays = get('streak-days');
        if(streakBar && this.streak?.days > 1) {
            streakBar.style.display = 'flex';
            if(streakDays) streakDays.textContent = `${this.streak.days}d`;
        }

        // Badge semanal en nav
        const wDone = (this.weekly?.tasks||[]).filter(t=>t.done).length;
        const wTotal = (this.weekly?.tasks||[]).length;
        const wBtn = get('btn-weekly');
        if(wBtn) {
            const existing = wBtn.querySelector('.nav-claimable-dot');
            if(wDone===wTotal && wTotal>0 && !this.weekly?.claimed) {
                if(!existing) { const dot=document.createElement('span'); dot.className='nav-claimable-dot'; dot.style.cssText='position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:#a855f7;'; wBtn.style.position='relative'; wBtn.appendChild(dot); }
            } else if(existing) existing.remove();
        }
    },
    showToast(title, msg, type = 'default') {
        const container = document.getElementById('toast-container');
        if(!container) return;

        const el = document.createElement('div');

        // Configuración por tipo — icono, color de acento, duración
        const cfg = {
            gold:    { icon:'fa-trophy',       accent:'#fbbf24', dur:4000 },
            purple:  { icon:'fa-arrow-up',      accent:'#a855f7', dur:3500 },
            success: { icon:'fa-check',         accent:'#10b981', dur:2800 },
            danger:  { icon:'fa-skull',         accent:'#ef4444', dur:3000 },
            daily:   { icon:'fa-calendar-check',accent:'#f97316', dur:3500 },
            default: { icon:'fa-bell',          accent:'var(--primary)', dur:2500 },
        };
        const c = cfg[type] || cfg.default;
        const accentHex = c.accent.startsWith('#') ? c.accent : '#3b82f6';

        el.className = `toast-v2 toast-${type}`;
        el.style.setProperty('--ta', c.accent);
        el.innerHTML = `
            <div class="tv2-icon"><i class="fa-solid ${c.icon}"></i></div>
            <div class="tv2-body">
                <div class="tv2-title">${title}</div>
                ${msg ? `<div class="tv2-msg">${msg}</div>` : ''}
            </div>
            <div class="tv2-progress"><div class="tv2-bar" style="animation-duration:${c.dur}ms;"></div></div>`;

        container.appendChild(el);

        // Forzar reflow para animar
        void el.offsetWidth;
        el.classList.add('tv2-show');

        setTimeout(() => {
            el.classList.remove('tv2-show');
            el.classList.add('tv2-hide');
            setTimeout(() => el.remove(), 400);
        }, c.dur);
    },
    getRankName(level) { const ranks = [...CONFIG.RANKS].reverse(); const r = ranks.find(r => level >= r.lv); return r ? r.name : "VAGABUNDO"; },
    getReqXP(level) { return Math.floor(100 * level * 1.5); },
    gainXP(amount) { 
        this.stats.xp += amount; 
        let req = this.getReqXP(this.stats.level); 
        let leveledUp = false; 
        while (this.stats.xp >= req) { 
            this.stats.xp -= req; 
            this.stats.level++; 
            req = this.getReqXP(this.stats.level); 
            leveledUp = true; 
        } 
        if (leveledUp) { 
            this.audio.playWin(10); 
            this.showToast(`¡NIVEL ${this.stats.level} ALCANZADO!`, "¡Rango Subido!", "purple"); 
            this.credits += this.stats.level * 10; 
        } 
        this.save(); 
        this.updateUI(); 
    },
    calculateRank(gameId, score) {
        // Rangos específicos por juego — basados en lo que es realista alcanzar
        const thresholds = {
            // [F_max, B_min, A_min, S_min]
            // score < B_min → F, >= B_min → B, >= A_min → A, >= S_min → S
            'higher-lower':  [0, 10, 25, 50],
            'guess-card':    [0,  3,  8, 15],
            'trivia':        [0, 30, 50, 70],
            'bio-scan':      [0, 30, 50, 70],
            'geo-net':       [0, 20, 40, 65],
            'hyper-reflex':  [0, 500, 700, 850],  // score = 1000 - ms
            'spam-click':    [0, 20, 35, 50],
            'neon-sniper':   [0,  5, 12, 20],
            'orbit-lock':    [0, 15, 30, 50],
            'memory-flash':  [0, 15, 30, 45],
            'vault-cracker': [0,  1,  2,  3],
            'phase-shifter': [0, 15, 30, 50],
            'math-rush':     [0, 15, 30, 50],
            'color-trap':    [0,  4,  8, 12],
            'holo-match':    [0,  1,  2,  3],
            'void-dodger':   [0,  5, 10, 18],
            'glitch-hunt':   [0,  2,  4,  7],
            'orbit-tracker': [0,  8, 15, 22],
            'cyber-typer':   [0,150,300,450],
            'cyber-pong':    [0,  2,  4,  7],
        };
        const t = thresholds[gameId];
        if(!t) {
            // Fallback genérico: porcentaje relativo al target diario
            const target = CONFIG.DAILY_TARGETS[gameId] || 50;
            if(score >= target * 2)   return 'S';
            if(score >= target * 1.2) return 'A';
            if(score >= target * 0.6) return 'B';
            return 'F';
        }
        if(score >= t[3]) return 'S';
        if(score >= t[2]) return 'A';
        if(score >= t[1]) return 'B';
        return 'F';
    },
    saveStat(key, val) { if(!this.stats[key] || val < this.stats[key]) this.stats[key] = val; this.save(); },
    showProfile() {
        const modal = document.getElementById('modal-profile');
        modal.classList.remove('hidden');

        const reflexRaw  = this.highScores['hyper-reflex'];
        const reflexBest = reflexRaw ? (typeof reflexRaw === 'number' ? reflexRaw : reflexRaw.best) : 0;
        const ctx = Object.assign({ credits: this.credits, bestReflex: reflexBest }, this.stats);

        // --- Definición de FA icons por logro (sin emojis) ---
        const achIcons = {
            rich:        'fa-gem',
            pro:         'fa-medal',
            sniper:      'fa-bolt',
            firstblood:  'fa-droplet',
            millionaire: 'fa-building-columns',
            dedicated:   'fa-screwdriver-wrench',
            collector:   'fa-box-open',
            speedgod:    'fa-fire',
            legend:      'fa-crown'
        };

        // Avatares
        const avatarsHTML = CONFIG.AVATARS.map(icon =>
            `<div class="pv2-avatar-opt ${this.stats.avatar === icon ? 'selected' : ''}"
                  onclick="window.app.setAvatar('${icon}')">
                <i class="fa-solid ${icon}"></i>
            </div>`
        ).join('');

        // Títulos
        if(!this.stats.unlockedAchs) this.stats.unlockedAchs = [];
        const equippedTitle = this.stats.equippedTitle || null;
        const titlesHTML = CONFIG.TITLES.map(t => {
            const unlocked = this.stats.unlockedAchs.includes(t.unlock);
            const equipped  = equippedTitle === t.id;
            return `<div class="pv2-title-opt ${unlocked?'unlocked':''} ${equipped?'equipped':''}"
                        onclick="${unlocked ? `window.app.setTitle('${t.id}')` : ''}"
                        title="${unlocked ? t.desc : 'Bloquado: logro ' + t.unlock}">
                <div class="pvt-name">${t.name}</div>
                <div class="pvt-badge">${equipped ? 'EQUIPADO' : unlocked ? 'DISPONIBLE' : '🔒'}</div>
            </div>`;
        }).join('');

        // Logros
        const unlockedCount = CONFIG.ACHIEVEMENTS.filter(a => a.check(ctx)).length;
        const achHTML = CONFIG.ACHIEVEMENTS.map(ach => {
            const unlocked = ach.check(ctx);
            const iconName = achIcons[ach.id] || 'fa-star';
            return `
                <div class="pv2-ach ${unlocked ? 'unlocked' : ''}" title="${ach.desc}">
                    <div class="pv2-ach-icon"><i class="fa-solid ${iconName}"></i></div>
                    <small>${ach.name}</small>
                </div>`;
        }).join('');

        // Récords con sparklines SVG
        const recordsHTML = CONFIG.GAMES_LIST
            .filter(g => this.highScores[g.id])
            .map(g => {
                const entry  = this.highScores[g.id];
                const best   = typeof entry === 'number' ? entry : (entry.best || 0);
                const hist   = typeof entry === 'object' ? (entry.history || []) : [];
                const gColor = CONFIG.COLORS[g.color] || '#64748b';
                const rank      = this.calculateRank(g.id, best);
                const rankColors = { S:'#fbbf24', A:'#10b981', B:'#3b82f6', F:'#475569' };
                const rankColor  = rankColors[rank] || '#475569';
                let sparkSVG = '';
                if(hist.length > 1) {
                    const pts = hist.slice(0,8).reverse();
                    const mx  = Math.max(...pts.map(x=>x.score), 1);
                    const W=52, H=18;
                    const coords = pts.map((p,i) => {
                        const x = (i/(pts.length-1))*W;
                        const y = H - (p.score/mx)*(H-3) - 1;
                        return x.toFixed(1)+','+y.toFixed(1);
                    }).join(' ');
                    const lastPt = pts[pts.length-1];
                    const lastX  = W;
                    const lastY  = (H - (lastPt.score/mx)*(H-3) - 1).toFixed(1);
                    sparkSVG = '<svg width="'+W+'" height="'+H+'" style="overflow:visible;flex-shrink:0;">' +
                        '<polyline points="'+coords+'" fill="none" stroke="'+gColor+'" stroke-width="1.5" stroke-linejoin="round" opacity="0.7"/>' +
                        '<circle cx="'+lastX+'" cy="'+lastY+'" r="2.5" fill="'+gColor+'"/>' +
                        '</svg>';
                }
                return `
                    <div class="pv2-record-row">
                        <div class="pv2-rec-icon" style="background:${gColor}15;color:${gColor};">
                            <i class="${g.icon}"></i>
                        </div>
                        <div class="pv2-rec-name">${g.name}</div>
                        <div class="pv2-rec-spark">${sparkSVG}</div>
                        <div style="display:flex;align-items:center;gap:5px;">
                            <span style="font-family:var(--font-display);font-size:0.6rem;color:${rankColor};">${rank}</span>
                            <div class="pv2-rec-score" style="color:${gColor};">${best.toLocaleString()}</div>
                        </div>
                    </div>`;
            }).join('') || '<div style="color:#334155;font-size:0.78rem;padding:8px 0;">Sin récords todavía</div>';

        // Leaderboard — usar XP total acumulado
        const playerTotalXP = ((this.stats.level-1) * 100) + (this.stats.xp||0);
        const me = { name: 'TÚ', xp: playerTotalXP, isPlayer: true, color: 'var(--primary)' };
        const board = [...(CONFIG.RIVALS || []), me].sort((a,b) => b.xp - a.xp);
        const playerPos = board.findIndex(r => r.isPlayer) + 1;
        const lbHTML = board.map((r, i) => {
            const isBeaten = !r.isPlayer && playerTotalXP >= r.xp;
            return `<div class="pv2-lb-row ${r.isPlayer ? 'is-player' : ''}" style="${isBeaten ? 'opacity:0.5;' : ''}">
                <div class="pv2-lb-pos" style="${r.isPlayer ? 'color:var(--primary);font-weight:bold;' : ''}">#${i+1}</div>
                <div class="pv2-lb-name" style="color:${r.color||'#94a3b8'};">
                    ${r.isPlayer ? '<i class="fa-solid fa-user" style="font-size:0.7rem;margin-right:4px;"></i>' : ''}${r.name}
                    ${isBeaten ? ' <span style="font-size:0.5rem;color:#10b981;margin-left:4px;">SUPERADO</span>' : ''}
                </div>
                <div class="pv2-lb-xp">${r.xp.toLocaleString()} XP</div>
            </div>`;
        }).join('');

        modal.innerHTML = `
            <div class="profile-v2">
                <div class="pv2-header">
                    <div class="pv2-avatar-ring">
                        <i class="fa-solid ${this.stats.avatar || 'fa-user-astronaut'}"></i>
                    </div>
                    <div class="pv2-name">AGENTE</div>
                    <div class="pv2-rank">${this.getRankName(this.stats.level)}</div>
                </div>

                <div class="pv2-stats">
                    <div class="pv2-stat">
                        <span class="s-label">PARTIDAS</span>
                        <span class="s-val">${this.stats.gamesPlayed}</span>
                    </div>
                    <div class="pv2-stat">
                        <span class="s-label">CRÉDITOS</span>
                        <span class="s-val gold">${this.credits.toLocaleString()}</span>
                    </div>
                    <div class="pv2-stat">
                        <span class="s-label">NIVEL</span>
                        <span class="s-val">${this.stats.level}</span>
                    </div>
                    <div class="pv2-stat">
                        <span class="s-label">LOGROS</span>
                        <span class="s-val">${unlockedCount}/${CONFIG.ACHIEVEMENTS.length}</span>
                    </div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">AVATAR</div>
                    <div class="pv2-avatar-grid">${avatarsHTML}</div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">TÍTULO DE AGENTE</div>
                    <div class="pv2-titles-grid">${titlesHTML}</div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">LOGROS</div>
                    <div class="pv2-achievements">${achHTML}</div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">RÉCORDS POR JUEGO</div>
                    <div class="pv2-records">${recordsHTML}</div>
                </div>

                <div class="pv2-section">
                    <div class="pv2-section-title">RANKING GLOBAL</div>
                    <div class="pv2-leaderboard">${lbHTML}</div>
                </div>

                <button class="btn pv2-close-btn" onclick="window.app.closeProfile()">
                    <i class="fa-solid fa-xmark"></i> CERRAR
                </button>
            </div>`;
    },
    // Actualiza el badge de racha en el HUD superior
    updateStreak(streakVal) {
        const badge = document.getElementById('ui-streak');
        if(!badge) return;
        if(streakVal > 1) {
            badge.classList.add('visible');
            const valEl = badge.querySelector('.hud-streak-val');
            if(valEl) valEl.textContent = `x${streakVal}`;
        } else {
            badge.classList.remove('visible');
        }
    },

    // ---- EFECTOS VISUALES DE CALLCARD ----
    _startCallcardEffect(style, rankColor) {
        const canvas = document.getElementById('cc-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width  = canvas.parentElement?.offsetWidth  || window.innerWidth;
        canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
        let raf;
        const W = canvas.width, H = canvas.height;
        const t0 = Date.now();
        const T = () => (Date.now() - t0) / 1000;

        // Estado compartido por efectos
        const cols = {
            default:   ['#3b82f6','#6366f1'],
            bsod:      ['#0078d7','#003399','#1e90ff'],
            matrix:    ['#00ff41','#00cc33','#00ff88'],
            fallout:   ['#95b800','#6b8500','#c8d400'],  // Pip-Boy green
            vcity:     ['#ff6ec7','#ff2d78','#ffd700','#00cfff'],
            doom:      ['#ef4444','#dc2626','#7f1d1d','#f97316'],
            minecraft: ['#4aab2a','#7ec850','#c97c4f','#5b8dd9'],
            tron:      ['#00f5ff','#0099cc','#00ccff'],
            discord:   ['#5865f2','#7289da','#99aab5'],
            hacker:    ['#00ff41','#00cc33'],
            retro:     ['#ff0000','#ffff00','#00ff00','#00ffff','#ff00ff'],
            gold:      ['#ffd700','#ffa500','#ffec8b','#ff8c00'],
        };
        const pick = (style) => { const c = cols[style]||cols.default; return c[Math.floor(Math.random()*c.length)]; };

        // Partículas genéricas
        const P = Array.from({length:100},()=>({
            x:Math.random()*W,y:Math.random()*H,
            vx:(Math.random()-0.5)*1.5,vy:(Math.random()-0.5)*1.5,
            size:Math.random()*3+0.5,alpha:Math.random()*0.7+0.1,
            color:pick(style)
        }));

        const effects = {
            // DEFAULT — partículas suaves
            default() {
                ctx.fillStyle='rgba(5,8,18,0.88)'; ctx.fillRect(0,0,W,H);
                P.forEach(p=>{ p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
                    ctx.globalAlpha=p.alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill(); });
                ctx.globalAlpha=1;
            },

            // WINDOWS BSOD — pantalla azul con texto de error
            bsod() {
                ctx.fillStyle='#0078d7'; ctx.fillRect(0,0,W,H);
                // QR falso en la esquina
                ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(W*0.1,H*0.1,60,60);
                ctx.fillStyle='#fff'; ctx.font='bold 18px monospace';
                const t=T(); const blink=Math.floor(t*2)%2===0;
                if(blink){ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(0,0,W,H);}
                // Scan line lento
                const sy=(T()*30)%H;
                ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(0,sy,W,3);
                ctx.globalAlpha=1;
            },

            // MATRIX — katakana + binario, columnas independientes
            matrix() {
                ctx.fillStyle='rgba(0,5,0,0.13)'; ctx.fillRect(0,0,W,H);
                const cw=16;
                const chars='01ﾊﾋﾖｶｸｼﾐﾓﾔｺﾍﾎｱｲｳｴｵｶｷ';
                ctx.font=`${cw-2}px monospace`;
                P.forEach(p=>{
                    p.y+=2.5+p.size;
                    if(p.y>H){p.y=0;p.x=Math.round(Math.random()*W/cw)*cw;}
                    const c=chars[Math.floor(Math.random()*chars.length)];
                    // Primera letra más brillante
                    ctx.globalAlpha=p.alpha;
                    ctx.fillStyle=p.alpha>0.5?'#88ff88':p.color;
                    ctx.fillText(c,p.x,p.y);
                });
                ctx.globalAlpha=1;
            },

            // FALLOUT — glow verde Pip-Boy + CRT estático + interferencia
            fallout() {
                ctx.fillStyle='rgba(5,12,0,0.15)'; ctx.fillRect(0,0,W,H);
                // Scanlines CRT
                for(let y=0;y<H;y+=3){ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(0,y,W,1);}
                // Static noise verde
                P.forEach(p=>{
                    p.x+=p.vx*0.4;p.y+=p.vy*0.4;
                    if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
                    ctx.globalAlpha=p.alpha*0.5;
                    ctx.fillStyle=p.color;
                    ctx.fillRect(p.x,p.y,p.size,1);
                });
                // Horizontal glitch ocasional
                if(Math.random()<0.06){
                    const gy=Math.random()*H;
                    ctx.drawImage(canvas,Math.random()*10-5,gy,W,4,0,gy,W,4);
                }
                // Vignette verde
                const vg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.7);
                vg.addColorStop(0,'transparent');
                vg.addColorStop(1,'rgba(0,30,0,0.6)');
                ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
                ctx.globalAlpha=1;
            },

            // VICE CITY — lluvia de neón rosa/amarillo, skyline nocturno
            vcity() {
                ctx.fillStyle='rgba(10,0,20,0.14)'; ctx.fillRect(0,0,W,H);
                // Reflejo en el suelo — gradiente degradado
                const gg=ctx.createLinearGradient(0,H*0.7,0,H);
                gg.addColorStop(0,'rgba(255,45,120,0.05)');
                gg.addColorStop(1,'rgba(0,207,255,0.05)');
                ctx.fillStyle=gg;ctx.fillRect(0,H*0.7,W,H*0.3);
                // Partículas brillantes con glow
                P.forEach(p=>{
                    p.y+=1.2;p.x+=Math.sin(T()+p.vx)*0.4;
                    if(p.y>H){p.y=-5;p.x=Math.random()*W;p.color=pick('vcity');}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=8;ctx.shadowColor=p.color;
                    ctx.fillStyle=p.color;
                    ctx.beginPath();ctx.arc(p.x,p.y,p.size*0.8,0,Math.PI*2);ctx.fill();
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // DOOM — partículas de fuego + lava que sube + rojo infernal
            doom() {
                ctx.fillStyle='rgba(20,0,0,0.18)'; ctx.fillRect(0,0,W,H);
                // Glow de lava en el fondo inferior
                const lg=ctx.createLinearGradient(0,H*0.7,0,H);
                lg.addColorStop(0,'rgba(239,68,68,0)');
                lg.addColorStop(0.5,'rgba(249,115,22,0.12)');
                lg.addColorStop(1,'rgba(239,68,68,0.25)');
                ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);
                // Chispas que suben
                P.forEach(p=>{
                    p.y-=1.5+p.size*0.6;
                    p.x+=Math.sin(T()*2+p.vx*5)*0.8;
                    p.alpha-=0.003;
                    if(p.y<0||p.alpha<0.05){p.y=H+5;p.x=Math.random()*W;p.alpha=Math.random()*0.7+0.2;p.color=pick('doom');}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=6;ctx.shadowColor=p.color;
                    ctx.fillStyle=p.color;
                    ctx.beginPath();ctx.arc(p.x,p.y,p.size*0.6,0,Math.PI*2);ctx.fill();
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // MINECRAFT — bloques de píxeles que caen
            minecraft() {
                ctx.fillStyle='rgba(10,15,5,0.16)'; ctx.fillRect(0,0,W,H);
                const bs=12; // Block size
                P.forEach(p=>{
                    p.y+=1.8+p.size*0.3;
                    p.x+=Math.sin(p.vx+p.y*0.01)*0.3;
                    if(p.y>H){p.y=-bs;p.x=Math.round(Math.random()*W/bs)*bs;p.color=pick('minecraft');}
                    ctx.globalAlpha=p.alpha*0.8;
                    ctx.fillStyle=p.color;
                    // Bloque pixelado con borde
                    ctx.fillRect(p.x,p.y,bs-1,bs-1);
                    ctx.fillStyle='rgba(255,255,255,0.15)';
                    ctx.fillRect(p.x,p.y,bs-1,2); // Highlight top
                    ctx.fillStyle='rgba(0,0,0,0.2)';
                    ctx.fillRect(p.x,p.y+bs-2,bs-1,2); // Shadow bottom
                });
                ctx.globalAlpha=1;
            },

            // TRON — líneas de velocidad + grid + ciclos de luz
            tron() {
                ctx.fillStyle='rgba(0,10,20,0.2)'; ctx.fillRect(0,0,W,H);
                // Grid fino
                ctx.strokeStyle='rgba(0,245,255,0.05)';ctx.lineWidth=0.5;
                for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
                for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
                // Trazas de ciclos de luz
                P.slice(0,40).forEach(p=>{
                    if(!p.dir) p.dir=Math.random()>0.5?'H':'V';
                    if(p.dir==='H'){p.x+=3+p.size;if(p.x>W){p.x=0;p.y=Math.round(Math.random()*H/50)*50;}}
                    else{p.y+=3+p.size;if(p.y>H){p.y=0;p.x=Math.round(Math.random()*W/50)*50;}}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=10;ctx.shadowColor='#00f5ff';
                    ctx.strokeStyle='#00f5ff';ctx.lineWidth=1.5;
                    ctx.beginPath();
                    if(p.dir==='H'){ctx.moveTo(p.x-30,p.y);ctx.lineTo(p.x,p.y);}
                    else{ctx.moveTo(p.x,p.y-30);ctx.lineTo(p.x,p.y);}
                    ctx.stroke();ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // DISCORD — burbujas de notificación flotando
            discord() {
                ctx.fillStyle='rgba(30,33,58,0.18)'; ctx.fillRect(0,0,W,H);
                P.forEach(p=>{
                    p.y-=0.6+p.size*0.2;
                    p.x+=Math.sin(T()*0.8+p.vx*3)*0.5;
                    if(p.y<-20){p.y=H+20;p.x=Math.random()*W;p.size=Math.random()*18+4;}
                    ctx.globalAlpha=p.alpha*0.5;
                    ctx.shadowBlur=p.size>10?12:4;ctx.shadowColor=p.color;
                    ctx.strokeStyle=p.color;ctx.lineWidth=1.5;
                    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.stroke();
                    // Punto de notificación para burbujas grandes
                    if(p.size>12){
                        ctx.fillStyle='#ed4245';ctx.beginPath();
                        ctx.arc(p.x+p.size*0.7,p.y-p.size*0.7,4,0,Math.PI*2);ctx.fill();
                    }
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // HACKER / MR.ROBOT — código verde terminal, estilo hacking real
            hacker() {
                ctx.fillStyle='rgba(0,8,0,0.2)'; ctx.fillRect(0,0,W,H);
                const code=['if(sys.bypass()){','  root.access=true;','} else { die(); }','> whoami','> rm -rf /','EXPLOIT LOADED','CVE-2024-XXXX','[+] root shell',
                            '#!/bin/bash','nc -lvp 4444','wget payload.sh','chmod +x run.sh','./run.sh &'];
                ctx.font='12px monospace';
                P.slice(0,30).forEach((p,i)=>{
                    if(!p.code){p.code=code[i%code.length];p.alpha=Math.random()*0.6+0.1;}
                    p.y+=0.8;if(p.y>H){p.y=-15;p.x=Math.random()*(W-200);p.code=code[Math.floor(Math.random()*code.length)];}
                    ctx.globalAlpha=p.alpha;
                    ctx.fillStyle=p.alpha>0.5?'#00ff88':'#00aa44';
                    ctx.fillText(p.code,p.x,p.y);
                });
                // Cursor parpadeante
                if(Math.floor(T()*2)%2===0){ctx.globalAlpha=0.8;ctx.fillStyle='#00ff41';ctx.fillRect(W*0.1,H*0.85,8,14);}
                ctx.globalAlpha=1;
            },

            // ARCADE 1984 — píxeles de colores, estilo Space Invaders
            retro() {
                ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,W,H);
                const invader=[[0,1,0,0,1,0],[0,0,1,1,0,0],[0,1,1,1,1,0],[1,0,1,1,0,1],[1,0,0,0,0,1]];
                const ps=5,gap=3;
                // Mover invaders
                P.slice(0,20).forEach((p,i)=>{
                    if(!p.init){p.col=pick('retro');p.init=true;}
                    p.x+=(Math.sin(T()*0.5+i*0.3)*0.5);
                    p.y+=0.5+p.size*0.1;
                    if(p.y>H){p.y=-40;p.x=Math.random()*W;}
                    // Dibujar invader
                    ctx.globalAlpha=p.alpha*0.7;
                    ctx.fillStyle=p.col;
                    invader.forEach((row,ry)=>row.forEach((bit,rx)=>{
                        if(bit)ctx.fillRect(p.x+(rx-3)*(ps+1),p.y+(ry-2)*(ps+1),ps,ps);
                    }));
                });
                // Estrellas de fondo
                P.slice(20).forEach(p=>{
                    p.y+=0.3;if(p.y>H)p.y=0;
                    ctx.globalAlpha=p.alpha*0.4;ctx.fillStyle='#fff';
                    ctx.fillRect(p.x,p.y,1,1);
                });
                ctx.globalAlpha=1;
            },

            // PAY2WIN / BATTLE ROYALE — lluvias de coronas y monedas doradas
            gold() {
                ctx.fillStyle='rgba(15,10,0,0.12)'; ctx.fillRect(0,0,W,H);
                // Brillo dorado de fondo
                const gg=ctx.createRadialGradient(W/2,H,0,W/2,H,Math.max(W,H)*0.6);
                gg.addColorStop(0,'rgba(255,165,0,0.08)');
                gg.addColorStop(1,'transparent');
                ctx.fillStyle=gg;ctx.fillRect(0,0,W,H);
                // Monedas y coronas cayendo
                const syms=['$','¢','♛','💰','★'];
                ctx.font='bold 20px Arial';
                P.forEach(p=>{
                    if(!p.sym){p.sym=syms[Math.floor(Math.random()*syms.length)];}
                    p.y+=2.5+p.size;p.x+=Math.sin(p.y*0.04+p.vx)*0.8;
                    if(p.y>H){p.y=-10;p.x=Math.random()*W;p.color=pick('gold');}
                    ctx.globalAlpha=p.alpha;
                    ctx.shadowBlur=6;ctx.shadowColor='#ffd700';
                    ctx.fillStyle=p.color;
                    ctx.fillText(p.sym,p.x,p.y);
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            // PORTAL — portales azul/naranja con partículas orbitales
            portal() {
                ctx.fillStyle='rgba(5,8,18,0.15)'; ctx.fillRect(0,0,W,H);
                const t = Date.now()*0.001;
                // Portal azul
                ctx.beginPath(); ctx.ellipse(W*0.3,H*0.5,60,90,0,0,Math.PI*2);
                ctx.strokeStyle=`rgba(50,150,255,${0.5+Math.sin(t)*0.3})`; ctx.lineWidth=4; ctx.stroke();
                ctx.fillStyle=`rgba(0,80,200,0.08)`; ctx.fill();
                // Portal naranja
                ctx.beginPath(); ctx.ellipse(W*0.7,H*0.5,60,90,0,0,Math.PI*2);
                ctx.strokeStyle=`rgba(255,140,0,${0.5+Math.cos(t)*0.3})`; ctx.lineWidth=4; ctx.stroke();
                ctx.fillStyle=`rgba(200,80,0,0.08)`; ctx.fill();
                // Partículas flotando entre portales
                P.forEach(p => {
                    p.x+=Math.sin(t+p.vx)*1.5; p.y+=Math.cos(t*0.7+p.vy)*0.8;
                    if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
                    const side = p.x < W/2;
                    ctx.globalAlpha=p.alpha*0.7;
                    ctx.fillStyle=side?'#3296ff':'#ff8c00';
                    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.5,0,Math.PI*2); ctx.fill();
                });
                ctx.globalAlpha=1;
            },

            // CELESTE — montañas pixeladas y partículas estrella rosa/morado
            celeste() {
                ctx.fillStyle='rgba(4,6,20,0.18)'; ctx.fillRect(0,0,W,H);
                // Estrellas de fondo estáticas
                P.slice(0,20).forEach(p=>{
                    ctx.globalAlpha=p.alpha*0.6;
                    ctx.fillStyle='#fff';
                    ctx.fillRect(p.x,p.y,1.5,1.5);
                });
                // Partículas tipo dash de Madeline
                P.slice(20).forEach(p=>{
                    p.x+=p.vx*2; p.y+=p.vy*2;
                    if(p.x<0||p.x>W||p.y<0||p.y>H){p.x=Math.random()*W;p.y=Math.random()*H;p.vx=(Math.random()-0.5)*3;p.vy=(Math.random()-0.5)*3;}
                    ctx.globalAlpha=p.alpha;
                    ctx.fillStyle=p.y<H/2?'#e040fb':'#7c4dff';
                    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.6,0,Math.PI*2); ctx.fill();
                    // Trail
                    ctx.globalAlpha=p.alpha*0.3;
                    ctx.fillRect(p.x-p.vx*3,p.y-p.vy*3,p.size,p.size*0.5);
                });
                ctx.globalAlpha=1;
            },

            // HALF-LIFE — efecto resonance cascade, verde y partículas peligrosas
            halflife() {
                ctx.fillStyle='rgba(2,10,4,0.15)'; ctx.fillRect(0,0,W,H);
                const t = Date.now()*0.001;
                // Ondas de resonancia
                for(let i=0;i<3;i++){
                    const r=(t*80+i*120)%(Math.max(W,H)*0.8);
                    ctx.beginPath(); ctx.arc(W/2,H/2,r,0,Math.PI*2);
                    ctx.strokeStyle=`rgba(0,255,50,${Math.max(0,0.4-(r/400))})`;
                    ctx.lineWidth=2; ctx.stroke();
                }
                // Partículas de energía
                P.forEach(p=>{
                    const angle=Math.atan2(p.y-H/2,p.x-W/2)+0.02;
                    const dist=Math.hypot(p.x-W/2,p.y-H/2);
                    p.x=W/2+Math.cos(angle)*dist; p.y=H/2+Math.sin(angle)*dist;
                    if(dist>Math.max(W,H)/2){p.x=W/2+(Math.random()-0.5)*20;p.y=H/2+(Math.random()-0.5)*20;}
                    ctx.globalAlpha=p.alpha*0.8;
                    ctx.fillStyle=`hsl(${120+Math.sin(t+p.vx)*30},100%,50%)`;
                    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.5,0,Math.PI*2); ctx.fill();
                });
                ctx.globalAlpha=1;
            },

            // CYBERPUNK / NIGHT CITY — lluvia de datos cian + neón urbano
            cyberpunk() {
                ctx.fillStyle='rgba(2,0,10,0.18)'; ctx.fillRect(0,0,W,H);
                const chars='01ﾊﾐﾋｱｳｦｲｸｺｷｵｴｹｸｦ';
                ctx.font=`${12}px monospace`;
                P.forEach(p=>{
                    if(!p.char||Math.random()<0.02) p.char=chars[Math.floor(Math.random()*chars.length)];
                    p.y+=p.size+1.5; if(p.y>H){p.y=-20;p.x=Math.random()*W;p.color=Math.random()<0.5?'#00ffff':'#ff00aa';}
                    ctx.globalAlpha=p.alpha;
                    ctx.fillStyle=p.color||'#00ffff';
                    ctx.shadowBlur=6; ctx.shadowColor=p.color||'#00ffff';
                    ctx.fillText(p.char,p.x,p.y);
                    ctx.shadowBlur=0;
                });
                ctx.globalAlpha=1;
            },

            amongus() {
                ctx.fillStyle='rgba(3,6,20,0.15)'; ctx.fillRect(0,0,W,H);
                const t=Date.now()*0.001;
                const colors=['#c8181b','#1d3de8','#1c9e33','#f07c1b','#9b2dca','#71491e','#38ffdd'];
                P.forEach(p=>{
                    if(!p.col){p.col=colors[Math.floor(Math.random()*colors.length)];p.dead=Math.random()<0.15;}
                    p.y+=0.4+p.size*0.1; p.x+=Math.sin(t+p.vx)*0.3;
                    if(p.y>H){p.y=-20;p.x=Math.random()*W;}
                    ctx.save(); ctx.translate(p.x,p.y);
                    if(p.dead) ctx.rotate(Math.PI/2);
                    ctx.fillStyle=p.col; ctx.globalAlpha=p.alpha;
                    ctx.beginPath(); ctx.ellipse(0,3,7,9,0,0,Math.PI*2); ctx.fill();
                    ctx.fillStyle='rgba(150,220,255,0.85)';
                    ctx.beginPath(); ctx.ellipse(-1,-2,4,3,0,0,Math.PI*2); ctx.fill();
                    ctx.fillStyle=p.col; ctx.fillRect(5,0,4,7);
                    ctx.restore();
                });
                ctx.globalAlpha=1;
            },

            undertale() {
                ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(0,0,W,H);
                const t=Date.now()*0.001;
                const pulse=1+Math.sin(t*2)*0.06;
                const hx=W/2, hy=H*0.45;
                ctx.save(); ctx.translate(hx,hy); ctx.scale(pulse,pulse);
                ctx.fillStyle='#ff0038'; ctx.shadowBlur=20; ctx.shadowColor='#ff0038';
                ctx.beginPath();
                ctx.moveTo(0,6); ctx.bezierCurveTo(-16,-8,-28,8,-14,20);
                ctx.lineTo(0,34); ctx.lineTo(14,20);
                ctx.bezierCurveTo(28,8,16,-8,0,6); ctx.fill();
                ctx.restore(); ctx.shadowBlur=0;
                P.forEach(p=>{
                    const angle=Math.atan2(p.y-hy,p.x-hx);
                    p.x+=Math.cos(angle+Math.PI)*1.5; p.y+=Math.sin(angle+Math.PI)*1.5;
                    if(Math.hypot(p.x-hx,p.y-hy)>Math.min(W,H)*0.5){p.x=hx+(Math.random()-0.5)*40;p.y=hy+(Math.random()-0.5)*40;}
                    ctx.globalAlpha=p.alpha*0.6;
                    ctx.fillStyle=Math.random()<0.5?'#ff0038':'#fff';
                    ctx.font=(8+p.size)+'px monospace'; ctx.fillText('*',p.x,p.y);
                });
                ctx.globalAlpha=1;
            },

            hollow() {
                ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(0,0,W,H);
                const t=Date.now()*0.001;
                P.forEach(p=>{
                    p.y-=0.5+p.size*0.15; p.x+=Math.sin(t*0.5+p.vx)*0.5;
                    if(p.y<-10){p.y=H+10;p.x=Math.random()*W;}
                    const flicker=0.3+Math.sin(t*3+p.vx)*0.3;
                    ctx.globalAlpha=p.alpha*flicker;
                    ctx.fillStyle=Math.random()<0.1?'#b8a0d8':'#ffffff';
                    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.4,0,Math.PI*2); ctx.fill();
                });
                ctx.globalAlpha=1;
            },

            stardew() {
                ctx.fillStyle='rgba(4,8,4,0.15)'; ctx.fillRect(0,0,W,H);
                const t=Date.now()*0.001;
                const syms=['\u2605','\u273f','\u266a','\u25c6','\u2726'];
                const cols=['#ffd700','#ff69b4','#90ee90','#87ceeb','#ffa500'];
                P.forEach(p=>{
                    if(!p.sym){p.sym=syms[Math.floor(Math.random()*syms.length)];p.col=cols[Math.floor(Math.random()*cols.length)];}
                    p.y+=0.8+p.size*0.2; p.x+=Math.sin(t*0.8+p.vx)*0.6;
                    if(p.y>H){p.y=-10;p.x=Math.random()*W;}
                    ctx.globalAlpha=p.alpha*0.8; ctx.fillStyle=p.col;
                    ctx.font=(10+p.size*2)+'px monospace'; ctx.textAlign='center';
                    ctx.fillText(p.sym,p.x,p.y);
                });
                ctx.globalAlpha=1; ctx.textAlign='left';
            }
        };

        const fn = effects[style] || effects.default;
        const loop = () => { fn(); raf = requestAnimationFrame(loop); };
        loop();

        // Parar cuando la overlay sea eliminada
        const observer = new MutationObserver(() => {
            if(!document.getElementById('cc-canvas')) {
                cancelAnimationFrame(raf);
                observer.disconnect();
            }
        });
        const ui = document.getElementById('game-ui-overlay');
        if(ui) observer.observe(ui, { childList: true });
    },

    setAvatar(icon) { this.stats.avatar = icon; this.audio.playClick(); this.showProfile(); this.updateUI(); this.save(); },
    setTitle(titleId) {
        this.stats.equippedTitle = this.stats.equippedTitle === titleId ? null : titleId;
        this.audio.playClick(); this.showProfile(); this.updateUI(); this.save();
    },
    setTitle(titleId) {
        this.stats.equippedTitle = this.stats.equippedTitle === titleId ? null : titleId;
        this.audio.playClick();
        this.showProfile();
        this.updateUI();
        this.save();
    },
    closeProfile() { document.getElementById('modal-profile').classList.add('hidden'); },
    save() { localStorage.setItem('arcade_save', JSON.stringify({ credits: this.credits, stats: this.stats, highScores: this.highScores, shop: { inventory: this.shop.inventory, equipped: this.shop.equipped }, daily: this.daily, weekly: this.weekly, streak: this.streak, invest: this.invest, settings: { audio: this.audio.vol, performance: this.settings.performance } })); },
    checkDailyReset() { const today = new Date().toDateString(); if (this.daily.date !== today || this.daily.tasks.length === 0) { this.daily.date = today; this.daily.claimed = false; this.daily.tasks = []; const rng = new SeededRandom(parseInt(today.replace(/\D/g,'')) || Date.now()); const gameIds = Object.keys(this.gameClasses); while(this.daily.tasks.length < 3) { const gid = gameIds[Math.floor(rng.next() * gameIds.length)]; if (!this.daily.tasks.find(t => t.gameId === gid)) this.daily.tasks.push({ gameId: gid, target: CONFIG.DAILY_TARGETS[gid] || 10, done: false }); } this.save(); } },

    checkWeeklyReset() {
        const now    = new Date();
        const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay()+6)%7)); monday.setHours(0,0,0,0);
        const weekKey = monday.toDateString();
        if(this.weekly.week !== weekKey || this.weekly.tasks.length === 0) {
            this.weekly = { week: weekKey, tasks: [], claimed: false };
            // 4 misiones semanales con targets más altos y variedad
            const WEEKLY_MISSIONS = [
                { gameId:'higher-lower', target:25,  label:'Alcanza 25 aciertos en High/Low',    reward:800  },
                { gameId:'geo-net',      target:50,  label:'Consigue 50 puntos en Geo-Net',       reward:1000 },
                { gameId:'spam-click',   target:100, label:'Llega a 100 clics en Spam Click',     reward:600  },
                { gameId:'neon-sniper',  target:15,  label:'Noquea 15 objetivos en Neon Sniper',  reward:700  },
                { gameId:'color-trap',   target:20,  label:'Supera racha 20 en Color Trap',       reward:900  },
                { gameId:'cyber-typer',  target:300, label:'Escribe 300 pts en Cyber Typer',      reward:850  },
                { gameId:'glitch-hunt',  target:10,  label:'Atrapa 10 glitches',                  reward:750  },
                { gameId:'math-rush',    target:80,  label:'Consigue 80 pts en Math Rush',        reward:700  },
            ];
            const rng = new SeededRandom(parseInt(weekKey.replace(/\D/g,'')) || Date.now());
            const shuffled = [...WEEKLY_MISSIONS].sort(()=>rng.next()-0.5);
            this.weekly.tasks = shuffled.slice(0,4).map(m => ({...m, done:false}));
            this.save();
        }
    },

    checkStreakUpdate() {
        const today    = new Date().toDateString();
        const last     = this.streak.lastDate;
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
        const yStr     = yesterday.toDateString();

        if(last === today) return; // Ya actualizado hoy

        if(last === yStr) {
            // Día consecutivo
            this.streak.days++;
        } else if(last !== today) {
            // Se rompió la racha (o es el primer día)
            this.streak.days = 1;
        }
        this.streak.lastDate = today;
        this.streak.best = Math.max(this.streak.best||0, this.streak.days);

        // Toast de racha
        if(this.streak.days > 1) {
            const bonusXP = Math.min(50, this.streak.days * 5);
            setTimeout(() => {
                this.showToast(`🔥 RACHA: ${this.streak.days} DÍAS`, `+${bonusXP} XP bonus`, 'gold');
                this.gainXP(bonusXP);
            }, 1500);
        }
        this.save();
    },

    claimWeekly() {
        if(this.weekly.claimed) return;
        const done = this.weekly.tasks.filter(t=>t.done).length;
        if(done < this.weekly.tasks.length) return;
        this.weekly.claimed = true;
        this.stats.weeklyCompleted = (this.stats.weeklyCompleted||0)+1;
        const totalReward = this.weekly.tasks.reduce((s,t)=>s+t.reward, 0);
        this.credits += totalReward;
        this.audio.playWin(10);
        try{ this.canvas.explode(window.innerWidth/2, window.innerHeight/2, '#fbbf24'); }catch(e){}
        setTimeout(()=>{ try{ this.canvas.explode(window.innerWidth*0.3, window.innerHeight*0.5, '#a855f7'); }catch(e){} }, 300);
        this.showToast('¡MISIÓN SEMANAL COMPLETADA!', `+${totalReward.toLocaleString()} CR obtenidos`, 'gold');
        this.gainXP(200);
        this.renderWeeklyScreen();
        this.save();
    },
    renderDailyScreen() {
        this.canvas.setMood('DAILY');
        const container = document.getElementById('screen-daily');
        if(!container) return;

        const done  = this.daily.tasks.filter(t => t.done).length;
        const total = this.daily.tasks.length;
        const pct   = Math.round((done / total) * 100);
        const allDone = done === total;
        const claimed = this.daily.claimed;

        const tasksHTML = this.daily.tasks.map((task, idx) => {
            const meta      = CONFIG.GAMES_LIST.find(g => g.id === task.gameId) || { name: task.gameId, icon: 'fa-solid fa-gamepad', color: 'DEFAULT' };
            const gameColor = CONFIG.COLORS[meta.color] || '#94a3b8';
            const isDone    = task.done;
            return `
            <div class="daily-task-v3 ${isDone?'done':''}" style="--tc:${gameColor};"
                 onclick="${isDone ? '' : `window.app.launchDaily('${task.gameId}')`}">
                <div class="dt-icon-wrap" style="background:${gameColor}12; border-color:${gameColor}20; color:${gameColor};">
                    <i class="${meta.icon}"></i>
                </div>
                <div class="dt-info">
                    <div class="dt-name">${meta.name}</div>
                    <div class="dt-target">OBJETIVO: ${task.target} puntos${isDone ? ' · <span style="color:#10b981">COMPLETADA</span>' : ''}</div>
                </div>
                <div class="dt-status ${isDone?'done':'pending'}">
                    <i class="fa-solid ${isDone ? 'fa-check' : 'fa-play'}"></i>
                </div>
            </div>`;
        }).join('');

        let claimState = 'inactive', claimLabel = '', claimFn = '';
        if(claimed) {
            claimState = 'done';
            claimLabel = `<i class="fa-solid fa-check-double"></i> COMPLETADO`;
        } else if(allDone) {
            claimState = 'active';
            claimLabel = `<i class="fa-solid fa-gift"></i> RECLAMAR RECOMPENSA`;
            claimFn    = 'onclick="window.app.claimDaily()"';
        } else {
            claimLabel = `<i class="fa-solid fa-lock"></i> COMPLETA LAS 3 MISIONES`;
        }

        container.innerHTML = `
        <div class="daily-panel-v3">
            <div class="daily-header-v3">
                <div>
                    <div class="daily-title-v3"><i class="fa-solid fa-calendar-check" style="color:var(--primary);margin-right:8px;"></i>PROTOCOLO DIARIO</div>
                    <div class="daily-subtitle-v3">SINCRONIZACIÓN NEURAL — ${done}/${total} COMPLETADAS</div>
                </div>
                <div class="daily-reward-v3">
                    <div class="daily-reward-lbl">RECOMPENSA</div>
                    <div class="daily-reward-val"><i class="fa-solid fa-coins"></i> 500 CR</div>
                </div>
            </div>
            <div class="daily-progress-v3">
                <div class="dp-track"><div class="dp-fill" style="width:${pct}%;"></div></div>
                <div class="dp-label">${pct}% · ${claimed ? 'COMPLETADO HOY' : 'RENUEVA EN MEDIANOCHE'}</div>
            </div>
            <div class="daily-tasks-v3">${tasksHTML}</div>
            ${this.renderInvestPanel()}
                        <div class="daily-claim-v3">
                <button class="btn btn-secondary" onclick="window.app.audio.playClick(); window.app.changeState('menu');" style="flex-shrink:0;">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <button class="btn-claim-daily-v3 ${claimState}" ${claimFn}>
                    ${claimLabel}
                </button>
            </div>
        </div>`;
    },
    renderWeeklyScreen() {
        this.canvas.setMood('WEEKLY');
        const container = document.getElementById('screen-weekly');
        if(!container) return;

        const done    = this.weekly.tasks.filter(t => t.done).length;
        const total   = this.weekly.tasks.length;
        const pct     = total > 0 ? Math.round((done/total)*100) : 0;
        const allDone = done === total;
        const claimed = this.weekly.claimed;

        // Calcular cuánto tiempo queda hasta el lunes
        const now = new Date();
        const nextMon = new Date(now); nextMon.setDate(now.getDate() + (7 - ((now.getDay()+6)%7)) % 7 || 7); nextMon.setHours(0,0,0,0);
        const msLeft  = nextMon - now;
        const dLeft   = Math.floor(msLeft / 86400000);
        const hLeft   = Math.floor((msLeft % 86400000) / 3600000);
        const timeStr = dLeft > 0 ? `${dLeft}d ${hLeft}h` : `${hLeft}h restantes`;

        const totalReward = this.weekly.tasks.reduce((s,t) => s + t.reward, 0);

        const tasksHTML = this.weekly.tasks.map((task, idx) => {
            const meta      = CONFIG.GAMES_LIST.find(g => g.id === task.gameId) || { name: task.gameId, icon:'fa-solid fa-gamepad', color:'DEFAULT' };
            const gameColor = CONFIG.COLORS[meta.color] || '#94a3b8';
            return `
            <div class="daily-task-v3 ${task.done?'done':''}" style="--tc:${gameColor};"
                 onclick="${task.done ? '' : `window.app.launch('${task.gameId}')`}">
                <div class="dt-icon-wrap" style="background:${gameColor}12;border-color:${gameColor}20;color:${gameColor};">
                    <i class="${meta.icon}"></i>
                </div>
                <div class="dt-info">
                    <div class="dt-name">${task.label}</div>
                    <div class="dt-target">+${task.reward.toLocaleString()} CR · ${task.done ? '<span style="color:#10b981">COMPLETADA</span>' : `objetivo: ${task.target} pts`}</div>
                </div>
                <div class="dt-status ${task.done?'done':'pending'}">
                    <i class="fa-solid ${task.done?'fa-check':'fa-play'}"></i>
                </div>
            </div>`;
        }).join('');

        let claimState = 'inactive', claimLabel = '';
        if(claimed)       { claimState='done';   claimLabel=`<i class="fa-solid fa-check-double"></i> RECOMPENSA RECLAMADA`; }
        else if(allDone)  { claimState='active';  claimLabel=`<i class="fa-solid fa-gift"></i> RECLAMAR ${totalReward.toLocaleString()} CR`; }
        else              { claimLabel=`<i class="fa-solid fa-lock"></i> COMPLETA LAS ${total} MISIONES`; }

        container.innerHTML = `
        <div class="daily-panel-v3">
            <div class="daily-header-v3">
                <div>
                    <div class="daily-title-v3">
                        <i class="fa-solid fa-calendar-week" style="color:#a855f7;margin-right:8px;"></i>MISIONES SEMANALES
                    </div>
                    <div class="daily-subtitle-v3">RENUEVA EL LUNES · ${timeStr}</div>
                </div>
                <div class="daily-reward-v3" style="background:rgba(168,85,247,0.08);border-color:rgba(168,85,247,0.25);">
                    <div class="daily-reward-lbl">RECOMPENSA TOTAL</div>
                    <div class="daily-reward-val" style="color:#a855f7;">
                        <i class="fa-solid fa-coins"></i> ${totalReward.toLocaleString()} CR
                    </div>
                </div>
            </div>
            <div class="daily-progress-v3">
                <div class="dp-track">
                    <div class="dp-fill" style="width:${pct}%;background:#a855f7;box-shadow:0 0 8px #a855f7;"></div>
                </div>
                <div class="dp-label">${pct}% · ${done}/${total} COMPLETADAS${claimed ? ' · RECOMPENSA OBTENIDA' : ''}</div>
            </div>
            <div class="daily-tasks-v3">${tasksHTML}</div>
            <div class="daily-claim-v3">
                <button class="btn btn-secondary" onclick="window.app.audio.playClick(); window.app.changeState('menu');" style="flex-shrink:0;">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <button class="btn-claim-daily-v3 ${claimState}" ${allDone&&!claimed?'onclick="window.app.claimWeekly()"':''}>
                    ${claimLabel}
                </button>
            </div>
        </div>`;
    },
    checkAchievements() {
        if(!this.stats.unlockedAchs) this.stats.unlockedAchs = [];
        const reflexRaw  = this.highScores['hyper-reflex'];
        const reflexBest = reflexRaw ? (typeof reflexRaw === 'number' ? reflexRaw : reflexRaw.best) : 0;
        const ctx = Object.assign({ credits: this.credits, bestReflex: reflexBest }, this.stats);

        const newlyUnlocked = [];
        CONFIG.ACHIEVEMENTS.forEach(ach => {
            if(!this.stats.unlockedAchs.includes(ach.id) && ach.check(ctx)) {
                this.stats.unlockedAchs.push(ach.id);
                newlyUnlocked.push(ach);
            }
        });
        if(!newlyUnlocked.length) return;
        this.save();
        newlyUnlocked.forEach((ach, i) => {
            setTimeout(() => { this.showAchievementToast(ach); try{this.audio.playWin(8);}catch(e){} }, i * 2000);
        });
    },

    showAchievementToast(ach) {
        const container = document.getElementById('toast-container');
        if(!container) return;
        const el = document.createElement('div');
        el.style.cssText = 'background:linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08));border:1px solid rgba(251,191,36,0.5);border-left:3px solid #fbbf24;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 20px rgba(251,191,36,0.15);max-width:320px;opacity:0;transform:translateX(60px) scale(0.85);transition:all 0.4s cubic-bezier(0.2,0,0,1.3);';
        el.innerHTML = `
            <div style="font-size:1.6rem;filter:drop-shadow(0 0 8px rgba(251,191,36,0.6));">${ach.icon}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.56rem;color:#fbbf24;font-family:monospace;letter-spacing:2px;margin-bottom:2px;">LOGRO DESBLOQUEADO</div>
                <div style="font-family:var(--font-display);font-size:0.82rem;color:white;letter-spacing:1px;">${ach.name}</div>
                <div style="font-size:0.62rem;color:#94a3b8;margin-top:1px;">${ach.desc}</div>
            </div>
            <i class="fa-solid fa-trophy" style="color:#fbbf24;opacity:0.6;font-size:1.1rem;"></i>
        `;
        container.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='none'; });
        setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(60px)'; setTimeout(()=>el.remove(), 400); }, 4500);
    },

    checkInvestment() {
        if(!this.invest || !this.invest.date || !this.invest.amount) return;
        const today = new Date().toDateString();
        if(this.invest.date === today || this.invest.resolved) return;
        const RISKS = { LOW:{min:-0.05,max:0.15}, MEDIUM:{min:-0.20,max:0.40}, HIGH:{min:-0.50,max:1.00} };
        const r = RISKS[this.invest.risk] || RISKS.LOW;
        const pct = r.min + Math.random() * (r.max - r.min);
        const result = Math.round(this.invest.amount * pct);
        this.invest.result = result; this.invest.resolved = true;
        this.credits += result;
        const sign = result >= 0 ? '+' : '';
        setTimeout(() => this.showToast(
            result >= 0 ? 'INVERSIÓN RENTABLE' : 'PÉRDIDA DE CAPITAL',
            sign + result.toLocaleString() + ' CR sobre ' + this.invest.amount.toLocaleString() + ' CR',
            result >= 0 ? 'gold' : 'danger'
        ), 1200);
        this.save();
    },

    makeInvestment(amount, risk) {
        if(this.credits < amount) { this.showToast('FONDOS INSUFICIENTES', 'Necesitas ' + amount.toLocaleString() + ' CR', 'danger'); return; }
        if(this.invest && this.invest.date === new Date().toDateString() && this.invest.amount > 0 && !this.invest.resolved) {
            this.showToast('YA INVERTISTE HOY', 'Espera el resultado de mañana', 'danger'); return;
        }
        this.credits -= amount;
        this.invest = { date: new Date().toDateString(), amount, risk, resolved: false, result: 0 };
        this.save(); this.updateUI(); this.renderDailyScreen();
        this.showToast('INVERSIÓN REGISTRADA', amount.toLocaleString() + ' CR · ' + risk, 'purple');
    },

    renderInvestPanel() {
        const inv   = this.invest || {};
        const today = new Date().toDateString();
        const hasActive = inv.date === today && inv.amount > 0 && !inv.resolved;
        const hasResult = inv.resolved && inv.date && inv.date !== today;
        if(hasActive) {
            return '<div style="margin:0 0 6px;padding:10px 14px;background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.2);border-radius:10px;font-family:monospace;font-size:0.62rem;color:#a855f7;">' +
                '<i class="fa-solid fa-clock"></i> INVERSIÓN ACTIVA &middot; ' + inv.amount.toLocaleString() + ' CR &middot; ' + inv.risk + ' &middot; Resultado mañana</div>';
        }
        if(hasResult) {
            const col = inv.result >= 0 ? '#10b981' : '#ef4444';
            return '<div style="margin:0 0 6px;padding:10px 14px;background:' + col + '0f;border:1px solid ' + col + '30;border-radius:10px;font-family:monospace;font-size:0.62rem;color:' + col + ';">' +
                '<i class="fa-solid fa-chart-line"></i> RESULTADO: ' + (inv.result >= 0?'+':'') + inv.result.toLocaleString() + ' CR sobre ' + inv.amount.toLocaleString() + ' CR</div>';
        }
        const OPTS = [
            {risk:'LOW',    label:'Bajo',  pct:'-5%/+15%',  color:'#10b981', amounts:[100,500,1000]},
            {risk:'MEDIUM', label:'Medio', pct:'-20%/+40%', color:'#f59e0b', amounts:[500,2000,5000]},
            {risk:'HIGH',   label:'Alto',  pct:'-50%/+100%',color:'#ef4444', amounts:[1000,5000,10000]},
        ];
        let html = '<div style="margin:0 0 6px;padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;">';
        html += '<div style="font-size:0.55rem;color:#334155;font-family:monospace;letter-spacing:2px;margin-bottom:7px;"><i class="fa-solid fa-chart-bar"></i> MERCADO NEGRO</div>';
        html += '<div style="display:flex;gap:6px;">';
        OPTS.forEach(function(o) {
            html += '<div style="flex:1;background:rgba(255,255,255,0.02);border:1px solid ' + o.color + '20;border-radius:7px;padding:7px 8px;">';
            html += '<div style="font-size:0.58rem;color:' + o.color + ';font-family:var(--font-display);letter-spacing:1px;">' + o.label + '</div>';
            html += '<div style="font-size:0.52rem;color:#475569;font-family:monospace;margin-bottom:5px;">' + o.pct + '</div>';
            html += '<div style="display:flex;gap:3px;flex-wrap:wrap;">';
            o.amounts.forEach(function(a) {
                var lbl = a >= 1000 ? (a/1000) + 'k' : a;
                html += '<button onclick="window.app.makeInvestment(' + a + ',\'' + o.risk + '\')" ' +
                    'style="background:' + o.color + '15;border:1px solid ' + o.color + '25;border-radius:4px;padding:2px 5px;font-size:0.52rem;color:' + o.color + ';font-family:monospace;cursor:pointer;">' + lbl + '</button>';
            });
            html += '</div></div>';
        });
        html += '</div></div>';
        return html;
    },

    claimDaily() { if(this.daily.claimed) return; this.daily.claimed = true; this.stats.dailyCompleted = (this.stats.dailyCompleted||0)+1; this.addScore(0, 500); this.audio.playWin(10); this.showToast("¡RECOMPENSA RECLAMADA!", "Has ganado 500 Créditos", "gold"); this.renderDailyScreen(); this.save(); },
    addScore(pts, cash) { 
        this.credits += cash; 
        if(this.canvas && this.settings.performance) this.canvas.explode(null, null, CONFIG.COLORS.GOLD); 
        this.updateUI(); 
        this.save(); 
    },

    // --- CAJA DE SUMINISTROS ---
    buyLootBox() {
        const cost = (this.shop.inventory.includes('up_vip')) ? 400 : CONFIG.LOOT_BOX.COST;
        if(this.credits < cost){ this.showToast("FONDOS INSUFICIENTES",`Necesitas ${cost} CR`,"danger"); this.audio.playLose(); return; }
        this.credits -= cost;
        this.audio.playBuy();

        // Calcular drop
        const drops = CONFIG.LOOT_BOX.DROPS;
        let roll = Math.random() * drops.reduce((s,d)=>s+d.prob,0);
        let chosen = drops[drops.length-1];
        for(const d of drops){ roll-=d.prob; if(roll<=0){chosen=d;break;} }
        if(chosen.type==='CREDITS'||chosen.type==='JACKPOT') this.credits += chosen.val;

        // ANIMACIÓN FULLSCREEN
        const isJackpot = chosen.type==='JACKPOT';
        const color = chosen.color || '#fbbf24';
        const overlay = document.createElement('div');
        overlay.id = 'lootbox-overlay';
        overlay.innerHTML = `
            <div class="lb-bg"></div>
            <div class="lb-panel">
                <div class="lb-title">CAJA DE SUMINISTROS</div>
                <div class="lb-box-wrap" id="lb-box">
                    <div class="lb-box-icon"><i class="fa-solid fa-box lb-icon-closed"></i></div>
                </div>
                <div class="lb-dots" id="lb-dots">
                    <span></span><span></span><span></span>
                </div>
                <div class="lb-result" id="lb-result" style="display:none;">
                    <div class="lb-rarity-badge" style="color:${color};border-color:${color}40;background:${color}15;">${isJackpot?'JACKPOT':chosen.name.toUpperCase()}</div>
                    <div class="lb-reward-icon" style="color:${color};filter:drop-shadow(0 0 20px ${color});"><i class="fa-solid fa-coins"></i></div>
                    <div class="lb-reward-val" style="color:${color};">+${chosen.val.toLocaleString()} CR</div>
                    <button class="lb-close-btn" id="lb-close"><i class="fa-solid fa-check"></i> COBRAR</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        // Secuencia de animación
        setTimeout(()=>{
            const box = document.getElementById('lb-box');
            if(box){ box.innerHTML=`<div class="lb-box-icon lb-shake"><i class="fa-solid fa-box-open lb-icon-open" style="color:${color};filter:drop-shadow(0 0 20px ${color});"></i></div>`; }
            if(this.canvas) this.canvas.explode(window.innerWidth/2,window.innerHeight/2,color);
            if(isJackpot){ this.audio.playWin(10); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.3,window.innerHeight*0.5,color),400); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.7,window.innerHeight*0.5,color),600); }
        },600);
        setTimeout(()=>{
            const dots=document.getElementById('lb-dots'); if(dots)dots.style.display='none';
            const res=document.getElementById('lb-result'); if(res)res.style.display='flex';
        },1100);

        document.getElementById('lb-close').onclick = () => {
            overlay.style.animation='fadeOut 0.3s ease forwards';
            setTimeout(()=>{ overlay.remove(); this.updateUI(); const sc=document.getElementById('shop-credits'); if(sc)sc.innerText=this.credits.toLocaleString(); this.save(); },300);
        };
    },

    openPremiumBox(boxCfg) {
        const drops = boxCfg.drops;
        let roll = Math.random() * drops.reduce((s,d)=>s+d.prob,0);
        let chosen = drops[drops.length-1];
        for(const d of drops){ roll-=d.prob; if(roll<=0){chosen=d;break;} }
        if(chosen.type==='CREDITS'||chosen.type==='JACKPOT') this.credits += chosen.val;
        const isJackpot = chosen.type==='JACKPOT';
        const color = chosen.color || boxCfg.color || '#fbbf24';

        const overlay = document.createElement('div');
        overlay.id = 'lootbox-overlay';
        overlay.innerHTML = `
            <div class="lb-bg"></div>
            <div class="lb-panel">
                <div class="lb-title">${boxCfg.name.toUpperCase()}</div>
                <div class="lb-box-wrap" id="lb-box">
                    <div class="lb-box-icon"><i class="fa-solid fa-box lb-icon-closed" style="color:${boxCfg.color};filter:drop-shadow(0 0 16px ${boxCfg.color}40);"></i></div>
                </div>
                <div class="lb-dots" id="lb-dots"><span></span><span></span><span></span></div>
                <div class="lb-result" id="lb-result" style="display:none;">
                    <div class="lb-rarity-badge" style="color:${color};border-color:${color}40;background:${color}15;">${isJackpot?'¡JACKPOT!':chosen.name.toUpperCase()}</div>
                    <div class="lb-reward-icon" style="color:${color};filter:drop-shadow(0 0 20px ${color});"><i class="fa-solid fa-coins"></i></div>
                    <div class="lb-reward-val" style="color:${color};">+${chosen.val.toLocaleString()} CR</div>
                    <button class="lb-close-btn" id="lb-close"><i class="fa-solid fa-check"></i> COBRAR</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        setTimeout(()=>{
            const box=document.getElementById('lb-box');
            if(box) box.innerHTML=`<div class="lb-box-icon lb-shake"><i class="fa-solid fa-box-open lb-icon-open" style="color:${color};filter:drop-shadow(0 0 20px ${color});"></i></div>`;
            try{ this.canvas.explode(window.innerWidth/2,window.innerHeight/2,color); }catch(e){}
            if(isJackpot){ this.audio.playWin(10); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.3,window.innerHeight*0.5,color),400); setTimeout(()=>this.canvas?.explode(window.innerWidth*0.7,window.innerHeight*0.5,color),600); }
        },600);
        setTimeout(()=>{
            const d=document.getElementById('lb-dots');if(d)d.style.display='none';
            const r=document.getElementById('lb-result');if(r)r.style.display='flex';
        },1100);
        document.getElementById('lb-close').onclick=()=>{
            overlay.style.animation='fadeOut 0.3s ease forwards';
            setTimeout(()=>{ overlay.remove(); this.updateUI(); const sc=document.getElementById('shop-credits');if(sc)sc.innerText=this.credits.toLocaleString(); this.save(); },300);
        };
    },
    showFloatingText(text, color) {
        const el = document.createElement('div');
        el.className = 'popup-score';
        el.innerText = text;
        el.style.color = color || 'white';
        el.style.left = '50%';
        el.style.top = '35%';
        el.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    },
    toggleConsole() { const c = document.getElementById('debug-console'); if(!c) return; if (c.classList.contains('hidden')) { c.classList.remove('hidden'); document.getElementById('console-input').focus(); } else { c.classList.add('hidden'); } },
    logConsole(msg, type='') { const out = document.getElementById('console-output'); out.innerHTML += `<div class="console-msg ${type}">${msg}</div>`; out.scrollTop = out.scrollHeight; },
    execCommand(cmd) {
        this.logConsole(`> ${cmd}`);
        document.getElementById('console-input').value = '';
        const parts = cmd.toLowerCase().trim().split(' ');
        if(parts[0] === 'rich')  { this.credits += 10000; this.updateUI(); this.save(); this.logConsole('+10,000 CR INJECTED', 'sys'); }
        if(parts[0] === 'god')   { this.credits += 99999; this.stats.level = 50; this.stats.xp = 0; this.updateUI(); this.save(); this.logConsole('GOD MODE — 99,999 CR + LVL 50', 'sys'); }
        if(parts[0] === 'lvl')   { const n = parseInt(parts[1])||10; this.stats.level = n; this.stats.xp = 0; this.updateUI(); this.save(); this.logConsole(`LEVEL SET TO ${n}`, 'sys'); }
        if(parts[0] === 'card')  { const id = parts[1]; if(id && window.app.shop) { window.app.shop.inventory.push(id); this.save(); this.logConsole(`ITEM UNLOCKED: ${id}`, 'sys'); } }
        if(parts[0] === 'reset') { localStorage.removeItem('arcade_save'); location.reload(); }
        if(parts[0] === 'help')  { this.logConsole('COMMANDS: rich | god | lvl N | card [item_id] | reset | clear', 'sys'); }
        if(parts[0] === 'clear') { document.getElementById('console-output').innerHTML = ''; }
    },
    setCritical(active) { const vign = document.querySelector('.vignette'); if(vign) { if(active) vign.classList.add('critical'); else vign.classList.remove('critical'); } },
    applyTheme(themeId) { document.body.className = document.body.className.replace(/t_[a-z0-9_]+/g, '').trim(); if (themeId && themeId !== 't_default') document.body.classList.add(themeId); }
};

window.onload = () => app.init();
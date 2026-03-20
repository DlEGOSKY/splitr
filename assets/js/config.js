// --- CONFIGURACIÓN PRINCIPAL ---
export const CONFIG = {
    STATES: { WELCOME: 'welcome', MENU: 'menu', GAME: 'game', SHOP: 'shop', DAILY: 'daily', WEEKLY: 'weekly' },
    
    API: { 
        DECK: 'https://deckofcardsapi.com/api/deck',
        BIO: 'https://dog.ceo/api',
        TRIVIA_LOCAL: true 
    },

    COLORS: {
        DEFAULT: '#0f172a',
        STREAK_3: '#1e3a8a', STREAK_6: '#581c87', STREAK_9: '#7f1d1d',
        GOLD: '#fbbf24', PURPLE: '#a855f7', CYAN: '#06b6d4', BIO: '#84cc16', GEO: '#f59e0b', REFLEX: '#ec4899',
        SUCCESS: '#10b981', ACCENT: '#f43f5e',
        SPAM: '#ff5722', SNIPER: '#ef4444', ORBIT: '#8b5cf6', MEMORY: '#22d3ee',
        VAULT: '#10b981', PHASE: '#ec4899', MATH: '#3b82f6', STROOP: '#facc15',
        MATCH: '#6366f1', VOID: '#e11d48', GLITCH: '#84cc16', DAILY: '#f97316',
        TRACKER: '#22d3ee', PONG: '#00ff00'
    },

    // --- CAJA DE SUMINISTROS ---
    LOOT_BOX: {
        COST: 500,
        DROPS: [
            { type: 'CREDITS', val: 100,  prob: 30, name: 'Reintegro',        icon: 'fa-coins',        color: '#94a3b8' },
            { type: 'CREDITS', val: 500,  prob: 40, name: 'Bolsa de Créditos',icon: 'fa-sack-dollar',  color: '#3b82f6' },
            { type: 'CREDITS', val: 1000, prob: 20, name: 'Maletín Ejecutivo',icon: 'fa-briefcase',    color: '#a855f7' },
            { type: 'CREDITS', val: 5000, prob:  9, name: 'Lingote de Oro',   icon: 'fa-gem',          color: '#eab308' },
            { type: 'JACKPOT', val:10000, prob:  1, name: 'JACKPOT',          icon: 'fa-trophy',       color: '#ef4444' }
        ]
    },

    // Cajas premium con distintas tablas de drops
    PREMIUM_BOXES: {
        'box_cyber': {
            id: 'box_cyber', name: 'Caja Cyber', icon: 'fa-box', color: '#3b82f6',
            desc: 'Drops de créditos mejorados. Sin Reintegro.',
            price: 1200, rarity: 'rare',
            drops: [
                { type:'CREDITS', val:500,   prob:40, name:'Boost de Datos',   color:'#3b82f6' },
                { type:'CREDITS', val:1500,  prob:35, name:'Paquete Cyber',    color:'#60a5fa' },
                { type:'CREDITS', val:3000,  prob:18, name:'Núcleo Cyber',     color:'#a855f7' },
                { type:'CREDITS', val:8000,  prob: 6, name:'Override Cyber',   color:'#eab308' },
                { type:'JACKPOT', val:20000, prob: 1, name:'JACKPOT CYBER',    color:'#ef4444' },
            ]
        },
        'box_void': {
            id: 'box_void', name: 'Caja del Abismo', icon: 'fa-circle-dot', color: '#6366f1',
            desc: 'Alto riesgo, alta recompensa. Puede dar muy poco o mucho.',
            price: 800, rarity: 'epic',
            drops: [
                { type:'CREDITS', val:50,    prob:40, name:'Vacío',            color:'#334155' },
                { type:'CREDITS', val:200,   prob:25, name:'Sombra',           color:'#6366f1' },
                { type:'CREDITS', val:5000,  prob:20, name:'Pulso Abismal',    color:'#8b5cf6' },
                { type:'CREDITS', val:15000, prob:14, name:'Singularidad',     color:'#a855f7' },
                { type:'JACKPOT', val:50000, prob: 1, name:'EL ABISMO TOTAL',  color:'#6366f1' },
            ]
        },
        'box_gold': {
            id: 'box_gold', name: 'Caja Magnate', icon: 'fa-crown', color: '#fbbf24',
            desc: 'Solo recompensas grandes. Sin basura.',
            price: 3000, rarity: 'legendary',
            drops: [
                { type:'CREDITS', val:2000,  prob:40, name:'Inversión',        color:'#fbbf24' },
                { type:'CREDITS', val:5000,  prob:35, name:'Portafolio',       color:'#f59e0b' },
                { type:'CREDITS', val:12000, prob:20, name:'Fondo Magnate',    color:'#d97706' },
                { type:'JACKPOT', val:100000,prob: 5, name:'MONOPOLIO',        color:'#ef4444' },
            ]
        }
    },

    GAMES_LIST: [
        { id: 'higher-lower', cat: 'MENTAL', name: 'High / Low', icon: 'fa-solid fa-arrows-up-down', color: 'DEFAULT', desc: 'Predicción de Cartas' },
        { id: 'guess-card', name: 'The Oracle', icon: 'fa-solid fa-eye', color: 'PURPLE', desc: 'Adivinación Cuántica' },
        { id: 'trivia', cat: 'CONOCIMIENTO', name: 'Neural Trivia', icon: 'fa-solid fa-brain', color: 'CYAN', desc: 'Conocimiento General' },
        { id: 'bio-scan', name: 'Bio-Scan', icon: 'fa-solid fa-dna', color: 'BIO', desc: 'Identificación Biológica' },
        { id: 'geo-net', name: 'Geo-Net', icon: 'fa-solid fa-earth-americas', color: 'GEO', desc: 'Datos Geopolíticos' },
        { id: 'hyper-reflex', cat: 'REFLEJOS', name: 'Hyper Reflex', icon: 'fa-solid fa-bolt', color: 'REFLEX', desc: 'Velocidad de Reacción' },
        { id: 'spam-click', name: 'Spam Click', icon: 'fa-solid fa-computer-mouse', color: 'SPAM', desc: 'Resistencia Física' },
        { id: 'neon-sniper', name: 'Neon Sniper', icon: 'fa-solid fa-crosshairs', color: 'SNIPER', desc: 'Precisión de Impacto' },
        { id: 'orbit-lock', name: 'Orbit Lock', icon: 'fa-solid fa-circle-notch', color: 'ORBIT', desc: 'Sincronización Rítmica' },
        { id: 'memory-flash', cat: 'MEMORIA', name: 'Cyber Pattern', icon: 'fa-solid fa-microchip', color: 'MEMORY', desc: 'Retención Visual' },
        { id: 'vault-cracker', name: 'Vault Cracker', icon: 'fa-solid fa-lock-open', color: 'VAULT', desc: 'Criptografía Lógica' },
        { id: 'phase-shifter', name: 'Phase Shifter', icon: 'fa-solid fa-wave-square', color: 'PHASE', desc: 'Alineación Lineal' },
        { id: 'math-rush', name: 'Math Rush', icon: 'fa-solid fa-calculator', color: 'MATH', desc: 'Cálculo de Emergencia' },
        { id: 'color-trap', name: 'Color Trap', icon: 'fa-solid fa-palette', color: 'STROOP', desc: 'Conflicto Cognitivo' },
        { id: 'holo-match', name: 'Holo Match', icon: 'fa-solid fa-clone', color: 'MATCH', desc: 'Escaneo de Pares' },
        { id: 'void-dodger', cat: 'ACCION', name: 'Void Dodger', icon: 'fa-solid fa-shuttle-space', color: 'VOID', desc: 'Evasión de Amenazas' },
        { id: 'glitch-hunt', name: 'Glitch Hunt', icon: 'fa-solid fa-bug', color: 'GLITCH', desc: 'Agudeza Visual' },
        { id: 'orbit-tracker', name: 'Orbit Tracker', icon: 'fa-solid fa-satellite-dish', color: 'TRACKER', desc: 'Seguimiento Orbital' },
        { id: 'cyber-typer', name: 'CYBER TYPER', icon: 'fa-solid fa-keyboard', color: 'GLITCH', desc: 'DEFENSA DEL SISTEMA' },
        
        // --- JUEGO SECRETO ---
        { id: 'cyber-pong',   name: 'CYBER PONG',  icon: 'fa-solid fa-table-tennis-paddle-ball', color: 'PONG',   desc: 'Duelo IA [CLASSIC]',   unlockReq: 'pass_lvl_5', cat: 'ACCION' },
        { id: 'snake-plus',   name: 'Snake ++',    icon: 'fa-solid fa-arrow-right-long',         color: 'BIO',    desc: 'Protocolo Serpiente',                       cat: 'ACCION' },
        { id: 'cipher-decode',name: 'Cipher Decode',icon: 'fa-solid fa-lock',                    color: 'VAULT',  desc: 'Descifra el Mensaje',                       cat: 'MENTAL' }
    ],

    GAME_INFO: {
        'higher-lower': { desc: "Algoritmo de probabilidad simple.", mech: "Predice si la carta será MAYOR o MENOR.", obj: "Acumula aciertos.", diff: "Azar." },
        'guess-card': { desc: "Sistema de predicción.", mech: "Adivina Palo o Color.", obj: "Palo 4x, Color 2x.", diff: "Suerte." },
        'trivia': { desc: "Evaluación de datos.", mech: "Preguntas contrarreloj.", obj: "Responde correctamente.", diff: "Tiempo." },
        'bio-scan': { desc: "Reconocimiento biológico.", mech: "Identifica la raza.", obj: "Acierta para ganar.", diff: "Zoología." },
        'geo-net': { desc: "Identificación de naciones.", mech: "Identifica la bandera.", obj: "Demuestra conocimiento.", diff: "Geografía." },
        'hyper-reflex': { desc: "Test de latencia.", mech: "Click en verde.", obj: "< 250ms.", diff: "Velocidad." },
        'spam-click': { desc: "Estrés mecánico.", mech: "Click rápido.", obj: "> 60 clicks.", diff: "Resistencia." },
        'neon-sniper': { desc: "Puntería de precisión.", mech: "Dispara objetivos.", obj: "No falles.", diff: "Velocidad." },
        'orbit-lock': { desc: "Sincronización.", mech: "Pulsa en zona segura.", obj: "Acierta giros.", diff: "Ritmo." },
        'memory-flash': { desc: "Memoria secuencial.", mech: "Repite luces.", obj: "Secuencia larga.", diff: "Memoria." },
        'vault-cracker': { desc: "Decodificación.", mech: "Adivina número (0-99).", obj: "6 intentos.", diff: "Lógica." },
        'phase-shifter': { desc: "Alineación de fase.", mech: "Detén en centro.", obj: "Precisión.", diff: "Timing." },
        'math-rush': { desc: "Cálculo rápido.", mech: "Verdad o Falso.", obj: "Antes de caer.", diff: "Estrés." },
        'color-trap': { desc: "Efecto Stroop.", mech: "Color de tinta.", obj: "Ignora texto.", diff: "Confusión." },
        'holo-match': { desc: "Patrones visuales.", mech: "Encuentra pares.", obj: "Despeja todo.", diff: "Memoria." },
        'void-dodger': { desc: "Evasión.", mech: "Esquiva todo.", obj: "Sobrevive.", diff: "Caos." },
        'glitch-hunt': { desc: "Depuración visual.", mech: "Encuentra el diferente.", obj: "Rápido.", diff: "Agudeza." },
        'orbit-tracker': { desc: "Seguimiento.", mech: "Sigue el orbe.", obj: "Mantén señal.", diff: "Pulso." },
        'cyber-typer': { desc: 'Intercepta el código malicioso.', mech: 'Escribe las palabras.', obj: 'Evita la brecha.' },
        'cyber-pong':    { desc: 'Simulación de tenis virtual.', mech: 'Devuelve la bola y vence a la IA.', obj: 'Anota goles.', diff: 'Clásico.' },
        'snake-plus':    { desc: 'Guía la serpiente sin chocar.', mech: 'Come manzanas para crecer. WASD o flechas.', obj: 'Máxima longitud.', diff: 'Clásico.' },
        'cipher-decode': { desc: 'Descifra mensajes encriptados.', mech: 'Selecciona el carácter correcto para cada símbolo.', obj: 'Velocidad y precisión.', diff: 'Mental.' }
    },

    DAILY_TARGETS: {
        'higher-lower': 50, 'guess-card': 20, 'trivia': 60, 'bio-scan': 60, 'geo-net': 80,
        'hyper-reflex': 400, 'spam-click': 30, 'neon-sniper': 50, 'orbit-lock': 40, 'memory-flash': 45,
        'vault-cracker': 1, 'phase-shifter': 50, 'math-rush': 50, 'color-trap': 10, 'holo-match': 1,
        'void-dodger': 15.0, 'glitch-hunt': 5, 'orbit-tracker': 20.0, 'cyber-typer': 500, 'cyber-pong': 5,
        'snake-plus': 30, 'cipher-decode': 50
    },

    SHOP: [
        { id: 't_default', type: 'THEME', name: 'Sistema Base', icon: 'fa-solid fa-desktop', desc: 'Interfaz estándar.', price: 0, val: { primary: '#3b82f6', text: '#e2e8f0' } },
        { id: 't_matrix', type: 'THEME', name: 'Hacker', icon: 'fa-solid fa-terminal', desc: 'Lluvia de código.', price: 1000, val: { primary: '#00ff00', text: '#00dd00' } },
        { id: 't_hot', type: 'THEME', name: 'Miami Vice', icon: 'fa-solid fa-sun', desc: 'Atardecer sintético.', price: 1500, val: { primary: '#f43f5e', text: '#fda4af' } },
        { id: 't_retro', type: 'THEME', name: 'GameBoy', icon: 'fa-solid fa-gamepad', desc: 'Monocromo nostálgico.', price: 2500, val: { primary: '#8bac0f', text: '#0f380f' } },
        { id: 't_void', type: 'THEME', name: 'Abismo', icon: 'fa-solid fa-ghost', desc: 'Modo ultra oscuro.', price: 3000, val: { primary: '#6366f1', text: '#818cf8' } },
        { id: 't_gold', type: 'THEME', name: 'Magnate', icon: 'fa-solid fa-crown', desc: 'Acabado en oro 24k.', price: 5000, val: { primary: '#fbbf24', text: '#fef3c7' } },
        { id: 't_crimson', type: 'THEME', name: 'Protocolo Rojo', icon: 'fa-solid fa-triangle-exclamation', desc: 'Estado de Alerta Máxima.', price: 3500, val: { primary: '#ef4444', text: '#fee2e2' } },
        { id: 't_blueprint', type: 'THEME', name: 'Arquitecto', icon: 'fa-solid fa-compass-drafting', desc: 'Plano técnico del sistema.', price: 4000, val: { primary: '#38bdf8', text: '#f0f9ff' } },
        { id: 't_win95', type: 'THEME', name: 'System 95', icon: 'fa-brands fa-windows', desc: 'Estilo clásico de escritorio.', price: 2000, val: { primary: '#000080', text: '#c0c0c0' } },
        { id: 't_paper', type: 'THEME', name: 'Paper OS', icon: 'fa-solid fa-note-sticky', desc: 'Estilo boceto en papel.', price: 2500, val: { primary: '#000000', text: '#333333' } },
        { id: 't_waste', type: 'THEME', name: 'Wasteland', icon: 'fa-solid fa-radiation', desc: 'Terminal post-nuclear.', price: 4000, val: { primary: '#fb923c', text: '#ffedd5' } },
        { id: 't_vhs', type: 'THEME', name: 'VHS 1985', icon: 'fa-solid fa-video', desc: 'Rebobina la cinta.', price: 3000, val: { primary: '#d946ef', text: '#fae8ff' } },
        { id: 't_nokia', type: 'THEME', name: 'Indestructible', icon: 'fa-solid fa-mobile-screen-button', desc: 'Snake 3310 Style.', price: 99999, val: { primary: '#4c5c44', text: '#000000' } },
        { id: 't_discord', type: 'THEME', name: 'Chat Mode', icon: 'fa-brands fa-discord', desc: 'Para gamers nocturnos.', price: 99999, val: { primary: '#5865F2', text: '#dcddde' } },
        { id: 't_vapor', type: 'THEME', name: 'Aesthetic', icon: 'fa-solid fa-landmark', desc: 'Vaporwave vibes.', price: 99999, val: { primary: '#ff71ce', text: '#01cdfe' } },
        
        // --- TEMAS NUEVOS ---
        {
            id: 't_hazard',
            type: 'THEME',
            name: 'POLICE LINE',
            desc: 'Zona restringida.',
            price: 1500,
            icon: 'fa-solid fa-triangle-exclamation',
            val: { primary: '#f59e0b', text: '#1c1917' }
        },
        {
            id: 't_y2k',
            type: 'THEME',
            name: 'ATOMIC PURPLE',
            desc: 'Carcasa translúcida.',
            price: 2000,
            icon: 'fa-solid fa-gamepad',
            val: { primary: '#c084fc', text: '#e9d5ff' }
        },
        {
            id: 't_receipt',
            type: 'THEME',
            name: 'TICKET',
            desc: 'Consumo masivo.',
            price: 800,
            icon: 'fa-solid fa-file-invoice',
            val: { primary: '#1c1c1c', text: '#333333' }
        },

        // === TEMAS NOSTÁLGICOS V2 ===
        { id: 't_doom',      type: 'THEME', name: 'DOOM 1993',      icon: 'fa-solid fa-skull',            desc: 'Los colores del infierno. Rip and tear.',          price: 4500,   val: 't_doom'      },
        { id: 't_outrun',    type: 'THEME', name: 'OutRun',         icon: 'fa-solid fa-car',              desc: 'Arcade de 1986. Velocidad y neón.',                price: 3500,   val: 't_outrun'    },
        { id: 't_c64',       type: 'THEME', name: 'Commodore 64',   icon: 'fa-solid fa-floppy-disk',      desc: 'El azul icónico del C64. Retro computing.',        price: 2000,   val: 't_c64'       },
        { id: 't_hotline',   type: 'THEME', name: 'Hotline Miami',  icon: 'fa-solid fa-mask',             desc: 'Neón violento. La ciudad nunca duerme.',           price: 4000,   val: 't_hotline'   },
        { id: 't_bloodborne',type: 'THEME', name: 'Bloodborne',     icon: 'fa-solid fa-moon',             desc: 'Amanecer rojo sobre Yharnam.',                     price: 5000,   val: 't_bloodborne'},
        { id: 't_pokemon',   type: 'THEME', name: 'Pokémon',        icon: 'fa-solid fa-gamepad',          desc: 'Gotta catch \'em all. Verde Game Boy.',            price: 2500,   val: 't_pokemon'   },
        { id: 't_tron',      type: 'THEME', name: 'TRON 1982',      icon: 'fa-solid fa-circle-nodes',     desc: 'La Cuadrícula. Cian sobre negro absoluto.',        price: 3000,   val: 't_tron'      },
        { id: 't_winamp',    type: 'THEME', name: 'Winamp',         icon: 'fa-solid fa-music',            desc: 'It really whips the llama\'s ass.',                price: 1800,   val: 't_winamp'    },

      


        { id: 't_diablo',    type: 'THEME', name: 'Diablo II',      icon: 'fa-solid fa-fire-flame-curved', desc: 'El Santuario en llamas. Rojo sangre.',         price: 4000,   val: 't_diablo'    },
        { id: 't_cs16',      type: 'THEME', name: 'Counter-Strike', icon: 'fa-solid fa-gun',               desc: 'CT side. 1.6 forever.',                        price: 2500,   val: 't_cs16'      },
        { id: 't_quake',     type: 'THEME', name: 'Quake',          icon: 'fa-solid fa-q',                 desc: 'Frags por segundo. Brown y oscuro.',           price: 3000,   val: 't_quake'     },
        { id: 't_xperror',   type: 'THEME', name: 'XP Error',       icon: 'fa-brands fa-windows',          desc: 'Fatal Exception. Pantalla azul de la muerte.', price: 1500,   val: 't_xperror'   },
        { id: 't_starcraft', type: 'THEME', name: 'StarCraft',       icon: 'fa-solid fa-star',              desc: 'Protoss azul. Por Aiur.',                     price: 3500,   val: 't_starcraft' },
        { id: 'p_circle', type: 'PARTICLE', name: 'Chispas', icon: 'fa-solid fa-circle', desc: 'Efecto estándar.', price: 0, val: 'circle' },
        { id: 'p_square', type: 'PARTICLE', name: 'Vóxeles', icon: 'fa-solid fa-cube', desc: 'Cubos de datos.', price: 500, val: 'square' },
        { id: 'p_star', type: 'PARTICLE', name: 'Polvo Estelar', icon: 'fa-solid fa-star', desc: 'Brilla intensamente.', price: 1200, val: 'star' },
        { id: 'p_code', type: 'PARTICLE', name: 'Glitches', icon: 'fa-solid fa-bug', desc: 'Errores del sistema.', price: 2000, val: 'code' },
        { id: 'p_bio', type: 'PARTICLE', name: 'Tóxico', icon: 'fa-solid fa-biohazard', desc: 'Residuos peligrosos.', price: 2500, val: 'bio' },
        { id: 'p_money', type: 'PARTICLE', name: 'Lluvia de Dinero', icon: 'fa-solid fa-sack-dollar', desc: '¡Estás forrado!', price: 5000, val: 'money' },
        { id: 'p_heart', type: 'PARTICLE', name: 'Vidas', icon: 'fa-solid fa-heart', desc: 'Amor pixelado.', price: 1500, val: 'heart' },
        { id: 'p_pizza', type: 'PARTICLE', name: 'Pizza Time', icon: 'fa-solid fa-pizza-slice', desc: 'Alimenta al sistema.', price: 2000, val: 'pizza' },
        { id: 'p_note', type: 'PARTICLE', name: 'Ritmo', icon: 'fa-solid fa-music', desc: 'Siente la música.', price: 1500, val: 'note' },
        { id: 'p_bubble', type: 'PARTICLE', name: 'Burbujas', icon: 'fa-solid fa-soap', desc: 'Limpio y fresco.', price: 1000, val: 'bubble' },

        { id: 'av_hacker', type: 'AVATAR', name: 'Sombrero Negro', icon: 'fa-user-secret', desc: 'Incógnito.', price: 800, val: 'fa-user-secret' },
        { id: 'av_robot', type: 'AVATAR', name: 'Androide T-800', icon: 'fa-robot', desc: 'Sin sentimientos.', price: 1500, val: 'fa-robot' },
        { id: 'av_alien', type: 'AVATAR', name: 'Visitante', icon: 'fa-brands fa-reddit-alien', desc: 'Viene en paz.', price: 2000, val: 'fa-brands fa-reddit-alien' },
        { id: 'av_ninja', type: 'AVATAR', name: 'Cyber Ninja', icon: 'fa-user-ninja', desc: 'Silencioso y letal.', price: 2500, val: 'fa-user-ninja' },
        { id: 'av_dragon', type: 'AVATAR', name: 'Elder Dragon', icon: 'fa-dragon', desc: 'Poder ancestral.', price: 5000, val: 'fa-dragon' },

        { id: 'c_xp_boost', type: 'CONSUMABLE', name: 'Chip de XP', icon: 'fa-solid fa-angles-up', desc: 'Doble XP próxima partida.', price: 300, val: 'xp_boost' },
        { id: 'c_shield', type: 'CONSUMABLE', name: 'Escudo Firewall', icon: 'fa-solid fa-shield-halved', desc: 'Evita 1 error fatal.', price: 500, val: 'shield' },

        { id: 'up_credit', type: 'HARDWARE', name: 'Credit Miner v1', icon: 'fa-solid fa-microchip', desc: '+10% Ganancia de Créditos (Pasivo).', price: 5000, val: 'credit_boost' },
        { id: 'up_xp', type: 'HARDWARE', name: 'Neural Link', icon: 'fa-solid fa-brain', desc: '+15% Ganancia de XP (Pasivo).', price: 4000, val: 'xp_boost' },
        { id: 'up_vip', type: 'HARDWARE', name: 'VIP Pass', icon: 'fa-solid fa-id-card', desc: 'Loot Box cuesta 400 CR en vez de 500.', price: 8000, val: 'vip_discount' },

        // --- CAJAS PREMIUM ---
        { id: 'box_cyber', type: 'LOOTBOX', name: 'Caja Cyber',      icon: 'fa-solid fa-box',      desc: 'Drops de créditos mejorados. Sin Reintegro.',                   price: 1200, val: 'box_cyber',  rarity:'rare'      },
        { id: 'box_void',  type: 'LOOTBOX', name: 'Caja del Abismo', icon: 'fa-solid fa-circle-dot',desc: 'Alto riesgo, alta recompensa. Puede dar muy poco o muchísimo.', price: 800,  val: 'box_void',   rarity:'epic'      },
        { id: 'box_gold',  type: 'LOOTBOX', name: 'Caja Magnate',    icon: 'fa-solid fa-crown',    desc: 'Solo recompensas grandes. Sin basura garantizada.',             price: 3000, val: 'box_gold',   rarity:'legendary' },

        // --- TARJETAS DE RESULTADO (CALLCARDS) — Universos de referencia ---
        { id: 'cc_default',   type: 'CALLCARD', name: 'Sistema Base',    icon: 'fa-solid fa-table-columns',    desc: 'Estilo estándar. Siempre disponible.',                price: 0,     val: 'default',   ref: '' },
        { id: 'cc_bsod',      type: 'CALLCARD', name: 'Windows BSOD',    icon: 'fa-solid fa-display',          desc: 'Pantalla azul de la muerte. Clásico de Windows.',     price: 1500,  val: 'bsod',      ref: 'Windows' },
        { id: 'cc_matrix',    type: 'CALLCARD', name: 'Matrix',           icon: 'fa-solid fa-code',             desc: 'La lluvia de código de Neo. Sigue al conejo blanco.', price: 2000,  val: 'matrix',    ref: 'Matrix' },
        { id: 'cc_fallout',   type: 'CALLCARD', name: 'Fallout',          icon: 'fa-solid fa-radiation',        desc: 'El yermo post-nuclear. War. War never changes.',      price: 2500,  val: 'fallout',   ref: 'Fallout' },
        { id: 'cc_vcity',     type: 'CALLCARD', name: 'Vice City',        icon: 'fa-solid fa-umbrella-beach',   desc: 'Neon de los 80s. Bienvenido a Vice City.',            price: 3000,  val: 'vcity',     ref: 'GTA: Vice City' },
        { id: 'cc_doom',      type: 'CALLCARD', name: 'DOOM',             icon: 'fa-solid fa-skull',            desc: 'El infierno en la Tierra. Rip and tear.',             price: 3500,  val: 'doom',      ref: 'DOOM' },
        { id: 'cc_minecraft', type: 'CALLCARD', name: 'Minecraft',        icon: 'fa-solid fa-cube',             desc: 'Bloques y píxeles. Un mundo por construir.',          price: 2000,  val: 'minecraft', ref: 'Minecraft' },
        { id: 'cc_tron',      type: 'CALLCARD', name: 'TRON',             icon: 'fa-solid fa-circle-nodes',     desc: 'La Cuadrícula. Programas y ciclos de luz.',           price: 4000,  val: 'tron',      ref: 'TRON' },
        { id: 'cc_discord',   type: 'CALLCARD', name: 'Discord',          icon: 'fa-solid fa-headset',          desc: 'Pings a medianoche. Servidor de leyenda.',            price: 1200,  val: 'discord',   ref: 'Discord' },
        { id: 'cc_hacker',    type: 'CALLCARD', name: 'H4CK3R',           icon: 'fa-solid fa-terminal',         desc: 'Lluvia de código verde. Modo hacker total.',          price: 2800,  val: 'hacker',    ref: 'Hackers/Mr. Robot' },
        { id: 'cc_retro',     type: 'CALLCARD', name: 'Arcade 1984',      icon: 'fa-solid fa-gamepad',          desc: 'Pixeles y beeps. La era dorada del arcade.',          price: 3200,  val: 'retro',     ref: 'Arcade clásico' },
        { id: 'cc_gold',      type: 'CALLCARD', name: 'Pay2Win',          icon: 'fa-solid fa-crown',            desc: 'Lluvia de oro. Para los que pagan la skin.',          price: 8000,  val: 'gold',      ref: 'Battle Royale' },
        { id: 'cc_portal',    type: 'CALLCARD', name: 'Portal',           icon: 'fa-solid fa-circle-dot',       desc: 'The cake is a lie. Portales azul y naranja.',         price: 3500,  val: 'portal',    ref: 'Portal' },
        { id: 'cc_celeste',   type: 'CALLCARD', name: 'Celeste',          icon: 'fa-solid fa-mountain',         desc: 'Sube la montaña. Cada caída es un paso.',             price: 2800,  val: 'celeste',   ref: 'Celeste' },
        { id: 'cc_halflife',  type: 'CALLCARD', name: 'Half-Life',        icon: 'fa-solid fa-flask',            desc: 'Resonance Cascade. Freeman no está.',                 price: 4500,  val: 'halflife',  ref: 'Half-Life' },
        { id: 'cc_cyberpunk', type: 'CALLCARD', name: 'Night City',       icon: 'fa-solid fa-city',             desc: 'Wake the f*** up, Samurai. Tenemos una ciudad que quemar.', price: 5000, val: 'cyberpunk', ref: 'Cyberpunk 2077' },
        { id: 'cc_amongus',  type: 'CALLCARD', name: 'Among Us',     icon: 'fa-solid fa-user-astronaut', desc: 'Sus. Emergencia en la nave.',                  price: 2200,  val: 'amongus',   ref: 'Among Us' },
        { id: 'cc_undertale',type: 'CALLCARD', name: 'Undertale',    icon: 'fa-solid fa-heart',          desc: 'Stay determined. No maten nada.',              price: 3800,  val: 'undertale', ref: 'Undertale' },
        { id: 'cc_hollow',   type: 'CALLCARD', name: 'Hollow Knight',icon: 'fa-solid fa-chess-knight',   desc: 'El reino olvidado. Mantis y sombras.',         price: 4200,  val: 'hollow',    ref: 'Hollow Knight' },
        { id: 'cc_stardew',  type: 'CALLCARD', name: 'Stardew',      icon: 'fa-solid fa-seedling',       desc: 'La granja te espera. Pelikan Town.',           price: 2000,  val: 'stardew',   ref: 'Stardew Valley' }
    ],

    SKILLS: {
        SWAP: { id: 'swap', cost: 35, icon: '🔄', name: 'Swap' },
        ORACLE: { id: 'oracle', cost: 75, icon: '🔮', name: 'Peek' },
        SHIELD: { id: 'shield', cost: 150, icon: '🛡️', name: 'Shield' }
    },

    ACHIEVEMENTS: [
        // ── Progresión ──
        { id: 'firstblood',  name: 'Primera Sangre',    desc: 'Jugar por primera vez',        check: s => s.gamesPlayed >= 1,                              icon: '🩸' },
        { id: 'pro',         name: 'Veterano',           desc: '50 partidas jugadas',          check: s => s.gamesPlayed >= 50,                             icon: '🎖️' },
        { id: 'dedicated',   name: 'Dedicado',           desc: '200 partidas jugadas',         check: s => s.gamesPlayed >= 200,                            icon: '🔩' },
        { id: 'obsessed',    name: 'Obsesionado',        desc: '500 partidas jugadas',         check: s => s.gamesPlayed >= 500,                            icon: '🤖' },
        { id: 'collector',   name: 'Coleccionista',      desc: 'Nivel 10 alcanzado',           check: s => s.level >= 10,                                   icon: '📦' },
        { id: 'legend',      name: 'Leyenda',            desc: 'Nivel 30 alcanzado',           check: s => s.level >= 30,                                   icon: '👑' },
        { id: 'transcend',   name: 'Trascendente',       desc: 'Nivel 50 alcanzado',           check: s => s.level >= 50,                                   icon: '🌌' },
        // ── Economía ──
        { id: 'rich',        name: 'Magnate',            desc: 'Acumula 500 créditos',         check: s => s.credits >= 500,                                icon: '💎' },
        { id: 'millionaire', name: 'Millonario',         desc: 'Acumula 10,000 créditos',      check: s => s.credits >= 10000,                              icon: '🏦' },
        { id: 'billionaire', name: 'Multimillonario',    desc: 'Acumula 100,000 créditos',     check: s => s.credits >= 100000,                             icon: '🏰' },
        // ── Reflejos ──
        { id: 'sniper',      name: 'Sniper',             desc: 'Reflejos < 200ms',             check: s => s.bestReflex > 0 && s.bestReflex < 200,          icon: '⚡' },
        { id: 'speedgod',    name: 'Dios de la Vel.',    desc: 'Reflejos < 150ms',             check: s => s.bestReflex > 0 && s.bestReflex < 150,          icon: '🌩️' },
        { id: 'quantum',     name: 'Cuántico',           desc: 'Reflejos < 100ms',             check: s => s.bestReflex > 0 && s.bestReflex < 100,          icon: '⚛️' },
        // ── Racha ──
        { id: 'habitual',    name: 'Habitual',           desc: 'Racha de 3 días seguidos',     check: s => (s.streak?.days||s.days||0) >= 3,                icon: '🔥' },
        { id: 'weekly_s',    name: 'Semana Perfecta',    desc: 'Racha de 7 días seguidos',     check: s => (s.streak?.days||s.days||0) >= 7,                icon: '📅' },
        { id: 'monthly',     name: 'Mensual',            desc: 'Racha de 30 días seguidos',    check: s => (s.streak?.days||s.days||0) >= 30,               icon: '🗓️' },
        // ── Colección ──
        { id: 'shopper',     name: 'Comprador',          desc: 'Compra 5 items en la tienda',  check: s => (s.inventory?.length||0) >= 5,                   icon: '🛒' },
        { id: 'hoarder',     name: 'Acaparador',         desc: 'Compra 15 items en la tienda', check: s => (s.inventory?.length||0) >= 15,                  icon: '📦' },
        { id: 'fashionista', name: 'Fashionista',        desc: 'Desbloquea 5 temas',           check: s => (s.inventory?.filter?.(i=>i.startsWith?.('t_'))?.length||0) >= 5, icon: '🎨' },
        // ── Battle Pass ──
        { id: 'passer',      name: 'Pasajero',           desc: 'Reclama 10 recompensas del pass', check: s => (s.passClaimed?.length||0) >= 10,             icon: '🎫' },
        { id: 'passmaster',  name: 'Maestro del Pass',   desc: 'Reclama 25 recompensas del pass', check: s => (s.passClaimed?.length||0) >= 25,             icon: '🏆' },
        // ── Daily / Weekly ──
        { id: 'daily_done',  name: 'Puntual',            desc: 'Completa el protocolo diario', check: s => s.dailyCompleted >= 1,                           icon: '✅' },
        { id: 'weekly_done', name: 'Constante',          desc: 'Completa misiones semanales',  check: s => s.weeklyCompleted >= 1,                          icon: '📋' },
        // ── Especiales ──
        { id: 'nolifer',     name: 'Sin Vida',           desc: 'Juega 1000 partidas',          check: s => s.gamesPlayed >= 1000,                           icon: '💀' },
        { id: 'highroller',  name: 'High Roller',        desc: 'Gana 500 CR en una partida',   check: s => s.bestPrize >= 500,                              icon: '🎰' },
        { id: 'perfectionist',name:'Perfeccionista',     desc: 'Consigue rango S en cualquier juego', check: s => s.hasRankS,                              icon: '💯' },
        { id: 'nocturno',    name: 'Nocturno',           desc: 'Juega después de medianoche',  check: s => s.playedLate,                                    icon: '🌙' },
        { id: 'streakmaster',name:'Maestro de Rachas',   desc: 'Racha de 50 días',             check: s => (s.streak?.best||s.best||0) >= 50,               icon: '🌋' },
        { id: 'architect',   name: 'El Architecto',      desc: 'Completa todos los logros anteriores', check: s => (s.unlockedAchs?.length||0) >= 28,       icon: '🏛️' },
    ],

    BATTLE_PASS: [
        { lvl: 1,  type: 'CREDITS',     val: 200,              name: 'Pago Inicial',        icon: 'fa-coins',                    rarity: 'common',    desc: '+200 CR de bienvenida' },
        { lvl: 2,  type: 'PARTICLE',    val: 'p_square',       name: 'FX: Vóxeles',         icon: 'fa-cube',                     rarity: 'common',    desc: 'Explosiones cúbicas' },
        { lvl: 3,  type: 'CREDITS',     val: 300,              name: 'Fondo Operativo',      icon: 'fa-sack-dollar',              rarity: 'common',    desc: '+300 CR' },
        { lvl: 4,  type: 'AVATAR',      val: 'fa-headset',     name: 'Avatar: Ops',          icon: 'fa-headset',                  rarity: 'rare',      desc: 'Identidad de operador' },
        { lvl: 5,  type: 'GAME_UNLOCK', val: 'cyber-pong',     name: 'CYBER PONG',           icon: 'fa-table-tennis-paddle-ball', rarity: 'epic',      desc: 'Juego exclusivo desbloqueado' },
        { lvl: 6,  type: 'CREDITS',     val: 500,              name: 'Dividendo',            icon: 'fa-coins',                    rarity: 'common',    desc: '+500 CR' },
        { lvl: 7,  type: 'PARTICLE',    val: 'p_star',         name: 'FX: Polvo Estelar',    icon: 'fa-star',                     rarity: 'rare',      desc: 'Brillos intensos' },
        { lvl: 8,  type: 'CREDITS',     val: 600,              name: 'Activos Digitales',    icon: 'fa-coins',                    rarity: 'common',    desc: '+600 CR' },
        { lvl: 9,  type: 'AVATAR',      val: 'fa-robot',       name: 'Avatar: T-800',        icon: 'fa-robot',                    rarity: 'rare',      desc: 'Sin sentimientos' },
        { lvl: 10, type: 'THEME',       val: 't_nokia',        name: 'Indestructible',       icon: 'fa-mobile-screen-button',     rarity: 'epic',      desc: 'Snake 3310 style' },
        { lvl: 11, type: 'CREDITS',     val: 700,              name: 'Comisión',             icon: 'fa-coins',                    rarity: 'common',    desc: '+700 CR' },
        { lvl: 12, type: 'PARTICLE',    val: 'p_code',         name: 'FX: Glitches',         icon: 'fa-bug',                      rarity: 'rare',      desc: 'Errores del sistema' },
        { lvl: 13, type: 'CREDITS',     val: 800,              name: 'Liquidez',             icon: 'fa-coins',                    rarity: 'common',    desc: '+800 CR' },
        { lvl: 14, type: 'AVATAR',      val: 'fa-user-secret', name: 'Avatar: Hacker',       icon: 'fa-user-secret',              rarity: 'epic',      desc: 'Modo incógnito' },
        { lvl: 15, type: 'HARDWARE',    val: 'up_xp',          name: 'Neural Link',          icon: 'fa-brain',                    rarity: 'legendary', desc: '+15% XP permanente' },
        { lvl: 17, type: 'CREDITS',     val: 1000,             name: 'Maletín de Fondos',    icon: 'fa-briefcase',                rarity: 'rare',      desc: '+1000 CR' },
        { lvl: 18, type: 'PARTICLE',    val: 'p_heart',        name: 'FX: Corazones',        icon: 'fa-heart',                    rarity: 'rare',      desc: 'Amor pixelado' },
        { lvl: 19, type: 'AVATAR',      val: 'fa-user-ninja',  name: 'Avatar: Cyber Ninja',  icon: 'fa-user-ninja',               rarity: 'epic',      desc: 'Silencioso y letal' },
        { lvl: 20, type: 'THEME',       val: 't_vapor',        name: 'Aesthetic',            icon: 'fa-landmark',                 rarity: 'legendary', desc: 'Vaporwave vibes' },
        { lvl: 22, type: 'CREDITS',     val: 1200,             name: 'Capital Oscuro',       icon: 'fa-coins',                    rarity: 'rare',      desc: '+1200 CR' },
        { lvl: 24, type: 'PARTICLE',    val: 'p_money',        name: 'FX: Money Rain',       icon: 'fa-sack-dollar',              rarity: 'epic',      desc: 'Lluvia de efectivo' },
        { lvl: 25, type: 'THEME',       val: 't_discord',      name: 'Chat Mode',            icon: 'fa-brands fa-discord',        rarity: 'legendary', desc: 'Para gamers nocturnos' },
        { lvl: 27, type: 'CREDITS',     val: 1500,             name: 'Fondo Oscuro',         icon: 'fa-coins',                    rarity: 'rare',      desc: '+1500 CR' },
        { lvl: 29, type: 'PARTICLE',    val: 'p_bio',          name: 'FX: Tóxico',           icon: 'fa-biohazard',                rarity: 'epic',      desc: 'Residuos peligrosos' },
        { lvl: 30, type: 'AVATAR',      val: 'fa-dragon',      name: 'Elder Dragon',         icon: 'fa-dragon',                   rarity: 'legendary', desc: 'Poder ancestral despertado' },
        { lvl: 35, type: 'HARDWARE',    val: 'up_credit',      name: 'Credit Miner v1',      icon: 'fa-microchip',                rarity: 'legendary', desc: '+10% créditos permanente' },
        { lvl: 40, type: 'CREDITS',     val: 5000,             name: 'Reserva Federal',      icon: 'fa-coins',                    rarity: 'legendary', desc: '+5000 CR' },
        { lvl: 45, type: 'PARTICLE',    val: 'p_pizza',        name: 'FX: Pizza Time',       icon: 'fa-pizza-slice',              rarity: 'epic',      desc: 'Secreto desclasificado' },
        { lvl: 50, type: 'CREDITS',     val: 10000,            name: 'JACKPOT FINAL',        icon: 'fa-trophy',                   rarity: 'legendary', desc: 'El final del camino' }
    ],

    TITLES: [
        { id: 'rookie',      name: 'El Rookie',           unlock: 'firstblood',   desc: 'Tu primera partida' },
        { id: 'speedster',   name: 'El Rayo',             unlock: 'sniper',       desc: 'Reflejos sobrehumanos' },
        { id: 'nightowl',    name: 'El Nocturno',         unlock: 'nocturno',     desc: 'Las madrugadas son tuyas' },
        { id: 'wealthy',     name: 'El Magnate',          unlock: 'millionaire',  desc: 'Créditos sin límite' },
        { id: 'veteran',     name: 'El Veterano',         unlock: 'pro',          desc: '50 partidas en el sistema' },
        { id: 'streak',      name: 'El Constante',        unlock: 'weekly_s',     desc: '7 días sin fallar' },
        { id: 'fashionable', name: 'El Fashionista',      unlock: 'fashionista',  desc: 'Estilo por encima de todo' },
        { id: 'perfectionist',name:'El Perfeccionista',   unlock: 'perfectionist',desc: 'Nada menos que rango S' },
        { id: 'ghost',       name: 'El Fantasma',         unlock: 'dedicated',    desc: 'Siempre presente, nunca visto' },
        { id: 'transcend',   name: 'El Trascendente',     unlock: 'transcend',    desc: 'Nivel 50. El pico del sistema' },
        { id: 'architect',   name: 'El Architecto',       unlock: 'architect',    desc: 'Lo ha conseguido todo' },
    ],

    RANKS: [
        { lv: 1, name: "Vagabundo Digital", req: 0 },
        { lv: 5, name: "Script Kiddie", req: 1000 },
        { lv: 10, name: "Netrunner", req: 5000 },
        { lv: 20, name: "Elite Hacker", req: 15000 },
        { lv: 30, name: "System Architect", req: 30000 },
        { lv: 50, name: "Cyber God", req: 100000 }
    ],

    RIVALS: [
        { name: "THE_ARCHITECT", xp: 999999, rank: "GOD", color: "#ffd700" },
        { name: "ZeroCool", xp: 50000, rank: "LEGEND", color: "#ef4444" },
        { name: "AcidBurn", xp: 25000, rank: "ELITE", color: "#a855f7" },
        { name: "NeonGhost", xp: 12000, rank: "PRO", color: "#3b82f6" },
        { name: "GlitchWitch", xp: 6000, rank: "PRO", color: "#ec4899" },
        { name: "ByteBandit", xp: 3000, rank: "USER", color: "#10b981" },
        { name: "ScriptKid_99", xp: 800, rank: "NOOB", color: "#94a3b8" }
    ],

    AVATARS: [
        'fa-user-astronaut', 
        'fa-user-secret', 
        'fa-robot', 
        'fa-user-ninja', 
        'fa-headset', 
        'fa-dragon', 
        'fa-skull', 
        'fa-ghost' 
    ]
};

// --- EXPORTACIONES INDEPENDIENTES ---
export const TRIVIA_DATA = [
    { c: "CIENCIA", q: "¿Cuál es el elemento químico más abundante en el universo?", a: "Hidrógeno", i: ["Oxígeno", "Carbono", "Helio"] },
    { c: "GEOGRAFÍA", q: "¿Cuál es el río más largo del mundo?", a: "Amazonas", i: ["Nilo", "Yangtsé", "Misisipi"] },
    { c: "HISTORIA", q: "¿En qué año llegó el hombre a la Luna?", a: "1969", i: ["1965", "1972", "1959"] },
    { c: "CINE", q: "¿Quién dirigió la película 'El Laberinto del Fauno'?", a: "Guillermo del Toro", i: ["Alfonso Cuarón", "Alejandro Iñárritu", "Pedro Almodóvar"] },
    { c: "ARTE", q: "¿Quién pintó 'La noche estrellada'?", a: "Vincent van Gogh", i: ["Pablo Picasso", "Claude Monet", "Salvador Dalí"] },
    { c: "TECNOLOGÍA", q: "¿Qué significa 'CPU' en informática?", a: "Unidad Central de Procesamiento", i: ["Control de Procesos Unificado", "Centro de Programación Universal", "Computadora Personal Unificada"] },
    { c: "ANIMALES", q: "¿Cuál es el animal terrestre más rápido?", a: "Guepardo", i: ["León", "Gacela", "Caballo"] },
    { c: "MÚSICA", q: "¿Quién es conocido como el 'Rey del Pop'?", a: "Michael Jackson", i: ["Elvis Presley", "Freddie Mercury", "Prince"] },
    { c: "DEPORTES", q: "¿En qué deporte se utiliza una raqueta y un volante?", a: "Bádminton", i: ["Tenis", "Ping Pong", "Squash"] },
    { c: "LITERATURA", q: "¿Quién escribió 'Cien años de soledad'?", a: "Gabriel García Márquez", i: ["Mario Vargas Llosa", "Jorge Luis Borges", "Julio Cortázar"] },
    { c: "VIDEOJUEGOS", q: "¿Cómo se llama el fontanero más famoso de Nintendo?", a: "Mario", i: ["Luigi", "Wario", "Link"] },
    { c: "ASTRONOMÍA", q: "¿Cuál es el planeta más grande del sistema solar?", a: "Júpiter", i: ["Saturno", "Tierra", "Neptuno"] }
];

export const FLAGS_DATA = [
    { code: "ar", name: "Argentina", capital: "Buenos Aires" },
    { code: "au", name: "Australia", capital: "Canberra" },
    { code: "br", name: "Brasil", capital: "Brasilia" },
    { code: "ca", name: "Canadá", capital: "Ottawa" },
    { code: "cn", name: "China", capital: "Pekín" },
    { code: "co", name: "Colombia", capital: "Bogotá" },
    { code: "de", name: "Alemania", capital: "Berlín" },
    { code: "es", name: "España", capital: "Madrid" },
    { code: "fr", name: "Francia", capital: "París" },
    { code: "gb", name: "Reino Unido", capital: "Londres" },
    { code: "in", name: "India", capital: "Nueva Delhi" },
    { code: "it", name: "Italia", capital: "Roma" },
    { code: "jp", name: "Japón", capital: "Tokio" },
    { code: "mx", name: "México", capital: "C. de México" },
    { code: "ru", name: "Rusia", capital: "Moscú" },
    { code: "us", name: "Estados Unidos", capital: "Washington D.C." },
    { code: "za", name: "Sudáfrica", capital: "Pretoria" },
    { code: "kr", name: "Corea del Sur", capital: "Seúl" },
    { code: "pe", name: "Perú", capital: "Lima" },
    { code: "cl", name: "Chile", capital: "Santiago" },
    { code: "ve", name: "Venezuela", capital: "Caracas" },
    { code: "eg", name: "Egipto", capital: "El Cairo" },
    { code: "gr", name: "Grecia", capital: "Atenas" },
    { code: "nl", name: "Países Bajos", capital: "Ámsterdam" },
    { code: "se", name: "Suecia", capital: "Estocolmo" },
    { code: "ch", name: "Suiza", capital: "Berna" },
    { code: "pt", name: "Portugal", capital: "Lisboa" },
    { code: "be", name: "Bélgica", capital: "Bruselas" },
    { code: "at", name: "Austria", capital: "Viena" },
    { code: "dk", name: "Dinamarca", capital: "Copenhague" }
];
import { CONFIG } from './config.js';

export class AudioController {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        
        // Volúmenes iniciales (0.0 a 1.0)
        this.vol = { master: 0.5, sfx: 1.0, music: 0.5 };
        
        this.oscillators = [];
        this.ambienceOsc = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Cadena de Audio: Fuente -> Music/SFX Gain -> Master Gain -> Salida
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.vol.master;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.vol.sfx;
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.vol.music;
        this.musicGain.connect(this.masterGain);

        this.initialized = true;
        this.playBootSound();
    }

    setVolume(type, value) {
        if (!this.initialized) return;
        // value entra de 0 a 100, lo pasamos a 0.0 - 1.0
        const norm = Math.max(0, Math.min(1, value / 100));
        this.vol[type] = norm;

        if(type === 'master') this.masterGain.gain.setTargetAtTime(norm, this.ctx.currentTime, 0.1);
        if(type === 'sfx') this.sfxGain.gain.setTargetAtTime(norm, this.ctx.currentTime, 0.1);
        if(type === 'music') this.musicGain.gain.setTargetAtTime(norm, this.ctx.currentTime, 0.1);
    }

    // --- GENERADORES DE SONIDO (SINTETIZADOR) ---

    playTone(freq, type = 'sine', duration = 0.1, vol = 0.5) {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxGain); // Conectar al bus de SFX
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playClick() { this.playTone(800, 'triangle', 0.05, 0.2); }
    playHover() { this.playTone(400, 'sine', 0.05, 0.1); }
    
    playWin(intensity = 1) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        // Acorde mayor ascendente
        [0, 0.1, 0.2].forEach((delay, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(440 + (i * 110), now + delay);
            gain.gain.setValueAtTime(0.1 * intensity, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.5);
        });
    }

    playLose() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playBuy() {
        this.playTone(1200, 'sine', 0.1, 0.3);
        setTimeout(() => this.playTone(1800, 'square', 0.1, 0.3), 100);
    }

    playBootSound() {
        this.playTone(220, 'sine', 1.0, 0.1);
    }

    // --- AMBIENTE / MÚSICA ---
    setAmbience(theme) {
        if (!this.initialized) return;
        if (this.ambienceOsc) {
            this.ambienceOsc.stop();
            this.ambienceOsc = null;
        }
        
        // Drone básico para fondo
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Frecuencia baja según tema
        let freq = 55; // Default (La)
        if (theme === 't_matrix') freq = 45;
        if (theme === 't_gold') freq = 65;
        
        osc.frequency.value = freq;
        gain.gain.value = 0.05; // Muy suave
        
        osc.connect(gain);
        gain.connect(this.musicGain); // Conectar al bus de Música
        osc.start();
        this.ambienceOsc = osc;
    }
    
    setTension(active) {
        if(this.ambienceOsc) {
            // Subir tono si hay tensión
            const target = active ? 110 : 55;
            this.ambienceOsc.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.5);
        }
    }
}
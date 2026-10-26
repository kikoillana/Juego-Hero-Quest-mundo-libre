/**
 * @fileoverview Sintetizador de Vocalizaciones, Gritos de Guerra y Gruñidos mediante filtros de formantes
 * (Web Audio API). Reemplaza por completo la lectura de texto TTS por gritos y gruñidos lógicos.
 * Capa 2: Depende de constants.js y EventBus.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';

export function hablarPersonaje() {
    // Lectura TTS desactivada intencionalmente: sustituida por gritos y gruñidos procedurales.
}

/**
 * Desconecta los nodos de una voz cuando su fuente termina, para liberar el grafo de audio.
 * @param {AudioScheduledSourceNode} source
 * @param {AudioNode[]} nodes
 */
function disconnectOnEnd(source, nodes) {
    source.onended = () => {
        for (const n of nodes) {
            try { n.disconnect(); } catch { /* ya desconectado */ }
        }
    };
}

export class VoiceTTS {
    constructor() {
        // Asegurar que cualquier síntesis TTS del navegador quede silenciada
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (_) {}
        }

        /** @type {AudioContext|null} */
        this.ctx = null;
        /** @type {GainNode|null} */
        this.masterGain = null;
        /** @type {AudioBuffer|null} */
        this.noiseBuffer = null;

        this.enabled = true;
        this.volume = 0.52;

        // Control de enfriamiento para evitar solapamiento excesivo de gritos
        this.lastHeroVocalTime = 0;
        this.lastMonsterHurtTime = 0;

        this._bindEvents();
    }

    ensureContext() {
        if (!this.enabled) return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            this._createNoiseBuffer();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    _createNoiseBuffer() {
        if (!this.ctx) return;
        const sr = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, sr, sr);
        const data = this.noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < sr; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.99 * b0 + w * 0.08;
            b1 = 0.96 * b1 + w * 0.15;
            b2 = 0.85 * b2 + w * 0.30;
            data[i] = (b0 + b1 + b2 + w * 0.25) * 0.15;
        }
    }

    _bindEvents() {
        eventBus.on(EVENTS.VOICE_TOGGLE, () => {
            this.toggle();
        });

        // 1. VOCALIZACIONES LÓGICAS DEL HÉROE
        // Grito de guerra inicial al entrar a la mazmorra
        eventBus.on(EVENTS.GAME_START, ({ heroId }) => {
            this.playHeroWarCry(heroId || 'barbarian');
        });

        // Gruñido de esfuerzo al atacar (con probabilidad lógica para no saturar cada click)
        eventBus.on(EVENTS.PLAYER_ATTACK, () => {
            const nowMs = performance.now();
            if (nowMs - this.lastHeroVocalTime > 950 && Math.random() < 0.42) {
                this.lastHeroVocalTime = nowMs;
                const heroId = window.heroQuestApp?.player?.heroId || 'barbarian';
                this.playHeroAttackGrunt(heroId);
            }
        });

        // Grito potente al activar Habilidad Especial de Clase (Click Derecho / Q)
        eventBus.on(EVENTS.PLAYER_SKILL, ({ heroId }) => {
            this.lastHeroVocalTime = performance.now();
            this.playHeroWarCry(heroId || 'barbarian');
        });

        // Esfuerzo corto al saltar
        eventBus.on(EVENTS.PLAYER_JUMP, () => {
            const heroId = window.heroQuestApp?.player?.heroId || 'barbarian';
            this.playHeroJumpGrunt(heroId);
        });

        // Quejido / grito de dolor cuando el héroe recibe daño
        eventBus.on(EVENTS.PLAYER_DAMAGED, () => {
            this.lastHeroVocalTime = performance.now();
            const heroId = window.heroQuestApp?.player?.heroId || 'barbarian';
            this.playHeroHurtCry(heroId);
        });

        // Grito agónico al caer derrotado
        eventBus.on(EVENTS.GAME_DEFEAT, ({ player } = {}) => {
            this.playHeroDeathScream(player?.heroId || 'barbarian');
        });

        // Exclamación breve de satisfacción ("¡Ja!") al abrir un cofre
        eventBus.on(EVENTS.CHEST_OPENED, () => {
            const heroId = window.heroQuestApp?.player?.heroId || 'barbarian';
            this.playHeroLaugh(heroId);
        });

        // 2. GRITOS Y GRUÑIDOS LÓGICOS DE LOS MONSTRUOS
        // Rugido / alarido de alerta al detectar al héroe
        eventBus.on(EVENTS.MONSTER_ALERTED, ({ monster } = {}) => {
            this.playMonsterAlertScream(monster?.type || 'orc');
        });

        // Gruñido amenazante cuando el monstruo está cerca y visible
        eventBus.on(EVENTS.MONSTER_GROWL, ({ type, distance = 120 } = {}) => {
            const atten = Math.max(0.25, Math.min(1.0, 1 - (distance - 50) / 260));
            this.playMonsterIdleGrowl(type || 'orc', atten);
        });

        // Gruñido feroz de embestida cuando el monstruo golpea
        eventBus.on(EVENTS.MONSTER_ATTACK, ({ monster } = {}) => {
            this.playMonsterAttackSnarl(monster?.type || 'orc');
        });

        // Gruñido de dolor cuando el monstruo recibe un golpe
        eventBus.on(EVENTS.MONSTER_DAMAGED, ({ monster } = {}) => {
            const nowMs = performance.now();
            if (nowMs - this.lastMonsterHurtTime > 260) {
                this.lastMonsterHurtTime = nowMs;
                this.playMonsterHurtGrunt(monster?.type || 'orc');
            }
        });

        // Alarido / rugido de muerte cuando el monstruo es abatido
        eventBus.on(EVENTS.MONSTER_KILLED, ({ monster } = {}) => {
            this.playMonsterDeathScream(monster?.type || 'orc');
        });
    }

    toggle() {
        this.enabled = !this.enabled;
        eventBus.emit(EVENTS.VOICE_STATE, { enabled: this.enabled });
        return this.enabled;
    }

    /**
     * Devuelve la frecuencia fundamental de cuerdas vocales según la clase de héroe.
     */
    _getHeroPitch(heroId) {
        switch (heroId) {
            case 'barbarian': return 105; // Voz profunda y potente
            case 'dwarf':     return 96;  // Voz grave y rasposa
            case 'wizard':    return 118; // Voz solemne
            case 'elf':       return 138; // Voz ágil y aguda
            default:          return 108;
        }
    }

    /**
     * Gruñido corto de esfuerzo al atacar con arma ("¡Hmph!" / "¡Hah!").
     */
    playHeroAttackGrunt(heroId) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const f0 = this._getHeroPitch(heroId);

        this._synthFormantVoice({
            startTime: now,
            duration: 0.16,
            fStart: f0 * 1.15,
            fPeak: f0 * 1.30,
            fEnd: f0 * 0.85,
            f1: 620,
            f2: 1150,
            roughnessHz: 28,
            roughnessDepth: 12,
            breathGain: 0.18,
            voiceGain: 0.42
        });
    }

    /**
     * Esfuerzo corto al saltar ("¡Hup!").
     */
    playHeroJumpGrunt(heroId) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const f0 = this._getHeroPitch(heroId);

        this._synthFormantVoice({
            startTime: now,
            duration: 0.12,
            fStart: f0 * 0.95,
            fPeak: f0 * 1.35,
            fEnd: f0 * 1.20,
            f1: 520,
            f2: 1020,
            roughnessHz: 20,
            roughnessDepth: 6,
            breathGain: 0.14,
            voiceGain: 0.30
        });
    }

    /**
     * Grito de guerra heroico al usar Habilidad Especial o entrar en combate ("¡RAAAAH!").
     */
    playHeroWarCry(heroId) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const f0 = this._getHeroPitch(heroId);

        this._synthFormantVoice({
            startTime: now,
            duration: 0.52,
            fStart: f0 * 1.1,
            fPeak: f0 * 1.48,
            fEnd: f0 * 0.92,
            f1: 760,
            f2: 1280,
            roughnessHz: 32,
            roughnessDepth: 22,
            breathGain: 0.25,
            voiceGain: 0.55
        });
    }

    /**
     * Quejido visceral cuando el héroe recibe un golpe ("¡Ugh!").
     */
    playHeroHurtCry(heroId) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const f0 = this._getHeroPitch(heroId);

        this._synthFormantVoice({
            startTime: now,
            duration: 0.26,
            fStart: f0 * 1.25,
            fPeak: f0 * 1.05,
            fEnd: f0 * 0.72,
            f1: 540,
            f2: 980,
            roughnessHz: 36,
            roughnessDepth: 26,
            breathGain: 0.22,
            voiceGain: 0.52
        });
    }

    /**
     * Grito de caída cuando el héroe muere ("¡AAAAARGH!").
     */
    playHeroDeathScream(heroId) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const f0 = this._getHeroPitch(heroId);

        this._synthFormantVoice({
            startTime: now,
            duration: 0.85,
            fStart: f0 * 1.4,
            fPeak: f0 * 1.2,
            fEnd: f0 * 0.52,
            f1: 720,
            f2: 1180,
            roughnessHz: 28,
            roughnessDepth: 30,
            breathGain: 0.28,
            voiceGain: 0.58
        });
    }

    /**
     * Exclamación corta de satisfacción al abrir un cofre ("¡Ja!").
     */
    playHeroLaugh(heroId) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const f0 = this._getHeroPitch(heroId);

        this._synthFormantVoice({
            startTime: now,
            duration: 0.14,
            fStart: f0 * 1.25,
            fPeak: f0 * 1.35,
            fEnd: f0 * 0.95,
            f1: 700,
            f2: 1220,
            roughnessHz: 24,
            roughnessDepth: 10,
            breathGain: 0.15,
            voiceGain: 0.35
        });
    }

    /**
     * Gruñido de proximidad cuando un monstruo está cerca y visible.
     */
    playMonsterIdleGrowl(monsterType, atten = 0.8) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (monsterType === 'goblin') {
            // Gruñido / risita rasposa aguda de Goblin
            this._synthFormantVoice({
                startTime: now,
                duration: 0.32,
                fStart: 210,
                fPeak: 265,
                fEnd: 155,
                f1: 480,
                f2: 1950,
                roughnessHz: 42,
                roughnessDepth: 48,
                breathGain: 0.22 * atten,
                voiceGain: 0.36 * atten
            });
        } else if (monsterType === 'skeleton') {
            // Siseo sepulcral + crujido de huesos
            this._synthFormantVoice({
                startTime: now,
                duration: 0.34,
                fStart: 135,
                fPeak: 115,
                fEnd: 85,
                f1: 420,
                f2: 1650,
                roughnessHz: 55,
                roughnessDepth: 45,
                breathGain: 0.34 * atten,
                voiceGain: 0.22 * atten
            });
        } else if (monsterType === 'fimir') {
            // Bramido reptiliano profundo de ciénaga
            this._synthFormantVoice({
                startTime: now,
                duration: 0.52,
                fStart: 64,
                fPeak: 82,
                fEnd: 42,
                f1: 360,
                f2: 780,
                roughnessHz: 22,
                roughnessDepth: 28,
                breathGain: 0.24 * atten,
                voiceGain: 0.45 * atten
            });
        } else if (monsterType === 'gargoyle') {
            // Rugido abisal de piedra viviente
            this._synthFormantVoice({
                startTime: now,
                duration: 0.68,
                fStart: 50,
                fPeak: 68,
                fEnd: 32,
                f1: 310,
                f2: 680,
                roughnessHz: 18,
                roughnessDepth: 32,
                breathGain: 0.32 * atten,
                voiceGain: 0.52 * atten
            });
        } else {
            // Orco: Gruñido gutural grave de pecho
            this._synthFormantVoice({
                startTime: now,
                duration: 0.42,
                fStart: 80,
                fPeak: 102,
                fEnd: 54,
                f1: 420,
                f2: 860,
                roughnessHz: 26,
                roughnessDepth: 30,
                breathGain: 0.24 * atten,
                voiceGain: 0.44 * atten
            });
        }
    }

    /**
     * Rugido / alarido agresivo cuando el monstruo descubre al jugador.
     */
    playMonsterAlertScream(monsterType) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (monsterType === 'goblin') {
            // Chillido agudo de ataque Goblin ("¡KIEEEH!")
            this._synthFormantVoice({
                startTime: now,
                duration: 0.38,
                fStart: 250,
                fPeak: 380,
                fEnd: 190,
                f1: 580,
                f2: 2250,
                roughnessHz: 46,
                roughnessDepth: 60,
                breathGain: 0.28,
                voiceGain: 0.46
            });
        } else if (monsterType === 'gargoyle') {
            // Rugido colosal de Jefe Gárgola
            this._synthFormantVoice({
                startTime: now,
                duration: 0.82,
                fStart: 58,
                fPeak: 95,
                fEnd: 35,
                f1: 380,
                f2: 820,
                roughnessHz: 20,
                roughnessDepth: 42,
                breathGain: 0.38,
                voiceGain: 0.62
            });
        } else if (monsterType === 'fimir') {
            this._synthFormantVoice({
                startTime: now,
                duration: 0.58,
                fStart: 72,
                fPeak: 112,
                fEnd: 46,
                f1: 410,
                f2: 890,
                roughnessHz: 24,
                roughnessDepth: 36,
                breathGain: 0.30,
                voiceGain: 0.52
            });
        } else {
            // Orco / Esqueleto: Rugido de guerra ("¡GRAAAGH!")
            this._synthFormantVoice({
                startTime: now,
                duration: 0.48,
                fStart: 92,
                fPeak: 138,
                fEnd: 62,
                f1: 520,
                f2: 980,
                roughnessHz: 30,
                roughnessDepth: 38,
                breathGain: 0.28,
                voiceGain: 0.50
            });
        }
    }

    /**
     * Gruñido corto y feroz cuando el monstruo lanza su golpe.
     */
    playMonsterAttackSnarl(monsterType) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const isGoblin = monsterType === 'goblin';
        this._synthFormantVoice({
            startTime: now,
            duration: 0.22,
            fStart: isGoblin ? 240 : 95,
            fPeak: isGoblin ? 310 : 128,
            fEnd: isGoblin ? 160 : 58,
            f1: isGoblin ? 540 : 460,
            f2: isGoblin ? 1900 : 920,
            roughnessHz: 35,
            roughnessDepth: 34,
            breathGain: 0.22,
            voiceGain: 0.40
        });
    }

    /**
     * Gruñido de dolor cuando el monstruo recibe daño.
     */
    playMonsterHurtGrunt(monsterType) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const isGoblin = monsterType === 'goblin';
        const isBoss = monsterType === 'gargoyle';
        this._synthFormantVoice({
            startTime: now,
            duration: 0.19,
            fStart: isGoblin ? 280 : (isBoss ? 68 : 108),
            fPeak: isGoblin ? 220 : (isBoss ? 54 : 86),
            fEnd: isGoblin ? 140 : (isBoss ? 36 : 52),
            f1: isGoblin ? 520 : 440,
            f2: isGoblin ? 1750 : 880,
            roughnessHz: 38,
            roughnessDepth: 32,
            breathGain: 0.20,
            voiceGain: 0.38
        });
    }

    /**
     * Grito / rugido agónico cuando el monstruo muere.
     */
    playMonsterDeathScream(monsterType) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const isGoblin = monsterType === 'goblin';
        const isBoss = monsterType === 'gargoyle';
        this._synthFormantVoice({
            startTime: now,
            duration: isBoss ? 0.95 : 0.48,
            fStart: isGoblin ? 320 : (isBoss ? 82 : 120),
            fPeak: isGoblin ? 260 : (isBoss ? 64 : 96),
            fEnd: isGoblin ? 95 : (isBoss ? 24 : 36),
            f1: isGoblin ? 580 : 480,
            f2: isGoblin ? 1850 : 920,
            roughnessHz: 30,
            roughnessDepth: 42,
            breathGain: 0.30,
            voiceGain: isBoss ? 0.62 : 0.46
        });
    }

    /**
     * Motor de tracto vocal por formantes (F1 + F2 en paralelo) con modulación de aspereza glotal y aspiración.
     */
    _synthFormantVoice({
        startTime,
        duration,
        fStart,
        fPeak,
        fEnd,
        f1,
        f2,
        roughnessHz = 28,
        roughnessDepth = 24,
        breathGain = 0.2,
        voiceGain = 0.45
    }) {
        if (!this.ctx || !this.masterGain) return;

        // Oscilador glotal diente de sierra + modulador de aspereza (gruñido)
        const glottal = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();

        glottal.type = 'sawtooth';
        glottal.frequency.setValueAtTime(Math.max(22, fStart), startTime);
        glottal.frequency.linearRampToValueAtTime(Math.max(22, fPeak), startTime + duration * 0.28);
        glottal.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), startTime + duration);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(roughnessHz, startTime);
        modGain.gain.setValueAtTime(roughnessDepth, startTime);

        mod.connect(modGain);
        modGain.connect(glottal.frequency);

        // Dos cavidades de formantes vocales en paralelo (F1 garganta, F2 cavidad bucal)
        const filterF1 = this.ctx.createBiquadFilter();
        filterF1.type = 'bandpass';
        filterF1.Q.value = 4.2;
        filterF1.frequency.setValueAtTime(f1, startTime);
        filterF1.frequency.exponentialRampToValueAtTime(Math.max(180, f1 * 0.72), startTime + duration);

        const filterF2 = this.ctx.createBiquadFilter();
        filterF2.type = 'bandpass';
        filterF2.Q.value = 5.0;
        filterF2.frequency.setValueAtTime(f2, startTime);
        filterF2.frequency.exponentialRampToValueAtTime(Math.max(320, f2 * 0.78), startTime + duration);

        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.001, startTime);
        env.gain.linearRampToValueAtTime(voiceGain, startTime + Math.min(0.03, duration * 0.18));
        env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        glottal.connect(filterF1);
        glottal.connect(filterF2);
        filterF1.connect(env);
        filterF2.connect(env);

        // Componente de aire / rugido gutural (ruido filtrado)
        if (this.noiseBuffer && breathGain > 0) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.Q.value = 2.0;
            noiseFilter.frequency.setValueAtTime((f1 + f2) * 0.5, startTime);

            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.001, startTime);
            nGain.gain.linearRampToValueAtTime(breathGain, startTime + Math.min(0.025, duration * 0.2));
            nGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            noise.connect(noiseFilter);
            noiseFilter.connect(nGain);
            nGain.connect(this.masterGain);

            noise.start(startTime);
            noise.stop(startTime + duration + 0.02);
            disconnectOnEnd(noise, [noise, noiseFilter, nGain]);
        }

        env.connect(this.masterGain);

        mod.start(startTime);
        glottal.start(startTime);
        mod.stop(startTime + duration + 0.02);
        glottal.stop(startTime + duration + 0.02);
        disconnectOnEnd(glottal, [mod, modGain, glottal, filterF1, filterF2, env]);
    }
}

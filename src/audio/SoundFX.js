/**
 * @fileoverview Sintetizador Web Audio API procedural (osciladores + buffers de ruido blanco y rosa),
 * incluyendo síntesis de gruñidos guturales por arquetipo de monstruo y resonancia oscura de narrador.
 * Cero activos externos. Capa 2: Depende de constants.js y EventBus.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';

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

export class SoundFX {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
        /** @type {GainNode|null} */
        this.masterGain = null;
        /** @type {AudioBuffer|null} */
        this.whiteNoiseBuffer = null;
        /** @type {AudioBuffer|null} */
        this.pinkNoiseBuffer = null;

        this.enabled = true;
        this.volume = 0.44;

        this._bindEvents();
    }

    /**
     * Inicializa o reanuda el AudioContext bajo demanda tras interacción del usuario.
     * @returns {AudioContext|null}
     */
    ensureContext() {
        if (!this.enabled) return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            this._createNoiseBuffers();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    /**
     * Genera buffers procedurales de ruido blanco y ruido rosa (1 segundo).
     */
    _createNoiseBuffers() {
        if (!this.ctx) return;
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 1.0;

        // Ruido blanco
        this.whiteNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
        const whiteData = this.whiteNoiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            whiteData[i] = Math.random() * 2 - 1;
        }

        // Ruido rosa (filtro Paul Kellet)
        this.pinkNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
        const pinkData = this.pinkNoiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
            b6 = white * 0.115926;
        }
    }

    _bindEvents() {
        eventBus.on(EVENTS.SFX_PLAY, ({ type, options }) => this.play(type, options));
        eventBus.on(EVENTS.PLAYER_ATTACK, () => this.play('slash'));
        eventBus.on(EVENTS.PLAYER_SKILL, () => this.play('skill'));
        eventBus.on(EVENTS.PLAYER_JUMP, () => this.play('jump'));
        eventBus.on(EVENTS.PLAYER_DASH, () => this.play('dash'));
        eventBus.on(EVENTS.PLAYER_BLOCK, () => this.play('block'));
        eventBus.on(EVENTS.PLAYER_STEP, () => this.play('step'));
        eventBus.on(EVENTS.PLAYER_DAMAGED, () => this.play('player_hurt'));
        eventBus.on(EVENTS.PLAYER_HEALED, () => this.play('potion'));
        eventBus.on(EVENTS.MONSTER_DAMAGED, ({ crit } = {}) => this.play(crit ? 'hit_crit' : 'hit'));
        eventBus.on(EVENTS.MONSTER_KILLED, ({ isBoss } = {}) => this.play(isBoss ? 'boss_death' : 'monster_death'));
        eventBus.on(EVENTS.MONSTER_ALERTED, () => this.play('alert'));
        eventBus.on(EVENTS.DOOR_OPENED, () => this.play('door'));
        eventBus.on(EVENTS.TRAP_TRIGGERED, () => this.play('trap_trigger'));
        eventBus.on(EVENTS.TRAP_DISARMED, () => this.play('trap_disarm'));
        eventBus.on(EVENTS.CHEST_OPENED, () => this.play('chest'));
        eventBus.on(EVENTS.FURNITURE_INSPECTED, () => this.play('inspect'));
        eventBus.on(EVENTS.LOOT_COLLECTED, ({ kind } = {}) => {
            if (kind === 'potion') this.play('potion');
            else this.play('coin');
        });
        eventBus.on(EVENTS.SHOP_PURCHASE, () => this.play('purchase'));
        eventBus.on(EVENTS.PLAYER_SECOND_SKILL, () => this.play('skill'));
        eventBus.on(EVENTS.HERO_RESCUED, () => this.play('victory'));
        eventBus.on(EVENTS.QUEST_COMPLETED, () => this.play('victory'));
        eventBus.on(EVENTS.GAME_VICTORY, () => this.play('victory'));
        eventBus.on(EVENTS.GAME_DEFEAT, () => this.play('defeat'));
    }

    /**
     * Reproduce un tono simple bajo demanda.
     */
    playTone(freq = 440, duration = 0.14, waveType = 'triangle', gainVal = 0.22) {
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;
        this._playTone(ctx.currentTime, waveType, freq, freq, duration, gainVal);
    }

    /**
     * Reproduce un efecto de sonido sintetizado.
     * @param {string} type
     * @param {Object} [options]
     */
    play(type, options = {}) {
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        const now = ctx.currentTime;

        switch (type) {
            case 'slash':
                this._playNoiseBurst(now, 0.14, 'white', 950, 2400, 0.35);
                this._playTone(now, 'triangle', 320, 110, 0.13, 0.25);
                break;

            case 'skill':
                this._playNoiseBurst(now, 0.35, 'pink', 300, 1600, 0.55);
                this._playTone(now, 'sawtooth', 180, 55, 0.38, 0.38);
                this._playTone(now + 0.04, 'sine', 520, 240, 0.32, 0.3);
                break;

            case 'hit':
                this._playNoiseBurst(now, 0.11, 'pink', 400, 900, 0.45);
                this._playTone(now, 'square', 150, 52, 0.11, 0.32);
                break;

            case 'hit_crit':
                this._playNoiseBurst(now, 0.18, 'white', 1200, 2800, 0.5);
                this._playTone(now, 'sawtooth', 440, 110, 0.18, 0.4);
                this._playTone(now + 0.04, 'triangle', 660, 220, 0.15, 0.35);
                break;

            case 'player_hurt':
                this._playNoiseBurst(now, 0.20, 'pink', 250, 600, 0.5);
                this._playTone(now, 'sawtooth', 140, 48, 0.24, 0.45);
                break;

            case 'monster_death':
                this._playNoiseBurst(now, 0.28, 'pink', 220, 750, 0.48);
                this._playTone(now, 'sawtooth', 160, 36, 0.34, 0.38);
                break;

            case 'boss_death':
                this._playNoiseBurst(now, 0.90, 'pink', 100, 520, 0.75);
                this._playTone(now, 'sawtooth', 110, 24, 0.90, 0.58);
                this._playTone(now + 0.15, 'triangle', 220, 42, 0.75, 0.48);
                break;

            case 'monster_growl':
                this._playMonsterGrowl(now, options.monsterType || 'orc', options.volumeScale ?? 0.85);
                break;

            case 'narrator_presence':
                this._playNarratorPresence(now, options.duration || 1.6);
                break;

            case 'jump':
                this._playTone(now, 'sine', 165, 390, 0.14, 0.22);
                break;

            case 'dash':
                this._playNoiseBurst(now, 0.16, 'white', 600, 1800, 0.32);
                this._playTone(now, 'sine', 280, 140, 0.14, 0.18);
                break;

            case 'block':
                // Clang metálico de escudo resistente estilo Zelda
                this._playTone(now, 'triangle', 720, 360, 0.18, 0.42);
                this._playTone(now, 'sawtooth', 420, 180, 0.14, 0.30);
                this._playNoiseBurst(now, 0.10, 'white', 900, 3600, 0.36);
                break;

            case 'step':
                this._playNoiseBurst(now, 0.045, 'pink', 180, 450, 0.14);
                break;

            case 'door':
                this._playTone(now, 'sawtooth', 85, 130, 0.28, 0.24);
                this._playNoiseBurst(now + 0.05, 0.30, 'pink', 140, 450, 0.38);
                this._playTone(now + 0.24, 'triangle', 72, 38, 0.18, 0.36);
                break;

            case 'trap_trigger':
                // Resorte metálico + derrumbe / pinchos
                this._playNoiseBurst(now, 0.32, 'white', 450, 2200, 0.55);
                this._playTone(now, 'sawtooth', 260, 48, 0.34, 0.48);
                break;

            case 'trap_disarm':
                // Clic mecánico de herramientas de enano
                this._playTone(now, 'triangle', 620, 880, 0.08, 0.28);
                this._playTone(now + 0.09, 'triangle', 880, 1174, 0.12, 0.30);
                break;

            case 'chest':
                this._playTone(now, 'triangle', 440, 440, 0.09, 0.28);
                this._playTone(now + 0.09, 'triangle', 554.37, 554.37, 0.09, 0.28);
                this._playTone(now + 0.18, 'triangle', 659.25, 659.25, 0.12, 0.30);
                this._playTone(now + 0.30, 'triangle', 880, 880, 0.28, 0.35);
                break;

            case 'inspect':
                this._playNoiseBurst(now, 0.12, 'pink', 350, 950, 0.26);
                this._playTone(now + 0.08, 'sine', 523.25, 659.25, 0.16, 0.25);
                break;

            case 'coin':
                this._playTone(now, 'sine', 987.77, 987.77, 0.07, 0.26);
                this._playTone(now + 0.065, 'sine', 1318.51, 1318.51, 0.18, 0.30);
                break;

            case 'potion':
                this._playTone(now, 'sine', 392.0, 523.25, 0.12, 0.25);
                this._playTone(now + 0.10, 'sine', 523.25, 659.25, 0.12, 0.25);
                this._playTone(now + 0.20, 'sine', 659.25, 783.99, 0.22, 0.28);
                break;

            case 'purchase':
                this._playTone(now, 'triangle', 587.33, 587.33, 0.08, 0.30);
                this._playTone(now + 0.08, 'triangle', 880.0, 880.0, 0.22, 0.32);
                this._playNoiseBurst(now + 0.04, 0.10, 'white', 1800, 3500, 0.2);
                break;

            case 'alert':
                this._playTone(now, 'sawtooth', 146.83, 138.59, 0.22, 0.24);
                break;

            case 'victory': {
                const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
                notes.forEach((freq, idx) => {
                    this._playTone(now + idx * 0.11, 'triangle', freq, freq, 0.32, 0.32);
                });
                break;
            }

            case 'defeat': {
                const notes = [293.66, 277.18, 261.63, 220.00];
                notes.forEach((freq, idx) => {
                    this._playTone(now + idx * 0.22, 'sawtooth', freq, freq * 0.96, 0.40, 0.28);
                });
                break;
            }

            default:
                break;
        }
    }

    /**
     * Sintetiza un gruñido gutural específico según la especie del monstruo mediante modulación FM y formantes.
     * @param {number} startTime
     * @param {string} monsterType
     * @param {number} volScale
     */
    _playMonsterGrowl(startTime, monsterType, volScale = 0.85) {
        if (!this.ctx || !this.masterGain) return;

        const v = Math.max(0.15, Math.min(1.0, volScale));

        if (monsterType === 'goblin') {
            // Gruñido / rasgueo gutural agudo de Goblin
            this._playGrowlVoice(startTime, 175, 240, 125, 0.36, 34, 650, 0.34 * v);
            this._playNoiseBurst(startTime, 0.28, 'pink', 550, 1350, 0.26 * v);
        } else if (monsterType === 'skeleton') {
            // Siseo sepulcral y castañeteo de huesos
            this._playNoiseBurst(startTime, 0.34, 'white', 900, 380, 0.26 * v);
            this._playTone(startTime + 0.02, 'square', 420, 180, 0.045, 0.25 * v);
            this._playTone(startTime + 0.09, 'square', 390, 160, 0.045, 0.25 * v);
            this._playTone(startTime + 0.16, 'square', 450, 170, 0.05, 0.22 * v);
        } else if (monsterType === 'fimir') {
            // Bramido reptiliano profundo de ciénaga
            this._playGrowlVoice(startTime, 68, 92, 42, 0.58, 22, 320, 0.46 * v);
            this._playNoiseBurst(startTime + 0.04, 0.48, 'pink', 160, 420, 0.34 * v);
        } else if (monsterType === 'gargoyle') {
            // Rugido demoníaco abisal de piedra viviente
            this._playGrowlVoice(startTime, 52, 74, 30, 0.75, 18, 280, 0.56 * v);
            this._playGrowlVoice(startTime + 0.03, 78, 104, 45, 0.70, 25, 390, 0.38 * v);
            this._playNoiseBurst(startTime, 0.68, 'pink', 110, 350, 0.45 * v);
        } else {
            // Orco (por defecto): Gruñido gutural grave de pecho
            this._playGrowlVoice(startTime, 86, 118, 52, 0.46, 26, 380, 0.44 * v);
            this._playNoiseBurst(startTime + 0.02, 0.38, 'pink', 190, 480, 0.32 * v);
        }
    }

    /**
     * Oscilador portador diente de sierra modulado en frecuencia (FM rugosa) y filtrado por formante grave.
     */
    _playGrowlVoice(startTime, fStart, fPeak, fEnd, duration, modHz, filterCutoff, peakGain) {
        if (!this.ctx || !this.masterGain) return;

        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(fStart, startTime);
        carrier.frequency.linearRampToValueAtTime(fPeak, startTime + duration * 0.35);
        carrier.frequency.exponentialRampToValueAtTime(Math.max(24, fEnd), startTime + duration);

        // Modulador de aspereza gutural
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(modHz, startTime);
        modGain.gain.setValueAtTime(fStart * 0.38, startTime);

        filter.type = 'lowpass';
        filter.Q.value = 3.2;
        filter.frequency.setValueAtTime(filterCutoff, startTime);
        filter.frequency.exponentialRampToValueAtTime(Math.max(90, filterCutoff * 0.45), startTime + duration);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + duration * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        carrier.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        modulator.start(startTime);
        carrier.start(startTime);
        modulator.stop(startTime + duration + 0.02);
        carrier.stop(startTime + duration + 0.02);
        disconnectOnEnd(carrier, [modulator, modGain, carrier, filter, gain]);
    }

    /**
     * Resonancia sub-grave oscura para dar peso e intimidación a la voz en off de Mentor.
     */
    _playNarratorPresence(startTime, duration) {
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55.0, startTime); // A1 sub-bass
        osc.frequency.linearRampToValueAtTime(49.0, startTime + duration);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(135, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.16, startTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.04);
        disconnectOnEnd(osc, [osc, filter, gain]);
    }

    /**
     * Genera un tono con envolvente ADSR rápida y barrido de frecuencia.
     */
    _playTone(startTime, waveType, startFreq, endFreq, duration, gainVal) {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
        if (startFreq !== endFreq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
        }

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(gainVal, startTime + Math.min(0.015, duration * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.02);
        disconnectOnEnd(osc, [osc, gain]);
    }

    /**
     * Genera una ráfaga de ruido blanco o rosa pasada por un filtro paso-banda dinámico.
     */
    _playNoiseBurst(startTime, duration, noiseType, startCut, endCut, gainVal) {
        if (!this.ctx || !this.masterGain) return;
        const buffer = noiseType === 'pink' ? this.pinkNoiseBuffer : this.whiteNoiseBuffer;
        if (!buffer) return;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.6;
        filter.frequency.setValueAtTime(Math.max(40, startCut), startTime);
        if (startCut !== endCut) {
            filter.frequency.exponentialRampToValueAtTime(Math.max(40, endCut), startTime + duration);
        }

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(gainVal, startTime + Math.min(0.015, duration * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(startTime);
        source.stop(startTime + duration + 0.02);
        disconnectOnEnd(source, [source, filter, gain]);
    }
}

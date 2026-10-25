/**
 * @fileoverview Secuenciador musical procedural dual:
 * 1) Modo Mazmorra: Dark Dungeon Synth de 3 pistas (Frigio/Locrio con tritono, drones y campana fúnebre).
 * 2) Modo Bosque Exterior (Mundo Libre): Forest Adventure Synth estilo Zelda clásico (Dórico/Heroico con arpa y flauta).
 * Capa 2: Depende de constants.js y EventBus.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';

export class DungeonSynth {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
        /** @type {GainNode|null} */
        this.masterGain = null;

        this.isPlaying = false;
        this.inCombat = false;
        this.isOverworld = false;

        this.exploreBpm = 66;
        this.overworldBpm = 94;
        this.combatBpm = 116;
        this.stepIndex = 0;
        this.timerId = null;

        // === PATRONES DE MAZMORRA (Re Frigio / Locrio Oscuro) ===
        this.bassPattern = [
            36.71, 36.71, 36.71, 36.71,
            38.89, 38.89, 38.89, 38.89,
            51.91, 51.91, 41.20, 41.20,
            36.71, 36.71, 34.65, 34.65
        ];

        this.arpPattern = [
            146.83, 155.56, 207.65, 146.83,
            155.56, 174.61, 233.08, 155.56,
            207.65, 174.61, 138.59, 146.83,
            138.59, 155.56, 110.00, 73.42
        ];

        this.leadPattern = [
            293.66, 0,      311.13, 0,
            415.30, 349.23, 311.13, 0,
            0,      277.18, 293.66, 0,
            233.08, 207.65, 155.56, 0
        ];

        // === PATRONES DEL BOSQUE EXTERIOR (Sol Mayor / Re Dórico Heroico estilo Zelda) ===
        this.forestBassPattern = [
            49.00, 49.00, 73.42, 49.00,  // G1 - D2
            65.41, 65.41, 49.00, 65.41,  // C2 - G1
            58.27, 58.27, 65.41, 65.41,  // Bb1 - C2
            73.42, 73.42, 49.00, 49.00   // D2 - G1
        ];

        this.forestArpPattern = [
            196.00, 246.94, 293.66, 392.00, // G3 - B3 - D4 - G4
            261.63, 329.63, 392.00, 329.63, // C4 - E4 - G4 - E4
            233.08, 293.66, 349.23, 293.66, // Bb3 - D4 - F4 - D4
            293.66, 369.99, 440.00, 293.66  // D4 - F#4 - A4 - D4
        ];

        this.forestLeadPattern = [
            392.00, 0,      293.66, 392.00, // G4 ... D4 - G4
            440.00, 493.88, 523.25, 0,      // A4 - B4 - C5
            493.88, 440.00, 392.00, 0,      // B4 - A4 - G4
            329.63, 369.99, 392.00, 0       // E4 - F#4 - G4
        ];

        this._bindEvents();
    }

    _bindEvents() {
        eventBus.on(EVENTS.MUSIC_TOGGLE, () => {
            this.toggle();
        });

        eventBus.on(EVENTS.COMBAT_STATE_CHANGED, ({ inCombat }) => {
            this.setCombatMode(Boolean(inCombat));
        });

        eventBus.on(EVENTS.ZONE_CHANGED, ({ isOverworld }) => {
            this.isOverworld = Boolean(isOverworld);
            this.stepIndex = 0;
            eventBus.emit(EVENTS.MUSIC_STATE, {
                playing: this.isPlaying,
                inCombat: this.inCombat,
                isOverworld: this.isOverworld
            });
        });

        eventBus.on(EVENTS.GAME_VICTORY, () => {
            this.stop();
        });

        eventBus.on(EVENTS.GAME_DEFEAT, () => {
            this.stop();
        });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.24;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    start() {
        if (this.isPlaying) return;
        const ctx = this.ensureContext();
        if (!ctx) return;

        this.isPlaying = true;
        this.stepIndex = 0;
        eventBus.emit(EVENTS.MUSIC_STATE, {
            playing: this.isPlaying,
            inCombat: this.inCombat,
            isOverworld: this.isOverworld
        });
        this._scheduleNextStep();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        eventBus.emit(EVENTS.MUSIC_STATE, {
            playing: false,
            inCombat: this.inCombat,
            isOverworld: this.isOverworld
        });
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
        return this.isPlaying;
    }

    setCombatMode(inCombat) {
        if (this.inCombat === inCombat) return;
        this.inCombat = inCombat;
        eventBus.emit(EVENTS.MUSIC_STATE, {
            playing: this.isPlaying,
            inCombat: this.inCombat,
            isOverworld: this.isOverworld
        });
    }

    _scheduleNextStep() {
        if (!this.isPlaying) return;

        let bpm = this.exploreBpm;
        if (this.inCombat) {
            bpm = this.combatBpm;
        } else if (this.isOverworld) {
            bpm = this.overworldBpm;
        }

        const stepDurationSec = (60 / bpm) * 0.5;

        this._playStep(this.stepIndex, stepDurationSec);
        this.stepIndex = (this.stepIndex + 1) % 16;

        this.timerId = setTimeout(() => {
            this._scheduleNextStep();
        }, stepDurationSec * 1000);
    }

    _playStep(step, stepDur) {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;

        if (this.isOverworld && !this.inCombat) {
            // === MÚSICA DEL BOSQUE DE LORETOME (AVENTURA ZELDA CLÁSICO) ===
            if (step % 2 === 0) {
                const bassFreq = this.forestBassPattern[step];
                this._synthDarkDrone(now, bassFreq, stepDur * 1.9, 0.18);
            }
            const arpFreq = this.forestArpPattern[step];
            this._synthEeriePluck(now, arpFreq, stepDur * 0.85, 0.14);

            const leadFreq = this.forestLeadPattern[step];
            if (leadFreq > 0) {
                this._synthGhostlyLead(now, leadFreq, stepDur * 1.6, 0.14);
            }
            if (step % 4 === 0) {
                this._synthDoomDrum(now, 88, 0.16);
            }
            return;
        }

        // === MÚSICA DE MAZMORRA / COMBATE ===
        if (step % 2 === 0 || this.inCombat) {
            const bassFreq = this.bassPattern[step];
            const dur = stepDur * (this.inCombat ? 1.3 : 2.5);
            this._synthDarkDrone(now, bassFreq, dur, this.inCombat ? 0.26 : 0.22);
        }

        if (step === 0 || (this.inCombat && step === 8)) {
            this._synthFuneralBell(now, step === 0 ? 146.83 : 103.83);
        }

        const arpFreq = this.arpPattern[step];
        const octaveMult = (this.inCombat && step % 3 === 0) ? 1.5 : 1;
        this._synthEeriePluck(now, arpFreq * octaveMult, stepDur * 0.9, 0.14);
        this._synthEeriePluck(now + stepDur * 0.65, arpFreq * octaveMult * 0.997, stepDur * 0.85, 0.055);

        const leadFreq = this.leadPattern[step];
        if (leadFreq > 0) {
            this._synthGhostlyLead(
                now,
                leadFreq * (this.inCombat ? 1.0 : 0.5),
                stepDur * 1.85,
                0.13
            );
        }

        if (this.inCombat) {
            if (step % 2 === 0) {
                this._synthDoomDrum(now, step % 4 === 0 ? 92 : 68, 0.34);
            }
        } else if (step === 0 || step === 3) {
            this._synthDoomDrum(now, step === 0 ? 62 : 52, 0.20);
        }
    }

    _synthDarkDrone(startTime, freq, duration, peakGain) {
        if (!this.ctx || !this.masterGain) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq * 0.995, startTime);
        osc2.frequency.setValueAtTime(freq * 2.006, startTime);

        filter.type = 'lowpass';
        filter.Q.value = 2.4;
        filter.frequency.setValueAtTime(160, startTime);
        filter.frequency.linearRampToValueAtTime(240, startTime + duration * 0.5);
        filter.frequency.linearRampToValueAtTime(130, startTime + duration);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration + 0.03);
        osc2.stop(startTime + duration + 0.03);
    }

    _synthEeriePluck(startTime, freq, duration, peakGain) {
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.linearRampToValueAtTime(freq * 0.992, startTime + duration);

        filter.type = 'bandpass';
        filter.Q.value = 1.8;
        filter.frequency.setValueAtTime(1100, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.02);
    }

    _synthGhostlyLead(startTime, freq, duration, peakGain) {
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = this.isOverworld ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(5.4, startTime);
        lfoGain.gain.setValueAtTime(freq * 0.018, startTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(this.isOverworld ? 1350 : 820, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        lfo.start(startTime);
        osc.start(startTime);
        lfo.stop(startTime + duration + 0.03);
        osc.stop(startTime + duration + 0.03);
    }

    _synthFuneralBell(startTime, baseFreq) {
        if (!this.ctx || !this.masterGain) return;

        const partials = [1.0, 1.414, 2.756];
        partials.forEach((ratio, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const dur = 2.2 / (idx + 1);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * ratio, startTime);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.11 / (idx + 1), startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0008, startTime + dur);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + dur + 0.03);
        });
    }

    _synthDoomDrum(startTime, startFreq, peakGain = 0.28) {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, startTime);
        osc.frequency.exponentialRampToValueAtTime(26, startTime + 0.22);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
    }
}

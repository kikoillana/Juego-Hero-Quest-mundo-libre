/**
 * @fileoverview Bucle principal con cálculo de deltaTime (cap a 0.05s) y máquina de estados del juego.
 * Capa 1: Depende únicamente de constants.js y EventBus.js.
 */

import { GAME_STATE, EVENTS } from '../config/constants.js';
import { eventBus } from './EventBus.js';

export class GameLoop {
    /**
     * @param {(dt: number, state: string, elapsed: number) => void} updateFn
     * @param {(dt: number, state: string, elapsed: number) => void} renderFn
     */
    constructor(updateFn, renderFn) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;

        this.state = GAME_STATE.MENU;
        this.running = false;
        this.rafId = null;
        this.lastTimestamp = 0;
        this.elapsedTime = 0;

        this.fps = 60;
        this._frameCount = 0;
        this._fpsTimer = 0;

        this._tick = this._tick.bind(this);
    }

    /**
     * Cambia el estado de la máquina de estados del juego y notifica al EventBus.
     * @param {string} newState
     */
    setState(newState) {
        if (this.state === newState) return;
        const previous = this.state;
        this.state = newState;
        eventBus.emit(EVENTS.GAME_STATE_CHANGED, { state: newState, previous });
    }

    /**
     * Devuelve el estado actual.
     * @returns {string}
     */
    getState() {
        return this.state;
    }

    /**
     * Inicia el bucle requestAnimationFrame.
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTimestamp = performance.now();
        this.rafId = requestAnimationFrame(this._tick);
    }

    /**
     * Detiene el bucle requestAnimationFrame.
     */
    stop() {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Iteración interna del bucle de juego.
     * @param {number} timestamp
     */
    _tick(timestamp) {
        if (!this.running) return;

        const rawDt = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        // Acotar deltaTime a 0.05s máximo para evitar túneles físicos en pestañas inactivas
        const dt = Math.max(0.0001, Math.min(rawDt, 0.05));
        this.elapsedTime += dt;

        // Cálculo de FPS cada 0.5s
        this._frameCount++;
        this._fpsTimer += dt;
        if (this._fpsTimer >= 0.5) {
            this.fps = Math.round(this._frameCount / this._fpsTimer);
            this._frameCount = 0;
            this._fpsTimer = 0;
        }

        try {
            this.updateFn(dt, this.state, this.elapsedTime);
            this.renderFn(dt, this.state, this.elapsedTime);
        } catch (err) {
            console.error('[GameLoop] Error en ciclo principal:', err);
        }

        this.rafId = requestAnimationFrame(this._tick);
    }
}

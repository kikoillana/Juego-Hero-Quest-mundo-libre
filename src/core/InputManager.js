/**
 * @fileoverview Gestor unificado de entrada para Teclado (WASD/Flechas/Espacio/Shift/E/B/M/V/1-3) y Ratón.
 * Capa 1: Depende de constants.js y EventBus.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from './EventBus.js';

export class InputManager {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;

        /** @type {Set<string>} */
        this.keysDown = new Set();
        /** @type {Set<string>} */
        this.keysPressedThisFrame = new Set();

        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            leftDown: false,
            rightDown: false,
            middleDown: false,
            leftPressed: false,
            rightPressed: false,
            wheelDelta: 0
        };

        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }
            const code = e.code;
            const key = e.key.toLowerCase();

            // Prevenir scroll con flechas, barra espaciadora o recarga accidental con F5
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F5', 'F9'].includes(code)) {
                e.preventDefault();
            }

            if (!this.keysDown.has(code)) {
                this.keysPressedThisFrame.add(code);
                this._handleHotkeys(code, key);
            }
            this.keysDown.add(code);
        });

        window.addEventListener('keyup', (e) => {
            this.keysDown.delete(e.code);
        });

        window.addEventListener('blur', () => {
            this.keysDown.clear();
            this.keysPressedThisFrame.clear();
            this.mouse.leftDown = false;
            this.mouse.rightDown = false;
            this.mouse.middleDown = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;

            if (e.button === 0) {
                this.mouse.leftDown = true;
                this.mouse.leftPressed = true;
            } else if (e.button === 1) {
                e.preventDefault();
                this.mouse.middleDown = true;
            } else if (e.button === 2) {
                this.mouse.rightDown = true;
                this.mouse.rightPressed = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 1) this.mouse.middleDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.mouse.wheelDelta += Math.sign(e.deltaY);
        }, { passive: false });
    }

    /**
     * Dispara eventos discretos para atajos de teclado (E / 0, B, M, V, 1-3, L).
     * @param {string} code
     * @param {string} key
     */
    _handleHotkeys(code, key) {
        if (code === 'KeyE' || code === 'Digit0' || code === 'Numpad0' || key === '0') {
            eventBus.emit(EVENTS.INTERACT_REQUEST);
        } else if (code === 'KeyB') {
            eventBus.emit(EVENTS.TOGGLE_SHOP);
        } else if (code === 'KeyM') {
            eventBus.emit(EVENTS.MUSIC_TOGGLE);
        } else if (code === 'KeyV') {
            eventBus.emit(EVENTS.VOICE_TOGGLE);
        } else if (code === 'KeyL') {
            eventBus.emit(EVENTS.TOGGLE_LORE);
        } else if (code === 'KeyJ' || key === 'j') {
            eventBus.emit(EVENTS.TOGGLE_QUESTS);
        } else if (code === 'KeyP' || code === 'Escape') {
            eventBus.emit(EVENTS.TOGGLE_PAUSE);
        } else if (code === 'KeyG' || key === 'g') {
            eventBus.emit(EVENTS.TOGGLE_SAVE_MODAL);
        } else if (code === 'F5') {
            eventBus.emit(EVENTS.QUICK_SAVE);
        } else if (code === 'F9') {
            eventBus.emit(EVENTS.QUICK_LOAD);
        } else if (code === 'Digit1' || key === '1') {
            eventBus.emit(EVENTS.USE_ITEM_SLOT, { slot: 1 });
        } else if (code === 'Digit2' || key === '2') {
            eventBus.emit(EVENTS.USE_ITEM_SLOT, { slot: 2 });
        } else if (code === 'Digit3' || key === '3') {
            eventBus.emit(EVENTS.USE_ITEM_SLOT, { slot: 3 });
        }
    }

    /**
     * Devuelve el vector de movimiento normalizado en los ejes X e Y.
     * @returns {{ x: number, y: number }}
     */
    getMovementVector() {
        let vx = 0;
        let vy = 0;

        if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) vy -= 1;
        if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) vy += 1;
        if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) vx -= 1;
        if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) vx += 1;

        const len = Math.hypot(vx, vy);
        if (len > 0) {
            vx /= len;
            vy /= len;
        }
        return { x: vx, y: vy };
    }

    isJumpJustPressed() {
        return this.keysPressedThisFrame.has('Space');
    }

    isDashJustPressed() {
        return (
            this.keysPressedThisFrame.has('ShiftLeft') ||
            this.keysPressedThisFrame.has('ShiftRight') ||
            this.mouse.middleDown
        );
    }

    isAttackRequested() {
        return this.mouse.leftPressed || this.mouse.leftDown;
    }

    isSkillJustPressed() {
        return this.mouse.rightPressed || this.keysPressedThisFrame.has('KeyQ');
    }

    isSecondSkillJustPressed() {
        return this.keysPressedThisFrame.has('KeyF');
    }

    /**
     * Actualiza las coordenadas del ratón en el mundo usando la cámara activa.
     * @param {import('./Camera.js').Camera} camera
     */
    updateWorldMouse(camera) {
        const worldPos = camera.screenToWorld(this.mouse.x, this.mouse.y);
        this.mouse.worldX = worldPos.x;
        this.mouse.worldY = worldPos.y;
    }

    /**
     * Limpia los estados de flanco de subida al final de cada frame.
     */
    endFrame() {
        this.keysPressedThisFrame.clear();
        this.mouse.leftPressed = false;
        this.mouse.rightPressed = false;
        this.mouse.middleDown = false;
        this.mouse.wheelDelta = 0;
    }
}

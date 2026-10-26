/**
 * @fileoverview Cámara 2.5D con seguimiento suavizado (lerp), zoom, Screen-to-World y ScreenShake.
 * Capa 1: Depende de constants.js y EventBus.js.
 */

import { TILE, BOARD_COLS, BOARD_ROWS, EVENTS } from '../config/constants.js';
import { eventBus } from './EventBus.js';

// Niveles de zoom que mantienen un número entero de píxeles de pantalla por píxel artístico
// (el arte es de 16 px por celda escalado x3: zoom 1 = 3 px, 4/3 = 4 px, 5/3 = 5 px, 2/3 = 2 px).
const ZOOM_LEVELS = [2 / 3, 1, 4 / 3, 5 / 3];
const DEFAULT_ZOOM_INDEX = 2;
const ART_PX = 3;

export class Camera {
    /**
     * @param {number} viewportWidth
     * @param {number} viewportHeight
     */
    constructor(viewportWidth, viewportHeight) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;

        this.x = (BOARD_COLS * TILE) / 2;
        this.y = (BOARD_ROWS * TILE) / 2;

        this.zoomIndex = DEFAULT_ZOOM_INDEX;
        this.zoom = ZOOM_LEVELS[this.zoomIndex];
        this.targetZoom = this.zoom;
        this.minZoom = ZOOM_LEVELS[0];
        this.maxZoom = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

        this.lerpSpeed = 7.5;

        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        /** @type {Function} desuscripción del EventBus */
        this._offShake = eventBus.on(EVENTS.CAMERA_SHAKE, ({ intensity = 8, duration = 0.25 } = {}) => {
            this.triggerShake(intensity, duration);
        });
    }

    /** Libera la suscripción al EventBus (si la cámara se recrea). */
    dispose() {
        if (typeof this._offShake === 'function') this._offShake();
        this._offShake = null;
    }

    /**
     * Actualiza las dimensiones del viewport al redimensionar la ventana.
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    /**
     * Centra inmediatamente la cámara en una posición del mundo.
     * @param {number} worldX
     * @param {number} worldY
     */
    snapTo(worldX, worldY) {
        this.x = worldX;
        this.y = worldY;
    }

    /**
     * Dispara una sacudida de pantalla (ScreenShake).
     * @param {number} intensity
     * @param {number} duration
     */
    triggerShake(intensity = 8, duration = 0.25) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
        this.shakeTimer = this.shakeDuration;
    }

    /**
     * Ajusta el nivel de zoom con la rueda del ratón.
     * @param {number} wheelDelta
     */
    adjustZoom(wheelDelta) {
        if (wheelDelta === 0) return;
        // Pasos discretos: el pixel-art solo se ve nítido con escalas enteras
        const step = wheelDelta > 0 ? -1 : 1;
        this.zoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, this.zoomIndex + step));
        this.targetZoom = ZOOM_LEVELS[this.zoomIndex];
    }

    /**
     * Actualiza la posición interpolada de la cámara y el amortiguamiento del ScreenShake.
     * @param {number} dt
     * @param {{ x: number, y: number, z?: number }} target
     * @param {{ x: number, y: number }} [mouseScreen]
     */
    update(dt, target, mouseScreen) {
        // Zoom en pasos enteros (sin interpolación para no emborronar el pixel-art)
        this.zoom = this.targetZoom;

        if (target) {
            let desiredX = target.x;
            let desiredY = target.y - (target.z || 0) * 0.35;

            // Ligero desplazamiento de mirada hacia el cursor (estilo Zelda / Enter the Gungeon)
            if (mouseScreen) {
                const offsetX = (mouseScreen.x - this.viewportWidth * 0.5) * 0.12;
                const offsetY = (mouseScreen.y - this.viewportHeight * 0.5) * 0.12;
                desiredX += offsetX / this.zoom;
                desiredY += offsetY / this.zoom;
            }

            const alpha = 1 - Math.exp(-this.lerpSpeed * dt);
            this.x += (desiredX - this.x) * alpha;
            this.y += (desiredY - this.y) * alpha;
        }

        // Actualizar ScreenShake
        if (this.shakeTimer > 0) {
            this.shakeTimer = Math.max(0, this.shakeTimer - dt);
            const decay = this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
            const currentMag = this.shakeIntensity * decay;
            const angle = Math.random() * Math.PI * 2;
            this.shakeOffsetX = Math.cos(angle) * currentMag;
            this.shakeOffsetY = Math.sin(angle) * currentMag;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
                this.shakeOffsetX = 0;
                this.shakeOffsetY = 0;
            }
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
    }

    /**
     * Aplica la transformación de cámara al contexto 2D del Canvas.
     * @param {CanvasRenderingContext2D} ctx
     */
    applyTransform(ctx) {
        ctx.save();
        // Ajuste a la rejilla de píxel artístico: evita el "temblor" del pixel-art al desplazar la cámara
        const camX = Math.round(this.x / ART_PX) * ART_PX;
        const camY = Math.round(this.y / ART_PX) * ART_PX;
        const offX = Math.round(this.viewportWidth * 0.5 + this.shakeOffsetX - camX * this.zoom);
        const offY = Math.round(this.viewportHeight * 0.5 + this.shakeOffsetY - camY * this.zoom);
        ctx.setTransform(this.zoom, 0, 0, this.zoom, offX, offY);
        ctx.imageSmoothingEnabled = false;
    }

    /**
     * Restaura la transformación del contexto 2D.
     * @param {CanvasRenderingContext2D} ctx
     */
    restoreTransform(ctx) {
        ctx.restore();
    }

    /**
     * Convierte coordenadas de pantalla (px) a coordenadas del mundo 2D (plano Z=0).
     * @param {number} screenX
     * @param {number} screenY
     * @returns {{ x: number, y: number }}
     */
    screenToWorld(screenX, screenY) {
        const centerX = this.viewportWidth * 0.5 + this.shakeOffsetX;
        const centerY = this.viewportHeight * 0.5 + this.shakeOffsetY;
        const worldX = (screenX - centerX) / this.zoom + this.x;
        const worldY = (screenY - centerY) / this.zoom + this.y;
        return { x: worldX, y: worldY };
    }

    /**
     * Convierte coordenadas del mundo 2.5D (x, y, z) a coordenadas de pantalla (px).
     * @param {number} worldX
     * @param {number} worldY
     * @param {number} [worldZ=0]
     * @returns {{ x: number, y: number }}
     */
    worldToScreen(worldX, worldY, worldZ = 0) {
        const centerX = this.viewportWidth * 0.5 + this.shakeOffsetX;
        const centerY = this.viewportHeight * 0.5 + this.shakeOffsetY;
        const screenX = (worldX - this.x) * this.zoom + centerX;
        const screenY = (worldY - worldZ - this.y) * this.zoom + centerY;
        return { x: screenX, y: screenY };
    }
}

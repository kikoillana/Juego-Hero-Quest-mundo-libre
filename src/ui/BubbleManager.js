/**
 * @fileoverview Gestor de bocadillos estilo cómic sobre entidades (Héroe y Monstruos) en el espacio del Canvas.
 * Capa 5: Depende de constants.js y EventBus.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';

export class BubbleManager {
    constructor() {
        /** @type {Array<Object>} */
        this.bubbles = [];

        eventBus.on(EVENTS.BUBBLE_SHOW, (payload) => {
            if (!payload || !payload.entity || !payload.text) return;
            this.addBubble(payload);
        });
    }

    /**
     * Añade o reemplaza el bocadillo de una entidad.
     * @param {{ entity: Object, text: string, duration?: number, style?: string }} cfg
     */
    addBubble({ entity, text, duration = 2.2, style = 'monster' }) {
        // Si la misma entidad ya tenía un bocadillo activo, reemplazarlo
        const existingIdx = this.bubbles.findIndex((b) => b.entity === entity);
        if (existingIdx !== -1) {
            this.bubbles.splice(existingIdx, 1);
        }

        // Limitar número máximo de bocadillos simultáneos para mantener legibilidad
        if (this.bubbles.length >= 4) {
            this.bubbles.shift();
        }

        this.bubbles.push({
            entity,
            lastX: entity.x,
            lastY: entity.y,
            lastZ: entity.z || 0,
            text,
            style,
            life: duration,
            maxLife: duration
        });
    }

    /**
     * Actualiza el tiempo de vida y posición de cada bocadillo.
     * @param {number} dt
     */
    update(dt) {
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.life -= dt;
            if (b.life <= 0) {
                this.bubbles.splice(i, 1);
                continue;
            }
            if (b.entity) {
                b.lastX = b.entity.x;
                b.lastY = b.entity.y;
                b.lastZ = b.entity.z || 0;
            }
        }
    }

    /**
     * Dibuja los bocadillos estilo cómic en el espacio de pantalla del Canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../core/Camera.js').Camera} camera
     */
    render(ctx, camera) {
        if (this.bubbles.length === 0) return;

        ctx.save();
        ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const b of this.bubbles) {
            const screenPos = camera.worldToScreen(b.lastX, b.lastY, b.lastZ + 44);
            const alpha = Math.min(1, (b.life / b.maxLife) * 2.5);

            const popScale = b.maxLife - b.life < 0.1
                ? 0.8 + ((b.maxLife - b.life) / 0.1) * 0.2
                : 1.0;

            const padX = 11;
            const textWidth = ctx.measureText(b.text).width;
            const boxW = Math.min(270, textWidth + padX * 2);
            const boxH = 26;

            const bx = screenPos.x - boxW * 0.5;
            const by = screenPos.y - boxH - 8;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(screenPos.x, screenPos.y);
            ctx.scale(popScale, popScale);
            ctx.translate(-screenPos.x, -screenPos.y);

            let bgColor = '#fef9c3';
            let borderColor = '#1c1917';
            let textColor = '#1c1917';

            if (b.style === 'boss') {
                bgColor = '#450a0a';
                borderColor = '#facc15';
                textColor = '#fef08a';
            } else if (b.style === 'skill') {
                bgColor = '#1e3a8a';
                borderColor = '#38bdf8';
                textColor = '#f8fafc';
            } else if (b.style === 'hero') {
                bgColor = '#fffbeb';
                borderColor = '#b45309';
                textColor = '#451a03';
            }

            // Globo redondeado con pico inferior estilo cómic
            ctx.fillStyle = bgColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;

            drawRoundedBalloon(ctx, bx, by, boxW, boxH, 7, screenPos.x, screenPos.y - 1);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.fillText(b.text, screenPos.x, by + boxH * 0.5, boxW - 12);

            ctx.restore();
        }

        ctx.restore();
    }

    clear() {
        this.bubbles.length = 0;
    }
}

function drawRoundedBalloon(ctx, x, y, w, h, r, tailX, tailY) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

    // Pico del bocadillo apuntando a la miniatura
    ctx.lineTo(tailX + 6, y + h);
    ctx.lineTo(tailX, tailY);
    ctx.lineTo(tailX - 6, y + h);

    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

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
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.font = '16px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const b of this.bubbles) {
            const screenPos = camera.worldToScreen(b.lastX, b.lastY, b.lastZ + 44);
            // Aparece/desaparece en escalones (sin fundidos suaves, estilo 16 bits)
            const age = b.maxLife - b.life;
            if (age < 0.05 || (b.life < 0.4 && Math.floor(b.life * 12) % 2 === 0)) continue;

            const theme = BUBBLE_THEMES[b.style] || BUBBLE_THEMES.monster;
            const text = b.text;
            const textWidth = Math.ceil(ctx.measureText(text).width);
            const boxW = Math.min(320, textWidth + 20) & ~1;
            const boxH = 26;
            const tipX = Math.round(screenPos.x);
            const bx = Math.round(screenPos.x - boxW / 2);
            const by = Math.round(screenPos.y - boxH - 12);

            drawPixelBalloon(ctx, bx, by, boxW, boxH, tipX, theme);

            ctx.fillStyle = theme.text;
            ctx.fillText(text, tipX, by + boxH / 2 + 1, boxW - 12);
        }

        ctx.restore();
    }

    clear() {
        this.bubbles.length = 0;
    }
}

/** Paletas de los bocadillos (colores de la paleta maestra de 16 bits). */
const BUBBLE_THEMES = {
    monster: { bg: '#f8f8f8', border: '#201818', text: '#201818' },
    hero: { bg: '#f8f0d0', border: '#583010', text: '#201818' },
    boss: { bg: '#901818', border: '#f8c830', text: '#f8f8f8' },
    skill: { bg: '#283898', border: '#f8f8f8', text: '#f8f8f8' }
};

/**
 * Bocadillo pixel-art: caja rectangular con esquinas recortadas, borde de 2 px y pico escalonado.
 */
function drawPixelBalloon(ctx, x, y, w, h, tipX, theme) {
    const B = 2; // grosor del borde
    // Borde (caja con esquinas recortadas de 2 px)
    ctx.fillStyle = theme.border;
    ctx.fillRect(x + B, y, w - B * 2, h);
    ctx.fillRect(x, y + B, w, h - B * 2);
    // Relleno
    ctx.fillStyle = theme.bg;
    ctx.fillRect(x + B, y + B, w - B * 2, h - B * 2);
    // Pico escalonado hacia el personaje
    const tx = Math.max(x + 8, Math.min(x + w - 8, tipX));
    const steps = [6, 4, 2];
    for (let i = 0; i < steps.length; i++) {
        const half = steps[i];
        ctx.fillStyle = theme.border;
        ctx.fillRect(tx - half - B, y + h - B + i * B, (half + B) * 2, B);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(tx - half, y + h - B + i * B, half * 2, B);
    }
    ctx.fillStyle = theme.border;
    ctx.fillRect(tx - B, y + h - B + steps.length * B, B * 2, B);
}

/**
 * @fileoverview Sistema de partículas 2.5D con gravedad y rebote en Z, arcos de tajo (Slash),
 * ondas de choque mágicas (Magic Nova) y textos flotantes de combate.
 * Capa 3: Depende de constants.js y EventBus.js.
 */

import { GRAVITY, EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';
import { PX, snap } from '../render/Sprites.js';
import { PIXEL_FONT, stripEmoji } from '../render/envDraw.js';

/**
 * Elimina el elemento i en O(1) intercambiándolo con el último (el orden no importa).
 * Seguro al iterar el array de atrás hacia delante.
 */
function swapRemove(arr, i) {
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
}

export class ParticleSystem {
    constructor() {
        /** @type {Array<Object>} */
        this.particles = [];
        /** @type {Array<Object>} */
        this.slashes = [];
        /** @type {Array<Object>} */
        this.shockwaves = [];
        /** @type {Array<Object>} */
        this.floatingTexts = [];

        /** @type {Array<Function>} funciones de desuscripción del EventBus */
        this._unsubscribers = [];
        this._bindEvents();
    }

    _bindEvents() {
        this._unsubscribers.push(
            eventBus.on(EVENTS.PARTICLE_BURST, (cfg) => this.spawnBurst(cfg)),
            eventBus.on(EVENTS.SLASH_FX, (cfg) => this.spawnSlash(cfg)),
            eventBus.on(EVENTS.MAGIC_FX, (cfg) => this.spawnMagicWave(cfg)),
            eventBus.on(EVENTS.FLOATING_TEXT, (cfg) => this.spawnFloatingText(cfg))
        );
    }

    /** Libera las suscripciones al EventBus (si el sistema se recrea). */
    dispose() {
        for (const off of this._unsubscribers) {
            if (typeof off === 'function') off();
        }
        this._unsubscribers.length = 0;
        this.clear();
    }

    /**
     * Genera una explosión de partículas 2.5D con gravedad.
     */
    spawnBurst({ x, y, z = 12, count = 12, color = '#ef4444', speed = 135 }) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (0.3 + Math.random() * 0.7) * speed;
            const life = 0.35 + Math.random() * 0.45;
            this.particles.push({
                x,
                y,
                z: z + Math.random() * 6,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                vz: 90 + Math.random() * 190,
                size: 2.2 + Math.random() * 2.8,
                color,
                life,
                maxLife: life
            });
        }
    }

    /**
     * Genera un efecto visual de barrido de arma en arco (Slash).
     */
    spawnSlash({ x, y, z = 16, angle = 0, arc = Math.PI * 0.75, radius = 58, color = '#f87171' }) {
        this.slashes.push({
            x,
            y,
            z,
            angle,
            arc,
            radius,
            color,
            life: 0.18,
            maxLife: 0.18
        });
    }

    /**
     * Genera una onda de choque mágica / sísmica (Nova 360°).
     */
    spawnMagicWave({ x, y, z = 10, radius = 85, color = '#60a5fa' }) {
        this.shockwaves.push({
            x,
            y,
            z,
            maxRadius: radius,
            color,
            life: 0.42,
            maxLife: 0.42
        });
        this.spawnBurst({ x, y, z: z + 6, count: 26, color, speed: 195 });
    }

    /**
     * Genera un texto flotante en coordenadas 2.5D.
     */
    spawnFloatingText({ x, y, z = 36, text = '', color = '#facc15' }) {
        this.floatingTexts.push({
            x: x + (Math.random() - 0.5) * 14,
            y,
            z,
            vz: 48,
            text,
            color,
            life: 1.05,
            maxLife: 1.05
        });
    }

    /**
     * Actualiza todas las partículas, ondas y textos flotantes.
     * @param {number} dt
     */
    update(dt) {
        // 1. Partículas 2.5D
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                swapRemove(this.particles, i);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vz -= GRAVITY * dt;

            if (p.z <= 0) {
                p.z = 0;
                p.vz = -p.vz * 0.42;
                p.vx *= 0.72;
                p.vy *= 0.72;
            }
        }

        // 2. Arcos de corte (Slash)
        for (let i = this.slashes.length - 1; i >= 0; i--) {
            const s = this.slashes[i];
            s.life -= dt;
            if (s.life <= 0) {
                swapRemove(this.slashes, i);
            }
        }

        // 3. Ondas de choque mágicas
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const w = this.shockwaves[i];
            w.life -= dt;
            if (w.life <= 0) {
                swapRemove(this.shockwaves, i);
            }
        }

        // 4. Textos flotantes
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            if (ft.life <= 0) {
                swapRemove(this.floatingTexts, i);
                continue;
            }
            ft.z += ft.vz * dt;
            ft.vz *= 0.96;
        }
    }

    /**
     * Dibuja ondas de choque, arcos de corte y partículas como píxeles cuadrados (estética 16 bits).
     * @param {CanvasRenderingContext2D} ctx
     */
    drawWorldEffects(ctx) {
        ctx.save();

        // 1. Ondas de choque: anillo de píxeles en perspectiva 3/4 que se expande
        for (const w of this.shockwaves) {
            const progress = 1 - w.life / w.maxLife;
            const radius = w.maxRadius * (0.2 + 0.8 * progress);
            const size = progress < 0.6 ? PX * 2 : PX;
            const steps = Math.max(12, Math.floor(radius / 5));
            const cy = w.y - w.z * 0.3;
            ctx.globalAlpha = progress > 0.75 ? 0.5 : 1;
            ctx.fillStyle = w.color;
            for (let k = 0; k < steps; k++) {
                const a = (k / steps) * Math.PI * 2;
                ctx.fillRect(snap(w.x + Math.cos(a) * radius) - size / 2, snap(cy + Math.sin(a) * radius * 0.72) - size / 2, size, size);
            }
            ctx.fillStyle = '#f8f8f8';
            for (let k = 0; k < steps; k += 3) {
                const a = (k / steps) * Math.PI * 2 + 0.1;
                ctx.fillRect(snap(w.x + Math.cos(a) * radius), snap(cy + Math.sin(a) * radius * 0.72), PX, PX);
            }
        }

        // 2. Arcos de corte: media luna de píxeles (color exterior + filo blanco interior)
        for (const s of this.slashes) {
            const t = Math.max(0, s.life / s.maxLife);
            const startAng = s.angle - s.arc * 0.5;
            const cy = s.y - s.z;
            const r = s.radius * (0.9 + (1 - t) * 0.12);
            const steps = Math.max(8, Math.floor((s.arc * r) / 6));
            ctx.globalAlpha = t > 0.4 ? 1 : 0.5;
            for (let k = 0; k <= steps; k++) {
                const a = startAng + (k / steps) * s.arc;
                // grosor máximo en el centro del arco
                const mid = 1 - Math.abs(k / steps - 0.5) * 2;
                const thick = mid > 0.4 ? 2 : 1;
                const cx = Math.cos(a);
                const sy = Math.sin(a);
                ctx.fillStyle = s.color;
                ctx.fillRect(snap(s.x + cx * r) - PX, snap(cy + sy * r) - PX, PX * thick, PX * thick);
                if (mid > 0.2) {
                    ctx.fillStyle = '#f8f8f8';
                    ctx.fillRect(snap(s.x + cx * (r - PX * 2)) - PX, snap(cy + sy * (r - PX * 2)) - PX, PX, PX);
                }
            }
        }

        // 3. Partículas: cuadrados de 1-2 píxeles artísticos con sombra de 1 píxel
        for (const p of this.particles) {
            const t = Math.max(0, p.life / p.maxLife);
            const size = p.size > 3.6 && t > 0.4 ? PX * 2 : PX;
            const px = snap(p.x);
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000000';
            ctx.fillRect(px, snap(p.y), PX, PX);
            ctx.globalAlpha = t > 0.25 ? 1 : 0.5;
            ctx.fillStyle = p.color;
            ctx.fillRect(px - size / 2, snap(p.y - p.z) - size / 2, size, size);
        }

        ctx.restore();
    }

    /**
     * Textos flotantes en fuente pixel con contorno oscuro de 1 píxel.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawFloatingTexts(ctx) {
        if (this.floatingTexts.length === 0) return;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const ft of this.floatingTexts) {
            const text = stripEmoji(ft.text);
            if (!text) continue;
            const size = text.length <= 5 ? 12 : 6;
            const o = size === 12 ? 3 : 1.5;
            const x = snap(ft.x);
            const y = snap(ft.y - ft.z);
            ctx.font = `${size}px ${PIXEL_FONT}`;
            ctx.globalAlpha = ft.life / ft.maxLife > 0.25 ? 1 : 0.5;
            ctx.fillStyle = '#201818';
            ctx.fillText(text, x - o, y);
            ctx.fillText(text, x + o, y);
            ctx.fillText(text, x, y - o);
            ctx.fillText(text, x, y + o);
            ctx.fillText(text, x + o, y + o);
            ctx.fillStyle = ft.color;
            ctx.fillText(text, x, y);
        }

        ctx.restore();
    }

    clear() {
        this.particles.length = 0;
        this.slashes.length = 0;
        this.shockwaves.length = 0;
        this.floatingTexts.length = 0;
    }
}

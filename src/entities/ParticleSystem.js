/**
 * @fileoverview Sistema de partículas 2.5D con gravedad y rebote en Z, arcos de tajo (Slash),
 * ondas de choque mágicas (Magic Nova) y textos flotantes de combate.
 * Capa 3: Depende de constants.js y EventBus.js.
 */

import { GRAVITY, EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';

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
     * Dibuja ondas de choque, arcos de corte y partículas 2.5D en el espacio del mundo.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawWorldEffects(ctx) {
        ctx.save();

        // 1. Ondas de choque (elipses proyectadas en perspectiva 3/4)
        for (const w of this.shockwaves) {
            const progress = 1 - w.life / w.maxLife;
            const currentRadius = w.maxRadius * (0.2 + 0.8 * progress);
            const alpha = Math.max(0, w.life / w.maxLife);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = w.color;
            ctx.lineWidth = 4 * (1 - progress * 0.5);
            ctx.beginPath();
            ctx.ellipse(w.x, w.y - w.z * 0.3, currentRadius, currentRadius * 0.72, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = w.color;
            ctx.globalAlpha = alpha * 0.22;
            ctx.fill();
            ctx.restore();
        }

        // 2. Arcos de corte (Slash)
        for (const s of this.slashes) {
            const alpha = Math.max(0, s.life / s.maxLife);
            const progress = 1 - alpha;
            const startAng = s.angle - s.arc * 0.5;
            const endAng = s.angle + s.arc * 0.5;
            const drawY = s.y - s.z;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 10 * alpha;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(s.x, drawY, s.radius * (0.88 + progress * 0.14), startAng, endAng);
            ctx.stroke();

            // Filo blanco brillante interno
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5 * alpha;
            ctx.beginPath();
            ctx.arc(s.x, drawY, s.radius * (0.92 + progress * 0.14), startAng + 0.08, endAng - 0.08);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Partículas 2.5D con su sombra (sin save/restore por partícula: el save exterior basta)
        const TAU = Math.PI * 2;
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha * 0.35;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.75, 0, TAU);
            ctx.fill();

            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y - p.z, p.size, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Dibuja los textos flotantes por encima de las entidades y muros.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawFloatingTexts(ctx) {
        if (this.floatingTexts.length === 0) return;

        ctx.save();
        ctx.font = 'bold 13px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const ft of this.floatingTexts) {
            const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
            const drawY = ft.y - ft.z;

            ctx.globalAlpha = alpha;
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#09080b';
            ctx.strokeText(ft.text, ft.x, drawY);

            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, drawY);
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

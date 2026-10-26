/**
 * @fileoverview Objetos de botín (monedas, bolsas de oro y pociones) con rebote físico en el eje Z
 * e imán magnético de recogida hacia el héroe.
 * Capa 3: Depende de constants.js y EventBus.js.
 */

import { GRAVITY, LOOT_TYPE, EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';

/** Tabla de pociones recogibles: clave de inventario, texto flotante y color. */
const POTION_LOOT = {
    [LOOT_TYPE.HEAL_POTION]: { key: 'healPotions', text: '+1 Poción Curativa [1]', color: '#4ade80' },
    [LOOT_TYPE.STRENGTH_POTION]: { key: 'strengthPotions', text: '+1 Poción Fuerza [2]', color: '#f59e0b' },
    [LOOT_TYPE.SPEED_POTION]: { key: 'speedPotions', text: '+1 Poción Velocidad [3]', color: '#38bdf8' }
};

export class LootItem {
    /**
     * @param {{ x: number, y: number, z?: number, vx?: number, vy?: number, vz?: number, type: string, value?: number }} config
     */
    constructor({ x, y, z = 12, vx = 0, vy = 0, vz = 220, type = LOOT_TYPE.GOLD_COIN, value = 10 }) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;

        this.type = type;
        this.value = value;

        this.age = 0;
        this.pickupDelay = 0.32;
        this.magnetRadius = 125;
        this.collectRadius = 20;
        this.collected = false;
    }

    /**
     * Actualiza física 2.5D con gravedad, rebotes y atracción magnética hacia el jugador.
     * @param {number} dt
     * @param {Object} player
     * @param {Object} board
     */
    update(dt, player, board) {
        if (this.collected) return;
        this.age += dt;

        // 1. Física vertical en el eje Z con rebote amortiguado
        if (this.z > 0 || this.vz !== 0) {
            this.z += this.vz * dt;
            this.vz -= GRAVITY * dt;

            if (this.z <= 0) {
                this.z = 0;
                if (Math.abs(this.vz) > 45) {
                    this.vz = -this.vz * 0.46;
                    this.vx *= 0.72;
                    this.vy *= 0.72;
                } else {
                    this.vz = 0;
                }
            }
        }

        // 2. Movimiento en el plano XY con fricción y colisión con muros
        if (Math.hypot(this.vx, this.vy) > 2) {
            const nextX = this.x + this.vx * dt;
            const nextY = this.y + this.vy * dt;

            if (!board || !board.isPositionBlocked(nextX, this.y, 6, 10)) {
                this.x = nextX;
            } else {
                this.vx = -this.vx * 0.5;
            }

            if (!board || !board.isPositionBlocked(this.x, nextY, 6, 10)) {
                this.y = nextY;
            } else {
                this.vy = -this.vy * 0.5;
            }

            const friction = this.z <= 0.5 ? Math.exp(-8 * dt) : Math.exp(-2 * dt);
            this.vx *= friction;
            this.vy *= friction;
        }

        // 3. Imán de recogida hacia el jugador
        if (!player || player.dead || this.age < this.pickupDelay) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.magnetRadius && dist > 0.01) {
            const pullStrength = (1 - dist / this.magnetRadius) * 480 + 140;
            this.x += (dx / dist) * pullStrength * dt;
            this.y += (dy / dist) * pullStrength * dt;
            this.z = Math.max(this.z, 4 + Math.sin(this.age * 14) * 3);
        }

        if (dist <= this.collectRadius) {
            this._collect(player);
        }
    }

    _collect(player) {
        this.collected = true;

        if (this.type === LOOT_TYPE.GOLD_COIN || this.type === LOOT_TYPE.GOLD_POUCH) {
            player.gold += this.value;
            eventBus.emit(EVENTS.LOOT_COLLECTED, { kind: 'gold', value: this.value });
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: player.x,
                y: player.y,
                z: 40,
                text: `+${this.value} Oro`,
                color: '#facc15'
            });
        } else {
            const potion = POTION_LOOT[this.type];
            if (potion) {
                player.inventory[potion.key]++;
                eventBus.emit(EVENTS.LOOT_COLLECTED, { kind: 'potion', type: this.type });
                eventBus.emit(EVENTS.FLOATING_TEXT, {
                    x: player.x,
                    y: player.y,
                    z: 44,
                    text: potion.text,
                    color: potion.color
                });
            }
        }

        player.emitUpdate();
    }

    /**
     * Dibuja el objeto de botín en proyección 2.5D con sombra proyectada.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (this.collected) return;

        const hoverZ = this.z + (this.z <= 0.5 ? Math.abs(Math.sin(this.age * 5)) * 3.5 : 0);
        const drawY = this.y - hoverZ;

        ctx.save();

        // Sombra proyectada en el plano Z=0
        const shadowScale = Math.max(0.45, 1 - hoverZ / 95);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 3, 7 * shadowScale, 3.8 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.type === LOOT_TYPE.GOLD_COIN) {
            const spinWidth = Math.max(3, Math.abs(Math.cos(this.age * 7)) * 6.5);
            ctx.fillStyle = '#facc15';
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(this.x, drawY, spinWidth, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(this.x - 1, drawY - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === LOOT_TYPE.GOLD_POUCH) {
            // Bolsa de cuero con monedas de oro
            ctx.fillStyle = '#b45309';
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, drawY, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Cuello de la bolsa y cordón dorado
            ctx.fillStyle = '#facc15';
            ctx.fillRect(this.x - 4, drawY - 8, 8, 3);
        } else {
            // Frasco alquímico de poción
            let liquidColor = '#22c55e';
            let glowColor = '#86efac';
            if (this.type === LOOT_TYPE.STRENGTH_POTION) {
                liquidColor = '#f97316';
                glowColor = '#fdba74';
            } else if (this.type === LOOT_TYPE.SPEED_POTION) {
                liquidColor = '#0ea5e9';
                glowColor = '#7dd3fc';
            }

            // Cuerpo de cristal
            ctx.fillStyle = liquidColor;
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, drawY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Cuello y tapón de corcho
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(this.x - 2.5, drawY - 10, 5, 4);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(this.x - 2, drawY - 12, 4, 2.5);

            // Brillo interior
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(this.x - 2.2, drawY - 2, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

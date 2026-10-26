/**
 * @fileoverview Objetos de botín (monedas, bolsas de oro y pociones) con rebote físico en el eje Z
 * e imán magnético de recogida hacia el héroe.
 * Capa 3: Depende de constants.js, EventBus.js y de los sprites de escenario (envDraw.js).
 */

import { GRAVITY, LOOT_TYPE, EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';
import { PX, snap } from '../render/Sprites.js';
import { envSprite } from '../render/envDraw.js';

/** Fotograma del sprite de botín (assets/sprites/items.png). */
const LOOT_FRAME = {
    [LOOT_TYPE.GOLD_COIN]: 'coin0',
    [LOOT_TYPE.GOLD_POUCH]: 'pouch',
    [LOOT_TYPE.RUBY_GEM]: 'gem',
    [LOOT_TYPE.HEAL_POTION]: 'potion_heal',
    [LOOT_TYPE.STRENGTH_POTION]: 'potion_strength',
    [LOOT_TYPE.SPEED_POTION]: 'potion_speed'
};

/** Tabla de pociones recogibles: clave de inventario, texto flotante y color. */
const POTION_LOOT = {
    [LOOT_TYPE.HEAL_POTION]: { key: 'healPotions', text: '+1 Poción Curativa [1]', color: '#f87858' },
    [LOOT_TYPE.STRENGTH_POTION]: { key: 'strengthPotions', text: '+1 Poción Fuerza [2]', color: '#f8a830' },
    [LOOT_TYPE.SPEED_POTION]: { key: 'speedPotions', text: '+1 Poción Velocidad [3]', color: '#88b8f8' }
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
     * Dibuja el objeto de botín como sprite pixel-art con sombra plana y rebote en Z.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} [elapsed]
     */
    draw(ctx) {
        if (this.collected) return;

        // Pequeño salto escalonado cuando reposa en el suelo (2 posiciones, estilo 16 bits)
        const resting = this.z <= 0.5;
        const hoverZ = this.z + (resting && Math.floor(this.age * 3) % 2 === 0 ? PX : 0);
        const x = snap(this.x);
        const y = snap(this.y);

        // Sombra plana de píxeles
        const sw = hoverZ > 24 ? 2 : 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(x - sw * PX, y, sw * 2 * PX, PX);
        ctx.fillRect(x - (sw - 1) * PX, y + PX, (sw - 1) * 2 * PX, PX);

        let frame = LOOT_FRAME[this.type] || 'coin0';
        if (this.type === LOOT_TYPE.GOLD_COIN) frame = `coin${Math.floor(this.age * 8) % 4}`;
        envSprite(ctx, 'items', frame, x, y + PX - hoverZ);
    }
}

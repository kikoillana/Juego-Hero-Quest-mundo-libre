/**
 * @fileoverview Entidad Monstruo con Máquina de Estados Finitos (Patrulla, Alerta, Persecución,
 * Telegrafiado de ataque y Golpe), selección de objetivo sobre el grupo de 4 Héroes y
 * mecánicas multifase de alta dificultad para el Jefe Final (Gárgola del Caos).
 * Capa 3: Depende de constants.js, monstersData.js, dialoguesData.js y EventBus.js.
 */

import { TILE, GRAVITY, FOG, LOOT_TYPE, EVENTS } from '../config/constants.js';
import { MONSTERS_DATA } from '../config/monstersData.js';
import { MONSTER_QUOTES, MONSTER_GROWLS } from '../config/dialoguesData.js';
import { eventBus } from '../core/EventBus.js';

export const AI_STATE = Object.freeze({
    PATROL: 'PATROL',
    ALERT: 'ALERT',
    CHASE: 'CHASE',
    TELEGRAPH: 'TELEGRAPH',
    STRIKE: 'STRIKE',
    COOLDOWN: 'COOLDOWN'
});

let nextMonsterUid = 1;
let lastGlobalGrowlTimestamp = 0;

export class Monster {
    /**
     * @param {string} type - 'goblin' | 'orc' | 'skeleton' | 'fimir' | 'gargoyle'
     * @param {number} x
     * @param {number} y
     * @param {string|null} [roomId=null]
     */
    constructor(type, x, y, roomId = null, options = {}) {
        const template = MONSTERS_DATA[type] || MONSTERS_DATA.goblin;

        this.uid = `monster_${nextMonsterUid++}`;
        this.type = template.id;
        this.isSubBoss = Boolean(options.isSubBoss);
        this.name = options.customName || template.name;
        this.title = this.isSubBoss ? 'Jefe de Misión Secundaria' : template.title;
        this.isBoss = Boolean(template.isBoss);
        this.roomId = roomId;

        this.x = x;
        this.y = y;
        this.z = 0;
        this.vz = 0;
        this.homeX = x;
        this.homeY = y;

        this.maxHp = this.isSubBoss ? Math.round(template.maxHp * 1.85) : template.maxHp;
        this.hp = this.maxHp;
        this.baseSpeed = template.speed;
        this.speed = template.speed;
        this.patrolSpeed = template.patrolSpeed;
        this.damage = this.isSubBoss ? Math.round(template.damage * 1.18) : template.damage;
        this.attackRange = template.attackRange;
        this.aggroRadius = template.aggroRadius;
        this.telegraphTime = template.telegraphTime;
        this.attackCooldown = template.attackCooldown;
        this.radius = this.isSubBoss ? Math.round(template.radius * 1.18) : template.radius;
        this.scale = this.isSubBoss ? template.scale * 1.25 : template.scale;

        this.goldMin = this.isSubBoss ? 90 : template.goldMin;
        this.goldMax = this.isSubBoss ? 150 : template.goldMax;
        this.potionChance = this.isSubBoss ? 1.0 : template.potionChance;
        this.colors = { ...template.colors };
        if (this.isSubBoss) {
            this.colors.baseRim = '#f59e0b';
        }
        this.voice = { ...template.voice };

        // Máquina de Estados de IA
        this.state = AI_STATE.PATROL;
        this.stateTimer = 1.0 + Math.random() * 2.0;
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.patrolMoving = false;

        this.facingX = 1;
        this.attackAngle = 0;
        this.walkPhase = Math.random() * Math.PI * 2;

        // Temporizador de gruñidos cuando está cerca y visible
        this.growlTimer = 1.2 + Math.random() * 2.8;

        // Mecánicas especiales del Jefe Final (Gárgola del Caos)
        this.bossPhase = 1;
        this.bossSkillTimer = 5.0;

        // Física de empuje (knockback)
        this.knockVx = 0;
        this.knockVy = 0;
        this.hurtFlashTimer = 0;
        this.dead = false;
    }

    /**
     * Actualiza la IA, selección de objetivo del grupo de 4 héroes, mecánicas de Jefe y combate.
     * @param {number} dt
     * @param {{ player: Object, companions?: Array, board: Object, monsters: Array, hasLOS: Function }} context
     */
    update(dt, { player, companions = [], board, monsters, hasLOS }) {
        if (this.dead) return;

        if (this.hurtFlashTimer > 0) {
            this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt);
        }

        // 1. Gravedad en eje Z
        if (this.z > 0 || this.vz !== 0) {
            this.z += this.vz * dt;
            this.vz -= GRAVITY * dt;
            if (this.z <= 0) {
                this.z = 0;
                this.vz = 0;
            }
        }

        // 2. Amortiguación de Knockback
        if (Math.hypot(this.knockVx, this.knockVy) > 5) {
            this._moveSafe(this.knockVx * dt, this.knockVy * dt, board);
            const damping = Math.exp(-10 * dt);
            this.knockVx *= damping;
            this.knockVy *= damping;
        } else {
            this.knockVx = 0;
            this.knockVy = 0;
        }

        if (!player || player.dead) return;

        // Elegir al héroe más cercano del grupo de 4 (sin reservar arrays por frame)
        const pdx = player.x - this.x;
        const pdy = player.y - this.y;
        let targetHero = player;
        let minHeroD2 = pdx * pdx + pdy * pdy;
        for (const hero of companions) {
            if (!hero || hero.dead) continue;
            const hx = hero.x - this.x;
            const hy = hero.y - this.y;
            const d2 = hx * hx + hy * hy;
            if (d2 < minHeroD2) {
                minHeroD2 = d2;
                targetHero = hero;
            }
        }
        const minHeroDist = Math.sqrt(minHeroD2);
        const getParty = () => [player, ...companions].filter((h) => h && !h.dead);

        const dxToTarget = targetHero.x - this.x;
        const dyToTarget = targetHero.y - this.y;
        const distToPlayer = Math.sqrt(pdx * pdx + pdy * pdy);

        // 3. Gruñido periódico si el monstruo está CERCA y VISIBLE en la Niebla de Guerra
        const col = Math.floor(this.x / TILE);
        const row = Math.floor(this.y / TILE);
        const isVisible = board?.fog?.[row]?.[col] === FOG.VISIBLE;

        if (isVisible && distToPlayer <= 290) {
            this.growlTimer -= dt;
            if (this.growlTimer <= 0) {
                this.growlTimer = 4.2 + Math.random() * 4.5;
                const nowMs = performance.now();
                if (nowMs - lastGlobalGrowlTimestamp > 1650) {
                    lastGlobalGrowlTimestamp = nowMs;
                    eventBus.emit(EVENTS.MONSTER_GROWL, {
                        monster: this,
                        type: this.type,
                        distance: distToPlayer
                    });

                    const growlPool = MONSTER_GROWLS[this.type] || MONSTER_GROWLS.orc;
                    if (growlPool.length > 0 && Math.random() < 0.60) {
                        const growlText = growlPool[Math.floor(Math.random() * growlPool.length)];
                        eventBus.emit(EVENTS.BUBBLE_SHOW, {
                            entity: this,
                            text: growlText,
                            duration: 1.4,
                            style: this.isBoss ? 'boss' : 'monster'
                        });
                    }
                }
            }
        }

        // 4. Habilidades Especiales del Jefe Final (Gárgola del Caos)
        if (this.isBoss && this.state !== AI_STATE.PATROL) {
            this._updateBossMechanics(dt, getParty());
        }

        // 5. Máquina de Estados Finitos (FSM)
        switch (this.state) {
            case AI_STATE.PATROL: {
                this._updatePatrol(dt, board);

                const roomObj = this.roomId ? board.roomMap.get(this.roomId) : null;
                const roomActive = !roomObj || roomObj.discovered;

                if (roomActive && minHeroDist <= this.aggroRadius) {
                    const visible = hasLOS ? hasLOS(board, this.x, this.y, targetHero.x, targetHero.y) : true;
                    if (visible) {
                        this._enterAlertState();
                    }
                }
                break;
            }

            case AI_STATE.ALERT: {
                this.facingX = dxToTarget >= 0 ? 1 : -1;
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = AI_STATE.CHASE;
                }
                break;
            }

            case AI_STATE.CHASE: {
                this.facingX = dxToTarget >= 0 ? 1 : -1;

                if (minHeroDist <= this.attackRange + targetHero.radius - 4) {
                    this.state = AI_STATE.TELEGRAPH;
                    this.stateTimer = this.telegraphTime;
                    this.attackAngle = Math.atan2(dyToTarget, dxToTarget);

                    eventBus.emit(EVENTS.MONSTER_TELEGRAPH, {
                        monster: this,
                        angle: this.attackAngle
                    });
                } else {
                    this._chaseTarget(dt, targetHero, board, monsters);
                }
                break;
            }

            case AI_STATE.TELEGRAPH: {
                if (this.stateTimer > this.telegraphTime * 0.45) {
                    this.attackAngle = Math.atan2(dyToTarget, dxToTarget);
                    this.facingX = dxToTarget >= 0 ? 1 : -1;
                }

                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = AI_STATE.STRIKE;
                    this.stateTimer = 0.18;
                    this._executeStrike(getParty());
                }
                break;
            }

            case AI_STATE.STRIKE: {
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = AI_STATE.COOLDOWN;
                    this.stateTimer = this.attackCooldown;
                }
                break;
            }

            case AI_STATE.COOLDOWN: {
                this.stateTimer -= dt;
                const perpAngle = this.attackAngle + Math.PI * 0.5;
                this._moveSafe(
                    Math.cos(perpAngle) * this.patrolSpeed * 0.45 * dt,
                    Math.sin(perpAngle) * this.patrolSpeed * 0.45 * dt,
                    board
                );
                if (this.stateTimer <= 0) {
                    this.state = AI_STATE.CHASE;
                }
                break;
            }

            default:
                break;
        }
    }

    /**
     * Mecánicas multifase de la Gárgola del Caos (Nova Ígnea, Salto Sísmico e Invocación de Guardia).
     */
    _updateBossMechanics(dt, party) {
        const hpRatio = this.hp / this.maxHp;

        // Transición a Fase 2 (<= 65% HP): Invoca refuerzos y gana velocidad
        if (this.bossPhase === 1 && hpRatio <= 0.65) {
            this.applyBossPhase(2);
            this.vz = 360;
            this._castBossChaosNova(party, 105, 28, '¡GUARDIANES DEL CAOS, ALZAOS!');
            eventBus.emit(EVENTS.BOSS_SUMMON, {
                boss: this,
                spawns: [
                    { type: 'skeleton', x: this.x - 58, y: this.y - 36 },
                    { type: 'skeleton', x: this.x + 58, y: this.y - 36 },
                    { type: 'orc', x: this.x, y: this.y + 52 }
                ]
            });
        }

        // Transición a Fase 3 (<= 32% HP): Frenesí de Zargon + Segunda oleada de élite
        // (else-if: un golpe enorme no dispara las fases 2 y 3 en el mismo frame)
        else if (this.bossPhase === 2 && hpRatio <= 0.32) {
            this.applyBossPhase(3);
            this.vz = 410;
            this._castBossChaosNova(party, 120, 34, '¡FRENESÍ DE PIEDRA ETERNA! ¡PERECED!');
            eventBus.emit(EVENTS.BOSS_SUMMON, {
                boss: this,
                spawns: [
                    { type: 'fimir', x: this.x - 54, y: this.y + 40 },
                    { type: 'goblin', x: this.x + 54, y: this.y + 40 }
                ]
            });
        }

        // Habilidad periódica de Nova Sísmica del Caos cuando los héroes la rodean
        this.bossSkillTimer -= dt;
        if (this.bossSkillTimer <= 0) {
            const closeHeroes = party.filter((h) => Math.hypot(h.x - this.x, h.y - this.y) <= 115);
            if (closeHeroes.length > 0) {
                this.bossSkillTimer = this.bossPhase === 3 ? 4.2 : 5.8;
                this.vz = 280;
                this._castBossChaosNova(party, 98, 25, '¡ONDA DE FUEGO DEL CAOS!');
            } else {
                this.bossSkillTimer = 1.5;
            }
        }
    }

    /**
     * Fija la fase del Jefe aplicando sus bonificaciones (también al cargar partida).
     * @param {number} phase - 1 | 2 | 3
     */
    applyBossPhase(phase) {
        this.bossPhase = phase;
        if (phase >= 2) {
            this.speed = this.baseSpeed * (phase === 3 ? 1.34 : 1.18);
        }
        if (phase === 3) {
            this.attackCooldown = 0.68;
        }
    }

    _castBossChaosNova(party, radius, dmg, shoutText) {
        eventBus.emit(EVENTS.MAGIC_FX, {
            x: this.x,
            y: this.y,
            z: 16,
            radius,
            color: '#ef4444'
        });
        eventBus.emit(EVENTS.CAMERA_SHAKE, { intensity: 11, duration: 0.32 });
        eventBus.emit(EVENTS.BUBBLE_SHOW, {
            entity: this,
            text: shoutText,
            duration: 2.4,
            style: 'boss'
        });
        eventBus.emit(EVENTS.MONSTER_ALERTED, { monster: this });

        for (const hero of party) {
            const d = Math.hypot(hero.x - this.x, hero.y - this.y);
            if (d <= radius + hero.radius) {
                hero.takeDamage(dmg, this.x, this.y);
            }
        }
    }

    _updatePatrol(dt, board) {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            this.patrolMoving = !this.patrolMoving;
            this.stateTimer = this.patrolMoving ? 1.2 + Math.random() * 1.4 : 1.0 + Math.random() * 1.6;
            const distHome = Math.hypot(this.x - this.homeX, this.y - this.homeY);
            if (distHome > 70) {
                this.patrolAngle = Math.atan2(this.homeY - this.y, this.homeX - this.x);
            } else {
                this.patrolAngle = Math.random() * Math.PI * 2;
            }
        }

        if (this.patrolMoving) {
            const vx = Math.cos(this.patrolAngle) * this.patrolSpeed;
            const vy = Math.sin(this.patrolAngle) * this.patrolSpeed;
            this.facingX = vx >= 0 ? 1 : -1;
            const moved = this._moveSafe(vx * dt, vy * dt, board);
            if (!moved) {
                this.patrolAngle += Math.PI * 0.75;
            }
            this.walkPhase += dt * 7;
        }
    }

    _enterAlertState() {
        if (this.state !== AI_STATE.PATROL) return;
        this.state = AI_STATE.ALERT;
        this.stateTimer = 0.34;
        this.vz = 175;
        this.growlTimer = 4.5 + Math.random() * 3.0;

        eventBus.emit(EVENTS.MONSTER_ALERTED, { monster: this });

        const quotes = MONSTER_QUOTES[this.type]?.alert || [];
        if (quotes.length > 0) {
            const line = quotes[Math.floor(Math.random() * quotes.length)];
            eventBus.emit(EVENTS.BUBBLE_SHOW, {
                entity: this,
                text: line,
                duration: 2.6,
                style: this.isBoss ? 'boss' : 'monster'
            });
        }
    }

    _chaseTarget(dt, targetHero, board, monsters) {
        const dx = targetHero.x - this.x;
        const dy = targetHero.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;

        let dirX = dx / dist;
        let dirY = dy / dist;

        for (const other of monsters) {
            if (other === this || other.dead) continue;
            const odx = this.x - other.x;
            const ody = this.y - other.y;
            const minSep = this.radius + other.radius + 6;
            const od2 = odx * odx + ody * ody;
            if (od2 > 0 && od2 < minSep * minSep) {
                const odist = Math.sqrt(od2);
                const push = (minSep - odist) / minSep;
                dirX += (odx / odist) * push * 0.85;
                dirY += (ody / odist) * push * 0.85;
            }
        }

        const norm = Math.hypot(dirX, dirY) || 1;
        dirX /= norm;
        dirY /= norm;

        const stepX = dirX * this.speed * dt;
        const stepY = dirY * this.speed * dt;

        this._moveSafe(stepX, stepY, board);
        this.walkPhase += dt * 11;
    }

    _executeStrike(party) {
        const strikeX = this.x + Math.cos(this.attackAngle) * (this.attackRange * 0.55);
        const strikeY = this.y + Math.sin(this.attackAngle) * (this.attackRange * 0.55);

        eventBus.emit(EVENTS.MONSTER_ATTACK, {
            monster: this,
            x: strikeX,
            y: strikeY,
            angle: this.attackAngle
        });

        eventBus.emit(EVENTS.SLASH_FX, {
            x: this.x,
            y: this.y,
            z: this.z + 14,
            angle: this.attackAngle,
            arc: Math.PI * 0.65,
            radius: this.attackRange,
            color: this.isBoss ? '#ef4444' : '#fb923c'
        });

        // Dañar a cualquier héroe del grupo alcanzado por el barrido del monstruo
        for (const hero of party) {
            if (hero.dead) continue;
            const dx = hero.x - this.x;
            const dy = hero.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist <= this.attackRange + hero.radius + 4) {
                const angleToHero = Math.atan2(dy, dx);
                let diff = angleToHero - this.attackAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                if (Math.abs(diff) <= Math.PI * 0.5 || dist <= this.radius + hero.radius + 8) {
                    hero.takeDamage(this.damage, this.x, this.y);
                }
            }
        }

        if (Math.random() < 0.30) {
            const quotes = MONSTER_QUOTES[this.type]?.attack || [];
            if (quotes.length > 0) {
                const line = quotes[Math.floor(Math.random() * quotes.length)];
                eventBus.emit(EVENTS.BUBBLE_SHOW, {
                    entity: this,
                    text: line,
                    duration: 1.6,
                    style: this.isBoss ? 'boss' : 'monster'
                });
            }
        }
    }

    /**
     * Aplica daño al monstruo, activa empuje físico 2.5D y gestiona su muerte y botín.
     */
    takeDamage(amount, sourceX, sourceY, isCrit = false, knockbackForce = 200) {
        if (this.dead) return;

        // En Fase 2 y 3, la Gárgola tiene Piel de Granito reforzada (15% reducción de daño)
        const actualAmount = (this.isBoss && this.bossPhase >= 2)
            ? Math.max(4, Math.round(amount * 0.85))
            : amount;

        this.hp = Math.max(0, this.hp - actualAmount);
        this.hurtFlashTimer = 0.20;

        if (this.state === AI_STATE.PATROL) {
            this.state = AI_STATE.CHASE;
        }

        const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
        const kbResist = this.isBoss ? 0.25 : 1.0;
        this.knockVx = Math.cos(angle) * knockbackForce * kbResist;
        this.knockVy = Math.sin(angle) * knockbackForce * kbResist;
        this.vz = Math.max(this.vz, 115 * kbResist);

        eventBus.emit(EVENTS.MONSTER_DAMAGED, {
            monster: this,
            damage: actualAmount,
            crit: isCrit
        });

        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: this.x,
            y: this.y,
            z: this.z + 16,
            count: isCrit ? 18 : 10,
            color: this.type === 'skeleton' ? '#e2e8f0' : '#dc2626'
        });

        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: this.x,
            y: this.y,
            z: this.z + 38,
            text: isCrit ? `¡${actualAmount} CRIT!` : `-${actualAmount}`,
            color: isCrit ? '#facc15' : '#f8fafc'
        });

        if (this.hp <= 0) {
            this._die();
        }
    }

    _die() {
        this.dead = true;

        const deathQuotes = MONSTER_QUOTES[this.type]?.death || [];
        if (deathQuotes.length > 0) {
            const line = deathQuotes[Math.floor(Math.random() * deathQuotes.length)];
            eventBus.emit(EVENTS.BUBBLE_SHOW, {
                entity: { x: this.x, y: this.y, z: 18 },
                text: line,
                duration: 2.4,
                style: this.isBoss ? 'boss' : 'monster'
            });
        }

        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: this.x,
            y: this.y,
            z: 16,
            count: this.isBoss ? 48 : 22,
            color: this.colors.baseRim
        });

        const goldTotal = Math.floor(this.goldMin + Math.random() * (this.goldMax - this.goldMin + 1));
        const drops = this.isBoss ? 8 : Math.max(2, Math.min(4, Math.round(goldTotal / 15)));
        const perDrop = Math.max(5, Math.round(goldTotal / drops));

        for (let i = 0; i < drops; i++) {
            const ang = (Math.PI * 2 * i) / drops + (Math.random() - 0.5) * 0.5;
            const spd = 65 + Math.random() * 65;
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: this.x,
                y: this.y,
                z: 14,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                vz: 200 + Math.random() * 90,
                type: perDrop >= 22 ? LOOT_TYPE.GOLD_POUCH : LOOT_TYPE.GOLD_COIN,
                value: perDrop
            });
        }

        if (Math.random() < this.potionChance) {
            const pTypes = [LOOT_TYPE.HEAL_POTION, LOOT_TYPE.STRENGTH_POTION, LOOT_TYPE.SPEED_POTION];
            const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: this.x,
                y: this.y,
                z: 18,
                vx: (Math.random() - 0.5) * 90,
                vy: (Math.random() - 0.5) * 90,
                vz: 250,
                type: pType,
                value: 1
            });
        }

        eventBus.emit(EVENTS.MONSTER_KILLED, {
            monster: this,
            isBoss: this.isBoss
        });

        if (this.isBoss) {
            eventBus.emit(EVENTS.BOSS_DEFEATED, { monster: this });
        }
    }

    _moveSafe(dx, dy, board) {
        if (!board) {
            this.x += dx;
            this.y += dy;
            return true;
        }
        // Red de seguridad: si el monstruo aparece incrustado en un mueble/muro, se le deja salir
        if (board.isPositionBlocked(this.x, this.y, this.radius, 0)) {
            this.x += dx;
            this.y += dy;
            return true;
        }
        let moved = false;
        if (dx !== 0 && !board.isPositionBlocked(this.x + dx, this.y, this.radius, 0)) {
            this.x += dx;
            moved = true;
        }
        if (dy !== 0 && !board.isPositionBlocked(this.x, this.y + dy, this.radius, 0)) {
            this.y += dy;
            moved = true;
        }
        return moved;
    }
}

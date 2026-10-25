/**
 * @fileoverview Entidad Jugador y Compañeros IA (CompanionHero):
 * Movimiento 2.5D, física en eje Z (salto/dash), combate en arco estilo Zelda: ALttP,
 * trabajo en equipo de los 4 héroes, personalidad loca del Enano y jerarquía de velocidades.
 * Capa 3: Depende de constants.js, heroesData.js y EventBus.js.
 */

import { GRAVITY, TILE, FOG, EVENTS } from '../config/constants.js';
import { HEROES_DATA } from '../config/heroesData.js';
import { eventBus } from '../core/EventBus.js';

export class Player {
    /**
     * @param {string} heroId - 'barbarian' | 'dwarf' | 'elf' | 'wizard'
     * @param {number} startX
     * @param {number} startY
     * @param {boolean} [isAI=false]
     */
    constructor(heroId, startX, startY, isAI = false) {
        const template = HEROES_DATA[heroId] || HEROES_DATA.barbarian;

        this.heroId = template.id;
        this.name = template.name;
        this.title = template.title;
        this.isAI = isAI;
        this.colors = { ...template.colors };
        this.voice = { ...template.voice };
        this.quotes = template.quotes;
        this.skillData = { ...template.skill };

        // Posición y física 2.5D
        this.x = startX;
        this.y = startY;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.radius = 13.5;

        // Estadísticas base y actuales
        this.maxHp = template.stats.maxHp;
        this.hp = this.maxHp;
        this.maxStamina = template.stats.maxStamina;
        this.stamina = this.maxStamina;
        this.baseSpeed = isAI ? template.stats.aiSpeed : template.stats.speed;
        this.aiSpeed = template.stats.aiSpeed;
        this.baseDamage = template.stats.attackDamage;
        this.baseAttackRange = template.stats.attackRange;
        this.attackRange = template.stats.attackRange;
        this.attackArc = template.stats.attackArc;
        this.attackCooldownMax = template.stats.attackCooldown;
        this.baseCritChance = template.stats.critChance;
        this.critChance = template.stats.critChance;
        this.baseDefense = template.stats.defense;

        // Progreso, Oro, Inventario, Mejoras de la Armería y Recompensas de Misiones Secundarias
        this.gold = 60;
        this.kills = 0;
        this.weaponLevel = 1;
        this.armorLevel = 1;
        this.equippedWeapon = null;
        this.questWeaponBonusDamage = 0;
        this.questDefenseBonus = 0;
        this.secondSkillUnlocked = false;
        this.secondSkillCooldownTimer = 0;
        this.passiveRegenUnlocked = false;
        this.inventory = {
            healPotions: template.startingItems.healPotions,
            strengthPotions: template.startingItems.strengthPotions,
            speedPotions: template.startingItems.speedPotions
        };

        // Temporizadores de combate y estados
        this.aimAngle = 0;
        this.facingX = 1;
        this.attackTimer = 0;
        this.attackAnimTimer = 0;
        this.skillCooldownTimer = 0;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashDirX = 0;
        this.dashDirY = 0;
        this.invulnerableTimer = 0;
        this.hurtFlashTimer = 0;

        // Buffs temporales de pociones
        this.strengthBuffTimer = 0;
        this.speedBuffTimer = 0;

        // Animación de miniatura (balanceo al caminar)
        this.walkPhase = Math.random() * Math.PI * 2;
        this.stepTimer = 0;
        this.isMoving = false;
        this.dead = false;
        this.downedTimer = 0;
    }

    get effectiveDamage() {
        const weaponBonus = (this.weaponLevel - 1) * 8 + (this.questWeaponBonusDamage || 0);
        const mult = this.strengthBuffTimer > 0 ? 1.5 : 1.0;
        return Math.round((this.baseDamage + weaponBonus) * mult);
    }

    get effectiveDefense() {
        return this.baseDefense + (this.armorLevel - 1) * 3 + (this.questDefenseBonus || 0);
    }

    /**
     * Equipa un Arma Legendaria desbloqueada en Misiones Secundarias.
     * @param {Object} weaponObj
     */
    equipSpecialWeapon(weaponObj) {
        if (!weaponObj || typeof weaponObj !== 'object') return;
        this.equippedWeapon = weaponObj;
        this.questWeaponBonusDamage = Math.max(this.questWeaponBonusDamage || 0, weaponObj.bonusDamage || 0);
        this.critChance = Math.min(0.65, this.baseCritChance + (weaponObj.bonusCrit || 0));
        this.attackRange = this.baseAttackRange + (weaponObj.bonusRange || 0);
        if (weaponObj.slashColor) {
            this.colors.slashColor = weaponObj.slashColor;
        }
    }

    get effectiveSpeed() {
        if (this.isAI) {
            // En modo automático se respeta estrictamente: Mago (126) < Enano (148) < Bárbaro (182) < Elfo (205)
            return this.aiSpeed;
        }
        const mult = this.speedBuffTimer > 0 ? 1.35 : 1.0;
        return this.baseSpeed * mult;
    }

    /**
     * Actualiza física 2.5D, entradas, ataques y temporizadores del héroe controlado por el jugador.
     * @param {number} dt
     * @param {{ input: Object, board: Object, monsters: Array, interaction: Object, companions?: Array }} context
     */
    update(dt, { input, board, monsters, interaction, companions = [] }) {
        if (this.dead) return;

        this._updateCommonTimers(dt);

        // 1. Orientación hacia el cursor del ratón en el mundo
        const dxMouse = input.mouse.worldX - this.x;
        const dyMouse = input.mouse.worldY - (this.y - this.z);
        this.aimAngle = Math.atan2(dyMouse, dxMouse);
        if (Math.abs(dxMouse) > 2) {
            this.facingX = dxMouse >= 0 ? 1 : -1;
        }

        // 2. Salto en el eje Z (Barra Espaciadora)
        if (input.isJumpJustPressed() && this.z <= 0.5 && this.stamina >= 10) {
            this.vz = 345;
            this.stamina -= 10;
            eventBus.emit(EVENTS.PLAYER_JUMP, { x: this.x, y: this.y });
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: this.x,
                y: this.y,
                z: 2,
                count: 8,
                color: '#d6d3d1'
            });
        }

        this._integrateZPhysics(dt);

        // 3. Dash evasivo (Shift)
        const moveVec = input.getMovementVector();
        if (
            input.isDashJustPressed() &&
            this.dashCooldownTimer <= 0 &&
            this.stamina >= 18
        ) {
            this.stamina -= 18;
            this.dashTimer = 0.16;
            this.dashCooldownTimer = 0.55;
            this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.22);

            if (moveVec.x !== 0 || moveVec.y !== 0) {
                this.dashDirX = moveVec.x;
                this.dashDirY = moveVec.y;
            } else {
                this.dashDirX = Math.cos(this.aimAngle);
                this.dashDirY = Math.sin(this.aimAngle);
            }

            eventBus.emit(EVENTS.PLAYER_DASH, { x: this.x, y: this.y });
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: this.x,
                y: this.y,
                z: this.z + 10,
                count: 12,
                color: this.colors.slashColor
            });
        }

        // 4. Movimiento en el plano XY con deslizamiento suave en esquinas
        let desiredVx = 0;
        let desiredVy = 0;

        if (this.dashTimer > 0) {
            this.dashTimer = Math.max(0, this.dashTimer - dt);
            const dashSpeed = this.effectiveSpeed * 2.65;
            desiredVx = this.dashDirX * dashSpeed;
            desiredVy = this.dashDirY * dashSpeed;
        } else {
            desiredVx = moveVec.x * this.effectiveSpeed;
            desiredVy = moveVec.y * this.effectiveSpeed;
        }

        this._moveWithCollisions(desiredVx * dt, desiredVy * dt, board);

        this.isMoving = Math.hypot(desiredVx, desiredVy) > 5;
        if (this.isMoving && this.z <= 1) {
            this.walkPhase += dt * 13;
            this.stepTimer += dt;
            if (this.stepTimer >= 0.32) {
                this.stepTimer = 0;
                eventBus.emit(EVENTS.PLAYER_STEP, { x: this.x, y: this.y });
            }
        } else {
            this.walkPhase *= 0.85;
        }

        // Comprobar si el héroe ha entrado en una sala nueva
        if (interaction && board) {
            const col = Math.floor(this.x / TILE);
            const row = Math.floor(this.y / TILE);
            const room = board.getRoomAt(col, row);
            if (room && !room.discovered) {
                interaction.checkRoomDiscovery(room.id, board);
            }
        }

        // 5. Combate Directo: Ataque Principal en Arco (Click Izquierdo)
        if (input.isAttackRequested() && this.attackTimer <= 0) {
            this.performPrimaryAttack(monsters);
            if (interaction && board) {
                interaction.tryCutBushesNear(this, board, this.attackRange);
            }
        }

        // 6. Habilidad Especial de Clase (Click Derecho o Tecla Q)
        if (input.isSkillJustPressed() && this.skillCooldownTimer <= 0) {
            this.performSpecialSkill(monsters, [this, ...companions]);
            if (interaction && board) {
                interaction.tryCutBushesNear(this, board, this.skillData.radius);
            }
        }

        // 7. Segunda Habilidad Especial de Misión Secundaria (Tecla F: Tempestad de Loretome)
        if (input.isSecondSkillJustPressed && input.isSecondSkillJustPressed()) {
            this.performSecondSkill(monsters, [this, ...companions]);
            if (interaction && board && this.secondSkillUnlocked) {
                interaction.tryCutBushesNear(this, board, 135);
            }
        }

        this.emitUpdate();
    }

    _updateCommonTimers(dt) {
        if (this.attackTimer > 0) this.attackTimer = Math.max(0, this.attackTimer - dt);
        if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
        if (this.skillCooldownTimer > 0) this.skillCooldownTimer = Math.max(0, this.skillCooldownTimer - dt);
        if (this.secondSkillCooldownTimer > 0) this.secondSkillCooldownTimer = Math.max(0, this.secondSkillCooldownTimer - dt);
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
        if (this.invulnerableTimer > 0) this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
        if (this.hurtFlashTimer > 0) this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt);
        if (this.strengthBuffTimer > 0) this.strengthBuffTimer = Math.max(0, this.strengthBuffTimer - dt);
        if (this.speedBuffTimer > 0) this.speedBuffTimer = Math.max(0, this.speedBuffTimer - dt);

        // Habilidad pasiva desbloqueable en Misión IV: Sangre Silvana (+2.8 Vida/s y +8 Stamina/s extra)
        if (this.passiveRegenUnlocked && !this.dead && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 2.8 * dt);
        }

        const stamRegen = (this.speedBuffTimer > 0 ? 32 : 24) + (this.passiveRegenUnlocked ? 8 : 0);
        if (this.dashTimer <= 0 && this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + stamRegen * dt);
        }
    }

    _integrateZPhysics(dt) {
        if (this.z > 0 || this.vz !== 0) {
            this.z += this.vz * dt;
            this.vz -= GRAVITY * dt;
            if (this.z <= 0) {
                this.z = 0;
                this.vz = 0;
            }
        }
    }

    /**
     * Desplaza al héroe resolviendo colisiones separadas por eje + asistencia de deslizamiento en esquinas.
     */
    _moveWithCollisions(dx, dy, board) {
        if (!board) {
            this.x += dx;
            this.y += dy;
            return;
        }

        if (dx !== 0) {
            if (!board.isPositionBlocked(this.x + dx, this.y, this.radius, this.z)) {
                this.x += dx;
            } else {
                const slide = Math.abs(dx) * 0.65;
                if (!board.isPositionBlocked(this.x + dx, this.y - slide, this.radius, this.z)) {
                    this.x += dx * 0.5;
                    this.y -= slide;
                } else if (!board.isPositionBlocked(this.x + dx, this.y + slide, this.radius, this.z)) {
                    this.x += dx * 0.5;
                    this.y += slide;
                }
            }
        }

        if (dy !== 0) {
            if (!board.isPositionBlocked(this.x, this.y + dy, this.radius, this.z)) {
                this.y += dy;
            } else {
                const slide = Math.abs(dy) * 0.65;
                if (!board.isPositionBlocked(this.x - slide, this.y + dy, this.radius, this.z)) {
                    this.x -= slide;
                    this.y += dy * 0.5;
                } else if (!board.isPositionBlocked(this.x + slide, this.y + dy, this.radius, this.z)) {
                    this.x += slide;
                    this.y += dy * 0.5;
                }
            }
        }
    }

    /**
     * Ejecuta el ataque en arco estilo Zelda: A Link to the Past.
     * @param {Array} monsters
     */
    performPrimaryAttack(monsters = []) {
        this.attackTimer = this.attackCooldownMax;
        this.attackAnimTimer = 0.22;

        eventBus.emit(EVENTS.PLAYER_ATTACK, {
            x: this.x,
            y: this.y,
            z: this.z,
            angle: this.aimAngle,
            arc: this.attackArc,
            range: this.attackRange,
            color: this.colors.slashColor
        });

        eventBus.emit(EVENTS.SLASH_FX, {
            x: this.x,
            y: this.y,
            z: this.z + 16,
            angle: this.aimAngle,
            arc: this.attackArc,
            radius: this.attackRange,
            color: this.colors.slashColor
        });

        let hitAny = false;
        for (const monster of monsters) {
            if (monster.dead) continue;
            const dx = monster.x - this.x;
            const dy = monster.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist <= this.attackRange + monster.radius) {
                const angleToMonster = Math.atan2(dy, dx);
                const angleDiff = Math.abs(normalizeAngle(angleToMonster - this.aimAngle));

                if (angleDiff <= this.attackArc * 0.55 || dist < this.radius + monster.radius + 10) {
                    const isCrit = Math.random() < this.critChance;
                    const dmg = Math.round(this.effectiveDamage * (isCrit ? 1.55 : 1.0));
                    monster.takeDamage(dmg, this.x, this.y, isCrit, 200);
                    hitAny = true;
                }
            }
        }

        if (hitAny && !this.isAI) {
            eventBus.emit(EVENTS.CAMERA_SHAKE, { intensity: 4.5, duration: 0.12 });
        }

        // Grito de combate ocasional en bocadillo cómic
        const bubbleChance = this.heroId === 'dwarf' ? 0.28 : 0.14;
        if (Math.random() < bubbleChance && this.quotes.attack.length > 0) {
            const line = this.quotes.attack[Math.floor(Math.random() * this.quotes.attack.length)];
            eventBus.emit(EVENTS.BUBBLE_SHOW, {
                entity: this,
                text: line,
                duration: 1.7,
                style: 'hero'
            });
        }
    }

    /**
     * Ejecuta la habilidad especial activa de la clase del héroe.
     * @param {Array} monsters
     * @param {Array} [party=[]]
     */
    performSpecialSkill(monsters = [], party = []) {
        const cost = this.skillData.staminaCost;
        if (this.stamina < cost) {
            if (!this.isAI) {
                eventBus.emit(EVENTS.FLOATING_TEXT, {
                    x: this.x,
                    y: this.y,
                    z: 42,
                    text: '¡Sin Stamina!',
                    color: '#f87171'
                });
            }
            return;
        }

        this.stamina -= cost;
        this.skillCooldownTimer = this.skillData.cooldown;
        this.attackAnimTimer = 0.35;

        const skillRadius = this.skillData.radius;
        const dmg = Math.round(this.effectiveDamage * this.skillData.damageMultiplier);

        eventBus.emit(EVENTS.PLAYER_SKILL, {
            heroId: this.heroId,
            skillName: this.skillData.name,
            x: this.x,
            y: this.y,
            radius: skillRadius
        });

        eventBus.emit(EVENTS.MAGIC_FX, {
            x: this.x,
            y: this.y,
            z: this.z + 10,
            radius: skillRadius,
            color: this.colors.slashColor
        });

        if (!this.isAI) {
            eventBus.emit(EVENTS.CAMERA_SHAKE, { intensity: 8, duration: 0.24 });
        }

        eventBus.emit(EVENTS.BUBBLE_SHOW, {
            entity: this,
            text: `¡${this.skillData.name.toUpperCase()}!`,
            duration: 1.9,
            style: 'skill'
        });

        // El Elfo sana a todo el grupo cercano con su Viento Silvano
        if (this.heroId === 'elf') {
            const targets = party.length > 0 ? party : [this];
            for (const member of targets) {
                if (!member.dead && Math.hypot(member.x - this.x, member.y - this.y) <= 180) {
                    member.heal(18, true);
                }
            }
        }

        for (const monster of monsters) {
            if (monster.dead) continue;
            const dist = Math.hypot(monster.x - this.x, monster.y - this.y);
            if (dist <= skillRadius + monster.radius) {
                monster.takeDamage(dmg, this.x, this.y, true, 300);
            }
        }
    }

    /**
     * Ejecuta la 2.ª Habilidad Especial desbloqueable en Misiones Secundarias:
     * «Tempestad de Loretome» [Tecla F] (Rayos arcanos en área + curación al grupo).
     * @param {Array} monsters
     * @param {Array} [party=[]]
     */
    performSecondSkill(monsters = [], party = []) {
        if (!this.secondSkillUnlocked) {
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.x,
                y: this.y,
                z: 44,
                text: '🔒 Completa la Misión III de la Archimaga Lyra [J]',
                color: '#c084fc'
            });
            return;
        }
        if (this.secondSkillCooldownTimer > 0) return;

        const cost = 25;
        if (this.stamina < cost) {
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.x,
                y: this.y,
                z: 42,
                text: '¡Sin Stamina (25)!',
                color: '#f87171'
            });
            return;
        }

        this.stamina -= cost;
        this.secondSkillCooldownTimer = 5.0;
        this.attackAnimTimer = 0.38;

        const radius = 140;
        const dmg = Math.round(this.effectiveDamage * 2.15);

        eventBus.emit(EVENTS.PLAYER_SKILL, {
            heroId: this.heroId,
            skillName: 'Tempestad de Loretome',
            x: this.x,
            y: this.y,
            radius
        });

        eventBus.emit(EVENTS.MAGIC_FX, {
            x: this.x,
            y: this.y,
            z: this.z + 18,
            radius,
            color: '#38bdf8'
        });

        eventBus.emit(EVENTS.MAGIC_FX, {
            x: this.x,
            y: this.y,
            z: this.z + 28,
            radius: radius * 0.65,
            color: '#facc15'
        });

        eventBus.emit(EVENTS.CAMERA_SHAKE, { intensity: 10, duration: 0.28 });

        eventBus.emit(EVENTS.BUBBLE_SHOW, {
            entity: this,
            text: '⚡ ¡TEMPESTAD DE LORETOME!',
            duration: 2.2,
            style: 'skill'
        });

        // Restaurar salud al grupo
        const targets = party.length > 0 ? party : [this];
        for (const member of targets) {
            if (member && !member.dead) {
                member.heal(24, true);
            }
        }

        for (const monster of monsters) {
            if (monster.dead) continue;
            const dist = Math.hypot(monster.x - this.x, monster.y - this.y);
            if (dist <= radius + monster.radius) {
                monster.takeDamage(dmg, this.x, this.y, true, 340);
                eventBus.emit(EVENTS.PARTICLE_BURST, {
                    x: monster.x,
                    y: monster.y,
                    z: 22,
                    count: 16,
                    color: '#38bdf8'
                });
            }
        }
    }

    /**
     * Usa uno de los 3 slots rápidos de pociones (Teclas 1, 2, 3).
     * @param {number} slot - 1 | 2 | 3
     * @param {Array} [companions=[]]
     */
    useItemSlot(slot, companions = []) {
        if (this.dead) return;

        if (slot === 1) {
            if (this.inventory.healPotions <= 0) {
                this._notifyNoItem('Sin Pociones Curativas');
                return;
            }
            this.inventory.healPotions--;
            this.heal(55);
            // También sana levemente a los compañeros cercanos por trabajo en equipo
            for (const ally of companions) {
                if (!ally.dead) ally.heal(25, true);
            }
        } else if (slot === 2) {
            if (this.inventory.strengthPotions <= 0) {
                this._notifyNoItem('Sin Pociones de Fuerza');
                return;
            }
            this.inventory.strengthPotions--;
            this.strengthBuffTimer = 14.0;
            for (const ally of companions) {
                ally.strengthBuffTimer = 14.0;
            }
            eventBus.emit(EVENTS.PLAYER_HEALED, { amount: 0 });
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.x,
                y: this.y,
                z: 45,
                text: '¡FURIA DE GRUPO (+50% ATQ)!',
                color: '#f59e0b'
            });
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: this.x,
                y: this.y,
                z: 16,
                count: 18,
                color: '#f59e0b'
            });
        } else if (slot === 3) {
            if (this.inventory.speedPotions <= 0) {
                this._notifyNoItem('Sin Pociones de Velocidad');
                return;
            }
            this.inventory.speedPotions--;
            this.speedBuffTimer = 14.0;
            this.stamina = this.maxStamina;
            eventBus.emit(EVENTS.PLAYER_HEALED, { amount: 0 });
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.x,
                y: this.y,
                z: 45,
                text: '¡VIENTO VELOZ (+35% VEL)!',
                color: '#38bdf8'
            });
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: this.x,
                y: this.y,
                z: 16,
                count: 18,
                color: '#38bdf8'
            });
        }

        this.emitUpdate();
    }

    _notifyNoItem(msg) {
        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: this.x,
            y: this.y,
            z: 40,
            text: msg,
            color: '#94a3b8'
        });
    }

    /**
     * Restaura puntos de vida al héroe.
     * @param {number} amount
     * @param {boolean} [silent=false]
     */
    heal(amount, silent = false) {
        if (this.dead) {
            this.dead = false;
            this.downedTimer = 0;
        }
        const prev = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        const gained = this.hp - prev;

        if (gained > 0 || !silent) {
            if (!silent && !this.isAI) {
                eventBus.emit(EVENTS.PLAYER_HEALED, { amount: gained });
            }
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.x,
                y: this.y,
                z: 45,
                text: `+${gained || amount} VIDA`,
                color: '#4ade80'
            });
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: this.x,
                y: this.y,
                z: 16,
                count: 12,
                color: '#4ade80'
            });
        }
        if (!this.isAI) {
            this.emitUpdate();
        } else {
            eventBus.emit(EVENTS.PARTY_UPDATED);
        }
    }

    /**
     * Aplica daño al héroe considerando su defensa e invulnerabilidad temporal.
     * @param {number} rawDamage
     * @param {number} sourceX
     * @param {number} sourceY
     */
    takeDamage(rawDamage, sourceX, sourceY) {
        if (this.dead || this.invulnerableTimer > 0) return;

        if (this.z > 28) {
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.x,
                y: this.y,
                z: this.z + 30,
                text: '¡ESQUIVADO!',
                color: '#38bdf8'
            });
            return;
        }

        const finalDamage = Math.max(2, rawDamage - this.effectiveDefense);
        this.hp = Math.max(0, this.hp - finalDamage);
        this.invulnerableTimer = 0.50;
        this.hurtFlashTimer = 0.24;

        const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
        this.vz = Math.max(this.vz, 125);

        if (!this.isAI) {
            eventBus.emit(EVENTS.PLAYER_DAMAGED, {
                damage: finalDamage,
                hp: this.hp,
                maxHp: this.maxHp,
                angle
            });
            eventBus.emit(EVENTS.CAMERA_SHAKE, { intensity: 7, duration: 0.20 });
        }

        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: this.x,
            y: this.y,
            z: 16,
            count: 12,
            color: '#ef4444'
        });

        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: this.x,
            y: this.y,
            z: 42,
            text: `-${finalDamage}`,
            color: '#ef4444'
        });

        if (this.hp <= 0) {
            this.dead = true;
            if (!this.isAI) {
                eventBus.emit(EVENTS.GAME_DEFEAT, { player: this });
            } else {
                // Los compañeros IA caen heridos temporalmente y se recuperan tras unos segundos
                this.downedTimer = 9.0;
                eventBus.emit(EVENTS.BUBBLE_SHOW, {
                    entity: this,
                    text: '¡Necesito recuperar el aliento...!',
                    duration: 2.5,
                    style: 'hero'
                });
            }
        }

        if (!this.isAI) {
            this.emitUpdate();
        } else {
            eventBus.emit(EVENTS.PARTY_UPDATED);
        }
    }

    emitUpdate() {
        eventBus.emit(EVENTS.PLAYER_UPDATED, { player: this });
    }
}

/**
 * Compañero Héroe controlado por IA táctica cooperativa.
 * Respeta velocidades automáticas: Mago (más lento) < Enano (2º más lento) < Bárbaro < Elfo.
 */
export class CompanionHero extends Player {
    /**
     * @param {string} heroId
     * @param {number} startX
     * @param {number} startY
     * @param {number} slotIndex - 0 | 1 | 2 (posición en formación)
     */
    constructor(heroId, startX, startY, slotIndex = 0) {
        super(heroId, startX, startY, true);
        this.slotIndex = slotIndex;
        this.crazyChatterTimer = 4.0 + Math.random() * 5.0;
        this.jumpTimer = 2.0 + Math.random() * 3.0;
    }

    /**
     * Actualiza la IA táctica cooperativa del compañero héroe.
     * @param {number} dt
     * @param {{ leader: Player, companions: Array<CompanionHero>, board: Object, monsters: Array, hasLOS: Function }} context
     */
    updateAI(dt, { leader, companions, board, monsters, hasLOS }) {
        // Si cayó agotado, se recupera tras su temporizador para seguir ayudando al equipo
        if (this.dead) {
            this.downedTimer -= dt;
            if (this.downedTimer <= 0) {
                this.dead = false;
                this.hp = Math.round(this.maxHp * 0.5);
                this.x = leader.x + (Math.random() - 0.5) * 32;
                this.y = leader.y + (Math.random() - 0.5) * 32;
                eventBus.emit(EVENTS.FLOATING_TEXT, {
                    x: this.x,
                    y: this.y,
                    z: 42,
                    text: `¡${this.name} vuelve al combate!`,
                    color: '#4ade80'
                });
                eventBus.emit(EVENTS.PARTY_UPDATED);
            }
            return;
        }

        this._updateCommonTimers(dt);
        this._integrateZPhysics(dt);

        // Sincronizar nivel de forja y armadura con el líder
        this.weaponLevel = leader.weaponLevel;
        this.armorLevel = leader.armorLevel;

        const party = [leader, ...companions];

        // 1. COMPORTAMIENTO ESPECIAL DEL ENANO LOCO: Detectar y desactivar trampas + saltos dementes
        if (this.heroId === 'dwarf') {
            this._updateCrazyDwarfBehavior(dt, board);
        }

        // 2. COMPORTAMIENTO DE APOYO DEL ELFO: Sanar al grupo si alguien está herido (< 70% HP)
        if (this.heroId === 'elf' && this.skillCooldownTimer <= 0 && this.stamina >= this.skillData.staminaCost) {
            const injuredAlly = party.find((m) => !m.dead && m.hp < m.maxHp * 0.72);
            if (injuredAlly && Math.hypot(injuredAlly.x - this.x, injuredAlly.y - this.y) <= 165) {
                this.performSpecialSkill(monsters, party);
            }
        }

        // 3. SELECCIÓN TÁCTICA DE OBJETIVO ENEMIGO
        const target = this._selectTacticalTarget(leader, party, monsters, board, hasLOS);

        let moveX = 0;
        let moveY = 0;

        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.aimAngle = Math.atan2(dy, dx);
            this.facingX = dx >= 0 ? 1 : -1;

            if (this.heroId === 'wizard') {
                // EL MAGO: Artillería pesada de retaguardia (mantiene distancia segura de 95-155px)
                const desiredMin = 88;
                const desiredMax = 152;
                if (dist < desiredMin) {
                    // Retroceder mientras dispara
                    moveX = -(dx / dist);
                    moveY = -(dy / dist);
                } else if (dist > desiredMax) {
                    moveX = dx / dist;
                    moveY = dy / dist;
                }

                // Ataque arcano a distancia
                if (dist <= 168 && this.attackTimer <= 0) {
                    this._performWizardRangedBolt(target, monsters);
                }
                if (dist <= this.skillData.radius && this.skillCooldownTimer <= 0) {
                    this.performSpecialSkill(monsters, party);
                }
            } else {
                // BÁRBARO, ENANO Y ELFO: Combate cuerpo a cuerpo coordinado
                const engageDist = this.attackRange * 0.78;
                if (dist > engageDist) {
                    moveX = dx / dist;
                    moveY = dy / dist;
                } else if (this.heroId === 'elf') {
                    // El Elfo orbita lateralmente para flanquear
                    const perp = this.aimAngle + Math.PI * 0.5;
                    moveX = Math.cos(perp) * 0.6;
                    moveY = Math.sin(perp) * 0.6;
                }

                // Ejecutar ataque en arco cuando está al alcance
                if (dist <= this.attackRange + target.radius && this.attackTimer <= 0) {
                    this.performPrimaryAttack(monsters);
                }

                // Usar habilidad especial si hay varios enemigos cerca o contra el Jefe Gárgola
                const nearbyEnemies = monsters.filter(
                    (m) => !m.dead && Math.hypot(m.x - this.x, m.y - this.y) <= this.skillData.radius
                ).length;

                if (
                    this.skillCooldownTimer <= 0 &&
                    (nearbyEnemies >= 2 || (target.isBoss && dist <= this.skillData.radius))
                ) {
                    this.performSpecialSkill(monsters, party);
                }
            }
        } else {
            // 4. FORMACIÓN DE EQUIPO CUANDO NO HAY COMBATE INMEDIATO
            const formAngles = [-Math.PI * 0.75, Math.PI * 0.75, Math.PI];
            const formDist = this.heroId === 'wizard' ? 68 : 50;
            const targetFormX = leader.x + Math.cos(formAngles[this.slotIndex % 3]) * formDist;
            const targetFormY = leader.y + Math.sin(formAngles[this.slotIndex % 3]) * formDist;

            const dx = targetFormX - this.x;
            const dy = targetFormY - this.y;
            const distToSlot = Math.hypot(dx, dy);

            // Si un compañero quedó muy atrás atrapado tras un recodo (> 460px), reagrupar
            const distToLeader = Math.hypot(leader.x - this.x, leader.y - this.y);
            if (distToLeader > 480) {
                this.x = leader.x + (Math.random() - 0.5) * 40;
                this.y = leader.y + (Math.random() - 0.5) * 40;
            } else if (distToSlot > 18) {
                moveX = dx / distToSlot;
                moveY = dy / distToSlot;
                this.facingX = dx >= 0 ? 1 : -1;
                this.aimAngle = Math.atan2(dy, dx);
            }
        }

        // 5. Separación suave entre miembros del grupo para no apilarse en la misma baldosa
        for (const other of party) {
            if (other === this || other.dead) continue;
            const odx = this.x - other.x;
            const ody = this.y - other.y;
            const odist = Math.hypot(odx, ody);
            const minSep = this.radius + other.radius + 8;
            if (odist > 0 && odist < minSep) {
                const push = (minSep - odist) / minSep;
                moveX += (odx / odist) * push * 0.9;
                moveY += (ody / odist) * push * 0.9;
            }
        }

        const moveLen = Math.hypot(moveX, moveY);
        if (moveLen > 0.05) {
            const normX = moveX / Math.max(1, moveLen);
            const normY = moveY / Math.max(1, moveLen);
            const spd = this.effectiveSpeed; // Mago: 126, Enano: 148, Bárbaro: 182, Elfo: 205
            this._moveWithCollisions(normX * spd * dt, normY * spd * dt, board);
            this.isMoving = true;
            this.walkPhase += dt * (spd / 15);
        } else {
            this.isMoving = false;
            this.walkPhase *= 0.85;
        }
    }

    /**
     * Comportamiento característico del Enano ("un poco loco"):
     * - Salta salvajemente en combate
     * - Grita ocurrencias desquiciadas
     * - Detecta y desmonta trampas cercanas a martillazos
     */
    _updateCrazyDwarfBehavior(dt, board) {
        this.crazyChatterTimer -= dt;
        this.jumpTimer -= dt;

        if (this.jumpTimer <= 0 && this.z <= 0.5) {
            this.jumpTimer = 2.6 + Math.random() * 2.8;
            this.vz = 290;
        }

        if (this.crazyChatterTimer <= 0) {
            this.crazyChatterTimer = 6.5 + Math.random() * 6.0;
            const pool = this.quotes.crazy || this.quotes.attack;
            const line = pool[Math.floor(Math.random() * pool.length)];
            eventBus.emit(EVENTS.BUBBLE_SHOW, {
                entity: this,
                text: line,
                duration: 2.3,
                style: 'hero'
            });
        }

        // El Enano busca y desactiva trampas cercanas automáticamente
        if (board && board.traps) {
            for (const trap of board.traps) {
                if (trap.state === 'hidden' || trap.state === 'detected') {
                    const d = Math.hypot(trap.x - this.x, trap.y - this.y);
                    if (d <= 84) {
                        trap.state = 'disarmed';
                        const disarmLines = this.quotes.trapDisarm || ['¡Trampa desmontada a martillazos!'];
                        const line = disarmLines[Math.floor(Math.random() * disarmLines.length)];

                        eventBus.emit(EVENTS.TRAP_DISARMED, { trap, hero: this });
                        eventBus.emit(EVENTS.PARTICLE_BURST, {
                            x: trap.x,
                            y: trap.y,
                            z: 10,
                            count: 16,
                            color: '#facc15'
                        });
                        eventBus.emit(EVENTS.FLOATING_TEXT, {
                            x: trap.x,
                            y: trap.y,
                            z: 36,
                            text: `🛠️ ¡Enano desactiva ${trap.name}!`,
                            color: '#fde047'
                        });
                        eventBus.emit(EVENTS.BUBBLE_SHOW, {
                            entity: this,
                            text: line,
                            duration: 2.5,
                            style: 'hero'
                        });
                    }
                }
            }
        }
    }

    /**
     * Elige el objetivo enemigo más lógico trabajando en equipo.
     */
    _selectTacticalTarget(leader, party, monsters, board, hasLOS) {
        let bestMonster = null;
        let bestScore = -Infinity;

        for (const m of monsters) {
            if (m.dead) continue;

            const distToLeader = Math.hypot(m.x - leader.x, m.y - leader.y);
            const distToSelf = Math.hypot(m.x - this.x, m.y - this.y);
            if (distToLeader > 310 && distToSelf > 260) continue;

            const col = Math.floor(m.x / TILE);
            const row = Math.floor(m.y / TILE);
            const isVis = board?.fog?.[row]?.[col] === FOG.VISIBLE;
            if (!isVis && m.state === 'PATROL') continue;

            if (hasLOS && !hasLOS(board, this.x, this.y, m.x, m.y)) continue;

            let score = 300 - distToSelf;

            // El Bárbaro prioriza proteger al Mago o atacar al Jefe
            if (this.heroId === 'barbarian') {
                const wizard = party.find((p) => p.heroId === 'wizard' && !p.dead);
                if (wizard && Math.hypot(m.x - wizard.x, m.y - wizard.y) < 110) {
                    score += 140;
                }
                if (m.isBoss) score += 90;
            }

            // El Enano loco se lanza a por el enemigo más cercano sin pensarlo
            if (this.heroId === 'dwarf') {
                score = 400 - distToSelf * 1.4;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMonster = m;
            }
        }

        return bestMonster;
    }

    /**
     * Ataque ígneo a distancia del Mago en modo cooperativo.
     */
    _performWizardRangedBolt(target, monsters) {
        this.attackTimer = this.attackCooldownMax * 1.35;
        this.attackAnimTimer = 0.25;

        eventBus.emit(EVENTS.SLASH_FX, {
            x: this.x,
            y: this.y,
            z: this.z + 16,
            angle: this.aimAngle,
            arc: Math.PI * 0.45,
            radius: 44,
            color: '#38bdf8'
        });

        // Impacto arcano sobre el objetivo y chispas alrededor
        eventBus.emit(EVENTS.MAGIC_FX, {
            x: target.x,
            y: target.y,
            z: 14,
            radius: 38,
            color: '#38bdf8'
        });

        const isCrit = Math.random() < this.critChance;
        const dmg = Math.round(this.effectiveDamage * (isCrit ? 1.5 : 1.0));
        target.takeDamage(dmg, this.x, this.y, isCrit, 140);
    }
}

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

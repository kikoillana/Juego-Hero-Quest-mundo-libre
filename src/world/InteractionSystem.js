/**
 * @fileoverview Sistema de interacción contextual con puertas, cofres, muebles clásicos,
 * Escalera Imperial de salida al Bosque Exterior, Portales de entrada a las 4 Mazmorras,
 * Hoguera Curativa del Campamento, Forja Real, Carteles de caminos y Arbustos cortables estilo Zelda.
 * Capa 3: Depende de constants.js, dialoguesData.js y EventBus.js.
 */

import {
    FURNITURE_TYPE,
    LOOT_TYPE,
    EVENTS
} from '../config/constants.js';
import {
    FURNITURE_INSPECTIONS
} from '../config/dialoguesData.js';
import { eventBus } from '../core/EventBus.js';

export class InteractionSystem {
    constructor() {
        this.interactionRange = 76;
        this.portalRange = 94;
        this.activeHighlight = null;
    }

    /**
     * Busca el objeto interactuable más cercano al jugador para mostrar indicador contextual [E].
     * @param {Object} player
     * @param {Object} board
     * @returns {Object|null}
     */
    findNearestInteractable(player, board) {
        if (!player || !board) return null;

        let best = null;
        let bestDist = this.interactionRange;

        // 0A. Escalera Imperial en Mazmorras -> Salir al Bosque de Loretome (Mundo Libre)
        if (board.exitStairs) {
            const st = board.exitStairs;
            const d = Math.hypot(player.x - st.x, player.y - st.y);
            if (d < this.portalRange) {
                bestDist = d;
                best = {
                    kind: 'exit_stairs',
                    target: st,
                    x: st.x,
                    y: st.y - 6,
                    label: st.label || '🌲 [E / 0] Salir al Bosque (Mundo Libre)'
                };
            }
        }

        // 0B. Portales de Entrada a las 4 Mazmorras en el Bosque Exterior
        if (Array.isArray(board.portals)) {
            for (const portal of board.portals) {
                const d = Math.hypot(player.x - portal.x, player.y - (portal.y + 20));
                if (d < this.portalRange && d < bestDist + 18) {
                    bestDist = d;
                    best = {
                        kind: 'dungeon_portal',
                        target: portal,
                        x: portal.x,
                        y: portal.y - 12,
                        label: portal.requiresAllHeroes
                            ? `🏆 [E / 0] Entrar al Reto Final: ${portal.name}`
                            : `🏰 [E / 0] Entrar a ${portal.name}`
                    };
                }
            }
        }

        // 0C. NPCs Dadores de Misiones Secundarias en el Bosque Exterior
        if (Array.isArray(board.npcs)) {
            for (const npc of board.npcs) {
                const d = Math.hypot(player.x - npc.x, player.y - npc.y);
                if (d < bestDist + 10) {
                    bestDist = d;
                    best = {
                        kind: 'npc',
                        target: npc,
                        x: npc.x,
                        y: npc.y - 14,
                        label: `💬 [E / 0] Hablar con ${npc.name} (${npc.role})`
                    };
                }
            }
        }

        // 1. Comprobar puertas cerradas
        for (const door of board.doors) {
            if (door.open) continue;
            const d = Math.hypot(player.x - door.x, player.y - door.y);
            if (d < bestDist) {
                bestDist = d;
                best = {
                    kind: 'door',
                    target: door,
                    x: door.x,
                    y: door.y,
                    label: door.isBossDoor ? '[E / 0] Abrir Puerta del Santuario' : '[E / 0] Abrir Puerta'
                };
            }
        }

        // 2. Comprobar trampas detectadas cercanas para desactivarlas manualmente con [E / 0]
        if (board.traps) {
            for (const trap of board.traps) {
                if (trap.state === 'detected') {
                    const d = Math.hypot(player.x - trap.x, player.y - trap.y);
                    if (d < bestDist) {
                        bestDist = d;
                        best = {
                            kind: 'trap',
                            target: trap,
                            x: trap.x,
                            y: trap.y,
                            label: `[E / 0] Desactivar ${trap.name}`
                        };
                    }
                }
            }
        }

        // 3. Comprobar muebles, cofres, Jaula de Héroe y elementos de Misión Secundaria
        for (const furn of board.furniture) {
            const isReusable =
                furn.type === FURNITURE_TYPE.CAMPFIRE ||
                furn.type === FURNITURE_TYPE.ANVIL_STALL ||
                furn.type === FURNITURE_TYPE.SIGNPOST ||
                furn.type === FURNITURE_TYPE.QUEST_BOARD ||
                furn.type === FURNITURE_TYPE.WAYSTONE;

            if (furn.inspected && !isReusable) continue;

            const closestX = Math.max(furn.x, Math.min(player.x, furn.x + furn.width));
            const closestY = Math.max(furn.y, Math.min(player.y, furn.y + furn.height));
            const d = Math.hypot(player.x - closestX, player.y - closestY);

            if (d < bestDist) {
                bestDist = d;
                let label = `[E / 0] Registrar ${furn.name}`;
                let kind = 'furniture';

                if (furn.type === FURNITURE_TYPE.HERO_CAGE) {
                    kind = 'hero_cage';
                    label = `🔓 [E / 0] ¡Rescatar a ${furn.prisonerName || 'Héroe Cautivo'}!`;
                } else if (furn.type === FURNITURE_TYPE.QUEST_BOARD) {
                    kind = 'quest_board';
                    label = '📜 [E / 0] Abrir Tablón de Misiones y Rescates [J]';
                } else if (furn.type === FURNITURE_TYPE.WAYSTONE) {
                    kind = 'waystone';
                    label = '✨ [E / 0] Usar Piedra Rúnica de Viaje Rápido [J]';
                } else if (furn.type === FURNITURE_TYPE.METEOR_NODE) {
                    kind = 'meteor_node';
                    label = `☄️ [E / 0] Recoger ${furn.name}`;
                } else if (furn.type === FURNITURE_TYPE.CORRUPT_ALTAR) {
                    kind = 'corrupt_altar';
                    label = `🔮 [E / 0] Purificar ${furn.name}`;
                } else if (furn.type === FURNITURE_TYPE.MOONFLOWER) {
                    kind = 'moonflower';
                    label = `🌸 [E / 0] Recolectar ${furn.name}`;
                } else if (furn.type === FURNITURE_TYPE.CHEST) {
                    kind = 'chest';
                    label = `[E / 0] Abrir ${furn.name}`;
                } else if (furn.type === FURNITURE_TYPE.CAMPFIRE) {
                    kind = 'campfire';
                    label = '🔥 [E / 0] Descansar en Hoguera (Curar Grupo)';
                } else if (furn.type === FURNITURE_TYPE.ANVIL_STALL) {
                    kind = 'anvil_stall';
                    label = '⚒️ [E / 0] Abrir Forja Real (Armería)';
                } else if (furn.type === FURNITURE_TYPE.SIGNPOST) {
                    kind = 'signpost';
                    label = `🪧 [E / 0] Leer ${furn.name}`;
                } else if (furn.type === FURNITURE_TYPE.BUSH) {
                    kind = 'bush';
                    label = `🌿 [E / Click Izq] Cortar ${furn.name}`;
                }

                best = {
                    kind,
                    target: furn,
                    x: furn.centerX,
                    y: furn.y + 8,
                    label
                };
            }
        }

        this.activeHighlight = best;
        return best;
    }

    /**
     * Ejecuta la interacción contextual cuando el jugador pulsa la tecla [E / 0].
     * @param {Object} player
     * @param {Object} board
     * @returns {boolean} true si se realizó alguna interacción.
     */
    tryInteract(player, board) {
        const candidate = this.findNearestInteractable(player, board);
        if (!candidate) {
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: player.x,
                y: player.y,
                z: 40,
                text: 'Nada que registrar aquí',
                color: '#94a3b8'
            });
            return false;
        }

        if (candidate.kind === 'exit_stairs') {
            const st = candidate.target;
            eventBus.emit(EVENTS.ZONE_CHANGE_REQUEST, {
                targetZoneId: st.targetZoneId,
                fromZoneId: board.zoneId
            });
            return true;
        }

        if (candidate.kind === 'dungeon_portal') {
            const portal = candidate.target;
            eventBus.emit(EVENTS.ZONE_CHANGE_REQUEST, {
                targetZoneId: portal.targetZoneId,
                fromZoneId: board.zoneId,
                portalId: portal.id,
                portal
            });
            return true;
        }

        if (candidate.kind === 'npc') {
            const npc = candidate.target;
            eventBus.emit(EVENTS.NPC_INTERACT, { npc });
            return true;
        }

        if (candidate.kind === 'hero_cage') {
            const cage = candidate.target;
            cage.opened = true;
            cage.inspected = true;
            eventBus.emit(EVENTS.HERO_RESCUED, {
                heroId: cage.prisonerHeroId,
                cage
            });
            return true;
        }

        if (candidate.kind === 'quest_board' || candidate.kind === 'waystone') {
            eventBus.emit(EVENTS.TOGGLE_QUESTS);
            return true;
        }

        if (candidate.kind === 'meteor_node') {
            const furn = candidate.target;
            furn.opened = true;
            furn.inspected = true;
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: furn.centerX,
                y: furn.centerY,
                z: 18,
                count: 24,
                color: '#38bdf8'
            });
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: furn.centerX,
                y: furn.centerY,
                z: 16,
                vx: 45,
                vy: -45,
                vz: 210,
                type: LOOT_TYPE.GOLD_POUCH,
                value: furn.goldReward || 50
            });
            eventBus.emit(EVENTS.METEOR_COLLECTED, { node: furn });
            return true;
        }

        if (candidate.kind === 'corrupt_altar') {
            const furn = candidate.target;
            furn.opened = true;
            furn.inspected = true;
            eventBus.emit(EVENTS.MAGIC_FX, {
                x: furn.centerX,
                y: furn.centerY,
                z: 18,
                radius: 78,
                color: '#38bdf8'
            });
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: furn.centerX,
                y: furn.centerY,
                z: 20,
                count: 26,
                color: '#c084fc'
            });
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: furn.centerX,
                y: furn.centerY,
                z: 16,
                vx: -40,
                vy: 40,
                vz: 210,
                type: LOOT_TYPE.GOLD_POUCH,
                value: furn.goldReward || 50
            });
            eventBus.emit(EVENTS.ALTAR_PURIFIED, { altar: furn });
            return true;
        }

        if (candidate.kind === 'moonflower') {
            const furn = candidate.target;
            furn.opened = true;
            furn.inspected = true;
            if (player && !player.dead) {
                player.heal(20, true);
            }
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: furn.centerX,
                y: furn.centerY,
                z: 14,
                count: 18,
                color: '#a7f3d0'
            });
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: furn.centerX,
                y: furn.centerY,
                z: 14,
                vx: 30,
                vy: 30,
                vz: 190,
                type: LOOT_TYPE.GOLD_COIN,
                value: furn.goldReward || 25
            });
            eventBus.emit(EVENTS.MOONFLOWER_PICKED, { flower: furn });
            return true;
        }

        if (candidate.kind === 'campfire') {
            const furn = candidate.target;
            eventBus.emit(EVENTS.CAMPFIRE_REST, { campfire: furn, player });
            return true;
        }

        if (candidate.kind === 'anvil_stall') {
            eventBus.emit(EVENTS.TOGGLE_SHOP);
            return true;
        }

        if (candidate.kind === 'signpost') {
            const furn = candidate.target;
            eventBus.emit(EVENTS.DIALOG_SHOW, {
                speakerId: 'mentor',
                speakerName: furn.name,
                title: 'Senderos del Bosque de Loretome',
                text: furn.customText || 'Sigue los caminos de tierra para hallar las mazmorras del reino.',
                duration: 7.0
            });
            return true;
        }

        if (candidate.kind === 'bush') {
            this.cutBush(candidate.target, player);
            return true;
        }

        if (candidate.kind === 'door') {
            this._openDoor(candidate.target, player, board);
            return true;
        }

        if (candidate.kind === 'trap') {
            const trap = candidate.target;
            trap.state = 'disarmed';
            eventBus.emit(EVENTS.TRAP_DISARMED, { trap, hero: player });
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: trap.x,
                y: trap.y,
                z: 36,
                text: `🛠️ ¡${trap.name} Desactivada!`,
                color: '#4ade80'
            });
            return true;
        }

        if (candidate.kind === 'chest' || candidate.kind === 'furniture') {
            this._inspectFurniture(candidate.target, player, board);
            return true;
        }

        return false;
    }

    /**
     * Permite cortar arbustos del bosque (estilo Zelda clásico) directamente al atacar con el arma.
     * @param {Object} attacker
     * @param {Object} board
     * @param {number} reachRadius
     */
    tryCutBushesNear(attacker, board, reachRadius = 62) {
        if (!board || !Array.isArray(board.furniture)) return;

        for (const furn of board.furniture) {
            if (furn.type !== FURNITURE_TYPE.BUSH || furn.opened) continue;
            const dist = Math.hypot(furn.centerX - attacker.x, furn.centerY - attacker.y);
            if (dist <= reachRadius + 18) {
                this.cutBush(furn, attacker);
            }
        }
    }

    /**
     * Corta un arbusto del bosque soltando hojas verdes y posibles monedas o pociones.
     */
    cutBush(furn, player) {
        if (!furn || furn.opened) return;
        furn.opened = true;
        furn.inspected = true;

        eventBus.emit(EVENTS.BUSH_CUT, { bush: furn });
        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: furn.centerX,
            y: furn.centerY,
            z: 14,
            count: 16,
            color: '#4ade80'
        });
        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: furn.centerX,
            y: furn.centerY,
            z: 34,
            text: '🌿 ¡Arbusto Cortado!',
            color: '#86efac'
        });

        // Soltar monedas / rupias del arbusto
        const gold = furn.goldReward || 15;
        if (gold > 0) {
            const angle = Math.random() * Math.PI * 2;
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: furn.centerX,
                y: furn.centerY,
                z: 14,
                vx: Math.cos(angle) * 65,
                vy: Math.sin(angle) * 65,
                vz: 195,
                type: LOOT_TYPE.GOLD_COIN,
                value: gold
            });
        }

        if (furn.potionReward) {
            const angle = Math.random() * Math.PI * 2;
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: furn.centerX,
                y: furn.centerY,
                z: 18,
                vx: Math.cos(angle) * 75,
                vy: Math.sin(angle) * 75,
                vz: 230,
                type: LOOT_TYPE.HEAL_POTION,
                value: 1
            });
        }
    }

    /**
     * Comprueba detección y activación de las trampas clásicas del tablero HeroQuest.
     */
    updateTraps(dt, board, party = [], monsters = []) {
        if (!board || !board.traps) return;

        for (const trap of board.traps) {
            if (trap.cooldown > 0) {
                trap.cooldown = Math.max(0, trap.cooldown - dt);
            }

            if (trap.state === 'disarmed') continue;

            for (const hero of party) {
                if (!hero || hero.dead) continue;
                const d = Math.hypot(hero.x - trap.x, hero.y - trap.y);

                if (trap.state === 'hidden' && d <= (hero.heroId === 'dwarf' ? 92 : 56)) {
                    trap.state = 'detected';
                    eventBus.emit(EVENTS.FLOATING_TEXT, {
                        x: trap.x,
                        y: trap.y,
                        z: 30,
                        text: `⚠️ ¡${trap.name}!`,
                        color: '#fb923c'
                    });
                }

                if ((trap.state === 'hidden' || trap.state === 'detected') && d <= trap.radius + 6 && hero.z < 14) {
                    this._triggerTrap(trap, hero);
                } else if (trap.state === 'triggered' && trap.type === 'pit' && trap.cooldown <= 0 && d <= trap.radius && hero.z < 10) {
                    trap.cooldown = 1.4;
                    hero.takeDamage(10, trap.x, trap.y);
                }
            }

            if (trap.state === 'hidden' || trap.state === 'detected') {
                for (const m of monsters) {
                    if (m.dead || m.isBoss) continue;
                    const d = Math.hypot(m.x - trap.x, m.y - trap.y);
                    if (d <= trap.radius + 4 && m.z < 12) {
                        this._triggerTrap(trap, m);
                        break;
                    }
                }
            }
        }
    }

    _triggerTrap(trap, victim) {
        trap.state = 'triggered';
        trap.cooldown = 1.5;

        eventBus.emit(EVENTS.TRAP_TRIGGERED, { trap, victim });
        eventBus.emit(EVENTS.CAMERA_SHAKE, { intensity: 9, duration: 0.28 });
        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: trap.x,
            y: trap.y,
            z: 14,
            count: 24,
            color: trap.type === 'spear' ? '#cbd5e1' : '#78716c'
        });
        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: trap.x,
            y: trap.y,
            z: 44,
            text: `💥 ¡${trap.name.toUpperCase()}!`,
            color: '#ef4444'
        });

        victim.takeDamage(trap.damage, trap.x, trap.y);
    }

    _openDoor(door, player, board) {
        door.open = true;

        eventBus.emit(EVENTS.DOOR_OPENED, { door });
        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: door.x,
            y: door.y,
            z: 18,
            count: 14,
            color: '#a8a29e'
        });
        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: door.x,
            y: door.y,
            z: 38,
            text: door.isBossDoor ? '¡SANTUARIO ABIERTO!' : '¡Puerta Abierta!',
            color: '#fbbf24'
        });

        this.checkRoomDiscovery(door.roomId, board);
    }

    checkRoomDiscovery(roomId, board) {
        if (!roomId || !board) return;
        const room = board.roomMap.get(roomId);
        if (!room || room.discovered) return;

        room.discovered = true;
        const discoveredCount = board.rooms.filter((r) => r.discovered).length;

        eventBus.emit(EVENTS.ROOM_DISCOVERED, {
            room,
            discoveredCount,
            totalRooms: board.rooms.length
        });

        if (room.loreText) {
            eventBus.emit(EVENTS.DIALOG_SHOW, {
                speakerId: 'mentor',
                speakerName: 'Mentor — Guardián de Loretome',
                title: room.name,
                text: room.loreText,
                duration: 7.5
            });
        }
    }

    _inspectFurniture(furn, player, board) {
        furn.inspected = true;
        furn.opened = true;

        if (furn.type === FURNITURE_TYPE.WELL && player && !player.dead) {
            player.heal(35, true);
        }

        const isChest = furn.type === FURNITURE_TYPE.CHEST;
        const pool = FURNITURE_INSPECTIONS[furn.type] || FURNITURE_INSPECTIONS.table;
        const text = pool[Math.floor(Math.random() * pool.length)];

        if (isChest) {
            eventBus.emit(EVENTS.CHEST_OPENED, { furniture: furn });
        } else {
            eventBus.emit(EVENTS.FURNITURE_INSPECTED, { furniture: furn });
        }

        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: furn.centerX,
            y: furn.centerY,
            z: 20,
            count: isChest ? 22 : 14,
            color: isChest ? '#facc15' : '#cbd5e1'
        });

        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: furn.centerX,
            y: furn.centerY,
            z: 42,
            text: isChest ? '¡Cofre Abierto!' : `¡${furn.name} Registrado!`,
            color: '#fde047'
        });

        eventBus.emit(EVENTS.DIALOG_SHOW, {
            speakerId: player.heroId,
            speakerName: player.name,
            title: isChest ? 'Tesoro Descubierto' : furn.name,
            text,
            duration: 6.0
        });

        const totalGold = furn.goldReward || 30;
        const coinCount = Math.max(2, Math.min(6, Math.round(totalGold / 15)));
        const goldPerCoin = Math.round(totalGold / coinCount);

        for (let i = 0; i < coinCount; i++) {
            const angle = Math.atan2(player.y - furn.centerY, player.x - furn.centerX) + (Math.random() - 0.5) * 1.4;
            const speed = 75 + Math.random() * 55;
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: furn.centerX,
                y: furn.centerY,
                z: 18,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vz: 210 + Math.random() * 90,
                type: goldPerCoin >= 20 ? LOOT_TYPE.GOLD_POUCH : LOOT_TYPE.GOLD_COIN,
                value: goldPerCoin
            });
        }

        if (furn.potionReward) {
            const potionTypes = [
                LOOT_TYPE.HEAL_POTION,
                LOOT_TYPE.HEAL_POTION,
                LOOT_TYPE.STRENGTH_POTION,
                LOOT_TYPE.SPEED_POTION
            ];
            const chosenPotion = potionTypes[Math.floor(Math.random() * potionTypes.length)];
            const angle = Math.atan2(player.y - furn.centerY, player.x - furn.centerX) + (Math.random() - 0.5) * 0.6;
            eventBus.emit(EVENTS.SPAWN_LOOT, {
                x: furn.centerX,
                y: furn.centerY,
                z: 22,
                vx: Math.cos(angle) * 90,
                vy: Math.sin(angle) * 90,
                vz: 260,
                type: chosenPotion,
                value: 1
            });
        }
    }
}

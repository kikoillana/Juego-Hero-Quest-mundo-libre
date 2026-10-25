/**
 * @fileoverview Gestor de Misiones Secundarias del Bosque Real de Loretome (Edición Mundo Libre 4x).
 * Controla el progreso de las 6 misiones secundarias, las interacciones con los 6 NPCs
 * y la entrega de recompensas: Nuevas Armas Legendarias, Nuevas Habilidades ([F] y Pasivas) y Oro.
 * Capa 3: Depende de constants.js, questsData.js y EventBus.js.
 */

import { EVENTS, LOOT_TYPE } from '../config/constants.js';
import { SIDE_QUESTS_DATA, SPECIAL_WEAPONS } from '../config/questsData.js';
import { eventBus } from '../core/EventBus.js';

export class QuestSystem {
    /**
     * @param {() => Object} getPlayerFn - Callback que devuelve el héroe jugador activo
     * @param {() => Array} getCompanionsFn - Callback que devuelve los compañeros rescatados
     */
    constructor(getPlayerFn, getCompanionsFn) {
        this.getPlayer = getPlayerFn;
        this.getCompanions = getCompanionsFn;

        /** @type {Map<string, { id: string, status: 'available'|'active'|'completed', progress: number, targetCount: number }>} */
        this.states = new Map();
        this.reset();
        this._bindEvents();
    }

    reset() {
        this.states.clear();
        for (const q of SIDE_QUESTS_DATA) {
            this.states.set(q.id, {
                id: q.id,
                status: 'available',
                progress: 0,
                targetCount: q.targetCount
            });
        }
    }

    _bindEvents() {
        // 1. Baja enemiga -> Misión I (Caza Pielverde) y Misión V (Caudillo Fimir de la Ciénaga)
        eventBus.on(EVENTS.MONSTER_KILLED, ({ monster } = {}) => {
            this.incrementObjective('kills', 1);
            if (monster && monster.isSubBoss) {
                this.incrementObjective('subboss', 1);
            }
        });

        // 2. Fragmento de Meteorito recogido -> Misión II (Acero Estelar)
        eventBus.on(EVENTS.METEOR_COLLECTED, () => {
            this.incrementObjective('meteors', 1);
        });

        // 3. Altar Corrupto purificado -> Misión III (Tempestad Arcana [F])
        eventBus.on(EVENTS.ALTAR_PURIFIED, () => {
            this.incrementObjective('altars', 1);
        });

        // 4. Flor de Luz Lunar recolectada -> Misión IV (Sangre Silvana)
        eventBus.on(EVENTS.MOONFLOWER_PICKED, () => {
            this.incrementObjective('moonflowers', 1);
        });

        // 5. Cofre abierto -> Misión VI (Reliquias del Tesoro Imperial)
        eventBus.on(EVENTS.CHEST_OPENED, () => {
            this.incrementObjective('chests', 1);
        });
    }

    /**
     * Incrementa el progreso de las misiones cuyo objectiveType coincida.
     * @param {string} objectiveType
     * @param {number} [amount=1]
     */
    incrementObjective(objectiveType, amount = 1) {
        let changed = false;

        for (const qData of SIDE_QUESTS_DATA) {
            if (qData.objectiveType !== objectiveType) continue;
            const st = this.states.get(qData.id);
            if (!st || st.status === 'completed') continue;

            // Si aún estaba en 'available', la activamos automáticamente al avanzar en su objetivo
            if (st.status === 'available') {
                st.status = 'active';
            }

            const prev = st.progress;
            st.progress = Math.min(qData.targetCount, st.progress + amount);

            if (st.progress !== prev) {
                changed = true;
                const player = this.getPlayer?.();
                if (player) {
                    eventBus.emit(EVENTS.FLOATING_TEXT, {
                        x: player.x,
                        y: player.y,
                        z: 48,
                        text: `📜 ${qData.title.split('.')[1]?.trim() || qData.title}: ${st.progress}/${qData.targetCount}`,
                        color: st.progress >= qData.targetCount ? '#4ade80' : '#fde047',
                        size: 14
                    });
                }

                if (st.progress >= qData.targetCount) {
                    eventBus.emit(EVENTS.DIALOG_SHOW, {
                        speakerId: qData.giverPortrait || 'mentor',
                        speakerName: `${qData.giverName} — ¡Objetivo Cumplido!`,
                        title: qData.title,
                        text: `¡Has completado el objetivo (${st.progress}/${qData.targetCount})! Habla con ${qData.giverName} en el Bosque o abre el Diario de Misiones [J] para reclamar tu recompensa: ${qData.rewardSummary}`,
                        duration: 6.5
                    });
                }
            }
        }

        if (changed) {
            eventBus.emit(EVENTS.QUEST_UPDATED, { quests: this.getFullQuestList() });
        }
    }

    /**
     * Gestiona la interacción directa [E] con un NPC del Bosque o desde el Diario de Misiones [J].
     * @param {string} questId
     */
    interactWithQuest(questId) {
        const qData = SIDE_QUESTS_DATA.find((q) => q.id === questId);
        const st = this.states.get(questId);
        if (!qData || !st) return;

        if (st.status === 'completed') {
            const text = `«¡Gracias de nuevo, Campeón! Ya te entregué tu recompensa (${qData.rewardSummary}). ¡Ve y libera a tus compañeros cautivos!»`;
            eventBus.emit(EVENTS.DIALOG_SHOW, {
                speakerId: qData.giverPortrait || 'mentor',
                speakerName: `${qData.giverName} (${qData.giverRole})`,
                title: `${qData.title} — Completada`,
                text,
                duration: 5.5
            });
            return { status: 'completed', title: qData.title, text };
        }

        if (st.progress >= qData.targetCount) {
            return this.claimReward(questId);
        }

        // Aceptar misión o recordar progreso
        if (st.status === 'available') {
            st.status = 'active';
            eventBus.emit(EVENTS.QUEST_UPDATED, { quests: this.getFullQuestList() });
            const player = this.getPlayer?.();
            if (player) {
                eventBus.emit(EVENTS.FLOATING_TEXT, {
                    x: player.x,
                    y: player.y,
                    z: 46,
                    text: `📜 ¡MISIÓN ACEPTADA: ${qData.giverName.toUpperCase()}!`,
                    color: '#fde047',
                    size: 15
                });
            }
        }

        const text = `${qData.dialogueStart} — [Progreso: ${st.progress}/${qData.targetCount} | Recompensa: ${qData.rewardSummary}]`;
        eventBus.emit(EVENTS.DIALOG_SHOW, {
            speakerId: qData.giverPortrait || 'mentor',
            speakerName: `${qData.giverName} (${qData.giverRole})`,
            title: `${qData.title} (${st.progress}/${qData.targetCount})`,
            text,
            duration: 8.0
        });
        return { status: st.status, title: `${qData.title} (${st.progress}/${qData.targetCount})`, text };
    }

    /**
     * Otorga la recompensa de la misión secundaria (Armas Nuevas, Habilidades o Dinero).
     * @param {string} questId
     */
    claimReward(questId) {
        const qData = SIDE_QUESTS_DATA.find((q) => q.id === questId);
        const st = this.states.get(questId);
        const player = this.getPlayer?.();
        if (!qData || !st || !player || st.status === 'completed') return null;
        if (st.progress < qData.targetCount) return null;

        st.status = 'completed';
        const rw = qData.reward || {};

        // 1. Dinero (Monedas de Oro)
        if (rw.gold) {
            player.gold += rw.gold;
        }

        // 2. Pociones adicionales
        if (rw.healPotions) {
            player.inventory.healPotions += rw.healPotions;
        }

        // 3. Nueva Arma Legendaria / Especial
        if (rw.weaponId && SPECIAL_WEAPONS[rw.weaponId]) {
            player.equipSpecialWeapon(SPECIAL_WEAPONS[rw.weaponId]);
        }

        if (rw.bonusWeaponLevel) {
            player.weaponLevel += rw.bonusWeaponLevel;
        }

        // 4. Nueva Habilidad Activa [Tecla F]: Tempestad de Loretome
        if (rw.unlockSecondSkill) {
            player.secondSkillUnlocked = true;
        }

        // 5. Nueva Habilidad Pasiva: Sangre Silvana (Regeneración + Vida Máxima)
        if (rw.unlockPassiveRegen) {
            player.passiveRegenUnlocked = true;
        }
        if (rw.bonusMaxHp) {
            player.maxHp += rw.bonusMaxHp;
            player.hp = player.maxHp;
        }

        // 6. Bonificación de Armadura / Stamina (Égida Imperial)
        if (rw.bonusDefense) {
            player.questDefenseBonus = (player.questDefenseBonus || 0) + rw.bonusDefense;
        }
        if (rw.bonusMaxStamina) {
            player.maxStamina += rw.bonusMaxStamina;
            player.stamina = player.maxStamina;
        }

        // Sincronizar mejoras con los compañeros ya rescatados
        const companions = this.getCompanions?.() || [];
        for (const ally of companions) {
            ally.weaponLevel = player.weaponLevel;
            ally.armorLevel = player.armorLevel;
            ally.questDefenseBonus = player.questDefenseBonus || 0;
            if (player.equippedWeapon) {
                ally.equipSpecialWeapon(player.equippedWeapon);
            }
        }

        player.emitUpdate();

        eventBus.emit(EVENTS.SHOP_PURCHASE);
        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x: player.x,
            y: player.y,
            z: 24,
            count: 32,
            color: '#facc15'
        });
        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: player.x,
            y: player.y,
            z: 54,
            text: `🏆 ¡RECOMPENSA: ${qData.rewardSummary}!`,
            color: '#4ade80',
            size: 16
        });

        eventBus.emit(EVENTS.DIALOG_SHOW, {
            speakerId: qData.giverPortrait || 'mentor',
            speakerName: `${qData.giverName} — ¡Misión Completada!`,
            title: qData.title,
            text: qData.dialogueComplete,
            duration: 8.5
        });

        eventBus.emit(EVENTS.QUEST_COMPLETED, { questId, quest: qData });
        eventBus.emit(EVENTS.QUEST_UPDATED, { quests: this.getFullQuestList() });
        return { status: 'completed', title: `${qData.title} — ¡Completada!`, text: qData.dialogueComplete };
    }

    /**
     * Devuelve la lista completa de misiones combinando datos estáticos y estado actual.
     */
    getFullQuestList() {
        return SIDE_QUESTS_DATA.map((q) => {
            const st = this.states.get(q.id) || {
                status: 'available',
                progress: 0,
                targetCount: q.targetCount
            };
            const isReadyToClaim = st.status !== 'completed' && st.progress >= q.targetCount;
            const effectiveStatus = isReadyToClaim ? 'ready_to_claim' : st.status;
            return {
                ...q,
                giverRegion: q.regionName,
                reward: {
                    ...q.reward,
                    label: q.rewardSummary
                },
                status: effectiveStatus,
                progress: st.progress,
                isReadyToClaim
            };
        });
    }

    serialize() {
        const out = {};
        for (const [id, st] of this.states.entries()) {
            out[id] = {
                status: st.status,
                progress: st.progress
            };
        }
        return out;
    }

    hydrate(savedObj) {
        this.reset();
        if (!savedObj || typeof savedObj !== 'object') return;
        for (const [id, data] of Object.entries(savedObj)) {
            const st = this.states.get(id);
            if (st && data) {
                st.status = data.status || 'available';
                st.progress = Number(data.progress || 0);
            }
        }
        eventBus.emit(EVENTS.QUEST_UPDATED, { quests: this.getFullQuestList() });
    }
}

/**
 * @fileoverview Gestor de Persistencia y Escalabilidad (Edición Mundo Libre):
 * Conecta el motor 2.5D con la Base de Datos SQLite local (/api/saves y /api/hall-of-fame),
 * guardando la Zona Activa (Bosque de Loretome o cualquiera de las 4 Mazmorras) y el estado
 * persistente de todas las mazmorras visitadas.
 * Capa 1: Depende de constants.js y EventBus.js.
 */

import { EVENTS, ZONE_ID } from '../config/constants.js';
import { eventBus } from './EventBus.js';

const LOCAL_STORAGE_PREFIX = 'hq25d_openworld_save_slot_';
const LOCAL_HOF_KEY = 'hq25d_openworld_hall_of_fame';

export class SaveManager {
    /**
     * Serializa una zona individual (tablero, monstruos vivos y botín en el suelo).
     */
    static serializeSingleZone(board, monsters = [], lootItems = []) {
        const discoveredRooms = board.rooms.filter((r) => r.discovered).map((r) => r.id);
        return {
            zoneId: board.zoneId,
            monsters: monsters
                .filter((m) => !m.dead)
                .map((m) => ({
                    type: m.type,
                    roomId: m.roomId,
                    x: m.x,
                    y: m.y,
                    hp: m.hp,
                    maxHp: m.maxHp,
                    state: m.state,
                    bossPhase: m.bossPhase || 1,
                    isSubBoss: Boolean(m.isSubBoss),
                    customName: m.customName || null
                })),
            doors: board.doors.map((d) => ({ id: d.id, open: d.open })),
            furniture: board.furniture.map((f) => ({
                id: f.id,
                inspected: f.inspected,
                opened: f.opened
            })),
            traps: (board.traps || []).map((t) => ({
                id: t.id,
                state: t.state
            })),
            discoveredRooms,
            fog: board.fog,
            lootItems: lootItems
                .filter((l) => !l.collected)
                .map((l) => ({
                    x: l.x,
                    y: l.y,
                    type: l.type,
                    value: l.value
                }))
        };
    }

    /**
     * Serializa el estado completo de la partida activa (Héroe, Compañeros IA, Zona Activa
     * y todas las Zonas visitadas del Mundo Libre).
     * @param {Object} app - Instancia principal de HeroQuestApp
     * @param {string} [saveName]
     */
    static serializeGameState(app, saveName = 'Partida Guardada') {
        const { player, companions = [], monsters = [], board, lootItems = [], activeZoneId, zoneStates = new Map() } = app;
        const currentZoneData = this.serializeSingleZone(board, monsters, lootItems);

        // Empaquetar también todas las demás zonas visitadas (Bosque y otras Mazmorras)
        const allZones = {};
        for (const [zId, zObj] of zoneStates.entries()) {
            if (zId === activeZoneId) {
                allZones[zId] = currentZoneData;
            } else if (zObj && zObj.board) {
                allZones[zId] = this.serializeSingleZone(zObj.board, zObj.monsters || [], zObj.lootItems || []);
            }
        }
        allZones[activeZoneId || ZONE_ID.DUNGEON_FELLMARG] = currentZoneData;

        const worldState = {
            version: 4,
            timestamp: new Date().toISOString(),
            activeZoneId: activeZoneId || board.zoneId || ZONE_ID.DUNGEON_FELLMARG,
            rescuedHeroIds: [...(app.rescuedHeroIds || [])],
            questsState: app.quests ? app.quests.serialize() : {},
            player: {
                heroId: player.heroId,
                x: player.x,
                y: player.y,
                z: player.z,
                hp: player.hp,
                maxHp: player.maxHp,
                stamina: player.stamina,
                maxStamina: player.maxStamina,
                gold: player.gold,
                kills: player.kills,
                weaponLevel: player.weaponLevel,
                armorLevel: player.armorLevel,
                equippedWeapon: player.equippedWeapon || null,
                secondSkillUnlocked: Boolean(player.secondSkillUnlocked),
                passiveRegenUnlocked: Boolean(player.passiveRegenUnlocked),
                questDefenseBonus: player.questDefenseBonus || 0,
                inventory: { ...player.inventory },
                strengthBuffTimer: player.strengthBuffTimer,
                speedBuffTimer: player.speedBuffTimer
            },
            companions: companions.map((c) => ({
                heroId: c.heroId,
                slotIndex: c.slotIndex,
                x: c.x,
                y: c.y,
                z: c.z,
                hp: c.hp,
                maxHp: c.maxHp,
                dead: c.dead,
                downedTimer: c.downedTimer
            })),
            // Datos de la zona activa en raíz para compatibilidad directa
            ...currentZoneData,
            allZones
        };

        return {
            saveName,
            questId: 'fellmarg_book_1',
            heroId: player.heroId,
            heroName: player.name,
            hp: Math.round(player.hp),
            maxHp: Math.round(player.maxHp),
            stamina: Math.round(player.stamina),
            maxStamina: Math.round(player.maxStamina),
            gold: Math.round(player.gold),
            kills: Math.round(player.kills),
            weaponLevel: player.weaponLevel,
            armorLevel: player.armorLevel,
            roomsDiscovered: currentZoneData.discoveredRooms.length,
            totalRooms: board.rooms.length,
            worldState
        };
    }

    static async saveToSlot(slotId, app, customName) {
        if (!app || !app.player || !app.board) {
            throw new Error('No hay partida activa para guardar.');
        }

        const zoneTag = app.board.isOverworld ? 'Bosque' : (app.board.zoneName || 'Mazmorra');
        const label = customName || (slotId === 0 ? `Autoguardado (${zoneTag})` : `Ranura ${slotId} — ${app.player.name} (${zoneTag})`);
        const payload = this.serializeGameState(app, label);

        try {
            localStorage.setItem(
                `${LOCAL_STORAGE_PREFIX}${slotId}`,
                JSON.stringify({
                    slot_id: Number(slotId),
                    save_name: payload.saveName,
                    quest_id: payload.questId,
                    hero_id: payload.heroId,
                    hero_name: payload.heroName,
                    hp: payload.hp,
                    max_hp: payload.maxHp,
                    stamina: payload.stamina,
                    max_stamina: payload.maxStamina,
                    gold: payload.gold,
                    kills: payload.kills,
                    weapon_level: payload.weaponLevel,
                    armor_level: payload.armorLevel,
                    rooms_discovered: payload.roomsDiscovered,
                    total_rooms: payload.totalRooms,
                    worldState: payload.worldState,
                    updated_at: new Date().toISOString()
                })
            );
        } catch (_) {}

        try {
            const res = await fetch(`/api/saves/${slotId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            eventBus.emit(EVENTS.GAME_SAVED, { slotId, saveName: label, backend: 'sqlite' });
            return data;
        } catch (err) {
            eventBus.emit(EVENTS.GAME_SAVED, { slotId, saveName: label, backend: 'localStorage' });
            return { ok: true, slotId, fallback: true };
        }
    }

    static async listSlots() {
        try {
            const res = await fetch('/api/saves');
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.slots)) {
                    return { slots: data.slots, backend: 'SQLite (data/heroquest.db)' };
                }
            }
        } catch (_) {}

        const fallbackSlots = [];
        for (let i = 0; i <= 3; i++) {
            const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${i}`);
            if (raw) {
                try {
                    fallbackSlots.push(JSON.parse(raw));
                } catch (_) {}
            }
        }
        return { slots: fallbackSlots, backend: 'LocalStorage (Modo sin conexión)' };
    }

    static async loadFromSlot(slotId) {
        try {
            const res = await fetch(`/api/saves/${slotId}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.save) {
                    return data.save;
                }
            }
        } catch (_) {}

        const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${slotId}`);
        if (raw) {
            return JSON.parse(raw);
        }
        return null;
    }

    static async deleteSlot(slotId) {
        try {
            localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${slotId}`);
        } catch (_) {}
        try {
            await fetch(`/api/saves/${slotId}`, { method: 'DELETE' });
        } catch (_) {}
    }

    static async recordHallOfFame(entry) {
        try {
            const list = JSON.parse(localStorage.getItem(LOCAL_HOF_KEY) || '[]');
            list.unshift({ ...entry, created_at: new Date().toISOString() });
            localStorage.setItem(LOCAL_HOF_KEY, JSON.stringify(list.slice(0, 15)));
        } catch (_) {}

        try {
            await fetch('/api/hall-of-fame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
        } catch (_) {}
    }

    static async getHallOfFame() {
        try {
            const res = await fetch('/api/hall-of-fame');
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.records)) {
                    return data.records;
                }
            }
        } catch (_) {}

        try {
            return JSON.parse(localStorage.getItem(LOCAL_HOF_KEY) || '[]');
        } catch (_) {
            return [];
        }
    }
}

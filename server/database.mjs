/**
 * @fileoverview Motor de Base de Datos Relacional SQLite nativo (node:sqlite) para HeroQuest 2.5D.
 * Gestiona persistencia de partidas (save_slots), Salón de la Fama (hall_of_fame) y
 * catálogo escalable de campañas/misiones (quests_catalog).
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'heroquest.db');

export class GameDatabase {
    constructor(dbPath = DB_PATH) {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.dbPath = dbPath;
        this.db = new DatabaseSync(dbPath);
        this._initSchema();
    }

    /**
     * Inicializa tablas relacionales, índices y datos semilla escalables.
     */
    _initSchema() {
        this.db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;

            -- Tabla de migraciones para escalabilidad futura del esquema
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );

            -- Catálogo escalable de campañas / mapas de misiones
            CREATE TABLE IF NOT EXISTS quests_catalog (
                quest_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subtitle TEXT NOT NULL,
                difficulty INTEGER NOT NULL DEFAULT 1,
                rooms_total INTEGER NOT NULL DEFAULT 7,
                config_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );

            -- Ranuras de guardado de partidas (Slot 0 = Autoguardado, Slots 1..3 = Manuales)
            CREATE TABLE IF NOT EXISTS save_slots (
                slot_id INTEGER PRIMARY KEY,
                save_name TEXT NOT NULL,
                quest_id TEXT NOT NULL DEFAULT 'fellmarg_book_1',
                hero_id TEXT NOT NULL,
                hero_name TEXT NOT NULL,
                hp INTEGER NOT NULL,
                max_hp INTEGER NOT NULL,
                stamina INTEGER NOT NULL,
                max_stamina INTEGER NOT NULL,
                gold INTEGER NOT NULL,
                kills INTEGER NOT NULL,
                weapon_level INTEGER NOT NULL DEFAULT 1,
                armor_level INTEGER NOT NULL DEFAULT 1,
                rooms_discovered INTEGER NOT NULL DEFAULT 1,
                total_rooms INTEGER NOT NULL DEFAULT 7,
                world_state_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (quest_id) REFERENCES quests_catalog(quest_id)
            );

            -- Salón de la Fama (Crónicas de Loretome - Historial persistente de gestas)
            CREATE TABLE IF NOT EXISTS hall_of_fame (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quest_id TEXT NOT NULL DEFAULT 'fellmarg_book_1',
                hero_id TEXT NOT NULL,
                hero_name TEXT NOT NULL,
                victory INTEGER NOT NULL DEFAULT 0,
                gold INTEGER NOT NULL DEFAULT 0,
                kills INTEGER NOT NULL DEFAULT 0,
                rooms_discovered INTEGER NOT NULL DEFAULT 1,
                weapon_level INTEGER NOT NULL DEFAULT 1,
                armor_level INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );
        `);

        // Insertar misión base y futuras expansiones en el catálogo si no existen
        const upsertQuest = this.db.prepare(`
            INSERT OR IGNORE INTO quests_catalog (quest_id, title, subtitle, difficulty, rooms_total, config_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const now = new Date().toISOString();
        upsertQuest.run(
            'fellmarg_book_1',
            'La Prueba de Fuego de Zargon',
            'Crónicas de Loretome — Libro I (Fortaleza de Fellmarg)',
            2,
            7,
            JSON.stringify({ boss: 'gargoyle', traps: 14, doors: 12 }),
            now
        );
        upsertQuest.run(
            'karak_varn_book_2',
            'La Forja Perdida de Karak Varn (Próxima Expansión)',
            'Crónicas de Loretome — Libro II',
            3,
            9,
            JSON.stringify({ boss: 'witch_lord', traps: 20, doors: 16 }),
            now
        );
    }

    /**
     * Devuelve el resumen de todas las ranuras de guardado (sin cargar el JSON pesado si no se pide).
     */
    listSaveSlots() {
        const stmt = this.db.prepare(`
            SELECT
                slot_id, save_name, quest_id, hero_id, hero_name,
                hp, max_hp, stamina, max_stamina, gold, kills,
                weapon_level, armor_level, rooms_discovered, total_rooms, updated_at
            FROM save_slots
            ORDER BY slot_id ASC
        `);
        return stmt.all();
    }

    /**
     * Obtiene una partida guardada completa (incluyendo el estado del mundo 2.5D serializado).
     * @param {number} slotId
     */
    getSaveSlot(slotId) {
        const stmt = this.db.prepare(`
            SELECT * FROM save_slots WHERE slot_id = ?
        `);
        const row = stmt.get(Number(slotId));
        if (!row) return null;
        return {
            ...row,
            worldState: JSON.parse(row.world_state_json)
        };
    }

    /**
     * Guarda o actualiza una partida en la ranura indicada.
     * @param {number} slotId
     * @param {Object} payload
     */
    saveGame(slotId, payload) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO save_slots (
                slot_id, save_name, quest_id, hero_id, hero_name,
                hp, max_hp, stamina, max_stamina, gold, kills,
                weapon_level, armor_level, rooms_discovered, total_rooms,
                world_state_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slot_id) DO UPDATE SET
                save_name = excluded.save_name,
                quest_id = excluded.quest_id,
                hero_id = excluded.hero_id,
                hero_name = excluded.hero_name,
                hp = excluded.hp,
                max_hp = excluded.max_hp,
                stamina = excluded.stamina,
                max_stamina = excluded.max_stamina,
                gold = excluded.gold,
                kills = excluded.kills,
                weapon_level = excluded.weapon_level,
                armor_level = excluded.armor_level,
                rooms_discovered = excluded.rooms_discovered,
                total_rooms = excluded.total_rooms,
                world_state_json = excluded.world_state_json,
                updated_at = excluded.updated_at
        `);

        const worldJson = typeof payload.worldState === 'string'
            ? payload.worldState
            : JSON.stringify(payload.worldState || {});

        stmt.run(
            Number(slotId),
            payload.saveName || `Ranura ${slotId}`,
            payload.questId || 'fellmarg_book_1',
            payload.heroId || 'barbarian',
            payload.heroName || 'Bárbaro',
            Math.round(payload.hp ?? 100),
            Math.round(payload.maxHp ?? 100),
            Math.round(payload.stamina ?? 100),
            Math.round(payload.maxStamina ?? 100),
            Math.round(payload.gold ?? 0),
            Math.round(payload.kills ?? 0),
            Math.round(payload.weaponLevel ?? 1),
            Math.round(payload.armorLevel ?? 1),
            Math.round(payload.roomsDiscovered ?? 1),
            Math.round(payload.totalRooms ?? 7),
            worldJson,
            now
        );

        return { ok: true, slotId: Number(slotId), updatedAt: now };
    }

    /**
     * Elimina una ranura de guardado.
     * @param {number} slotId
     */
    deleteSaveSlot(slotId) {
        const stmt = this.db.prepare(`DELETE FROM save_slots WHERE slot_id = ?`);
        stmt.run(Number(slotId));
        return { ok: true, slotId: Number(slotId) };
    }

    /**
     * Registra una gesta finalizada en el Salón de la Fama (Hall of Fame).
     */
    recordHallOfFame(entry) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO hall_of_fame (
                quest_id, hero_id, hero_name, victory, gold, kills,
                rooms_discovered, weapon_level, armor_level, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            entry.questId || 'fellmarg_book_1',
            entry.heroId || 'barbarian',
            entry.heroName || 'Bárbaro',
            entry.victory ? 1 : 0,
            Math.round(entry.gold ?? 0),
            Math.round(entry.kills ?? 0),
            Math.round(entry.roomsDiscovered ?? 1),
            Math.round(entry.weaponLevel ?? 1),
            Math.round(entry.armorLevel ?? 1),
            now
        );
        return { ok: true, createdAt: now };
    }

    /**
     * Obtiene las mejores gestas del Salón de la Fama.
     */
    getHallOfFame(limit = 15) {
        const stmt = this.db.prepare(`
            SELECT * FROM hall_of_fame
            ORDER BY victory DESC, gold DESC, kills DESC, id DESC
            LIMIT ?
        `);
        return stmt.all(Number(limit));
    }

    /**
     * Lista las campañas registradas en quests_catalog.
     */
    listQuests() {
        const stmt = this.db.prepare(`SELECT * FROM quests_catalog ORDER BY difficulty ASC`);
        return stmt.all();
    }
}

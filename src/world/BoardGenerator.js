/**
 * @fileoverview Generador procedural de Mazmorras HeroQuest (Bastión de Fellmarg, Cripta del Rey Brujo,
 * Forja Subterránea de Kellar y Templo Hundido del Pantano) y enlace con OverworldGenerator.
 * Cada mazmorra dispone de su Escalera Imperial (exitStairs) para salir al Bosque Exterior en cualquier momento.
 * Capa 3: Depende de config/* y OverworldGenerator.js.
 */

import {
    TILE,
    BOARD_COLS,
    BOARD_ROWS,
    CELL,
    FOG,
    ZONE_ID,
    FURNITURE_TYPE,
    TRAP_TYPE
} from '../config/constants.js';
import { MENTOR_LORE } from '../config/dialoguesData.js';
import { HEROES_DATA } from '../config/heroesData.js';
import { OverworldGenerator } from './OverworldGenerator.js';

export class BoardGenerator {
    /**
     * Genera el tablero correspondiente al zoneId solicitado.
     * @param {string} [zoneId=ZONE_ID.DUNGEON_FELLMARG]
     * @param {string|null} [prisonerHeroId=null] - Héroe cautivo en esta mazmorra (si aplica)
     * @returns {Object} Estructura de datos del tablero lista para simular y renderizar.
     */
    static generate(zoneId = ZONE_ID.DUNGEON_FELLMARG, prisonerHeroId = null) {
        if (zoneId === ZONE_ID.OVERWORLD) {
            return OverworldGenerator.generate();
        }
        if (zoneId === ZONE_ID.DUNGEON_CRYPT) {
            return this._generateVariantDungeon({
                zoneId: ZONE_ID.DUNGEON_CRYPT,
                zoneName: 'Cripta del Rey Brujo (Rescate II)',
                corridorColorA: '#232030',
                corridorColorB: '#1b1826',
                bossName: 'Señor Óseo de la Cripta',
                theme: 'crypt',
                prisonerHeroId,
                isFinalDungeon: false
            });
        }
        if (zoneId === ZONE_ID.DUNGEON_KELLAR) {
            return this._generateVariantDungeon({
                zoneId: ZONE_ID.DUNGEON_KELLAR,
                zoneName: 'Forja Subterránea de Kellar (Rescate III)',
                corridorColorA: '#33241f',
                corridorColorB: '#281b17',
                bossName: 'Gárgola de Magma de Kellar',
                theme: 'kellar',
                prisonerHeroId,
                isFinalDungeon: false
            });
        }
        if (zoneId === ZONE_ID.DUNGEON_SWAMP) {
            return this._generateVariantDungeon({
                zoneId: ZONE_ID.DUNGEON_SWAMP,
                zoneName: 'Santuario Final de Zargon (Reto Final)',
                corridorColorA: '#1d2f2b',
                corridorColorB: '#162522',
                bossName: 'Soberano Supremo de Zargon',
                theme: 'swamp',
                prisonerHeroId: null,
                isFinalDungeon: true
            });
        }

        return this._generateFellmargDungeon(prisonerHeroId);
    }

    /**
     * Mazmorra I (Inicial): El Bastión de Fellmarg (7 Salas, 12 Puertas, 14 Trampas, Gárgola del Caos + 1.º Héroe Cautivo).
     */
    static _generateFellmargDungeon(prisonerHeroId = 'dwarf') {
        const cols = BOARD_COLS;
        const rows = BOARD_ROWS;

        const grid = Array.from({ length: rows }, () =>
            new Array(cols).fill(CELL.WALL)
        );

        const fog = Array.from({ length: rows }, () =>
            new Array(cols).fill(FOG.UNSEEN)
        );

        const roomGrid = Array.from({ length: rows }, () =>
            new Array(cols).fill(null)
        );

        const tileVariants = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (__, c) => ((r * 37 + c * 17) % 100) / 100)
        );

        const carveCorridorRect = (c1, r1, c2, r2) => {
            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                    if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
                        grid[r][c] = CELL.CORRIDOR;
                    }
                }
            }
        };

        // Pasillos horizontales y verticales de doble ancho
        carveCorridorRect(1, 1, 32, 2);
        carveCorridorRect(1, 12, 32, 13);
        carveCorridorRect(1, 23, 32, 24);

        carveCorridorRect(1, 1, 2, 24);
        carveCorridorRect(11, 1, 12, 13);
        carveCorridorRect(21, 1, 22, 13);
        carveCorridorRect(10, 12, 11, 24);
        carveCorridorRect(31, 1, 32, 24);

        const rooms = [
            {
                id: 'entrance',
                name: 'Escalera Imperial (Salida al Bosque)',
                c1: 4, r1: 4, c2: 9, r2: 10,
                floorColorA: '#3d353b',
                floorColorB: '#332c31',
                carpetColor: '#7f1d1d',
                discovered: true,
                loreText: MENTOR_LORE.rooms.entrance
            },
            {
                id: 'guardroom',
                name: 'Cuerpo de Guardia Pielverde',
                c1: 14, r1: 4, c2: 19, r2: 10,
                floorColorA: '#363b32',
                floorColorB: '#2d3229',
                carpetColor: '#4d7c0f',
                discovered: false,
                loreText: MENTOR_LORE.rooms.guardroom
            },
            {
                id: 'library',
                name: 'Biblioteca Prohibida',
                c1: 24, r1: 4, c2: 29, r2: 10,
                floorColorA: '#353242',
                floorColorB: '#2b2837',
                carpetColor: '#1e3a8a',
                discovered: false,
                loreText: MENTOR_LORE.rooms.library
            },
            {
                id: 'torture',
                name: 'Cámara del Tormento',
                c1: 4, r1: 15, c2: 8, r2: 21,
                floorColorA: '#3c2f32',
                floorColorB: '#302528',
                carpetColor: '#881337',
                discovered: false,
                loreText: MENTOR_LORE.rooms.torture
            },
            {
                id: 'alchemy',
                name: 'Laboratorio Alquímico',
                c1: 13, r1: 15, c2: 16, r2: 21,
                floorColorA: '#2b3b3c',
                floorColorB: '#233031',
                carpetColor: '#0f766e',
                discovered: false,
                loreText: MENTOR_LORE.rooms.alchemy
            },
            {
                id: 'treasury',
                name: 'Cámara del Tesoro Real',
                c1: 19, r1: 15, c2: 22, r2: 21,
                floorColorA: '#423828',
                floorColorB: '#362d20',
                carpetColor: '#b45309',
                discovered: false,
                loreText: MENTOR_LORE.rooms.treasury
            },
            {
                id: 'sanctum',
                name: 'Santuario del Caos',
                c1: 25, r1: 15, c2: 29, r2: 21,
                floorColorA: '#3b2429',
                floorColorB: '#2c191d',
                carpetColor: '#991b1b',
                discovered: false,
                isBossRoom: true,
                loreText: MENTOR_LORE.rooms.sanctum
            }
        ];

        for (const room of rooms) {
            for (let r = room.r1; r <= room.r2; r++) {
                for (let c = room.c1; c <= room.c2; c++) {
                    grid[r][c] = CELL.FLOOR;
                    roomGrid[r][c] = room.id;
                }
            }
        }

        // Escalera Imperial (2x2) en la sala de entrada -> Permite salir al Bosque de Loretome
        grid[6][5] = CELL.STAIRS;
        grid[6][6] = CELL.STAIRS;
        grid[7][5] = CELL.STAIRS;
        grid[7][6] = CELL.STAIRS;

        const rawDoors = [
            { id: 'door_1', col: 10, row: 7, orientation: 'vertical', roomId: 'entrance' },
            { id: 'door_2', col: 6, row: 11, orientation: 'horizontal', roomId: 'entrance' },
            { id: 'door_3', col: 13, row: 7, orientation: 'vertical', roomId: 'guardroom' },
            { id: 'door_4', col: 20, row: 7, orientation: 'vertical', roomId: 'guardroom' },
            { id: 'door_5', col: 16, row: 11, orientation: 'horizontal', roomId: 'guardroom' },
            { id: 'door_6', col: 23, row: 7, orientation: 'vertical', roomId: 'library' },
            { id: 'door_7', col: 26, row: 11, orientation: 'horizontal', roomId: 'library' },
            { id: 'door_8', col: 6, row: 14, orientation: 'horizontal', roomId: 'torture' },
            { id: 'door_9', col: 9, row: 18, orientation: 'vertical', roomId: 'torture' },
            { id: 'door_10', col: 14, row: 14, orientation: 'horizontal', roomId: 'alchemy' },
            { id: 'door_11', col: 20, row: 14, orientation: 'horizontal', roomId: 'treasury' },
            { id: 'door_12', col: 27, row: 14, orientation: 'horizontal', roomId: 'sanctum', isBossDoor: true }
        ];

        const doors = rawDoors.map((d) => {
            grid[d.row][d.col] = CELL.FLOOR;
            return {
                ...d,
                open: false,
                x: (d.col + 0.5) * TILE,
                y: (d.row + 0.5) * TILE
            };
        });

        const rawFurniture = [
            {
                id: 'furn_entrance_table',
                type: FURNITURE_TYPE.TABLE,
                name: 'Mesa de Roble de la Guardia',
                roomId: 'entrance',
                col: 4, row: 4, w: 2, h: 1,
                goldReward: 25, potionReward: false
            },
            {
                id: 'furn_guard_weapons',
                type: FURNITURE_TYPE.WEAPONS_RACK,
                name: 'Armero Imperial',
                roomId: 'guardroom',
                col: 15, row: 4, w: 2, h: 1,
                goldReward: 35, potionReward: false
            },
            {
                id: 'furn_guard_table',
                type: FURNITURE_TYPE.TABLE,
                name: 'Mesa de Dados Orca',
                roomId: 'guardroom',
                col: 16, row: 7, w: 2, h: 1,
                goldReward: 20, potionReward: false
            },
            {
                id: 'furn_guard_chest',
                type: FURNITURE_TYPE.CHEST,
                name: 'Cofre del Sargento Orco',
                roomId: 'guardroom',
                col: 18, row: 9, w: 1, h: 1,
                goldReward: 55, potionReward: true
            },
            {
                id: 'furn_lib_bookcase1',
                type: FURNITURE_TYPE.BOOKCASE,
                name: 'Librería de Grimorios',
                roomId: 'library',
                col: 24, row: 4, w: 2, h: 1,
                goldReward: 30, potionReward: true
            },
            {
                id: 'furn_lib_fireplace',
                type: FURNITURE_TYPE.FIREPLACE,
                name: 'Chimenea Gótica',
                roomId: 'library',
                col: 27, row: 4, w: 2, h: 1,
                goldReward: 30, potionReward: false
            },
            {
                id: 'furn_lib_bookcase2',
                type: FURNITURE_TYPE.BOOKCASE,
                name: 'Archivo de Loretome',
                roomId: 'library',
                col: 28, row: 8, w: 2, h: 1,
                goldReward: 35, potionReward: false
            },
            {
                id: 'furn_lib_chest',
                type: FURNITURE_TYPE.CHEST,
                name: 'Arcón del Escriba',
                roomId: 'library',
                col: 24, row: 9, w: 1, h: 1,
                goldReward: 65, potionReward: true
            },
            {
                id: 'furn_torture_rack',
                type: FURNITURE_TYPE.RACK,
                name: 'Potro de Tortura',
                roomId: 'torture',
                col: 4, row: 16, w: 2, h: 1,
                goldReward: 40, potionReward: false
            },
            {
                id: 'furn_torture_sarcophagus',
                type: FURNITURE_TYPE.SARCOPHAGUS,
                name: 'Sarcófago del Rey Caído',
                roomId: 'torture',
                col: 5, row: 19, w: 2, h: 1,
                goldReward: 70, potionReward: true
            },
            {
                id: 'furn_alchemy_bench',
                type: FURNITURE_TYPE.ALCHEMIST_BENCH,
                name: 'Mesa del Alquimista',
                roomId: 'alchemy',
                col: 14, row: 17, w: 2, h: 1,
                goldReward: 45, potionReward: true
            },
            {
                id: 'furn_alchemy_chest',
                type: FURNITURE_TYPE.CHEST,
                name: 'Baúl de Reactivos',
                roomId: 'alchemy',
                col: 13, row: 20, w: 1, h: 1,
                goldReward: 60, potionReward: true
            },
            {
                id: 'furn_treasury_chest1',
                type: FURNITURE_TYPE.CHEST,
                name: 'Cofre del Tesoro Imperial',
                roomId: 'treasury',
                col: 19, row: 16, w: 1, h: 1,
                goldReward: 95, potionReward: true
            },
            {
                id: 'furn_treasury_chest2',
                type: FURNITURE_TYPE.CHEST,
                name: 'Cofre de Joyas de la Corona',
                roomId: 'treasury',
                col: 22, row: 16, w: 1, h: 1,
                goldReward: 110, potionReward: false
            },
            {
                id: 'furn_treasury_sarcophagus',
                type: FURNITURE_TYPE.SARCOPHAGUS,
                name: 'Sepulcro de Oro Antiguo',
                roomId: 'treasury',
                col: 20, row: 19, w: 2, h: 1,
                goldReward: 85, potionReward: true
            },
            {
                id: 'furn_sanctum_fireplace',
                type: FURNITURE_TYPE.FIREPLACE,
                name: 'Hogar de Fuego Negro',
                roomId: 'sanctum',
                col: 25, row: 15, w: 2, h: 1,
                goldReward: 50, potionReward: true
            },
            {
                id: 'furn_sanctum_throne',
                type: FURNITURE_TYPE.THRONE,
                name: 'Trono Carmesí de Zargon',
                roomId: 'sanctum',
                col: 27, row: 20, w: 1, h: 1,
                goldReward: 100, potionReward: true
            },
            {
                id: 'furn_sanctum_chest',
                type: FURNITURE_TYPE.CHEST,
                name: 'Relicario del Caos',
                roomId: 'sanctum',
                col: 29, row: 20, w: 1, h: 1,
                goldReward: 125, potionReward: true
            }
        ];

        if (prisonerHeroId) {
            const heroObj = HEROES_DATA[prisonerHeroId] || HEROES_DATA.dwarf;
            rawFurniture.push({
                id: `cage_${ZONE_ID.DUNGEON_FELLMARG}`,
                type: FURNITURE_TYPE.HERO_CAGE,
                name: `Jaula Rúnica de ${heroObj.name}`,
                prisonerHeroId,
                prisonerName: heroObj.name,
                roomId: 'sanctum',
                col: 24, row: 20, w: 1, h: 1,
                goldReward: 80, potionReward: true
            });
        }

        const torches = [
            { col: 5, row: 3 }, { col: 8, row: 3 },
            { col: 15, row: 3 }, { col: 18, row: 3 },
            { col: 25, row: 3 }, { col: 28, row: 3 },
            { col: 5, row: 14 }, { col: 8, row: 14 },
            { col: 15, row: 14 }, { col: 21, row: 14 },
            { col: 26, row: 14 }, { col: 29, row: 14 },
            { col: 11, row: 11 }, { col: 21, row: 11 }
        ].map((t) => ({
            ...t,
            x: (t.col + 0.5) * TILE,
            y: (t.row + 0.85) * TILE
        }));

        const rawTraps = [
            { id: 'trap_1', type: TRAP_TYPE.PIT, name: 'Trampa de Foso', col: 11, row: 9, damage: 20 },
            { id: 'trap_2', type: TRAP_TYPE.SPEAR, name: 'Trampa de Lanza', col: 9, row: 12, damage: 22 },
            { id: 'trap_3', type: TRAP_TYPE.BOULDER, name: 'Roca Desprendida', col: 18, row: 12, damage: 28 },
            { id: 'trap_4', type: TRAP_TYPE.PIT, name: 'Trampa de Foso', col: 21, row: 6, damage: 20 },
            { id: 'trap_5', type: TRAP_TYPE.SPEAR, name: 'Trampa de Lanza', col: 24, row: 12, damage: 24 },
            { id: 'trap_6', type: TRAP_TYPE.PIT, name: 'Trampa de Foso', col: 10, row: 16, damage: 20 },
            { id: 'trap_7', type: TRAP_TYPE.SPEAR, name: 'Lanza Pielverde', col: 15, row: 8, damage: 22 },
            { id: 'trap_8', type: TRAP_TYPE.PIT, name: 'Foso de la Biblioteca', col: 26, row: 6, damage: 22 },
            { id: 'trap_9', type: TRAP_TYPE.SPEAR, name: 'Aguja de Tortura', col: 6, row: 16, damage: 24 },
            { id: 'trap_10', type: TRAP_TYPE.BOULDER, name: 'Derrumbe Alquímico', col: 14, row: 16, damage: 26 },
            { id: 'trap_11', type: TRAP_TYPE.SPEAR, name: 'Trampa de la Tesorería', col: 20, row: 16, damage: 26 },
            { id: 'trap_12', type: TRAP_TYPE.PIT, name: 'Foso Real', col: 21, row: 18, damage: 24 },
            { id: 'trap_13', type: TRAP_TYPE.BOULDER, name: 'Trampa del Santuario', col: 27, row: 16, damage: 30 },
            { id: 'trap_14', type: TRAP_TYPE.SPEAR, name: 'Lanza del Caos', col: 26, row: 19, damage: 28 }
        ];

        const monsterSpawns = [
            { type: 'goblin', col: 11.5, row: 4.5, roomId: null },
            { type: 'orc', col: 12.2, row: 5.5, roomId: null },
            { type: 'goblin', col: 8.5, row: 12.5, roomId: null },
            { type: 'orc', col: 14.5, row: 12.5, roomId: null },
            { type: 'skeleton', col: 21.5, row: 9.5, roomId: null },
            { type: 'skeleton', col: 22.2, row: 10.5, roomId: null },
            { type: 'fimir', col: 29.5, row: 12.5, roomId: null },

            { type: 'goblin', col: 15.2, row: 5.8, roomId: 'guardroom' },
            { type: 'goblin', col: 14.8, row: 9.2, roomId: 'guardroom' },
            { type: 'orc', col: 17.5, row: 6.5, roomId: 'guardroom' },
            { type: 'orc', col: 18.2, row: 8.5, roomId: 'guardroom' },
            { type: 'fimir', col: 16.5, row: 9.5, roomId: 'guardroom' },

            { type: 'skeleton', col: 25.2, row: 6.2, roomId: 'library' },
            { type: 'skeleton', col: 26.2, row: 9.5, roomId: 'library' },
            { type: 'orc', col: 27.5, row: 7.2, roomId: 'library' },
            { type: 'fimir', col: 28.5, row: 6.2, roomId: 'library' },

            { type: 'skeleton', col: 5.2, row: 17.5, roomId: 'torture' },
            { type: 'skeleton', col: 7.5, row: 16.2, roomId: 'torture' },
            { type: 'orc', col: 7.5, row: 20.2, roomId: 'torture' },
            { type: 'fimir', col: 4.8, row: 20.2, roomId: 'torture' },

            { type: 'fimir', col: 14.5, row: 19.0, roomId: 'alchemy' },
            { type: 'fimir', col: 15.8, row: 19.2, roomId: 'alchemy' },
            { type: 'orc', col: 15.5, row: 16.0, roomId: 'alchemy' },
            { type: 'goblin', col: 13.6, row: 16.2, roomId: 'alchemy' },

            { type: 'fimir', col: 20.2, row: 17.5, roomId: 'treasury' },
            { type: 'fimir', col: 21.8, row: 17.5, roomId: 'treasury' },
            { type: 'orc', col: 21.5, row: 20.2, roomId: 'treasury' },
            { type: 'skeleton', col: 19.5, row: 20.2, roomId: 'treasury' },

            { type: 'gargoyle', col: 27.5, row: 18.5, roomId: 'sanctum' },
            { type: 'fimir', col: 25.8, row: 17.2, roomId: 'sanctum' },
            { type: 'fimir', col: 28.8, row: 17.2, roomId: 'sanctum' },
            { type: 'orc', col: 26.2, row: 19.6, roomId: 'sanctum' },
            { type: 'skeleton', col: 28.5, row: 19.6, roomId: 'sanctum' }
        ];

        return this._finalizeDungeonBoard({
            zoneId: ZONE_ID.DUNGEON_FELLMARG,
            zoneName: 'Bastión de Fellmarg (Rescate I)',
            bossName: 'Gárgola del Caos',
            prisonerHeroId,
            isFinalDungeon: false,
            cols,
            rows,
            grid,
            fog,
            roomGrid,
            tileVariants,
            rooms,
            doors,
            rawFurniture,
            torches,
            rawTraps,
            monsterSpawns,
            stairsCol: 5,
            stairsRow: 6,
            playerSpawn: { x: 7.6 * TILE, y: 7.2 * TILE },
            companionSpawns: [
                { x: 7.6 * TILE, y: 5.5 * TILE },
                { x: 7.6 * TILE, y: 8.8 * TILE },
                { x: 8.8 * TILE, y: 7.2 * TILE }
            ]
        });
    }

    /**
     * Genera las otras 3 Mazmorras del Bosque (Cripta del Rey Brujo, Forja de Kellar, Templo del Pantano)
     * con arquitectura propia de 6 salas, paleta temática, mobiliario, trampas y Jefe propio.
     */
    static _generateVariantDungeon({ zoneId, zoneName, bossName, theme, prisonerHeroId = null, isFinalDungeon = false }) {
        const cols = BOARD_COLS;
        const rows = BOARD_ROWS;

        const grid = Array.from({ length: rows }, () =>
            new Array(cols).fill(CELL.WALL)
        );
        const fog = Array.from({ length: rows }, () =>
            new Array(cols).fill(FOG.UNSEEN)
        );
        const roomGrid = Array.from({ length: rows }, () =>
            new Array(cols).fill(null)
        );
        const tileVariants = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (__, c) => ((r * 29 + c * 43 + 11) % 100) / 100)
        );

        const carveCorridorRect = (c1, r1, c2, r2) => {
            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                    if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
                        grid[r][c] = CELL.CORRIDOR;
                    }
                }
            }
        };

        // Anillo de pasillos y galería central cruzada
        carveCorridorRect(2, 2, 31, 3);
        carveCorridorRect(2, 12, 31, 13);
        carveCorridorRect(2, 22, 31, 23);
        carveCorridorRect(2, 2, 3, 23);
        carveCorridorRect(12, 2, 13, 23);
        carveCorridorRect(21, 2, 22, 23);
        carveCorridorRect(30, 2, 31, 23);

        const paletteByTheme = {
            crypt: {
                fA: '#2d283e', fB: '#231f32', carpet: '#581c87',
                bossA: '#3b1d3e', bossB: '#2a122d', bossCarpet: '#9333ea'
            },
            kellar: {
                fA: '#3f2e26', fB: '#33241d', carpet: '#b45309',
                bossA: '#451a03', bossB: '#2e1002', bossCarpet: '#ea580c'
            },
            swamp: {
                fA: '#233934', fB: '#1b2e2a', carpet: '#0f766e',
                bossA: '#134e4a', bossB: '#0f3936', bossCarpet: '#10b981'
            }
        };
        const pal = paletteByTheme[theme] || paletteByTheme.crypt;

        const rooms = [
            {
                id: 'entrance',
                name: 'Vestíbulo de la Escalera (Salida al Bosque)',
                c1: 5, r1: 5, c2: 10, r2: 10,
                floorColorA: pal.fA,
                floorColorB: pal.fB,
                carpetColor: pal.carpet,
                discovered: true,
                loreText: MENTOR_LORE.rooms.entrance
            },
            {
                id: 'hall_north',
                name: theme === 'crypt' ? 'Panteón de los Caídos' : (theme === 'kellar' ? 'Gran Fragua Enana' : 'Altar de las Mareas Verdes'),
                c1: 15, r1: 5, c2: 19, r2: 10,
                floorColorA: pal.fA,
                floorColorB: pal.fB,
                carpetColor: pal.carpet,
                discovered: false,
                loreText: theme === 'crypt' ? MENTOR_LORE.rooms.crypt_hall : (theme === 'kellar' ? MENTOR_LORE.rooms.kellar_smith : MENTOR_LORE.rooms.swamp_shrine)
            },
            {
                id: 'sanctuary_ne',
                name: theme === 'crypt' ? 'Archivo Necromántico' : (theme === 'kellar' ? 'Armería de Mithril' : 'Cámara de Destilación'),
                c1: 24, r1: 5, c2: 28, r2: 10,
                floorColorA: pal.fA,
                floorColorB: pal.fB,
                carpetColor: pal.carpet,
                discovered: false,
                loreText: MENTOR_LORE.rooms.library
            },
            {
                id: 'crypt_sw',
                name: theme === 'crypt' ? 'Osario Real' : (theme === 'kellar' ? 'Barracones de Ulag' : 'Criadero de la Ciénaga'),
                c1: 5, r1: 15, c2: 10, r2: 20,
                floorColorA: pal.fA,
                floorColorB: pal.fB,
                carpetColor: pal.carpet,
                discovered: false,
                loreText: theme === 'crypt' ? MENTOR_LORE.rooms.crypt_ossuary : (theme === 'kellar' ? MENTOR_LORE.rooms.kellar_vault : MENTOR_LORE.rooms.swamp_pools)
            },
            {
                id: 'vault_south',
                name: theme === 'crypt' ? 'Cámara de las Reliquias' : (theme === 'kellar' ? 'Bóveda del Oro Fundido' : 'Tesoro Sumergido'),
                c1: 15, r1: 15, c2: 19, r2: 20,
                floorColorA: pal.fA,
                floorColorB: pal.fB,
                carpetColor: '#b45309',
                discovered: false,
                loreText: MENTOR_LORE.rooms.treasury
            },
            {
                id: 'sanctum',
                name: theme === 'crypt' ? 'Trono del Rey Brujo' : (theme === 'kellar' ? 'Corazón del Magma' : 'Trono del Pantano'),
                c1: 24, r1: 15, c2: 28, r2: 20,
                floorColorA: pal.bossA,
                floorColorB: pal.bossB,
                carpetColor: pal.bossCarpet,
                discovered: false,
                isBossRoom: true,
                loreText: theme === 'crypt' ? MENTOR_LORE.rooms.crypt_throne : (theme === 'kellar' ? MENTOR_LORE.rooms.kellar_core : MENTOR_LORE.rooms.swamp_sanctum)
            }
        ];

        for (const room of rooms) {
            for (let r = room.r1; r <= room.r2; r++) {
                for (let c = room.c1; c <= room.c2; c++) {
                    grid[r][c] = CELL.FLOOR;
                    roomGrid[r][c] = room.id;
                }
            }
        }

        // Escalera Imperial de Salida al Bosque (2x2)
        grid[6][6] = CELL.STAIRS;
        grid[6][7] = CELL.STAIRS;
        grid[7][6] = CELL.STAIRS;
        grid[7][7] = CELL.STAIRS;

        const rawDoors = [
            { id: `${zoneId}_d1`, col: 11, row: 7, orientation: 'vertical', roomId: 'entrance' },
            { id: `${zoneId}_d2`, col: 7, row: 11, orientation: 'horizontal', roomId: 'entrance' },
            { id: `${zoneId}_d3`, col: 14, row: 7, orientation: 'vertical', roomId: 'hall_north' },
            { id: `${zoneId}_d4`, col: 20, row: 7, orientation: 'vertical', roomId: 'hall_north' },
            { id: `${zoneId}_d5`, col: 17, row: 11, orientation: 'horizontal', roomId: 'hall_north' },
            { id: `${zoneId}_d6`, col: 23, row: 7, orientation: 'vertical', roomId: 'sanctuary_ne' },
            { id: `${zoneId}_d7`, col: 26, row: 11, orientation: 'horizontal', roomId: 'sanctuary_ne' },
            { id: `${zoneId}_d8`, col: 7, row: 14, orientation: 'horizontal', roomId: 'crypt_sw' },
            { id: `${zoneId}_d9`, col: 11, row: 17, orientation: 'vertical', roomId: 'crypt_sw' },
            { id: `${zoneId}_d10`, col: 17, row: 14, orientation: 'horizontal', roomId: 'vault_south' },
            { id: `${zoneId}_d11`, col: 20, row: 17, orientation: 'vertical', roomId: 'vault_south' },
            { id: `${zoneId}_d12`, col: 26, row: 14, orientation: 'horizontal', roomId: 'sanctum', isBossDoor: true }
        ];

        const doors = rawDoors.map((d) => {
            grid[d.row][d.col] = CELL.FLOOR;
            return {
                ...d,
                open: false,
                x: (d.col + 0.5) * TILE,
                y: (d.row + 0.5) * TILE
            };
        });

        const rawFurniture = [
            { id: `${zoneId}_f1`, type: FURNITURE_TYPE.TABLE, name: 'Mesa de Guardia', roomId: 'entrance', col: 5, row: 5, w: 2, h: 1, goldReward: 30, potionReward: false },
            { id: `${zoneId}_f2`, type: FURNITURE_TYPE.SARCOPHAGUS, name: 'Sarcófago Ancestral', roomId: 'hall_north', col: 16, row: 6, w: 2, h: 1, goldReward: 65, potionReward: true },
            { id: `${zoneId}_f3`, type: FURNITURE_TYPE.WEAPONS_RACK, name: 'Armero Antiguo', roomId: 'hall_north', col: 18, row: 9, w: 2, h: 1, goldReward: 45, potionReward: false },
            { id: `${zoneId}_f4`, type: FURNITURE_TYPE.BOOKCASE, name: 'Estantería Arcana', roomId: 'sanctuary_ne', col: 24, row: 5, w: 2, h: 1, goldReward: 50, potionReward: true },
            { id: `${zoneId}_f5`, type: FURNITURE_TYPE.ALCHEMIST_BENCH, name: 'Mesa de Alquimia', roomId: 'sanctuary_ne', col: 26, row: 8, w: 2, h: 1, goldReward: 55, potionReward: true },
            { id: `${zoneId}_f6`, type: FURNITURE_TYPE.RACK, name: 'Potro de Hierro', roomId: 'crypt_sw', col: 5, row: 16, w: 2, h: 1, goldReward: 45, potionReward: false },
            { id: `${zoneId}_f7`, type: FURNITURE_TYPE.CHEST, name: 'Cofre de Hierro', roomId: 'crypt_sw', col: 9, row: 19, w: 1, h: 1, goldReward: 85, potionReward: true },
            { id: `${zoneId}_f8`, type: FURNITURE_TYPE.CHEST, name: 'Cofre Real I', roomId: 'vault_south', col: 15, row: 16, w: 1, h: 1, goldReward: 110, potionReward: true },
            { id: `${zoneId}_f9`, type: FURNITURE_TYPE.CHEST, name: 'Cofre Real II', roomId: 'vault_south', col: 19, row: 16, w: 1, h: 1, goldReward: 110, potionReward: false },
            { id: `${zoneId}_f10`, type: FURNITURE_TYPE.SARCOPHAGUS, name: 'Tumba Dorada', roomId: 'vault_south', col: 16, row: 19, w: 2, h: 1, goldReward: 90, potionReward: true },
            { id: `${zoneId}_f11`, type: FURNITURE_TYPE.FIREPLACE, name: 'Altar de Llamas', roomId: 'sanctum', col: 24, row: 15, w: 2, h: 1, goldReward: 60, potionReward: true },
            { id: `${zoneId}_f12`, type: FURNITURE_TYPE.THRONE, name: `Trono de ${bossName}`, roomId: 'sanctum', col: 26, row: 19, w: 1, h: 1, goldReward: 130, potionReward: true },
            { id: `${zoneId}_f13`, type: FURNITURE_TYPE.CHEST, name: 'Gran Cofre del Santuario', roomId: 'sanctum', col: 28, row: 19, w: 1, h: 1, goldReward: 150, potionReward: true }
        ];

        if (prisonerHeroId && !isFinalDungeon) {
            const heroObj = HEROES_DATA[prisonerHeroId] || HEROES_DATA.elf;
            rawFurniture.push({
                id: `cage_${zoneId}`,
                type: FURNITURE_TYPE.HERO_CAGE,
                name: `Jaula Rúnica de ${heroObj.name}`,
                prisonerHeroId,
                prisonerName: heroObj.name,
                roomId: 'sanctum',
                col: 24, row: 19, w: 1, h: 1,
                goldReward: 95, potionReward: true
            });
        }

        const torches = [
            { col: 6, row: 4 }, { col: 9, row: 4 },
            { col: 16, row: 4 }, { col: 18, row: 4 },
            { col: 25, row: 4 }, { col: 27, row: 4 },
            { col: 6, row: 14 }, { col: 16, row: 14 }, { col: 25, row: 14 }
        ].map((t) => ({
            ...t,
            x: (t.col + 0.5) * TILE,
            y: (t.row + 0.85) * TILE
        }));

        const rawTraps = [
            { id: `${zoneId}_t1`, type: TRAP_TYPE.PIT, name: 'Foso Oculto', col: 12, row: 9, damage: 22 },
            { id: `${zoneId}_t2`, type: TRAP_TYPE.SPEAR, name: 'Trampa de Lanzas', col: 16, row: 12, damage: 24 },
            { id: `${zoneId}_t3`, type: TRAP_TYPE.BOULDER, name: 'Trampa de Roca', col: 21, row: 9, damage: 28 },
            { id: `${zoneId}_t4`, type: TRAP_TYPE.PIT, name: 'Foso de la Cripta', col: 8, row: 16, damage: 22 },
            { id: `${zoneId}_t5`, type: TRAP_TYPE.SPEAR, name: 'Lanza de la Bóveda', col: 17, row: 17, damage: 26 },
            { id: `${zoneId}_t6`, type: TRAP_TYPE.BOULDER, name: 'Trampa del Trono', col: 26, row: 16, damage: 30 }
        ];

        const primaryMob = theme === 'crypt' ? 'skeleton' : (theme === 'kellar' ? 'orc' : 'fimir');
        const secondaryMob = theme === 'crypt' ? 'fimir' : (theme === 'kellar' ? 'goblin' : 'orc');

        const monsterSpawns = [
            { type: secondaryMob, col: 12.5, row: 5.5, roomId: null },
            { type: primaryMob, col: 18.5, row: 12.5, roomId: null },
            { type: primaryMob, col: 21.5, row: 10.5, roomId: null },

            { type: primaryMob, col: 16.2, row: 7.5, roomId: 'hall_north' },
            { type: primaryMob, col: 18.2, row: 8.5, roomId: 'hall_north' },
            { type: secondaryMob, col: 17.5, row: 6.2, roomId: 'hall_north' },

            { type: primaryMob, col: 25.5, row: 7.2, roomId: 'sanctuary_ne' },
            { type: 'fimir', col: 27.2, row: 8.8, roomId: 'sanctuary_ne' },

            { type: primaryMob, col: 6.5, row: 17.5, roomId: 'crypt_sw' },
            { type: secondaryMob, col: 8.8, row: 18.5, roomId: 'crypt_sw' },
            { type: 'orc', col: 7.5, row: 19.2, roomId: 'crypt_sw' },

            { type: 'fimir', col: 16.5, row: 17.5, roomId: 'vault_south' },
            { type: primaryMob, col: 18.2, row: 18.2, roomId: 'vault_south' },

            { type: 'gargoyle', col: 26.5, row: 18.2, roomId: 'sanctum' },
            { type: primaryMob, col: 25.0, row: 17.2, roomId: 'sanctum' },
            { type: 'fimir', col: 27.8, row: 17.2, roomId: 'sanctum' }
        ];

        return this._finalizeDungeonBoard({
            zoneId,
            zoneName,
            bossName,
            prisonerHeroId,
            isFinalDungeon,
            cols,
            rows,
            grid,
            fog,
            roomGrid,
            tileVariants,
            rooms,
            doors,
            rawFurniture,
            torches,
            rawTraps,
            monsterSpawns,
            stairsCol: 6,
            stairsRow: 6,
            playerSpawn: { x: 8.6 * TILE, y: 7.5 * TILE },
            companionSpawns: [
                { x: 8.6 * TILE, y: 6.0 * TILE },
                { x: 8.6 * TILE, y: 9.0 * TILE },
                { x: 9.6 * TILE, y: 7.5 * TILE }
            ]
        });
    }

    /**
     * Ensambla el objeto board de mazmorra con todos sus métodos de colisión, LOS y escalera de salida.
     */
    static _finalizeDungeonBoard({
        zoneId,
        zoneName,
        bossName,
        prisonerHeroId = null,
        isFinalDungeon = false,
        cols,
        rows,
        grid,
        fog,
        roomGrid,
        tileVariants,
        rooms,
        doors,
        rawFurniture,
        torches,
        rawTraps,
        monsterSpawns,
        stairsCol,
        stairsRow,
        playerSpawn,
        companionSpawns
    }) {
        const furniture = rawFurniture.map((f) => ({
            ...f,
            inspected: false,
            opened: false,
            x: f.col * TILE,
            y: f.row * TILE,
            width: f.w * TILE,
            height: f.h * TILE,
            centerX: (f.col + f.w * 0.5) * TILE,
            centerY: (f.row + f.h * 0.5) * TILE
        }));

        const traps = rawTraps.map((t) => ({
            ...t,
            state: 'hidden',
            cooldown: 0,
            x: (t.col + 0.5) * TILE,
            y: (t.row + 0.5) * TILE,
            radius: 17
        }));

        const doorMap = new Map();
        for (const d of doors) {
            doorMap.set(`${d.col},${d.row}`, d);
        }

        const roomMap = new Map();
        for (const r of rooms) {
            roomMap.set(r.id, r);
        }

        // Escalera Imperial interactuable para salir al Bosque de Loretome
        const exitStairs = {
            id: `exit_stairs_${zoneId}`,
            col: stairsCol,
            row: stairsRow,
            x: (stairsCol + 1.0) * TILE,
            y: (stairsRow + 1.0) * TILE,
            targetZoneId: ZONE_ID.OVERWORLD,
            label: '🌲 [E / 0] Subir Escalera -> Salir al Bosque (Mundo Libre)'
        };

        return {
            zoneId,
            zoneName,
            bossName,
            prisonerHeroId,
            isFinalDungeon,
            isOverworld: false,
            cols,
            rows,
            width: cols * TILE,
            height: rows * TILE,
            grid,
            fog,
            roomGrid,
            tileVariants,
            rooms,
            roomMap,
            doors,
            doorMap,
            portals: [],
            exitStairs,
            furniture,
            torches,
            traps,
            monsterSpawns,
            playerSpawn,
            companionSpawns,

            getDoorAt(col, row) {
                return doorMap.get(`${col},${row}`) || null;
            },

            getRoomAt(col, row) {
                if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
                const id = roomGrid[row][col];
                return id ? roomMap.get(id) || null : null;
            },

            isOpaqueCell(col, row) {
                if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
                if (grid[row][col] === CELL.WALL || grid[row][col] === CELL.VOID) return true;
                const door = doorMap.get(`${col},${row}`);
                if (door && !door.open) return true;
                return false;
            },

            isSolidCell(col, row) {
                if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
                if (grid[row][col] === CELL.WALL || grid[row][col] === CELL.VOID) return true;
                const door = doorMap.get(`${col},${row}`);
                if (door && !door.open) return true;
                return false;
            },

            isPositionBlocked(x, y, radius = 14, z = 0) {
                const minCol = Math.floor((x - radius) / TILE);
                const maxCol = Math.floor((x + radius) / TILE);
                const minRow = Math.floor((y - radius) / TILE);
                const maxRow = Math.floor((y + radius) / TILE);

                for (let r = minRow; r <= maxRow; r++) {
                    for (let c = minCol; c <= maxCol; c++) {
                        if (this.isSolidCell(c, r)) {
                            const rectX = c * TILE;
                            const rectY = r * TILE;
                            if (circleIntersectsRect(x, y, radius, rectX, rectY, TILE, TILE)) {
                                return true;
                            }
                        }
                    }
                }

                for (const furn of furniture) {
                    if (furn.type === FURNITURE_TYPE.HERO_CAGE && furn.opened) {
                        continue;
                    }
                    const isLowFurniture =
                        furn.type === FURNITURE_TYPE.CHEST ||
                        furn.type === FURNITURE_TYPE.TABLE ||
                        furn.type === FURNITURE_TYPE.RACK;

                    if (isLowFurniture && z > 22) {
                        continue;
                    }

                    const pad = 4;
                    if (
                        circleIntersectsRect(
                            x,
                            y,
                            radius,
                            furn.x + pad,
                            furn.y + pad,
                            furn.width - pad * 2,
                            furn.height - pad * 2
                        )
                    ) {
                        return true;
                    }
                }

                return false;
            }
        };
    }
}

function circleIntersectsRect(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
}

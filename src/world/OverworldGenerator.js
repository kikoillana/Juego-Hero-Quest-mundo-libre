/**
 * @fileoverview Generador del Gran Bosque Real de Loretome (Mapa Multiplicado x4: 104x76 celdas = 7.904 casillas).
 * Inspirado en Zelda: A Link to the Past y HeroQuest.
 * Incluye:
 * - 8 Grandes Regiones conectadas por senderos reales y 5 puentes sobre el Gran Río.
 * - Campamento Real Central y Aldea de Loretome (Hoguera, Forja, Manantial, Tablón de Misiones, Piedras de Viaje).
 * - 6 NPCs interactuables dadores de Misiones Secundarias (Armas Legendarias, Habilidades y Oro).
 * - Nodos de Misión Secundaria (3 Fragmentos de Meteorito, 3 Altares Corruptos, Flores de Luz Lunar y Caudillo Fimir).
 * - 3 Entradas a Mazmorras de Rescate de Héroes + 1 Entrada Sellada al Santuario del Reto Final (requiere 4/4 Héroes).
 * Capa 3: Depende únicamente de config/*.
 */

import {
    TILE,
    OVERWORLD_COLS,
    OVERWORLD_ROWS,
    CELL,
    FOG,
    ZONE_ID,
    FURNITURE_TYPE
} from '../config/constants.js';

export class OverworldGenerator {
    /**
     * Genera el mapa completo del Bosque Exterior 4x (104x76 celdas).
     * @returns {Object} Estructura de tablero compatible con el motor 2.5D.
     */
    static generate() {
        const cols = OVERWORLD_COLS; // 104
        const rows = OVERWORLD_ROWS; // 76

        // 1. Inicializar matriz con HIERBA del bosque por defecto
        const grid = Array.from({ length: rows }, () =>
            new Array(cols).fill(CELL.GRASS)
        );

        // En el Bosque Exterior la visibilidad es plena a la luz del día
        const fog = Array.from({ length: rows }, () =>
            new Array(cols).fill(FOG.VISIBLE)
        );

        const roomGrid = Array.from({ length: rows }, () =>
            new Array(cols).fill(null)
        );

        const tileVariants = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (__, c) => ((r * 41 + c * 23 + (r ^ c) * 7) % 100) / 100)
        );

        const fillRect = (c1, r1, c2, r2, cellType) => {
            for (let r = Math.max(0, r1); r <= Math.min(rows - 1, r2); r++) {
                for (let c = Math.max(0, c1); c <= Math.min(cols - 1, c2); c++) {
                    grid[r][c] = cellType;
                }
            }
        };

        // 2. Suelo sombreado de bosque en las 4 esquinas y arboledas profundas
        fillRect(3, 3, 36, 24, CELL.FOREST_FLOOR);   // Bosque Profundo de Athel Loren (Noroeste)
        fillRect(3, 48, 38, 72, CELL.FOREST_FLOOR);  // Ciénaga Negra del Suroeste
        fillRect(72, 3, 100, 25, CELL.FOREST_FLOOR); // Valle del Río Norte (Noreste)
        fillRect(72, 48, 100, 72, CELL.FOREST_FLOOR);// Páramo de Ceniza (Sureste)
        fillRect(38, 4, 66, 18, CELL.FOREST_FLOOR);  // Riscos del Rey Brujo (Norte)

        // 3. El Gran Río de Loretome (cruza de Norte a Sur alrededor de cols 68..71) + Lago del Sur
        for (let r = 0; r < rows; r++) {
            const waveOffset = Math.round(Math.sin(r * 0.16) * 2.0);
            const riverC = 69 + waveOffset;
            for (let c = riverC - 2; c <= riverC + 1; c++) {
                if (c >= 0 && c < cols) {
                    grid[r][c] = CELL.WATER;
                }
            }
        }

        // Arroyo Occidental y Gran Laguna del Pantano Suroeste (junto al Santuario del Reto Final)
        fillRect(28, 56, 42, 66, CELL.WATER);
        fillRect(30, 54, 40, 68, CELL.WATER);
        // Estanque Élfico del Noroeste
        fillRect(20, 12, 26, 16, CELL.WATER);

        // 4. Cinco Puentes de Madera sobre el Gran Río y la Laguna
        fillRect(65, 14, 74, 16, CELL.BRIDGE); // Puente Norte
        fillRect(65, 26, 74, 27, CELL.BRIDGE); // Puente Medio-Norte
        fillRect(65, 36, 74, 39, CELL.BRIDGE); // Gran Puente Real Central
        fillRect(65, 52, 74, 54, CELL.BRIDGE); // Puente del Sur
        fillRect(65, 64, 74, 65, CELL.BRIDGE); // Puente del Páramo Sureste
        fillRect(27, 60, 43, 62, CELL.BRIDGE); // Calzada de Madera sobre la Laguna del Pantano

        // 5. Red de Caminos Reales de Tierra (conectando las 8 regiones y las 4 Mazmorras)
        // Gran Vía Real Este-Oeste (desde Bastión de Fellmarg col 14 hasta Forja de Kellar col 88)
        fillRect(14, 36, 65, 39, CELL.DIRT_PATH);
        fillRect(74, 36, 89, 39, CELL.DIRT_PATH);

        // Vía Real Norte-Sur (desde Cripta del Rey Brujo fila 9 hasta el Sur fila 65)
        fillRect(51, 9, 54, 65, CELL.DIRT_PATH);

        // Ruta Noroeste (hacia el Bosque de Athel Loren y el 1.º Altar / Meteorito)
        fillRect(16, 15, 51, 17, CELL.DIRT_PATH);
        fillRect(15, 15, 17, 36, CELL.DIRT_PATH);

        // Ruta Noreste (cruzando el Puente Norte hacia el Puesto del Guardabosques y Cascadas)
        fillRect(54, 14, 65, 16, CELL.DIRT_PATH);
        fillRect(74, 14, 88, 16, CELL.DIRT_PATH);
        fillRect(86, 16, 89, 36, CELL.DIRT_PATH);

        // Ruta Suroeste (hacia el Santuario Final de Zargon y la Ciénaga Negra)
        fillRect(21, 39, 24, 62, CELL.DIRT_PATH);
        fillRect(24, 60, 51, 62, CELL.DIRT_PATH);

        // Ruta Sureste (cruzando el Puente Sur hacia el Páramo de Ceniza y Bastión Orco)
        fillRect(54, 52, 65, 54, CELL.DIRT_PATH);
        fillRect(74, 52, 88, 54, CELL.DIRT_PATH);
        fillRect(86, 39, 89, 64, CELL.DIRT_PATH);
        fillRect(54, 64, 65, 65, CELL.DIRT_PATH);
        fillRect(74, 64, 89, 65, CELL.DIRT_PATH);

        // 6. Plazas de Piedra Antigua (Campamento Central + 4 Entradas de Mazmorra + Santuarios)
        // Gran Plaza del Campamento Real Central y Aldea de Loretome (Centro: cols 45..59, rows 32..43)
        fillRect(45, 32, 59, 43, CELL.STONE_PLAZA);

        // Plaza Mazmorra I: Bastión de Fellmarg (Oeste — Rescate Héroe #1)
        fillRect(10, 32, 18, 39, CELL.STONE_PLAZA);

        // Plaza Mazmorra II: Cripta del Rey Brujo (Norte — Rescate Héroe #2)
        fillRect(48, 6, 56, 12, CELL.STONE_PLAZA);

        // Plaza Mazmorra III: Forja Subterránea de Kellar (Este — Rescate Héroe #3)
        fillRect(84, 32, 92, 39, CELL.STONE_PLAZA);

        // Plaza Mazmorra IV (RETO FINAL): Santuario Supremo de Zargon (Suroeste — Requiere 4/4 Héroes)
        fillRect(18, 57, 26, 64, CELL.STONE_PLAZA);

        // Plazas de Santuarios Secundarios (Noroeste, Noreste y Sureste)
        fillRect(14, 13, 19, 18, CELL.STONE_PLAZA); // Claro Astral Noroeste
        fillRect(84, 12, 90, 17, CELL.STONE_PLAZA); // Mirador Noreste
        fillRect(84, 61, 90, 66, CELL.STONE_PLAZA); // Bastión de Piedra Sureste

        // 7. Escarpes Rocosos (Cliffs) detrás de las fortalezas y cordilleras
        fillRect(9, 29, 19, 31, CELL.CLIFF);   // Risco de Fellmarg (Oeste)
        fillRect(46, 3, 58, 5, CELL.CLIFF);    // Cordillera del Rey Brujo (Norte)
        fillRect(83, 29, 93, 31, CELL.CLIFF);  // Montaña de Kellar (Este)
        fillRect(17, 54, 27, 56, CELL.CLIFF);  // Acantilado del Santuario Final (Suroeste)
        fillRect(36, 20, 44, 22, CELL.CLIFF);  // Cresta rocosa central-norte
        fillRect(76, 44, 83, 46, CELL.CLIFF);  // Escarpe oriental

        // 8. Perímetro de Árboles Milenarios (Lost Woods)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r <= 2 || r >= rows - 3 || c <= 2 || c >= cols - 3) {
                    if (grid[r][c] !== CELL.WATER) {
                        grid[r][c] = CELL.TREE;
                    }
                }
            }
        }

        // Agrupaciones orgánicas de árboles formando bosques, claros y emboscadas en el mapa 4x
        const treeClusters = [
            // Cuadrante Noroeste (Athel Loren)
            { c1: 4, r1: 4, c2: 12, r2: 24 },
            { c1: 21, r1: 4, c2: 34, r2: 10 },
            { c1: 28, r1: 19, c2: 39, r2: 28 },
            { c1: 6, r1: 25, c2: 12, r2: 27 },
            // Cuadrante Suroeste (Ciénaga Negra)
            { c1: 4, r1: 42, c2: 14, r2: 70 },
            { c1: 29, r1: 44, c2: 41, r2: 51 },
            { c1: 16, r1: 66, c2: 36, r2: 71 },
            // Zona Central-Norte y Central-Sur
            { c1: 41, r1: 6, c2: 45, r2: 18 },
            { c1: 59, r1: 6, c2: 64, r2: 12 },
            { c1: 58, r1: 20, c2: 64, r2: 30 },
            { c1: 43, r1: 46, c2: 49, r2: 57 },
            { c1: 57, r1: 45, c2: 63, r2: 50 },
            { c1: 44, r1: 66, c2: 63, r2: 71 },
            // Cuadrante Noreste (Más allá del Gran Río)
            { c1: 74, r1: 4, c2: 82, r2: 11 },
            { c1: 91, r1: 4, c2: 99, r2: 26 },
            { c1: 75, r1: 19, c2: 83, r2: 28 },
            // Cuadrante Sureste (Páramo de Ceniza)
            { c1: 75, r1: 47, c2: 83, r2: 50 },
            { c1: 92, r1: 42, c2: 99, r2: 70 },
            { c1: 75, r1: 56, c2: 82, r2: 62 },
            { c1: 75, r1: 67, c2: 91, r2: 71 }
        ];

        for (const cl of treeClusters) {
            for (let r = cl.r1; r <= cl.r2; r++) {
                for (let c = cl.c1; c <= cl.c2; c++) {
                    if (grid[r]?.[c] === CELL.GRASS || grid[r]?.[c] === CELL.FOREST_FLOOR) {
                        if (tileVariants[r][c] > 0.18) {
                            grid[r][c] = CELL.TREE;
                        }
                    }
                }
            }
        }

        // 9. Las 8 Grandes Regiones del Bosque 4x (para el contador de exploración y mapa)
        const rooms = [
            {
                id: 'royal_camp',
                name: 'Campamento Real y Aldea de Loretome (Centro)',
                c1: 43, r1: 30, c2: 61, r2: 45,
                discovered: true
            },
            {
                id: 'west_gate',
                name: 'Ruinas Occidentales de Fellmarg (Oeste)',
                c1: 8, r1: 28, c2: 24, r2: 42,
                discovered: true
            },
            {
                id: 'north_barrows',
                name: 'Riscos de la Cripta del Rey Brujo (Norte)',
                c1: 45, r1: 3, c2: 60, r2: 16,
                discovered: false
            },
            {
                id: 'east_highlands',
                name: 'Tierras Altas de Kellar (Este)',
                c1: 80, r1: 28, c2: 96, r2: 42,
                discovered: false
            },
            {
                id: 'south_marsh',
                name: 'Ciénaga Negra y Santuario Final (Suroeste)',
                c1: 15, r1: 52, c2: 44, r2: 69,
                discovered: false
            },
            {
                id: 'nw_athel_glade',
                name: 'Bosque Ancestral de Athel Loren (Noroeste)',
                c1: 12, r1: 8, c2: 30, r2: 22,
                discovered: false
            },
            {
                id: 'ne_river_valley',
                name: 'Valle de las Cascadas del Norte (Noreste)',
                c1: 73, r1: 8, c2: 92, r2: 22,
                discovered: false
            },
            {
                id: 'se_ash_wastes',
                name: 'Páramo de Ceniza y Bastión Orco (Sureste)',
                c1: 73, r1: 50, c2: 92, r2: 68,
                discovered: false
            }
        ];

        for (const room of rooms) {
            for (let r = room.r1; r <= room.r2; r++) {
                for (let c = room.c1; c <= room.c2; c++) {
                    if (r >= 0 && r < rows && c >= 0 && c < cols) {
                        roomGrid[r][c] = room.id;
                    }
                }
            }
        }

        // 10. LAS 4 ENTRADAS A MAZMORRAS (3 Mazmorras de Rescate de Héroes + 1 Santuario del Reto Final)
        const portals = [
            {
                id: 'portal_fellmarg',
                targetZoneId: ZONE_ID.DUNGEON_FELLMARG,
                name: 'Bastión de Fellmarg (Rescate I)',
                subtitle: 'Mazmorra I — 1.º Compañero Cautivo',
                col: 14,
                row: 33,
                x: 14.5 * TILE,
                y: 33.5 * TILE,
                spawnOutX: 14.5 * TILE,
                spawnOutY: 36.5 * TILE,
                themeColor: '#ef4444',
                archStyle: 'fortress',
                requiresAllHeroes: false
            },
            {
                id: 'portal_crypt',
                targetZoneId: ZONE_ID.DUNGEON_CRYPT,
                name: 'Cripta del Rey Brujo (Rescate II)',
                subtitle: 'Mazmorra II — 2.º Compañero Cautivo',
                col: 52,
                row: 7,
                x: 52.5 * TILE,
                y: 7.5 * TILE,
                spawnOutX: 52.5 * TILE,
                spawnOutY: 10.5 * TILE,
                themeColor: '#c084fc',
                archStyle: 'crypt',
                requiresAllHeroes: false
            },
            {
                id: 'portal_kellar',
                targetZoneId: ZONE_ID.DUNGEON_KELLAR,
                name: 'Forja de Kellar (Rescate III)',
                subtitle: 'Mazmorra III — 3.º Compañero Cautivo',
                col: 88,
                row: 33,
                x: 88.5 * TILE,
                y: 33.5 * TILE,
                spawnOutX: 88.5 * TILE,
                spawnOutY: 36.5 * TILE,
                themeColor: '#f59e0b',
                archStyle: 'forge',
                requiresAllHeroes: false
            },
            {
                id: 'portal_swamp',
                targetZoneId: ZONE_ID.DUNGEON_SWAMP,
                name: 'Santuario Final de Zargon (RETO FINAL)',
                subtitle: 'Mazmorra IV — Requiere los 4 Héroes Reunidos (4/4)',
                col: 22,
                row: 58,
                x: 22.5 * TILE,
                y: 58.5 * TILE,
                spawnOutX: 22.5 * TILE,
                spawnOutY: 61.5 * TILE,
                themeColor: '#10b981',
                archStyle: 'swamp',
                requiresAllHeroes: true
            }
        ];

        // 11. LOS 6 NPCs DADORES DE MISIONES SECUNDARIAS EN EL BOSQUE
        const npcs = [
            {
                id: 'npc_varek',
                name: 'Capitán Varek',
                role: 'Guardia Imperial',
                questId: 'quest_green_threat',
                col: 48,
                row: 36,
                x: 48.5 * TILE,
                y: 36.5 * TILE,
                appearance: 'barbarian',
                baseColor: '#b91c1c'
            },
            {
                id: 'npc_durgan',
                name: 'Maestro Herrero Durgan',
                role: 'Forjador de Armas Estelares',
                questId: 'quest_star_steel',
                col: 46,
                row: 34,
                x: 46.5 * TILE,
                y: 34.5 * TILE,
                appearance: 'dwarf',
                baseColor: '#d97706'
            },
            {
                id: 'npc_lyra',
                name: 'Archimaga Lyra',
                role: 'Maestra de Tempestad [F]',
                questId: 'quest_arcane_storm',
                col: 55,
                row: 34,
                x: 55.5 * TILE,
                y: 34.5 * TILE,
                appearance: 'wizard',
                baseColor: '#3b82f6'
            },
            {
                id: 'npc_elara',
                name: 'Herborista Elara',
                role: 'Sanadora de Athel Loren',
                questId: 'quest_moonflowers',
                col: 57,
                row: 36,
                x: 57.5 * TILE,
                y: 36.5 * TILE,
                appearance: 'elf',
                baseColor: '#16a34a'
            },
            {
                id: 'npc_balthazar',
                name: 'Mercader Real Balthazar',
                role: 'Intendente de Tesoros',
                questId: 'quest_imperial_relics',
                col: 50,
                row: 41,
                x: 50.5 * TILE,
                y: 41.5 * TILE,
                appearance: 'wizard',
                baseColor: '#eab308'
            },
            {
                id: 'npc_eldon',
                name: 'Guardabosques Eldon',
                role: 'Cazador de la Ciénaga',
                questId: 'quest_swamp_warlord',
                col: 62,
                row: 36,
                x: 62.5 * TILE,
                y: 36.5 * TILE,
                appearance: 'elf',
                baseColor: '#059669'
            }
        ];

        // 12. Mobiliario e Interactuables del Bosque 4x (Campamento, Misiones, Cofres, Arbustos)
        const rawFurniture = [
            // === CAMPAMENTO REAL DEL CLARO CENTRAL (Centro: cols 45..59, rows 32..43) ===
            {
                id: 'ow_campfire',
                type: FURNITURE_TYPE.CAMPFIRE,
                name: 'Gran Hoguera del Campamento Real',
                roomId: 'royal_camp',
                col: 52, row: 37, w: 1, h: 1,
                goldReward: 0, potionReward: false
            },
            {
                id: 'ow_quest_board',
                type: FURNITURE_TYPE.QUEST_BOARD,
                name: 'Tablón Real de Misiones Secundarias y Rescates [J]',
                roomId: 'royal_camp',
                col: 54, row: 37, w: 2, h: 1,
                goldReward: 0, potionReward: false
            },
            {
                id: 'ow_anvil_shop',
                type: FURNITURE_TYPE.ANVIL_STALL,
                name: 'Forja Real de Campaña (Armería)',
                roomId: 'royal_camp',
                col: 47, row: 33, w: 2, h: 1,
                goldReward: 0, potionReward: false
            },
            {
                id: 'ow_elven_well',
                type: FURNITURE_TYPE.WELL,
                name: 'Manantial Élfico de Loretome',
                roomId: 'royal_camp',
                col: 57, row: 33, w: 1, h: 1,
                goldReward: 50, potionReward: true
            },
            {
                id: 'ow_waystone_center',
                type: FURNITURE_TYPE.WAYSTONE,
                name: 'Piedra Rúnica de Viaje Rápido',
                roomId: 'royal_camp',
                col: 52, row: 41, w: 1, h: 1,
                goldReward: 0, potionReward: false
            },
            {
                id: 'ow_sign_center',
                type: FURNITURE_TYPE.SIGNPOST,
                name: 'Poste Indicador del Claro Real',
                customText: '⬅️ Oeste: Bastión de Fellmarg (Rescate 1) | ⬆️ Norte: Cripta del Rey Brujo (Rescate 2) | ➡️ Este: Forja de Kellar (Rescate 3) | ↙️ Suroeste: Santuario Final de Zargon (Requiere 4/4 Héroes).',
                roomId: 'royal_camp',
                col: 49, row: 39, w: 1, h: 1,
                goldReward: 0, potionReward: false
            },
            {
                id: 'ow_sign_west',
                type: FURNITURE_TYPE.SIGNPOST,
                name: 'Cartel de las Ruinas Occidentales',
                customText: '🏰 Al norte de esta plaza: Bastión de Fellmarg (1.º Compañero Cautivo). Al Este por el Camino Real: Campamento Central y NPCs de Misiones Secundarias.',
                roomId: 'west_gate',
                col: 18, row: 35, w: 1, h: 1,
                goldReward: 0, potionReward: false
            },
            {
                id: 'ow_sign_final',
                type: FURNITURE_TYPE.SIGNPOST,
                name: 'Estela de los Cuatro Campeones',
                customText: '🔒 SANTUARIO FINAL DE ZARGON: Solo cuando el Héroe Líder haya rescatado a sus 3 compañeros en las mazmorras del Oeste, Norte y Este se abrirá este portal.',
                roomId: 'south_marsh',
                col: 25, row: 60, w: 1, h: 1,
                goldReward: 0, potionReward: false
            },

            // === OBJETIVOS DE MISIÓN SECUNDARIA II: 3 FRAGMENTOS DE METEORITO RÚNICO ===
            {
                id: 'ow_meteor_1',
                type: FURNITURE_TYPE.METEOR_NODE,
                name: 'Fragmento de Meteorito Rúnico (Oeste)',
                roomId: 'west_gate',
                col: 22, row: 32, w: 1, h: 1,
                goldReward: 45, potionReward: false
            },
            {
                id: 'ow_meteor_2',
                type: FURNITURE_TYPE.METEOR_NODE,
                name: 'Fragmento de Meteorito Rúnico (Noroeste)',
                roomId: 'nw_athel_glade',
                col: 16, row: 15, w: 1, h: 1,
                goldReward: 55, potionReward: false
            },
            {
                id: 'ow_meteor_3',
                type: FURNITURE_TYPE.METEOR_NODE,
                name: 'Fragmento de Meteorito Rúnico (Este)',
                roomId: 'east_highlands',
                col: 82, row: 34, w: 1, h: 1,
                goldReward: 60, potionReward: false
            },

            // === OBJETIVOS DE MISIÓN SECUNDARIA III: 3 ALTARES CORRUPTOS ===
            {
                id: 'ow_altar_1',
                type: FURNITURE_TYPE.CORRUPT_ALTAR,
                name: 'Altar Corrupto del Bosque Noroeste',
                roomId: 'nw_athel_glade',
                col: 28, row: 15, w: 1, h: 1,
                goldReward: 50, potionReward: false
            },
            {
                id: 'ow_altar_2',
                type: FURNITURE_TYPE.CORRUPT_ALTAR,
                name: 'Altar Corrupto de los Riscos del Norte',
                roomId: 'north_barrows',
                col: 48, row: 13, w: 1, h: 1,
                goldReward: 50, potionReward: false
            },
            {
                id: 'ow_altar_3',
                type: FURNITURE_TYPE.CORRUPT_ALTAR,
                name: 'Altar Corrupto del Valle Noreste',
                roomId: 'ne_river_valley',
                col: 87, row: 14, w: 1, h: 1,
                goldReward: 65, potionReward: true
            },

            // === OBJETIVOS DE MISIÓN SECUNDARIA IV: 6 FLORES DE LUZ LUNAR ===
            { id: 'ow_flower_1', type: FURNITURE_TYPE.MOONFLOWER, name: 'Flor de Luz Lunar', col: 36, row: 34, w: 1, h: 1, goldReward: 25, potionReward: false },
            { id: 'ow_flower_2', type: FURNITURE_TYPE.MOONFLOWER, name: 'Flor de Luz Lunar', col: 19, row: 18, w: 1, h: 1, goldReward: 25, potionReward: false },
            { id: 'ow_flower_3', type: FURNITURE_TYPE.MOONFLOWER, name: 'Flor de Luz Lunar', col: 55, row: 22, w: 1, h: 1, goldReward: 25, potionReward: false },
            { id: 'ow_flower_4', type: FURNITURE_TYPE.MOONFLOWER, name: 'Flor de Luz Lunar', col: 62, row: 28, w: 1, h: 1, goldReward: 25, potionReward: false },
            { id: 'ow_flower_5', type: FURNITURE_TYPE.MOONFLOWER, name: 'Flor de Luz Lunar', col: 78, row: 34, w: 1, h: 1, goldReward: 25, potionReward: false },
            { id: 'ow_flower_6', type: FURNITURE_TYPE.MOONFLOWER, name: 'Flor de Luz Lunar', col: 46, row: 56, w: 1, h: 1, goldReward: 25, potionReward: true },

            // === 8 COFRES DEL TESORO IMPERIAL EN LAS 8 REGIONES (Misión VI y Exploración) ===
            { id: 'ow_chest_1', type: FURNITURE_TYPE.CHEST, name: 'Cofre del Guardabosques Occidental', roomId: 'west_gate', col: 25, row: 30, w: 1, h: 1, goldReward: 95, potionReward: true },
            { id: 'ow_chest_2', type: FURNITURE_TYPE.CHEST, name: 'Arcón Élfico de Athel Loren', roomId: 'nw_athel_glade', col: 15, row: 13, w: 1, h: 1, goldReward: 120, potionReward: true },
            { id: 'ow_chest_3', type: FURNITURE_TYPE.CHEST, name: 'Relicario de los Riscos del Norte', roomId: 'north_barrows', col: 58, row: 14, w: 1, h: 1, goldReward: 110, potionReward: true },
            { id: 'ow_chest_4', type: FURNITURE_TYPE.CHEST, name: 'Cofre de las Cascadas del Noreste', roomId: 'ne_river_valley', col: 88, row: 12, w: 1, h: 1, goldReward: 130, potionReward: true },
            { id: 'ow_chest_5', type: FURNITURE_TYPE.CHEST, name: 'Tesoro de los Enanos de Kellar', roomId: 'east_highlands', col: 92, row: 33, w: 1, h: 1, goldReward: 125, potionReward: true },
            { id: 'ow_chest_6', type: FURNITURE_TYPE.CHEST, name: 'Cofre Sumergido de la Laguna', roomId: 'south_marsh', col: 44, row: 58, w: 1, h: 1, goldReward: 115, potionReward: true },
            { id: 'ow_chest_7', type: FURNITURE_TYPE.CHEST, name: 'Botín de Guerra del Páramo Sur', roomId: 'se_ash_wastes', col: 88, row: 63, w: 1, h: 1, goldReward: 150, potionReward: true },
            { id: 'ow_chest_8', type: FURNITURE_TYPE.CHEST, name: 'Cofre Real del Puente Central', roomId: 'royal_camp', col: 63, row: 41, w: 1, h: 1, goldReward: 85, potionReward: true },

            // === ARBUSTOS CORTABLES ESTILO ZELDA REPARTIDOS POR EL GRAN MAPA 4X ===
            { id: 'ow_bush_1', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Camino Oeste', col: 26, row: 35, w: 1, h: 1, goldReward: 20, potionReward: false },
            { id: 'ow_bush_2', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Camino Oeste', col: 27, row: 35, w: 1, h: 1, goldReward: 25, potionReward: true },
            { id: 'ow_bush_3', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Camino Oeste', col: 33, row: 35, w: 1, h: 1, goldReward: 18, potionReward: false },
            { id: 'ow_bush_4', type: FURNITURE_TYPE.BUSH, name: 'Arbusto Florido', col: 39, row: 35, w: 1, h: 1, goldReward: 25, potionReward: false },
            { id: 'ow_bush_5', type: FURNITURE_TYPE.BUSH, name: 'Arbusto Florido', col: 40, row: 35, w: 1, h: 1, goldReward: 22, potionReward: true },
            { id: 'ow_bush_6', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Claro Norte', col: 50, row: 25, w: 1, h: 1, goldReward: 24, potionReward: false },
            { id: 'ow_bush_7', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Claro Norte', col: 55, row: 25, w: 1, h: 1, goldReward: 28, potionReward: true },
            { id: 'ow_bush_8', type: FURNITURE_TYPE.BUSH, name: 'Arbusto de la Ribera', col: 63, row: 34, w: 1, h: 1, goldReward: 20, potionReward: false },
            { id: 'ow_bush_9', type: FURNITURE_TYPE.BUSH, name: 'Arbusto de la Ribera', col: 64, row: 34, w: 1, h: 1, goldReward: 30, potionReward: false },
            { id: 'ow_bush_10', type: FURNITURE_TYPE.BUSH, name: 'Arbusto Oriental', col: 77, row: 35, w: 1, h: 1, goldReward: 25, potionReward: true },
            { id: 'ow_bush_11', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Pantano', col: 20, row: 48, w: 1, h: 1, goldReward: 22, potionReward: false },
            { id: 'ow_bush_12', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Pantano', col: 25, row: 48, w: 1, h: 1, goldReward: 26, potionReward: true },
            { id: 'ow_bush_13', type: FURNITURE_TYPE.BUSH, name: 'Arbusto de Athel Loren', col: 22, row: 18, w: 1, h: 1, goldReward: 28, potionReward: false },
            { id: 'ow_bush_14', type: FURNITURE_TYPE.BUSH, name: 'Arbusto de las Cascadas', col: 80, row: 17, w: 1, h: 1, goldReward: 30, potionReward: true },
            { id: 'ow_bush_15', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Sur', col: 50, row: 50, w: 1, h: 1, goldReward: 22, potionReward: false },
            { id: 'ow_bush_16', type: FURNITURE_TYPE.BUSH, name: 'Arbusto del Páramo', col: 82, row: 55, w: 1, h: 1, goldReward: 32, potionReward: true },

            // === ROCAS Y TOCONES DEL GRAN BOSQUE ===
            { id: 'ow_rock_1', type: FURNITURE_TYPE.BOULDER_FIELD, name: 'Peñasco Musgoso', col: 32, row: 41, w: 1, h: 1, goldReward: 35, potionReward: false },
            { id: 'ow_rock_2', type: FURNITURE_TYPE.BOULDER_FIELD, name: 'Roca Rúnica del Río', col: 64, row: 28, w: 1, h: 1, goldReward: 45, potionReward: false },
            { id: 'ow_rock_3', type: FURNITURE_TYPE.BOULDER_FIELD, name: 'Piedra de los Riscos', col: 82, row: 32, w: 1, h: 1, goldReward: 40, potionReward: false },
            { id: 'ow_stump_1', type: FURNITURE_TYPE.STUMP, name: 'Tocón de Roble Milenario', col: 25, row: 22, w: 1, h: 1, goldReward: 40, potionReward: true },
            { id: 'ow_stump_2', type: FURNITURE_TYPE.STUMP, name: 'Tocón Hueco del Sur', col: 48, row: 58, w: 1, h: 1, goldReward: 45, potionReward: false }
        ];

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

        // Antorchas exteriores junto a los 4 Portales de Mazmorra y en el Campamento Real Central
        const torches = [
            // Portal Oeste (Fellmarg)
            { col: 12, row: 33 }, { col: 16, row: 33 },
            // Portal Norte (Cripta)
            { col: 50, row: 7 }, { col: 54, row: 7 },
            // Portal Este (Kellar)
            { col: 86, row: 33 }, { col: 90, row: 33 },
            // Portal Suroeste (Santuario Final)
            { col: 20, row: 58 }, { col: 24, row: 58 },
            // Campamento Central
            { col: 46, row: 37 }, { col: 58, row: 37 },
            { col: 51, row: 33 }, { col: 53, row: 33 }
        ].map((t) => ({
            ...t,
            x: (t.col + 0.5) * TILE,
            y: (t.row + 0.5) * TILE
        }));

        // 13. Patrullas de Enemigos en las 8 Regiones del Bosque 4x + Jefe Menor de Misión Secundaria V
        const monsterSpawns = [
            // Camino Occidental (Saqueadores Goblins — cerca para la Misión I)
            { type: 'goblin', col: 30.5, row: 36.5, roomId: null },
            { type: 'goblin', col: 34.5, row: 38.5, roomId: null },
            { type: 'orc', col: 24.5, row: 34.5, roomId: null },

            // Bosque Noroeste (Athel Loren)
            { type: 'goblin', col: 18.5, row: 16.5, roomId: null },
            { type: 'skeleton', col: 27.5, row: 16.5, roomId: null },
            { type: 'orc', col: 16.5, row: 24.5, roomId: null },

            // Senda hacia la Cripta Norte (Guardia Ósea)
            { type: 'skeleton', col: 51.5, row: 22.5, roomId: null },
            { type: 'skeleton', col: 53.5, row: 16.5, roomId: null },
            { type: 'orc', col: 49.5, row: 14.5, roomId: null },

            // Valle Noreste y Custodios de los Puentes
            { type: 'goblin', col: 78.5, row: 15.5, roomId: null },
            { type: 'skeleton', col: 85.5, row: 15.5, roomId: null },
            { type: 'orc', col: 76.5, row: 37.5, roomId: null },
            { type: 'orc', col: 81.5, row: 36.5, roomId: null },
            { type: 'fimir', col: 84.5, row: 38.5, roomId: null },

            // Senda del Sur y Ciénaga Negra
            { type: 'goblin', col: 22.5, row: 48.5, roomId: null },
            { type: 'orc', col: 46.5, row: 60.5, roomId: null },

            // JEFE MENOR DE MISIÓN SECUNDARIA V: Caudillo Fimir Kragosh en la Ribera Sur
            {
                type: 'fimir',
                col: 35.5,
                row: 61.5,
                roomId: 'south_marsh',
                isSubBoss: true,
                customName: 'Kragosh, Caudillo de la Ciénaga'
            },
            { type: 'goblin', col: 33.5, row: 60.5, roomId: 'south_marsh' },

            // Páramo de Ceniza (Sureste)
            { type: 'orc', col: 80.5, row: 53.5, roomId: null },
            { type: 'fimir', col: 86.5, row: 62.5, roomId: null },
            { type: 'skeleton', col: 87.5, row: 52.5, roomId: null }
        ];

        const roomMap = new Map();
        for (const r of rooms) {
            roomMap.set(r.id, r);
        }

        const board = {
            zoneId: ZONE_ID.OVERWORLD,
            zoneName: 'Gran Bosque Real de Loretome (Mundo Libre 4x)',
            isOverworld: true,
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
            doors: [],
            doorMap: new Map(),
            portals,
            npcs,
            exitStairs: null,
            furniture,
            torches,
            traps: [],
            monsterSpawns,
            campSpawn: {
                x: 52.5 * TILE,
                y: 39.0 * TILE
            },
            // Posición por defecto al salir del Bastión de Fellmarg (Oeste)
            playerSpawn: {
                x: 14.5 * TILE,
                y: 36.5 * TILE
            },
            companionSpawns: [
                { x: 13.5 * TILE, y: 36.8 * TILE },
                { x: 15.5 * TILE, y: 36.8 * TILE },
                { x: 14.5 * TILE, y: 37.6 * TILE }
            ],

            getDoorAt() {
                return null;
            },

            getRoomAt(col, row) {
                if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
                const id = roomGrid[row][col];
                return id ? roomMap.get(id) || null : null;
            },

            isOpaqueCell(col, row) {
                if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
                const cell = grid[row][col];
                return cell === CELL.TREE || cell === CELL.CLIFF || cell === CELL.WALL;
            },

            isSolidCell(col, row) {
                if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
                const cell = grid[row][col];
                return (
                    cell === CELL.TREE ||
                    cell === CELL.CLIFF ||
                    cell === CELL.WATER ||
                    cell === CELL.WALL ||
                    cell === CELL.VOID
                );
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

                // Colisión con mobiliario exterior (los arbustos cortados o flores recogidas no bloquean el paso)
                for (const furn of furniture) {
                    if (
                        (furn.type === FURNITURE_TYPE.BUSH ||
                         furn.type === FURNITURE_TYPE.MOONFLOWER ||
                         furn.type === FURNITURE_TYPE.METEOR_NODE) &&
                        furn.opened
                    ) {
                        continue;
                    }

                    const isLowObject =
                        furn.type === FURNITURE_TYPE.BUSH ||
                        furn.type === FURNITURE_TYPE.MOONFLOWER ||
                        furn.type === FURNITURE_TYPE.METEOR_NODE ||
                        furn.type === FURNITURE_TYPE.CHEST ||
                        furn.type === FURNITURE_TYPE.BOULDER_FIELD ||
                        furn.type === FURNITURE_TYPE.STUMP ||
                        furn.type === FURNITURE_TYPE.CAMPFIRE;

                    if (isLowObject && z > 20) {
                        continue;
                    }

                    const pad = 6;
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

        return board;
    }
}

function circleIntersectsRect(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
}

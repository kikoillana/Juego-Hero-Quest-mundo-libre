/**
 * @fileoverview Motor principal de renderizado pixel-art (16 bits, vista cenital 3/4).
 * Orquesta la cámara, el terreno del Bosque Exterior (hierba, senderos con bordes autotile,
 * río animado, puentes, árboles y riscos), las losas de las 4 Mazmorras, la cola unificada
 * Y-Sorting, partículas y el Minimapa.
 * Capa 4: Depende de constants.js, envDraw.js, WallRenderer.js, FurnitureRenderer.js y MiniatureRenderer.js.
 */

import { TILE, CELL, FOG, PALETTE, ZONE_ID } from '../config/constants.js';
import { WallRenderer } from './WallRenderer.js';
import { FurnitureRenderer } from './FurnitureRenderer.js';
import { MiniatureRenderer } from './MiniatureRenderer.js';
import { PX, snap } from './Sprites.js';
import { envTile, pixelLabel, PIXEL_FONT, stripEmoji } from './envDraw.js';

/** Tema gráfico de cada mazmorra (selecciona la rampa de color de suelos y muros). */
const DUNGEON_THEME = {
    [ZONE_ID.DUNGEON_FELLMARG]: 'fellmarg',
    [ZONE_ID.DUNGEON_CRYPT]: 'crypt',
    [ZONE_ID.DUNGEON_KELLAR]: 'kellar',
    [ZONE_ID.DUNGEON_SWAMP]: 'swamp'
};

/** Colores del minimapa (paleta pixel-art). */
const MM = {
    grass: '#68b848',
    tree: '#205020',
    water: '#3870c8',
    bridge: '#b07038',
    dirt: '#d8b070',
    plaza: '#a8a8a0',
    floor: '#7880a8',
    corridor: '#585e88',
    stairs: '#98d868'
};

const byY = (a, b) => a.sortY - b.sortY;

/** Clasifica un color hex de alfombra en una de las alfombras pixel-art. */
function rugFromHex(hex) {
    const v = String(hex || '').replace('#', '');
    if (v.length < 6) return 'red';
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    if (r >= g && r >= b) {
        if (g > r * 0.35) return 'gold';
        if (b > r * 0.6) return 'purple';
        return 'red';
    }
    if (g >= b) return 'green';
    if (r > b * 0.6) return 'purple';
    return 'blue';
}

const isGreenCell = (cell) =>
    cell === CELL.GRASS || cell === CELL.FOREST_FLOOR || cell === CELL.TREE || cell === CELL.CLIFF;
const isWaterish = (cell) => cell === CELL.WATER || cell === CELL.BRIDGE;

export class RenderEngine {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {import('../core/Camera.js').Camera} camera
     */
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.camera.resize(width, height);
        this.ctx.imageSmoothingEnabled = false;
    }

    /**
     * Calcula el rectángulo de celdas visibles en el viewport de la cámara para optimizar el mapa 4x.
     */
    _getVisibleBounds(board) {
        const halfW = (this.canvas.width * 0.5) / (this.camera.zoom || 1) + TILE * 3;
        const halfH = (this.canvas.height * 0.5) / (this.camera.zoom || 1) + TILE * 3;
        const minCol = Math.max(0, Math.floor((this.camera.x - halfW) / TILE));
        const maxCol = Math.min(board.cols - 1, Math.ceil((this.camera.x + halfW) / TILE));
        const minRow = Math.max(0, Math.floor((this.camera.y - halfH) / TILE));
        const maxRow = Math.min(board.rows - 1, Math.ceil((this.camera.y + halfH) / TILE));
        return { minCol, maxCol, minRow, maxRow };
    }

    /**
     * Renderiza un fotograma completo del mundo (Mazmorra o Bosque Exterior 4x).
     */
    render(scene) {
        const { board, player, companions = [], monsters, elapsed } = scene;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;

        // 1. Limpiar pantalla (verde bosque o negro de mazmorra)
        ctx.fillStyle = board?.isOverworld ? PALETTE.OVERWORLD_BG : PALETTE.VOID_BG;
        ctx.fillRect(0, 0, width, height);

        if (!board) return;

        // Tema activo de la mazmorra para muros, puertas y suelos
        const theme = board.isOverworld ? null : DUNGEON_THEME[board.zoneId] || 'fellmarg';
        WallRenderer.theme = theme || 'fellmarg';
        FurnitureRenderer.theme = theme || 'fellmarg';

        // 2. Transformación de Cámara (try/finally: una excepción no debe dejar el save() colgado)
        this.camera.applyTransform(ctx);
        try {
            this._renderWorld(ctx, scene, theme);
        } finally {
            this.camera.restoreTransform(ctx);
        }

        // 3. Minimapa Táctico en esquina inferior derecha (sin viñeta: estética 16 bits limpia)
        this._drawMinimap(ctx, width, height, board, player, companions, monsters, elapsed);
    }

    /**
     * Pasadas en coordenadas de mundo (bajo la transformación de cámara).
     */
    _renderWorld(ctx, scene, theme) {
        const { board, player, companions = [], monsters, lootItems, particles, interaction, quests, elapsed } = scene;
        const bounds = this._getVisibleBounds(board);
        const partyCount = 1 + (companions ? companions.length : 0);

        // Culling de objetos fuera de cámara (margen extra de 2 celdas para sprites altos)
        const cMin = bounds.minCol - 2;
        const cMax = bounds.maxCol + 2;
        const rMin = bounds.minRow - 2;
        const rMax = bounds.maxRow + 2;
        const inViewCell = (col, row) => col >= cMin && col <= cMax && row >= rMin && row <= rMax;
        const inViewPx = (x, y) => inViewCell(Math.floor(x / TILE), Math.floor(y / TILE));

        // PASADA 1: Terreno / Suelo
        if (board.isOverworld) {
            this._drawOverworldGround(ctx, board, elapsed, bounds);
        } else {
            this._drawBoardFloor(ctx, board, elapsed, bounds, theme);
            this._drawBoardTraps(ctx, board, elapsed, theme);
        }

        // Indicador de orientación del ataque (tres puntos pixelados)
        if (player && !player.dead) {
            this._drawAimReticle(ctx, player);
        }

        // PASADA 2: Cola unificada de Y-Sorting
        const renderQueue = [];

        for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                const cell = board.grid[r][c];
                if (cell !== CELL.WALL && cell !== CELL.TREE && cell !== CELL.CLIFF) continue;
                if (board.fog[r][c] === FOG.UNSEEN) continue;

                if (cell === CELL.WALL) {
                    renderQueue.push({ sortY: (r + 1) * TILE, draw: () => WallRenderer.drawWallBlock(ctx, board, c, r) });
                } else if (cell === CELL.TREE) {
                    renderQueue.push({ sortY: (r + 0.92) * TILE, draw: () => WallRenderer.drawTreeBlock(ctx, board, c, r, elapsed) });
                } else {
                    renderQueue.push({ sortY: (r + 1) * TILE, draw: () => WallRenderer.drawCliffBlock(ctx, board, c, r) });
                }
            }
        }

        // Portales de las 4 Mazmorras en el Bosque Exterior
        if (Array.isArray(board.portals)) {
            for (const portal of board.portals) {
                if (!inViewPx(portal.x, portal.y)) continue;
                renderQueue.push({ sortY: portal.y + 18, draw: () => WallRenderer.drawDungeonPortal(ctx, portal, elapsed, partyCount) });
            }
        }

        // NPCs de Misiones Secundarias
        if (Array.isArray(board.npcs) && board.npcs.length > 0) {
            let questMap = null;
            for (const npc of board.npcs) {
                if (!inViewPx(npc.x, npc.y)) continue;
                if (!questMap) {
                    const questList = quests ? quests.getFullQuestList() : [];
                    questMap = new Map(questList.map((q) => [q.id, q]));
                }
                const quest = questMap.get(npc.questId);
                renderQueue.push({ sortY: npc.y + 6, draw: () => MiniatureRenderer.drawNPC(ctx, npc, quest, elapsed) });
            }
        }

        // Puertas de mazmorra
        for (const door of board.doors) {
            if (!inViewCell(door.col, door.row)) continue;
            const fogState = board.fog[door.row]?.[door.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.UNSEEN) {
                renderQueue.push({ sortY: (door.row + 1) * TILE + 1, draw: () => WallRenderer.drawDoor(ctx, door, fogState) });
            }
        }

        // Antorchas murales y exteriores
        for (const torch of board.torches) {
            if (!inViewCell(torch.col, torch.row)) continue;
            const fogState = board.fog[torch.row]?.[torch.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.UNSEEN) {
                renderQueue.push({ sortY: (torch.row + 1) * TILE + 2, draw: () => WallRenderer.drawTorch(ctx, torch, elapsed, board.isOverworld) });
            }
        }

        // Muebles de Mazmorra y Objetos del Bosque
        for (const furn of board.furniture) {
            if (!inViewCell(furn.col, furn.row)) continue;
            const fogState = board.fog[furn.row]?.[furn.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.UNSEEN) {
                renderQueue.push({ sortY: furn.y + furn.height, draw: () => FurnitureRenderer.drawFurniture(ctx, furn, fogState, elapsed) });
            }
        }

        // Botín
        if (lootItems) {
            for (const item of lootItems) {
                if (item.collected) continue;
                const col = Math.floor(item.x / TILE);
                const row = Math.floor(item.y / TILE);
                if (!inViewCell(col, row)) continue;
                if ((board.fog[row]?.[col] ?? FOG.UNSEEN) === FOG.VISIBLE) {
                    renderQueue.push({ sortY: item.y, draw: () => item.draw(ctx, elapsed) });
                }
            }
        }

        // Monstruos
        if (monsters) {
            for (const monster of monsters) {
                if (monster.dead) continue;
                const col = Math.floor(monster.x / TILE);
                const row = Math.floor(monster.y / TILE);
                if (!inViewCell(col, row)) continue;
                if ((board.fog[row]?.[col] ?? FOG.UNSEEN) === FOG.VISIBLE) {
                    renderQueue.push({ sortY: monster.y + monster.radius * 0.35, draw: () => MiniatureRenderer.drawMonster(ctx, monster, elapsed) });
                }
            }
        }

        // Compañeros y Héroe líder
        if (companions) {
            for (const ally of companions) {
                if (!ally || ally.dead) continue;
                renderQueue.push({ sortY: ally.y + ally.radius * 0.35, draw: () => MiniatureRenderer.drawPlayer(ctx, ally, elapsed) });
            }
        }
        if (player && !player.dead) {
            renderQueue.push({ sortY: player.y + player.radius * 0.35, draw: () => MiniatureRenderer.drawPlayer(ctx, player, elapsed) });
        }

        renderQueue.sort(byY);
        for (const item of renderQueue) {
            item.draw();
        }

        // PASADA 3: Partículas y efectos
        if (particles) {
            particles.drawWorldEffects(ctx);
        }

        // PASADA 4: Ambiente (motas de luz del bosque)
        if (board.isOverworld) {
            this._drawForestAtmosphere(ctx, board, player, elapsed);
        }

        if (interaction && interaction.activeHighlight) {
            this._drawInteractPrompt(ctx, interaction.activeHighlight, elapsed);
        }

        if (particles) {
            particles.drawFloatingTexts(ctx);
        }
    }

    /**
     * Terreno del Bosque Exterior con losetas pixel-art y bordes autotile.
     */
    _drawOverworldGround(ctx, board, elapsed, bounds) {
        const minR = bounds ? bounds.minRow : 0;
        const maxR = bounds ? bounds.maxRow : board.rows - 1;
        const minC = bounds ? bounds.minCol : 0;
        const maxC = bounds ? bounds.maxCol : board.cols - 1;
        const grid = board.grid;
        const rows = board.rows;
        const cols = board.cols;
        const at = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols ? CELL.GRASS : grid[r][c]);
        const waterFrame = Math.floor(elapsed * 3) % 3;

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const cell = grid[r][c];
                const x = c * TILE;
                const y = r * TILE;
                const v = board.tileVariants[r][c];

                if (cell === CELL.WATER) {
                    envTile(ctx, 'overworld', `water${(waterFrame + ((r + c) & 1)) % 3}`, x, y);
                    if (!isWaterish(at(r - 1, c))) envTile(ctx, 'overworld', `shore_N${waterFrame}`, x, y);
                    if (!isWaterish(at(r + 1, c))) envTile(ctx, 'overworld', `shore_S${waterFrame}`, x, y);
                    if (!isWaterish(at(r, c - 1))) envTile(ctx, 'overworld', `shore_W${waterFrame}`, x, y);
                    if (!isWaterish(at(r, c + 1))) envTile(ctx, 'overworld', `shore_E${waterFrame}`, x, y);
                    continue;
                }

                if (cell === CELL.BRIDGE) {
                    const wN = at(r - 1, c) === CELL.WATER;
                    const wS = at(r + 1, c) === CELL.WATER;
                    const wW = at(r, c - 1) === CELL.WATER;
                    const wE = at(r, c + 1) === CELL.WATER;
                    const horizontal = wN || wS || !(wW || wE);
                    envTile(ctx, 'overworld', horizontal ? 'bridge_h' : 'bridge_v', x, y);
                    if (horizontal) {
                        if (wN) envTile(ctx, 'overworld', 'rail_N', x, y);
                        if (wS) envTile(ctx, 'overworld', 'rail_S', x, y);
                    } else {
                        if (wW) envTile(ctx, 'overworld', 'rail_W', x, y);
                        if (wE) envTile(ctx, 'overworld', 'rail_E', x, y);
                    }
                    continue;
                }

                if (cell === CELL.DIRT_PATH) {
                    envTile(ctx, 'overworld', v > 0.7 ? 'dirt2' : v > 0.35 ? 'dirt1' : 'dirt0', x, y);
                    const gN = isGreenCell(at(r - 1, c));
                    const gS = isGreenCell(at(r + 1, c));
                    const gW = isGreenCell(at(r, c - 1));
                    const gE = isGreenCell(at(r, c + 1));
                    if (gN) envTile(ctx, 'overworld', 'edge_N', x, y);
                    if (gS) envTile(ctx, 'overworld', 'edge_S', x, y);
                    if (gW) envTile(ctx, 'overworld', 'edge_W', x, y);
                    if (gE) envTile(ctx, 'overworld', 'edge_E', x, y);
                    if (gN && gW) envTile(ctx, 'overworld', 'corner_NW', x, y);
                    if (gN && gE) envTile(ctx, 'overworld', 'corner_NE', x, y);
                    if (gS && gW) envTile(ctx, 'overworld', 'corner_SW', x, y);
                    if (gS && gE) envTile(ctx, 'overworld', 'corner_SE', x, y);
                    if (!gN && !gW && isGreenCell(at(r - 1, c - 1))) envTile(ctx, 'overworld', 'inner_NW', x, y);
                    if (!gN && !gE && isGreenCell(at(r - 1, c + 1))) envTile(ctx, 'overworld', 'inner_NE', x, y);
                    if (!gS && !gW && isGreenCell(at(r + 1, c - 1))) envTile(ctx, 'overworld', 'inner_SW', x, y);
                    if (!gS && !gE && isGreenCell(at(r + 1, c + 1))) envTile(ctx, 'overworld', 'inner_SE', x, y);
                    continue;
                }

                if (cell === CELL.STONE_PLAZA) {
                    envTile(ctx, 'overworld', (r + c) % 3 === 0 ? 'plaza1' : 'plaza0', x, y);
                    continue;
                }

                if (cell === CELL.FOREST_FLOOR || cell === CELL.TREE || cell === CELL.CLIFF) {
                    envTile(ctx, 'overworld', v > 0.8 ? 'forest1' : v > 0.6 ? 'forest2' : 'forest0', x, y);
                    // Transición suave hacia la pradera vecina (autotile)
                    const gN = at(r - 1, c) === CELL.GRASS;
                    const gS = at(r + 1, c) === CELL.GRASS;
                    const gW = at(r, c - 1) === CELL.GRASS;
                    const gE = at(r, c + 1) === CELL.GRASS;
                    if (gN) envTile(ctx, 'overworld', 'fedge_N', x, y);
                    if (gS) envTile(ctx, 'overworld', 'fedge_S', x, y);
                    if (gW) envTile(ctx, 'overworld', 'fedge_W', x, y);
                    if (gE) envTile(ctx, 'overworld', 'fedge_E', x, y);
                    if (gN && gW) envTile(ctx, 'overworld', 'fcorner_NW', x, y);
                    if (gN && gE) envTile(ctx, 'overworld', 'fcorner_NE', x, y);
                    if (gS && gW) envTile(ctx, 'overworld', 'fcorner_SW', x, y);
                    if (gS && gE) envTile(ctx, 'overworld', 'fcorner_SE', x, y);
                    if (!gN && !gW && at(r - 1, c - 1) === CELL.GRASS) envTile(ctx, 'overworld', 'finner_NW', x, y);
                    if (!gN && !gE && at(r - 1, c + 1) === CELL.GRASS) envTile(ctx, 'overworld', 'finner_NE', x, y);
                    if (!gS && !gW && at(r + 1, c - 1) === CELL.GRASS) envTile(ctx, 'overworld', 'finner_SW', x, y);
                    if (!gS && !gE && at(r + 1, c + 1) === CELL.GRASS) envTile(ctx, 'overworld', 'finner_SE', x, y);
                    continue;
                }

                // Hierba: mayoría lisa, con matas y flores ocasionales
                let g = 'grass0';
                if (v > 0.93) g = 'grass3';
                else if (v > 0.88) g = 'grass4';
                else if (v > 0.74) g = 'grass2';
                else if (v > 0.66) g = 'grass5';
                else if (v > 0.33) g = 'grass1';
                envTile(ctx, 'overworld', g, x, y);
            }
        }
    }

    /**
     * Losas de Mazmorra por tema, alfombras 9-slice, escalera de salida y niebla explorada.
     */
    _drawBoardFloor(ctx, board, elapsed = 0, bounds = null, theme = 'fellmarg') {
        const minR = bounds ? bounds.minRow : 0;
        const maxR = bounds ? bounds.maxRow : board.rows - 1;
        const minC = bounds ? bounds.minCol : 0;
        const maxC = bounds ? bounds.maxCol : board.cols - 1;

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const cellType = board.grid[r][c];
                const fogState = board.fog[r][c];
                if (cellType === CELL.WALL || cellType === CELL.VOID || fogState === FOG.UNSEEN) continue;

                const x = c * TILE;
                const y = r * TILE;
                const room = board.getRoomAt(c, r);
                const v = board.tileVariants[r][c];

                if (cellType === CELL.STAIRS) {
                    envTile(ctx, 'dungeon', `${theme}_stairs`, x, y);
                } else if (!room) {
                    envTile(ctx, 'dungeon', `${theme}_corridor${v > 0.5 ? 1 : 0}`, x, y);
                } else if (c > room.c1 && c < room.c2 && r > room.r1 && r < room.r2) {
                    // Alfombra 9-slice en el interior de la sala
                    if (!room._rug) room._rug = rugFromHex(room.carpetColor);
                    const n = r === room.r1 + 1 ? 'N' : r === room.r2 - 1 ? 'S' : '';
                    const w = c === room.c1 + 1 ? 'W' : c === room.c2 - 1 ? 'E' : '';
                    envTile(ctx, 'dungeon', `rug_${room._rug}_${n + w || 'C'}`, x, y);
                } else {
                    let f = 0;
                    if (v > 0.9) f = 2;
                    else if (v < 0.08) f = 3;
                    else if (v > 0.8) f = 4;
                    else if (v > 0.45) f = 1;
                    envTile(ctx, 'dungeon', `${theme}_floor${f}`, x, y);
                }

                // Sombra dura bajo un muro situado al norte
                if (r > 0 && board.grid[r - 1][c] === CELL.WALL) {
                    ctx.fillStyle = 'rgba(16, 12, 24, 0.45)';
                    ctx.fillRect(x, y, TILE, PX * 2);
                }

                if (fogState === FOG.EXPLORED) {
                    ctx.fillStyle = PALETTE.FOG_EXPLORED;
                    ctx.fillRect(x, y, TILE, TILE);
                }
            }
        }

        // Letrero permanente sobre la Escalera de salida al Bosque
        if (board.exitStairs) {
            const st = board.exitStairs;
            const col = Math.floor(st.col);
            const row = Math.floor(st.row);
            if ((board.fog[row]?.[col] ?? FOG.UNSEEN) !== FOG.UNSEEN) {
                pixelLabel(ctx, 'SALIDA AL BOSQUE [E]', st.x, st.y - 42, { bg: '#183018' });
            }
        }
    }

    _drawBoardTraps(ctx, board, elapsed, theme = 'fellmarg') {
        if (!board.traps) return;

        for (const trap of board.traps) {
            const fogState = board.fog[trap.row]?.[trap.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.VISIBLE && trap.state === 'hidden') continue;
            if (fogState === FOG.UNSEEN) continue;

            const tx = trap.col * TILE;
            const ty = trap.row * TILE;
            let frame = null;
            if (trap.state === 'hidden') frame = 'hidden';
            else if (trap.state === 'detected') frame = Math.floor(elapsed * 4) % 2 === 0 ? 'detected' : null;
            else if (trap.state === 'disarmed') frame = 'disarmed';
            else if (trap.state === 'triggered') frame = trap.type === 'pit' ? 'pit' : trap.type === 'spear' ? 'spear' : 'boulder';
            if (frame) envTile(ctx, 'dungeon', `${theme}_trap_${frame}`, tx, ty);
        }
    }

    /** Tres puntos pixelados indicando la dirección y alcance del tajo. */
    _drawAimReticle(ctx, player) {
        const dist = (player.attackRange || 64) * 0.72;
        ctx.fillStyle = 'rgba(248, 248, 248, 0.55)';
        for (let i = -1; i <= 1; i++) {
            const a = player.aimAngle + i * 0.32;
            const px = snap(player.x + Math.cos(a) * dist);
            const py = snap(player.y + Math.sin(a) * dist * 0.85);
            const s = i === 0 ? PX * 2 : PX;
            ctx.fillRect(px - s / 2, py - s / 2, s, s);
        }
    }

    /** Motas de luz del bosque: píxeles dorados que parpadean (sin halos). */
    _drawForestAtmosphere(ctx, board, player, elapsed) {
        if (!player) return;
        for (let i = 0; i < 16; i++) {
            const fx = ((i * 211 + Math.sin(elapsed * 0.7 + i) * 45) % (board.width - 100)) + 50;
            const fy = ((i * 163 + Math.cos(elapsed * 0.6 + i * 2) * 35) % (board.height - 100)) + 50;
            const fdx = fx - player.x;
            const fdy = fy - player.y;
            if (fdx * fdx + fdy * fdy > 480 * 480) continue;
            const phase = Math.sin(elapsed * 3 + i);
            if (phase < -0.3) continue;
            ctx.fillStyle = phase > 0.5 ? '#f8f088' : '#f8c830';
            ctx.fillRect(snap(fx), snap(fy), PX, PX);
        }
    }

    _drawInteractPrompt(ctx, highlight, elapsed) {
        const bob = Math.floor(elapsed * 3) % 2 === 0 ? 0 : PX;
        pixelLabel(ctx, highlight.label, highlight.x, highlight.y - 48 + bob);
    }

    /**
     * Repinta el terreno del minimapa en un canvas offscreen reutilizable.
     */
    _redrawMinimapTerrain(board, scale, mapW, mapH) {
        if (typeof document === 'undefined') return;
        if (!this._minimapCanvas) {
            this._minimapCanvas = document.createElement('canvas');
        }
        const cw = Math.ceil(mapW);
        const ch = Math.ceil(mapH);
        if (this._minimapCanvas.width !== cw) this._minimapCanvas.width = cw;
        if (this._minimapCanvas.height !== ch) this._minimapCanvas.height = ch;
        const m = this._minimapCanvas.getContext('2d');
        m.clearRect(0, 0, cw, ch);

        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.fog[r][c] === FOG.UNSEEN) continue;
                const cell = board.grid[r][c];
                if (board.isOverworld) {
                    if (cell === CELL.TREE || cell === CELL.CLIFF) m.fillStyle = MM.tree;
                    else if (cell === CELL.WATER) m.fillStyle = MM.water;
                    else if (cell === CELL.BRIDGE) m.fillStyle = MM.bridge;
                    else if (cell === CELL.DIRT_PATH) m.fillStyle = MM.dirt;
                    else if (cell === CELL.STONE_PLAZA) m.fillStyle = MM.plaza;
                    else m.fillStyle = MM.grass;
                } else {
                    if (cell === CELL.WALL || cell === CELL.VOID) continue;
                    if (cell === CELL.STAIRS) m.fillStyle = MM.stairs;
                    else if (cell === CELL.CORRIDOR) m.fillStyle = MM.corridor;
                    else m.fillStyle = MM.floor;
                }
                m.fillRect(c * scale, r * scale, scale, scale);
            }
        }
    }

    /**
     * Minimapa en la esquina inferior derecha: panel azul noche con borde pixelado.
     */
    _drawMinimap(ctx, width, height, board, player, companions = [], monsters = [], elapsed = 0) {
        const scale = board.isOverworld ? 2 : 4;
        const mapW = board.cols * scale;
        const mapH = board.rows * scale;
        const pad = 16;
        const mx = Math.round(width - mapW - pad - 8);
        const my = Math.round(height - mapH - pad - 8);

        ctx.save();

        // Marco: contorno oscuro, borde claro de 2 px y fondo azul noche
        const title = board.isOverworld ? 'BOSQUE DE LORETOME' : stripEmoji(board.zoneName || 'MAZMORRA').replace(/\s*\(.*\)\s*$/, '').toUpperCase();
        // El marco se ensancha hacia la izquierda si el título no cabe (8 px por carácter)
        const fw = Math.max(mapW + 16, title.length * 8 + 16);
        const fx = mx + mapW + 8 - fw;
        const fy = my - 24;
        const fh = mapH + 32;
        ctx.fillStyle = '#101010';
        ctx.fillRect(fx - 2, fy - 2, fw + 4, fh + 4);
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(fx, fy, fw, fh);
        ctx.fillStyle = '#181838';
        ctx.fillRect(fx + 2, fy + 2, fw - 4, fh - 4);
        ctx.fillStyle = '#101020';
        ctx.fillRect(mx - 2, my - 2, mapW + 4, mapH + 4);

        // Título de la zona
        ctx.font = `8px ${PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8f8f8';
        ctx.fillText(title, Math.round(fx + fw / 2), fy + 12);

        // Terreno cacheado (se repinta al cambiar de tablero o cada 0.25 s)
        if (
            this._minimapBoard !== board ||
            this._minimapScale !== scale ||
            elapsed - this._minimapTime > 0.25 ||
            elapsed < this._minimapTime
        ) {
            this._minimapBoard = board;
            this._minimapScale = scale;
            this._minimapTime = elapsed;
            this._redrawMinimapTerrain(board, scale, mapW, mapH);
        }
        if (this._minimapCanvas) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this._minimapCanvas, mx, my);
        }

        const dot = (wx, wy, size, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(Math.round(mx + (wx / TILE) * scale - size / 2), Math.round(my + (wy / TILE) * scale - size / 2), size, size);
        };

        if (Array.isArray(board.npcs)) {
            for (const npc of board.npcs) dot(npc.x, npc.y, 4, '#f8c830');
        }
        if (Array.isArray(board.portals)) {
            for (const p of board.portals) {
                dot(p.x, p.y, 8, '#101010');
                dot(p.x, p.y, 6, p.requiresAllHeroes ? '#f8c830' : '#f8f8f8');
                dot(p.x, p.y, 2, '#101010');
            }
        }
        if (board.exitStairs) {
            dot(board.exitStairs.x, board.exitStairs.y, 6, '#98d868');
        }
        for (const m of monsters) {
            if (m.dead) continue;
            const mc = Math.floor(m.x / TILE);
            const mr = Math.floor(m.y / TILE);
            if ((board.fog[mr]?.[mc] ?? FOG.UNSEEN) === FOG.VISIBLE) dot(m.x, m.y, m.isBoss ? 4 : 2, '#d83828');
        }
        for (const ally of companions) {
            if (!ally || ally.dead) continue;
            dot(ally.x, ally.y, 4, '#88b8f8');
        }
        if (player && !player.dead && Math.floor(elapsed * 4) % 2 === 0) {
            dot(player.x, player.y, 6, '#101010');
            dot(player.x, player.y, 4, '#f8f088');
        }

        ctx.restore();
    }
}

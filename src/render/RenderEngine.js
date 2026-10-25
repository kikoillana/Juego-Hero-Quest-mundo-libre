/**
 * @fileoverview Motor principal de renderizado 2.5D: Orquesta la cámara, el terreno del Bosque Exterior
 * tipo Zelda (hierba, senderos, río animado, puentes, árboles volumétricos, riscos y portales de mazmorra),
 * las losas de las 4 Mazmorras HeroQuest, la cola unificada Y-Sorting, partículas, iluminación y Minimapa.
 * Capa 4: Depende de constants.js, WallRenderer.js, FurnitureRenderer.js y MiniatureRenderer.js.
 */

import { TILE, CELL, FOG, PALETTE } from '../config/constants.js';
import { WallRenderer } from './WallRenderer.js';
import { FurnitureRenderer } from './FurnitureRenderer.js';
import { MiniatureRenderer } from './MiniatureRenderer.js';

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
     * Renderiza un fotograma completo del mundo 2.5D (Mazmorra o Bosque Exterior 4x).
     */
    render(scene) {
        const { board, player, companions = [], monsters, lootItems, particles, interaction, quests, elapsed } = scene;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 1. Limpiar pantalla (verde profundo en el bosque, abismo en mazmorra)
        ctx.fillStyle = board?.isOverworld ? PALETTE.OVERWORLD_BG : PALETTE.VOID_BG;
        ctx.fillRect(0, 0, width, height);

        if (!board) return;

        // 2. Aplicar transformación de Cámara 2.5D
        this.camera.applyTransform(ctx);
        const bounds = this._getVisibleBounds(board);
        const partyCount = 1 + (companions ? companions.length : 0);

        // 3. PASADA 1: Terreno / Suelo (Plano Z=0)
        if (board.isOverworld) {
            this._drawOverworldGround(ctx, board, elapsed, bounds);
        } else {
            this._drawBoardFloor(ctx, board, elapsed);
            this._drawBoardTraps(ctx, board, elapsed);
        }

        // 4. Indicador táctico de orientación y alcance bajo los pies del héroe
        if (player && !player.dead) {
            this._drawAimReticle(ctx, player);
        }

        // 5. PASADA 2: Cola Unificada de Y-Sorting (Objetos con Volumen Vertical 2.5D)
        const renderQueue = [];

        // 5a. Muros de Mazmorra, Árboles del Bosque (CELL.TREE) y Riscos (CELL.CLIFF) dentro del frustum
        for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                const cell = board.grid[r][c];
                const fogState = board.fog[r][c];
                if (fogState === FOG.UNSEEN) continue;

                if (cell === CELL.WALL) {
                    renderQueue.push({
                        sortY: (r + 1) * TILE,
                        draw: () => WallRenderer.drawWallBlock(ctx, board, c, r)
                    });
                } else if (cell === CELL.TREE) {
                    renderQueue.push({
                        sortY: (r + 0.92) * TILE,
                        draw: () => WallRenderer.drawTreeBlock(ctx, board, c, r, elapsed)
                    });
                } else if (cell === CELL.CLIFF) {
                    renderQueue.push({
                        sortY: (r + 1) * TILE,
                        draw: () => WallRenderer.drawCliffBlock(ctx, board, c, r)
                    });
                }
            }
        }

        // 5a-bis. Portales Monumentales de las 4 Mazmorras en el Bosque Exterior
        if (Array.isArray(board.portals)) {
            for (const portal of board.portals) {
                renderQueue.push({
                    sortY: portal.y + 18,
                    draw: () => WallRenderer.drawDungeonPortal(ctx, portal, elapsed, partyCount)
                });
            }
        }

        // 5a-ter. NPCs de Misiones Secundarias en el Bosque Exterior
        if (Array.isArray(board.npcs) && board.npcs.length > 0) {
            const questList = quests ? quests.getFullQuestList() : [];
            const questMap = new Map(questList.map((q) => [q.id, q]));
            for (const npc of board.npcs) {
                renderQueue.push({
                    sortY: npc.y + 6,
                    draw: () => MiniatureRenderer.drawNPC(ctx, npc, questMap.get(npc.questId), elapsed)
                });
            }
        }

        // 5b. Puertas de mazmorra
        for (const door of board.doors) {
            const fogState = board.fog[door.row]?.[door.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.UNSEEN) {
                renderQueue.push({
                    sortY: (door.row + 1) * TILE + 1,
                    draw: () => WallRenderer.drawDoor(ctx, door, fogState)
                });
            }
        }

        // 5c. Antorchas murales y exteriores
        for (const torch of board.torches) {
            const fogState = board.fog[torch.row]?.[torch.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.UNSEEN) {
                renderQueue.push({
                    sortY: (torch.row + 1) * TILE + 2,
                    draw: () => WallRenderer.drawTorch(ctx, torch, elapsed)
                });
            }
        }

        // 5d. Muebles de Mazmorra y Objetos Interactuables del Bosque
        for (const furn of board.furniture) {
            const fogState = board.fog[furn.row]?.[furn.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.UNSEEN) {
                renderQueue.push({
                    sortY: furn.y + furn.height,
                    draw: () => FurnitureRenderer.drawFurniture(ctx, furn, fogState, elapsed)
                });
            }
        }

        // 5e. Objetos de Botín (Monedas y Pociones con rebote Z)
        if (lootItems) {
            for (const item of lootItems) {
                if (item.collected) continue;
                const col = Math.floor(item.x / TILE);
                const row = Math.floor(item.y / TILE);
                const fogState = board.fog[row]?.[col] ?? FOG.UNSEEN;
                if (fogState === FOG.VISIBLE) {
                    renderQueue.push({
                        sortY: item.y,
                        draw: () => item.draw(ctx)
                    });
                }
            }
        }

        // 5f. Miniaturas de Monstruos
        if (monsters) {
            for (const monster of monsters) {
                if (monster.dead) continue;
                const col = Math.floor(monster.x / TILE);
                const row = Math.floor(monster.y / TILE);
                const fogState = board.fog[row]?.[col] ?? FOG.UNSEEN;
                if (fogState === FOG.VISIBLE) {
                    renderQueue.push({
                        sortY: monster.y + monster.radius * 0.35,
                        draw: () => MiniatureRenderer.drawMonster(ctx, monster, elapsed)
                    });
                }
            }
        }

        // 5g. Miniaturas de Compañeros IA (los otros 3 Héroes del equipo)
        if (companions) {
            for (const ally of companions) {
                if (!ally || ally.dead) continue;
                renderQueue.push({
                    sortY: ally.y + ally.radius * 0.35,
                    draw: () => MiniatureRenderer.drawPlayer(ctx, ally, elapsed)
                });
            }
        }

        // 5h. Miniatura del Héroe Líder (Jugador)
        if (player && !player.dead) {
            renderQueue.push({
                sortY: player.y + player.radius * 0.35,
                draw: () => MiniatureRenderer.drawPlayer(ctx, player, elapsed)
            });
        }

        // Ordenar estrictamente por coordenada Y en el plano Z=0
        renderQueue.sort((a, b) => a.sortY - b.sortY);

        for (const item of renderQueue) {
            item.draw();
        }

        // 6. PASADA 3: Partículas 2.5D, Arcos de Corte (Slash) y Ondas Mágicas
        if (particles) {
            particles.drawWorldEffects(ctx);
        }

        // 7. PASADA 4: Iluminación Dinámica (Luz de Antorcha o Rayos de Sol del Bosque) y Textos Flotantes
        if (board.isOverworld) {
            this._drawForestAtmosphere(ctx, board, player, elapsed);
        } else if (player && !player.dead) {
            this._drawDynamicTorchLight(ctx, player, elapsed);
        }

        if (interaction && interaction.activeHighlight) {
            this._drawInteractPrompt(ctx, interaction.activeHighlight, elapsed);
        }

        if (particles) {
            particles.drawFloatingTexts(ctx);
        }

        this.camera.restoreTransform(ctx);

        // 8. Viñeta perimetral + Minimapa Táctico en esquina inferior derecha
        this._drawScreenVignette(ctx, width, height, board.isOverworld);
        this._drawMinimap(ctx, width, height, board, player, companions, monsters, elapsed);
    }

    /**
     * Dibuja el terreno del Bosque Exterior estilo Zelda: A Link to the Past
     * (Praderas con flores, senderos de tierra con bordes orgánicos, río animado y puentes de madera).
     */
    _drawOverworldGround(ctx, board, elapsed, bounds) {
        const minR = bounds ? bounds.minRow : 0;
        const maxR = bounds ? bounds.maxRow : board.rows - 1;
        const minC = bounds ? bounds.minCol : 0;
        const maxC = bounds ? bounds.maxCol : board.cols - 1;

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const cellType = board.grid[r][c];
                const x = c * TILE;
                const y = r * TILE;
                const checker = (r + c) % 2 === 0;
                const variant = board.tileVariants[r][c];

                if (cellType === CELL.WATER) {
                    // Agua del río con ondas animadas
                    ctx.fillStyle = checker ? PALETTE.WATER_DEEP : PALETTE.WATER_SHALLOW;
                    ctx.fillRect(x, y, TILE, TILE);

                    const waveX = Math.sin(elapsed * 3.2 + r * 0.8 + c * 0.5) * 4;
                    ctx.strokeStyle = PALETTE.WATER_FOAM;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = 0.55;
                    ctx.beginPath();
                    ctx.moveTo(x + 10 + waveX, y + 16);
                    ctx.lineTo(x + 26 + waveX, y + 16);
                    ctx.moveTo(x + 18 - waveX, y + 34);
                    ctx.lineTo(x + 34 - waveX, y + 34);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;

                    // Espuma en la orilla si limita con tierra
                    if (c > 0 && board.grid[r][c - 1] !== CELL.WATER && board.grid[r][c - 1] !== CELL.BRIDGE) {
                        ctx.fillStyle = 'rgba(147, 197, 253, 0.45)';
                        ctx.fillRect(x, y, 5, TILE);
                    }
                    if (c < board.cols - 1 && board.grid[r][c + 1] !== CELL.WATER && board.grid[r][c + 1] !== CELL.BRIDGE) {
                        ctx.fillStyle = 'rgba(147, 197, 253, 0.45)';
                        ctx.fillRect(x + TILE - 5, y, 5, TILE);
                    }
                    continue;
                }

                if (cellType === CELL.BRIDGE) {
                    // Fondo de agua bajo el puente
                    ctx.fillStyle = PALETTE.WATER_DEEP;
                    ctx.fillRect(x, y, TILE, TILE);

                    // Tablones de madera del puente
                    ctx.fillStyle = PALETTE.BRIDGE_WOOD;
                    ctx.fillRect(x, y + 2, TILE, TILE - 4);

                    ctx.strokeStyle = PALETTE.BRIDGE_RAIL;
                    ctx.lineWidth = 2;
                    for (let px = x + 6; px < x + TILE; px += 12) {
                        ctx.beginPath();
                        ctx.moveTo(px, y + 2);
                        ctx.lineTo(px, y + TILE - 2);
                        ctx.stroke();
                    }

                    // Barandillas superior/inferior si limita con agua
                    if (r > 0 && board.grid[r - 1][c] === CELL.WATER) {
                        ctx.fillStyle = PALETTE.BRIDGE_RAIL;
                        ctx.fillRect(x, y, TILE, 5);
                    }
                    if (r < board.rows - 1 && board.grid[r + 1][c] === CELL.WATER) {
                        ctx.fillStyle = PALETTE.BRIDGE_RAIL;
                        ctx.fillRect(x, y + TILE - 5, TILE, 5);
                    }
                    continue;
                }

                if (cellType === CELL.DIRT_PATH) {
                    ctx.fillStyle = checker ? PALETTE.DIRT_A : PALETTE.DIRT_B;
                    ctx.fillRect(x, y, TILE, TILE);

                    // Piedrecitas del camino estilo Zelda
                    if (variant > 0.65) {
                        ctx.fillStyle = PALETTE.DIRT_BORDER;
                        ctx.beginPath();
                        ctx.arc(x + 14, y + 18, 3, 0, Math.PI * 2);
                        ctx.arc(x + 34, y + 30, 2.2, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Bordes suaves con la hierba adyacente
                    ctx.fillStyle = PALETTE.DIRT_BORDER;
                    if (r > 0 && board.grid[r - 1][c] === CELL.GRASS) ctx.fillRect(x, y, TILE, 3);
                    if (r < board.rows - 1 && board.grid[r + 1][c] === CELL.GRASS) ctx.fillRect(x, y + TILE - 3, TILE, 3);
                    if (c > 0 && board.grid[r][c - 1] === CELL.GRASS) ctx.fillRect(x, y, 3, TILE);
                    if (c < board.cols - 1 && board.grid[r][c + 1] === CELL.GRASS) ctx.fillRect(x + TILE - 3, y, 3, TILE);
                    continue;
                }

                if (cellType === CELL.STONE_PLAZA) {
                    ctx.fillStyle = checker ? PALETTE.PLAZA_A : PALETTE.PLAZA_B;
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#292524';
                    ctx.lineWidth = 1.2;
                    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);

                    if (variant < 0.25) {
                        ctx.fillStyle = 'rgba(77, 124, 15, 0.28)';
                        ctx.fillRect(x + 4, y + 4, 8, 8);
                    }
                    continue;
                }

                // Por defecto: Hierba de pradera (CELL.GRASS) o suelo de arboleda (CELL.FOREST_FLOOR / TREE)
                const isDarkForest = cellType === CELL.FOREST_FLOOR || cellType === CELL.TREE;
                if (isDarkForest) {
                    ctx.fillStyle = checker ? PALETTE.FOREST_FLOOR_A : PALETTE.FOREST_FLOOR_B;
                } else {
                    ctx.fillStyle = checker ? PALETTE.GRASS_A : PALETTE.GRASS_B;
                }
                ctx.fillRect(x, y, TILE, TILE);

                // Briznas de hierba y florecillas silvestres estilo Zelda
                if (variant > 0.72) {
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 1.3;
                    ctx.beginPath();
                    ctx.moveTo(x + 16, y + 28);
                    ctx.lineTo(x + 13, y + 20);
                    ctx.moveTo(x + 19, y + 28);
                    ctx.lineTo(x + 22, y + 20);
                    ctx.stroke();
                } else if (variant < 0.08 && !isDarkForest) {
                    // Florecilla silvestre blanca/amarilla
                    ctx.fillStyle = '#fef08a';
                    ctx.beginPath();
                    ctx.arc(x + 28, y + 22, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    /**
     * Dibuja las losas del tablero de Mazmorra HeroQuest con juntas biseladas, grietas y Escalera Imperial.
     */
    _drawBoardFloor(ctx, board, elapsed = 0) {
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const cellType = board.grid[r][c];
                const fogState = board.fog[r][c];

                if (cellType === CELL.WALL || cellType === CELL.VOID || fogState === FOG.UNSEEN) {
                    continue;
                }

                const x = c * TILE;
                const y = r * TILE;
                const checker = (r + c) % 2 === 0;
                const room = board.getRoomAt(c, r);

                if (room) {
                    ctx.fillStyle = checker ? room.floorColorA : room.floorColorB;
                } else {
                    ctx.fillStyle = checker ? PALETTE.CORRIDOR_A : PALETTE.CORRIDOR_B;
                }

                ctx.fillRect(x, y, TILE, TILE);

                ctx.strokeStyle = '#141116';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);

                const variant = board.tileVariants[r][c];
                if (variant > 0.78) {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
                    ctx.beginPath();
                    ctx.moveTo(x + 10, y + 12);
                    ctx.lineTo(x + 22, y + 24);
                    ctx.lineTo(x + 18, y + 34);
                    ctx.stroke();
                } else if (variant < 0.12) {
                    ctx.fillStyle = 'rgba(77, 124, 15, 0.16)';
                    ctx.beginPath();
                    ctx.arc(x + 34, y + 14, 5, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (
                    room &&
                    c > room.c1 &&
                    c < room.c2 &&
                    r > room.r1 &&
                    r < room.r2
                ) {
                    ctx.fillStyle = room.carpetColor;
                    ctx.globalAlpha = 0.35;
                    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
                    ctx.globalAlpha = 1.0;
                }

                // Escalera Imperial de salida al Bosque Exterior (2x2)
                if (cellType === CELL.STAIRS) {
                    this._drawStairTile(ctx, x, y, elapsed);
                }

                if (fogState === FOG.EXPLORED) {
                    ctx.fillStyle = PALETTE.FOG_EXPLORED;
                    ctx.fillRect(x, y, TILE, TILE);
                }
            }
        }

        // Letrero permanente sobre la Escalera Imperial indicando la salida al Bosque
        if (board.exitStairs) {
            const st = board.exitStairs;
            const col = Math.floor(st.col);
            const row = Math.floor(st.row);
            if ((board.fog[row]?.[col] ?? FOG.UNSEEN) !== FOG.UNSEEN) {
                ctx.save();
                ctx.font = 'bold 10px "Cinzel", Georgia, serif';
                ctx.fillStyle = 'rgba(20, 83, 45, 0.88)';
                ctx.strokeStyle = '#4ade80';
                ctx.lineWidth = 1.2;
                const bw = 152;
                const bh = 18;
                ctx.fillRect(st.x - bw * 0.5, st.y - 52, bw, bh);
                ctx.strokeRect(st.x - bw * 0.5, st.y - 52, bw, bh);
                ctx.fillStyle = '#dcfce7';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🌲 SALIDA AL BOSQUE [E]', st.x, st.y - 43);
                ctx.restore();
            }
        }
    }

    _drawBoardTraps(ctx, board, elapsed) {
        if (!board.traps) return;

        for (const trap of board.traps) {
            const fogState = board.fog[trap.row]?.[trap.col] ?? FOG.UNSEEN;
            if (fogState !== FOG.VISIBLE && trap.state === 'hidden') continue;
            if (fogState === FOG.UNSEEN) continue;

            const tx = trap.col * TILE;
            const ty = trap.row * TILE;

            ctx.save();

            if (trap.state === 'hidden') {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.36)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(tx + 14, ty + 16);
                ctx.lineTo(tx + 24, ty + 24);
                ctx.lineTo(tx + 34, ty + 20);
                ctx.stroke();
            } else if (trap.state === 'detected') {
                const pulse = 0.55 + Math.sin(elapsed * 8) * 0.3;
                ctx.strokeStyle = `rgba(249, 115, 22, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(tx + 6, ty + 6, TILE - 12, TILE - 12);

                ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
                ctx.fillRect(tx + 6, ty + 6, TILE - 12, TILE - 12);
            } else if (trap.state === 'disarmed') {
                ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(tx + 9, ty + 9, TILE - 18, TILE - 18);
            } else if (trap.state === 'triggered') {
                if (trap.type === 'pit') {
                    ctx.fillStyle = '#050407';
                    ctx.fillRect(tx + 6, ty + 6, TILE - 12, TILE - 12);
                    ctx.strokeStyle = '#57534e';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(tx + 6, ty + 6, TILE - 12, TILE - 12);

                    ctx.fillStyle = '#94a3b8';
                    for (let sx = tx + 12; sx <= tx + 36; sx += 8) {
                        ctx.beginPath();
                        ctx.moveTo(sx - 2, ty + 38);
                        ctx.lineTo(sx + 2, ty + 38);
                        ctx.lineTo(sx, ty + 26);
                        ctx.fill();
                    }
                } else if (trap.type === 'spear') {
                    ctx.fillStyle = '#1c1917';
                    ctx.fillRect(tx + 10, ty + 10, TILE - 20, TILE - 20);
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2.2;
                    for (let i = 0; i < 3; i++) {
                        const lx = tx + 15 + i * 9;
                        ctx.beginPath();
                        ctx.moveTo(lx, ty + 34);
                        ctx.lineTo(lx, ty + 8);
                        ctx.stroke();
                    }
                } else {
                    ctx.fillStyle = '#57534e';
                    ctx.beginPath();
                    ctx.arc(tx + 20, ty + 26, 9, 0, Math.PI * 2);
                    ctx.arc(tx + 30, ty + 22, 7, 0, Math.PI * 2);
                    ctx.arc(tx + 24, ty + 32, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }

    _drawStairTile(ctx, x, y, elapsed = 0) {
        ctx.save();
        ctx.fillStyle = '#57534e';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        for (let step = 0; step < 4; step++) {
            const sy = y + 5 + step * 10;
            ctx.fillStyle = step % 2 === 0 ? '#78716c' : '#44403c';
            ctx.fillRect(x + 5, sy, TILE - 10, 8);
        }

        // Resplandor verde/dorado de luz exterior entrando por la escalera
        const glow = 0.45 + Math.sin(elapsed * 4) * 0.25;
        ctx.strokeStyle = `rgba(74, 222, 128, ${glow})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.restore();
    }

    _drawAimReticle(ctx, player) {
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(
            player.x,
            player.y,
            player.attackRange * 0.72,
            player.aimAngle - player.attackArc * 0.42,
            player.aimAngle + player.attackArc * 0.42
        );
        ctx.stroke();
        ctx.restore();
    }

    _drawDynamicTorchLight(ctx, player, elapsed) {
        const flicker = Math.sin(elapsed * 9) * 6;
        const radius = 190 + flicker;

        ctx.save();
        const grad = ctx.createRadialGradient(
            player.x,
            player.y - player.z,
            12,
            player.x,
            player.y - player.z,
            radius
        );
        grad.addColorStop(0, 'rgba(255, 180, 75, 0.14)');
        grad.addColorStop(0.6, 'rgba(255, 140, 40, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(player.x, player.y - player.z, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Efecto de rayos de sol filtrados entre las copas del bosque y luciérnagas doradas estilo Zelda.
     */
    _drawForestAtmosphere(ctx, board, player, elapsed) {
        if (!player) return;

        ctx.save();
        // Halo solar cálido alrededor del grupo
        const sunGrad = ctx.createRadialGradient(
            player.x,
            player.y - 20,
            20,
            player.x,
            player.y - 20,
            260
        );
        sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.10)');
        sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(player.x, player.y - 20, 260, 0, Math.PI * 2);
        ctx.fill();

        // Motas de polen / luciérnagas del bosque flotando suavemente
        for (let i = 0; i < 14; i++) {
            const fx = ((i * 211 + Math.sin(elapsed * 0.7 + i) * 45) % (board.width - 100)) + 50;
            const fy = ((i * 163 + Math.cos(elapsed * 0.6 + i * 2) * 35) % (board.height - 100)) + 50;
            if (Math.hypot(fx - player.x, fy - player.y) < 480) {
                const alpha = 0.35 + Math.sin(elapsed * 3 + i) * 0.25;
                ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
                ctx.beginPath();
                ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    _drawInteractPrompt(ctx, highlight, elapsed) {
        const bob = Math.sin(elapsed * 6) * 3;
        const px = highlight.x;
        const py = highlight.y - 44 + bob;

        ctx.save();
        ctx.font = 'bold 12px "Cinzel", Georgia, serif';
        const textWidth = ctx.measureText(highlight.label).width;
        const boxW = textWidth + 18;
        const boxH = 24;

        ctx.fillStyle = 'rgba(15, 12, 20, 0.92)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.fillRect(px - boxW * 0.5, py - boxH * 0.5, boxW, boxH);
        ctx.strokeRect(px - boxW * 0.5, py - boxH * 0.5, boxW, boxH);

        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(highlight.label, px, py + 0.5);
        ctx.restore();
    }

    _drawScreenVignette(ctx, width, height, isOverworld = false) {
        const outerR = Math.max(width, height) * 0.72;
        const innerR = Math.min(width, height) * 0.32;
        const grad = ctx.createRadialGradient(
            width * 0.5,
            height * 0.5,
            innerR,
            width * 0.5,
            height * 0.5,
            outerR
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, isOverworld ? 'rgba(6, 20, 10, 0.42)' : 'rgba(5, 4, 8, 0.68)');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    /**
     * Dibuja un Minimapa Táctico en la esquina inferior derecha para orientarse en el Bosque 4x y Mazmorras.
     */
    _drawMinimap(ctx, width, height, board, player, companions = [], monsters = [], elapsed = 0) {
        const scale = board.isOverworld ? 1.85 : 4.2;
        const mapW = board.cols * scale;
        const mapH = board.rows * scale;
        const pad = 16;
        const mx = width - mapW - pad;
        const my = height - mapH - pad - 24;

        ctx.save();

        // Marco gótico del minimapa
        ctx.fillStyle = 'rgba(12, 10, 18, 0.88)';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.fillRect(mx - 6, my - 24, mapW + 12, mapH + 32);
        ctx.strokeRect(mx - 6, my - 24, mapW + 12, mapH + 32);

        // Título de la Zona en la cabecera del minimapa
        ctx.font = 'bold 10.5px "Cinzel", Georgia, serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(
            board.isOverworld ? '🌲 BOSQUE DE LORETOME (MAPA 4X)' : `🏰 ${board.zoneName || 'MAZMORRA'}`,
            mx + mapW * 0.5,
            my - 10
        );

        // Celdas del minimapa
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const fogState = board.fog[r][c];
                if (fogState === FOG.UNSEEN) continue;

                const cell = board.grid[r][c];
                if (board.isOverworld) {
                    if (cell === CELL.TREE || cell === CELL.CLIFF) ctx.fillStyle = '#14532d';
                    else if (cell === CELL.WATER) ctx.fillStyle = '#2563eb';
                    else if (cell === CELL.BRIDGE) ctx.fillStyle = '#d97706';
                    else if (cell === CELL.DIRT_PATH) ctx.fillStyle = '#a16207';
                    else if (cell === CELL.STONE_PLAZA) ctx.fillStyle = '#78716c';
                    else ctx.fillStyle = '#22c55e';
                } else {
                    if (cell === CELL.WALL || cell === CELL.VOID) continue;
                    if (cell === CELL.STAIRS) ctx.fillStyle = '#4ade80';
                    else if (cell === CELL.CORRIDOR) ctx.fillStyle = '#475569';
                    else ctx.fillStyle = '#64748b';
                }

                ctx.fillRect(mx + c * scale, my + r * scale, scale + 0.4, scale + 0.4);
            }
        }

        // Marcar los 6 NPCs de Misiones Secundarias en el Bosque
        if (Array.isArray(board.npcs)) {
            for (const npc of board.npcs) {
                const nx = mx + (npc.x / TILE) * scale;
                const ny = my + (npc.y / TILE) * scale;
                ctx.fillStyle = '#fde047';
                ctx.fillRect(nx - 2.2, ny - 2.2, 4.4, 4.4);
            }
        }

        // Marcar los 4 Portales de Mazmorra en el Bosque
        if (Array.isArray(board.portals)) {
            for (const p of board.portals) {
                const px = mx + (p.x / TILE) * scale;
                const py = my + (p.y / TILE) * scale;
                ctx.fillStyle = p.themeColor || '#ef4444';
                ctx.fillRect(px - 3.5, py - 3.5, 7, 7);
                ctx.strokeStyle = p.requiresAllHeroes ? '#facc15' : '#ffffff';
                ctx.lineWidth = p.requiresAllHeroes ? 1.6 : 1;
                ctx.strokeRect(px - 3.5, py - 3.5, 7, 7);
            }
        }

        // Marcar la Escalera de Salida en Mazmorras
        if (board.exitStairs) {
            const sx = mx + (board.exitStairs.x / TILE) * scale;
            const sy = my + (board.exitStairs.y / TILE) * scale;
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(sx - 3.5, sy - 3.5, 7, 7);
        }

        // Enemigos visibles (puntos rojos)
        for (const m of monsters) {
            if (m.dead) continue;
            const mc = Math.floor(m.x / TILE);
            const mr = Math.floor(m.y / TILE);
            if ((board.fog[mr]?.[mc] ?? FOG.UNSEEN) === FOG.VISIBLE) {
                ctx.fillStyle = m.isBoss ? '#f43f5e' : '#ef4444';
                ctx.fillRect(mx + (m.x / TILE) * scale - 1.5, my + (m.y / TILE) * scale - 1.5, 3, 3);
            }
        }

        // Compañeros IA (puntos celestes)
        for (const ally of companions) {
            if (!ally || ally.dead) continue;
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(mx + (ally.x / TILE) * scale - 2, my + (ally.y / TILE) * scale - 2, 4, 4);
        }

        // Jugador Líder (punto dorado pulsante)
        if (player && !player.dead) {
            const px = mx + (player.x / TILE) * scale;
            const py = my + (player.y / TILE) * scale;
            const rPulse = 3.2 + Math.sin(elapsed * 7) * 0.8;
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(px, py, rPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }
}

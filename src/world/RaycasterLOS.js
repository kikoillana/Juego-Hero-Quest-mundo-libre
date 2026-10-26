/**
 * @fileoverview Algoritmo de Bresenham 2D para Línea de Visión (LOS) y máquina de 3 estados de Niebla de Guerra.
 * En el Bosque Exterior (board.isOverworld === true) mantiene iluminación diurna completa,
 * mientras que en las 4 Mazmorras aplica Niebla de Guerra de 3 estados (UNSEEN, EXPLORED, VISIBLE).
 * Capa 3: Depende únicamente de constants.js.
 */

import { TILE, LOS_RADIUS, FOG } from '../config/constants.js';

export class RaycasterLOS {
    /**
     * Actualiza la matriz de Niebla de Guerra del tablero desde la posición del jugador.
     * @param {Object} board
     * @param {number} playerX
     * @param {number} playerY
     * @param {number} [radiusTiles=LOS_RADIUS]
     */
    static updateFogOfWar(board, playerX, playerY, radiusTiles = LOS_RADIUS) {
        if (!board || !board.fog) return;

        // En el Bosque Exterior (Mundo Libre 4x) la matriz fog ya está inicializada como VISIBLE
        if (board.isOverworld) {
            return;
        }

        const { rows, cols, fog } = board;

        const originCol = Math.floor(playerX / TILE);
        const originRow = Math.floor(playerY / TILE);

        // 0. Caché: la niebla sólo cambia si el héroe cambia de baldosa, se abre una puerta
        //    (board.doorVersion) o se sustituye la matriz fog (carga de partida / cambio de zona).
        const fogKey = `${originCol},${originRow},${radiusTiles},${board.doorVersion || 0}`;
        if (board._fogKey === fogKey && board._fogRef === fog) {
            return;
        }
        board._fogKey = fogKey;
        board._fogRef = fog;

        // 1. Degradar todas las celdas actualmente VISIBLES (2) al estado EXPLORADO (1)
        for (let r = 0; r < rows; r++) {
            const rowFog = fog[r];
            for (let c = 0; c < cols; c++) {
                if (rowFog[c] === FOG.VISIBLE) {
                    rowFog[c] = FOG.EXPLORED;
                }
            }
        }

        const maxRadius = Math.ceil(radiusTiles);
        const radiusSq = radiusTiles * radiusTiles;

        const minR = Math.max(0, originRow - maxRadius);
        const maxR = Math.min(rows - 1, originRow + maxRadius);
        const minC = Math.max(0, originCol - maxRadius);
        const maxC = Math.min(cols - 1, originCol + maxRadius);

        // 2. Lanzar rayos Bresenham 2D hacia cada celda dentro del radio visual
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const dc = c - originCol;
                const dr = r - originRow;
                if (dc * dc + dr * dr <= radiusSq) {
                    this._castBresenhamRay(board, originCol, originRow, c, r);
                }
            }
        }

        // 3. Si el héroe está dentro de una sala descubierta, iluminar suavemente los muros perimetrales de la sala
        const currentRoom = board.getRoomAt(originCol, originRow);
        if (currentRoom) {
            const perimR2 = (radiusTiles + 2) * (radiusTiles + 2);
            for (let r = currentRoom.r1 - 1; r <= currentRoom.r2 + 1; r++) {
                for (let c = currentRoom.c1 - 1; c <= currentRoom.c2 + 1; c++) {
                    if (r >= 0 && r < rows && c >= 0 && c < cols) {
                        const dc = c - originCol;
                        const dr = r - originRow;
                        if (dc * dc + dr * dr <= perimR2) {
                            this._castBresenhamRay(board, originCol, originRow, c, r);
                        }
                    }
                }
            }
        }
    }

    /**
     * Traza una línea discreta mediante el algoritmo de Bresenham 2D marcando celdas como VISIBLES
     * hasta impactar con un obstáculo opaco (muro o puerta cerrada).
     */
    static _castBresenhamRay(board, c0, r0, c1, r1) {
        let x0 = c0;
        let y0 = r0;
        const x1 = c1;
        const y1 = r1;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (y0 < 0 || y0 >= board.rows || x0 < 0 || x0 >= board.cols) {
                break;
            }

            board.fog[y0][x0] = FOG.VISIBLE;

            if (x0 === x1 && y0 === y1) {
                break;
            }

            if (!(x0 === c0 && y0 === r0) && board.isOpaqueCell(x0, y0)) {
                break;
            }

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    /**
     * Comprueba si existe Línea de Visión (LOS) directa entre dos puntos en coordenadas de mundo (px).
     */
    static hasLineOfSight(board, worldX0, worldY0, worldX1, worldY1) {
        let x0 = Math.floor(worldX0 / TILE);
        let y0 = Math.floor(worldY0 / TILE);
        const x1 = Math.floor(worldX1 / TILE);
        const y1 = Math.floor(worldY1 / TILE);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (x0 === x1 && y0 === y1) return true;
            if (board.isOpaqueCell(x0, y0)) return false;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    }
}

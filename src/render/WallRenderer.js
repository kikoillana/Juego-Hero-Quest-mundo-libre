/**
 * @fileoverview Renderizador 2.5D de muros extruidos de mazmorra, puertas, antorchas,
 * Árboles Volumétricos del Bosque tipo Zelda: A Link to the Past, Riscos de Montaña (Cliffs)
 * y los 4 Portales Monumentales de entrada a las Mazmorras.
 * Capa 4: Depende únicamente de constants.js.
 */

import { TILE, WALL_H, CELL, FOG, PALETTE } from '../config/constants.js';

export class WallRenderer {
    /**
     * Gradientes cacheados en coordenadas locales (se reutilizan trasladando la matriz
     * en lugar de crear un CanvasGradient nuevo por bloque y por fotograma).
     */
    static _linearGrad(ctx, key, top, bottom) {
        if (!this._gradCache) this._gradCache = new Map();
        let g = this._gradCache.get(key);
        if (!g) {
            g = ctx.createLinearGradient(0, 0, 0, WALL_H);
            g.addColorStop(0, top);
            g.addColorStop(1, bottom);
            this._gradCache.set(key, g);
        }
        return g;
    }

    static _torchHaloGrad(ctx) {
        if (!this._torchHalo) {
            const g = ctx.createRadialGradient(0, 0, 1 / 22, 0, 0, 1);
            g.addColorStop(0, 'rgba(251, 191, 36, 0.65)');
            g.addColorStop(0.5, 'rgba(249, 115, 22, 0.28)');
            g.addColorStop(1, 'rgba(249, 115, 22, 0)');
            this._torchHalo = g;
        }
        return this._torchHalo;
    }

    /**
     * Dibuja un bloque de muro extruido en 2.5D correspondiente a la celda (col, row).
     */
    static drawWallBlock(ctx, board, col, row) {
        const fogState = board.fog[row]?.[col] ?? FOG.UNSEEN;
        if (fogState === FOG.UNSEEN) return;

        const x = col * TILE;
        const y = row * TILE;
        const topY = y - WALL_H;

        const southIsWall =
            row + 1 < board.rows && board.grid[row + 1][col] === CELL.WALL;
        const northIsWall =
            row - 1 >= 0 && board.grid[row - 1][col] === CELL.WALL;
        const westIsWall =
            col - 1 >= 0 && board.grid[row][col - 1] === CELL.WALL;
        const eastIsWall =
            col + 1 < board.cols && board.grid[row][col + 1] === CELL.WALL;

        ctx.save();

        // 1. FACHADA FRONTAL (solo visible si la celda sur no es otro muro macizo)
        if (!southIsWall) {
            const frontY = y + TILE - WALL_H;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.fillRect(x, y + TILE, TILE, 10);

            ctx.fillStyle = this._linearGrad(ctx, 'wall', PALETTE.WALL_FRONT_UPPER, PALETTE.WALL_FRONT_LOWER);
            ctx.translate(x, frontY);
            ctx.fillRect(0, 0, TILE, WALL_H);
            ctx.translate(-x, -frontY);

            ctx.strokeStyle = PALETTE.WALL_MORTAR;
            ctx.lineWidth = 1.2;

            const rowH1 = Math.floor(WALL_H * 0.34);
            const rowH2 = Math.floor(WALL_H * 0.68);

            ctx.beginPath();
            ctx.moveTo(x, frontY + rowH1);
            ctx.lineTo(x + TILE, frontY + rowH1);
            ctx.moveTo(x, frontY + rowH2);
            ctx.lineTo(x + TILE, frontY + rowH2);

            const offset = ((col + row) % 2) * 12;
            ctx.moveTo(x + 24, frontY);
            ctx.lineTo(x + 24, frontY + rowH1);

            ctx.moveTo(x + 12 + offset, frontY + rowH1);
            ctx.lineTo(x + 12 + offset, frontY + rowH2);
            ctx.moveTo(x + 36, frontY + rowH1);
            ctx.lineTo(x + 36, frontY + rowH2);

            ctx.moveTo(x + 22, frontY + rowH2);
            ctx.lineTo(x + 22, y + TILE);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(x, y + TILE - 4, TILE, 4);
        }

        // 2. CARA SUPERIOR (TECHO DEL MURO en perspectiva oblicua 3/4)
        ctx.fillStyle = PALETTE.WALL_TOP;
        ctx.fillRect(x, topY, TILE, TILE);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, topY + 4, TILE - 8, TILE - 8);

        ctx.fillStyle = PALETTE.WALL_TOP_BORDER;
        if (!northIsWall) ctx.fillRect(x, topY, TILE, 3);
        if (!southIsWall) ctx.fillRect(x, topY + TILE - 3, TILE, 3);
        if (!westIsWall) ctx.fillRect(x, topY, 3, TILE);
        if (!eastIsWall) ctx.fillRect(x + TILE - 3, topY, 3, TILE);

        if (fogState === FOG.EXPLORED) {
            ctx.fillStyle = PALETTE.FOG_EXPLORED;
            ctx.fillRect(x, topY, TILE, TILE + (southIsWall ? 0 : WALL_H));
        }

        ctx.restore();
    }

    /**
     * Dibuja un Árbol Volumétrico 2.5D estilo Zelda: A Link to the Past en la celda (col, row).
     * Incluye sombra proyectada, tronco robusto de roble y triple copa frondosa con mecido suave.
     */
    static drawTreeBlock(ctx, board, col, row, elapsed = 0) {
        const x = col * TILE;
        const y = row * TILE;
        const cx = x + TILE * 0.5;
        const cy = y + TILE * 0.55;
        const variant = board.tileVariants[row]?.[col] ?? 0.5;
        const sway = Math.sin(elapsed * 1.8 + col * 0.7 + row * 0.5) * 1.6;

        ctx.save();

        // 1. Sombra elíptica bajo el árbol
        ctx.fillStyle = 'rgba(5, 14, 8, 0.44)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, y + TILE - 6, 22, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Tronco y raíces de roble
        ctx.fillStyle = '#451a03';
        ctx.fillRect(cx - 7, y + 14, 14, 26);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx - 5, y + 14, 6, 25);

        // 3. Copa frondosa multicapa en 2.5D (estilo Zelda clásico)
        const isAutumnTint = variant > 0.84;
        const shadowCrown = isAutumnTint ? '#14532d' : '#064e3b';
        const midCrown = isAutumnTint ? '#15803d' : '#166534';
        const topCrown = isAutumnTint ? '#4d7c0f' : '#15803d';
        const highlightCrown = isAutumnTint ? '#84cc16' : '#22c55e';

        // Base oscura del follaje
        ctx.fillStyle = shadowCrown;
        ctx.beginPath();
        ctx.arc(cx + sway * 0.4, cy - 12, 23, 0, Math.PI * 2);
        ctx.arc(cx - 11 + sway * 0.4, cy - 8, 16, 0, Math.PI * 2);
        ctx.arc(cx + 11 + sway * 0.4, cy - 8, 16, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo medio de la copa
        ctx.fillStyle = midCrown;
        ctx.beginPath();
        ctx.arc(cx + sway * 0.7, cy - 20, 21, 0, Math.PI * 2);
        ctx.arc(cx - 10 + sway * 0.7, cy - 15, 15, 0, Math.PI * 2);
        ctx.arc(cx + 10 + sway * 0.7, cy - 15, 15, 0, Math.PI * 2);
        ctx.fill();

        // Corona superior iluminada por el sol
        ctx.fillStyle = topCrown;
        ctx.beginPath();
        ctx.arc(cx + sway, cy - 27, 17, 0, Math.PI * 2);
        ctx.fill();

        // Brillo de hojas superiores
        ctx.fillStyle = highlightCrown;
        ctx.globalAlpha = 0.68;
        ctx.beginPath();
        ctx.arc(cx - 4 + sway, cy - 31, 9, 0, Math.PI * 2);
        ctx.arc(cx + 6 + sway, cy - 25, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.restore();
    }

    /**
     * Dibuja un bloque de Escarpe Rocoso (CELL.CLIFF) estilo montaña de Zelda en 2.5D.
     */
    static drawCliffBlock(ctx, board, col, row) {
        const x = col * TILE;
        const y = row * TILE;
        const topY = y - WALL_H;

        ctx.save();

        // Sombra al pie del risco
        ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
        ctx.fillRect(x, y + TILE, TILE, 9);

        // Pared rocosa estriada marrón/ocre
        const cliffFrontY = y + TILE - WALL_H;
        ctx.fillStyle = this._linearGrad(ctx, 'cliff', PALETTE.CLIFF_FRONT_UPPER, PALETTE.CLIFF_FRONT_LOWER);
        ctx.translate(x, cliffFrontY);
        ctx.fillRect(0, 0, TILE, WALL_H);
        ctx.translate(-x, -cliffFrontY);

        // Grietas verticales de roca
        ctx.strokeStyle = '#291d12';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 16, y + TILE - WALL_H);
        ctx.lineTo(x + 12, y + TILE);
        ctx.moveTo(x + 34, y + TILE - WALL_H);
        ctx.lineTo(x + 38, y + TILE);
        ctx.stroke();

        // Meseta superior cubierta de musgo/hierba alta
        ctx.fillStyle = PALETTE.CLIFF_TOP;
        ctx.fillRect(x, topY, TILE, TILE);

        ctx.strokeStyle = '#65a30d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, topY + TILE - 1);
        ctx.lineTo(x + TILE, topY + TILE - 1);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Dibuja un Portal Monumental de Entrada a una Mazmorra en el Bosque Exterior (board.portals).
     */
    static drawDungeonPortal(ctx, portal, elapsed = 0, partyCount = 1) {
        const x = portal.x - TILE * 1.1;
        const y = portal.y - TILE * 0.5;
        const w = TILE * 2.2;
        const h = TILE * 1.3;
        const archH = 54;

        ctx.save();

        // Sombra monumental
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(x - 4, y + h - 8, w + 8, 16);

        // Escalinata de piedra de entrada
        ctx.fillStyle = '#57534e';
        ctx.fillRect(x - 6, y + h - 14, w + 12, 14);
        ctx.fillStyle = '#78716c';
        ctx.fillRect(x - 2, y + h - 22, w + 4, 10);

        // Estructura de piedra del Mausoleo / Fortaleza
        ctx.fillStyle = '#3f3f46';
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y - archH, w, h + archH - 14);
        ctx.strokeRect(x, y - archH, w, h + archH - 14);

        // Frontón triangular gótico superior
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(x - 8, y - archH + 4);
        ctx.lineTo(x + w * 0.5, y - archH - 22);
        ctx.lineTo(x + w + 8, y - archH + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = portal.themeColor || '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pilares laterales grabados
        ctx.fillStyle = '#52525b';
        ctx.fillRect(x + 4, y - archH + 6, 16, h + archH - 22);
        ctx.fillRect(x + w - 20, y - archH + 6, 16, h + archH - 22);

        // Boca abisal de la Mazmorra con pulso mágico
        const gateX = x + 22;
        const gateW = w - 44;
        const gateTop = y - archH + 18;
        const gateH = h + archH - 34;

        ctx.fillStyle = '#050408';
        ctx.fillRect(gateX, gateTop, gateW, gateH);

        const pulse = 0.28 + Math.sin(elapsed * 3.5) * 0.12;
        const portalGrad = ctx.createRadialGradient(
            portal.x,
            gateTop + gateH * 0.55,
            4,
            portal.x,
            gateTop + gateH * 0.55,
            gateW * 0.65
        );
        portalGrad.addColorStop(0, portal.themeColor || '#facc15');
        portalGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.globalAlpha = pulse;
        ctx.fillStyle = portalGrad;
        ctx.fillRect(gateX, gateTop, gateW, gateH);
        ctx.globalAlpha = 1.0;

        // Si el portal requiere los 4 Héroes y aún faltan compañeros, dibujar barrera rúnica sellada
        if (portal.requiresAllHeroes && partyCount < 4) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(gateX, gateTop);
            ctx.lineTo(gateX + gateW, gateTop + gateH);
            ctx.moveTo(gateX + gateW, gateTop);
            ctx.lineTo(gateX, gateTop + gateH);
            ctx.stroke();
        }

        // Peldaños descendiendo hacia la oscuridad
        for (let s = 0; s < 4; s++) {
            ctx.fillStyle = `rgba(120, 113, 108, ${0.45 - s * 0.1})`;
            ctx.fillRect(gateX + 4 + s * 3, gateTop + gateH - 8 - s * 7, gateW - 8 - s * 6, 5);
        }

        // Placa / Estandarte con el nombre de la Mazmorra sobre el arco
        ctx.font = 'bold 11px "Cinzel", Georgia, serif';
        const label = `⚔️ ${portal.name}`;
        const tw = ctx.measureText(label).width;
        const bw = tw + 16;
        const bh = 20;
        const bx = portal.x - bw * 0.5;
        const by = y - archH - 34;

        ctx.fillStyle = 'rgba(15, 12, 22, 0.92)';
        ctx.strokeStyle = portal.themeColor || '#facc15';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, portal.x, by + bh * 0.5);

        // Insignia de estado del Sello de los 4 Héroes (Reto Final)
        if (portal.requiresAllHeroes) {
            const unlocked = partyCount >= 4;
            const sealText = unlocked
                ? '🔓 ¡4/4 HÉROES REUNIDOS! RETO FINAL ABIERTO'
                : `🔒 SELLO DE LOS 4 HÉROES: ${partyCount}/4 RESCATADOS`;
            ctx.font = 'bold 10px "Cinzel", Georgia, serif';
            const stw = ctx.measureText(sealText).width + 14;
            const sbx = portal.x - stw * 0.5;
            const sby = by - 22;

            ctx.fillStyle = unlocked ? 'rgba(20, 83, 45, 0.94)' : 'rgba(127, 29, 29, 0.94)';
            ctx.strokeStyle = unlocked ? '#4ade80' : '#f87171';
            ctx.lineWidth = 1.4;
            ctx.fillRect(sbx, sby, stw, 18);
            ctx.strokeRect(sbx, sby, stw, 18);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(sealText, portal.x, sby + 9);
        }

        ctx.restore();
    }

    /**
     * Dibuja una de las 12 puertas clásicas de HeroQuest en 2.5D (cerrada o abierta).
     */
    static drawDoor(ctx, door, fogState) {
        if (fogState === FOG.UNSEEN) return;

        const cellX = door.col * TILE;
        const cellY = door.row * TILE;
        const frameTopY = cellY - WALL_H;

        ctx.save();

        const isHorizontal = door.orientation === 'horizontal';
        const archColor = door.isBossDoor ? '#7f1d1d' : '#57534e';
        const woodColor = door.isBossDoor ? '#450a0a' : '#78350f';
        const trimColor = door.isBossDoor ? '#f59e0b' : '#94a3b8';

        if (isHorizontal) {
            ctx.fillStyle = archColor;
            ctx.fillRect(cellX, frameTopY, 9, TILE + WALL_H);
            ctx.fillRect(cellX + TILE - 9, frameTopY, 9, TILE + WALL_H);

            ctx.fillStyle = '#3f3f46';
            ctx.fillRect(cellX, frameTopY, TILE, 12);
            ctx.strokeStyle = trimColor;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cellX, frameTopY, TILE, 12);

            if (!door.open) {
                const doorTop = cellY + TILE * 0.55 - WALL_H;
                ctx.fillStyle = woodColor;
                ctx.fillRect(cellX + 8, doorTop, TILE - 16, WALL_H + 8);

                ctx.strokeStyle = '#271206';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cellX + 18, doorTop);
                ctx.lineTo(cellX + 18, doorTop + WALL_H + 8);
                ctx.moveTo(cellX + 30, doorTop);
                ctx.lineTo(cellX + 30, doorTop + WALL_H + 8);
                ctx.stroke();

                ctx.fillStyle = trimColor;
                ctx.fillRect(cellX + 8, doorTop + 8, TILE - 16, 4);
                ctx.fillRect(cellX + 8, doorTop + WALL_H - 6, TILE - 16, 4);

                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cellX + TILE * 0.5, doorTop + WALL_H * 0.52, 4, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = woodColor;
                ctx.fillRect(cellX + 6, frameTopY + 10, 6, TILE + 12);
            }
        } else {
            const centerX = cellX + TILE * 0.5;

            if (!door.open) {
                ctx.fillStyle = woodColor;
                ctx.fillRect(centerX - 6, frameTopY + 4, 12, TILE + WALL_H - 6);
                ctx.strokeStyle = trimColor;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(centerX - 6, frameTopY + 4, 12, TILE + WALL_H - 6);

                ctx.fillStyle = '#facc15';
                ctx.fillRect(centerX - 3, frameTopY + 16, 6, 6);
                ctx.fillRect(centerX - 3, frameTopY + 38, 6, 6);
            } else {
                ctx.fillStyle = archColor;
                ctx.fillRect(centerX - 7, frameTopY, 14, 12);
                ctx.fillRect(centerX - 7, cellY + TILE - 10, 14, 10);
            }
        }

        if (fogState === FOG.EXPLORED) {
            ctx.fillStyle = PALETTE.FOG_EXPLORED;
            ctx.fillRect(cellX, frameTopY, TILE, TILE + WALL_H);
        }

        ctx.restore();
    }

    /**
     * Dibuja una antorcha mural o pedestal con llama animada.
     */
    static drawTorch(ctx, torch, elapsed) {
        const flicker = Math.sin(elapsed * 14 + torch.col * 3) * 1.8;
        const baseX = torch.x;
        const baseY = torch.y - WALL_H * 0.42;

        ctx.save();

        ctx.fillStyle = '#27272a';
        ctx.fillRect(baseX - 2.5, baseY, 5, 11);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(baseX - 2, baseY - 4, 4, 7);

        const haloR = 22 + flicker;
        ctx.translate(baseX, baseY - 7);
        ctx.scale(haloR, haloR);
        ctx.fillStyle = this._torchHaloGrad(ctx);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.scale(1 / haloR, 1 / haloR);
        ctx.translate(-baseX, -(baseY - 7));

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(baseX, baseY - 6, 4.5 + flicker * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(baseX, baseY - 7, 2.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

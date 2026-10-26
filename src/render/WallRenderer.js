/**
 * @fileoverview Bloques con volumen en vista 3/4 pixel-art: muros de mazmorra (techo + fachada de ladrillo),
 * árboles de copa redonda, riscos de roca, portales de mazmorra, puertas y antorchas animadas.
 * Capa 4: Depende de constants.js, Sprites.js y envDraw.js.
 */

import { TILE, CELL, FOG, PALETTE } from '../config/constants.js';
import { PX } from './Sprites.js';
import { envTile, envSprite, pixelLabel } from './envDraw.js';

/** Altura visible de la fachada (12 píxeles artísticos). */
const FACE = 12 * PX;

/** Colores de borde del techo de muro por tema (claro / oscuro). */
const THEME_RIM = {
    fellmarg: ['#a8a8a0', '#303040'],
    crypt: ['#7880a8', '#24263f'],
    kellar: ['#a87058', '#382020'],
    swamp: ['#80a080', '#26342e']
};

export class WallRenderer {
    /** Tema activo (lo fija RenderEngine en cada fotograma). */
    static theme = 'fellmarg';

    /**
     * Muro en 3/4: techo oscuro desplazado hacia arriba y fachada de ladrillo si la celda sur está libre.
     */
    static drawWallBlock(ctx, board, col, row) {
        const fogState = board.fog[row]?.[col] ?? FOG.UNSEEN;
        if (fogState === FOG.UNSEEN) return;

        const theme = this.theme;
        const x = col * TILE;
        const y = row * TILE;
        const topY = y - FACE;
        const isWall = (r, c) => r >= 0 && c >= 0 && r < board.rows && c < board.cols && board.grid[r][c] === CELL.WALL;
        const southIsWall = isWall(row + 1, col);

        // 1. Fachada frontal
        if (!southIsWall) {
            const v = board.tileVariants?.[row]?.[col] ?? 0;
            envTile(ctx, 'dungeon', `${theme}_face${v > 0.85 ? 1 : v < 0.1 ? 2 : 0}`, x, y + TILE - FACE);
        }

        // 2. Techo del muro
        envTile(ctx, 'dungeon', `${theme}_cap`, x, topY);
        const [rimLight, rimDark] = THEME_RIM[theme] || THEME_RIM.fellmarg;
        if (!isWall(row - 1, col)) {
            ctx.fillStyle = rimDark;
            ctx.fillRect(x, topY, TILE, PX);
            ctx.fillStyle = rimLight;
            ctx.fillRect(x, topY + PX, TILE, PX);
        }
        if (!southIsWall) {
            ctx.fillStyle = rimLight;
            ctx.fillRect(x, topY + TILE - PX, TILE, PX);
        }
        if (!isWall(row, col - 1)) {
            ctx.fillStyle = rimDark;
            ctx.fillRect(x, topY, PX, TILE);
            ctx.fillStyle = rimLight;
            ctx.fillRect(x + PX, topY + PX, PX, TILE - PX);
        }
        if (!isWall(row, col + 1)) {
            ctx.fillStyle = rimDark;
            ctx.fillRect(x + TILE - PX, topY, PX, TILE);
        }

        if (fogState === FOG.EXPLORED) {
            ctx.fillStyle = PALETTE.FOG_EXPLORED;
            ctx.fillRect(x, topY, TILE, TILE + (southIsWall ? 0 : FACE));
        }
    }

    /**
     * Árbol de copa redonda (los árboles interiores del bosque usan la variante más oscura).
     */
    static drawTreeBlock(ctx, board, col, row, elapsed = 0) {
        const g = board.grid;
        const isTree = (r, c) => r < 0 || c < 0 || r >= board.rows || c >= board.cols || g[r][c] === CELL.TREE;
        const inner = isTree(row - 1, col) && isTree(row + 1, col) && isTree(row, col - 1) && isTree(row, col + 1);
        const v = board.tileVariants?.[row]?.[col] ?? 0;
        const name = inner ? 'tree2' : v > 0.5 ? 'tree1' : 'tree0';
        envSprite(ctx, 'overworld', name, col * TILE + TILE / 2, row * TILE + TILE);
    }

    /**
     * Risco de roca: meseta de hierba elevada y cara de roca en bloques.
     */
    static drawCliffBlock(ctx, board, col, row) {
        const x = col * TILE;
        const y = row * TILE;
        const topY = y - FACE;
        const isCliff = (r, c) => r >= 0 && c >= 0 && r < board.rows && c < board.cols && board.grid[r][c] === CELL.CLIFF;
        const v = board.tileVariants?.[row]?.[col] ?? 0;

        if (!isCliff(row + 1, col)) {
            envTile(ctx, 'overworld', `cliffface${v > 0.5 ? 1 : 0}`, x, y + TILE - FACE);
        }
        envTile(ctx, 'overworld', `clifftop${v > 0.6 ? 1 : 0}`, x, topY);

        ctx.fillStyle = '#201818';
        if (!isCliff(row - 1, col)) ctx.fillRect(x, topY, TILE, PX);
        if (!isCliff(row, col - 1)) ctx.fillRect(x, topY, PX, TILE + (isCliff(row + 1, col) ? 0 : FACE));
        if (!isCliff(row, col + 1)) ctx.fillRect(x + TILE - PX, topY, PX, TILE + (isCliff(row + 1, col) ? 0 : FACE));
        ctx.fillStyle = '#68b848';
        if (!isCliff(row - 1, col)) ctx.fillRect(x + PX, topY + PX, TILE - 2 * PX, PX);
    }

    /**
     * Entrada de mazmorra en el Bosque: pórtico de piedra con el color del tema y candado si está sellada.
     */
    static drawDungeonPortal(ctx, portal, elapsed = 0, partyCount = 1) {
        const style = portal.archStyle || 'fortress';
        const baseY = portal.y + TILE * 0.8;
        envSprite(ctx, 'objects', `portal_${style}`, portal.x, baseY) ||
            envSprite(ctx, 'objects', 'portal_fortress', portal.x, baseY);

        const sealed = portal.requiresAllHeroes && partyCount < 4;
        if (sealed) {
            const bob = Math.floor(elapsed * 2) % 2 === 0 ? 0 : PX;
            envSprite(ctx, 'objects', 'padlock', portal.x, portal.y - PX * 2 + bob);
        }

        // Nombre de la mazmorra sobre el pórtico
        const name = String(portal.name || '').replace(/\s*\(.*\)\s*$/, '');
        pixelLabel(ctx, sealed ? `${name} ${partyCount}/4` : name, portal.x, portal.y - TILE * 2.3);
    }

    /**
     * Puerta de mazmorra (frontal en muros horizontales, de canto en muros verticales).
     */
    static drawDoor(ctx, door, fogState) {
        if (fogState === FOG.UNSEEN) return;
        const theme = this.theme;
        const kind = door.orientation === 'horizontal' ? 'doorh' : 'doorv';
        const boss = door.isBossDoor ? 'boss' : '';
        const state = door.open ? 'open' : 'closed';
        const cx = door.col * TILE + TILE / 2;
        // Las puertas laterales se dibujan a la altura del techo del muro (desplazadas FACE hacia arriba)
        const by = door.row * TILE + TILE - (kind === 'doorv' ? FACE : 0);
        const h = kind === 'doorv' ? TILE : 28 * PX;
        envSprite(ctx, 'dungeon', `${theme}_${kind}${boss}_${state}`, cx, by);

        if (fogState === FOG.EXPLORED) {
            ctx.fillStyle = PALETTE.FOG_EXPLORED;
            ctx.fillRect(door.col * TILE, by - h, TILE, h);
        }
    }

    /**
     * Antorcha animada (en el muro en mazmorras; sobre un poste de madera en el bosque).
     */
    static drawTorch(ctx, torch, elapsed, isOverworld = false) {
        const frame = (Math.floor(elapsed * 8) + (torch.col || 0)) % 3;
        if (isOverworld) {
            const x = torch.x - PX;
            ctx.fillStyle = '#201818';
            ctx.fillRect(x - PX, torch.y - 10 * PX, PX * 4, 11 * PX);
            ctx.fillStyle = '#885020';
            ctx.fillRect(x, torch.y - 10 * PX, PX * 2, 10 * PX);
            ctx.fillStyle = '#b07038';
            ctx.fillRect(x, torch.y - 10 * PX, PX, 10 * PX);
            envSprite(ctx, 'dungeon', `torch${frame}`, torch.x, torch.y - 8 * PX);
        } else {
            envSprite(ctx, 'dungeon', `torch${frame}`, torch.x, torch.y + PX);
        }
    }
}

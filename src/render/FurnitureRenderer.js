/**
 * @fileoverview Muebles de mazmorra HeroQuest y objetos interactuables del Bosque como sprites pixel-art
 * (assets/sprites/objects.png). Cada sprite se ancla por su centro-inferior al pie del objeto.
 * Capa 4: Depende de constants.js, Sprites.js y envDraw.js.
 */

import { FURNITURE_TYPE, FOG, PALETTE } from '../config/constants.js';
import { PX, snap } from './Sprites.js';
import { envSprite, envFrame, pixelLabel } from './envDraw.js';

/** Colores del héroe cautivo dentro de la jaula (capa, piel, pelo). */
const HERO_CAGE_COLORS = {
    barbarian: { cape: '#d83828', skin: '#e8a878', hair: '#583010' },
    dwarf: { cape: '#d08818', skin: '#f8d0a8', hair: '#d83828' },
    elf: { cape: '#40b830', skin: '#f8d0a8', hair: '#f8c830' },
    wizard: { cape: '#8850c0', skin: '#f8d0a8', hair: '#d8d8d0' }
};

/** Elige el fotograma según el tipo y estado del objeto. */
function frameFor(f, elapsed) {
    const blink = Math.floor(elapsed * 2) % 2;
    switch (f.type) {
        case FURNITURE_TYPE.TABLE: return 'table';
        case FURNITURE_TYPE.THRONE: return 'throne';
        case FURNITURE_TYPE.CHEST: return f.opened ? 'chest_open' : 'chest';
        case FURNITURE_TYPE.BOOKCASE: return 'bookcase';
        case FURNITURE_TYPE.RACK: return 'rack';
        case FURNITURE_TYPE.FIREPLACE: return `fireplace${Math.floor(elapsed * 6) % 2}`;
        case FURNITURE_TYPE.ALCHEMIST_BENCH: return `alchemist${blink}`;
        case FURNITURE_TYPE.SARCOPHAGUS: return f.opened ? 'sarcophagus_open' : 'sarcophagus';
        case FURNITURE_TYPE.WEAPONS_RACK: return 'weapons_rack';
        case FURNITURE_TYPE.BUSH: return f.opened ? 'bush_cut' : 'bush';
        case FURNITURE_TYPE.CAMPFIRE: return `campfire${Math.floor(elapsed * 8) % 3}`;
        case FURNITURE_TYPE.ANVIL_STALL: return 'anvil_stall';
        case FURNITURE_TYPE.SIGNPOST: return 'signpost';
        case FURNITURE_TYPE.BOULDER_FIELD: return 'boulder';
        case FURNITURE_TYPE.STUMP: return 'stump';
        case FURNITURE_TYPE.WELL: return 'well';
        case FURNITURE_TYPE.QUEST_BOARD: return 'quest_board';
        case FURNITURE_TYPE.METEOR_NODE: return f.opened ? 'meteor_used' : `meteor${blink}`;
        case FURNITURE_TYPE.CORRUPT_ALTAR: return f.opened ? `altar_pure${blink}` : `altar${blink}`;
        case FURNITURE_TYPE.MOONFLOWER: return f.opened ? 'moonflower_picked' : `moonflower${blink}`;
        case FURNITURE_TYPE.WAYSTONE: return `waystone${blink}`;
        default: return 'table';
    }
}

export class FurnitureRenderer {
    /** Tema de mazmorra activo (lo fija RenderEngine). */
    static theme = 'fellmarg';

    /**
     * Dibuja un mueble u objeto del escenario.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} furn
     * @param {number} fogState
     * @param {number} [elapsed=0]
     */
    static drawFurniture(ctx, furn, fogState, elapsed = 0) {
        if (fogState === FOG.UNSEEN) return;

        const ax = furn.x + furn.width / 2;
        const ay = furn.y + furn.height;
        let name;

        if (furn.type === FURNITURE_TYPE.HERO_CAGE) {
            name = this._drawHeroCage(ctx, furn, ax, ay, elapsed);
        } else {
            name = frameFor(furn, elapsed);
            envSprite(ctx, 'objects', name, ax, ay);
        }

        // Destello parpadeante sobre objetos aún sin inspeccionar
        if (!furn.inspected && fogState === FOG.VISIBLE && furn.type !== FURNITURE_TYPE.BUSH) {
            this._drawSparkle(ctx, furn, ax, ay, name, elapsed);
        }

        if (fogState === FOG.EXPLORED) {
            const fr = envFrame('objects', name);
            if (fr) {
                const w = fr[2] * PX;
                const h = fr[3] * PX;
                ctx.fillStyle = PALETTE.FOG_EXPLORED;
                ctx.fillRect(snap(ax - w / 2), snap(ay - h), w, h);
            }
        }
    }

    /** Pequeño destello en cruz (4 fases) en la esquina superior del sprite. */
    static _drawSparkle(ctx, furn, ax, ay, name, elapsed) {
        const phase = Math.floor(elapsed * 6 + furn.col) % 6;
        if (phase > 3) return;
        const fr = envFrame('objects', name);
        const h = fr ? fr[3] * PX : furn.height;
        const w = fr ? fr[2] * PX : furn.width;
        const sx = snap(ax + w / 2 - PX * 2);
        const sy = snap(ay - h + PX);
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(sx, sy, PX, PX);
        if (phase === 1 || phase === 2) {
            ctx.fillStyle = '#f8f088';
            ctx.fillRect(sx - PX, sy, PX, PX);
            ctx.fillRect(sx + PX, sy, PX, PX);
            ctx.fillRect(sx, sy - PX, PX, PX);
            ctx.fillRect(sx, sy + PX, PX, PX);
        }
    }

    /** Jaula rúnica con el héroe cautivo (o abierta tras el rescate). */
    static _drawHeroCage(ctx, f, ax, ay, elapsed) {
        if (f.opened) {
            envSprite(ctx, 'objects', 'cage_back', ax, ay);
            envSprite(ctx, 'objects', 'cage_open', ax, ay);
            return 'cage_open';
        }

        envSprite(ctx, 'objects', 'cage_back', ax, ay);

        // Figura del prisionero (sentado, se balancea cada medio segundo)
        const hc = HERO_CAGE_COLORS[f.prisonerHeroId] || HERO_CAGE_COLORS.barbarian;
        const ox = snap(ax - 4 * PX);
        const oy = snap(ay - 17 * PX) + (Math.floor(elapsed * 2) % 2) * PX;
        const r = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(ox + x * PX, oy + y * PX, w * PX, h * PX);
        };
        r(1, 0, 6, 1, '#201818');
        r(0, 1, 8, 5, '#201818');
        r(1, 1, 6, 2, hc.hair);
        r(2, 3, 4, 3, hc.skin);
        r(2, 4, 1, 1, '#201818');
        r(5, 4, 1, 1, '#201818');
        r(0, 6, 8, 7, '#201818');
        r(1, 6, 6, 6, hc.cape);
        r(2, 7, 1, 4, '#f8f8f8');
        r(1, 12, 2, 1, '#583010');
        r(5, 12, 2, 1, '#583010');

        envSprite(ctx, 'objects', 'cage_front', ax, ay);

        pixelLabel(ctx, `CAUTIVO: ${(f.prisonerName || 'HEROE').toUpperCase()} [E]`, ax, ay - 30 * PX, { bg: '#401818' });
        return 'cage_front';
    }
}

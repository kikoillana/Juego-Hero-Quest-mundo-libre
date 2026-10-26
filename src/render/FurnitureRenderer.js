/**
 * @fileoverview Renderizador volumétrico en proyección oblicua 3/4 (2.5D) de los 9 muebles clásicos de HeroQuest
 * más los objetos interactuables del Bosque Exterior estilo Zelda (Arbustos, Hoguera, Forja Real, Carteles, Pozo, Rocas y Tocones).
 * Capa 4: Depende únicamente de constants.js.
 */

import { FURNITURE_TYPE, FOG, PALETTE } from '../config/constants.js';

// Constantes de color hoisteadas (antes se recreaban en cada dibujado)
const BOOK_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#cbd5e1'];
const PERGAMINO_COLORS = ['#fef3c7', '#fde68a', '#e0f2fe', '#fef3c7'];
const HERO_CAGE_COLORS = {
    barbarian: { cape: '#b91c1c', skin: '#d97706', hair: '#1c1917' },
    dwarf: { cape: '#b45309', skin: '#f59e0b', hair: '#9a3412' },
    elf: { cape: '#15803d', skin: '#fde68a', hair: '#facc15' },
    wizard: { cape: '#6d28d9', skin: '#fef3c7', hair: '#e2e8f0' }
};

export class FurnitureRenderer {
    /**
     * Dibuja un mueble u objeto volumétrico 2.5D en el Canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} furn
     * @param {number} fogState
     * @param {number} [elapsed=0]
     */
    static drawFurniture(ctx, furn, fogState, elapsed = 0) {
        if (fogState === FOG.UNSEEN) return;

        ctx.save();

        // Sombra proyectada en el suelo (salvo arbusto ya cortado)
        if (!(furn.type === FURNITURE_TYPE.BUSH && furn.opened)) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
            ctx.fillRect(furn.x + 3, furn.y + 6, furn.width - 4, furn.height - 2);
        }

        switch (furn.type) {
            case FURNITURE_TYPE.TABLE:
                this._drawTable(ctx, furn);
                break;
            case FURNITURE_TYPE.THRONE:
                this._drawThrone(ctx, furn);
                break;
            case FURNITURE_TYPE.CHEST:
                this._drawChest(ctx, furn);
                break;
            case FURNITURE_TYPE.BOOKCASE:
                this._drawBookcase(ctx, furn);
                break;
            case FURNITURE_TYPE.RACK:
                this._drawTortureRack(ctx, furn);
                break;
            case FURNITURE_TYPE.FIREPLACE:
                this._drawFireplace(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.ALCHEMIST_BENCH:
                this._drawAlchemistBench(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.SARCOPHAGUS:
                this._drawSarcophagus(ctx, furn);
                break;
            case FURNITURE_TYPE.WEAPONS_RACK:
                this._drawWeaponsRack(ctx, furn);
                break;
            // Elementos del Bosque Exterior (Zelda Overworld)
            case FURNITURE_TYPE.BUSH:
                this._drawBush(ctx, furn);
                break;
            case FURNITURE_TYPE.CAMPFIRE:
                this._drawCampfire(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.ANVIL_STALL:
                this._drawAnvilStall(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.SIGNPOST:
                this._drawSignpost(ctx, furn);
                break;
            case FURNITURE_TYPE.BOULDER_FIELD:
                this._drawBoulderField(ctx, furn);
                break;
            case FURNITURE_TYPE.STUMP:
                this._drawStump(ctx, furn);
                break;
            case FURNITURE_TYPE.WELL:
                this._drawWell(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.HERO_CAGE:
                this._drawHeroCage(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.QUEST_BOARD:
                this._drawQuestBoard(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.METEOR_NODE:
                this._drawMeteorNode(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.CORRUPT_ALTAR:
                this._drawCorruptAltar(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.MOONFLOWER:
                this._drawMoonflower(ctx, furn, elapsed);
                break;
            case FURNITURE_TYPE.WAYSTONE:
                this._drawWaystone(ctx, furn, elapsed);
                break;
            default:
                this._drawTable(ctx, furn);
                break;
        }

        // Indicador sutil de brillo si el mueble aún no ha sido registrado y está en visión directa
        if (!furn.inspected && fogState === FOG.VISIBLE && furn.type !== FURNITURE_TYPE.BUSH) {
            const pulse = 0.35 + Math.sin(elapsed * 4) * 0.2;
            ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(furn.x + 4, furn.y - 12, furn.width - 8, furn.height + 10);
        }

        if (fogState === FOG.EXPLORED) {
            ctx.fillStyle = PALETTE.FOG_EXPLORED;
            ctx.fillRect(furn.x, furn.y - 28, furn.width, furn.height + 32);
        }

        ctx.restore();
    }

    /** 1. MESA DE ROBLE (Table) */
    static _drawTable(ctx, f) {
        const x = f.x + 6;
        const y = f.y + 6;
        const w = f.width - 12;
        const h = f.height - 10;
        const elev = 14;

        ctx.fillStyle = '#451a03';
        ctx.fillRect(x + 2, y + h - 8, 6, 8);
        ctx.fillRect(x + w - 8, y + h - 8, 6, 8);

        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, y + h - elev, w, 6);

        ctx.fillStyle = '#92400e';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y - elev, w, h);
        ctx.strokeRect(x, y - elev, w, h);

        ctx.beginPath();
        ctx.moveTo(x, y - elev + h * 0.5);
        ctx.lineTo(x + w, y - elev + h * 0.5);
        ctx.stroke();

        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(x + 12, y - elev + 8, 18, 12);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x + w - 18, y - elev + 14, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 2. TRONO DEL CAOS (Throne) */
    static _drawThrone(ctx, f) {
        const x = f.x + 8;
        const y = f.y + 6;
        const w = f.width - 16;
        const h = f.height - 10;

        ctx.fillStyle = '#44403c';
        ctx.fillRect(x, y - 10, w, h + 6);

        ctx.fillStyle = '#991b1b';
        ctx.fillRect(x + 5, y - 8, w - 10, h - 4);

        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.fillRect(x + 3, y - 32, w - 6, 26);
        ctx.strokeRect(x + 3, y - 32, w - 6, 26);

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y - 22, 4.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 3. COFRE DE TESORO (Chest) */
    static _drawChest(ctx, f) {
        const x = f.x + 9;
        const y = f.y + 10;
        const w = f.width - 18;
        const h = f.height - 16;

        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#271206';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y - 8, w, h);
        ctx.strokeRect(x, y - 8, w, h);

        if (f.opened) {
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(x + 3, y - 10, w - 6, h * 0.55);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(x + 5, y - 8, w - 10, 7);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(x, y - 20, w, 10);
            ctx.strokeStyle = '#d97706';
            ctx.strokeRect(x, y - 20, w, 10);
        } else {
            ctx.fillStyle = '#92400e';
            ctx.fillRect(x, y - 18, w, 12);
            ctx.strokeRect(x, y - 18, w, 12);

            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(x + 4, y - 18, 4, h + 10);
            ctx.fillRect(x + w - 8, y - 18, 4, h + 10);

            ctx.fillStyle = '#facc15';
            ctx.fillRect(x + w * 0.5 - 3, y - 10, 6, 7);
        }
    }

    /** 4. LIBRERÍA PROHIBIDA (Bookcase) */
    static _drawBookcase(ctx, f) {
        const x = f.x + 4;
        const y = f.y + 6;
        const w = f.width - 8;
        const h = f.height - 12;
        const wallH = 30;

        ctx.fillStyle = '#451a03';
        ctx.strokeStyle = '#1c0a00';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y - wallH, w, h + wallH);
        ctx.strokeRect(x, y - wallH, w, h + wallH);

        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, y - wallH, w, 10);

        const bookColors = BOOK_COLORS;
        for (let shelf = 0; shelf < 3; shelf++) {
            const sy = y - wallH + 14 + shelf * 14;
            ctx.fillStyle = '#290f02';
            ctx.fillRect(x + 4, sy, w - 8, 11);

            for (let bx = x + 6, idx = 0; bx < x + w - 10; bx += 6, idx++) {
                ctx.fillStyle = bookColors[(idx + shelf * 2) % bookColors.length];
                ctx.fillRect(bx, sy + 2, 4.5, 9);
            }
        }
    }

    /** 5. POTRO DE TORTURA (Rack) */
    static _drawTortureRack(ctx, f) {
        const x = f.x + 6;
        const y = f.y + 8;
        const w = f.width - 12;
        const h = f.height - 14;
        const elev = 12;

        ctx.fillStyle = '#57534e';
        ctx.fillRect(x, y - elev, w, h);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y - elev, w, h);

        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 6, y - elev + 3, 6, h - 6);
        ctx.fillRect(x + w - 12, y - elev + 3, 6, h - 6);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 12, y - elev + h * 0.35);
        ctx.lineTo(x + w - 12, y - elev + h * 0.35);
        ctx.moveTo(x + 12, y - elev + h * 0.65);
        ctx.lineTo(x + w - 12, y - elev + h * 0.65);
        ctx.stroke();
    }

    /** 6. CHIMENEA GÓTICA (Fireplace) */
    static _drawFireplace(ctx, f, elapsed = 0) {
        const x = f.x + 4;
        const y = f.y + 4;
        const w = f.width - 8;
        const h = f.height - 10;
        const topH = 28;

        ctx.fillStyle = '#57534e';
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y - topH, w, h + topH);
        ctx.strokeRect(x, y - topH, w, h + topH);

        ctx.fillStyle = '#78716c';
        ctx.fillRect(x - 2, y - topH, w + 4, 8);

        const hearthW = w * 0.56;
        const hearthX = x + (w - hearthW) * 0.5;
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(hearthX, y - 8, hearthW, h + 6);

        const flick = Math.sin(elapsed * 12) * 3;
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(hearthX + hearthW * 0.5, y + 10, 11 + flick * 0.4, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(hearthX + hearthW * 0.5, y + 11, 6 - flick * 0.2, Math.PI, Math.PI * 2);
        ctx.fill();
    }

    /** 7. MESA DEL ALQUIMISTA (Alchemist Bench) */
    static _drawAlchemistBench(ctx, f, elapsed = 0) {
        this._drawTable(ctx, f);
        const x = f.x + 6;
        const y = f.y - 8;
        const w = f.width - 12;

        const glow = 0.7 + Math.sin(elapsed * 8) * 0.3;
        ctx.fillStyle = `rgba(56, 189, 248, ${glow})`;
        ctx.beginPath();
        ctx.arc(x + 22, y + 10, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(192, 132, 252, ${glow})`;
        ctx.beginPath();
        ctx.arc(x + w - 24, y + 12, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 22, y + 5);
        ctx.quadraticCurveTo(x + w * 0.5, y - 4, x + w - 24, y + 7);
        ctx.stroke();
    }

    /** 8. SARCÓFAGO REAL (Sarcophagus) */
    static _drawSarcophagus(ctx, f) {
        const x = f.x + 6;
        const y = f.y + 6;
        const w = f.width - 12;
        const h = f.height - 10;
        const elev = 16;

        ctx.fillStyle = '#57534e';
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y - elev + 6, w, h);
        ctx.strokeRect(x, y - elev + 6, w, h);

        const lidOffset = f.opened ? 8 : 0;
        ctx.fillStyle = '#78716c';
        ctx.fillRect(x + lidOffset, y - elev, w, h - 2);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 4 + lidOffset, y - elev + 4, w - 8, h - 10);

        ctx.fillStyle = '#facc15';
        ctx.fillRect(x + 14 + lidOffset, y - elev + h * 0.5 - 3, w - 28, 4);
        ctx.fillRect(x + 24 + lidOffset, y - elev + 7, 5, h - 16);
    }

    /** 9. ARMERO IMPERIAL (Weapons Rack) */
    static _drawWeaponsRack(ctx, f) {
        const x = f.x + 6;
        const y = f.y + 6;
        const w = f.width - 12;
        const h = f.height - 12;
        const rackH = 26;

        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x + 4, y - rackH, 6, rackH + 8);
        ctx.fillRect(x + w - 10, y - rackH, 6, rackH + 8);
        ctx.fillRect(x + 4, y - rackH + 8, w - 8, 5);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.2;
        for (let wx = x + 14; wx < x + w - 12; wx += 11) {
            ctx.beginPath();
            ctx.moveTo(wx, y + 6);
            ctx.lineTo(wx, y - rackH - 4);
            ctx.stroke();

            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.moveTo(wx - 3, y - rackH);
            ctx.lineTo(wx + 3, y - rackH);
            ctx.lineTo(wx, y - rackH - 7);
            ctx.fill();
        }

        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y - 6, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // =========================================================================
    // OBJETOS DEL BOSQUE EXTERIOR (ZELDA OVERWORLD)
    // =========================================================================

    /** 10. ARBUSTO CORTABLE ESTILO ZELDA (Bush) */
    static _drawBush(ctx, f) {
        const cx = f.centerX;
        const cy = f.centerY;

        if (f.opened) {
            // Arbusto cortado: base de tallos y hojas sueltas en el suelo
            ctx.fillStyle = '#3f2e18';
            ctx.beginPath();
            ctx.arc(cx, cy + 4, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(cx - 8, cy + 2, 4, 0, Math.PI * 2);
            ctx.arc(cx + 9, cy + 5, 3.5, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Arbusto redondo frondoso con bayas estilo A Link to the Past
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(cx, cy, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 5, 11, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 4, 10, 0, Math.PI * 2);
        ctx.arc(cx, cy - 8, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 9, 5, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 7, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pequeñas flores/bayas rojas o amarillas
        ctx.fillStyle = f.potionReward ? '#f43f5e' : '#facc15';
        ctx.beginPath();
        ctx.arc(cx - 7, cy - 2, 2.2, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 6, 2.2, 0, Math.PI * 2);
        ctx.arc(cx + 1, cy + 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 11. HOGUERA CURATIVA DEL CAMPAMENTO REAL (Campfire) */
    static _drawCampfire(ctx, f, elapsed = 0) {
        const cx = f.centerX;
        const cy = f.centerY;
        const flick = Math.sin(elapsed * 14) * 2.5;

        // Halo de calor en el suelo del campamento
        // (gradiente unitario cacheado, escalado con la matriz en vez de recrearlo cada fotograma)
        if (!this._campfireHalo) {
            const g = ctx.createRadialGradient(0, 0, 4 / 56, 0, 0, 1);
            g.addColorStop(0, 'rgba(251, 146, 60, 0.48)');
            g.addColorStop(0.6, 'rgba(234, 88, 12, 0.16)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this._campfireHalo = g;
        }
        const haloR = 56 + flick * 2;
        ctx.translate(cx, cy - 4);
        ctx.scale(haloR, haloR);
        ctx.fillStyle = this._campfireHalo;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.scale(1 / haloR, 1 / haloR);
        ctx.translate(-cx, -(cy - 4));

        // Anillo de piedras
        ctx.fillStyle = '#78716c';
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 11, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Troncos cruzados
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy + 6);
        ctx.lineTo(cx + 11, cy - 4);
        ctx.moveTo(cx + 11, cy + 6);
        ctx.lineTo(cx - 11, cy - 4);
        ctx.stroke();

        // Llamas vivas
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(cx, cy - 5, 11 + flick * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 6.5 - flick * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 3.2, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 12. PUESTO DE LA FORJA REAL / ARMERÍA DEL BOSQUE (Anvil Stall) */
    static _drawAnvilStall(ctx, f) {
        const x = f.x + 4;
        const y = f.y + 4;
        const w = f.width - 8;
        const h = f.height - 8;

        // Plataforma de piedra y madera
        ctx.fillStyle = '#57534e';
        ctx.fillRect(x, y, w, h);

        // Postes de madera
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x + 3, y - 28, 5, 34);
        ctx.fillRect(x + w - 8, y - 28, 5, 34);

        // Toldo real a franjas rojas y doradas
        const stripes = 6;
        const sw = w / stripes;
        for (let i = 0; i < stripes; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#991b1b' : '#d97706';
            ctx.fillRect(x + i * sw, y - 32, sw + 0.5, 14);
        }
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y - 32, w, 14);

        // Yunque de hierro forjado en el centro
        const ax = f.centerX;
        const ay = f.centerY + 2;
        ctx.fillStyle = '#334155';
        ctx.fillRect(ax - 12, ay - 6, 24, 9);
        ctx.fillRect(ax - 7, ay + 2, 14, 6);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(ax - 14, ay - 8, 28, 4);
    }

    /** 13. CARTEL INDICADOR DE MADERA (Signpost) */
    static _drawSignpost(ctx, f) {
        const cx = f.centerX;
        const cy = f.centerY + 6;

        // Poste vertical
        ctx.fillStyle = '#451a03';
        ctx.fillRect(cx - 3, cy - 26, 6, 28);

        // Tablón de madera con flecha
        ctx.fillStyle = '#92400e';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.fillRect(cx - 17, cy - 28, 34, 16);
        ctx.strokeRect(cx - 17, cy - 28, 34, 16);

        // Líneas de texto simuladas
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy - 22);
        ctx.lineTo(cx + 11, cy - 22);
        ctx.moveTo(cx - 8, cy - 17);
        ctx.lineTo(cx + 8, cy - 17);
        ctx.stroke();
    }

    /** 14. PEÑASCO MUSGOSO DEL BOSQUE (Boulder Field) */
    static _drawBoulderField(ctx, f) {
        const cx = f.centerX;
        const cy = f.centerY;

        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 8, 10, 0, Math.PI * 2);
        ctx.fill();

        // Musgo verde en la cima
        ctx.fillStyle = '#4d7c0f';
        ctx.beginPath();
        ctx.arc(cx + 3, cy - 10, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 15. TOCÓN DE ROBLE MILENARIO (Stump) */
    static _drawStump(ctx, f) {
        const cx = f.centerX;
        const cy = f.centerY;

        ctx.fillStyle = '#451a03';
        ctx.fillRect(cx - 13, cy - 8, 26, 16);

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 8, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 8, 8, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    /** 16. MANANTIAL / POZO ÉLFICO (Well) */
    static _drawWell(ctx, f, elapsed = 0) {
        const cx = f.centerX;
        const cy = f.centerY;

        // Brocal circular de piedra blanca
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 17, 0, Math.PI * 2);
        ctx.fill();

        // Agua cristalina animada en el interior
        const shimmer = 0.75 + Math.sin(elapsed * 5) * 0.2;
        ctx.fillStyle = `rgba(56, 189, 248, ${shimmer})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 17. JAULA RÚNICA DE PRISIONERO (Hero Cage — Rescate de Compañeros) */
    static _drawHeroCage(ctx, f, elapsed = 0) {
        const x = f.x + 6;
        const y = f.y + 6;
        const w = f.width - 12;
        const h = f.height - 10;
        const cx = f.centerX;
        const cy = f.centerY;
        const cageH = 44;

        // Zócalo de piedra oscura con runas
        ctx.fillStyle = '#27272a';
        ctx.strokeStyle = f.opened ? '#4ade80' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        if (!f.opened) {
            // Héroe cautivo en el interior de la jaula
            const bob = Math.sin(elapsed * 4) * 1.5;
            const hc = HERO_CAGE_COLORS[f.prisonerHeroId] || HERO_CAGE_COLORS.barbarian;

            // Peana y silueta del héroe prisionero
            ctx.fillStyle = hc.cape;
            ctx.beginPath();
            ctx.arc(cx, cy - 6, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 8, cy - 26 + bob, 16, 18);
            ctx.fillStyle = hc.skin;
            ctx.beginPath();
            ctx.arc(cx, cy - 32 + bob, 6.5, 0, Math.PI * 2);
            ctx.fill();

            // Barras de hierro forjado y campo de fuerza rúnico
            const pulse = 0.25 + Math.sin(elapsed * 6) * 0.12;
            ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
            ctx.fillRect(x + 2, y - cageH, w - 4, cageH + h - 4);

            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.8;
            for (let bx = x + 6; bx <= x + w - 6; bx += 11) {
                ctx.beginPath();
                ctx.moveTo(bx, y + h - 2);
                ctx.lineTo(bx, y - cageH);
                ctx.stroke();
            }

            // Techo de hierro de la jaula
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.5;
            ctx.fillRect(x - 2, y - cageH - 6, w + 4, 8);
            ctx.strokeRect(x - 2, y - cageH - 6, w + 4, 8);

            // Etiqueta flotante de rescate
            ctx.font = 'bold 10.5px "Cinzel", Georgia, serif';
            const tag = `🔒 CAUTIVO: ${(f.prisonerName || 'HÉROE').toUpperCase()} [E]`;
            const tw = ctx.measureText(tag).width + 14;
            ctx.fillStyle = 'rgba(15, 10, 20, 0.92)';
            ctx.fillRect(cx - tw * 0.5, y - cageH - 28, tw, 18);
            ctx.strokeStyle = '#facc15';
            ctx.strokeRect(cx - tw * 0.5, y - cageH - 28, tw, 18);
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tag, cx, y - cageH - 19);
        } else {
            // Jaula abierta con barrotes rotos
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + h - 4);
            ctx.lineTo(x + 4, y - 16);
            ctx.moveTo(x + w - 8, y + h - 4);
            ctx.lineTo(x + w - 4, y - 14);
            ctx.stroke();
        }
    }

    /** 18. TABLÓN REAL DE MISIONES SECUNDARIAS (Quest Board) */
    static _drawQuestBoard(ctx, f, elapsed = 0) {
        const x = f.x + 6;
        const y = f.y + 8;
        const w = f.width - 12;
        const cx = f.centerX;
        const boardH = 38;

        // Postes de roble
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x + 4, y - boardH, 7, boardH + 22);
        ctx.fillRect(x + w - 11, y - boardH, 7, boardH + 22);

        // Panel de madera con tejadillo
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.8;
        ctx.fillRect(x, y - boardH + 4, w, 28);
        ctx.strokeRect(x, y - boardH + 4, w, 28);

        ctx.fillStyle = '#991b1b';
        ctx.fillRect(x - 3, y - boardH - 2, w + 6, 8);

        // Pergaminos clavados en el tablón
        const pergColors = PERGAMINO_COLORS;
        for (let i = 0; i < 4; i++) {
            const px = x + 8 + i * 16;
            const py = y - boardH + 10 + (i % 2) * 3;
            ctx.fillStyle = pergColors[i];
            ctx.fillRect(px, py, 11, 15);
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(px + 5.5, py + 2.5, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Indicador flotante
        const bob = Math.sin(elapsed * 4.5) * 2;
        ctx.font = 'bold 10px "Cinzel", Georgia, serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText('📜 MISIONES [J]', cx, y - boardH - 8 + bob);
    }

    /** 19. NODO DE HIERRO METEÓRICO ESTELAR (Meteor Node) */
    static _drawMeteorNode(ctx, f, elapsed = 0) {
        const cx = f.centerX;
        const cy = f.centerY;

        // Cráter de roca fundida
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 18, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        if (f.opened) {
            ctx.fillStyle = '#44403c';
            ctx.beginPath();
            ctx.arc(cx - 4, cy, 5, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Cristal de hierro estelar azul/dorado brillante
        const glow = 0.65 + Math.sin(elapsed * 6) * 0.3;
        ctx.fillStyle = `rgba(56, 189, 248, ${glow * 0.35})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy + 2);
        ctx.lineTo(cx - 4, cy - 18);
        ctx.lineTo(cx + 5, cy - 14);
        ctx.lineTo(cx + 11, cy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 8, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 20. ALTAR CORRUPTO DE ZARGON (Corrupt Altar) */
    static _drawCorruptAltar(ctx, f, elapsed = 0) {
        const cx = f.centerX;
        const cy = f.centerY;

        // Pedestal escalonado
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(cx - 16, cy - 4, 32, 14);

        const isPurified = f.opened;
        const mainColor = isPurified ? '#38bdf8' : '#a855f7';
        const coreColor = isPurified ? '#fef08a' : '#ef4444';

        // Obelisco rúnico
        ctx.fillStyle = isPurified ? '#475569' : '#2e1065';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 2);
        ctx.lineTo(cx - 6, cy - 32);
        ctx.lineTo(cx, cy - 40);
        ctx.lineTo(cx + 6, cy - 32);
        ctx.lineTo(cx + 10, cy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Orbe flotante superior
        const bob = Math.sin(elapsed * 5) * 2.5;
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(cx, cy - 22 + bob, 4.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 21. FLOR DE LUNA DE PLATA (Moonflower) */
    static _drawMoonflower(ctx, f, elapsed = 0) {
        const cx = f.centerX;
        const cy = f.centerY;

        if (f.opened) {
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(cx, cy + 2, 5, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const pulse = 0.55 + Math.sin(elapsed * 5) * 0.3;
        ctx.fillStyle = `rgba(165, 243, 252, ${pulse * 0.35})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 16, 0, Math.PI * 2);
        ctx.fill();

        // Pétalos plateados/celestes
        ctx.fillStyle = '#e0f2fe';
        for (let i = 0; i < 5; i++) {
            const ang = (i / 5) * Math.PI * 2 + elapsed * 0.5;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * 5.5, cy - 4 + Math.sin(ang) * 4.5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 3.2, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 22. PIEDRA DE SENDA / TELETRANSPORTE REAL (Waystone) */
    static _drawWaystone(ctx, f, elapsed = 0) {
        const cx = f.centerX;
        const cy = f.centerY;

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 17, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy + 2);
        ctx.lineTo(cx - 8, cy - 28);
        ctx.lineTo(cx, cy - 36);
        ctx.lineTo(cx + 8, cy - 28);
        ctx.lineTo(cx + 11, cy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const glow = 0.6 + Math.sin(elapsed * 5) * 0.35;
        ctx.fillStyle = `rgba(56, 189, 248, ${glow})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 16, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

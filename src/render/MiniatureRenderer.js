/**
 * @fileoverview Personajes en pixel-art de 16 bits: héroes, compañeros IA, monstruos y NPCs de misión.
 * Hojas generadas con tools/sprites/gen_heroes.py, gen_monsters.py, gen_npcs.py y gen_char_fx.py.
 * - 4 direcciones (abajo, arriba, lado; izquierda = espejo) elegidas por el ángulo de apuntado / movimiento.
 * - Armas prerrotadas en 16 ángulos; el tajo se dibuja con píxeles alineados a la rejilla artística.
 * - El destello de daño usa la silueta blanca cacheada de Sprites.flash().
 * Capa 4: depende solo de Sprites.js.
 */

import { Sprites, PX, snap } from './Sprites.js';

const HERO_SHEET = {
    barbarian: './assets/sprites/hero_barbarian.png',
    dwarf: './assets/sprites/hero_dwarf.png',
    elf: './assets/sprites/hero_elf.png',
    wizard: './assets/sprites/hero_wizard.png'
};
const HERO_W = 16;
const HERO_H = 24;

const FX_SHEET = './assets/sprites/char_fx.png';
const NPC_SHEET = './assets/sprites/npc.png';

const MON = {
    goblin: { src: './assets/sprites/mon_goblin.png', w: 16, h: 16 },
    orc: { src: './assets/sprites/mon_orc.png', w: 16, h: 24 },
    skeleton: { src: './assets/sprites/mon_skeleton.png', w: 16, h: 24 },
    fimir: { src: './assets/sprites/mon_fimir.png', w: 20, h: 24 },
    gargoyle: { src: './assets/sprites/mon_gargoyle.png', w: 32, h: 32 }
};

Sprites.preload([...Object.values(HERO_SHEET), FX_SHEET, NPC_SHEET, ...Object.values(MON).map((m) => m.src)]);

const DIR_ROW = { down: 0, up: 1, side: 2 };

// char_fx.png: armas en celdas de 48x48 (pivote en el centro), 16 ángulos por fila
const WEAPON_CELL = 48;
const WEAPON_ANGLES = 16;
const WEAPON_ROW = { barbarian: 0, dwarf: 1, elf: 2, wizard: 3, astral_blade: 4, dragonslayer_halberd: 5 };
const SMALL_Y = 288; // fila de iconos 16x16
const SMALL = { shield_barbarian: 0, shield_dwarf: 1, shield_elf: 2, shield_wizard: 3, star: 4, spark: 5, q_available: 6, q_active: 7, q_ready: 8, q_done: 9 };

const NPC_ROW = { npc_varek: 0, npc_durgan: 1, npc_lyra: 2, npc_elara: 3, npc_balthazar: 4, npc_eldon: 5 };
const NPC_BY_APPEARANCE = { barbarian: 0, dwarf: 1, wizard: 2, elf: 3 };

const TAU = Math.PI * 2;
const FONT = '"Press Start 2P", monospace';
const INK = '#201818';

// Estado de render por monstruo (dirección según movimiento), sin tocar el objeto de juego
const monsterView = new WeakMap();

/* ------------------------------------------------------------------ utilidades */

function facingFromAngle(angle) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    if (Math.abs(dx) > Math.abs(dy) * 1.05) return { dir: 'side', flip: dx < 0 };
    return { dir: dy > 0 ? 'down' : 'up', flip: false };
}

function walkFrame(walkPhase, frames = 4) {
    const i = Math.floor(walkPhase / (Math.PI / 2));
    return ((i % frames) + frames) % frames;
}

/** Rectángulo alineado a la rejilla de píxel artístico (x, y, w, h en píxeles artísticos desde un origen de mundo). */
function px(ctx, wx, wy, w = 1, h = 1) {
    ctx.fillRect(snap(wx), snap(wy), w * PX, h * PX);
}

/** Elipse rellena en píxeles artísticos (sombras, auras). */
function pixelEllipse(ctx, cx, cy, rx, ry) {
    const x0 = snap(cx);
    const y0 = snap(cy);
    for (let j = -ry; j <= ry; j++) {
        const t = j / (ry + 0.5);
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
        if (half <= 0) continue;
        ctx.fillRect(x0 - half * PX, y0 + j * PX, half * 2 * PX, PX);
    }
}

function drawShadow(ctx, x, y, z, rx = 6, ry = 2) {
    const k = Math.max(0.45, 1 - z / 140);
    ctx.fillStyle = 'rgba(16, 16, 32, 0.38)';
    pixelEllipse(ctx, x, y, Math.max(2, Math.round(rx * k)), Math.max(1, Math.round(ry * k)));
}

/** Texto pixel con contorno de 1 píxel de fuente. */
function pixelText(ctx, text, x, y, color = '#f8f0d8', size = 6) {
    if (!text) return;
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const o = size / 8;
    const tx = Math.round(x);
    const ty = Math.round(y);
    ctx.fillStyle = INK;
    ctx.fillText(text, tx - o, ty);
    ctx.fillText(text, tx + o, ty);
    ctx.fillText(text, tx, ty - o);
    ctx.fillText(text, tx, ty + o);
    ctx.fillStyle = color;
    ctx.fillText(text, tx, ty);
}

/** Barra de vida pixelada (ancho en píxeles artísticos). */
function pixelBar(ctx, cx, y, wArt, ratio, fill, back = '#401818') {
    const w = wArt * PX;
    const x = snap(cx - w / 2);
    const yy = snap(y);
    ctx.fillStyle = INK;
    ctx.fillRect(x - PX, yy - PX, w + PX * 2, PX * 4);
    ctx.fillStyle = back;
    ctx.fillRect(x, yy, w, PX * 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, yy, Math.round(wArt * Math.max(0, Math.min(1, ratio))) * PX, PX * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, yy, Math.round(wArt * Math.max(0, Math.min(1, ratio))) * PX, PX);
}

function drawSmall(ctx, key, cx, cy, alpha = 1) {
    const img = Sprites.get(FX_SHEET);
    if (!img) return;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.drawImage(img, SMALL[key] * 16, SMALL_Y, 16, 16, snap(cx - 8 * PX), snap(cy - 8 * PX), 16 * PX, 16 * PX);
    ctx.globalAlpha = prev;
}

function drawWeapon(ctx, row, angle, hx, hy) {
    const img = Sprites.get(FX_SHEET);
    if (!img) return;
    const a = ((angle % TAU) + TAU) % TAU;
    const idx = Math.round(a / (TAU / WEAPON_ANGLES)) % WEAPON_ANGLES;
    const half = (WEAPON_CELL / 2) * PX;
    ctx.drawImage(
        img,
        idx * WEAPON_CELL, row * WEAPON_CELL, WEAPON_CELL, WEAPON_CELL,
        snap(hx) - half, snap(hy) - half, WEAPON_CELL * PX, WEAPON_CELL * PX
    );
}

/** Arco de tajo en píxeles: dos bandas (núcleo claro + borde de color) que se desvanecen por la cola. */
function drawPixelSlash(ctx, cx, cy, from, to, radius, color) {
    const span = to - from;
    if (Math.abs(span) < 0.01) return;
    const steps = Math.max(4, Math.ceil((Math.abs(span) * radius) / PX));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = from + span * t;
        const fade = t; // la cabeza del arco (t=1) es la más intensa
        if (fade < 0.15) continue;
        const ca = Math.cos(a);
        const sa = Math.sin(a) * 0.8; // ligera perspectiva 3/4
        ctx.globalAlpha = 0.35 + fade * 0.65;
        ctx.fillStyle = color;
        px(ctx, cx + ca * (radius + PX), cy + sa * (radius + PX));
        ctx.fillStyle = '#f8f8f8';
        px(ctx, cx + ca * radius, cy + sa * radius);
        if (fade > 0.6) {
            ctx.fillStyle = color;
            px(ctx, cx + ca * (radius - PX), cy + sa * (radius - PX));
        }
    }
    ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ renderer */

export class MiniatureRenderer {
    /**
     * Héroe del jugador o compañero IA.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} player
     * @param {number} elapsed
     */
    static drawPlayer(ctx, player, elapsed = 0) {
        if (!player || player.dead) return;
        const { x, y, z = 0, heroId, walkPhase = 0, isMoving = false, aimAngle = 0, attackAnimTimer = 0, hurtFlashTimer = 0 } = player;
        const src = HERO_SHEET[heroId] || HERO_SHEET.barbarian;
        const colors = player.colors || {};

        // 1. Sombra en el suelo (no sube al saltar)
        drawShadow(ctx, x, y, z, 6, 2);

        // Marca discreta de compañero IA: rombo de color bajo los pies
        if (player.isAI) {
            ctx.fillStyle = '#58d8f8';
            px(ctx, x - PX / 2, y + PX * 2);
        }

        // 2. Buffs: chispas que suben alrededor del héroe
        if (player.strengthBuffTimer > 0 || player.speedBuffTimer > 0) {
            ctx.fillStyle = player.strengthBuffTimer > 0 ? '#f8a830' : '#88b8f8';
            for (let i = 0; i < 4; i++) {
                const t = (elapsed * 0.9 + i * 0.25) % 1;
                const sx = x + Math.cos(i * 1.7 + elapsed * 2) * 7 * PX;
                const sy = y - z - t * 22 * PX;
                if (Math.floor(elapsed * 12 + i) % 3 !== 0) px(ctx, sx, sy);
            }
        }

        // 3. Orientación, fotograma y posición
        const { dir, flip } = facingFromAngle(aimAngle);
        let frame = 0;
        if (attackAnimTimer > 0) frame = 5;
        else if (isMoving) frame = 1 + walkFrame(walkPhase);
        const by = y - z;

        const swingDur = player.attackAnimDuration || 0.22;
        const swing = attackAnimTimer > 0 ? Math.min(1, Math.max(0, 1 - attackAnimTimer / swingDur)) : 0;

        // Ángulo del arma: en reposo cuelga junto al cuerpo; al atacar barre el arco de apuntado
        const sideSign = flip ? -1 : 1;
        let weaponAngle;
        let hand;
        if (dir === 'down') {
            hand = { x: x + 5 * PX, y: by - 8 * PX };
            weaponAngle = -Math.PI * 0.5 + 0.3; // arma en alto junto al cuerpo
        } else if (dir === 'up') {
            hand = { x: x - 5 * PX, y: by - 9 * PX };
            weaponAngle = -Math.PI * 0.5 - 0.3;
        } else {
            hand = { x: x + sideSign * 3 * PX, y: by - 8 * PX };
            weaponAngle = -Math.PI * 0.5 + sideSign * 0.55;
        }
        if (attackAnimTimer > 0) {
            const arc = 1.25;
            weaponAngle = aimAngle - arc + swing * arc * 2;
            hand = { x: x + Math.cos(aimAngle) * 3 * PX, y: by - 9 * PX + Math.sin(aimAngle) * 2 * PX };
        }
        const wId = typeof player.equippedWeapon === 'object' ? player.equippedWeapon?.id : player.equippedWeapon;
        const weaponRow = WEAPON_ROW[wId] ?? WEAPON_ROW[heroId] ?? 0;
        const weaponBehind = attackAnimTimer > 0 ? Math.sin(weaponAngle) < -0.35 : dir === 'up';

        // Escudo: delante al bloquear; si no, en el brazo libre
        const shieldKey = `shield_${heroId in WEAPON_ROW ? heroId : 'barbarian'}`;
        let shield = null;
        if (player.isBlocking) {
            shield = { x: x + Math.cos(aimAngle) * 6 * PX, y: by - 9 * PX + Math.sin(aimAngle) * 4 * PX, behind: Math.sin(aimAngle) < -0.4 };
        } else if (heroId !== 'wizard') {
            if (dir === 'down') shield = { x: x - 6 * PX, y: by - 8 * PX, behind: false };
            else if (dir === 'up') shield = { x: x + 1 * PX, y: by - 7 * PX, behind: false };
            else shield = { x: x - sideSign * 2 * PX, y: by - 9 * PX, behind: true };
        }

        if (weaponBehind) drawWeapon(ctx, weaponRow, weaponAngle, hand.x, hand.y);
        if (shield && shield.behind) drawSmall(ctx, shieldKey, shield.x, shield.y);

        // 4. Cuerpo (parpadeo blanco al recibir daño)
        const white = hurtFlashTimer > 0 && Math.floor(elapsed * 24) % 2 === 0;
        Sprites.drawFrame(ctx, src, frame * HERO_W, DIR_ROW[dir] * HERO_H, HERO_W, HERO_H, x, by + PX, { flipX: flip, white });

        if (!weaponBehind) drawWeapon(ctx, weaponRow, weaponAngle, hand.x, hand.y);
        if (shield && !shield.behind) drawSmall(ctx, shieldKey, shield.x, shield.y);

        // 5. Tajo o barrera de bloqueo
        if (player.isBlocking) {
            this._drawBlockBarrier(ctx, x, by - 9 * PX, aimAngle, elapsed, colors.shieldGlow || '#f8e070');
        } else if (attackAnimTimer > 0) {
            const range = (player.attackRange || 64) * 0.78;
            const arc = 1.25;
            const slashColor = (typeof player.equippedWeapon === 'object' && player.equippedWeapon?.slashColor) || colors.slashColor || '#88b8f8';
            drawPixelSlash(ctx, x, by - 6 * PX, aimAngle - arc, aimAngle - arc + swing * arc * 2, range, slashColor);
        }

        // 6. Aturdimiento: estrellas girando sobre la cabeza
        if (player.guardBreakTimer > 0) {
            this._drawStunStars(ctx, x, by - 25 * PX, elapsed);
        }

        // 7. Compañeros IA: barra de vida y nombre corto
        if (player.isAI) {
            const ratio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
            const barY = by - 27 * PX;
            pixelBar(ctx, x, barY, 12, ratio, ratio > 0.35 ? '#58c848' : '#e05040');
            pixelText(ctx, player.name, x, barY - PX * 1.5, '#f8f0d8', 6);
        }
    }

    /**
     * Monstruo (goblin, orco, esqueleto, fimir, gárgola jefe).
     */
    static drawMonster(ctx, monster, elapsed = 0) {
        if (!monster || monster.dead) return;
        const { x, y, z = 0, type, walkPhase = 0, state, hurtFlashTimer = 0, isBoss, isSubBoss } = monster;
        const spec = MON[type] || MON.goblin;
        const isElite = isBoss || isSubBoss;

        // Dirección según el movimiento real (o el ángulo de ataque al golpear)
        let view = monsterView.get(monster);
        if (!view) {
            view = { lx: x, ly: y, angle: Math.PI / 2, moving: false };
            monsterView.set(monster, view);
        }
        const mdx = x - view.lx;
        const mdy = y - view.ly;
        view.moving = mdx * mdx + mdy * mdy > 0.04;
        if (state === 'TELEGRAPH' || state === 'STRIKE') view.angle = monster.attackAngle || 0;
        else if (view.moving) view.angle = Math.atan2(mdy, mdx);
        view.lx = x;
        view.ly = y;

        // 1. Aviso de ataque: arco de píxeles rojos parpadeante en el suelo
        if (state === 'TELEGRAPH') {
            this._drawTelegraph(ctx, monster, elapsed);
        }

        // 2. Sombra
        drawShadow(ctx, x, y, z, Math.round(spec.w * 0.4), spec.w >= 32 ? 3 : 2);

        // 3. Fotograma
        const { dir, flip } = facingFromAngle(view.angle);
        let frame = 0;
        if (state === 'TELEGRAPH') frame = 3;
        else if (view.moving) frame = 1 + walkFrame(walkPhase * 2, 2);
        let rowOffset = 0;
        if (isSubBoss && type !== 'gargoyle') rowOffset = 3; // variante dorada de jefe secundario
        if (type === 'gargoyle' && (monster.bossPhase || 1) >= 2) rowOffset = 3; // gárgola enfurecida

        const shake = state === 'TELEGRAPH' ? (Math.floor(elapsed * 30) % 2 ? PX : -PX) : 0;
        const white = hurtFlashTimer > 0 && Math.floor(elapsed * 24) % 2 === 0;
        const by = y - z + PX;
        Sprites.drawFrame(ctx, spec.src, frame * spec.w, (DIR_ROW[dir] + rowOffset) * spec.h, spec.w, spec.h, x + shake, by, { flipX: flip, white });

        // 4. Barra de vida (solo si está herido o es élite) y nombre del jefe
        if (monster.hp < monster.maxHp || isElite) {
            const top = by - spec.h * PX - PX * 3;
            const ratio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 0;
            pixelBar(ctx, x, top, isElite ? 20 : 10, ratio, isElite ? '#f8c830' : '#e05040');
            if (isElite && monster.name) {
                pixelText(ctx, monster.name, x, top - PX * 1.5, isBoss ? '#f87858' : '#f8f088', 6);
            }
        }
    }

    /**
     * NPC de misión secundaria con globo de estado sobre la cabeza.
     */
    static drawNPC(ctx, npc, questInfo = null, elapsed = 0) {
        if (!npc) return;
        const { x, y, name } = npc;
        const row = NPC_ROW[npc.id] ?? NPC_BY_APPEARANCE[npc.appearance] ?? 0;

        drawShadow(ctx, x, y, 0, 6, 2);
        const breath = Math.floor(elapsed * 1.6 + x * 0.013) % 2;
        Sprites.drawFrame(ctx, NPC_SHEET, breath * HERO_W, row * HERO_H, HERO_W, HERO_H, x, y + PX);

        // Globo de misión: "!" disponible, "..." en curso, check verde para cobrar, gris completada
        const status = questInfo?.status || 'available';
        const key = status === 'ready_to_claim' ? 'q_ready'
            : status === 'active' ? 'q_active'
                : status === 'completed' ? 'q_done' : 'q_available';
        const bounce = status === 'completed' ? 0 : (Math.floor(elapsed * 3) % 2) * PX;
        const headY = y - 24 * PX;
        if (status !== 'completed' || Math.floor(elapsed) % 3 === 0) {
            drawSmall(ctx, key, x, headY - 9 * PX - bounce, status === 'completed' ? 0.7 : 1);
        }
        if (status === 'active' && questInfo) {
            pixelText(ctx, `${questInfo.progress}/${questInfo.targetCount}`, x + 10 * PX, headY - 6 * PX, '#f8f0d8', 6);
        }
        pixelText(ctx, name, x, headY - PX, '#f8e070', 6);
    }

    /* ---------------------------------------------------------------- efectos */

    static _drawTelegraph(ctx, monster, elapsed) {
        const progress = 1 - Math.max(0, monster.stateTimer / (monster.telegraphTime || 1));
        const blink = Math.floor(elapsed * (8 + progress * 14)) % 2 === 0;
        if (!blink && progress < 0.85) return;
        const r = monster.attackRange || 48;
        const a0 = monster.attackAngle - Math.PI * 0.32;
        const a1 = monster.attackAngle + Math.PI * 0.32;
        ctx.fillStyle = progress > 0.7 ? '#f87858' : '#d83828';
        // borde exterior punteado
        const steps = Math.ceil(((a1 - a0) * r) / (PX * 2));
        for (let i = 0; i <= steps; i++) {
            const a = a0 + ((a1 - a0) * i) / steps;
            px(ctx, monster.x + Math.cos(a) * r, monster.y + Math.sin(a) * r * 0.8);
        }
        // radios laterales
        const rs = Math.ceil(r / (PX * 2));
        for (let i = 1; i < rs; i++) {
            const d = (r * i) / rs;
            px(ctx, monster.x + Math.cos(a0) * d, monster.y + Math.sin(a0) * d * 0.8);
            px(ctx, monster.x + Math.cos(a1) * d, monster.y + Math.sin(a1) * d * 0.8);
        }
        // relleno tramado que crece con el progreso
        ctx.globalAlpha = 0.45;
        const fillR = r * progress;
        for (let d = PX * 3; d < fillR; d += PX * 3) {
            const n = Math.ceil(((a1 - a0) * d) / (PX * 3));
            for (let i = 0; i <= n; i++) {
                if ((i + Math.round(d / PX)) % 2) continue;
                const a = a0 + ((a1 - a0) * i) / n;
                px(ctx, monster.x + Math.cos(a) * d, monster.y + Math.sin(a) * d * 0.8);
            }
        }
        ctx.globalAlpha = 1;
    }

    static _drawBlockBarrier(ctx, x, y, aimAngle, elapsed, color) {
        if (Math.floor(elapsed * 10) % 4 === 0) return; // parpadeo suave
        const r = 12 * PX;
        ctx.fillStyle = color;
        for (let i = -4; i <= 4; i++) {
            const a = aimAngle + i * 0.2;
            px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
            if (Math.abs(i) < 3) px(ctx, x + Math.cos(a) * (r + PX), y + Math.sin(a) * (r + PX) * 0.8);
        }
    }

    static _drawStunStars(ctx, x, y, elapsed) {
        for (let i = 0; i < 3; i++) {
            const a = elapsed * 5 + (i * TAU) / 3;
            drawSmall(ctx, 'star', x + Math.cos(a) * 6 * PX, y + Math.sin(a) * 2 * PX);
        }
    }
}

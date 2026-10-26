/**
 * @fileoverview Ayudantes para dibujar fotogramas de las hojas de escenario (envAtlas.js).
 * Capa 3: depende de Sprites.js y envAtlas.js.
 */

import { ENV_ATLAS } from './envAtlas.js';
import { Sprites, PX, snap } from './Sprites.js';

Sprites.preload(Object.values(ENV_ATLAS).map((s) => s.src));

/** Devuelve [sx, sy, sw, sh] del fotograma o null. */
export function envFrame(sheet, name) {
    return ENV_ATLAS[sheet]?.frames[name] || null;
}

/** Dibuja un fotograma con su esquina superior-izquierda en (x, y) de mundo. */
export function envTile(ctx, sheet, name, x, y) {
    const f = ENV_ATLAS[sheet]?.frames[name];
    if (!f) return false;
    return Sprites.drawTile(ctx, ENV_ATLAS[sheet].src, f[0], f[1], f[2], f[3], x, y);
}

/** Dibuja un fotograma anclado por su centro-inferior en (x, y) de mundo. */
export function envSprite(ctx, sheet, name, x, y, opt) {
    const f = ENV_ATLAS[sheet]?.frames[name];
    if (!f) return false;
    return Sprites.drawFrame(ctx, ENV_ATLAS[sheet].src, f[0], f[1], f[2], f[3], x, y, opt);
}

/** Rectángulo alineado a la rejilla artística (x, y, w, h en píxeles artísticos relativos a ox, oy). */
export function artRect(ctx, ox, oy, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * PX, oy + y * PX, w * PX, h * PX);
}

/** Quita emojis y selectores de variación de una cadena para el texto pixel-art. */
export function stripEmoji(text) {
    return String(text ?? '')
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export const PIXEL_FONT = '"Press Start 2P", "Pixelify Sans", monospace';

/**
 * Etiqueta pixel-art en coordenadas de mundo: caja azul noche con borde claro y texto blanco.
 * @returns {number} ancho de la caja
 */
export function pixelLabel(ctx, text, cx, cy, opt = {}) {
    const size = opt.size || 6;
    const pad = opt.pad ?? 3;
    const bg = opt.bg || '#181838';
    const border = opt.border || '#f8f8f8';
    const color = opt.color || '#f8f8f8';
    const clean = stripEmoji(text);
    ctx.save();
    ctx.font = `${size}px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(clean).width);
    const w = snap(tw + pad * 2 + 6);
    const h = snap(size + pad * 2 + 3);
    const x = snap(cx - w / 2);
    const y = snap(cy - h / 2);
    ctx.fillStyle = '#101010';
    ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.fillStyle = color;
    ctx.fillText(clean, x + w / 2, y + h / 2 + 0.75);
    ctx.restore();
    return w;
}

/** Texto pixel-art con contorno oscuro de 1 px (sin caja). */
export function pixelText(ctx, text, x, y, opt = {}) {
    const size = opt.size || 6;
    const clean = stripEmoji(text);
    ctx.save();
    ctx.font = `${size}px ${PIXEL_FONT}`;
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = 'middle';
    const sx = snap(x);
    const sy = snap(y);
    const o = opt.outlineWidth || 1.5;
    ctx.fillStyle = opt.outline || '#201818';
    ctx.fillText(clean, sx - o, sy);
    ctx.fillText(clean, sx + o, sy);
    ctx.fillText(clean, sx, sy - o);
    ctx.fillText(clean, sx, sy + o);
    ctx.fillStyle = opt.color || '#f8f8f8';
    ctx.fillText(clean, sx, sy);
    ctx.restore();
}

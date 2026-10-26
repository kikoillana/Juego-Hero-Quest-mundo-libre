/**
 * @fileoverview Cargador y dibujante de sprites pixel-art (estilo 16 bits).
 * Todo el arte del juego está dibujado a 16 px por celda y se escala x3 (TILE = 48 = 16 * PX).
 * - Las imágenes se cargan de forma perezosa y se cachean; `get()` devuelve null hasta que están listas.
 * - `draw*()` ajusta las coordenadas a la rejilla de píxel artístico para que el arte no "tiemble".
 * - `flash()` genera (y cachea) una silueta blanca del sprite para el parpadeo de daño.
 * Capa 0: sin dependencias.
 */

export const PX = 3; // píxeles de mundo por píxel artístico

const _cache = new Map(); // src -> { img, ready }
const _flashCache = new Map(); // src -> canvas blanco

let _loader = (src, onReady) => {
    if (typeof Image === 'undefined') return null;
    const img = new Image();
    img.onload = () => onReady(img);
    img.onerror = () => console.warn('[Sprites] No se pudo cargar', src);
    img.src = src;
    return img;
};

/** Ajusta un valor de mundo a la rejilla de píxel artístico. */
export const snap = (v) => Math.round(v / PX) * PX;

export const Sprites = {
    /** Permite inyectar un cargador alternativo (p. ej. en pruebas con Node). */
    setLoader(fn) {
        _loader = fn;
    },

    /** Precarga una lista de rutas. */
    preload(list) {
        for (const src of list) this.get(src);
    },

    /** @returns {HTMLImageElement|null} la imagen si ya está cargada. */
    get(src) {
        let entry = _cache.get(src);
        if (!entry) {
            entry = { img: null, ready: false };
            _cache.set(src, entry);
            const img = _loader(src, (loaded) => {
                entry.img = loaded;
                entry.ready = true;
            });
            if (img && img.complete && img.naturalWidth > 0) {
                entry.img = img;
                entry.ready = true;
            }
        }
        return entry.ready ? entry.img : null;
    },

    /** Silueta blanca cacheada (para el destello de daño). */
    flash(src) {
        const img = this.get(src);
        if (!img) return null;
        let c = _flashCache.get(src);
        if (!c && typeof document !== 'undefined') {
            c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const g = c.getContext('2d');
            g.drawImage(img, 0, 0);
            g.globalCompositeOperation = 'source-in';
            g.fillStyle = '#ffffff';
            g.fillRect(0, 0, c.width, c.height);
            _flashCache.set(src, c);
        }
        return c || null;
    },

    /**
     * Dibuja un fotograma de una hoja de sprites anclado por su centro-inferior.
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} src ruta de la hoja
     * @param {number} sx origen X en píxeles artísticos
     * @param {number} sy origen Y en píxeles artísticos
     * @param {number} sw ancho en píxeles artísticos
     * @param {number} sh alto en píxeles artísticos
     * @param {number} x ancla X en mundo (centro)
     * @param {number} y ancla Y en mundo (base / pies)
     * @param {{ flipX?: boolean, scale?: number, white?: boolean, alpha?: number }} [opt]
     * @returns {boolean} true si se dibujó
     */
    drawFrame(ctx, src, sx, sy, sw, sh, x, y, opt = {}) {
        const sheet = opt.white ? this.flash(src) : this.get(src);
        if (!sheet) return false;
        const s = PX * (opt.scale || 1);
        const w = sw * s;
        const h = sh * s;
        const dx = snap(x - w / 2);
        const dy = snap(y - h);
        const prevAlpha = ctx.globalAlpha;
        if (opt.alpha !== undefined) ctx.globalAlpha = prevAlpha * opt.alpha;
        if (opt.flipX) {
            ctx.save();
            ctx.translate(dx + w, dy);
            ctx.scale(-1, 1);
            ctx.drawImage(sheet, sx, sy, sw, sh, 0, 0, w, h);
            ctx.restore();
        } else {
            ctx.drawImage(sheet, sx, sy, sw, sh, dx, dy, w, h);
        }
        ctx.globalAlpha = prevAlpha;
        return true;
    },

    /**
     * Dibuja un recorte de la hoja con su esquina superior-izquierda en (x, y) de mundo.
     * Útil para losetas del suelo.
     */
    drawTile(ctx, src, sx, sy, sw, sh, x, y) {
        const sheet = this.get(src);
        if (!sheet) return false;
        ctx.drawImage(sheet, sx, sy, sw, sh, x, y, sw * PX, sh * PX);
        return true;
    }
};

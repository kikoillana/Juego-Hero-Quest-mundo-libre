/**
 * @fileoverview Retratos pixel-art (32x32) para el HUD, el selector de héroes y los diálogos.
 * Los PNG se generan con tools/sprites/gen_portraits.py y se dibujan ampliados sin suavizado.
 * Capa 4: sin dependencias.
 */

const PORTRAIT_DIR = './assets/portraits/';
const PORTRAIT_IDS = ['barbarian', 'dwarf', 'elf', 'wizard', 'mentor', 'gargoyle'];
// Personajes sin retrato propio reutilizan el más parecido
const PORTRAIT_ALIAS = {
    goblin: 'gargoyle',
    orc: 'gargoyle',
    skeleton: 'gargoyle',
    fimir: 'gargoyle'
};

export class PortraitRenderer {
    static _imageCache = new Map();

    /** Ruta del PNG del retrato de un personaje. */
    static getPortraitSrc(characterId) {
        const id = PORTRAIT_IDS.includes(characterId) ? characterId : (PORTRAIT_ALIAS[characterId] || 'mentor');
        return `${PORTRAIT_DIR}${id}.png`;
    }

    /** Precarga todos los retratos. */
    static preloadImages() {
        if (typeof Image === 'undefined') return;
        for (const id of PORTRAIT_IDS) this._getImage(this.getPortraitSrc(id));
    }

    static _getImage(src) {
        let img = this._imageCache.get(src);
        if (!img) {
            img = new Image();
            img.onerror = () => {
                if (PortraitRenderer._imageCache.get(src) === img) PortraitRenderer._imageCache.delete(src);
            };
            img.src = src;
            this._imageCache.set(src, img);
        }
        return img;
    }

    /**
     * Dibuja el retrato pixel-art del personaje escalado al canvas (sin suavizado).
     * @param {HTMLCanvasElement} canvas
     * @param {string} characterId - 'barbarian' | 'dwarf' | 'elf' | 'wizard' | 'mentor' | 'gargoyle' | ...
     */
    static renderToCanvas(canvas, characterId) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        if (canvas.style) canvas.style.imageRendering = 'pixelated';

        const img = this._getImage(this.getPortraitSrc(characterId));
        if (img.complete && img.naturalWidth > 0) {
            ctx.clearRect(0, 0, w, h);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, w, h);
            return;
        }
        if (!img.complete) {
            img.addEventListener('load', () => {
                if (canvas.isConnected !== false) PortraitRenderer.renderToCanvas(canvas, characterId);
            }, { once: true });
        }
        ctx.clearRect(0, 0, w, h);
    }
}

PortraitRenderer.preloadImages();

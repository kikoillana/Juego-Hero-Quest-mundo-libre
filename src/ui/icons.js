/**
 * @fileoverview Iconos pixel-art de la interfaz (assets/ui/*.png, generados por tools/sprites/gen_ui.py).
 */

/**
 * Devuelve el HTML de un icono pixel-art.
 * @param {string} name nombre del icono (sin extensión)
 * @param {string} [cls] clases extra (p. ej. 'ico-lg')
 */
export function ico(name, cls = '') {
    return `<img class="ico ${cls}" src="./assets/ui/${name}.png" alt="" draggable="false" />`;
}

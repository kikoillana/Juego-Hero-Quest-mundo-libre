/**
 * @fileoverview Utilidades geométricas compartidas por los generadores de tablero.
 */

/**
 * Test de intersección círculo-rectángulo (estricto: el contacto tangente no cuenta).
 * @returns {boolean}
 */
export function circleIntersectsRect(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
}

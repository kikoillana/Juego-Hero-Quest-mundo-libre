"""
Losetas de Mazmorra (16x16) por tema: suelo de losas, pasillo, muros 3/4 (techo + fachada de ladrillo),
puertas, antorchas, escalera de salida, alfombras (9-slice) y trampas.
Temas: fellmarg (piedra gris), crypt (azul-violeta), kellar (ladrillo cálido), swamp (piedra musgosa).
"""

from __future__ import annotations

import random

from envkit import Pix
from gen_overworld import Atlas
from pixel import save

T = 16

THEMES = {
    "fellmarg": ["stone_hi", "stone", "stone_mid", "stone_dk", "stone_xdk"],
    "crypt": ["dun_hi", "dun", "dun_mid", "dun_dk", "dun_xdk"],
    "kellar": ["brick_hi", "brick", "brick_mid", "brick_dk", "brick_xdk"],
    "swamp": ["moss_hi", "moss", "moss_mid", "moss_dk", "moss_xdk"],
}

RUGS = {
    "red": ["red_hi", "red", "red_dk"],
    "blue": ["blue_hi", "blue", "blue_dk"],
    "green": ["green_hi", "green", "green_dk"],
    "purple": ["purple_hi", "purple", "purple_dk"],
    "gold": ["gold", "gold_mid", "gold_dk"],
}


def floor_tile(r, kind, seed):
    hi, base, mid, dk, xdk = r
    rng = random.Random(seed)
    # El suelo usa la rampa desplazada un tono hacia abajo (más oscuro que los muros)
    hi, base, mid, dk, xdk = base, mid, dk, xdk, "outline"
    if kind == "corridor":
        hi, base, mid, dk = base, mid, dk, xdk
    p = Pix(T, T, xdk)
    if kind == "slab":
        p.rect(1, 1, 14, 14, base)
        p.hline(1, 1, 14, hi)
        p.vline(1, 1, 14, hi)
        p.hline(1, 14, 14, dk)
        p.vline(14, 2, 13, dk)
        p.rect(5, 5, 6, 6, mid)
        p.hline(5, 5, 6, dk)
        p.vline(5, 5, 6, dk)
        p.hline(6, 10, 5, hi)
        p.vline(10, 6, 5, hi)
        return p
    for (x, y) in [(0, 0), (8, 0), (0, 8), (8, 8)]:
        p.rect(x, y, 7, 7, base)
        p.hline(x, y, 7, hi)
        p.hline(x, y + 6, 7, mid)
        if rng.random() < 0.25:
            p.px(x + 2 + rng.randrange(3), y + 2 + rng.randrange(3), mid)
    if kind == "crack":
        for (x, y) in [(3, 2), (4, 3), (4, 4), (5, 5), (5, 6), (6, 7), (7, 8), (7, 9), (9, 10), (10, 11)]:
            p.px(x, y, xdk)
    elif kind == "moss":
        for (x, y) in [(9, 9), (10, 9), (9, 10), (11, 10), (10, 11), (12, 12), (2, 12), (3, 13)]:
            p.px(x, y, "grass_dk")
        p.px(10, 10, "grass_mid")
    return p


def wall_cap(r, seed):
    hi, base, mid, dk, xdk = r
    rng = random.Random(seed)
    p = Pix(T, T, xdk)
    p.specks(rng, 12, [dk])
    p.specks(rng, 6, ["outline"])
    return p


def wall_face(r, seed, kind="plain"):
    hi, base, mid, dk, xdk = r
    rng = random.Random(seed)
    p = Pix(T, 12, xdk)
    for row in range(3):
        y = row * 4
        off = 4 if row % 2 else 0
        for bx in range(-off, T, 8):
            x0, x1 = max(0, bx + 1), min(T, bx + 8)
            if x1 <= x0:
                continue
            col = base if row < 2 else mid
            p.rect(x0, y, x1 - x0, 3, col)
            p.hline(x0, y, x1 - x0, hi if row == 0 else base)
            p.hline(x0, y + 2, x1 - x0, mid if row < 2 else dk)
    p.hline(0, 11, T, "outline")
    if kind == "crack":
        for (x, y) in [(10, 1), (11, 2), (11, 3), (12, 5), (12, 6), (13, 7)]:
            p.px(x, y, xdk)
    elif kind == "moss":
        for x in range(2, 9):
            if rng.random() < 0.7:
                p.px(x, 10, "grass_dk")
        p.px(4, 9, "grass_dk")
        p.px(5, 9, "grass_mid")
    return p


def stairs(r):
    hi, base, mid, dk, xdk = r
    p = Pix(T, T, "outline")
    cols = [hi, base, base, mid, mid, dk]
    for i in range(5):
        y = 1 + i * 3
        p.rect(1, y, 14, 2, cols[i])
        p.hline(1, y, 14, hi if i < 2 else base)
        p.hline(1, y + 2, 14, xdk)
    # Luz de exterior entrando por arriba
    p.hline(2, 1, 12, "gold_hi")
    p.hline(3, 2, 10, "grass_hi")
    p.vline(0, 0, T, xdk)
    p.vline(15, 0, T, xdk)
    return p


def rug_piece(rc, part):
    hi, base, dk = rc
    p = Pix(T, T)
    p.rect(0, 0, T, T, base)
    # rombos del patrón central
    for (cx, cy) in [(4, 4), (12, 12), (12, 4), (4, 12)]:
        p.px(cx, cy - 1, dk)
        p.px(cx - 1, cy, dk)
        p.px(cx + 1, cy, dk)
        p.px(cx, cy + 1, dk)
        p.px(cx, cy, hi)
    p.dither(0, 0, T, T, base, 0)
    # bordes con cenefa dorada según la pieza
    if "N" in part:
        p.hline(0, 0, T, "outline")
        p.hline(0, 1, T, "gold")
        p.hline(0, 2, T, dk)
        for x in range(1, T, 3):
            p.px(x, 3, "gold_mid")
    if "S" in part:
        p.hline(0, 15, T, "outline")
        p.hline(0, 14, T, "gold")
        p.hline(0, 13, T, dk)
        for x in range(1, T, 3):
            p.px(x, 12, "gold_mid")
    if "W" in part:
        p.vline(0, 0, T, "outline")
        p.vline(1, 0, T, "gold")
        p.vline(2, 0, T, dk)
    if "E" in part:
        p.vline(15, 0, T, "outline")
        p.vline(14, 0, T, "gold")
        p.vline(13, 0, T, dk)
    return p


def door_h(r, state, boss=False):
    """Puerta en muro horizontal vista de frente (16x28: 12 de dintel + 16 de celda)."""
    hi, base, mid, dk, xdk = r
    wood = ["red_hi", "red", "red_dk"] if boss else ["wood_hi", "wood", "wood_mid"]
    band = "gold" if boss else "steel"
    p = Pix(T, 28)
    # Marco de piedra (jambas + dintel en arco)
    p.rect(0, 0, T, 28, base)
    p.hline(0, 0, T, hi)
    p.rect(3, 3, 10, 25, "outline")
    p.rect(4, 2, 8, 2, "outline")
    p.vline(0, 0, 28, hi)
    p.vline(15, 0, 28, dk)
    p.vline(1, 2, 26, mid)
    p.vline(14, 2, 26, mid)
    p.hline(5, 0, 6, hi)
    # Clave del arco
    p.rect(6, 0, 4, 2, "gold" if boss else hi)
    if state == "closed":
        p.rect(4, 4, 8, 24, wood[1])
        for x in (5, 8, 11):
            p.vline(x, 4, 24, wood[2])
        p.vline(4, 4, 24, wood[0])
        p.hline(4, 8, 8, band)
        p.hline(4, 20, 8, band)
        p.px(10, 14, band)
        p.px(10, 15, "outline")
        p.px(4, 4, "outline")
        p.px(11, 4, "outline")
        if boss:
            p.rect(7, 12, 2, 3, "gold")
            p.px(7, 13, "outline")
    else:
        p.rect(4, 4, 8, 24, "black")
        p.rect(4, 22, 8, 6, xdk)
        p.dither(4, 18, 8, 4, xdk, 0)
        p.vline(4, 4, 24, wood[2])
    return p


def door_v(r, state, boss=False):
    """Puerta en muro vertical vista desde arriba, a la altura del techo del muro (16x16):
    jambas de piedra arriba y abajo y paso central (hoja de madera si está cerrada)."""
    hi, base, mid, dk, xdk = r
    wood = ["red_hi", "red", "red_dk"] if boss else ["wood_hi", "wood", "wood_mid"]
    band = "gold" if boss else "steel"
    p = Pix(T, T, xdk)
    # paso (suelo oscuro del umbral)
    p.rect(0, 3, T, 10, dk)
    p.dither(0, 3, T, 10, xdk, 0)
    # jambas
    for y0 in (0, 13):
        p.rect(0, y0, T, 3, base)
        p.hline(0, y0, T, hi)
        p.hline(0, y0 + 2, T, mid)
    p.hline(0, 3, T, "outline")
    p.hline(0, 12, T, "outline")
    if state == "closed":
        p.rect(5, 3, 6, 10, wood[1])
        p.vline(5, 3, 10, wood[0])
        p.vline(10, 3, 10, wood[2])
        p.hline(5, 5, 6, band)
        p.hline(5, 10, 6, band)
        p.vline(4, 3, 10, "outline")
        p.vline(11, 3, 10, "outline")
    return p


def torch(frame):
    p = Pix(8, 16)
    # soporte
    p.rect(3, 9, 2, 6, "steel_dk")
    p.rect(2, 9, 4, 2, "steel")
    p.px(2, 9, "steel_hi")
    p.rect(3, 8, 2, 2, "wood_mid")
    flames = [
        ["..f...", ".fFf..", ".FYF..", "fFYYF.", ".fFf.."],
        ["...f..", "..fF..", ".fFYf.", ".FYYF.", "..Ff.."],
        ["..f...", ".fF...", ".FYFf.", "fFYYF.", ".fFf.."],
    ][frame]
    key = {"f": "fire_dk", "F": "fire", "Y": "fire_hi"}
    for y, row in enumerate(flames):
        for x, ch in enumerate(row):
            if ch != ".":
                p.px(x + 1, y + 3, key[ch])
    return p


def trap(kind, r):
    hi, base, mid, dk, xdk = r
    p = Pix(T, T)
    if kind == "hidden":
        for (x, y) in [(4, 6), (5, 7), (6, 7), (7, 8), (8, 8), (9, 7), (10, 7), (11, 6)]:
            p.px(x, y, xdk)
    elif kind == "detected":
        for i in range(2, 14, 2):
            for (x, y) in [(i, 2), (i, 13), (2, i), (13, i)]:
                p.px(x, y, "fire")
        p.rect(7, 5, 2, 4, "fire")
        p.rect(7, 10, 2, 2, "fire")
    elif kind == "disarmed":
        for i in range(4, 12):
            p.px(i, i, "green")
            p.px(15 - i, i, "green")
    elif kind == "pit":
        p.rect(2, 2, 12, 12, "outline")
        p.rect(3, 3, 10, 10, "black")
        p.hline(3, 3, 10, xdk)
        p.hline(2, 2, 12, dk)
        for x in (4, 7, 10):
            p.vline(x + 1, 9, 3, "steel")
            p.px(x + 1, 8, "steel_hi")
    elif kind == "spear":
        p.rect(2, 2, 12, 12, xdk)
        for x in (4, 8, 12):
            for y in (4, 9):
                p.px(x - 1, y + 2, "outline")
                p.vline(x - 1, y - 1, 3, "steel")
                p.px(x - 1, y - 2, "steel_hi")
    elif kind == "boulder":
        p.ellipse(2, 4, 12, 10, "stone_mid")
        p.ellipse(3, 4, 9, 7, "stone")
        p.px(5, 6, "stone_hi")
        p.px(6, 5, "stone_hi")
        p = p.outlined()
    return p


def build(atlas: Atlas):
    for name, r in THEMES.items():
        for i, k in enumerate(["plain", "plain", "crack", "moss", "slab"]):
            atlas.add(f"{name}_floor{i}", floor_tile(r, k, sum(map(ord, name)) * 7 + i))
        atlas.add(f"{name}_corridor0", floor_tile(r, "corridor", 3))
        atlas.add(f"{name}_corridor1", floor_tile(r, "corridor", 4))
        atlas.add(f"{name}_cap", wall_cap(r, 5))
        atlas.add(f"{name}_face0", wall_face(r, 6))
        atlas.add(f"{name}_face1", wall_face(r, 7, "crack"))
        atlas.add(f"{name}_face2", wall_face(r, 8, "moss"))
        atlas.add(f"{name}_stairs", stairs(r))
        for st in ("closed", "open"):
            atlas.add(f"{name}_doorh_{st}", door_h(r, st))
            atlas.add(f"{name}_doorhboss_{st}", door_h(r, st, boss=True))
            atlas.add(f"{name}_doorv_{st}", door_v(r, st))
            atlas.add(f"{name}_doorvboss_{st}", door_v(r, st, boss=True))
        for k in ("hidden", "detected", "disarmed", "pit", "spear", "boulder"):
            atlas.add(f"{name}_trap_{k}", trap(k, r))
    for rug, rc in RUGS.items():
        for part in ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"]:
            atlas.add(f"rug_{rug}_{part}", rug_piece(rc, part))
    for f in range(3):
        atlas.add(f"torch{f}", torch(f))


if __name__ == "__main__":
    a = Atlas()
    build(a)
    img, coords = a.build()
    save(img, "dungeon.png", preview_scale=3)
    print(len(coords), "frames", img.size)

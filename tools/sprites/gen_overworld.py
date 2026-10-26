"""
Losetas del Bosque Exterior (16x16): hierba, suelo de bosque, sendero con bordes autotile,
agua animada con orillas, puente, plaza de piedra, árboles y riscos.
Salida: assets/sprites/overworld.png  (+ coordenadas en src/render/envAtlas.js vía gen_env_atlas.py)
"""

from __future__ import annotations

import random
from PIL import Image

from envkit import Pix, C
from pixel import save

T = 16


class Atlas:
    """Empaqueta fotogramas de tamaño variable en filas de 256 px."""

    def __init__(self, width=256):
        self.width = width
        self.items = []  # (name, Pix)

    def add(self, name, pix):
        self.items.append((name, pix))

    def build(self):
        x = y = row_h = 0
        coords = {}
        placed = []
        for name, p in self.items:
            if x + p.w > self.width:
                x = 0
                y += row_h
                row_h = 0
            coords[name] = (x, y, p.w, p.h)
            placed.append((p, x, y))
            x += p.w
            row_h = max(row_h, p.h)
        img = Image.new("RGBA", (self.width, y + row_h), (0, 0, 0, 0))
        for p, px_, py_ in placed:
            img.alpha_composite(p.img, (px_, py_))
        return img, coords


# ---------------------------------------------------------------------------
# Suelos base
# ---------------------------------------------------------------------------

def tuft(p: Pix, x, y, dark="grass_dk", light="grass_hi"):
    p.px(x, y, dark)
    p.px(x + 2, y, dark)
    p.px(x + 1, y + 1, dark)
    p.px(x - 1, y - 1, dark) if False else None
    p.px(x + 1, y - 1, light)


def flower(p: Pix, x, y, petal="white", center="gold"):
    p.px(x, y - 1, petal)
    p.px(x - 1, y, petal)
    p.px(x + 1, y, petal)
    p.px(x, y + 1, petal)
    p.px(x, y, center)
    p.px(x + 1, y + 2, "grass_dk")


def grass_tile(seed, kind="plain", base="grass"):
    rng = random.Random(seed)
    p = Pix(T, T, base)
    mid = "grass_mid" if base == "grass" else "forest_dk"
    p.specks(rng, 10, [mid])
    if base == "grass":
        p.specks(rng, 3, ["grass_hi"])
    if kind == "tuft":
        for _ in range(2):
            tuft(p, rng.randrange(1, 12), rng.randrange(3, 14),
                 dark="grass_dk" if base == "grass" else "forest_dk",
                 light="grass_hi" if base == "grass" else "grass_mid")
    elif kind == "flowers":
        flower(p, 4, 4)
        flower(p, 11, 9)
        flower(p, 5, 12, petal="gold_hi", center="fire")
    elif kind == "red":
        flower(p, 10, 4, petal="red_hi", center="gold_hi")
        flower(p, 4, 10, petal="red_hi", center="gold_hi")
    elif kind == "dense":
        for _ in range(4):
            tuft(p, rng.randrange(1, 12), rng.randrange(3, 14), dark="grass_dk", light="grass_hi")
    return p


def forest_tile(seed, kind="plain"):
    rng = random.Random(seed)
    p = Pix(T, T, "grass_dk")
    p.specks(rng, 18, ["forest"])
    p.specks(rng, 5, ["grass_mid"])
    if kind == "leaves":
        for _ in range(3):
            x, y = rng.randrange(1, 14), rng.randrange(1, 14)
            p.px(x, y, "dirt_mid")
            p.px(x + 1, y, "dirt_dk")
    elif kind == "tuft":
        for _ in range(2):
            tuft(p, rng.randrange(1, 12), rng.randrange(3, 14), dark="forest", light="grass_mid")
    return p


def dirt_tile(seed, kind="plain"):
    rng = random.Random(seed)
    p = Pix(T, T, "dirt")
    p.specks(rng, 12, ["dirt_mid"])
    p.specks(rng, 4, ["dirt_hi"])
    if kind == "pebbles":
        for _ in range(3):
            x, y = rng.randrange(1, 13), rng.randrange(1, 13)
            p.rect(x, y, 2, 1, "dirt_mid")
            p.px(x, y, "dirt_hi")
            p.px(x + 1, y + 1, "dirt_dk")
    return p


def edge_overlay(side: str, lip="grass_dk", fill="grass", shadow="dirt_mid", seed=0):
    """Borde de hierba que invade la loseta de tierra por un lado (N/S/E/W)."""
    rng = random.Random(seed)
    p = Pix(T, T)
    # profundidad irregular por columna (suave: 2-3 px)
    depth = []
    d = 2
    for i in range(T):
        if rng.random() < 0.35:
            d = 3 if d == 2 else 2
        depth.append(d)
    for i in range(T):
        for k in range(depth[i]):
            p.px(i, k, fill)
        p.px(i, depth[i], lip)
        p.px(i, depth[i] + 1, shadow)
        if k == 0 and rng.random() < 0.3:
            p.px(i, 0, "grass_mid")
    rot = {"N": 0, "W": 90, "S": 180, "E": 270}[side]
    p.img = p.img.rotate(rot)
    return p


def corner_overlay(corner: str, lip="grass_dk", fill="grass", shadow="dirt_mid"):
    """Esquina exterior redondeada (dos lados de hierba)."""
    shape = [
        "gggggg",
        "gggggl",
        "ggggls",
        "gggls.",
        "ggls..",
        "gls...",
    ]
    key = {"g": fill, "l": lip, "s": shadow}
    p = Pix(T, T)
    for y, row in enumerate(shape):
        for x, ch in enumerate(row):
            if ch != ".":
                p.px(x, y, key[ch])
    rot = {"NW": 0, "SW": 90, "SE": 180, "NE": 270}[corner]
    p.img = p.img.rotate(rot)
    return p


def inner_overlay(corner: str, lip="grass_dk", fill="grass", shadow="dirt_mid"):
    """Esquina interior (solo la diagonal es hierba): pequeña muesca."""
    shape = [
        "ggl.",
        "gls.",
        "ls..",
        "s...",
    ]
    key = {"g": fill, "l": lip, "s": shadow}
    p = Pix(T, T)
    for y, row in enumerate(shape):
        for x, ch in enumerate(row):
            if ch != ".":
                p.px(x, y, key[ch])
    rot = {"NW": 0, "SW": 90, "SE": 180, "NE": 270}[corner]
    p.img = p.img.rotate(rot)
    return p


def water_tile(frame):
    p = Pix(T, T, "water_mid")
    rng = random.Random(7)
    p.specks(rng, 6, ["water_dk"])
    # Brillos ondulantes que se desplazan con el fotograma
    waves = [(2, 3), (9, 6), (4, 11), (12, 13)]
    for i, (x, y) in enumerate(waves):
        ox = (x + frame * 2 + i) % 14
        p.hline(ox, y, 3, "water")
        p.px(ox + 1, y - 1, "water_hi") if (frame + i) % 3 == 0 else None
    return p


def shore_overlay(side: str, frame: int):
    p = Pix(T, T)
    for i in range(T):
        p.px(i, 0, "water_dk")
        if (i + frame) % 4 != 0:
            p.px(i, 1, "water_hi")
        if (i + frame) % 2 == 0:
            p.px(i, 2, "water")
    rot = {"N": 0, "W": 90, "S": 180, "E": 270}[side]
    p.img = p.img.rotate(rot)
    return p


def bridge_tile(horizontal=True):
    # Tablones perpendiculares a la marcha
    p = Pix(T, T, "wood")
    for x in range(0, T, 4):
        p.vline(x, 0, T, "wood_dk")
        p.vline(x + 1, 0, T, "wood_hi")
        p.px(x + 2, 5, "wood_mid")
        p.px(x + 2, 11, "wood_mid")
    p.hline(0, 0, T, "wood_mid")
    p.hline(0, T - 1, T, "wood_dk")
    if not horizontal:
        p.img = p.img.rotate(90)
    return p


def bridge_rail(side: str):
    p = Pix(T, T)
    p.hline(0, 0, T, "outline")
    p.hline(0, 1, T, "wood_hi")
    p.hline(0, 2, T, "wood_mid")
    p.hline(0, 3, T, "outline")
    for x in (2, 13):
        p.rect(x, 0, 2, 4, "wood_dk")
        p.px(x, 0, "wood_hi")
    rot = {"N": 0, "W": 90, "S": 180, "E": 270}[side]
    p.img = p.img.rotate(rot)
    return p


def plaza_tile(seed):
    """Losas de piedra irregulares (dos hileras por loseta, juntas desplazadas)."""
    rng = random.Random(seed)
    p = Pix(T, T, "stone_dk")
    for row, (y, h) in enumerate(((0, 8), (8, 8))):
        x = -rng.choice([0, 3, 5]) if row else 0
        while x < T:
            w = rng.choice([6, 7, 8, 9])
            x0, x1 = max(0, x), min(T, x + w - 1)
            if x1 > x0:
                p.rect(x0, y, x1 - x0, h - 1, "stone_mid")
                p.hline(x0, y, x1 - x0, "stone")
                p.vline(x0, y, h - 1, "stone")
                if rng.random() < 0.5:
                    p.px(x0 + rng.randrange(max(1, x1 - x0)), y + 2 + rng.randrange(3), "stone_dk")
            x += w
    if rng.random() < 0.6:
        p.px(rng.randrange(16), 7, "grass_mid")
        p.px(rng.randrange(16), 15, "grass_dk")
    return p


# ---------------------------------------------------------------------------
# Árbol clásico de copa redonda (32x32, ancla abajo-centro)
# ---------------------------------------------------------------------------

def tree(variant=0):
    rng = random.Random(100 + variant)
    p = Pix(32, 34)
    dark, mid, light, hi = "forest", "grass_dk", "grass_mid", "grass"
    if variant == 2:
        dark, mid, light, hi = "forest_dk", "forest", "grass_dk", "grass_mid"
    # Tronco
    p.rect(13, 25, 6, 7, "wood_mid")
    p.vline(13, 25, 7, "wood_dk")
    p.vline(17, 26, 6, "wood_dk")
    p.vline(14, 26, 4, "wood")
    p.px(12, 31, "wood_mid")
    p.px(19, 31, "wood_mid")
    # Copa: racimos de círculos
    blobs = [(3, 8, 12, 12), (17, 8, 12, 12), (8, 2, 16, 14), (5, 13, 22, 13), (2, 12, 10, 10), (20, 12, 10, 10)]
    for (x, y, w, h) in blobs:
        p.ellipse(x, y, w, h, dark)
    # Volumen medio
    for (x, y, w, h) in [(5, 9, 9, 9), (17, 9, 9, 9), (9, 3, 13, 11), (7, 13, 18, 9)]:
        p.ellipse(x, y, w, h, mid)
    # Luces arriba-izquierda
    for (x, y, w, h) in [(7, 9, 6, 5), (10, 4, 9, 6), (18, 9, 5, 4)]:
        p.ellipse(x, y, w, h, light)
    for (x, y) in [(11, 5), (12, 5), (13, 6), (8, 10), (9, 10), (19, 10), (15, 4)]:
        p.px(x, y, hi)
    # Textura de hojas: pequeños arcos oscuros
    for _ in range(14):
        x, y = rng.randrange(5, 27), rng.randrange(6, 24)
        if p.get(x, y)[3] and p.get(x, y)[:3] in (C(mid)[:3], C(light)[:3]):
            p.px(x, y, dark)
            p.px(x + 1, y - 1, dark if rng.random() < 0.5 else mid)
    # Sombra inferior de la copa sobre el tronco
    p.hline(12, 25, 8, dark)
    return p.outlined()


def tree_shadow():
    p = Pix(32, 10)
    p.ellipse(4, 1, 24, 8, "#00000050")
    return p


# ---------------------------------------------------------------------------
# Riscos (top 16x16 + cara 16x12)
# ---------------------------------------------------------------------------

def cliff_top(seed):
    rng = random.Random(seed)
    p = Pix(T, T, "grass_mid")
    p.specks(rng, 14, ["grass_dk"])
    p.specks(rng, 4, ["grass"])
    for _ in range(2):
        tuft(p, rng.randrange(2, 11), rng.randrange(4, 12), dark="grass_dk", light="grass")
    if seed % 2:
        x, y = rng.randrange(3, 11), rng.randrange(3, 11)
        p.px(x, y, "stone")
        p.px(x + 1, y, "stone_mid")
        p.hline(x, y + 1, 2, "grass_dk")
    return p


def cliff_face(seed):
    """Cara de risco: rocas redondeadas de tamaños variados con grietas oscuras."""
    rng = random.Random(seed)
    p = Pix(T, 12, "wood_dk")
    rocks = []
    x = -2
    while x < T:
        w = rng.choice([5, 6, 7, 8])
        rocks.append((x, rng.choice([2, 3]), w, rng.choice([5, 6])))
        rocks.append((x + w // 2 - 1, 6 + rng.choice([0, 1]), w, rng.choice([4, 5])))
        x += w - 1
    for (rx, ry, rw, rh) in rocks:
        p.ellipse(rx, ry, rw, rh, "dirt_dk")
        p.ellipse(rx, ry, rw - 1, rh - 1, "dirt_mid")
        p.px(rx + 1, ry + 1, "dirt")
        p.px(rx + 2, ry + 1, "dirt")
        p.px(rx + 1, ry + 2, "dirt")
    p.hline(0, 0, T, "grass_mid")
    p.hline(0, 1, T, "forest")
    for i in range(0, T, 3):
        p.px(i + rng.randrange(2), 2, "forest")
    p.hline(0, 11, T, "outline")
    return p


def build(atlas: Atlas):
    for i, k in enumerate(["plain", "plain", "tuft", "flowers", "red", "dense"]):
        atlas.add(f"grass{i}", grass_tile(10 + i, k))
    for i, k in enumerate(["plain", "leaves", "tuft"]):
        atlas.add(f"forest{i}", forest_tile(30 + i, k))
    for i, k in enumerate(["plain", "plain", "pebbles"]):
        atlas.add(f"dirt{i}", dirt_tile(50 + i, k))
    for s in "NSEW":
        atlas.add(f"edge_{s}", edge_overlay(s, seed=ord(s)))
    for c in ["NW", "NE", "SW", "SE"]:
        atlas.add(f"corner_{c}", corner_overlay(c))
        atlas.add(f"inner_{c}", inner_overlay(c))
    # Bordes de pradera sobre el suelo oscuro del bosque
    for s_ in "NSEW":
        atlas.add(f"fedge_{s_}", edge_overlay(s_, lip="grass_mid", shadow="forest_dk", seed=ord(s_) + 9))
    for c in ["NW", "NE", "SW", "SE"]:
        atlas.add(f"fcorner_{c}", corner_overlay(c, lip="grass_mid", shadow="forest_dk"))
        atlas.add(f"finner_{c}", inner_overlay(c, lip="grass_mid", shadow="forest_dk"))
    for f in range(3):
        atlas.add(f"water{f}", water_tile(f))
    for f in range(3):
        for s in "NSEW":
            atlas.add(f"shore_{s}{f}", shore_overlay(s, f))
    atlas.add("bridge_h", bridge_tile(True))
    atlas.add("bridge_v", bridge_tile(False))
    for s in "NSEW":
        atlas.add(f"rail_{s}", bridge_rail(s))
    for i in range(2):
        atlas.add(f"plaza{i}", plaza_tile(70 + i))
    for i in range(2):
        atlas.add(f"clifftop{i}", cliff_top(80 + i))
    for i in range(2):
        atlas.add(f"cliffface{i}", cliff_face(90 + i))
    for v in range(3):
        atlas.add(f"tree{v}", tree(v))
    atlas.add("tree_shadow", tree_shadow())


if __name__ == "__main__":
    a = Atlas()
    build(a)
    img, coords = a.build()
    save(img, "overworld.png", preview_scale=4)
    print(len(coords), "frames", img.size)

"""
Botín pixel-art (12x12): moneda giratoria (4 fotogramas), bolsa de oro, gema roja y pociones.
Salida: assets/sprites/items.png
"""

from __future__ import annotations

from envkit import Pix
from gen_overworld import Atlas
from pixel import save

SHEET_WIDTH = 128


def coin(frame):
    p = Pix(12, 12)
    widths = [8, 6, 2, 6]
    w = widths[frame]
    x = 6 - w // 2
    if w == 2:
        p.rect(5, 2, 2, 8, "gold_mid")
        p.vline(5, 2, 8, "gold_hi")
    else:
        p.ellipse(x, 2, w, 8, "gold_mid")
        p.ellipse(x, 2, w - 1, 7, "gold")
        p.vline(x + 1, 4, 3, "gold_hi")
        if w == 8:
            p.vline(6, 4, 4, "gold_dk")
    return p.outlined()


def pouch():
    p = Pix(12, 12)
    p.ellipse(1, 3, 10, 9, "wood")
    p.ellipse(2, 4, 6, 5, "wood_hi")
    p.rect(4, 1, 4, 3, "wood_mid")
    p.hline(3, 3, 6, "gold")
    p.px(5, 7, "gold_hi")
    p.px(6, 8, "gold")
    return p.outlined()


def gem():
    p = Pix(12, 12)
    p.poly([(6, 1), (10, 5), (6, 10), (2, 5)], "red")
    p.poly([(6, 1), (10, 5), (6, 5)], "red_dk")
    p.poly([(2, 5), (6, 1), (6, 5)], "red_hi")
    p.px(4, 4, "white")
    return p.outlined()


def potion(liquid, hi, dk):
    p = Pix(12, 12)
    p.rect(5, 0, 2, 2, "wood")
    p.rect(4, 2, 4, 2, "steel_hi")
    p.ellipse(2, 3, 8, 8, liquid)
    p.ellipse(2, 3, 8, 3, "steel_hi")
    p.hline(3, 9, 6, dk)
    p.px(4, 6, hi)
    p.px(4, 7, "white")
    return p.outlined()


def build(atlas: Atlas):
    for f in range(4):
        atlas.add(f"coin{f}", coin(f))
    atlas.add("pouch", pouch())
    atlas.add("gem", gem())
    atlas.add("potion_heal", potion("red", "red_hi", "red_dk"))
    atlas.add("potion_strength", potion("fire", "fire_hi", "fire_dk"))
    atlas.add("potion_speed", potion("blue", "blue_hi", "blue_dk"))


if __name__ == "__main__":
    a = Atlas(SHEET_WIDTH)
    build(a)
    img, coords = a.build()
    save(img, "items.png", preview_scale=6)

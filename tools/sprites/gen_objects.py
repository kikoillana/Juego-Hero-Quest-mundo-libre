"""
Objetos del escenario (muebles de mazmorra, objetos del bosque, portales de mazmorra).
Cada fotograma se ancla por su centro-inferior en el pie del objeto.
Salida: assets/sprites/objects.png
"""

from __future__ import annotations

import random

from envkit import Pix
from gen_overworld import Atlas
from pixel import save

SHEET_WIDTH = 256


def shadow(p: Pix, x, y, w, h=3):
    p.ellipse(x, y, w, h, "shadow")


def done(p: Pix, shadow_box=None):
    """Contorno + sombra semitransparente debajo (la sombra se pinta detrás)."""
    o = p.outlined()
    if shadow_box:
        s = Pix(p.w, p.h)
        shadow(s, *shadow_box)
        s.paste(o)
        return s
    return o


# ---------------------------------------------------------------------------
# Muebles de mazmorra
# ---------------------------------------------------------------------------

def table():
    p = Pix(32, 22)
    p.rect(2, 4, 28, 10, "wood")
    for y in (6, 9, 12):
        p.hline(3, y, 26, "wood_mid")
    p.hline(2, 4, 28, "wood_hi")
    p.rect(2, 14, 28, 3, "wood_dk")
    p.rect(3, 17, 3, 4, "wood_dk")
    p.rect(26, 17, 3, 4, "wood_dk")
    # objetos sobre la mesa: pergamino, jarra y vela
    p.rect(6, 6, 7, 4, "dirt_hi")
    p.hline(7, 7, 5, "dirt_mid")
    p.hline(7, 8, 4, "dirt_mid")
    p.rect(19, 5, 3, 4, "steel")
    p.px(19, 5, "steel_hi")
    p.rect(25, 6, 2, 3, "white")
    p.px(25, 4, "fire")
    p.px(25, 5, "fire_hi")
    return done(p, (1, 18, 30, 4))


def throne():
    p = Pix(18, 30)
    p.rect(3, 0, 12, 18, "gold_mid")
    p.rect(5, 2, 8, 14, "red")
    p.rect(6, 3, 2, 12, "red_hi")
    p.hline(3, 0, 12, "gold_hi")
    p.px(9, 0, "red_hi")
    p.px(8, 1, "gold")
    p.rect(1, 16, 16, 7, "gold")
    p.rect(3, 17, 12, 4, "red")
    p.hline(3, 17, 12, "red_hi")
    p.rect(1, 23, 16, 3, "gold_dk")
    p.rect(2, 26, 3, 3, "gold_dk")
    p.rect(13, 26, 3, 3, "gold_dk")
    p.vline(1, 16, 7, "gold_hi")
    return done(p, (1, 26, 16, 4))


def chest(opened):
    p = Pix(16, 16)
    # cuerpo
    p.rect(1, 7, 14, 8, "wood")
    p.hline(1, 7, 14, "wood_hi")
    p.rect(1, 13, 14, 2, "wood_mid")
    p.vline(3, 7, 8, "gold_mid")
    p.vline(12, 7, 8, "gold_mid")
    if opened:
        p.rect(1, 2, 14, 5, "wood_dk")
        p.hline(1, 2, 14, "wood_mid")
        p.rect(2, 5, 12, 3, "black")
        p.px(5, 6, "gold_hi")
        p.px(9, 6, "gold")
        p.px(10, 7, "gold_hi")
    else:
        p.rect(1, 3, 14, 5, "wood")
        p.hline(2, 2, 12, "wood_hi")
        p.hline(1, 3, 14, "wood_hi")
        p.hline(1, 7, 14, "wood_dk")
        p.vline(3, 2, 6, "gold")
        p.vline(12, 2, 6, "gold")
        p.rect(7, 6, 2, 3, "gold")
        p.px(7, 7, "outline")
    return done(p, (0, 13, 16, 3))


def bookcase():
    p = Pix(32, 30)
    p.rect(1, 0, 30, 28, "wood_mid")
    p.box(1, 0, 30, 28, "wood_dk")
    p.hline(1, 0, 30, "wood_hi")
    rng = random.Random(4)
    cols = ["red", "blue", "green", "purple", "gold_mid", "dirt_hi", "red_dk", "blue_dk"]
    for sy in (2, 11, 20):
        p.rect(3, sy, 26, 7, "wood_dk")
        x = 3
        while x < 28:
            w = rng.choice([1, 2, 2, 3])
            h = rng.choice([5, 6, 7])
            c = rng.choice(cols)
            if x + w > 29:
                break
            p.rect(x, sy + 7 - h, w, h, c)
            p.px(x, sy + 7 - h, "white" if rng.random() < 0.3 else c)
            x += w + (1 if rng.random() < 0.2 else 0)
        p.hline(2, sy + 7, 28, "wood")
    return done(p, (1, 27, 30, 3))


def rack():
    p = Pix(32, 18)
    p.rect(2, 6, 28, 6, "wood")
    p.hline(2, 6, 28, "wood_hi")
    p.rect(2, 12, 2, 5, "wood_dk")
    p.rect(28, 12, 2, 5, "wood_dk")
    for x in (4, 26):
        p.rect(x - 2, 3, 4, 10, "wood_mid")
        p.hline(x - 2, 3, 4, "wood_hi")
        p.px(x - 1, 7, "steel_hi")
    for x in range(7, 25, 3):
        p.vline(x, 7, 4, "dirt_hi")
    p.hline(6, 8, 20, "dirt_mid")
    return done(p, (1, 14, 30, 3))


def fireplace(frame):
    p = Pix(32, 30)
    p.rect(1, 2, 30, 26, "stone_mid")
    for y in range(3, 26, 4):
        off = 4 if (y // 4) % 2 else 0
        for x in range(1 - off, 31, 8):
            p.vline(max(1, x), y, 3, "stone_dk")
        p.hline(1, y + 3, 30, "stone_dk")
    p.rect(0, 0, 32, 4, "stone")
    p.hline(0, 0, 32, "stone_hi")
    p.rect(7, 10, 18, 18, "black")
    p.rect(8, 9, 16, 1, "black")
    # leños
    p.rect(9, 24, 14, 3, "wood_mid")
    p.hline(9, 24, 14, "wood")
    flames = [
        ["....f.....f...", "...fF....fFf..", "..fFYf..fFYf..", ".fFYYFffFYYFf.", "fFYYYYFFYYYYFf", "FYYYYYYYYYYYYF"],
        [".......f......", "..f...fFf..f..", ".fFf.fFYFffF..", ".FYFfFYYYFFYf.", "fFYYYYYYYYYYFf", "FYYYYYYYYYYYYF"],
    ][frame]
    key = {"f": "fire_dk", "F": "fire", "Y": "fire_hi"}
    for y, row in enumerate(flames):
        for x, ch in enumerate(row):
            if ch != ".":
                p.px(9 + x, 18 + y, key[ch])
    return done(p, (1, 27, 30, 3))


def alchemist(frame):
    p = Pix(32, 24)
    p.rect(1, 10, 30, 6, "wood")
    p.hline(1, 10, 30, "wood_hi")
    p.rect(1, 16, 30, 3, "wood_dk")
    p.rect(2, 19, 3, 4, "wood_dk")
    p.rect(27, 19, 3, 4, "wood_dk")
    # matraces
    def flask(x, y, c, hi, tall):
        p.rect(x + 1, y - tall, 2, tall, "steel_hi")
        p.ellipse(x - 1, y - 1, 6, 5, c)
        p.px(x, y, hi)
    flask(5, 9, "green", "green_hi", 4)
    flask(13, 9, "purple", "purple_hi", 6)
    flask(22, 9, "blue", "blue_hi", 3)
    # burbujas
    for (x, y) in ([(7, 2), (15, 0)] if frame == 0 else [(6, 3), (16, 1), (24, 4)]):
        p.px(x, y, "white")
    p.rect(26, 7, 4, 3, "dirt_hi")
    return done(p, (1, 20, 30, 3))


def sarcophagus(opened):
    p = Pix(32, 18)
    p.rect(1, 6, 30, 10, "stone_mid")
    p.hline(1, 15, 30, "stone_dk")
    if opened:
        p.rect(3, 6, 26, 7, "black")
        p.rect(6, 0, 26, 6, "stone")
        p.hline(6, 0, 26, "stone_hi")
        p.px(10, 9, "stone_hi")
        p.px(11, 9, "stone_hi")
    else:
        p.rect(1, 2, 30, 8, "stone")
        p.hline(1, 2, 30, "stone_hi")
        # figura tallada en la tapa
        p.ellipse(4, 3, 6, 6, "stone_hi")
        p.rect(10, 4, 16, 4, "stone_hi")
        p.hline(10, 7, 16, "stone_mid")
        p.px(6, 5, "stone_mid")
        p.px(7, 5, "stone_mid")
        p.hline(12, 5, 10, "gold_mid")
    return done(p, (1, 14, 30, 3))


def weapons_rack():
    p = Pix(32, 26)
    p.rect(2, 20, 28, 3, "wood_mid")
    p.hline(2, 20, 28, "wood_hi")
    p.rect(2, 6, 28, 2, "wood_mid")
    p.vline(2, 6, 17, "wood_dk")
    p.vline(29, 6, 17, "wood_dk")
    # espada
    p.vline(7, 2, 16, "steel")
    p.vline(8, 2, 16, "steel_hi")
    p.hline(5, 15, 6, "gold_mid")
    p.rect(7, 16, 2, 4, "wood_dk")
    # hacha
    p.vline(15, 1, 19, "wood")
    p.rect(12, 2, 4, 6, "steel")
    p.vline(12, 2, 6, "steel_hi")
    # lanza
    p.vline(23, 0, 20, "wood")
    p.poly([(22, 3), (23, 0), (24, 3)], "steel_hi")
    p.rect(22, 3, 3, 2, "steel")
    # escudo redondo
    p.ellipse(25, 9, 6, 8, "red")
    p.px(27, 12, "gold")
    return done(p, (1, 21, 30, 3))


# ---------------------------------------------------------------------------
# Bosque
# ---------------------------------------------------------------------------

def bush(cut):
    p = Pix(16, 16)
    if cut:
        p.rect(4, 10, 8, 4, "grass_dk")
        p.hline(4, 10, 8, "grass_mid")
        for x in (5, 8, 11):
            p.px(x, 9, "grass_mid")
        p.px(6, 12, "wood_mid")
        p.px(9, 12, "wood_mid")
        return done(p)
    p.ellipse(1, 3, 14, 12, "grass_dk")
    p.ellipse(2, 3, 11, 9, "grass_mid")
    p.ellipse(3, 4, 6, 5, "grass")
    for (x, y) in [(4, 5), (5, 4), (9, 6), (11, 9), (6, 9), (3, 8)]:
        p.px(x, y, "grass_hi")
    for (x, y) in [(7, 7), (10, 4), (4, 11), (12, 11), (8, 12)]:
        p.px(x, y, "forest")
    return done(p, (1, 12, 14, 4))


def campfire(frame):
    p = Pix(16, 18)
    # piedras
    for (x, y) in [(1, 13), (4, 15), (8, 15), (12, 14), (13, 12), (0, 11)]:
        p.rect(x, y, 3, 2, "stone_mid")
        p.px(x, y, "stone_hi")
    # leños cruzados
    p.line(3, 14, 12, 10, "wood_mid")
    p.line(3, 10, 12, 14, "wood")
    flames = [
        ["...f....", "..fFf...", ".fFYFf..", ".FYYYF..", "fFYYYFf.", ".FYYYF.."],
        ["....f...", "...fF...", "..fFYf..", ".fFYYFf.", ".FYYYYF.", ".fFYYF.."],
        ["..f..f..", "..Ff.F..", ".fFYFFf.", ".FYYYYF.", "fFYYYYF.", ".FYYYF.."],
    ][frame]
    key = {"f": "fire_dk", "F": "fire", "Y": "fire_hi"}
    for y, row in enumerate(flames):
        for x, ch in enumerate(row):
            if ch != ".":
                p.px(x + 4, y + 5, key[ch])
    return p  # sin contorno: el fuego no lleva línea


def anvil_stall():
    p = Pix(32, 30)
    # postes
    p.vline(2, 6, 22, "wood_dk")
    p.vline(29, 6, 22, "wood_dk")
    # toldo a rayas
    for x in range(0, 32):
        c = "red" if (x // 4) % 2 == 0 else "white"
        p.vline(x, 1, 6, c)
    p.hline(0, 1, 32, "red_hi")
    for x in range(0, 32, 4):
        p.px(x + 1, 7, "red" if (x // 4) % 2 == 0 else "white")
    # yunque
    p.rect(10, 20, 12, 3, "stone_dk")
    p.rect(12, 16, 9, 4, "stone_mid")
    p.rect(8, 15, 15, 2, "stone")
    p.hline(8, 15, 15, "stone_hi")
    p.poly([(23, 15), (26, 16), (23, 16)], "stone")
    p.rect(13, 23, 6, 4, "stone_dk")
    # martillo y barril de agua
    p.rect(15, 13, 5, 2, "steel")
    p.vline(17, 10, 3, "wood")
    p.rect(24, 21, 5, 7, "wood")
    p.hline(24, 23, 5, "steel_dk")
    p.hline(24, 21, 5, "water")
    return done(p, (1, 26, 30, 4))


def signpost():
    p = Pix(16, 20)
    p.rect(7, 6, 2, 13, "wood_mid")
    p.vline(7, 6, 13, "wood")
    p.rect(1, 2, 14, 7, "wood")
    p.hline(1, 2, 14, "wood_hi")
    p.hline(1, 8, 14, "wood_dk")
    p.hline(3, 4, 9, "wood_dk")
    p.hline(3, 6, 7, "wood_dk")
    return done(p, (3, 17, 10, 3))


def boulder():
    p = Pix(18, 16)
    p.ellipse(1, 4, 11, 10, "stone_mid")
    p.ellipse(2, 4, 8, 7, "stone")
    p.px(4, 6, "stone_hi")
    p.px(5, 5, "stone_hi")
    p.ellipse(9, 7, 8, 7, "stone_mid")
    p.ellipse(10, 7, 5, 4, "stone")
    p.px(11, 8, "stone_hi")
    p.px(6, 11, "grass_mid")
    return done(p, (1, 12, 16, 4))


def stump():
    p = Pix(16, 14)
    p.rect(3, 5, 10, 7, "wood_mid")
    p.vline(3, 5, 7, "wood_dk")
    p.vline(12, 5, 7, "wood_dk")
    p.vline(6, 7, 4, "wood_dk")
    p.ellipse(3, 2, 10, 6, "wood_hi")
    p.ellipse(5, 3, 6, 4, "dirt_hi")
    p.px(7, 4, "wood_mid")
    p.px(8, 4, "wood_mid")
    p.px(2, 11, "wood_mid")
    p.px(13, 11, "wood_mid")
    return done(p, (1, 10, 14, 4))


def well():
    p = Pix(18, 28)
    # tejadillo
    p.poly([(1, 7), (9, 0), (17, 7)], "red_dk")
    p.poly([(3, 7), (9, 2), (15, 7)], "red")
    p.hline(1, 7, 17, "wood_dk")
    p.vline(3, 8, 10, "wood_mid")
    p.vline(14, 8, 10, "wood_mid")
    p.hline(3, 11, 12, "wood")
    p.vline(9, 11, 5, "dirt_hi")
    p.rect(8, 15, 3, 3, "wood")
    # brocal de piedra
    p.rect(1, 17, 16, 9, "stone_mid")
    p.ellipse(1, 15, 16, 6, "stone")
    p.ellipse(3, 16, 12, 4, "water_dk")
    p.hline(3, 17, 12, "water_mid")
    for x in range(2, 16, 4):
        p.vline(x, 21, 4, "stone_dk")
    p.hline(1, 22, 16, "stone_dk")
    return done(p, (0, 24, 18, 4))


def cage(part):
    p = Pix(18, 26)
    if part == "back":
        p.rect(1, 21, 16, 4, "stone_dk")
        p.hline(1, 21, 16, "stone_mid")
        p.rect(2, 1, 14, 3, "steel_dk")
        for x in range(2, 17, 3):
            p.vline(x, 3, 18, "steel_dk")
        return p
    if part == "front":
        p.rect(1, 0, 16, 3, "steel")
        p.hline(1, 0, 16, "steel_hi")
        for x in range(1, 18, 3):
            p.vline(x, 3, 19, "steel")
            p.px(x, 3, "steel_hi")
        p.rect(7, 10, 4, 4, "gold")
        p.px(8, 11, "outline")
        p.px(8, 12, "outline")
        p.rect(0, 22, 18, 2, "steel_dk")
        return p.outlined()
    # abierta: barrotes delanteros sólo en los laterales y puerta abierta
    p.rect(1, 0, 16, 3, "steel")
    p.hline(1, 0, 16, "steel_hi")
    for x in (1, 16):
        p.vline(x, 3, 19, "steel")
    for x in range(0, 6, 2):
        p.vline(x - 2 if x else 0, 6, 15, "steel_dk")
    p.rect(0, 22, 18, 2, "steel_dk")
    return p.outlined()


def quest_board():
    p = Pix(32, 28)
    p.vline(3, 4, 23, "wood_dk")
    p.vline(28, 4, 23, "wood_dk")
    p.rect(1, 2, 30, 16, "wood")
    p.box(1, 2, 30, 16, "wood_dk")
    p.hline(0, 1, 32, "wood_mid")
    p.hline(0, 0, 32, "wood_hi")
    notes = [(3, 4, 7, 6), (11, 5, 6, 7), (19, 4, 8, 5), (6, 11, 7, 5), (20, 10, 7, 6)]
    for (x, y, w, h) in notes:
        p.rect(x, y, w, h, "dirt_hi")
        for yy in range(y + 2, y + h - 1, 2):
            p.hline(x + 1, yy, w - 2, "dirt_mid")
        p.px(x + w // 2, y, "red")
    return done(p, (2, 25, 28, 3))


def meteor(state, frame=0):
    p = Pix(16, 16)
    if state == "used":
        p.ellipse(1, 8, 14, 7, "dirt_dk")
        p.ellipse(3, 9, 10, 4, "wood_dk")
        p.px(5, 10, "stone_mid")
        return p
    p.ellipse(2, 5, 12, 10, "stone_xdk")
    p.ellipse(3, 5, 9, 7, "stone_dk")
    crystal = ["purple_hi", "blue_hi"][frame]
    p.poly([(6, 1), (8, 7), (5, 8)], "purple")
    p.vline(6, 3, 4, crystal)
    p.poly([(10, 3), (12, 9), (9, 9)], "blue")
    p.vline(10, 5, 3, "white" if frame else "blue_hi")
    p.px(4, 11, "purple_hi")
    return done(p, (1, 12, 14, 4))


def altar(state, frame=0):
    p = Pix(16, 22)
    p.rect(2, 12, 12, 8, "stone_dk" if state == "corrupt" else "stone")
    p.rect(1, 10, 14, 3, "stone_mid" if state == "corrupt" else "stone_hi")
    p.rect(4, 14, 8, 4, "stone_xdk" if state == "corrupt" else "stone_mid")
    if state == "corrupt":
        flame = [["..p...", ".pPp..", "pPWPp.", ".pPp.."], ["...p..", "..pP..", ".pPWp.", ".pPPp."]][frame]
        key = {"p": "purple_dk", "P": "purple", "W": "purple_hi"}
        p.px(7, 15, "red")
        p.px(8, 15, "red")
    else:
        flame = [["..w...", ".wBw..", "wBWBw.", ".wBw.."], ["...w..", "..wB..", ".wBWw.", ".wBBw."]][frame]
        key = {"w": "blue_hi", "B": "white", "W": "white"}
    for y, row in enumerate(flame):
        for x, ch in enumerate(row):
            if ch != ".":
                p.px(x + 5, y + 6, key[ch])
    return done(p, (1, 18, 14, 4))


def moonflower(state, frame=0):
    p = Pix(16, 16)
    # hojas
    p.poly([(7, 14), (3, 10), (6, 11)], "grass_dk")
    p.poly([(8, 14), (13, 10), (10, 11)], "grass_dk")
    p.vline(7, 7, 8, "grass_mid")
    if state == "picked":
        return done(p)
    petal = "blue_hi" if frame == 0 else "white"
    for (x, y) in [(7, 2), (5, 4), (9, 4), (6, 6), (8, 6)]:
        p.rect(x, y, 2, 2, petal)
    p.rect(7, 4, 2, 2, "gold_hi")
    if frame:
        p.px(3, 2, "white")
        p.px(12, 5, "blue_hi")
    return done(p, (3, 13, 10, 3))


def waystone(frame=0):
    p = Pix(16, 26)
    p.poly([(4, 24), (3, 6), (6, 1), (10, 1), (13, 6), (12, 24)], "stone_mid")
    p.poly([(5, 23), (4, 7), (6, 3), (8, 3), (8, 23)], "stone")
    p.vline(6, 4, 6, "stone_hi")
    rune = "blue_hi" if frame == 0 else "white"
    for (x, y) in [(8, 8), (7, 9), (9, 9), (8, 10), (8, 11), (7, 13), (9, 13), (8, 14), (8, 15)]:
        p.px(x, y, rune)
    p.px(5, 21, "grass_mid")
    p.px(11, 22, "grass_mid")
    return done(p, (2, 22, 12, 4))


def padlock():
    p = Pix(10, 11)
    p.box(2, 0, 6, 6, "gold_mid")
    p.box(3, 0, 4, 5, "gold_dk")
    p.rect(1, 4, 8, 6, "gold")
    p.hline(1, 4, 8, "gold_hi")
    p.px(4, 6, "outline")
    p.px(5, 6, "outline")
    p.px(4, 7, "outline")
    p.px(4, 8, "outline")
    return p.outlined()


PORTAL_STYLES = {
    "fortress": dict(stone=["stone_hi", "stone", "stone_mid", "stone_dk"], accent=["red_hi", "red", "red_dk"]),
    "crypt": dict(stone=["dun_hi", "dun", "dun_mid", "dun_dk"], accent=["purple_hi", "purple", "purple_dk"]),
    "forge": dict(stone=["brick_hi", "brick", "brick_mid", "brick_dk"], accent=["fire_hi", "fire", "fire_dk"]),
    "swamp": dict(stone=["moss_hi", "moss", "moss_mid", "moss_dk"], accent=["green_hi", "green", "green_dk"]),
}


def portal(style):
    s = PORTAL_STYLES[style]
    hi, base, mid, dk = s["stone"]
    ahi, acc, adk = s["accent"]
    p = Pix(52, 44)
    # escalinata
    p.rect(8, 38, 36, 4, mid)
    p.hline(8, 38, 36, base)
    p.rect(12, 34, 28, 4, base)
    p.hline(12, 34, 28, hi)
    # cuerpo del pórtico
    p.rect(4, 8, 44, 27, base)
    for y in range(10, 34, 4):
        off = 3 if (y // 4) % 2 else 0
        p.hline(4, y + 3, 44, mid)
        for x in range(4 + off, 48, 7):
            p.vline(x, y, 3, mid)
    p.hline(4, 8, 44, hi)
    # torres laterales
    for tx in (0, 42):
        p.rect(tx, 4, 10, 31, base)
        p.vline(tx, 4, 31, hi)
        p.vline(tx + 9, 4, 31, dk)
        for x in range(tx, tx + 10, 3):
            p.rect(x, 1, 2, 3, base)
            p.px(x, 1, hi)
        p.rect(tx + 3, 12, 4, 10, adk)
        p.rect(tx + 4, 13, 2, 8, acc)
        p.px(tx + 4, 13, ahi)
        p.poly([(tx + 3, 22), (tx + 5, 25), (tx + 7, 22)], adk)
    # frontón con emblema
    p.poly([(12, 8), (26, 0), (40, 8)], mid)
    p.poly([(15, 8), (26, 2), (37, 8)], base)
    p.rect(24, 3, 4, 4, acc)
    p.px(24, 3, ahi)
    # arco y oscuridad
    p.rect(17, 14, 18, 21, dk)
    p.rect(19, 15, 14, 20, "black")
    p.ellipse(17, 10, 18, 10, dk)
    p.ellipse(19, 12, 14, 8, "black")
    p.hline(19, 33, 14, "stone_xdk")
    p.rect(25, 10, 2, 3, acc)
    # peldaños bajando a la oscuridad
    p.hline(21, 28, 10, dk)
    p.hline(22, 31, 8, dk)
    o = p.outlined()
    s_ = Pix(52, 44)
    shadow(s_, 4, 39, 44, 5)
    s_.paste(o)
    return s_


def build(atlas: Atlas):
    atlas.add("table", table())
    atlas.add("throne", throne())
    atlas.add("chest", chest(False))
    atlas.add("chest_open", chest(True))
    atlas.add("bookcase", bookcase())
    atlas.add("rack", rack())
    atlas.add("fireplace0", fireplace(0))
    atlas.add("fireplace1", fireplace(1))
    atlas.add("alchemist0", alchemist(0))
    atlas.add("alchemist1", alchemist(1))
    atlas.add("sarcophagus", sarcophagus(False))
    atlas.add("sarcophagus_open", sarcophagus(True))
    atlas.add("weapons_rack", weapons_rack())
    atlas.add("bush", bush(False))
    atlas.add("bush_cut", bush(True))
    for f in range(3):
        atlas.add(f"campfire{f}", campfire(f))
    atlas.add("anvil_stall", anvil_stall())
    atlas.add("signpost", signpost())
    atlas.add("boulder", boulder())
    atlas.add("stump", stump())
    atlas.add("well", well())
    atlas.add("cage_back", cage("back"))
    atlas.add("cage_front", cage("front"))
    atlas.add("cage_open", cage("open"))
    atlas.add("quest_board", quest_board())
    atlas.add("meteor0", meteor("active", 0))
    atlas.add("meteor1", meteor("active", 1))
    atlas.add("meteor_used", meteor("used"))
    atlas.add("altar0", altar("corrupt", 0))
    atlas.add("altar1", altar("corrupt", 1))
    atlas.add("altar_pure0", altar("pure", 0))
    atlas.add("altar_pure1", altar("pure", 1))
    atlas.add("moonflower0", moonflower("bloom", 0))
    atlas.add("moonflower1", moonflower("bloom", 1))
    atlas.add("moonflower_picked", moonflower("picked"))
    atlas.add("waystone0", waystone(0))
    atlas.add("waystone1", waystone(1))
    atlas.add("padlock", padlock())
    for st in PORTAL_STYLES:
        atlas.add(f"portal_{st}", portal(st))


if __name__ == "__main__":
    a = Atlas(SHEET_WIDTH)
    build(a)
    img, coords = a.build()
    save(img, "objects.png", preview_scale=3)
    print(len(coords), "frames", img.size)

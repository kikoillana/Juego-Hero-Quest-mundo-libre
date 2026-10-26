"""
Genera assets/sprites/char_fx.png: armas rotadas, escudos, estrella de aturdimiento y globos de misión.

Distribución (píxeles artísticos):
    Armas: celdas 48x48, pivote (empuñadura) en el centro (24, 24).
        fila 0 barbarian | 1 dwarf | 2 elf | 3 wizard | 4 astral_blade | 5 dragonslayer_halberd
        columna i = ángulo i * 22.5° (0 = apuntando a la derecha, sentido horario como el canvas)
    y = 288: celdas 16x16
        col 0-3 escudos (barbarian, dwarf, elf, wizard)   col 4 estrella   col 5 chispa
        col 6 globo "!"   col 7 globo "..."   col 8 globo "OK"   col 9 globo gris

    python tools/sprites/gen_char_fx.py
"""

import math
from PIL import Image
from pixel import P, grid, outline, sheet, save

CELL = 48
ANGLES = 16
WEAPONS = ["barbarian", "dwarf", "elf", "wizard", "astral_blade", "dragonslayer_halberd"]

# Armas horizontales (apuntando a la derecha). '@' marca el pivote (se pinta como el color que tenga debajo: 'w').
K = {
    "g": P["gold"], "G": P["gold_hi"], "y": P["gold_mid"],
    "w": P["wood"], "W": P["wood_hi"], "x": P["wood_dk"],
    "m": P["steel"], "M": P["steel_hi"], "n": P["steel_dk"],
    "b": P["blue"], "B": P["blue_hi"], "c": P["water_hi"],
    "r": P["red"], "R": P["red_hi"], "f": P["fire"], "F": P["fire_hi"],
}

ART = {
    # (filas, columna del pivote, fila del pivote)
    "barbarian": ([
        "....g..................",
        "....gnnnnnnnnnnnnnnn...",
        "ywwwgMMMMMMMMMMMMMMMMn.",
        "gxwxgmmmmmmmmmmmmmmmmmn",
        "ywwwgmmmmmmmmmmmmmmmmn.",
        "....gnnnnnnnnnnnnnnn...",
        "....g..................",
    ], 2, 3),
    "dwarf": ([
        "............nMn...",
        "...........nMmmn..",
        "..........nMmmmmn.",
        "..........nMmmmmn.",
        "xwwWwwwwwwwwggmmn.",
        "..........nmmmmmn.",
        "..........nmmmmmn.",
        "...........nmmmn..",
        "............nnn...",
    ], 3, 4),
    "elf": ([
        "....y..............",
        "ywwwgMMMMMMMMMMMMc.",
        "xwxwgcccccccccccccM",
        "....y..............",
    ], 2, 1),
    "wizard": ([
        "..............ygBB.",
        "xwwWwwwwwwwwwwgbBBb",
        "..............ygbb.",
    ], 3, 1),
    "astral_blade": ([
        "....G..................",
        "....GBBBBBBBBBBBBBBB...",
        "ygggGFFFFFFFFFFFFFFFFB.",
        "GxgxGGGGGGGGGGGGGGGGGGB",
        "ygggGFFFFFFFFFFFFFFFFB.",
        "....GBBBBBBBBBBBBBBB...",
        "....G..................",
    ], 2, 3),
    "dragonslayer_halberd": ([
        "....................rnn...",
        "...................nmmmn..",
        "xwwwWwwwwwwwwwwwwwwgmmmMMm",
        "...................nmmmn..",
        "....................rnn...",
    ], 3, 2),
}


def rotate_pixel(img, angle_deg):
    """Rotación estilo "rotsprite" simplificada: ampliar x4, rotar con vecino más cercano y reducir."""
    big = img.resize((img.width * 4, img.height * 4), Image.NEAREST)
    rot = big.rotate(-angle_deg, resample=Image.NEAREST, center=(big.width / 2, big.height / 2))
    return rot.resize((img.width, img.height), Image.NEAREST)


def weapon_cells(name):
    rows, pc, pr = ART[name]
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, ".") for r in rows]
    art = grid(rows, K)
    # Colocar el arte en una celda de 48x48 con el pivote en el centro
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    cell.alpha_composite(art, (CELL // 2 - pc, CELL // 2 - pr))
    out = []
    for i in range(ANGLES):
        out.append(outline(rotate_pixel(cell, i * 360 / ANGLES)))
    return out


SMALL = {
    "shield_barbarian": [
        "..xxxx..",
        ".xWWwwx.",
        "xWwmmwwx",
        "xwmMnmwx",
        "xwmnnmwx",
        "xwwmmwwx",
        ".xwwwwx.",
        "..xxxx..",
    ],
    "shield_dwarf": [
        "..nnnn..",
        ".nMmmmn.",
        "nMmggmmn",
        "nmgGGgmn",
        "nmgGGgmn",
        "nmmggmmn",
        ".nmmmmn.",
        "..nnnn..",
    ],
    "shield_elf": [
        "nnnnnnn",
        "nMMMMMn",
        "nMcBccn",
        "nMBBBcn",
        ".nMBcn.",
        ".nMccn.",
        "..nMn..",
        "...n...",
    ],
    "shield_wizard": [
        "..BBBB..",
        ".B....B.",
        "B..cc..B",
        "B.cBBc.B",
        "B.cBBc.B",
        "B..cc..B",
        ".B....B.",
        "..BBBB..",
    ],
    "star": [
        "...G...",
        "...G...",
        "GGGgGGG",
        ".GgggG.",
        "..GgG..",
        ".Gg.gG.",
        "G.....G",
    ],
    "spark": [
        "..F..",
        ".FGF.",
        "FGFGF",
        ".FGF.",
        "..F..",
    ],
}

BUBBLE = [
    "..wwwwwwwww..",
    ".wwwwwwwwwwwX",
    "wwwwwwwwwwwwX",
    "wwwwwwwwwwwwX",
    "wwwwwwwwwwwwX",
    "wwwwwwwwwwwwX",
    "wwwwwwwwwwwwX",
    ".wwwwwwwwwwX.",
    "..XwwwXXXXX..",
    "...Xww.......",
    "....XX.......",
]
GLYPHS = {
    "excl": (["...", ".r.", ".r.", ".r.", ".r.", "...", ".r."], 5, 1),
    "dots": (["r.r.r"], 4, 4),
    "check": (["....g", "...g.", "g.g..", ".g..."], 4, 2),
    "done": (["....n", "...n.", "n.n..", ".n..."], 4, 2),
}


def bubble(glyph, bg, edge):
    key = {"w": bg, "X": edge}
    b = grid(BUBBLE, key)
    rows, gx, gy = GLYPHS[glyph]
    gk = {"r": P["red"], "g": P["green_dk"], "n": P["stone_mid"]}
    b.alpha_composite(grid(rows, gk), (gx, gy))
    return outline(b)


def small_cell(img):
    c = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    c.alpha_composite(img, ((16 - img.width) // 2, (16 - img.height) // 2))
    return c


if __name__ == "__main__":
    cells = []
    for wname in WEAPONS:
        cells += weapon_cells(wname)
    weapons = sheet(cells, ANGLES, CELL, CELL)

    smalls = []
    for name in ("shield_barbarian", "shield_dwarf", "shield_elf"):
        smalls.append(small_cell(outline(grid(SMALL[name], K))))
    smalls.append(small_cell(grid(SMALL["shield_wizard"], K)))  # aura mágica sin contorno
    smalls.append(small_cell(outline(grid(SMALL["star"], K))))
    smalls.append(small_cell(grid(SMALL["spark"], K)))
    smalls.append(small_cell(bubble("excl", P["gold_hi"], P["gold_mid"])))
    smalls.append(small_cell(bubble("dots", P["white"], P["stone"])))
    smalls.append(small_cell(bubble("check", P["green_hi"], P["green"])))
    smalls.append(small_cell(bubble("done", P["stone"], P["stone_mid"])))

    out = Image.new("RGBA", (weapons.width, weapons.height + 16), (0, 0, 0, 0))
    out.alpha_composite(weapons, (0, 0))
    for i, c in enumerate(smalls):
        out.alpha_composite(c, (i * 16, weapons.height))
    save(out, "char_fx.png", preview_scale=3)
    print("ok", out.size)

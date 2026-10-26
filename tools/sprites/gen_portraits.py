"""
Genera retratos pixel-art de 32x32 en assets/portraits/<id>.png
(barbarian, dwarf, elf, wizard, mentor, gargoyle). El juego los muestra ampliados
con image-rendering: pixelated.

Cada retrato se dibuja como media cara (16 columnas) que se refleja en espejo; después se
añaden detalles asimétricos y un fondo plano con trama.

    python tools/sprites/gen_portraits.py
"""

import os
from PIL import Image
from pixel import P, grid, outline, hex_rgba, ROOT

OUT = os.path.join(ROOT, "assets", "portraits")

SKIN = {"s": P["skin"], "S": P["skin_hi"], "k": P["skin_dk"], "o": P["outline"], "w": P["white"]}

PORTRAITS = {
    "barbarian": dict(
        bg=(P["red_dk"], "#601010"),
        key={**SKIN, "h": "#583018", "H": "#885028", "d": "#381808", "r": P["red"], "R": P["red_hi"],
             "f": P["wood_mid"], "F": P["wood_hi"], "e": P["blue"]},
        half=[
            "................",
            "................",
            "..........dddddd",
            "........ddhhhhhh",
            "......ddhhhHHhhh",
            ".....dhhhHHHhhhh",
            "....dhhhHHhhhhhh",
            "....dhhhhhhhhhhh",
            "...dhhhrrrrrrrrr",
            "...dhhrRRrrrrrrr",
            "...dhhhkSSSSSSSS",
            "...dhhkSSSSSSSSS",
            "...dhhkSooooSSSS",
            "...dhhkSSweSSSSS",
            "...dhhkSSooSSSSk",
            "...ddhkSSSSSSSSk",
            "....dhksSSSSSSkk",
            "....dhkssSSSSSSS",
            "....ddkssSSSkkkk",
            ".....dkksssssSSS",
            "......dkksssssss",
            ".......kkkkkkkkk",
            "........kssSSSSS",
            "....kkssSSSSSSSS",
            "..ksSSSSSSSSSSSS",
            ".ksSSSSSSSSSSSSS",
            "ksSSSSSSSSSSSSSS",
            "ksSSSSSSSSSSSSSS",
            "ksSSSSSSSSSSSSSS",
            "ksSSSSSSSSSSSSSS",
            "ksSSSSSSSSSSSSSS",
            "ksSSSSSSSSSSSSSS",
        ],
        extra=[  # correa de piel cruzando el pecho (x, y, color)
            *[(20 - i, 23 + i, "f") for i in range(9)],
            *[(21 - i, 23 + i, "F") for i in range(9)],
            *[(22 - i, 23 + i, "f") for i in range(9)],
        ],
    ),
    "dwarf": dict(
        bg=(P["blue_dk"], "#202868"),
        key={**SKIN, "m": P["steel"], "M": P["steel_hi"], "n": P["steel_dk"],
             "g": P["gold"], "G": P["gold_hi"], "y": P["gold_mid"], "i": P["dirt_hi"], "I": P["dirt_mid"],
             "b": P["fire_dk"], "B": P["fire"], "x": "#a03810", "e": P["blue"]},
        half=[
            "................",
            "..i.............",
            "..ii............",
            "..iI........nnnn",
            "..iiI.....nnmmmm",
            "...iiI...nmmMMMm",
            "....iiInnmMMmmmm",
            ".....iinmMMmmmmm",
            "......nmMmmmmmmm",
            "......nmmmmmmmmm",
            ".....nggggGGgggg",
            ".....nyyyyyyyyyy",
            "......kSSSSSSSSS",
            "......kSooooSSSS",
            "......kSSweSSSSS",
            "......kSSooSSSSk",
            "......xbSSSSSSkk",
            ".....xbbbSSSSkkk",
            "....xbbBbbbbSSSS",
            "....xbbBBbbbbbbb",
            "...xbbbBbbbbbxbb",
            "...xbbbbBbbbbbbb",
            "...xbbbbbBbbbxbb",
            "..mxbbbbbbbbbbbb",
            ".mmxxbbbbbbbbxbb",
            "mMmmxbbbbBbbbbbb",
            "mMmmmxbbbbbbbxbb",
            "mmmmmxxbbbbbbbbb",
            "mmmmmmxbbbbxbbbb",
            "nmmmmmmxxbbbbbbb",
            "nnmmmmmmmxbbbbbb",
            "nnnmmmmmmmxxbbbb",
        ],
        extra=[],
    ),
    "elf": dict(
        bg=("#205870", "#184050"),
        key={**SKIN, "h": P["gold_hi"], "H": P["white"], "d": P["dirt_mid"],
             "m": P["steel"], "M": P["steel_hi"], "G": P["blue_hi"], "e": P["blue"],
             "a": "#3888a8", "A": "#60b8c8", "z": "#205870", "c": P["purple_dk"], "C": P["purple"]},
        half=[
            "................",
            "................",
            "..........hhhhhh",
            "........hhHHHHHH",
            "......hhHHHhhhhh",
            ".....hHHhhhhhhhh",
            "....hHHhhhhhhhhh",
            "....hHhhhmmmmmmm",
            "...hHhhmmMMmmmGG",
            "...hhhhhkSSSSSSS",
            "...hhhhkSSSSSSSS",
            "...hhhhkSSSSSSSS",
            ".kShhhhkSooooSSS",
            "..kShhhkSSweSSSS",
            "...kShhkSSooSSSS",
            "....hhhkSSSSSSSk",
            "...hhhhhkSSSSSSk",
            "...hhhhhkSSSSSSS",
            "...hhhhhhkSSSSkk",
            "...hhhhhhhkkssss",
            "...hhhhhhhhkksss",
            "...hhhhhhhhhkkkk",
            "...hhhhhhhhhhzaa",
            "..hhhhhhhhhzaaaA",
            "..hhhhhhhczaaaAA",
            "..hhhhhhcczaaAAm",
            "..hhhhhccczaaAmm",
            "..hhhhcccczaaAmM",
            ".hhhhccCcczaaAmM",
            ".hhhcccCcczaaaAm",
            ".hhcccCccczaaaaA",
            ".hcccCcccczaaaaa",
        ],
        extra=[],
    ),
    "wizard": dict(
        bg=(P["purple_dk"], "#381860"),
        key={**SKIN, "a": P["purple"], "A": P["purple_hi"], "z": P["purple_dk"],
             "W": P["stone_hi"], "n": P["stone"], "G": P["gold_hi"], "g": P["gold"], "e": P["blue"]},
        half=[
            "...............a",
            "..............aA",
            ".............aAA",
            "............aAAa",
            "...........aAAaa",
            "..........aAAaaa",
            ".........aAAaaaa",
            "........aAAaaaaa",
            "......zzzzzzzzzz",
            "...zzzzzzzzzzzzz",
            ".....wwwwkSSSSSS",
            "....wwwwkSSSSSSS",
            "....wwwwkSooooSS",
            "....wwwwkSSweSSS",
            "....wwWwkSSooSSS",
            "....wwWwwkSSSSSk",
            "....wwWWwwkSSSkk",
            "....wwWWwwwSSSSS",
            "....wwwWWwwwwwWW",
            ".....wwWWwwwwWWw",
            ".....wwWwwWwwwwW",
            "......wwWwwWwwww",
            "...zaawwwWwwWwww",
            "..zaAaawwwWwwWww",
            ".zaAAaaawwwWwwWw",
            "zaAAaaaaawwwWwww",
            "zaAaaaaaaawwwwWw",
            "zaAaaaaaaaawwwww",
            "zaAaaaaaaaaawwww",
            "zaAaaaaaaaaaawww",
            "zaAaaaaaaaaaaaww",
            "zaAaaaaaaaaaaaaa",
        ],
        extra=[(17, 3, "G"), (18, 2, "G"), (18, 4, "G"), (19, 3, "G"), (18, 3, "g"),
               (12, 6, "G"), (21, 7, "G")],
    ),
    "mentor": dict(
        bg=(P["forest"], P["forest_dk"]),
        key={**SKIN, "a": P["blue"], "A": P["blue_hi"], "z": P["blue_dk"],
             "W": P["stone_hi"], "n": P["stone"], "G": P["gold_hi"], "g": P["gold"], "e": P["wood_dk"]},
        half=[
            "................",
            "................",
            "................",
            "..........zzzzzz",
            "........zzaaaaaa",
            "......zzaaAAAaaa",
            ".....zaaAAaaaaaa",
            "....zaaAaaaaaaaa",
            "....zaaagggggggg",
            "...zaaaawwwwwwww",
            "...zaawwwSSSSSSS",
            "...zaawwkSSSSSSS",
            "...zaawwkSooooSS",
            "...zaawwkSSweSSS",
            "...zaawwkSSooSSS",
            "...zaawwwkSSSSSk",
            "...zaawwWwkSSSkk",
            "...zaawwWWwwSSSS",
            "...zaawwwWWwwwWW",
            "...zaa.wwWWwwWWw",
            "...zaa..wwWwwwwW",
            "..zaaa...wwWwwww",
            "..zaaa...wwwWwww",
            ".zaaAa.zzwwwWwww",
            ".zaaAazaawwwwWww",
            "zaaAaazaaawwwWww",
            "zaaAaazaaaawwwWw",
            "zaAaaazaaaaawwww",
            "zaAaaazaaaaaawww",
            "zaAaaazaaaaaaaww",
            "zaAaaazaaaaaaaaw",
            "zaAaaazaaaaaaaaa",
        ],
        extra=[],
    ),
    "gargoyle": dict(
        bg=("#481010", "#300808"),
        key={"o": P["outline"], "s": P["stone"], "S": P["stone_hi"], "d": P["stone_mid"],
             "D": P["stone_dk"], "e": P["red_hi"], "E": P["fire_hi"], "h": P["dirt_hi"],
             "H": P["dirt_mid"], "w": P["white"], "c": P["stone_xdk"], "v": P["purple_dk"], "V": P["purple"]},
        half=[
            "................",
            "...h............",
            "...hh...........",
            "....hH..........",
            "....hhH.........",
            ".....hhH...sssss",
            "......hhHssSSSSs",
            ".......hsSSSssss",
            ".......sSSssssss",
            "......sSSsssssss",
            "......sSssssssss",
            "......sssddddsss",
            "......ssddeeEdss",
            "......ssdeeEEdss",
            "......ssdddddsss",
            "......sssssssdss",
            "......ssssssddss",
            "......sddccccccc",
            "......sdcwcwwcww",
            "......sdcccccccc",
            "......sddcwwcwwc",
            ".......sddcccccc",
            "...V....sddddddd",
            "..VvV...Dsssssss",
            ".VvvvV.DSSssssss",
            "VvvvvVDSSsssssss",
            "VvvvvDSSssssdsss",
            "VvvvDSSsssssdsss",
            "VvvDSSsssssddsss",
            "VvDSSsssssdsssss",
            "VDSSsssssdssssss",
            "DSSsssssdsssssss",
        ],
        extra=[],
    ),
}


def mirror_rows(half):
    return [h + h[::-1] for h in half]


def build(pid):
    spec = PORTRAITS[pid]
    rows = mirror_rows(spec["half"])
    rows = [list(r) for r in rows]
    for x, y, ch in spec["extra"]:
        if rows[y][x] != ".":
            rows[y][x] = ch
    face = grid(["".join(r) for r in rows], spec["key"])
    face = outline(face)
    bg = Image.new("RGBA", (32, 32), hex_rgba(spec["bg"][0]))
    px = bg.load()
    dark = hex_rgba(spec["bg"][1])
    for y in range(32):
        for x in range(32):
            # trama ordenada en la mitad inferior, plano arriba
            if y > 16 and (x + y) % 2 == 0 and (y > 24 or (x // 2 + y) % 3 == 0):
                px[x, y] = dark
    bg.alpha_composite(face)
    return bg


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    prev = os.environ.get("SPRITE_PREVIEW_DIR")
    strip = Image.new("RGBA", (34 * len(PORTRAITS), 32), (0, 0, 0, 0))
    for i, pid in enumerate(PORTRAITS):
        img = build(pid)
        img.save(os.path.join(OUT, f"{pid}.png"))
        strip.alpha_composite(img, (i * 34, 0))
    if prev:
        os.makedirs(prev, exist_ok=True)
        strip.resize((strip.width * 6, strip.height * 6), Image.NEAREST).save(os.path.join(prev, "portraits.png"))
    print("ok")

"""
Genera las hojas de sprites de los 4 héroes (16x24 por fotograma).

Hoja: assets/sprites/hero_<id>.png  (96 x 72)
    filas    : 0 = abajo (frente), 1 = arriba (espalda), 2 = lado (mirando a la derecha; izquierda = espejo)
    columnas : 0 = reposo, 1-4 = ciclo de paso, 5 = ataque (estocada)
El contorno exterior se añade automáticamente con outline(); el ASCII solo lleva detalles internos.

    python tools/sprites/gen_heroes.py
"""

from PIL import Image
from pixel import P, grid, outline, sheet, save, hex_rgba

FW, FH = 16, 24

# ---------------------------------------------------------------------------
# Paletas por héroe (letras del ASCII -> color)
# ---------------------------------------------------------------------------
BASE = {
    "o": P["outline"],
    "s": P["skin"], "S": P["skin_hi"], "k": P["skin_dk"],
    "w": P["white"],
}

KEYS = {
    "barbarian": {
        **BASE,
        "h": "#583018", "H": "#885028", "d": "#381808",   # melena castaña oscura
        "r": P["red"], "R": P["red_hi"],                 # cinta / taparrabos
        "f": P["wood_mid"], "F": P["wood_hi"],           # correa de piel
        "x": P["wood_dk"], "G": P["gold"], "g": P["gold_mid"],
        "p": P["wood_mid"], "b": P["wood_dk"], "B": P["wood"],  # piernas / botas
    },
    "dwarf": {
        **BASE,
        "i": P["dirt_hi"], "I": P["dirt_mid"],           # cuernos de marfil
        "m": P["steel"], "M": P["steel_hi"], "n": P["steel_dk"],
        "G": P["gold_hi"], "g": P["gold"], "y": P["gold_mid"],
        "b": P["fire_dk"], "B": P["fire"], "x": "#a03810",  # barba pelirroja
        "a": P["blue"], "A": P["blue_hi"], "z": P["blue_dk"],
        "c": P["wood_dk"], "C": P["wood_mid"],
        "p": P["blue_dk"], "q": P["wood_dk"], "Q": P["wood_mid"],
    },
    "elf": {
        **BASE,
        "h": P["gold_hi"], "H": P["white"], "d": P["dirt_mid"],   # melena platino
        "m": P["steel"], "M": P["steel_hi"], "G": P["blue_hi"],
        "a": "#3888a8", "A": "#60b8c8", "z": "#205870",           # túnica turquesa
        "c": P["purple_dk"], "C": P["purple"],                     # capa ciruela
        "x": P["wood_dk"], "X": P["wood_mid"],
        "p": P["stone_mid"], "q": P["wood_dk"], "Q": P["wood_mid"],
    },
    "wizard": {
        **BASE,
        "a": P["purple"], "A": P["purple_hi"], "z": P["purple_dk"],  # túnica y sombrero
        "W": P["stone_hi"], "n": P["stone"],                           # barba
        "G": P["gold_hi"], "g": P["gold"], "y": P["gold_mid"],
        "b": P["blue"], "B": P["blue_hi"],
        "q": P["wood_dk"], "Q": P["wood_mid"],
    },
}

# ---------------------------------------------------------------------------
# Cuerpos (filas 0-18). Las piernas (filas 19-22) se generan aparte.
# ---------------------------------------------------------------------------
BODIES = {
    "barbarian": {
        "down": [
            "................",
            "................",
            ".....dhhhhd.....",
            "...dhhHHhhhhd...",
            "..dhhHHhhhhhhd..",
            "..dhHhhhhhhhhd..",
            "..drrRrrrrrrrd..",
            "..dhSSSSSSSShd..",
            "..dhSoSSSSoShd..",
            "..dhSoSSSSoshd..",
            "..ddsSSkkSSsdd..",
            "...ddsssssskdd..",
            ".kSSsSSSSSSsSSk.",
            ".sSosSfFSSSsoSs.",
            ".sSoSSSfFSSSoSs.",
            ".ssoSSSSfFSSoss.",
            ".kSoxxxxGgxxoSk.",
            ".SSorrRrrrrroSS.",
            "...orrrRrrrro...",
        ],
        "up": [
            "................",
            "................",
            ".....dhhhhd.....",
            "...dhhHHhhhhd...",
            "..dhhHHhhhhhhd..",
            "..dhHhhhhhhhhd..",
            "..drrrrrrrrrrd..",
            "..dhhhhrRhhhhd..",
            "..dhhhhRrhhhhd..",
            "..dhhhhhhhhhhd..",
            "..ddhhhhhhhhdd..",
            "...ddhhhhhhdd...",
            ".kSSsSSSSSSsSSk.",
            ".sSoSSSSSSfFoSs.",
            ".sSoSSSSSfFSoSs.",
            ".ssoSSSSfFSSoss.",
            ".kSoxxxxxxxxoSk.",
            ".SSorrrrrrrroSS.",
            "...orrrrrrrro...",
        ],
        "side": [
            "................",
            "................",
            "....dhhhhd......",
            "...dhHHhhhhd....",
            "..dhHHhhhhhhd...",
            "..dhhhhhhhhhd...",
            "..dhrrrrrRrrr...",
            "..dhhhhSSSSSd...",
            "..dhhhSSSSoSS...",
            "..dhhhSSSSoSSS..",
            "..ddhhhSSSkSs...",
            "...ddhhsssss....",
            "....kSSSSSSk....",
            "....sSSfFSSs....",
            "....sSoSfFSs....",
            "....sSoSSfFs....",
            "....xxoxxGxx....",
            "....rSSrrrRr....",
            ".....rrrrrr.....",
        ],
    },
    "dwarf": {
        "down": [
            "................",
            ".i............i.",
            ".ii...nnnn...ii.",
            "..ii.nmMMmn.ii..",
            "...inmMMmmmni...",
            "...nmmmmmmmmn...",
            "...nggGggggyn...",
            "...kSSSSSSSSk...",
            "...kSoSSSSoSk...",
            "...xbSSkkSSbx...",
            "..xbBbbssbbBbx..",
            ".mxbbBbbbbBbbxm.",
            ".Mmxbbbbbbbbxmm.",
            ".mmnxbBbbBbxnmm.",
            ".mmnaxbbbbxanmn.",
            ".ssnaaxbbxaanss.",
            "...ncccgGcccn...",
            "...naaAaaaaan...",
            "...naaaaaaaan...",
        ],
        "up": [
            "................",
            ".i............i.",
            ".ii...nnnn...ii.",
            "..ii.nmMMmn.ii..",
            "...inmMMmmmni...",
            "...nmmmmmmmmn...",
            "...nggggggggn...",
            "...xbbbbbbbbx...",
            "...xbBbbbbbbx...",
            "...xbbbbbbbbx...",
            "..mxbbbbbbbbxm..",
            ".mMmxxbbbbxxmmm.",
            ".Mmmmmmmmmmmmmm.",
            ".mmnMmmmmmmmnmm.",
            ".mmnmmmmmmmmnmn.",
            ".ssnmmmmmmmmnss.",
            "...ncccccccccn..",
            "...naaaaaaaan...",
            "...naaaaaaaan...",
        ],
        "side": [
            "................",
            "...........i....",
            "..........ii....",
            ".....nnnn.i.....",
            "...nmMMmmni.....",
            "...nmmmmmmmn....",
            "...nggggGggyn...",
            "...nnmkSSSSS....",
            "...nnmkSSoSS....",
            "...nnxbSSSSSk...",
            "....xbbBbbbb....",
            "...mxbbBbbbbb...",
            "...mmxbbbbbbb...",
            "...mmnxbbBbbx...",
            "...mMnaxbbbx....",
            "...mmnssabbx....",
            "...ncccccgGc....",
            "...naaaaaAaa....",
            "...naaaaaaaa....",
        ],
    },
    "elf": {
        "down": [
            "................",
            "................",
            ".....hHHHHh.....",
            "...hhHHHHHHhh...",
            "..hhHHhhhhHHhh..",
            "..hmmmmGGmmmmh..",
            "..hhSSSSSSSShh..",
            ".shhSoSSSSoShhs.",
            ".shhSoSSSSoShhs.",
            "..hhsSSSSSSshh..",
            "..hhhsSkkSshhh..",
            "..hhhhssssshhh..",
            ".hhczaAAAAazchh.",
            ".hczaAAmmAAazch.",
            "..czaaAmmAaazc..",
            ".sczoaaAAaaozcs.",
            "..czoxxXmxxozc..",
            "...czaaaaaazc...",
            "...czaaaaaazc...",
        ],
        "up": [
            "................",
            "................",
            ".....hHHHHh.....",
            "...hhHHHHHHhh...",
            "..hhHHhhhhHHhh..",
            "..hmmmmmmmmmmh..",
            "..hhHhhdhhHhhh..",
            ".shHhhdhhHhdhhs.",
            ".shhhdhhHhhdhhs.",
            "..hhhdhHhhhdhh..",
            "..dhhdhhhhhdhd..",
            "..dhdhhhdhhhdd..",
            ".cchhhhhhhhhhcc.",
            ".cCchhhhhhhhcCc.",
            "..cCcdhhhhdcCc..",
            ".scCccccccccCcs.",
            "..cCccCccccCcc..",
            "...cCccccCccc...",
            "...cccCcccccc...",
        ],
        "side": [
            "................",
            "................",
            ".....hHHHHh.....",
            "....hHHHHHHh....",
            "...hHHhhhhHHh...",
            "...hmmmmmmmGm...",
            "...hhhhSSSSSS...",
            "...hhhhsSSoSS...",
            "...hhhssSSoSS...",
            "...hhhhsSSSSk...",
            "...hhhhhssss....",
            "...hhhhhhs......",
            "...chzaAAAa.....",
            "...chzaAmmAa....",
            "...cczaoAmAa....",
            "...cczaosaaa....",
            "...cczxxXmxx....",
            "...ccczaaaaa....",
            "....cczaaaaa....",
        ],
    },
    "wizard": {
        "down": [
            "................",
            ".......aa.......",
            "......aAAa......",
            "......aAGaa.....",
            ".....aAAaaa.....",
            "....aAAaaaaa....",
            "..zzzzzzzzzzzz..",
            "...wSSSSSSSSw...",
            "...wSoSSSSoSw...",
            "...wSSSkkSSSw...",
            "...wwWWWWWWww...",
            "..zawWwwwwWwaz..",
            ".zaAawWwwWwaAaz.",
            ".zaAaawWWwaaAaz.",
            ".saAaaawwaaaAas.",
            "..zaGggggggGaz..",
            "..zaAaaaaaaaaz..",
            "..zaAaaaaaaaaz..",
            "..zaAaaaaaaaaz..",
        ],
        "up": [
            "................",
            ".......aa.......",
            "......aAAa......",
            "......aAaaa.....",
            ".....aAAaaa.....",
            "....aAAaaaaa....",
            "..zzzzzzzzzzzz..",
            "...wwwwwwwwww...",
            "...wwWwwwwwww...",
            "...wwwWwwwwww...",
            "...zwwwwwwwwz...",
            "..zaawwwwwwaaz..",
            ".zaAaaaaaaaaAaz.",
            ".zaAaaaaaaaaAaz.",
            ".saAaaaaaaaaAas.",
            "..zaGggggggGaz..",
            "..zaAaaaaaaaaz..",
            "..zaAaaaaaaaaz..",
            "..zaAaaaaaaaaz..",
        ],
        "side": [
            "................",
            "......aa........",
            ".....aAAa.......",
            ".....aAaGa......",
            "....aAAaaa......",
            "....aAAaaaa.....",
            "..zzzzzzzzzzzz..",
            "....wwwSSSSS....",
            "....wwwSSoSS....",
            "....wwwSSSSSk...",
            "....wwwWWWWW....",
            "....zawWwwWw....",
            "...zaAawwWww....",
            "...zaAaawWw.....",
            "...zaAasaww.....",
            "...zaGgggggz....",
            "...zaAaaaaaz....",
            "...zaAaaaaaaz...",
            "...zaAaaaaaaz...",
        ],
    },
}

LEG_COLORS = {
    "barbarian": ("p", "b", "B"),
    "dwarf": ("p", "q", "Q"),
    "elf": ("p", "q", "Q"),
    "wizard": (None, "q", "Q"),  # túnica larga: solo asoman los pies
}


def _put(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), hex_rgba(color))


def draw_legs(img, hero, view, frame):
    """Piernas procedurales (filas 19-22). frame: 0 reposo, 1-4 ciclo de paso."""
    key = KEYS[hero]
    pant_k, boot_k, boot_hi_k = LEG_COLORS[hero]
    pant = key[pant_k] if pant_k else None
    boot, boot_hi = key[boot_k], key[boot_hi_k]
    top = 19

    if hero == "wizard":
        # Bajo de la túnica con vuelo + pies alternos
        robe, robe_hi, robe_dk = key["a"], key["A"], key["z"]
        sway = {0: 0, 1: 1, 2: 0, 3: -1, 4: 0}[frame]
        if view == "side":
            for y in range(top, top + 2):
                for x in range(3 + sway, 12 + sway):
                    _put(img, x, y, robe_dk if x == 3 + sway else robe)
            fx = {0: (6, 8), 1: (5, 9), 2: (6, 8), 3: (5, 9), 4: (6, 8)}[frame]
            for x in fx:
                _put(img, x, top + 2, boot)
                _put(img, x + 1, top + 2, boot_hi)
        else:
            for y in range(top, top + 2):
                for x in range(2 + (sway if y == top + 1 else 0), 14 + (sway if y == top + 1 else 0)):
                    c = robe_dk if x in (2, 13) else (robe_hi if x == 4 else robe)
                    _put(img, x, y, c)
            lift_l = frame == 1
            lift_r = frame == 3
            for (x0, lifted) in ((4, lift_l), (9, lift_r)):
                yb = top + 2 - (1 if lifted else 0)
                for x in range(x0, x0 + 3):
                    _put(img, x, yb, boot_hi if x == x0 else boot)
        return

    leg_len = 3 if hero == "dwarf" else 4  # el enano tiene las piernas más cortas

    if view in ("down", "up"):
        lift_l = frame == 1
        lift_r = frame == 3
        for (x0, lifted) in ((4, lift_l), (9, lift_r)):
            bottom = top + leg_len - 1 - (1 if lifted else 0)
            for y in range(top, bottom + 1):
                is_boot = y >= bottom - 1
                for x in range(x0, x0 + 3):
                    if is_boot:
                        c = boot_hi if (x == x0 and y == bottom - 1) else boot
                    else:
                        c = pant
                    _put(img, x, y, c)
            # puntera ensanchada (perspectiva cenital)
            _put(img, x0 - 1 if x0 == 4 else x0 + 3, bottom, boot)
    else:  # side
        stride = {0: 0, 1: 2, 2: 0, 3: -2, 4: 0}[frame]
        legs = [(6 - stride, True), (7 + stride, False)]  # (x, atrás?)
        for x0, back in legs:
            bottom = top + leg_len - 1
            for y in range(top, bottom + 1):
                is_boot = y >= bottom - 1
                for x in range(x0, x0 + 3):
                    c = (boot if is_boot else pant)
                    if back and not is_boot:
                        c = key.get("z", pant) if hero != "barbarian" else P["wood_dk"]
                    _put(img, x, y, c)
            _put(img, x0 + 3, bottom, boot)  # punta del pie hacia delante
            _put(img, x0 + 3, bottom - 1, boot_hi)


def build_frame(hero, view, frame):
    rows = BODIES[hero][view]
    for r in rows:
        assert len(r) == FW, (hero, view, r, len(r))
    body = grid(rows, KEYS[hero])
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    legs = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    draw_legs(legs, hero, view, frame if frame < 5 else (1 if view == "side" else 0))
    # Balanceo vertical: en los pasos con un pie levantado el cuerpo sube 1 px
    bob = -1 if frame in (2, 4) else 0
    lunge = 0
    if frame == 5:  # estocada: el cuerpo se inclina hacia delante
        if view == "side":
            lunge = 1
        else:
            bob = 1 if view == "down" else -1
    if frame in (1, 3):
        bob = 1  # al apoyar un solo pie el cuerpo baja 1 px
    elif frame in (2, 4):
        bob = 0
    img.alpha_composite(legs, (0, 0))
    img.alpha_composite(body, (lunge, max(0, bob)))
    # piernas delante del faldón solo en los píxeles vacíos -> ya cubierto por orden
    return outline(img, P["outline"])


def build_sheet(hero):
    frames = []
    for view in ("down", "up", "side"):
        for f in range(6):
            frames.append(build_frame(hero, view, f if f < 5 else 5))
    return sheet(frames, 6, FW, FH)


if __name__ == "__main__":
    for hero in ("barbarian", "dwarf", "elf", "wizard"):
        save(build_sheet(hero), f"hero_{hero}.png", preview_scale=6)
    print("ok")

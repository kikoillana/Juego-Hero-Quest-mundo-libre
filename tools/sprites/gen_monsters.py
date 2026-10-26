"""
Genera las hojas de sprites de los monstruos.

    assets/sprites/mon_<tipo>.png
        filas    : 0 = abajo, 1 = arriba, 2 = lado (derecha)      [+3 filas: variante élite dorada]
        columnas : 0 = reposo, 1 = paso A, 2 = paso B, 3 = amago (telegrafiado)
    Tamaños de fotograma: goblin 16x16, orc/skeleton 16x24, fimir 20x24, gargoyle 32x32.
    La gárgola añade 3 filas más con la paleta enfurecida (fase 2-3 del jefe).

    python tools/sprites/gen_monsters.py
"""

from PIL import Image
from pixel import P, grid, outline, sheet, save, recolor, hex_rgba

BASE = {"o": P["outline"], "w": P["white"]}

MON = {}

# ---------------------------------------------------------------------------
# GOBLIN — 16x16, piel verde, orejas largas, harapos y daga
# ---------------------------------------------------------------------------
MON["goblin"] = dict(
    size=(16, 16), legs=dict(top=12, length=3, xl=5, xr=8, w=3),
    key={**BASE, "g": P["grass_mid"], "G": P["grass_hi"], "k": P["grass_dk"],
         "y": P["gold_hi"], "b": P["wood_mid"], "B": P["wood_hi"], "x": P["wood_dk"],
         "m": P["steel"], "M": P["steel_hi"], "p": P["grass_dk"], "f": P["wood_dk"]},
    down=[
        "................",
        "................",
        "......gggg......",
        "....gGGggggg....",
        ".gg.gGgggggg.gg.",
        "..gggyoggoyggg..",
        "...ggggkkgggg...",
        "...gwgkkkkgwg...",
        "....gggggggg....",
        "...xbbbbbbbbxM..",
        "..gxbBbbbbbbxgm.",
        "...xbbbbbbbbxm..",
    ],
    up=[
        "................",
        "................",
        "......gggg......",
        "....gGGggggg....",
        ".gg.gGgggggg.gg.",
        "..ggggGggggggg..",
        "...gggggggggg...",
        "...ggggkkgggg...",
        "....gggggggg....",
        "..Mxbbbbbbbbx...",
        ".mgxbbbbbbbbxg..",
        "..mxbbBbbbbbx...",
    ],
    side=[
        "................",
        "................",
        "......gggg......",
        "....gGGgggg.....",
        "gggggGggggggg...",
        ".ggggggggyogg...",
        "...gggggggggkk..",
        "....ggggggkwk...",
        ".....gggggg.....",
        ".....xbbbbx.M...",
        ".....xbBbgbgm...",
        ".....xbbbbx.....",
    ],
)

# ---------------------------------------------------------------------------
# ORCO — 16x24, piel verde oscura, colmillos, hombreras de pinchos y cuchilla
# ---------------------------------------------------------------------------
MON["orc"] = dict(
    size=(16, 24), legs=dict(top=19, length=4, xl=4, xr=9, w=3),
    key={**BASE, "g": P["forest"], "G": P["grass_mid"], "k": P["forest_dk"],
         "e": P["red_hi"], "r": P["red"], "R": P["red_hi"], "z": P["red_dk"],
         "m": P["steel"], "M": P["steel_hi"], "n": P["steel_dk"],
         "x": P["wood_dk"], "b": P["wood_mid"], "p": P["wood_dk"], "f": P["outline"]},
    down=[
        "................",
        "................",
        "................",
        ".....gggggg.....",
        "....gGGggggg....",
        "...gGgggggggg...",
        "...gkkkggkkkg...",
        "...gkeoggoekg...",
        "...ggggkkgggg...",
        "...gwgkkkkgwg...",
        "....gwggggwg....",
        ".nMn.gggggg.nMn.",
        "nmmmnrrrrrrnmmmn",
        ".nmGzrRrrrrzGmn.",
        "..GgzrRrrrrzgG..",
        "..ggzrrrrrrzgM..",
        "..kgxxxmmxxxgM..",
        "...zrrzrrzrrnM..",
        "...zrrzrrzrr.n..",
    ],
    up=[
        "................",
        "................",
        "................",
        ".....gggggg.....",
        "....gGGggggg....",
        "...gGgggggggg...",
        "...gggggggggg...",
        "...gGgggggggg...",
        "...ggggggggkg...",
        "...gggggggggg...",
        "....kggggggk....",
        ".nMn.gggggg.nMn.",
        "nmmmnrrrrrrnmmmn",
        ".nmGzrrrrrrzGmn.",
        "..GgzrrrrrRzgG..",
        "..MgzrrrrrrzgG..",
        "..Mgxxxxxxxxgk..",
        "..Mzrrzrrzrrz...",
        "..n.rrzrrzrrz...",
    ],
    side=[
        "................",
        "................",
        "................",
        ".....gggggg.....",
        "....gGGggggg....",
        "....gGgggggggg..",
        "....ggggkkkkg...",
        "....ggggggoeg...",
        "....gggggggggk..",
        "....kgggggkwgg..",
        ".....kggggggw...",
        "....nMn.ggg.....",
        "...nmmmnrrrr....",
        "....nmnzRrrGgM..",
        "....zrrzRrrgGM..",
        "....zrrzrrrrgM..",
        "....xxxxxmmx.n..",
        "....zrrzrrzr....",
        ".....rrzrrzr....",
    ],
)

# ---------------------------------------------------------------------------
# ESQUELETO — 16x24, huesos, ojos azules y espada oxidada
# ---------------------------------------------------------------------------
MON["skeleton"] = dict(
    size=(16, 24), legs=dict(top=19, length=4, xl=5, xr=8, w=2, bone=True),
    key={**BASE, "b": P["stone_hi"], "B": P["white"], "s": P["stone"], "d": P["stone_mid"],
         "e": P["blue_hi"], "m": P["steel"], "M": P["steel_hi"], "n": P["steel_dk"],
         "x": P["wood_dk"], "c": P["purple_dk"], "p": P["stone_hi"], "f": P["stone"]},
    down=[
        "................",
        "................",
        "................",
        ".....bbbbbb.....",
        "....bBBbbbbb....",
        "....bBbbbbbbs...",
        "....boobbooss...",
        "....boebboesd...",
        "....bbbsdbbbs...",
        ".....bdbdbds....",
        "......bbbbs.....",
        ".......dd.......",
        "...bbbbbbbbbb...",
        "...b.bdbbdb.b...",
        "...b.bdbbdb.bM..",
        "...s..bddb..sM..",
        "..bb..bbbb..bxx.",
        "......cccc...M..",
        "......c..c...n..",
    ],
    up=[
        "................",
        "................",
        "................",
        ".....bbbbbb.....",
        "....bBBbbbbb....",
        "....bBbbbbbbs...",
        "....bbbbbbbbs...",
        "....bbbbbbbbs...",
        "....sbbbbbbbs...",
        ".....sbbbbss....",
        "......sbbs......",
        ".......dd.......",
        "...bbbbbbbbbb...",
        "...b..bddb..b...",
        "..Mb..bddb..b...",
        "..Ms..bddb..s...",
        ".xxb..bbbb..bb..",
        "..M...cccc......",
        "..n...c..c......",
    ],
    side=[
        "................",
        "................",
        "................",
        ".....bbbbbb.....",
        "....bBBbbbbb....",
        "....bBbbbbbbb...",
        "....bbbbbboob...",
        "....sbbbbboeb...",
        "....sbbbbbbbs...",
        ".....sbbbdbdb...",
        "......sbbbbb....",
        ".......dd.......",
        "......bbbbb.....",
        "......bdbdb.....",
        "......bdbdbbM...",
        "......bbdbbxM...",
        ".......bbbbxM...",
        ".......cccc.M...",
        ".......c..c.n...",
    ],
)

# ---------------------------------------------------------------------------
# FIMIR — 20x24, reptil de un solo ojo, cola y garrote
# ---------------------------------------------------------------------------
MON["fimir"] = dict(
    size=(20, 24), legs=dict(top=19, length=4, xl=6, xr=11, w=3),
    key={**BASE, "t": "#389078", "T": "#58b898", "k": "#205848",
         "y": P["gold_hi"], "e": P["red"], "a": P["wood_mid"], "A": P["wood_hi"], "z": P["wood_dk"],
         "c": P["wood"], "C": P["wood_hi"], "x": P["wood_dk"], "m": P["stone_mid"],
         "p": "#205848", "f": P["outline"]},
    down=[
        "....................",
        "....................",
        ".......tttttt.......",
        "......tTTttttt......",
        ".....tTtttttttt.....",
        ".....ttttyyyttt.....",
        ".....tttyyeyytt.....",
        ".....tttyyyyytt.....",
        "......ttkkkkkt......",
        "......twkwwkwt......",
        ".......tttttt.......",
        "....ttzaaaaaazttCx..",
        "...tTtzaAaaaazttCc..",
        "...tttzaAaaaaztCcx..",
        "...ttzzzzmmzzzzcc...",
        "....tzaaaaaaaaztx...",
        ".....zaaaaaaaaz.....",
        "......zaaaaaaz......",
        ".......tttttt.......",
    ],
    up=[
        "....................",
        "....................",
        ".......tttttt.......",
        "......tTTttttt......",
        ".....tTtttttttt.....",
        ".....ttTtttkttt.....",
        ".....tttTtkttt......",
        ".....ttttkttttt.....",
        "......ttkttttt......",
        "......tkttttkt......",
        ".......tttttt.......",
        "..xCttzaaaaaaztt....",
        "..cCttzaaaaaaztTt...",
        "..xcCtzaaaaaazttt...",
        "...cczzzzzzzzzztt...",
        "...xtzaaaaaaaazt....",
        ".....zaaaaaaaaz.....",
        "......zaaaaaazkk....",
        ".......ttttttkkTk...",
    ],
    side=[
        "....................",
        "....................",
        "........tttttt......",
        ".......tTTtttttt....",
        "......tTtttttttt....",
        "......tttttttyyy....",
        "......ttttttyyeyt...",
        "......ttttttyyyy....",
        ".......tttttkkkktt..",
        ".......tttttwkwkt...",
        "........ttttttt.....",
        ".......zaaaaatt.Cx..",
        "......tzaAaaatTtCc..",
        "......tzaAaaatttCx..",
        "......zzzmmzzzttc...",
        ".kk...zaaaaaaz.x....",
        "kTkk..zaaaaaaz......",
        ".kkkkkzaaaaaz.......",
        "....kktttttt........",
    ],
)

# ---------------------------------------------------------------------------
# GÁRGOLA (jefe) — 32x32, piedra con alas membranosas, cuernos y ojos rojos
# ---------------------------------------------------------------------------
MON["gargoyle"] = dict(
    size=(32, 32), legs=dict(top=26, length=5, xl=11, xr=17, w=4),
    key={**BASE, "s": P["stone"], "S": P["stone_hi"], "d": P["stone_mid"], "D": P["stone_dk"],
         "e": P["red_hi"], "E": P["fire_hi"], "h": P["dirt_hi"], "H": P["dirt_mid"],
         "v": P["purple_dk"], "V": P["purple"], "c": P["stone_xdk"], "p": P["stone_mid"], "f": P["stone_dk"]},
    down=[
        "................................",
        "................................",
        "........h..............h........",
        "........hh............hh........",
        ".........hH..........Hh.........",
        "..........hHssssssssHh..........",
        "..DD.....sSSSssssssssss.....DD..",
        ".DVVD....sSssssssssssss....DVVD.",
        "DVvVVD...sddsssssssddss...DVVvVD",
        "DVvvVVD..sdeEdssssdEedd..DVVvvVD",
        "DVvvvVVD.sdddddsddddddd.DVVvvvVD",
        "DVvvvvVVDssddcccccccdds.VVvvvvVD",
        "DVvvvvvVVDsdcwdwwdwcdsDVVvvvvvVD",
        "DVvvvvvvVVDsdcccccccdDVVvvvvvvVD",
        "DVvvvvvvvVVDsdddddddDVVvvvvvvvVD",
        "DVvDvvvvvvVSSssssssssVvvvvvvDvVD",
        "DVD.DvvvvvSSssSssSsssSvvvvvD.DVD",
        "DD...DvvvSSsssddddsssSSvvvD...DD",
        "......DDSsssdddddddddsssDD......",
        "........SssdddddddddddsS........",
        ".......SsdsdddddddddddsdS.......",
        "......SsdDsddddddddddsDdsS......",
        "......sdd.Dsdddddddddsd.ddS.....",
        "......ccc..DsdddddddsdD..ccc....",
        ".....c.c.c..DsddddddsD..c.c.c...",
        "..............dddddd............",
    ],
    up=[
        "................................",
        "................................",
        "........h..............h........",
        "........hh............hh........",
        ".........hH..........Hh.........",
        "..........hHssssssssHh..........",
        "..DD.....sSSSssssssssss.....DD..",
        ".DVVD....sSssssssssssss....DVVD.",
        "DVvVVD...sSsssssssssssd...DVVvVD",
        "DVvvVVD..sdsssssssssssd..DVVvvVD",
        "DVvvvVVD.sdsssssssssdsd.DVVvvvVD",
        "DVvvvvVVDssdddssssdddds.VVvvvvVD",
        "DVvvvvvVVDsddddddddddsDVVvvvvvVD",
        "DVvvvvvvVVDsdddddddddDVVvvvvvvVD",
        "DVvvvvvvvVVDdVVddddVVdVvvvvvvvVD",
        "DVvDvvvvvvVVVvVddddVvVVvvvvvDvVD",
        "DVD.DvvvvvVVvvVddddVvvVVvvvD.DVD",
        "DD...DvvvVVvvvVddddVvvvVvvD...DD",
        "......DDSsssdddddddddsssDD......",
        "........SssdddddddddddsS........",
        ".......SsdsdddddddddddsdS.......",
        "......SsdDsddddddddddsDdsS......",
        "......sdd.Dsdddddddddsd.ddS.....",
        "......ccc..DsdddddddsdD..ccc....",
        ".....c.c.c..DsddddddsD..c.c.c...",
        "..............dddddd............",
    ],
    side=[
        "................................",
        "................................",
        "................................",
        "...........h....................",
        "...........hh...................",
        "............hHsssssss...........",
        "...........sSSSsssssss..........",
        "..........sSsssssssssss.........",
        "...D......sSsssssssddeE.........",
        "..DVD.....ssssssssdddEd.........",
        ".DVvVD....sdsssssssdddsss.......",
        ".DVvvVD...sddssssscccccs........",
        "DVvvvVVD...sdddssscwdwc.........",
        "DVvvvvVVD...sddddsccccc.........",
        "DVvvvvvVVD..ssdddddddd..........",
        "DVvvvvvvVVDSSssssssss...........",
        "DVvDvvvvvVSSssSssSsssS..........",
        "DVD.DvvvvSSsssdddsssssSS........",
        "DD...DDvSSssddddddddsssdS.......",
        "........SssdddddddddddsdS.......",
        "........SsdsdddddddddsDdS.......",
        "........sdsDsdddddddsd.ccc......",
        "........cc..DsddddddsD.c.c.c....",
        "............DsdddddsD...........",
        "..............dddddd............",
        "................................",
    ],
)

RAGE = {  # paleta enfurecida de la gárgola (fases 2-3)
    P["stone"]: P["brick"] if "brick" in P else P["red"],
    P["stone_hi"]: P["red_hi"],
    P["stone_mid"]: P["red_dk"],
    P["purple_dk"]: P["fire_dk"],
    P["purple"]: P["fire"],
}

ELITE = {  # variante de jefe secundario (armadura / ropaje dorado)
    P["wood_mid"]: P["gold_mid"], P["wood_hi"]: P["gold_hi"], P["wood_dk"]: P["gold_dk"],
    P["red"]: P["gold"], P["red_hi"]: P["gold_hi"], P["red_dk"]: P["gold_mid"],
    P["purple_dk"]: P["gold_mid"],
}


def _put(img, x, y, c):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), hex_rgba(c))


def draw_legs(img, spec, key, view, frame):
    L = spec["legs"]
    top, length, xl, xr, w = L["top"], L["length"], L["xl"], L["xr"], L["w"]
    leg_c = key["p"]
    foot_c = key["f"]
    if view == "side":
        stride = {0: 0, 1: 2, 2: -2, 3: 1}[frame]
        cx = (xl + xr) // 2
        for x0, back in ((cx - stride - 1, True), (cx + stride - 1, False)):
            for y in range(top, top + length):
                for x in range(x0, x0 + w):
                    _put(img, x, y, foot_c if y == top + length - 1 else leg_c)
            _put(img, x0 + w, top + length - 1, foot_c)
        return
    lift = {0: (0, 0), 1: (1, 0), 2: (0, 1), 3: (0, 0)}[frame]
    for x0, lifted in ((xl, lift[0]), (xr, lift[1])):
        bottom = top + length - 1 - lifted
        for y in range(top, bottom + 1):
            for x in range(x0, x0 + w):
                _put(img, x, y, foot_c if y == bottom else leg_c)
        if L.get("bone"):
            continue


def build(name, extra_map=None):
    spec = MON[name]
    W, H = spec["size"]
    key = spec["key"]
    frames = []
    for view in ("down", "up", "side"):
        rows = spec[view]
        for r in rows:
            assert len(r) == W, (name, view, r, len(r))
        body = grid(rows, key)
        for f in range(4):
            img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw_legs(img, spec, key, view, f)
            dy = 1 if f in (1, 2) else 0      # contoneo al andar
            if f == 3:
                dy = -1                         # amago: se yergue antes de golpear
            img.alpha_composite(body, (0, max(0, dy)))
            if dy < 0:
                lifted = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                lifted.alpha_composite(img, (0, 0))
                img = lifted
            img = outline(img)
            frames.append(img)
    base = sheet(frames, 4, W, H)
    if extra_map:
        alt = recolor(base, extra_map)
        out = Image.new("RGBA", (base.width, base.height * 2), (0, 0, 0, 0))
        out.alpha_composite(base, (0, 0))
        out.alpha_composite(alt, (0, base.height))
        return out
    return base


if __name__ == "__main__":
    for n in ("goblin", "orc", "skeleton", "fimir"):
        save(build(n, ELITE), f"mon_{n}.png", preview_scale=5)
    save(build("gargoyle", RAGE), "mon_gargoyle.png", preview_scale=4)
    print("ok")

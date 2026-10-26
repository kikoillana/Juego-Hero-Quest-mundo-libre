"""
Genera assets/sprites/npc.png: 6 personajes de misión (16x24, vista frontal).
    fila i = NPC_ORDER[i]; columna 0 = reposo, columna 1 = respiración (cuerpo 1 px abajo)
Reutiliza los cuerpos de gen_heroes.py con otras paletas, más un guardia propio.

    python tools/sprites/gen_npcs.py
"""

from PIL import Image
from pixel import P, grid, outline, sheet, save, recolor
import gen_heroes as H

NPC_ORDER = ["npc_varek", "npc_durgan", "npc_lyra", "npc_elara", "npc_balthazar", "npc_eldon"]

GUARD = [
    "................",
    "................",
    "......nnnn......",
    "....nmMMmmmn....",
    "...nmMmmmmmmn...",
    "...nnnnnnnnnn...",
    "...kSSSSSSSSk...",
    "...kSoSSSSoSk...",
    "...kSSSkkSSSk...",
    "....kSSSSSSk....",
    ".....kssssk.....",
    ".mmmnnrrrrnnmmm.",
    ".mMmrrRGGrrrmMm.",
    ".mmmrRrGGrrrmmm.",
    ".ssmrrrrrrrrmss.",
    "...nxxxggxxxn...",
    "...nrrrrrrrrn...",
    "...nmmmmmmmmn...",
    "...nmmmmmmmmn...",
]
GUARD_KEY = {
    "o": P["outline"], "s": P["skin"], "S": P["skin_hi"], "k": P["skin_dk"],
    "m": P["steel"], "M": P["steel_hi"], "n": P["steel_dk"],
    "r": P["red"], "R": P["red_hi"], "G": P["gold_hi"], "g": P["gold"],
    "x": P["wood_dk"],
}


def guard_frame():
    img = Image.new("RGBA", (16, 24), (0, 0, 0, 0))
    legs = Image.new("RGBA", (16, 24), (0, 0, 0, 0))
    # piernas de cota de malla y botas
    for x0 in (4, 9):
        for y in range(19, 23):
            for x in range(x0, x0 + 3):
                c = P["wood_dk"] if y >= 21 else P["steel_dk"]
                legs.putpixel((x, y), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    img.alpha_composite(legs)
    img.alpha_composite(grid(GUARD, GUARD_KEY))
    return outline(img)


def hero_front(hero):
    return H.build_frame(hero, "down", 0)


VARIANTS = {
    "npc_durgan": ("dwarf", {  # herrero: barba canosa y mandil de cuero
        P["fire_dk"]: P["stone"], P["fire"]: P["stone_hi"], "#a03810": P["stone_mid"],
        P["blue"]: P["wood_mid"], P["blue_hi"]: P["wood_hi"], P["blue_dk"]: P["wood_dk"],
    }),
    "npc_lyra": ("wizard", {  # archimaga: azul cielo
        P["purple"]: P["blue"], P["purple_hi"]: P["blue_hi"], P["purple_dk"]: P["blue_dk"],
        P["stone_hi"]: P["gold_hi"], P["white"]: P["gold_hi"],
    }),
    "npc_elara": ("elf", {  # herborista: pelo castaño, vestido verde
        P["gold_hi"]: P["wood"], P["white"]: P["wood_hi"], P["dirt_mid"]: P["wood_mid"],
        "#3888a8": P["green"], "#60b8c8": P["green_hi"], "#205870": P["green_dk"],
        P["purple_dk"]: P["wood_dk"], P["purple"]: P["wood_mid"],
    }),
    "npc_balthazar": ("wizard", {  # mercader: túnica granate y oro
        P["purple"]: P["red"], P["purple_hi"]: P["red_hi"], P["purple_dk"]: P["red_dk"],
        P["stone_hi"]: P["stone"],
    }),
    "npc_eldon": ("elf", {  # guardabosques: pelo oscuro, ropa parda, capa verde
        P["gold_hi"]: P["wood_mid"], P["white"]: P["wood"], P["dirt_mid"]: P["wood_dk"],
        "#3888a8": P["wood"], "#60b8c8": P["wood_hi"], "#205870": P["wood_dk"],
        P["purple_dk"]: P["forest"], P["purple"]: P["grass_mid"],
    }),
}


def npc_frame(npc_id):
    if npc_id == "npc_varek":
        return guard_frame()
    hero, mapping = VARIANTS[npc_id]
    return recolor(hero_front(hero), mapping)


def breathe(img):
    """Segundo fotograma: la mitad superior baja 1 px (respiración)."""
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    top = img.crop((0, 0, img.width, 16))
    bottom = img.crop((0, 16, img.width, img.height))
    out.alpha_composite(bottom, (0, 16))
    out.alpha_composite(top, (0, 1))
    return out


if __name__ == "__main__":
    frames = []
    for nid in NPC_ORDER:
        f = npc_frame(nid)
        frames += [f, breathe(f)]
    save(sheet(frames, 2, 16, 24), "npc.png", preview_scale=6)
    print("ok")

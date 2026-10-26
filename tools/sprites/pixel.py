"""
Utilidades compartidas para generar el arte pixel-art del juego (estilo 16 bits).

Todo el arte se dibuja a 16 px por celda; el juego lo escala x3 en pantalla.
Uso típico:
    from pixel import P, grid, outline, sheet, save
    img = grid(["..aa..", ".abba.", ...], {"a": P["outline"], "b": P["skin"]})

Ejecuta cualquier generador desde la raíz del repo:
    python tools/sprites/gen_<algo>.py
Requiere Pillow (pip install pillow).
"""

from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "assets", "sprites")

# ---------------------------------------------------------------------------
# Paleta maestra (inspirada en consolas de 16 bits; colores cálidos y saturados,
# rampas cortas de 3-4 tonos y contorno marrón casi negro en lugar de negro puro).
# Usa SIEMPRE estos nombres para que todo el arte sea coherente.
# ---------------------------------------------------------------------------
P = {
    # Contornos / neutros
    "outline": "#201818",
    "black": "#101010",
    "white": "#f8f8f8",
    "shadow": "#00000060",  # sombra semitransparente bajo personajes

    # Piel
    "skin_hi": "#f8d0a8",
    "skin": "#e8a878",
    "skin_dk": "#b87048",

    # Hierba / bosque
    "grass_hi": "#98d868",
    "grass": "#68b848",
    "grass_mid": "#489838",
    "grass_dk": "#307028",
    "forest": "#205020",
    "forest_dk": "#183818",

    # Tierra / arena
    "dirt_hi": "#f0d8a0",
    "dirt": "#d8b070",
    "dirt_mid": "#b88848",
    "dirt_dk": "#806030",

    # Agua
    "water_hi": "#a8e0f8",
    "water": "#5098e8",
    "water_mid": "#3870c8",
    "water_dk": "#2850a0",

    # Piedra (fría)
    "stone_hi": "#d8d8d0",
    "stone": "#a8a8a0",
    "stone_mid": "#787878",
    "stone_dk": "#505058",
    "stone_xdk": "#303040",

    # Mazmorra (azul-gris)
    "dun_hi": "#a0a8c8",
    "dun": "#7880a8",
    "dun_mid": "#585e88",
    "dun_dk": "#3c4068",
    "dun_xdk": "#24263f",

    # Madera
    "wood_hi": "#e0a060",
    "wood": "#b07038",
    "wood_mid": "#885020",
    "wood_dk": "#583010",

    # Rojo
    "red_hi": "#f87858",
    "red": "#d83828",
    "red_dk": "#901818",

    # Oro / amarillo
    "gold_hi": "#f8f088",
    "gold": "#f8c830",
    "gold_mid": "#d08818",
    "gold_dk": "#905008",

    # Azul
    "blue_hi": "#88b8f8",
    "blue": "#4870e0",
    "blue_dk": "#283898",

    # Morado
    "purple_hi": "#c890f0",
    "purple": "#8850c0",
    "purple_dk": "#502878",

    # Verde intenso (túnicas, pociones)
    "green_hi": "#a0f070",
    "green": "#40b830",
    "green_dk": "#207018",

    # Naranja / fuego
    "fire_hi": "#f8f0a0",
    "fire": "#f8a830",
    "fire_dk": "#e05818",

    # Metal
    "steel_hi": "#f0f0f8",
    "steel": "#b0b8c8",
    "steel_dk": "#687088",
    # --- Añadidos escenario (Fork A): ladrillo cálido (Kellar) y piedra musgosa (Pantano)
    "brick_hi": "#d0a080",
    "brick": "#a87058",
    "brick_mid": "#805040",
    "brick_dk": "#583430",
    "brick_xdk": "#382020",
    "moss_hi": "#b0c8a0",
    "moss": "#80a080",
    "moss_mid": "#5c7864",
    "moss_dk": "#3e5448",
    "moss_xdk": "#26342e",
}



def hex_rgba(value: str | tuple | None):
    """Convierte '#rrggbb' o '#rrggbbaa' a tupla RGBA."""
    if value is None:
        return (0, 0, 0, 0)
    if isinstance(value, tuple):
        return value if len(value) == 4 else (*value, 255)
    v = value.lstrip("#")
    if len(v) == 6:
        return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16), 255)
    return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16), int(v[6:8], 16))


def grid(rows: list[str], key: dict[str, str]) -> Image.Image:
    """Crea una imagen a partir de un mapa ASCII. '.' y ' ' son transparentes."""
    h = len(rows)
    w = max(len(r) for r in rows)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in ". ":
                continue
            if ch not in key:
                raise KeyError(f"Carácter '{ch}' sin color en la fila {y}: {row!r}")
            px[x, y] = hex_rgba(key[ch])
    return img


def outline(img: Image.Image, color: str = P["outline"], diagonal: bool = False) -> Image.Image:
    """Añade un contorno de 1 px alrededor de los píxeles opacos (dentro del mismo lienzo)."""
    src = img.load()
    w, h = img.size
    out = img.copy()
    dst = out.load()
    c = hex_rgba(color)
    nbrs = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    if diagonal:
        nbrs += [(-1, -1), (1, -1), (-1, 1), (1, 1)]
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            for dx, dy in nbrs:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 128:
                    dst[x, y] = c
                    break
    return out


def pad(img: Image.Image, w: int, h: int, anchor: str = "bottom") -> Image.Image:
    """Coloca la imagen en un lienzo w x h (centrada en X; abajo o centrada en Y)."""
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = (w - img.width) // 2
    y = h - img.height if anchor == "bottom" else (h - img.height) // 2
    canvas.alpha_composite(img, (x, y))
    return canvas


def flip_x(img: Image.Image) -> Image.Image:
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def recolor(img: Image.Image, mapping: dict[str, str]) -> Image.Image:
    """Sustituye colores exactos (hex -> hex). Útil para variantes de paleta."""
    m = {hex_rgba(k)[:3]: hex_rgba(v) for k, v in mapping.items()}
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in m:
                px[x, y] = m[(r, g, b)]
    return out


def sheet(frames: list[Image.Image], cols: int, fw: int | None = None, fh: int | None = None) -> Image.Image:
    """Compone fotogramas en una hoja (fila a fila)."""
    fw = fw or max(f.width for f in frames)
    fh = fh or max(f.height for f in frames)
    rows = (len(frames) + cols - 1) // cols
    out = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.alpha_composite(f, ((i % cols) * fw, (i // cols) * fh))
    return out


def save(img: Image.Image, name: str, preview_scale: int = 0) -> str:
    """Guarda en assets/sprites/<name>. Si preview_scale > 0, guarda también una vista ampliada
    en $SPRITE_PREVIEW_DIR (o .sprite_previews/, ignorada por git) para revisarla visualmente."""
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    img.save(path)
    if preview_scale:
        prev_dir = os.environ.get("SPRITE_PREVIEW_DIR", os.path.join(ROOT, ".sprite_previews"))
        os.makedirs(prev_dir, exist_ok=True)
        bg = Image.new("RGBA", img.size, hex_rgba("#3a3a4a"))
        bg.alpha_composite(img)
        bg.resize((img.width * preview_scale, img.height * preview_scale), Image.NEAREST).save(
            os.path.join(prev_dir, name)
        )
    return path

"""
Genera TODAS las hojas de escenario (overworld, dungeon, objects, items) y escribe
src/render/envAtlas.js con las coordenadas de cada fotograma.
Uso (desde la raíz del repo):  python tools/sprites/gen_env_atlas.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from pixel import ROOT, save  # noqa: E402
from gen_overworld import Atlas  # noqa: E402
import gen_overworld  # noqa: E402
import gen_dungeon  # noqa: E402

SHEETS = [("overworld", gen_overworld, 4), ("dungeon", gen_dungeon, 3)]
try:
    import gen_objects  # noqa: E402

    SHEETS.append(("objects", gen_objects, 3))
except ImportError:
    pass
try:
    import gen_items  # noqa: E402

    SHEETS.append(("items", gen_items, 4))
except ImportError:
    pass

out = {}
for name, mod, prev in SHEETS:
    atlas = Atlas(getattr(mod, "SHEET_WIDTH", 256))
    mod.build(atlas)
    img, coords = atlas.build()
    save(img, f"{name}.png", preview_scale=prev)
    out[name] = {"src": f"./assets/sprites/{name}.png", "frames": coords}
    print(f"{name}: {len(coords)} fotogramas, {img.size[0]}x{img.size[1]}")

js = (
    "/**\n * @fileoverview Coordenadas de las hojas de sprites del escenario.\n"
    " * ARCHIVO GENERADO por tools/sprites/gen_env_atlas.py — no editar a mano.\n */\n\n"
    "export const ENV_ATLAS = "
    + json.dumps(out, separators=(",", ":"))
    + ";\n"
)
with open(os.path.join(ROOT, "src", "render", "envAtlas.js"), "w", encoding="utf8", newline="\n") as f:
    f.write(js)
print("envAtlas.js escrito")

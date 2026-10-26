"""
Pequeño kit de dibujo pixel-art para los generadores de escenario (gen_overworld, gen_dungeon,
gen_objects, gen_items). Dibuja sin antialias, siempre con colores de la paleta P.
"""

from __future__ import annotations

import random
from PIL import Image, ImageDraw

from pixel import P, hex_rgba, outline


def C(name_or_hex: str):
    """Color RGBA desde nombre de paleta o hex."""
    if name_or_hex in P:
        return hex_rgba(P[name_or_hex])
    return hex_rgba(name_or_hex)


class Pix:
    """Lienzo RGBA con primitivas pixel-art."""

    def __init__(self, w: int, h: int, fill: str | None = None):
        self.img = Image.new("RGBA", (w, h), C(fill) if fill else (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.w, self.h = w, h

    # --- primitivas -------------------------------------------------------
    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.img.putpixel((int(x), int(y)), C(c))

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.img.getpixel((int(x), int(y)))
        return (0, 0, 0, 0)

    def rect(self, x, y, w, h, c):
        if w <= 0 or h <= 0:
            return
        self.d.rectangle([x, y, x + w - 1, y + h - 1], fill=C(c))

    def box(self, x, y, w, h, c):
        """Rectángulo hueco de 1 px."""
        self.d.rectangle([x, y, x + w - 1, y + h - 1], outline=C(c))

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)

    def ellipse(self, x, y, w, h, c):
        self.d.ellipse([x, y, x + w - 1, y + h - 1], fill=C(c))

    def poly(self, pts, c):
        self.d.polygon(pts, fill=C(c))

    def line(self, x0, y0, x1, y1, c):
        self.d.line([x0, y0, x1, y1], fill=C(c))

    def dither(self, x, y, w, h, c, phase=0):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if (xx + yy + phase) % 2 == 0:
                    self.px(xx, yy, c)

    def specks(self, rng: random.Random, n, colors, area=None, mask_color=None):
        x0, y0, w, h = area or (0, 0, self.w, self.h)
        for _ in range(n):
            x = rng.randrange(x0, x0 + w)
            y = rng.randrange(y0, y0 + h)
            if mask_color is None or self.get(x, y)[:3] == C(mask_color)[:3]:
                self.px(x, y, rng.choice(colors))

    def paste(self, other: "Pix | Image.Image", x=0, y=0):
        im = other.img if isinstance(other, Pix) else other
        self.img.alpha_composite(im, (x, y))

    def outlined(self, color="outline"):
        o = Pix(self.w, self.h)
        o.img = outline(self.img, P[color] if color in P else color)
        o.d = ImageDraw.Draw(o.img)
        return o

    def shade_mask(self, region_test, c):
        """Pinta c sobre los píxeles opacos que cumplan region_test(x, y)."""
        for y in range(self.h):
            for x in range(self.w):
                if self.get(x, y)[3] > 0 and region_test(x, y):
                    self.px(x, y, c)


def frame_sheet(frames, fw, fh, cols):
    rows = (len(frames) + cols - 1) // cols
    out = Image.new("RGBA", (fw * cols, fh * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im = f.img if isinstance(f, Pix) else f
        out.alpha_composite(im, ((i % cols) * fw, (i // cols) * fh))
    return out

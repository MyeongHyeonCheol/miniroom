"""Bookshelf (책장), 2x1 cells = 1.0 x 0.5 m. Back against the wall at +Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/bookshelf.py", encoding="utf-8").read())
"""
import random
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, export_glb, finish, report

NAME = "bookshelf"
W, D = 2 * CELL, CELL
WOOD, BACK = "wood_light", "wood"
BOOKS = ["red", "blue", "yellow", "sage", "navy", "orange", "cream", "pink"]

clear_scene()
parts = []
rng = random.Random(7)  # same books every run

SW, SD, SH = 0.96, 0.34, 1.5
T = 0.03
y_front, y_back = -SD / 2, SD / 2
# Sides, top, back panel
for x in (-SW / 2 + T / 2, SW / 2 - T / 2):
    parts.append(box((T, SD, SH), (x, 0, SH / 2), WOOD))
parts.append(box((SW, SD, T), (0, 0, SH - T / 2), WOOD, bevel=0.006))
parts.append(box((SW - 2 * T, 0.015, SH - T), (0, y_back - 0.0075, (SH - T) / 2), BACK))
# Shelves (bottom one is the plinth)
levels = [0.06, 0.42, 0.78, 1.14]
inner_w = SW - 2 * T
for z in levels:
    parts.append(box((inner_w, SD - 0.015, T), (0, -0.0075, z), WOOD))
parts.append(box((inner_w, 0.02, 0.06), (0, y_front + 0.01, 0.03), BACK))
# Books: random widths and heights on the three lower shelves, one gap per shelf for a toppled book
for li, z in enumerate(levels[:3]):
    x = -inner_w / 2 + 0.01
    gap_at = rng.randint(4, 8)
    count = 0
    while x < inner_w / 2 - 0.05:
        bw = rng.uniform(0.03, 0.055)
        bh = rng.uniform(0.2, 0.29)
        bd = rng.uniform(0.2, 0.26)
        color = rng.choice(BOOKS)
        if x + bw > inner_w / 2 - 0.005:
            break
        if count == gap_at and x + 0.24 < inner_w / 2:
            # A book lying flat, then a little space
            parts.append(box((0.22, 0.17, 0.035), (x + 0.11, -0.02, z + T / 2 + 0.0175), color))
            x += 0.26
        else:
            parts.append(box((bw, bd, bh), (x + bw / 2, y_back - 0.02 - bd / 2, z + T / 2 + bh / 2), color))
            x += bw + 0.004
        count += 1
# Top shelf: two stacked keepsake boxes
parts.append(box((0.2, 0.2, 0.12), (-0.25, 0, levels[3] + T / 2 + 0.06), "cream", bevel=0.01))
parts.append(box((0.14, 0.14, 0.09), (-0.25, 0, levels[3] + T / 2 + 0.165), "pink", bevel=0.01))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

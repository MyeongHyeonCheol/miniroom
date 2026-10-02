"""Round rug (원형 러그), 4x4 cells = 2.0 x 2.0 m. Lies under other furniture (category rug).
Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/rug_round.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, clear_scene, cylinder, export_glb, finish, report

NAME = "rug_round"
W = D = 4 * CELL
SIDES = 24

clear_scene()
parts = []

# Concentric rings, each a little higher so they never z-fight; total height 1.6 cm, flat enough to walk over.
# Furniture placed on it sits on the floor (z = 0), so its feet just sink into the pile.
rings = [(0.96, "red"), (0.86, "cream"), (0.62, "pink"), (0.5, "cream"), (0.22, "yellow")]
for i, (r, color) in enumerate(rings):
    h = 0.008 + i * 0.002
    parts.append(cylinder(r, h, (0, 0, h / 2), color, sides=SIDES))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

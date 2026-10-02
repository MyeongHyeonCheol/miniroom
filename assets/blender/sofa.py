"""Two-seat sofa (2인 소파), 3x2 cells = 1.5 x 1.0 m. Back at +Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/sofa.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, cylinder, export_glb, finish, report

NAME = "sofa"
W, D = 3 * CELL, 2 * CELL
FABRIC, CUSHION, FEET = "sage", "cream", "wood_dark"

clear_scene()
parts = []

SW, SD = 1.44, 0.84          # sofa body, a little inside the footprint
y0 = -SD / 2
LEG_H = 0.08
# Base under the seat
parts.append(box((SW, SD - 0.04, 0.2), (0, 0.02, LEG_H + 0.1), FABRIC, bevel=0.03, segments=2))
# Seat cushions, slightly puffed
for x in (-0.32, 0.32):
    parts.append(box((0.6, 0.6, 0.12), (x, y0 + 0.33, LEG_H + 0.26), CUSHION, bevel=0.035, segments=2))
# Backrest and its cushions
parts.append(box((SW, 0.2, 0.46), (0, SD / 2 - 0.1, LEG_H + 0.2 + 0.23), FABRIC, bevel=0.04, segments=2))
for x in (-0.32, 0.32):
    parts.append(box((0.6, 0.13, 0.32), (x, SD / 2 - 0.25, LEG_H + 0.5), CUSHION, bevel=0.04, segments=2))
# Arms
for x in (-SW / 2 + 0.07, SW / 2 - 0.07):
    parts.append(box((0.14, SD - 0.04, 0.32), (x, 0.02, LEG_H + 0.16 + 0.12), FABRIC, bevel=0.04, segments=2))
# Wooden feet
for x in (-SW / 2 + 0.08, SW / 2 - 0.08):
    for y in (y0 + 0.08, SD / 2 - 0.08):
        parts.append(cylinder(0.03, LEG_H, (x, y, LEG_H / 2), FEET, sides=6, radius_top=0.024))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

"""Wooden chair (의자), 1x1 cell = 0.5 x 0.5 m. Backrest at +Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/chair.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, export_glb, finish, report

NAME = "chair"
W = D = CELL
WOOD, WOOD_LIGHT, PAD = "wood", "wood_light", "red"

clear_scene()
parts = []

SEAT_Z, SEAT = 0.45, 0.42
h = SEAT / 2 - 0.025
# Legs (back legs continue up as the backrest posts)
for x in (-h, h):
    parts.append(box((0.04, 0.04, SEAT_Z), (x, -h, SEAT_Z / 2), WOOD))
    parts.append(box((0.04, 0.04, 0.92), (x, h, 0.46), WOOD))
# Seat and a red cushion
parts.append(box((SEAT, SEAT, 0.04), (0, 0, SEAT_Z + 0.02), WOOD_LIGHT, bevel=0.008))
parts.append(box((SEAT - 0.06, SEAT - 0.08, 0.035), (0, -0.02, SEAT_Z + 0.055), PAD, bevel=0.012, segments=2))
# Rails between the legs
parts.append(box((SEAT - 0.06, 0.025, 0.04), (0, -h, 0.16), WOOD))
parts.append(box((SEAT - 0.06, 0.025, 0.04), (0, h, 0.16), WOOD))
# Backrest: top rail and three slats
parts.append(box((SEAT, 0.035, 0.08), (0, h, 0.86), WOOD_LIGHT, bevel=0.008))
for x in (-0.1, 0, 0.1):
    parts.append(box((0.035, 0.025, 0.3), (x, h, SEAT_Z + 0.04 + 0.17), WOOD_LIGHT))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

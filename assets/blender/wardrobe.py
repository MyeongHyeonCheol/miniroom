"""Wardrobe (옷장), 2x1 cells = 1.0 x 0.5 m. Back against the wall at +Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/wardrobe.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, export_glb, finish, report

NAME = "wardrobe"
W, D = 2 * CELL, CELL
BODY, DOOR, TRIM, KNOB = "wood", "wood_light", "wood_dark", "yellow"

clear_scene()
parts = []

BW, BD, BH = 0.96, 0.42, 1.78
CY = 0.02  # pushed back a little so door knobs stay inside the 0.5 m cell
PLINTH = 0.08
# Plinth, body, crown
parts.append(box((BW - 0.04, BD - 0.04, PLINTH), (0, CY + 0.01, PLINTH / 2), TRIM))
parts.append(box((BW, BD, BH - PLINTH - 0.05), (0, CY, PLINTH + (BH - PLINTH - 0.05) / 2), BODY, bevel=0.01))
parts.append(box((BW + 0.03, BD + 0.02, 0.05), (0, CY, BH - 0.025), TRIM, bevel=0.01))
# Two doors with a recessed panel each, and round brass knobs
front = CY - BD / 2
door_w = (BW - 0.06) / 2
door_h = BH - PLINTH - 0.05 - 0.06
door_z = PLINTH + 0.03 + door_h / 2
for i, x in enumerate((-door_w / 2 - 0.01, door_w / 2 + 0.01)):
    parts.append(box((door_w, 0.02, door_h), (x, front - 0.01, door_z), DOOR, bevel=0.006))
    parts.append(box((door_w - 0.12, 0.012, door_h * 0.38), (x, front - 0.024, door_z + door_h * 0.22), BODY))
    parts.append(box((door_w - 0.12, 0.012, door_h * 0.38), (x, front - 0.024, door_z - door_h * 0.22), BODY))
    kx = 0.035 if i == 0 else -0.035
    parts.append(box((0.03, 0.03, 0.03), (kx, front - 0.035, door_z), KNOB, bevel=0.01, segments=2))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

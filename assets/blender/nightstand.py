"""Nightstand (협탁), 1x1 cell = 0.5 x 0.5 m. Back at +Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/nightstand.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, cylinder, export_glb, finish, report

NAME = "nightstand"
W = D = CELL
BODY, FRONT, KNOB = "wood", "wood_light", "yellow"

clear_scene()
parts = []

NW, ND, NH = 0.42, 0.4, 0.5
# Legs, body, top
for x in (-NW / 2 + 0.03, NW / 2 - 0.03):
    for y in (-ND / 2 + 0.03, ND / 2 - 0.03):
        parts.append(box((0.04, 0.04, 0.08), (x, y, 0.04), "wood_dark"))
parts.append(box((NW, ND, NH - 0.1), (0, 0, 0.08 + (NH - 0.1) / 2), BODY, bevel=0.008))
parts.append(box((NW + 0.02, ND + 0.02, 0.025), (0, 0, NH - 0.0125 + 0.005), FRONT, bevel=0.008))
# Two drawers with knobs
dh = (NH - 0.1 - 0.05) / 2
for i in range(2):
    z = 0.08 + 0.02 + dh / 2 + i * (dh + 0.01)
    parts.append(box((NW - 0.04, 0.02, dh), (0, -ND / 2 - 0.008, z), FRONT, bevel=0.005))
    parts.append(box((0.04, 0.025, 0.025), (0, -ND / 2 - 0.025, z), KNOB, bevel=0.008, segments=2))
# A small alarm clock on top (2000s bedside)
top = NH + 0.0175
parts.append(box((0.11, 0.06, 0.08), (0.08, 0.04, top + 0.04), "red", bevel=0.015, segments=2))
parts.append(box((0.08, 0.005, 0.045), (0.08, 0.008, top + 0.045), "white"))
parts.append(cylinder(0.02, 0.02, (0.045, 0.04, top + 0.09), "yellow", sides=6))
parts.append(cylinder(0.02, 0.02, (0.115, 0.04, top + 0.09), "yellow", sides=6))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

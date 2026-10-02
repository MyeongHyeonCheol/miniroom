"""Floor lamp (스탠드 조명), 1x1 cell = 0.5 x 0.5 m. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/floor_lamp.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, clear_scene, cylinder, export_glb, finish, report

NAME = "floor_lamp"
W = D = CELL

clear_scene()
parts = []

# Weighted base, thin pole with a knuckle, fabric shade with a warm inside rim
parts.append(cylinder(0.16, 0.03, (0, 0, 0.015), "wood_dark", sides=10))
parts.append(cylinder(0.12, 0.025, (0, 0, 0.0425), "wood", sides=10))
parts.append(cylinder(0.014, 1.2, (0, 0, 0.055 + 0.6), "gray_dark", sides=6))
parts.append(cylinder(0.024, 0.04, (0, 0, 0.75), "yellow", sides=6))
SHADE_Z = 1.42
parts.append(cylinder(0.2, 0.3, (0, 0, SHADE_Z), "cream", sides=10, radius_top=0.12))
parts.append(cylinder(0.19, 0.012, (0, 0, SHADE_Z - 0.15), "yellow", sides=10))
parts.append(cylinder(0.05, 0.06, (0, 0, SHADE_Z - 0.13), "white", sides=6))  # bulb peeking out

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

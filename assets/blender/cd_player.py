"""Mini hi-fi with a CD player (CD 플레이어 오디오), 1x1 cell = 0.5 x 0.5 m, on a low rack. Back at +Y.
Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/cd_player.py", encoding="utf-8").read())
"""
import math
import sys

import bpy

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, cylinder, export_glb, finish, report

NAME = "cd_player"
W = D = CELL
SILVER, DARK = "gray_light", "gray_dark"

clear_scene()
parts = []

# Low wooden rack
RW, RD, RH = 0.46, 0.38, 0.3
parts.append(box((RW, RD, 0.03), (0, 0, RH - 0.015), "wood_light", bevel=0.006))
parts.append(box((RW, RD, 0.03), (0, 0, 0.05), "wood_light"))
for x in (-RW / 2 + 0.02, RW / 2 - 0.02):
    for y in (-RD / 2 + 0.02, RD / 2 - 0.02):
        parts.append(box((0.03, 0.03, RH), (x, y, RH / 2), "wood"))
# CDs stacked on the lower shelf
for i, c in enumerate(("blue", "red", "yellow", "cream")):
    parts.append(box((0.13, 0.13, 0.012), (-0.1, 0, 0.065 + 0.006 + i * 0.013), c))

# Main unit with a CD tray, a blue display and a volume knob
UZ = RH
parts.append(box((0.24, 0.28, 0.24), (0, 0.02, UZ + 0.12), SILVER, bevel=0.012))
front = 0.02 - 0.14
parts.append(box((0.18, 0.008, 0.045), (0, front - 0.004, UZ + 0.19), DARK, bevel=0.004))  # tray
parts.append(box((0.12, 0.006, 0.035), (-0.02, front - 0.004, UZ + 0.12), "sky"))       # display
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.025, depth=0.02, location=(0.08, front - 0.008, UZ + 0.11),
                                    rotation=(math.pi / 2, 0, 0))
knob = bpy.context.active_object
common.paint(knob, DARK)
parts.append(knob)
for i in range(4):
    parts.append(box((0.018, 0.008, 0.012), (-0.07 + i * 0.03, front - 0.004, UZ + 0.05), DARK))
# Two speakers with round cones
for x in (-0.19, 0.19):
    parts.append(box((0.09, 0.2, 0.22), (x, 0.03, UZ + 0.11), DARK, bevel=0.01))
    for z, r in ((UZ + 0.15, 0.03), (UZ + 0.07, 0.022)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=r, depth=0.01, location=(x, 0.03 - 0.1 - 0.004, z),
                                            rotation=(math.pi / 2, 0, 0))
        cone = bpy.context.active_object
        common.paint(cone, "black")
        parts.append(cone)

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

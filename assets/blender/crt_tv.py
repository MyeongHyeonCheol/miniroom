"""CRT TV on its stand (브라운관 TV, TV장 포함), 2x1 cells = 1.0 x 0.5 m. Back at +Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/crt_tv.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, export_glb, finish, report

NAME = "crt_tv"
W, D = 2 * CELL, CELL
STAND, STAND_FRONT = "wood_dark", "wood"
CASE, SCREEN = "gray", "navy"

clear_scene()
parts = []

# --- Low TV cabinet with a VCR in the open shelf -------------------------------------
SW, SD, SH = 0.96, 0.44, 0.42
parts.append(box((SW, SD, 0.03), (0, 0, SH - 0.015), STAND_FRONT, bevel=0.008))
parts.append(box((SW, SD, 0.04), (0, 0, 0.02), STAND))
for x in (-SW / 2 + 0.015, SW / 2 - 0.015, 0.1):
    parts.append(box((0.03, SD, SH - 0.07), (x, 0, 0.04 + (SH - 0.07) / 2), STAND))
parts.append(box((SW - 0.03, 0.015, SH - 0.07), (0, SD / 2 - 0.0075, 0.04 + (SH - 0.07) / 2), STAND))
# Left: shelf with a VCR. Right: a closed door
parts.append(box((0.5, SD - 0.03, 0.02), (-0.19, 0, 0.21), STAND))
parts.append(box((0.42, 0.3, 0.08), (-0.19, -0.02, 0.26), "gray_dark", bevel=0.006))
parts.append(box((0.22, 0.01, 0.015), (-0.24, -0.175, 0.27), "black"))
parts.append(box((0.04, 0.01, 0.015), (-0.04, -0.175, 0.27), "leaf_light"))
parts.append(box((0.33, 0.02, SH - 0.09), (0.28, -SD / 2 - 0.005, 0.04 + (SH - 0.07) / 2), STAND_FRONT, bevel=0.005))
parts.append(box((0.025, 0.025, 0.06), (0.15, -SD / 2 - 0.015, 0.24), "yellow", bevel=0.006))

# --- The TV: deep gray box, screen with a soft highlight, buttons and a tapered back -----
tv_z = SH
TW, TD, TH = 0.64, 0.24, 0.5
ty = -0.08  # back of the tube stays inside the 0.5 m cell
parts.append(box((TW, TD, TH), (0, ty, tv_z + TH / 2), CASE, bevel=0.03, segments=2))
back = box((0.5, 0.2, 0.4), (0, ty + TD / 2 + 0.1, tv_z + 0.22), CASE)
for v in back.data.vertices:
    if v.co.y > ty + TD / 2 + 0.1:
        v.co.x *= 0.6
        v.co.z = tv_z + 0.22 + (v.co.z - tv_z - 0.22) * 0.6
parts.append(back)
front = ty - TD / 2
parts.append(box((0.5, 0.01, 0.38), (-0.04, front - 0.004, tv_z + 0.27), "gray_dark", bevel=0.02))
parts.append(box((0.45, 0.008, 0.33), (-0.04, front - 0.01, tv_z + 0.27), SCREEN, bevel=0.015))
parts.append(box((0.12, 0.006, 0.05), (-0.17, front - 0.015, tv_z + 0.38), "blue"))
for i in range(3):
    parts.append(box((0.03, 0.012, 0.02), (0.26, front - 0.004, tv_z + 0.36 - i * 0.05), "gray_light"))
parts.append(box((0.015, 0.012, 0.015), (0.26, front - 0.004, tv_z + 0.12), "red"))
# Rabbit-ear antenna
parts.append(box((0.12, 0.08, 0.03), (0, ty, tv_z + TH + 0.015), "black", bevel=0.01))
for sx in (-1, 1):
    ear = box((0.012, 0.012, 0.3), (0, ty, tv_z + TH + 0.17), "gray_light")
    for v in ear.data.vertices:
        if v.co.z > tv_z + TH + 0.17:
            v.co.x += sx * 0.14
    parts.append(ear)

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

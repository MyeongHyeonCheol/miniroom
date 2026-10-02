"""Picture frame (액자), wall decor: one wall slot. Origin at the bottom center of the back face, sticking out toward
-Y (common.py "Wall decor"). A little landscape with a sun. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/picture_frame.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import box, clear_scene, export_glb, finish, prism, report

NAME = "picture_frame"
FW, FH, FD = 0.6, 0.45, 0.035

clear_scene()
parts = []

y = -FD / 2
b = 0.05
# Frame bars
for x in (-FW / 2 + b / 2, FW / 2 - b / 2):
    parts.append(box((b, FD, FH), (x, y, FH / 2), "wood", bevel=0.008))
for z in (b / 2, FH - b / 2):
    parts.append(box((FW, FD, b), (0, y, z), "wood", bevel=0.008))
# Picture: sky, two hills, a sun
pw, ph = FW - 2 * b, FH - 2 * b
parts.append(box((pw, 0.01, ph), (0, -0.01, FH / 2), "sky"))
z0 = b
parts.append(prism([(-pw / 2, z0), (-pw / 2, z0 + ph * 0.45), (-0.02, z0 + ph * 0.62), (0.12, z0)], 0.006, -0.018, "leaf"))
parts.append(prism([(-0.06, z0), (0.1, z0 + ph * 0.5), (pw / 2, z0 + ph * 0.3), (pw / 2, z0)], 0.006, -0.022, "leaf_light"))
parts.append(box((0.07, 0.006, 0.07), (0.13, -0.018, z0 + ph * 0.78), "yellow", bevel=0.02, segments=2))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), FW, 0, wall=True)

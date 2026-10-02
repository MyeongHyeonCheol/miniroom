"""Window with curtains (창문), wall decor: one wall slot. Origin at the bottom center of the back face (on the
wall), sticking out toward -Y (common.py "Wall decor"). Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/window.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import box, clear_scene, cylinder, export_glb, finish, report

NAME = "window"
W = 1.5  # with curtains, inside one 2 m slot

clear_scene()
parts = []

FW, FH = 0.9, 0.95       # frame
FT, FD = 0.06, 0.05      # frame bar width, depth from the wall
y = -FD / 2
# Sky behind the glass, then the frame and the cross bars
parts.append(box((FW - 0.04, 0.01, FH - 0.04), (0, -0.005, FH / 2), "sky"))
parts.append(box((FW - 0.3, 0.008, 0.18), (-0.12, -0.012, FH * 0.68), "white"))  # a cloud
parts.append(box((0.2, 0.008, 0.1), (0.2, -0.012, FH * 0.42), "white"))
for x in (-FW / 2 + FT / 2, FW / 2 - FT / 2):
    parts.append(box((FT, FD, FH), (x, y, FH / 2), "white", bevel=0.006))
for z in (FT / 2, FH - FT / 2):
    parts.append(box((FW, FD, FT), (0, y, z), "white", bevel=0.006))
parts.append(box((0.03, FD * 0.6, FH - 2 * FT), (0, -FD * 0.3, FH / 2), "white"))
parts.append(box((FW - 2 * FT, FD * 0.6, 0.03), (0, -FD * 0.3, FH / 2), "white"))
# Sill
parts.append(box((FW + 0.12, 0.12, 0.04), (0, -0.06, 0.0), "wood_light", bevel=0.008))
# Curtain rod and two gathered curtains
ROD_Z = FH + 0.08
parts.append(box((W - 0.02, 0.025, 0.025), (0, -0.09, ROD_Z), "wood_dark"))
for sx in (-1, 1):
    parts.append(cylinder(0.025, 0.04, (sx * (W / 2 - 0.03), -0.09, ROD_Z), "wood", sides=6))
    cx = sx * (FW / 2 + 0.08)
    for k in range(3):  # three folds
        parts.append(box((0.075, 0.05, FH + 0.12), (cx + sx * (k - 1) * 0.07, -0.1 - (k % 2) * 0.02, ROD_Z - 0.02 - (FH + 0.12) / 2),
                         "pink", bevel=0.015, segments=2))
    parts.append(box((0.24, 0.07, 0.04), (cx, -0.12, FH * 0.45), "red", bevel=0.01))  # tie-back

obj = finish(parts, NAME)
# Shift so the lowest point (sill) sits at z = 0
lo = min(v.co.z for v in obj.data.vertices)
for v in obj.data.vertices:
    v.co.z -= lo
report(obj, NAME, export_glb(obj, NAME), W, 0, wall=True)

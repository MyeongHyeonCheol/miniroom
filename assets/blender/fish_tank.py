"""Fish tank on a stand (어항, 받침대 포함), 1x1 cell = 0.5 x 0.5 m. Front at -Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/fish_tank.py", encoding="utf-8").read())

All furniture shares one opaque palette material, so the water is a solid light-blue block and the fish sit just in
front of the glass, like stickers seen through it.
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, export_glb, finish, prism, report

NAME = "fish_tank"
W = D = CELL

clear_scene()
parts = []

# Stand cabinet
SW, SD, SH = 0.46, 0.36, 0.62
parts.append(box((SW, SD, SH - 0.03), (0, 0, (SH - 0.03) / 2), "wood", bevel=0.008))
parts.append(box((SW + 0.02, SD + 0.02, 0.03), (0, 0, SH - 0.015), "wood_light", bevel=0.006))
parts.append(box((SW - 0.06, 0.015, SH - 0.12), (0, -SD / 2 - 0.006, SH / 2), "wood_light", bevel=0.005))
parts.append(box((0.03, 0.02, 0.03), (0.14, -SD / 2 - 0.02, SH / 2 + 0.05), "yellow", bevel=0.008))

# Tank: water, gravel, a black frame on the edges, a lid
TW, TD, TH = 0.44, 0.3, 0.32
z0 = SH
parts.append(box((TW - 0.02, TD - 0.02, TH - 0.04), (0, 0, z0 + 0.01 + (TH - 0.04) / 2), "sky"))
parts.append(box((TW - 0.02, TD - 0.02, 0.04), (0, 0, z0 + 0.02), "tan"))
t = 0.012
for x in (-TW / 2 + t / 2, TW / 2 - t / 2):
    for y in (-TD / 2 + t / 2, TD / 2 - t / 2):
        parts.append(box((t, t, TH), (x, y, z0 + TH / 2), "black"))
for z in (z0 + t / 2, z0 + TH - t / 2):
    parts.append(box((TW, t, t), (0, -TD / 2 + t / 2, z), "black"))
    parts.append(box((TW, t, t), (0, TD / 2 - t / 2, z), "black"))
    parts.append(box((t, TD, t), (-TW / 2 + t / 2, 0, z), "black"))
    parts.append(box((t, TD, t), (TW / 2 - t / 2, 0, z), "black"))
parts.append(box((TW + 0.01, TD + 0.01, 0.025), (0, 0, z0 + TH + 0.0125), "gray_dark", bevel=0.005))

# Water plants and two orange fish just in front of the glass
front = -TD / 2 + 0.008
for x, h in ((-0.15, 0.2), (-0.11, 0.14), (0.16, 0.17)):
    parts.append(box((0.025, 0.01, h), (x, front - 0.002, z0 + 0.04 + h / 2), "leaf"))
for x, z, s in ((-0.02, z0 + 0.19, 1.0), (0.09, z0 + 0.12, 0.8)):
    body = [(x - 0.04 * s, z), (x, z + 0.025 * s), (x + 0.03 * s, z), (x, z - 0.025 * s)]
    tail = [(x + 0.03 * s, z), (x + 0.06 * s, z + 0.022 * s), (x + 0.06 * s, z - 0.022 * s)]
    parts.append(prism(body, 0.012, front - 0.008, "orange"))
    parts.append(prism(tail, 0.01, front - 0.008, "orange"))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

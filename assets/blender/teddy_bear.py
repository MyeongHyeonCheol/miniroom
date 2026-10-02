"""Teddy bear (곰인형), 1x1 cell = 0.5 x 0.5 m, sitting and facing -Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/teddy_bear.py", encoding="utf-8").read())
"""
import sys

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, ball, box, clear_scene, export_glb, finish, report

NAME = "teddy_bear"
W = D = CELL
FUR, LIGHT = "tan", "cream"


def scaled_ball(r, loc, color, sx=1.0, sy=1.0, sz=1.0, sub=1):
    b = ball(r, loc, color, subdivisions=sub)
    for v in b.data.vertices:
        v.co.x = loc[0] + (v.co.x - loc[0]) * sx
        v.co.y = loc[1] + (v.co.y - loc[1]) * sy
        v.co.z = loc[2] + (v.co.z - loc[2]) * sz
    return b


clear_scene()
parts = []

# Body (pear-shaped), tummy patch
parts.append(scaled_ball(0.13, (0, 0.02, 0.16), FUR, sz=1.15, sub=2))
parts.append(scaled_ball(0.075, (0, -0.07, 0.15), LIGHT, sy=0.5))
# Legs sticking forward, with light paws
for x in (-0.085, 0.085):
    parts.append(scaled_ball(0.06, (x, -0.1, 0.06), FUR, sy=1.4))
    parts.append(scaled_ball(0.04, (x, -0.175, 0.06), LIGHT, sy=0.45))
# Arms
for x in (-0.13, 0.13):
    parts.append(scaled_ball(0.045, (x, -0.03, 0.2), FUR, sz=1.5))
# Head, muzzle, nose, eyes, ears
HEAD_Z = 0.37
parts.append(ball(0.1, (0, 0, HEAD_Z), FUR, subdivisions=2))
parts.append(scaled_ball(0.045, (0, -0.085, HEAD_Z - 0.03), LIGHT, sy=0.7))
parts.append(ball(0.016, (0, -0.118, HEAD_Z - 0.015), "black"))
for x in (-0.04, 0.04):
    parts.append(ball(0.012, (x, -0.088, HEAD_Z + 0.025), "black"))
for x in (-0.075, 0.075):
    parts.append(scaled_ball(0.035, (x, 0.01, HEAD_Z + 0.08), FUR, sy=0.6))
    parts.append(scaled_ball(0.02, (x, -0.005, HEAD_Z + 0.08), "pink", sy=0.4))
# Red bow tie
for x in (-0.03, 0.03):
    parts.append(box((0.045, 0.02, 0.04), (x, -0.09, 0.275), "red", bevel=0.008))
parts.append(box((0.02, 0.022, 0.025), (0, -0.095, 0.275), "red"))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), W, D)

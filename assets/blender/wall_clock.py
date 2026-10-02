"""Wall clock (벽시계), wall decor: one wall slot. Origin at the bottom center of the back face, sticking out toward
-Y (common.py "Wall decor"). Hands at ten past ten. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/wall_clock.py", encoding="utf-8").read())
"""
import math
import sys

import bpy

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import box, clear_scene, export_glb, finish, report

NAME = "wall_clock"
R = 0.17
SIDES = 16

clear_scene()
parts = []


def disc(radius, depth, y, color):
    """Round slab facing -Y, centered on the clock center."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=SIDES, radius=radius, depth=depth, location=(0, y, R),
                                        rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.active_object
    common.paint(ob, color)
    return ob


parts.append(disc(R, 0.04, -0.02, "red"))            # rim
parts.append(disc(R - 0.025, 0.01, -0.042, "white"))  # face
# Hour marks
for i in range(12):
    a = i * math.pi / 6
    long = i % 3 == 0
    r = R - 0.05
    mark = box((0.012, 0.004, 0.03 if long else 0.016), (0, 0, 0), "gray_dark" if long else "gray")
    mark.rotation_euler = (0, a, 0)
    mark.location = (math.sin(a) * r, -0.049, R + math.cos(a) * r)
    parts.append(mark)


def hand(angle, length, width, color, y):
    h = box((width, 0.004, length), (0, 0, length / 2 - 0.015), color)
    h.rotation_euler = (0, angle, 0)
    h.location = (0, y, R)
    return h


parts.append(hand(math.radians(300), 0.07, 0.016, "black", -0.052))  # hour hand toward 10
parts.append(hand(math.radians(60), 0.11, 0.01, "black", -0.056))    # minute hand toward 2
parts.append(disc(0.012, 0.012, -0.06, "yellow"))

obj = finish(parts, NAME)
report(obj, NAME, export_glb(obj, NAME), 2 * R, 0, wall=True)

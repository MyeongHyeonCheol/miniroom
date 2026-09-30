"""Single bed (싱글 침대), 2x4 cells = 1.0 x 2.0 m. Headboard at +Y. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/bed.py", encoding="utf-8").read())
"""
import math
import os
import sys

import bpy

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, ball, box, clear_scene, export_glb, finish, prism, triangle_count

NAME = "bed"
W, D = 2 * CELL, 4 * CELL  # 1.0 x 2.0 m
HW, HD = W / 2, D / 2

POST = 0.09          # square post, doubles as leg
PANEL_T = 0.04
RAIL_BOTTOM, RAIL_TOP = 0.12, 0.28
MAT_TOP = 0.44
WOOD, WOOD_PANEL = "wood", "wood_light"

clear_scene()
parts = []


def arch_profile(x_half, z_bottom, z_side, z_top, steps=8):
    """Panel outline: flat bottom, straight sides, arched top."""
    pts = [(-x_half, z_bottom), (x_half, z_bottom)]
    for i in range(steps + 1):
        a = math.pi * i / steps  # right -> left over the top
        pts.append((x_half * math.cos(a), z_side + (z_top - z_side) * math.sin(a)))
    return pts


def board(y, post_h, panel_bottom, panel_side, panel_top):
    """Two posts with ball caps and an arched panel between them."""
    py = y - math.copysign(POST / 2, y)
    for sx in (-1, 1):
        x = sx * (HW - POST / 2)
        parts.append(box((POST, POST, post_h), (x, py, post_h / 2), WOOD, bevel=0.012))
        parts.append(ball(POST * 0.5, (x, py, post_h + POST * 0.35), WOOD))
    x_half = HW - POST + 0.005
    parts.append(prism(arch_profile(x_half, panel_bottom, panel_side, panel_top), PANEL_T, py,
                       WOOD_PANEL, bevel=0.008))


# Head (back, tall) and foot (front, low)
board(HD, 0.84, 0.22, 0.6, 0.76)
board(-HD, 0.5, 0.22, 0.37, 0.44)

# Side rails between the posts
inner_d = D - 2 * POST
for sx in (-1, 1):
    parts.append(box((0.04, inner_d, RAIL_TOP - RAIL_BOTTOM), (sx * (HW - 0.03), 0, (RAIL_BOTTOM + RAIL_TOP) / 2),
                     WOOD, bevel=0.008))

# Mattress
MAT_W = W - 0.08
mat_bottom = RAIL_TOP - 0.03
parts.append(box((MAT_W, inner_d, MAT_TOP - mat_bottom), (0, 0, (mat_bottom + MAT_TOP) / 2),
                 "white", bevel=0.035, segments=1))

# Puffy pillow near the headboard
parts.append(box((0.58, 0.3, 0.06), (0, HD - POST - 0.2, MAT_TOP + 0.03), "cream",
                 bevel=0.028, segments=2, puff=0.035))

# Quilt: soft checkered block over the foot ~60% of the mattress, sides hang past the mattress
Q_W = MAT_W + 0.05
Q_LEN = inner_d * 0.6
Q_TOP = MAT_TOP + 0.03
q_bottom = RAIL_TOP + 0.01
q_cy = -HD + POST + Q_LEN / 2 - 0.01
parts.append(box((Q_W, Q_LEN, Q_TOP - q_bottom), (0, q_cy, (q_bottom + Q_TOP) / 2), "sky",
                 bevel=0.03, segments=2, top_cells=5, top_colors=("sky", "white")))
# Folded cuff at the head side of the quilt
parts.append(box((Q_W + 0.01, 0.11, 0.045), (0, q_cy + Q_LEN / 2 - 0.04, Q_TOP + 0.01), "white",
                 bevel=0.02, segments=2))

obj = finish(parts, NAME)
path = export_glb(obj, NAME)

dims = tuple(round(d, 3) for d in obj.dimensions)
print(f"RESULT name={NAME} tris={triangle_count(obj)} dims={dims} glb={path} bytes={os.path.getsize(path)}")
if dims[0] > W + 0.001 or dims[1] > D + 0.001:
    print(f"WARNING footprint {dims[0]}x{dims[1]} exceeds {W}x{D} m")

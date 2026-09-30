"""Computer desk with CRT monitor (컴퓨터 책상), 3x2 cells = 1.5 x 1.0 m. Wall side at +Y.
Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/computer_desk.py", encoding="utf-8").read())
"""
import os
import sys

import bpy

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import CELL, box, clear_scene, export_glb, finish, triangle_count

NAME = "computer_desk"
W, D = 3 * CELL, 2 * CELL  # 1.5 x 1.0 m
HW, HD = W / 2, D / 2

TOP_Z = 0.74          # desk surface height
TOP_T = 0.04
DESK_D = 0.8          # desk depth, pushed against the wall
desk_y0, desk_y1 = HD - DESK_D, HD
desk_cy = (desk_y0 + desk_y1) / 2
WOOD, WOOD_FRONT = "wood", "wood_light"
PLASTIC = "cream"     # 2000s beige plastic

clear_scene()
parts = []

# --- Desk -------------------------------------------------------------------
parts.append(box((W, DESK_D, TOP_T), (0, desk_cy, TOP_Z - TOP_T / 2), WOOD_FRONT, bevel=0.012))

# Left: drawer pedestal with three drawers
PED_W = 0.44
ped_x = -HW + PED_W / 2
body_h = TOP_Z - TOP_T
parts.append(box((PED_W, DESK_D - 0.04, body_h), (ped_x, desk_cy + 0.02, body_h / 2), WOOD, bevel=0.01))
drawer_gap = 0.02
drawer_h = (body_h - 0.06 - drawer_gap * 2) / 3
for i in range(3):
    z = 0.04 + drawer_h / 2 + i * (drawer_h + drawer_gap)
    front_y = desk_y0 + 0.02
    parts.append(box((PED_W - 0.05, 0.025, drawer_h), (ped_x, front_y, z), WOOD_FRONT, bevel=0.008))
    parts.append(box((0.1, 0.025, 0.022), (ped_x, front_y - 0.02, z + drawer_h * 0.2), "gray_dark", bevel=0.006))

# Right: side panel, and a back (modesty) panel
parts.append(box((0.04, DESK_D - 0.04, body_h), (HW - 0.02, desk_cy + 0.02, body_h / 2), WOOD, bevel=0.01))
parts.append(box((W - PED_W - 0.04, 0.02, body_h * 0.6), (ped_x + PED_W / 2 + (W - PED_W - 0.04) / 2,
                                                         desk_y1 - 0.03, TOP_Z - TOP_T - body_h * 0.3), WOOD))

# --- CRT monitor (sits toward the back, right of center) ---------------------
mon_x, mon_y = 0.18, desk_y1 - 0.3
base_z = TOP_Z
# Stand
parts.append(box((0.24, 0.2, 0.025), (mon_x, mon_y, base_z + 0.0125), PLASTIC, bevel=0.008))
parts.append(box((0.1, 0.08, 0.05), (mon_x, mon_y, base_z + 0.05), PLASTIC))
# Front bezel block
BZ_W, BZ_H, BZ_D = 0.44, 0.38, 0.14
bz_z = base_z + 0.075 + BZ_H / 2
bz_y = mon_y - 0.12
parts.append(box((BZ_W, BZ_D, BZ_H), (mon_x, bz_y, bz_z), PLASTIC, bevel=0.02, segments=2))
# Tapered tube housing behind the bezel
tube = box((0.34, 0.26, 0.3), (mon_x, bz_y + BZ_D / 2 + 0.13, bz_z + 0.01), PLASTIC)
for v in tube.data.vertices:
    if v.co.y > bz_y + BZ_D / 2 + 0.13:  # back half -> shrink toward the rear
        v.co.x = mon_x + (v.co.x - mon_x) * 0.62
        v.co.z = bz_z + 0.01 + (v.co.z - bz_z - 0.01) * 0.62
parts.append(tube)
# Screen: dark rim, blue desktop, one white window and a taskbar
scr_y = bz_y - BZ_D / 2 - 0.004
scr_z = bz_z + 0.02
parts.append(box((0.35, 0.008, 0.28), (mon_x, scr_y, scr_z), "gray_dark", bevel=0.01))
parts.append(box((0.32, 0.004, 0.25), (mon_x, scr_y - 0.005, scr_z), "blue"))
parts.append(box((0.32, 0.004, 0.022), (mon_x, scr_y - 0.008, scr_z - 0.114), "gray_light"))
parts.append(box((0.15, 0.004, 0.11), (mon_x + 0.03, scr_y - 0.008, scr_z + 0.03), "white"))
parts.append(box((0.15, 0.004, 0.018), (mon_x + 0.03, scr_y - 0.011, scr_z + 0.076), "gray_dark"))
# Power button + LED on the bezel chin
parts.append(box((0.03, 0.01, 0.018), (mon_x + 0.16, scr_y, bz_z - BZ_H / 2 + 0.03), "gray"))
parts.append(box((0.012, 0.01, 0.012), (mon_x + 0.12, scr_y, bz_z - BZ_H / 2 + 0.03), "leaf_light"))

# --- Keyboard and mouse -------------------------------------------------------
kb_y = desk_y0 + 0.16
parts.append(box((0.44, 0.15, 0.025), (mon_x - 0.02, kb_y, TOP_Z + 0.0125), PLASTIC, bevel=0.008,
                 top_cells=0))
parts.append(box((0.4, 0.11, 0.012), (mon_x - 0.02, kb_y + 0.005, TOP_Z + 0.03), "gray_light", bevel=0.004,
                 top_cells=6, top_colors=("gray_light", "white")))
parts.append(box((0.06, 0.1, 0.03), (mon_x + 0.3, kb_y, TOP_Z + 0.015), PLASTIC, bevel=0.012, segments=2))

# --- Beige PC tower under the desk (right side) ----------------------------------
TW_W, TW_D, TW_H = 0.2, 0.44, 0.42
tw_x, tw_y = HW - 0.04 - TW_W / 2 - 0.04, desk_y1 - 0.06 - TW_D / 2
parts.append(box((TW_W, TW_D, TW_H), (tw_x, tw_y, TW_H / 2 + 0.01), PLASTIC, bevel=0.015, segments=2))
tw_front = tw_y - TW_D / 2 - 0.004
for i in range(2):  # CD-ROM / floppy bays
    parts.append(box((0.15, 0.01, 0.035), (tw_x, tw_front, TW_H - 0.06 - i * 0.05), "gray_light", bevel=0.004))
parts.append(box((0.03, 0.01, 0.03), (tw_x, tw_front, 0.16), "gray", bevel=0.006))

obj = finish(parts, NAME)
path = export_glb(obj, NAME)

dims = tuple(round(d, 3) for d in obj.dimensions)
print(f"RESULT name={NAME} tris={triangle_count(obj)} dims={dims} glb={path} bytes={os.path.getsize(path)}")
lo = [min((obj.matrix_world @ v.co)[k] for v in obj.data.vertices) for k in range(2)]
hi = [max((obj.matrix_world @ v.co)[k] for v in obj.data.vertices) for k in range(2)]
print(f"BOUNDS x {lo[0]:.3f}..{hi[0]:.3f} y {lo[1]:.3f}..{hi[1]:.3f}")
if lo[0] < -HW - 0.001 or hi[0] > HW + 0.001 or lo[1] < -HD - 0.001 or hi[1] > HD + 0.001:
    print(f"WARNING outside {W}x{D} m footprint")

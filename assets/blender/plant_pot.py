"""Plant pot (화분), 1x1 cell. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/plant_pot.py", encoding="utf-8").read())
"""
import math
import os
import sys

import bmesh
import bpy
import mathutils

sys.path.insert(0, r"C:/miniroom/assets/blender")
import importlib

import common

importlib.reload(common)
from common import finish, paint, clear_scene, export_glb, triangle_count

NAME = "plant_pot"
SIDES = 8

clear_scene()
parts = []

# Pot body: tapered 8-sided cylinder
bpy.ops.mesh.primitive_cone_add(vertices=SIDES, radius1=0.12, radius2=0.16, depth=0.26, location=(0, 0, 0.13))
body = bpy.context.active_object
paint(body, "terracotta")
parts.append(body)

# Rim
bpy.ops.mesh.primitive_cylinder_add(vertices=SIDES, radius=0.175, depth=0.05, location=(0, 0, 0.275))
rim = bpy.context.active_object
paint(rim, "terracotta_dark")
parts.append(rim)

# Soil disc, just below rim top
bpy.ops.mesh.primitive_cylinder_add(vertices=SIDES, radius=0.155, depth=0.02, location=(0, 0, 0.29))
soil = bpy.context.active_object
paint(soil, "soil")
parts.append(soil)

# Leaf width profile along its length (0 = base, 1 = tip)
LEAF_PROFILE = [0.15, 0.7, 1.0, 0.85, 0.5, 0.0]
SOIL_TOP = 0.30


def make_leaf(yaw_deg, length, width, pitch_deg, droop_deg, color, back_color):
    """Arched leaf blade with a raised midrib, two-sided (back faces use back_color).

    pitch_deg: start angle above horizontal; droop_deg: how much it bends down by the tip.
    """
    bm = bmesh.new()
    yaw = math.radians(yaw_deg)
    fwd = mathutils.Vector((math.cos(yaw), math.sin(yaw), 0))
    side = mathutils.Vector((-math.sin(yaw), math.cos(yaw), 0))
    seg = len(LEAF_PROFILE) - 1
    step = length / seg
    pos = mathutils.Vector((0, 0, SOIL_TOP)) + fwd * 0.02
    rings = []
    for i, w in enumerate(LEAF_PROFILE):
        t = i / seg
        ang = math.radians(pitch_deg - droop_deg * t)
        direction = fwd * math.cos(ang) + mathutils.Vector((0, 0, math.sin(ang)))
        up = direction.cross(side).normalized() * -1  # blade normal, pointing up
        half = width * 0.5 * w
        crease = up * width * 0.2 * w  # midrib sits higher -> V-shaped faceted blade
        center = pos + crease
        if w == 0:
            rings.append([bm.verts.new(pos)])
        else:
            rings.append([bm.verts.new(pos + side * half), bm.verts.new(center), bm.verts.new(pos - side * half)])
        pos = pos + direction * step
    front = []
    for a, b in zip(rings, rings[1:]):
        if len(b) == 3:
            front.append(bm.faces.new((a[0], b[0], b[1], a[1])))
            front.append(bm.faces.new((a[1], b[1], b[2], a[2])))
        else:
            front.append(bm.faces.new((a[0], b[0], a[1])))
            front.append(bm.faces.new((a[1], b[0], a[2])))
    bmesh.ops.recalc_face_normals(bm, faces=front)
    # Make sure the front faces point up
    if sum(f.normal.z for f in front) < 0:
        bmesh.ops.reverse_faces(bm, faces=front)
    # Back side: duplicate and flip
    dup = bmesh.ops.duplicate(bm, geom=front)
    back = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMFace)]
    bmesh.ops.reverse_faces(bm, faces=back)
    bm.faces.index_update()
    back_idx = {f.index for f in back}
    me = bpy.data.meshes.new("leaf")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("leaf", me)
    bpy.context.collection.objects.link(ob)
    paint(ob, color)
    paint(ob, back_color, faces=back_idx)
    return ob


# Back side is one shade darker than the front
BACK = {"leaf_light": "leaf", "leaf": "leaf_dark", "leaf_dark": "leaf_dark"}

# Outer ring: wide leaves arching outward (reach kept inside the 0.5 m cell)
outer = [(yaw, 0.34, 0.15, 70, 62, "leaf" if i % 2 == 0 else "leaf_dark")
         for i, yaw in enumerate(range(0, 360, 60))]
# Inner ring: taller, upright young leaves
inner = [(yaw, 0.44, 0.13, 83, 38, "leaf_light") for yaw in (30, 120, 210, 300)]
for yaw, length, width, pitch, droop, color in outer + inner:
    parts.append(make_leaf(yaw, length, width, pitch, droop, color, BACK[color]))

obj = finish(parts, NAME)
path = export_glb(obj, NAME)

dims = tuple(round(d, 3) for d in obj.dimensions)
print(f"RESULT name={NAME} tris={triangle_count(obj)} dims={dims} glb={path} bytes={os.path.getsize(path)}")
if max(dims[0], dims[1]) > 0.5:
    print(f"WARNING footprint {dims[0]}x{dims[1]} exceeds 1 cell (0.5 m)")

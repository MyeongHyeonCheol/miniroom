"""Preview: all exported furniture in a 12x12-cell room with two walls, quarter view.
Not exported; only for checking style and scale side by side. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/preview_room.py", encoding="utf-8").read())

Blender +Y is the back wall here (furniture backs face +Y), +X runs away from the left wall.
"""
import math

import bpy
import mathutils

EXPORT = r"C:/miniroom/assets/export"
CELL = 0.5
SIDE = 12
ROOM = SIDE * CELL
WALL_H = 2.4

# name, footprint (w, d) cells at rotation 0, anchor cell (x, y), rotation (deg, turns the front from -Y)
LAYOUT = [
    ("bed", (2, 4), (0, 8), 0),
    ("nightstand", (1, 1), (2, 11), 0),
    ("wardrobe", (2, 1), (4, 11), 0),
    ("bookshelf", (2, 1), (6, 11), 0),
    ("computer_desk", (3, 2), (8, 10), 0),
    ("chair", (1, 1), (9, 9), 180),
    ("floor_lamp", (1, 1), (11, 11), 0),
    ("plant_pot", (1, 1), (11, 9), 0),
    ("fish_tank", (1, 1), (11, 6), 90),
    ("rug_round", (4, 4), (2, 1), 0),
    ("sofa", (3, 2), (2, 1), 180),
    ("crt_tv", (2, 1), (2, 5), 0),
    ("cd_player", (1, 1), (5, 5), 0),
    ("teddy_bear", (1, 1), (6, 2), 0),
]
# name, wall ("back" or "left"), position along the wall (m), height of the bottom (m)
WALL_DECOR = [
    ("window", "back", 3.0, 0.9),
    ("picture_frame", "left", 2.5, 1.3),
    ("wall_clock", "left", 4.2, 1.6),
]

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def flat_material(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (*rgb, 1)
    return m


def slab(name, size, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    o.data.materials.append(mat)
    return o


def load(name):
    bpy.ops.import_scene.gltf(filepath=f"{EXPORT}/{name}.glb")
    o = bpy.context.selected_objects[0]
    # glTF import may parent the mesh under its node; move the top object
    while o.parent:
        o = o.parent
    return o


slab("floor_preview", (ROOM, ROOM, 0.02), (ROOM / 2, ROOM / 2, -0.01), flat_material("floor_preview", (0.55, 0.45, 0.35)))
wall = flat_material("wall_preview", (0.9, 0.87, 0.8))
slab("wall_back", (ROOM, 0.05, WALL_H), (ROOM / 2, ROOM + 0.025, WALL_H / 2), wall)
slab("wall_left", (0.05, ROOM, WALL_H), (-0.025, ROOM / 2, WALL_H / 2), wall)

for name, (w, d), (cx, cy), rot in LAYOUT:
    o = load(name)
    # anchor cell + rotated footprint -> center point (model origin is the footprint center)
    rw, rd = (d, w) if rot in (90, 270) else (w, d)
    o.location = ((cx + rw / 2) * CELL, (cy + rd / 2) * CELL, 0)
    o.rotation_mode = "XYZ"
    o.rotation_euler = (0, 0, math.radians(rot))

for name, side, along, z in WALL_DECOR:
    o = load(name)
    o.rotation_mode = "XYZ"
    if side == "back":
        o.location = (along, ROOM, z)
        o.rotation_euler = (0, 0, 0)
    else:  # left wall at x = 0: the front (-Y) turns to +X
        o.location = (0, along, z)
        o.rotation_euler = (0, 0, math.radians(90))

for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        region = next(r for r in area.regions if r.type == "WINDOW")
        r3d = area.spaces.active.region_3d
        r3d.view_perspective = "ORTHO"
        # Look from the open corner (+X, -Y) toward the walls, like the app's quarter view
        r3d.view_rotation = mathutils.Euler((math.radians(55), 0, math.radians(45))).to_quaternion()
        bpy.ops.object.select_all(action="SELECT")
        with bpy.context.temp_override(area=area, region=region):
            bpy.ops.view3d.view_selected()
        area.spaces.active.shading.type = "MATERIAL"
bpy.ops.object.select_all(action="DESELECT")

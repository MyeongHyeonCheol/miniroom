"""Preview: exported furniture in an 8x8-cell room with two walls, quarter view.
Not exported; only for checking style and scale side by side. Run inside Blender:

    exec(open(r"C:/miniroom/assets/blender/preview_room.py", encoding="utf-8").read())
"""
import math

import bpy
import mathutils

EXPORT = r"C:/miniroom/assets/export"
CELL = 0.5
ROOM = 8 * CELL

# name, footprint (w, d) cells, anchor cell (x, y). Room cell (0, 0) is at world (0, 0).
LAYOUT = [
    ("bed", (2, 4), (0, 4)),
    ("computer_desk", (3, 2), (3, 6)),
    ("plant_pot", (1, 1), (6, 7)),
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


slab("floor_preview", (ROOM, ROOM, 0.02), (ROOM / 2, ROOM / 2, -0.01), flat_material("floor_preview", (0.55, 0.45, 0.35)))
wall = flat_material("wall_preview", (0.9, 0.87, 0.8))
slab("wall_back", (ROOM, 0.05, 2.2), (ROOM / 2, ROOM + 0.025, 1.1), wall)
slab("wall_left", (0.05, ROOM, 2.2), (-0.025, ROOM / 2, 1.1), wall)

for name, (w, d), (cx, cy) in LAYOUT:
    bpy.ops.import_scene.gltf(filepath=f"{EXPORT}/{name}.glb")
    o = bpy.context.selected_objects[0]
    # anchor cell + footprint -> center point (model origin is the footprint center)
    o.location = ((cx + w / 2) * CELL, (cy + d / 2) * CELL, 0)

for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        region = next(r for r in area.regions if r.type == "WINDOW")
        r3d = area.spaces.active.region_3d
        r3d.view_perspective = "ORTHO"
        r3d.view_rotation = mathutils.Euler((math.radians(60), 0, math.radians(40))).to_quaternion()
        bpy.ops.object.select_all(action="SELECT")
        with bpy.context.temp_override(area=area, region=region):
            bpy.ops.view3d.view_selected()
bpy.ops.object.select_all(action="DESELECT")

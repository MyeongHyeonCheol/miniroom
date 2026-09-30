"""Shared helpers for furniture scripts.

Conventions
- 1 cell = 0.5 m. Blender units are metres (Z up; glTF export converts to Y up).
- Origin: center of the footprint on the floor (z = 0). The frontend converts
  "anchor cell + rotation" to this center point.
- Footprint W x D cells lies along Blender X x Y. The front of the furniture
  faces -Y (glTF +Z); the back (headboard, wall side) is +Y.
- Colors come from one shared palette texture (PALETTE_SIZE px, 8x8 swatches).
  Each face gets UVs at the center of its swatch, so every model uses a single
  material and one texture.
"""
import os

import bmesh
import bpy

CELL = 0.5
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PALETTE_PATH = os.path.join(ROOT, "assets", "blender", "palette.png")
EXPORT_DIR = os.path.join(ROOT, "assets", "export")

PALETTE_SIZE = 64
GRID = 8  # 8x8 swatches, 8 px each

# name -> (index, sRGB hex). Append only; never reorder (UVs depend on index).
PALETTE = {
    "white": (0, "f4efe6"),
    "cream": (1, "e8dcc0"),
    "wood_light": (2, "c89b6d"),
    "wood": (3, "9c6b43"),
    "wood_dark": (4, "6b4428"),
    "terracotta": (5, "c4673f"),
    "terracotta_dark": (6, "8f4428"),
    "soil": (7, "4a3526"),
    "leaf_light": (8, "8cc063"),
    "leaf": (9, "5a9a45"),
    "leaf_dark": (10, "3c7034"),
    "gray_light": (11, "c9c9c9"),
    "gray": (12, "8a8a8a"),
    "gray_dark": (13, "4d4d4d"),
    "black": (14, "222222"),
    "sky": (15, "9fd3e6"),
    "pink": (16, "f2a7b8"),
    "red": (17, "d9504a"),
    "yellow": (18, "f2cf5b"),
    "blue": (19, "4f7fc2"),
}


def _srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def ensure_palette_image():
    """Build the palette PNG from PALETTE (always regenerated so it stays in sync)."""
    img = bpy.data.images.get("palette")
    if img is None:
        img = bpy.data.images.new("palette", PALETTE_SIZE, PALETTE_SIZE, alpha=False)
    px_per = PALETTE_SIZE // GRID
    pixels = [0.0] * (PALETTE_SIZE * PALETTE_SIZE * 4)
    for idx, hexcol in PALETTE.values():
        # Byte images store sRGB values as-is: write the hex color directly (no linear conversion,
        # that made the saved PNG much darker than the palette).
        rgb = [int(hexcol[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        cx, cy = idx % GRID, GRID - 1 - idx // GRID  # row 0 at top of image
        for y in range(cy * px_per, (cy + 1) * px_per):
            for x in range(cx * px_per, (cx + 1) * px_per):
                o = (y * PALETTE_SIZE + x) * 4
                pixels[o:o + 4] = [*rgb, 1.0]
    img.pixels = pixels
    img.filepath_raw = PALETTE_PATH
    img.file_format = "PNG"
    img.save()
    return img


def palette_uv(name):
    idx = PALETTE[name][0]
    u = (idx % GRID + 0.5) / GRID
    v = 1.0 - (idx // GRID + 0.5) / GRID
    return u, v


def palette_material():
    mat = bpy.data.materials.get("palette")
    if mat is None:
        mat = bpy.data.materials.new("palette")
    mat.use_nodes = True
    mat.use_backface_culling = True  # exported as doubleSided=false
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = ensure_palette_image()
    tex.interpolation = "Closest"
    bsdf.inputs["Roughness"].default_value = 0.9
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def paint(obj, color, faces=None):
    """Set UVs of the given faces (all if None) to a palette swatch."""
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uv = me.uv_layers.active.data
    u, v = palette_uv(color)
    for poly in me.polygons:
        if faces is None or poly.index in faces:
            for li in poly.loop_indices:
                uv[li].uv = (u, v)


def _to_object(bm, name, color):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    paint(ob, color)
    return ob


def _bevel(bm, bevel, segments):
    """Chamfer only the sharp edges (> ~30 deg), not grid lines on flat faces."""
    if bevel > 0:
        edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.5]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=segments, profile=0.5,
                        affect="EDGES", clamp_overlap=True)


def box(size, loc, color, name="box", drop_faces=(), bevel=0.0, segments=1, puff=0.0,
        top_cells=0, top_colors=None):
    """Axis-aligned box. size=(x, y, z) m, loc=center.

    drop_faces: '+z', '-z', ... faces to delete (ignored when bevelled).
    bevel: chamfer width in m. puff: raise the middle of the top face (pillows, cushions).
    top_cells/top_colors: split the top into N x N cells painted as a two-color checker.
    """
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    cuts = max(top_cells - 1, 2 if puff > 0 else 0)
    if cuts:
        top = [e for e in bm.edges if all(v.co.z > 0 for v in e.verts)]
        bmesh.ops.subdivide_edges(bm, edges=top, cuts=cuts, use_grid_fill=True)
    if puff > 0:
        # Lift the inner vertices of the top grid
        hx, hy = size[0] / 2 - 1e-4, size[1] / 2 - 1e-4
        for v in bm.verts:
            if v.co.z > 0 and abs(v.co.x) < hx and abs(v.co.y) < hy:
                v.co.z += puff
    _bevel(bm, bevel, segments)
    checker = {}
    if top_cells and top_colors:
        n = top_cells
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        bm.faces.index_update()
        for f in bm.faces:
            c = f.calc_center_median()
            if f.normal.z > 0.99 and c.z > hz - 1e-4:
                i = min(n - 1, int((c.x + hx) / (2 * hx) * n))
                j = min(n - 1, int((c.y + hy) / (2 * hy) * n))
                checker[f.index] = (i + j) % 2
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    if checker:
        ob = _to_object(bm, name, color)
        for k in (0, 1):
            paint(ob, top_colors[k], faces={i for i, c in checker.items() if c == k})
        return ob
    if drop_faces and bevel == 0:
        axes = {"x": 0, "y": 1, "z": 2}
        doomed = []
        for f in bm.faces:
            for d in drop_faces:
                sign = 1 if d[0] == "+" else -1
                if f.normal[axes[d[1]]] * sign > 0.9:
                    doomed.append(f)
        bmesh.ops.delete(bm, geom=doomed, context="FACES")
    return _to_object(bm, name, color)


def prism(profile_xz, thickness, y, color, name="prism", bevel=0.0, segments=1):
    """Extrude a convex 2D outline (list of (x, z)) along Y, centered on y."""
    bm = bmesh.new()
    front = [bm.verts.new((x, y - thickness / 2, z)) for x, z in profile_xz]
    back = [bm.verts.new((x, y + thickness / 2, z)) for x, z in profile_xz]
    n = len(profile_xz)
    bm.faces.new(front)
    bm.faces.new(back[::-1])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _bevel(bm, bevel, segments)
    return _to_object(bm, name, color)


def ball(radius, loc, color, name="ball", subdivisions=1):
    """Low-poly faceted ball (ico sphere; subdivisions=1 -> 80 tris)."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return _to_object(bm, name, color)


def checker_plane(size, loc, cells, colors, name="checker"):
    """Upward-facing plane split into cells=(nx, ny) faces, alternating two palette colors."""
    nx, ny = cells
    bm = bmesh.new()
    sx, sy = size
    x0, y0, z = loc[0] - sx / 2, loc[1] - sy / 2, loc[2]
    verts = [[bm.verts.new((x0 + sx * i / nx, y0 + sy * j / ny, z)) for j in range(ny + 1)] for i in range(nx + 1)]
    order = []
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((verts[i][j], verts[i + 1][j], verts[i + 1][j + 1], verts[i][j + 1]))
            order.append((i + j) % 2)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for k in (0, 1):
        paint(ob, colors[k], faces={idx for idx, c in enumerate(order) if c == k})
    return ob


def finish(parts, name):
    """Join parts into one flat-shaded mesh with the palette material."""
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.clear()
    obj.data.materials.append(palette_material())
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def triangle_count(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    n = sum(len(f.verts) - 2 for f in bm.faces)
    bm.free()
    return n


def export_glb(obj, name):
    os.makedirs(EXPORT_DIR, exist_ok=True)
    path = os.path.join(EXPORT_DIR, f"{name}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    return path

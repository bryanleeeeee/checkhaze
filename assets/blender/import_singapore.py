"""Blender 4+: blender --background --python assets/blender/import_singapore.py
Imports the same illustrated geometry used by Haze SG. No geographic accuracy implied.
Run node scripts/export-scene.mjs after editing the browser geometry.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector
root = Path(__file__).resolve().parent
mesh_data = json.loads((root / 'singapore-mesh.json').read_text())
collection = bpy.data.collections.new('Haze SG - Marina Bay')
bpy.context.scene.collection.children.link(collection)
v = mesh_data['vertices']
vertices = [(v[i], -v[i + 2], v[i + 1]) for i in range(0, len(v), 3)]
faces = [tuple(range(i, i + 3)) for i in range(0, len(vertices), 3)]
mesh = bpy.data.meshes.new('Marina Bay geometry')
mesh.from_pydata(vertices, [], faces)
mesh.update()
obj = bpy.data.objects.new('Illustrated Singapore', mesh)
collection.objects.link(obj)
colors = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
for loop in mesh.loops:
    i = loop.vertex_index * 3
    colors.data[loop.index].color = (*mesh_data['colors'][i:i+3], 1)
material = bpy.data.materials.new('Haze SG vertex colours')
material.use_nodes = True
nodes = material.node_tree.nodes
attribute = nodes.new('ShaderNodeVertexColor')
attribute.layer_name = 'Color'
material.node_tree.links.new(attribute.outputs['Color'], nodes.get('Principled BSDF').inputs['Base Color'])
mesh.materials.append(material)
camera_data = bpy.data.cameras.new('Marina Bay camera')
camera = bpy.data.objects.new('Marina Bay camera', camera_data)
collection.objects.link(camera)
camera.location = (5, -13, 9)
camera.rotation_euler = (Vector((0, 0, 1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = camera
sun_data = bpy.data.lights.new('Warm daylight', 'SUN')
sun_data.energy = 2
sun = bpy.data.objects.new('Warm daylight', sun_data)
collection.objects.link(sun)
sun.rotation_euler = (math.radians(25), math.radians(-20), math.radians(-30))
scene = bpy.context.scene
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
# The live haze and animated water run in the web app shaders.
camera.keyframe_insert(data_path='location', frame=1)
camera.location.x = 7
camera.keyframe_insert(data_path='location', frame=180)
scene.frame_end = 180
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'singapore.blend'))

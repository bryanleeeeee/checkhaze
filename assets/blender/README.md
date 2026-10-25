# Haze SG scene source

The interactive website renders procedural Marina Bay geometry using WebGL, with a Canvas fallback. The mesh is illustrative, not a geographic or street-level pollution map.

To recreate the editable model in Blender 4+:

```sh
node scripts/export-scene.mjs
blender --background --python assets/blender/import_singapore.py
```

This writes `assets/blender/singapore.blend`. The script imports into a new collection and adds a camera, daylight and a short orbit animation. Browser haze, weather and water shaders remain implemented in `src/scene3d.js` and `src/style.css`.

Blender was unavailable in the build environment. Python syntax and exported geometry were checked; a Blender render was not run.

Lighting uses Singapore time: day 07:00–17:59, evening 18:00–19:59, night 20:00–06:59. These are design boundaries, not calculated sunset times. Rain effects use the matching, currently valid NEA two-hour forecast, labelled as a forecast. Preview modes never change actual observations.

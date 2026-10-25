import {readFile,writeFile,mkdir} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(await readFile('src/scene3d.js','utf8'),context);
const mesh=vm.runInContext('singaporeGeometry()',context);
await mkdir('assets/blender',{recursive:true});
await writeFile('assets/blender/singapore-mesh.json',JSON.stringify(mesh));
console.log(`Exported ${mesh.vertices.length/9} triangles for Blender.`);

import {readFile,writeFile,mkdir} from 'node:fs/promises';
const [html,css,js,backend,skyline,core,toolkit,scene]=await Promise.all(['src/index.html','src/style.css','src/app.js','src/backend.js','src/skyline.svg','src/toolkit-core.js','src/toolkit.js','src/scene3d.js'].map(x=>readFile(x,'utf8')));
const pure=core.replace(/^export /gm,'');
const fullScript=[pure,js,toolkit,scene,"initScene3d();initToolkit();navigate(location.hash.slice(1)||'now');refresh();renderNow();"].join('\n');
const page=html.replace('<!-- SG_SKYLINE -->',()=>skyline).replace('/* APP_STYLE */',()=>css).replace('/* APP_SCRIPT */',()=>fullScript);
await mkdir('worker',{recursive:true});
await writeFile('worker/index.js',pure+'\n'+backend.replace('__PAGE_JSON__',()=>JSON.stringify(page)));

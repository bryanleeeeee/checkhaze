import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);};
let value=null,current=false;
const context=vm.createContext({document:{querySelector:el,body:{dataset:{}}},reading:()=>value,fresh:()=>current,cap:s=>s[0].toUpperCase()+s.slice(1),pmBand:v=>({index:v<=55?0:v<=150?1:v<=250?2:3,label:v<=55?'Normal':v<=150?'Elevated':v<=250?'High':'Very high'}),state:{place:{region:'central'},current:{pm25:{timestamp:'2026-10-25T12:00:00+08:00'}}},dateLabel:()=> '25 Oct',time:()=> '12:00'});
vm.runInContext(await readFile('src/scene3d.js','utf8'),context);
const mesh=vm.runInContext('singaporeGeometry()',context);
assert.equal(mesh.vertices.length,mesh.colors.length);assert.equal(mesh.vertices.length%9,0);assert(mesh.vertices.every(Number.isFinite));assert(mesh.colors.every(Number.isFinite));
vm.runInContext("scene3d={mode:'live'};updateScene3d()",context);assert.match(el('#scene3dBadge').textContent,/UNAVAILABLE/);assert.equal(vm.runInContext('scene3d.targetFog',context),.15);
for(const [v,fog] of [[0,.07],[55,.07],[56,.48],[150,.48],[151,.95],[250,.95],[251,1.7]]){value=v;current=true;vm.runInContext('updateScene3d()',context);assert.equal(vm.runInContext('scene3d.targetFog',context),fog);}
value=12;vm.runInContext("scene3d.mode='veryhigh';updateScene3d()",context);assert.match(el('#scene3dBadge').textContent,/PREVIEW/);assert.match(el('#scene3dReading').innerHTML,/12 /);assert.equal(vm.runInContext('scene3d.targetFog',context),1.7);
current=false;vm.runInContext("scene3d.mode='live';updateScene3d()",context);assert.equal(vm.runInContext('scene3d.targetFog',context),.15);assert.match(el('#scene3dBand').textContent,/last known/);
console.log('PASS 3D geometry, all PM2.5 boundaries, unavailable/stale neutral atmosphere, and preview preserving real numbers.');

function env(at,weather=null,mode='auto'){context.testNow=Date.parse(at);context.testWeather=weather;context.testMode=mode;return vm.runInContext('singaporeEnvironment(testNow,testWeather,testMode)',context);}
assert.equal(env('2026-10-25T06:59:00+08:00').theme,'night');
assert.equal(env('2026-10-25T07:00:00+08:00').theme,'day');
assert.equal(env('2026-10-25T17:59:00+08:00').theme,'day');
assert.equal(env('2026-10-25T18:00:00+08:00').theme,'evening');
assert.equal(env('2026-10-25T20:00:00+08:00').theme,'night');
const rainy={forecast:'Thundery Showers',valid:{start:'2026-10-25T18:00:00+08:00',end:'2026-10-25T20:00:00+08:00'}};
assert.equal(env('2026-10-25T19:00:00+08:00',rainy).theme,'rain');
assert.equal(env('2026-10-25T20:00:00+08:00',rainy).theme,'night');
assert.equal(env('2026-10-25T17:59:00+08:00',rainy).theme,'day');
assert.equal(env('2026-10-25T19:00:00+08:00',{...rainy,valid:{}}).theme,'evening');
assert.equal(env('2026-10-25T19:00:00+08:00',rainy,'day').preview,true);
console.log('PASS Singapore time boundaries, valid rain forecast, expired/future/malformed forecast, and lighting preview.');

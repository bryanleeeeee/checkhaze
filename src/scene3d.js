// Self-contained WebGL scene: no external model or rendering dependency.
let scene3d=null;
let sceneEnvironmentMode='auto';
function singaporeEnvironment(now,weather,mode='auto'){
 const hour=new Date(now+8*3600000).getUTCHours();
 const period=hour>=7&&hour<18?'day':hour>=18&&hour<20?'evening':'night';
 const valid=weather?.valid,start=Date.parse(valid?.start),end=Date.parse(valid?.end);
 const covered=Number.isFinite(start)&&Number.isFinite(end)&&now>=start&&now<end;
 const rainy=covered&&/rain|showers|thunder/i.test(weather.forecast||'');
 const theme=['day','evening','night','rain'].includes(mode)?mode:rainy?'rain':period;
 return{theme,period,hour,rainy,covered,preview:mode!=='auto',weather:covered?weather:null};
}
function updateSceneEnvironment(){
 const now=Date.now(),weather=typeof weatherFor==='function'&&!state.offline?weatherFor(state.place,now):null;
 const env=singaporeEnvironment(now,weather,sceneEnvironmentMode);
 document.body.dataset.environment=env.theme;document.body.dataset.timeperiod=env.period;
 const label={day:'Daylight',evening:'Evening glow',night:'Night',rain:'Rain forecast'}[env.theme];
 const detail=env.preview?'Lighting preview · '+(env.theme==='rain'?'Rain':label):label+' · '+time(new Date(now).toISOString())+' SGT';
 const badge=document.querySelector('#scene3dEnvironment');if(badge)badge.textContent=detail;
 const note=document.querySelector('#sceneEnvironmentNote');if(note)note.textContent=env.preview?'Lighting preview only; weather and air readings remain unchanged.':env.weather?'NEA 2-hour forecast: '+env.weather.forecast+' · '+env.weather.area+(env.weather.approx?' (nearby forecast area)':'')+' · valid until '+time(env.weather.valid.end)+' SGT. Effects are illustrative.':'Singapore local time sets the lighting. Current local weather is unavailable; rain is not inferred.';
 return env;
}
function singaporeGeometry(){
 const vertices=[],colors=[];
 const tri=(a,b,c,col)=>{vertices.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(...col);};
 const shade=(c,k)=>c.map(x=>x*k);
 function box(x,y,z,w,h,d,c){const v=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y+h,z-d/2],[x-w/2,y+h,z-d/2],[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y+h,z+d/2],[x-w/2,y+h,z+d/2]];[[0,1,2,3,.65],[4,7,6,5,1],[0,3,7,4,.8],[1,5,6,2,.9],[3,2,6,7,1.15],[0,4,5,1,.5]].forEach(([a,b,c1,d1,k])=>{tri(v[a],v[b],v[c1],shade(c,k));tri(v[a],v[c1],v[d1],shade(c,k));});}
 function cylinder(x,y,z,r,h,c,n=16,topR=r){for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,p=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],u=[x+Math.cos(a)*topR,y+h,z+Math.sin(a)*topR],v=[x+Math.cos(b)*topR,y+h,z+Math.sin(b)*topR];tri(p,q,u,shade(c,.7+.25*Math.sin(a)));tri(q,v,u,shade(c,.7+.25*Math.sin(a)));tri([x,y+h,z],u,v,shade(c,1.2));}}
 // Quays and gardens surround an open bay, with the CBD opposite MBS.
 box(-3,-.28,-1.8,6.2,.3,5.7,[.18,.32,.28]);box(3.6,-.28,-.8,3.7,.3,7.7,[.19,.36,.3]);box(0,-.28,-4.9,12,.3,1.4,[.19,.35,.29]);
 box(-3.1,.03,.8,6,.04,.12,[.66,.68,.48]);box(3.55,.03,2.8,3.4,.04,.12,[.66,.68,.48]);
 let seed=913;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<44;i++){const x=-5.5+rnd()*4.5,z=-4+rnd()*4.3,w=.28+rnd()*.36,d=.3+rnd()*.35,h=.65+rnd()*2.4,c=[.22+rnd()*.12,.38+rnd()*.12,.43+rnd()*.15];box(x,0,z,w,h,d,c);box(x,h,z,w*.65,.12,d*.65,[.45,.64,.63]);for(let yy=.2;yy<h-.1;yy+=.26){box(x,yy,z+d/2+.005,w*.7,.035,.013,[.78,.77,.48]);} }
 // Three hotel towers and curved SkyPark silhouette.
 for(const z of [-1.35,-.15,1.05]){box(2.75,0,z,.57,2.6,.7,[.57,.69,.65]);box(2.52,0,z,.16,2.5,.7,[.31,.48,.51]);for(let y=.16;y<2.5;y+=.16)box(3.04,y,z,.014,.025,.62,[.84,.82,.6]);}
 box(2.75,2.62,-.15,.92,.18,4.35,[.39,.54,.45]);cylinder(2.75,2.62,2.03,.46,.18,[.39,.54,.45],20);cylinder(2.75,2.62,-2.32,.46,.18,[.39,.54,.45],20);box(2.75,2.82,-.2,.45,.025,3.1,[.28,.66,.69]);
 // ArtScience lotus: tapered white petals around the bowl.
 cylinder(1.65,0,2.1,.4,.35,[.75,.8,.72],20,.6);
 for(let i=0;i<10;i++){const a=i*Math.PI/5,r=.55;const base=[1.65+Math.cos(a)*.2,.3,2.1+Math.sin(a)*.2],tip=[1.65+Math.cos(a)*.8,1+((i%3)*.08),2.1+Math.sin(a)*.8],left=[1.65+Math.cos(a-.25)*r,.5,2.1+Math.sin(a-.25)*r],right=[1.65+Math.cos(a+.25)*r,.5,2.1+Math.sin(a+.25)*r];tri(base,left,tip,[.85,.86,.77]);tri(base,tip,right,[.65,.75,.7]);}
 // Singapore Flyer wheel, with spokes and cabins, in the XY plane.
 const cx=4.5,cy=1.3,cz=-3.55,R=1.1;
 for(let i=0;i<64;i++){const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2;const p=r=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r,cz],q=r=>[cx+Math.cos(b)*r,cy+Math.sin(b)*r,cz];tri(p(R),q(R),p(R-.055),[.75,.81,.74]);tri(q(R),q(R-.055),p(R-.055),[.75,.81,.74]);if(i%4===0){tri([cx,cy,cz],p(R),[cx+.018,cy,cz],[.55,.68,.65]);box(cx+Math.cos(a)*R,cy+Math.sin(a)*R-.07,cz,.15,.15,.17,[.65,.82,.79]);}}box(cx,0,cz,.12,cy,.12,[.6,.7,.66]);
 // Supertree grove and landscaping.
 for(const [x,z,h] of [[4,1.2,1.2],[4.7,.6,.8],[4.8,1.8,1],[3.9,2.25,.7]]){cylinder(x,0,z,.08,h,[.45,.3,.36],10,.14);cylinder(x,h*.72,z,.16,h*.28,[.55,.32,.46],14,.47);cylinder(x,h,z,.47,.08,[.39,.52,.36],14,.42);}
 for(let i=0;i<25;i++){const x=3.6+rnd()*1.7,z=-2.4+rnd()*4.8;cylinder(x,0,z,.07,.3,[.29,.28,.17],8);cylinder(x,.25,z,.2,.28,[.2,.46,.3],8,.08);}
 return{vertices,colors};
}
function initScene3d(){
 const canvas=document.querySelector('#singapore3d');if(!canvas)return;document.querySelector('#sceneEnvironmentMode').onchange=e=>{sceneEnvironmentMode=e.target.value;updateScene3d();};setInterval(()=>{if(!document.hidden)updateScene3d();},60000);
 let gl;try{gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});}catch{}
 const geometry=singaporeGeometry();let render;
 if(gl){
 const vertex=`attribute vec3 position;attribute vec3 color;uniform float yaw;uniform float pitch;uniform float zoom;uniform float aspect;varying mediump vec3 vColor;varying mediump float depth;varying mediump vec3 world;void main(){world=position;vec3 p=position-vec3(0.,.7,0.);p=vec3(cos(yaw)*p.x+sin(yaw)*p.z,p.y,-sin(yaw)*p.x+cos(yaw)*p.z);p=vec3(p.x,cos(pitch)*p.y-sin(pitch)*p.z,sin(pitch)*p.y+cos(pitch)*p.z);p.z-=zoom;depth=-p.z;gl_Position=vec4(p.x*1.9/aspect,p.y*1.9,-1.002*p.z-.2,-p.z);vColor=color;}`;
 const fragment=`precision mediump float;varying mediump vec3 vColor;varying mediump float depth;varying mediump vec3 world;uniform vec3 hazeColor;uniform float fog;uniform float clock;uniform float water;uniform float daylight;void main(){vec3 c=vColor*daylight;if(vColor.r>.65&&vColor.g>.6&&vColor.b<.65)c=mix(c,vColor,1.-daylight);if(water>.5){float wave=sin(world.x*8.+clock*.8+world.z*4.)*sin(world.z*12.-clock*.7);c+=wave*.025;float shine=pow(max(0.,sin(world.x*2.+world.z*3.+clock*.4)),18.);c+=shine*vec3(.07,.1,.1);}float drift=.8+.2*sin(world.x*.5+world.z*.4+clock*.13);float f=1.-exp(-fog*depth*.075*drift);gl_FragColor=vec4(mix(c,hazeColor,clamp(f,0.,.9)),1.);}`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Link failed');}catch{document.querySelector('#scene3dFallback').classList.remove('hidden');return;}
 gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
 const uniforms=Object.fromEntries(['yaw','pitch','zoom','aspect','hazeColor','fog','clock','water','daylight'].map(x=>[x,gl.getUniformLocation(program,x)]));
 function mesh(vertices,colors){const vao={count:vertices.length/3};for(const [key,data] of [['position',vertices],['color',colors]]){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);vao[key]=b;}return vao;}
 const city=mesh(geometry.vertices,geometry.colors),sea=mesh([-45,-.32,-45,45,-.32,-45,45,-.32,45,-45,-.32,-45,45,-.32,45,-45,-.32,45],Array.from({length:6},()=>[.055,.23,.28]).flat());
 function bind(m){for(const name of ['position','color']){gl.bindBuffer(gl.ARRAY_BUFFER,m[name]);const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);}gl.drawArrays(gl.TRIANGLES,0,m.count);}
 render=(s,width,height)=>{gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(...s.color,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(uniforms.yaw,s.yaw+(s.motion?Math.sin(s.clock*.09)*.045:0));gl.uniform1f(uniforms.pitch,s.pitch);gl.uniform1f(uniforms.zoom,s.zoom);gl.uniform1f(uniforms.aspect,width/height);gl.uniform1f(uniforms.clock,s.clock);gl.uniform1f(uniforms.fog,s.fog);gl.uniform3fv(uniforms.hazeColor,s.color);gl.uniform1f(uniforms.daylight,s.daylight);gl.uniform1f(uniforms.water,1);bind(sea);gl.uniform1f(uniforms.water,0);bind(city);};
 }else{
 render=softwareSceneRenderer(canvas,geometry);
 if(!render){document.querySelector('#scene3dFallback').classList.remove('hidden');document.querySelectorAll('.island3d-controls button,.island3d-controls select').forEach(el=>el.disabled=true);return;}
 }
 const media=window.matchMedia('(prefers-reduced-motion: reduce)');
 scene3d={yaw:-.35,pitch:.55,zoom:14,motion:!media.matches,visible:false,mode:'live',fog:.15,targetFog:.15,color:[.31,.43,.48],targetColor:[.31,.43,.48],last:0,clock:0,frame:0,contextLost:false};
 function draw(now=0){const s=scene3d;s.frame=0;if(!s.visible||document.hidden||s.contextLost)return;if(s.motion&&s.last&&now-s.last<(gl?30:45)){s.frame=requestAnimationFrame(draw);return;}const dt=s.last?Math.min(.05,(now-s.last)/1000):0;s.last=now;if(s.motion)s.clock+=dt;const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}s.fog=s.motion?s.fog+(s.targetFog-s.fog)*.06:s.targetFog;s.color=s.color.map((v,i)=>s.motion?v+(s.targetColor[i]-v)*.06:s.targetColor[i]);render(s,width,height);if(s.motion)s.frame=requestAnimationFrame(draw);}
 scene3d.redraw=()=>{if(!scene3d.frame)scene3d.frame=requestAnimationFrame(draw);};
 const motion=document.querySelector('#scene3dMotion');function motionLabel(){document.body.dataset.sceneMotion=scene3d.motion?'playing':'paused';motion.textContent=scene3d.motion?'Pause motion':'Play motion';motion.setAttribute('aria-pressed',String(scene3d.motion));}motionLabel();motion.onclick=()=>{scene3d.motion=!scene3d.motion;motionLabel();scene3d.redraw();};media.addEventListener?.('change',e=>{scene3d.motion=!e.matches;motionLabel();scene3d.redraw();});
 for(const [id,fn] of [['Left',()=>scene3d.yaw-=.25],['Right',()=>scene3d.yaw+=.25],['ZoomIn',()=>scene3d.zoom=Math.max(9,scene3d.zoom-1)],['ZoomOut',()=>scene3d.zoom=Math.min(22,scene3d.zoom+1)],['Reset',()=>{scene3d.yaw=-.35;scene3d.pitch=.55;scene3d.zoom=14;}]])document.querySelector('#scene3d'+id).onclick=()=>{fn();scene3d.redraw();};
 let drag=null;canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;scene3d.yaw+=(e.clientX-drag.x)*.007;scene3d.pitch=Math.max(.18,Math.min(1.15,scene3d.pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};scene3d.redraw();});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
 canvas.addEventListener('keydown',e=>{const id={ArrowLeft:'Left',ArrowRight:'Right','+':'ZoomIn','=':'ZoomIn','-':'ZoomOut',Home:'Reset'}[e.key];if(id){e.preventDefault();document.querySelector('#scene3d'+id).click();}});
 document.querySelector('#scene3dMode').onchange=e=>{scene3d.mode=e.target.value;updateScene3d();};
 new ResizeObserver(()=>scene3d.redraw()).observe(canvas);new IntersectionObserver(entries=>{scene3d.visible=entries[0].isIntersecting;scene3d.last=0;scene3d.redraw();},{rootMargin:'80px'}).observe(canvas);document.addEventListener('visibilitychange',()=>{scene3d.last=0;scene3d.redraw();});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();scene3d.contextLost=true;document.querySelector('#scene3dFallback').classList.remove('hidden');});canvas.addEventListener('webglcontextrestored',()=>{document.querySelector('#scene3dFallback').textContent='3D graphics recovered. Reload this page to restart the scene.';});updateScene3d();
}
function updateScene3d(){const env=updateSceneEnvironment();if(!scene3d)return;const s=scene3d,pm=reading('pm25'),live=fresh('pm25'),preview=s.mode!=='live',keys=['normal','elevated','high','veryhigh'],index=preview?keys.indexOf(s.mode):live?pmBand(pm).index:-1;const palettes=[[.36,.59,.64],[.56,.49,.35],[.51,.36,.24],[.39,.28,.35]];const base={day:[.30,.75,.84],evening:[.79,.53,.49],night:[.13,.24,.40],rain:env.period==='night'?[.18,.29,.39]:[.46,.63,.71]}[env.theme];s.daylight={day:1.13,evening:1,night:.64,rain:env.period==='night'?.62:.91}[env.theme];const tint=index<1?0:[0,.27,.43,.6][index];s.targetColor=base.map((c,i)=>c*(1-tint)+(palettes[index]?.[i]||c)*tint);s.targetFog=index<0?.15:[.07,.48,.95,1.7][index];document.querySelector('#scene3dBadge').textContent=preview?'VISUAL PREVIEW':live?'CURRENT PM2.5':'CURRENT DATA UNAVAILABLE';document.querySelector('#scene3dRegion').textContent=cap(state.place.region)+' reporting region';document.querySelector('#scene3dReading').innerHTML=(pm??'—')+' <small>µg/m³ · actual reading</small>';document.querySelector('#scene3dBand').textContent=pm===null?'Awaiting observation':pmBand(pm).label+(live?'':' · last known');document.querySelector('#scene3dStatus').textContent=preview?'Visual preview: '+(s.mode==='veryhigh'?'Very high':cap(s.mode))+'. Actual readings remain unchanged. Select Current reading to return.':live?'Observed '+dateLabel(state.current.pm25.timestamp)+' · '+time(state.current.pm25.timestamp)+' SGT. Drag to rotate; arrow keys also work.':'Neutral atmosphere until fresh official data arrives. The model is illustrative, not a street-level pollution map.';s.redraw?.();}
// Canvas fallback projects the identical mesh, retaining rotation on devices without WebGL.
function softwareSceneRenderer(canvas,geometry){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
 const faces=[];for(let i=0;i<geometry.vertices.length;i+=9)faces.push({v:geometry.vertices.slice(i,i+9),c:geometry.colors.slice(i,i+3)});
 const rgb=c=>'rgb('+c.map(x=>Math.round(Math.max(0,Math.min(1,x))*255)).join(',')+')';
 return(s,width,height)=>{
 const scale=canvas.width/width;ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle=rgb(s.color);ctx.fillRect(0,0,width,height);
 const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'rgba(9,28,39,.12)');sky.addColorStop(1,'rgba(3,39,48,.75)');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
 const yaw=s.yaw+(s.motion?Math.sin(s.clock*.09)*.045:0),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(s.pitch),sp=Math.sin(s.pitch);
 function project(x,y,z){y-=.7;const xx=cy*x+sy*z,zz=-sy*x+cy*z,yy=cp*y-sp*zz,depth=s.zoom-sp*y-cp*zz;return[width/2+xx*.95*height/depth,height/2-yy*.95*height/depth,depth];}
 // Soft animated water glints sit beneath the city.
 ctx.strokeStyle='rgba(158,209,202,.13)';ctx.lineWidth=1;
 for(let i=0;i<48;i++){let x=((i*137.17+s.clock*5)%width),y=height*.46+(i*31.73)%(height*.54);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8+Math.sin(i+s.clock)*5,y);ctx.stroke();}
 const projected=faces.map(f=>{const p=[];for(let j=0;j<9;j+=3)p.push(project(...f.v.slice(j,j+3)));return{p,c:f.c,d:(p[0][2]+p[1][2]+p[2][2])/3,x:f.v[0],z:f.v[2]};}).sort((a,b)=>b.d-a.d);
 for(const f of projected){if(f.p.some(p=>p[2]<.2))continue;const fog=Math.min(.9,1-Math.exp(-s.fog*f.d*.075*(.8+.2*Math.sin(f.x*.5+f.z*.4+s.clock*.13))));const emissive=f.c[0]>.65&&f.c[1]>.6&&f.c[2]<.65;ctx.fillStyle=rgb(f.c.map((c,i)=>c*(emissive?1:s.daylight)*(1-fog)+s.color[i]*fog));ctx.beginPath();ctx.moveTo(f.p[0][0],f.p[0][1]);ctx.lineTo(f.p[1][0],f.p[1][1]);ctx.lineTo(f.p[2][0],f.p[2][1]);ctx.closePath();ctx.fill();}
 // Translucent banks drift across the foreground as the selected haze band rises.
 if(s.fog>.2){for(let i=0;i<3;i++){const x=width*(.3+i*.27)+Math.sin(s.clock*.13+i)*width*.18,y=height*(.35+i*.2),r=width*.55;const cloud=ctx.createRadialGradient(x,y,0,x,y,r);cloud.addColorStop(0,'rgba('+s.color.map(c=>Math.round(c*255)).join(',')+','+Math.min(.23,s.fog*.13)+')');cloud.addColorStop(1,'transparent');ctx.fillStyle=cloud;ctx.fillRect(0,0,width,height);}}
 };
}

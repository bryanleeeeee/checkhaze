const PAGE = __PAGE_JSON__;
const API = 'https://api-open.data.gov.sg/v2/real-time/api/';
const memo = new Map();
// Share only completed JSON values. Pending I/O belongs to its Worker request.
async function cached(key, ttl, factory) {
  const existing=memo.get(key);
  if(existing&&existing.until>Date.now())return existing.value;
  const value=await factory();
  memo.set(key,{until:Date.now()+ttl,value});
  if(memo.size>180)memo.delete(memo.keys().next().value);
  return value;
}
let nextApiStart=0;
async function scheduledApi(job,background=false){
 // Every waiter owns its timer and fetch; no cross-request promises or pump.
 if(background)await new Promise(resolve=>setTimeout(resolve,250));
 let delay=nextApiStart-Date.now();
 while(delay>0){await new Promise(resolve=>setTimeout(resolve,delay));delay=nextApiStart-Date.now();}
 nextApiStart=Date.now()+1850;
 return await job();
}
async function get(url,json=true,background=false){
 const retrieve=async()=>{const response=await fetch(url,{signal:AbortSignal.timeout(background?30000:16000),headers:{Accept:json?'application/json':'text/html'}});if(response.status===429){nextApiStart=Math.max(nextApiStart,Date.now()+Math.max(11000,Number(response.headers.get('Retry-After'))*1000||0));throw new Error('Official source rate limit; please retry shortly.');}if(!response.ok)throw new Error('Official source returned '+response.status);const data=json?await response.json():await response.text();if(json&&data.code!==undefined&&data.code!==0)throw new Error('Official source is unavailable');return data;};
 return String(url).startsWith(API)?scheduledApi(retrieve,background):retrieve();
}
async function currentMetric(metric){const raw=await get(API+metric);const item=raw.data?.items?.[0];if(!item?.readings||!item.timestamp)throw new Error('No current observation returned.');return {item,regions:raw.data.regionMetadata||[],fetchedAt:new Date().toISOString()};}
async function current() {
  const results = await Promise.allSettled(['pm25','psi'].map(x=>get(API+x)));
  const out = {fetchedAt:new Date().toISOString(),pm25:null,psi:null,regions:[],errors:[]};
  results.forEach((r,i)=>{const key=['pm25','psi'][i]; if(r.status==='fulfilled'){out[key]=r.value.data.items?.[0]||null;out.regions=r.value.data.regionMetadata||out.regions;}else out.errors.push(key);});
  if (!out.pm25 && !out.psi) throw new Error('Live air-quality sources are temporarily unavailable. Please try again.');
  return out;
}
async function history() {
  const today=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  const yesterday=new Date(Date.now()+8*3600000-86400000).toISOString().slice(0,10);
  const dayBefore=new Date(Date.now()+8*3600000-2*86400000).toISOString().slice(0,10);
  const jobs=['pm25','psi'].flatMap(metric=>[today,yesterday,dayBefore].map(date=>({metric,date}))); 
  const results=await Promise.allSettled(jobs.map(j=>get(API+j.metric+'?date='+j.date)));
  const out={pm25:[],psi:[],errors:[],fetchedAt:new Date().toISOString()};
  results.forEach((r,i)=>{if(r.status==='fulfilled')out[jobs[i].metric].push(...(r.value.data.items||[]));else out.errors.push(jobs[i].metric+' '+jobs[i].date);});
  for(const m of ['pm25','psi'])out[m]=[...new Map(out[m].filter(x=>x.timestamp && x.readings).map(x=>[x.timestamp,x])).values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).filter(x=>Date.parse(x.timestamp)>=Date.now()-49*3600000).map(x=>({timestamp:x.timestamp,readings:{[m==='pm25'?'pm25_one_hourly':'psi_twenty_four_hourly']:x.readings[m==='pm25'?'pm25_one_hourly':'psi_twenty_four_hourly']}}));
  if(!out.pm25.length&&!out.psi.length)throw new Error('Hourly history is temporarily unavailable.');
  return out;
}
async function outlook(){
 const data=await get(API+'four-day-outlook');
 return{fetchedAt:new Date().toISOString(),regional:null,situation:null,forecastGraphic:null,forecastDate:null,weather:data.data?.records?.[0]||null,errors:[],licensedApiOnly:true};
}
async function localWeather(){const data=await get(API+'two-hr-forecast');const item=data.data?.items?.[0];if(!item)throw new Error('The local weather forecast is temporarily unavailable.');return{forecast:item,areas:data.data.area_metadata||[],fetchedAt:new Date().toISOString()};}
async function historicalDay(metric,date){return cached('day:'+metric+':'+date,date===hazeSgDay()?600000:86400000,async()=>{
 const cache=typeof caches!=='undefined'?caches.default:null;const key=new Request('https://haze-sg-cache.invalid/history/'+metric+'/'+date);
 try{const hit=cache&&await cache.match(key);if(hit)return await hit.json();}catch{}
 const data=await get(API+metric+'?date='+date,true,true);const items=(data.data?.items||[]).filter(x=>Date.parse(x.timestamp)<=Date.now()+300000);if(!items.length)throw new Error('No observations returned for '+date);
 const rolled=hazeDailyRollup(items,metric,date);if(!Object.values(rolled.regions).some(x=>x.count))throw new Error('No valid readings for '+date);
 if(cache)try{await cache.put(key,Response.json(rolled,{headers:{'Cache-Control':'public,max-age='+(date===hazeSgDay()?600:86400)}}));}catch{}
 return rolled;
});}
async function weeklyChunk(metric,chunk){
 const today=hazeSgDay();const dates=Array.from({length:7},(_,i)=>hazeDayOffset(today,-chunk*7-i));const days=[],errors=[];
 await Promise.all(dates.map(async date=>{try{days.push(await historicalDay(metric,date));}catch{errors.push(date);}}));return{metric,chunk,days:days.sort((a,b)=>a.date.localeCompare(b.date)),errors,fetchedAt:new Date().toISOString(),today};
}
// Website text/images are not republished. These services require separate permissions.
async function extendedOutlook(){return{fortnight:null,seasonal:null,subseasonal:null,fetchedAt:new Date().toISOString(),errors:[],licensedApiOnly:true};}

export default {
 async fetch(request) {
  const url=new URL(request.url);
  const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'geolocation=(self)', 'X-Frame-Options':'SAMEORIGIN'};
  if(url.pathname==='/')return new Response(PAGE,{headers:{...headers,'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
  if(url.pathname==='/favicon.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#133a37"/><path d="M14 23h27a6 6 0 1 0-6-6M14 32h37M14 41h20a6 6 0 1 1-6 6" fill="none" stroke="#cff58a" stroke-width="5" stroke-linecap="round"/></svg>',{headers:{'content-type':'image/svg+xml'}});
  if(url.pathname==='/api/weeks'){const metric=url.searchParams.get('metric'),chunk=Number(url.searchParams.get('chunk'));if(!['pm25','psi'].includes(metric)||!Number.isInteger(chunk)||chunk<0||chunk>3)return Response.json({error:'Invalid history request'},{status:400});try{const key='weeks:'+hazeSgDay()+':'+metric+':'+chunk;const data=await cached(key,600000,()=>weeklyChunk(metric,chunk));if(data.errors.length)memo.delete(key);return Response.json(data,{headers:{...headers,'Cache-Control':data.errors.length?'no-store':'public,max-age=300'}});}catch{return Response.json({error:'Weekly history is temporarily unavailable.'},{status:503});}}
  const routes={'/api/current-pm25':[60000,()=>currentMetric('pm25')],'/api/current-psi':[60000,()=>currentMetric('psi')],'/api/current':[240000,current],'/api/history':[600000,history],'/api/outlook':[900000,outlook],'/api/local-weather':[240000,localWeather],'/api/extended-outlook':[3600000,extendedOutlook]};
  if(routes[url.pathname]){
    try { const [ttl,fn]=routes[url.pathname];const data=await cached(url.pathname,ttl,fn);const partial=!!data.errors?.length||(url.pathname==='/api/extended-outlook'&&!data.licensedApiOnly&&(!data.fortnight||!data.seasonal||!data.subseasonal));if(partial)memo.delete(url.pathname);return Response.json(data,{headers:{...headers,'Cache-Control':partial?'no-store':'public, max-age=60'}}); }
    catch(e){return Response.json({error:e.message},{status:503,headers:{...headers,'Cache-Control':'no-store'}});}
  }
  return new Response('Not found',{status:404,headers});
 }
};

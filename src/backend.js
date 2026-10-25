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
 const retrieve=async()=>{const response=await fetch(url,{signal:AbortSignal.timeout(background?30000:16000),headers:{Accept:json?'application/json':'text/html'}});if(response.status===429){nextApiStart=Math.max(nextApiStart,Date.now()+11000);throw new Error('Official source rate limit; please retry shortly.');}if(!response.ok)throw new Error('Official source returned '+response.status);const data=json?await response.json():await response.text();if(json&&data.code!==undefined&&data.code!==0)throw new Error('Official source is unavailable');return data;};
 return String(url).startsWith(API)?scheduledApi(retrieve,background):retrieve();
}
function clean(s = '') {
  return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&ndash;|&#8211;/g,'–').replace(/&mdash;|&#8212;/g,'—').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
}
function section(html, heading) {
  const match = html.match(new RegExp('<h[23][^>]*>\\s*'+heading+'\\s*</h[23]>([\\s\\S]*?)(?=<h[23]|<div class="overlay-checkbox|$)','i'));
  if (!match) return null;
  const text = clean(match[1]);
  const update = text.match(/Updated on\s+(.+?)(?: Overlay|$)/i);
  return {text:text.replace(/Updated on[\s\S]*$/i,'').trim(), updated:update?.[1]?.trim()||null};
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
async function outlook() {
  const results=await Promise.allSettled([get('https://www.haze.gov.sg/',false),get(API+'four-day-outlook')]);
  const out={fetchedAt:new Date().toISOString(),regional:null,situation:null,forecastGraphic:null,forecastHeader:null,healthGraphic:null,forecastDate:null,weather:null,errors:[]};
  if(results[0].status==='fulfilled'){
    const h=results[0].value;
    out.regional=section(h,'Weather and Haze Outlook');out.situation=section(h,'Latest Weather and Haze Situation');
    for (const [key,pattern] of [['forecastGraphic',/src="(\/images\/[^" ]*psi-forecast_(\d{4}-\d{2}-\d{2})\.png[^" ]*)"/i],['forecastHeader',/src="(\/images\/[^" ]*psi-header_[^" ]+\.png[^" ]*)"/i],['healthGraphic',/src="(\/images\/[^" ]*(?:unhealthy|moderate|hazardous)_[^" ]+\.png[^" ]*)"/i]]){
      const m=h.match(pattern); if(m){out[key]='https://www.haze.gov.sg'+m[1];if(key==='forecastGraphic')out.forecastDate=m[2];}
    }
  }else out.errors.push('haze outlook');
  if(results[1].status==='fulfilled')out.weather=results[1].value.data.records?.[0]||null;else out.errors.push('weather');
  return out;
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
function limitWords(text,n=150){const words=text.split(/\s+/);return words.length>n?words.slice(0,n).join(' ')+'…':text;}
function paragraphs(html){return[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1]).replace(/^\d+\s+/,'' )).filter(t=>t.length>35);}
function outlookEnd(period){const months=['january','february','march','april','may','june','july','august','september','october','november','december'];const m=period.match(/(?:(\d{1,2})\s+)?([a-z]+)\s+(\d{4})\)?$/i);if(!m)return null;const month=months.indexOf(m[2].toLowerCase());if(month<0)return null;const day=m[1]?Number(m[1]):new Date(Date.UTC(Number(m[3]),month+1,0)).getUTCDate();return m[3]+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
async function extendedOutlook(){
 const urls=['https://www.weather.gov.sg/weather-fortnightly-outlook/','https://asmc.asean.org/asmc-seasonal-outlook/','https://asmc.asean.org/home/'];const res=await Promise.allSettled(urls.map(u=>get(u,false)));const out={fortnight:null,seasonal:null,subseasonal:null,fetchedAt:new Date().toISOString(),errors:[]};
 if(res[0].status==='fulfilled'){const h=res[0].value,t=clean(h);const period=t.match(/WEATHER OUTLOOK\s*\(([^)]+)\)/i)?.[1]||'Source period unavailable';const ps=paragraphs(h);const haze=ps.find(p=>/smoke haze|PM2\.5/i.test(p));const weather=ps.find(p=>/localised.*showers|rainfall.*forecast/i.test(p));out.fortnight={period,validUntil:outlookEnd(period),text:limitWords([haze,weather].filter(Boolean).join(' '),175),url:urls[0]};if(!out.fortnight.text)out.fortnight=null;}else out.errors.push('Singapore fortnightly outlook');
 if(res[1].status==='fulfilled'){const h=res[1].value,t=clean(h);const period=t.match(/Seasonal Forecast for\s+(.+?\d{4})/i)?.[1]||'Source period unavailable';const updated=t.match(/Updated\s+(\d{1,2}\s+[a-z]+\s+\d{4})/i)?.[1]||null;const ps=paragraphs(h);const relevant=ps.filter(p=>/hotspot.*smoke haze|transboundary haze/i.test(p));out.seasonal={period,updated,validUntil:outlookEnd(period),text:limitWords(relevant.slice(0,2).join(' '),150),url:urls[1]};if(!out.seasonal.text)out.seasonal=null;}else out.errors.push('Regional seasonal outlook');
 if(res[2].status==='fulfilled'){const match=res[2].value.match(/href=["'](https:\/\/asmc\.asean\.org\/subseasonal-weather-outlook-[^"']+)["']/i);if(match){try{const h=await get(match[1],false),t=clean(h);const period=t.match(/Subseasonal Weather Outlook\s*\(([^)]+)\)/i)?.[1]||'Source period unavailable';const updated=t.match(/Issued:\s*(\d{1,2}\s+[a-z]+\s+\d{4})/i)?.[1]||null;const ps=paragraphs(h).filter(p=>/predicted|expected/i.test(p)&&/conditions|rainfall|temperature/i.test(p));out.subseasonal={period,updated,validUntil:outlookEnd(period),text:limitWords(ps.slice(0,2).join(' '),160),url:match[1]};if(!out.subseasonal.text)out.subseasonal=null;}catch{out.errors.push('Regional two-week outlook');}}}
 return out;
}

export default {
 async fetch(request) {
  const url=new URL(request.url);
  const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'geolocation=(self)', 'X-Frame-Options':'SAMEORIGIN'};
  if(url.pathname==='/')return new Response(PAGE,{headers:{...headers,'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
  if(url.pathname==='/favicon.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#133a37"/><path d="M14 23h27a6 6 0 1 0-6-6M14 32h37M14 41h20a6 6 0 1 1-6 6" fill="none" stroke="#cff58a" stroke-width="5" stroke-linecap="round"/></svg>',{headers:{'content-type':'image/svg+xml'}});
  if(url.pathname==='/api/weeks'){const metric=url.searchParams.get('metric'),chunk=Number(url.searchParams.get('chunk'));if(!['pm25','psi'].includes(metric)||!Number.isInteger(chunk)||chunk<0||chunk>3)return Response.json({error:'Invalid history request'},{status:400});try{const key='weeks:'+hazeSgDay()+':'+metric+':'+chunk;const data=await cached(key,600000,()=>weeklyChunk(metric,chunk));if(data.errors.length)memo.delete(key);return Response.json(data,{headers:{...headers,'Cache-Control':data.errors.length?'no-store':'public,max-age=300'}});}catch{return Response.json({error:'Weekly history is temporarily unavailable.'},{status:503});}}
  const routes={'/api/current-pm25':[60000,()=>currentMetric('pm25')],'/api/current-psi':[60000,()=>currentMetric('psi')],'/api/current':[240000,current],'/api/history':[600000,history],'/api/outlook':[900000,outlook],'/api/local-weather':[240000,localWeather],'/api/extended-outlook':[3600000,extendedOutlook]};
  if(routes[url.pathname]){
    try { const [ttl,fn]=routes[url.pathname];const data=await cached(url.pathname,ttl,fn);const partial=!!data.errors?.length||(url.pathname==='/api/extended-outlook'&&(!data.fortnight||!data.seasonal||!data.subseasonal));if(partial)memo.delete(url.pathname);return Response.json(data,{headers:{...headers,'Cache-Control':partial?'no-store':'public, max-age=60'}}); }
    catch(e){return Response.json({error:e.message},{status:503,headers:{...headers,'Cache-Control':'no-store'}});}
  }
  return new Response('Not found',{status:404,headers});
 }
};

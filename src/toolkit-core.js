export function hazeNumber(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0;}
export function hazeBandIndex(v,metric='pm25'){if(!hazeNumber(v))return -1;return metric==='pm25'?(v<=55?0:v<=150?1:v<=250?2:3):(v<=50?0:v<=100?1:v<=200?2:v<=300?3:4);}
export function hazePlanAdvice({pm,current,profile='general',strenuous=false,future=false}){
 if(future)return{tone:'neutral',label:'Recheck later',title:'Plan it, then recheck.',text:'Use the official outlook for advance planning. A reading observed now cannot predict the air at your chosen future hour.'};
 if(!current||!hazeNumber(pm))return{tone:'neutral',label:'Needs fresh data',title:'Check again before heading out.',text:'A current regional PM2.5 observation is needed for an immediate activity check. Consult NEA if this feed is delayed.'};
 const band=hazeBandIndex(pm),sensitive=profile==='sensitive';
 if(band===0)return{tone:'good',label:'Normal band',title:'Normal activities for this hour.',text:'The current NEA band supports normal activities. Consider how you feel and check again if conditions change.'};
 if(band===1)return{tone:'amber',label:'Elevated band',title:strenuous?(sensitive?'Choose an indoor alternative.':'Ease off strenuous activity.'):'Keep the activity gentle.',text:sensitive?'Avoid strenuous outdoor activity for the next hour.':'Reduce strenuous outdoor activity for the next hour.'};
 if(band===2)return{tone:'orange',label:'High band',title:sensitive?'Choose an indoor plan.':strenuous?'Move the workout indoors.':'Avoid strenuous outdoor activity.',text:sensitive?'Avoid all outdoor activities for the next hour.':'Avoid strenuous outdoor activities for the next hour.'};
 return{tone:'red',label:'Very high band',title:sensitive?'Avoid outdoor activities.':'Minimise outdoor activities.',text:'Reconsider outdoor plans for the next hour and follow the full official personal guide.'};
}
export function hazeRoomSizing(area,height,cadr,unit='m3h',target=5){
 if(!Number.isFinite(area)||!Number.isFinite(height)||area<1||area>1000||height<1.5||height>10||![5,7].includes(target))return null;
 if(cadr!==null&&(!Number.isFinite(cadr)||cadr<0||cadr>20000))return null;
 const volume=area*height,required=volume*target,actual=cadr===null?null:cadr*(unit==='cfm'?1.69901079552:1);
 return{volume,required,actual,airChanges:actual===null?null:actual/volume,meets:actual===null?null:actual>=required};
}
export function hazeRecentStats(items,region,now=Date.now()){
 const rows=[...new Map((items||[]).filter(x=>Date.parse(x.timestamp)<=now&&Date.parse(x.timestamp)>now-86400000&&hazeNumber(x.readings?.pm25_one_hourly?.[region])).map(x=>[x.timestamp,{t:x.timestamp,v:x.readings.pm25_one_hourly[region]}])).values()].sort((a,b)=>a.t.localeCompare(b.t));
 if(!rows.length)return{rows:[],count:0};
 const latest=rows.at(-1),old=rows.find(r=>Math.abs(Date.parse(r.t)-(Date.parse(latest.t)-3*3600000))<60000);
 let best=null;
 for(let i=2;i<rows.length;i++){const three=rows.slice(i-2,i+1);if(three.some((r,j)=>j&&Math.abs(Date.parse(r.t)-Date.parse(three[j-1].t)-3600000)>60000))continue;const mean=three.reduce((sum,r)=>sum+r.v,0)/3;if(!best||mean<best.mean)best={mean,start:new Date(Date.parse(three[0].t)-3600000).toISOString(),end:three[2].t};}
 return{rows,count:rows.length,normal:rows.filter(r=>r.v<=55).length,mean:rows.reduce((sum,r)=>sum+r.v,0)/rows.length,max:Math.max(...rows.map(r=>r.v)),change3h:old?latest.v-old.v:null,best};
}
export function hazeDailyRollup(items,metric,date){
 const key=metric==='pm25'?'pm25_one_hourly':'psi_twenty_four_hourly';const unique=[...new Map((items||[]).filter(x=>x.timestamp?.slice(0,10)===date).map(x=>[x.timestamp,x])).values()];const output={date,metric,regions:{}};
 for(const region of ['north','south','east','west','central']){const values=unique.filter(x=>hazeNumber(x.readings?.[key]?.[region]));const count=values.length;const bands=Array(metric==='pm25'?4:5).fill(0);let max=null,peakAt=null,sum=0;for(const row of values){const v=row.readings[key][region];sum+=v;bands[hazeBandIndex(v,metric)]++;if(max===null||v>max){max=v;peakAt=row.timestamp;}}output.regions[region]={count,sum,mean:count?sum/count:null,max,peakAt,bands};}
 return output;
}
export function hazeSgDay(ms=Date.now()){return new Date(ms+8*3600000).toISOString().slice(0,10);}
export function hazeDayOffset(date,offset){return new Date(Date.parse(date+'T12:00:00+08:00')+offset*86400000+8*3600000).toISOString().slice(0,10);}
export function hazeWeeksAnalysis(days,region,today=hazeSgDay()){
 const valid=(days||[]).filter(d=>d.regions?.[region]?.count>0);const total=valid.reduce((n,d)=>n+d.regions[region].count,0),sum=valid.reduce((n,d)=>n+d.regions[region].sum,0),normal=valid.reduce((n,d)=>n+d.regions[region].bands[0],0);const peak=valid.reduce((best,d)=>!best||d.regions[region].max>best.value?{value:d.regions[region].max,t:d.regions[region].peakAt}:best,null);
 function week(a,b){const dates=Array.from({length:b-a+1},(_,i)=>hazeDayOffset(today,-a-i)),found=dates.map(date=>valid.find(d=>d.date===date)).filter(Boolean);const n=found.reduce((v,d)=>v+d.regions[region].count,0);return{mean:n?found.reduce((v,d)=>v+d.regions[region].sum,0)/n:null,count:n,adequate:found.length===7&&found.every(d=>d.regions[region].count>=18)};}
 const recent=week(1,7),prior=week(8,14),change=recent.adequate&&prior.adequate&&prior.mean>0?(recent.mean-prior.mean)/prior.mean*100:null;
 return{count:total,days:valid.length,mean:total?sum/total:null,normalShare:total?normal/total*100:null,peak,recent,prior,change};
}
export function hazeParseSgt(value){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||''))return null;const ms=Date.parse(value+':00+08:00');if(!Number.isFinite(ms))return null;return new Date(ms+8*3600000).toISOString().slice(0,16)===value?ms:null;}
export function hazeWatchTransition(watch,value,timestamp,available){if(!watch.enabled||!available||!hazeNumber(value)||!Number.isFinite(Date.parse(timestamp)))return{...watch,shouldAlert:false,paused:!!watch.enabled};if(watch.lastObservation&&Date.parse(timestamp)<Date.parse(watch.lastObservation))return{...watch,shouldAlert:false,paused:true};const above=value>=watch.limit;return{...watch,above,lastObservation:timestamp,shouldAlert:above&&!watch.above,paused:false};}
export function hazeCalendar(plan,origin,now=Date.now()){
 const start=Date.parse(plan.start);if(!Number.isFinite(start))throw new Error('A valid plan time is required.');const check=start>now+15*60000?start-10*60000:now+3600000;
 const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const text='Recheck the current 1-hour PM2.5 and official guidance before '+plan.activity+' at '+plan.place+'. Regional readings are not street-level measurements. '+origin+'/#now';
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Haze SG//Haze check//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+escape(plan.id)+'@haze-sg.local','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(check),'DTEND:'+stamp(check+5*60000),'SUMMARY:'+escape('Haze check · '+plan.place),'DESCRIPTION:'+escape(text),'BEGIN:VALARM','TRIGGER:PT0S','ACTION:DISPLAY','DESCRIPTION:Recheck haze before heading out','END:VALARM','END:VEVENT','END:VCALENDAR'];
 const encoder=new TextEncoder();const folded=lines.map(line=>{let out='',part='';for(const ch of line){if(encoder.encode(part+ch).length>73){out+=part+'\r\n ';part='';}part+=ch;}return out+part;});return folded.join('\r\n')+'\r\n';
}

export function hazeRegionalComparison(days,dates){
 const regions=['north','south','east','west','central'];
 const byDate=new Map((days||[]).map(d=>[d.date,d]));
 const common=[...new Set(dates)].filter(date=>regions.every(r=>{const d=byDate.get(date)?.regions?.[r];return d?.count>=18&&hazeNumber(d.sum);}));
 const required=Math.min(7,new Set(dates).size);
 if(!required||common.length<required)return{rows:[],common,required};
 const rows=regions.map(region=>{const data=common.map(date=>byDate.get(date).regions[region]);return{region,mean:data.reduce((n,d)=>n+d.sum/d.count,0)/data.length,count:data.reduce((n,d)=>n+d.count,0)};}).sort((a,b)=>a.mean-b.mean);
 return{rows,common,required};
}
export function hazeDailyCsv(days,dates,metric='pm25'){
 const byDate=new Map((days||[]).map(d=>[d.date,d]));
 const rows=[['Singapore date','Region','Metric','Unit','Mean of available hourly readings','Peak','Hourly readings','Band 1 count','Band 2 count','Band 3 count','Band 4 count','Band 5 count']];
 for(const date of dates)for(const region of ['north','south','east','west','central']){const d=byDate.get(date)?.regions?.[region];rows.push([date,region,metric==='pm25'?'1-hour PM2.5':'rolling 24-hour PSI',metric==='pm25'?'ug/m3':'index',d?.count?(d.sum/d.count).toFixed(3):'',d?.max??'',d?.count??0,...Array.from({length:5},(_,i)=>d?.bands?.[i]??'')]);}
 return rows.map(row=>row.join(',')).join('\r\n')+'\r\n';
}

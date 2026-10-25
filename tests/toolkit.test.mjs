import assert from 'node:assert/strict';
import {hazeRoomSizing,hazePlanAdvice,hazeDailyRollup,hazeWeeksAnalysis,hazeDayOffset,hazeParseSgt,hazeCalendar,hazeWatchTransition,hazeRecentStats,hazeSgDay} from '../src/toolkit-core.js';
// Sizing uses volume rather than floor area, with the current NEA 5x and 7x targets.
assert.equal(hazeRoomSizing(12,2.6,156).required,156);
assert(hazeRoomSizing(12,2.6,156).meets);
assert(!hazeRoomSizing(12,2.6,155).meets);
assert(Math.abs(hazeRoomSizing(12,2.6,null,'m3h',7).required-218.4)<1e-8);
assert.equal(hazeRoomSizing(0,2.6,200),null);
assert.equal(hazeRoomSizing(12,2.6,-5),null);
assert(Math.abs(hazeRoomSizing(10,2.6,100,'cfm').actual-169.901079552)<1e-6);
// Future and stale observations never produce a present-hour activity clearance.
assert.equal(hazePlanAdvice({pm:150,current:true,profile:'sensitive',strenuous:true}).title,'Choose an indoor alternative.');
assert.equal(hazePlanAdvice({pm:151,current:true,profile:'sensitive'}).title,'Choose an indoor plan.');
assert.equal(hazePlanAdvice({pm:20,current:false}).label,'Needs fresh data');
assert.equal(hazePlanAdvice({pm:20,current:true,future:true}).label,'Recheck later');
// Singapore times must retain UTC+8, including across midnight, and reject impossible dates.
assert.equal(hazeParseSgt('2026-10-25T07:00'),Date.parse('2026-10-24T23:00:00Z'));
assert.equal(hazeParseSgt('2026-02-30T08:00'),null);
assert.equal(hazeSgDay(Date.parse('2026-10-24T16:01:00Z')),'2026-10-25');
const ics=hazeCalendar({id:'test',start:'2026-10-25T07:00:00+08:00',activity:'a walk',place:'Tampines'},'https://example.test',Date.parse('2026-10-24T12:00:00Z'));
assert(ics.includes('DTSTART:20261024T225000Z'));
assert(ics.includes('\r\n'));
assert(ics.includes('BEGIN:VALARM'));
assert(ics.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75));
// Watches alert on reaching a threshold, not repeatedly on every refresh or on stale data.
const watch={enabled:true,region:'east',limit:56,above:false};
const first=hazeWatchTransition(watch,56,'2026-10-24T20:00:00+08:00',true);
assert(first.shouldAlert);
assert(!hazeWatchTransition(first,57,'2026-10-24T21:00:00+08:00',true).shouldAlert);
assert(!hazeWatchTransition(watch,151,'2026-10-24T21:00:00+08:00',false).shouldAlert);
const below=hazeWatchTransition(first,50,'2026-10-24T21:00:00+08:00',true);
assert(hazeWatchTransition(below,56,'2026-10-24T22:00:00+08:00',true).shouldAlert);
// Zero readings count; duplicate timestamps and absent regions do not create observations.
const date='2026-10-23',items=[0,1,2].map(i=>({timestamp:date+'T0'+i+':00:00+08:00',readings:{pm25_one_hourly:{east:[0,55,56][i]}}}));
const day=hazeDailyRollup([...items,items[0]],'pm25',date);
assert.equal(day.regions.east.count,3);
assert.deepEqual(day.regions.east.bands,[2,1,0,0]);
assert.equal(day.regions.west.count,0);
const today='2026-10-24';
const full=Array.from({length:14},(_,i)=>({date:hazeDayOffset(today,-i-1),regions:{east:{count:24,sum:(i<7?50:100)*24,max:100,peakAt:date,bands:[24,0,0,0]}}}));
assert.equal(hazeWeeksAnalysis(full,'east',today).change,-50);
assert.equal(hazeWeeksAnalysis(full.slice(0,10),'east',today).change,null);
assert(hazeRecentStats(items,'east',Date.parse('2026-10-23T03:00:00+08:00')).best);
assert.equal(hazeRecentStats([items[0],items[2]],'east',Date.parse('2026-10-23T03:00:00+08:00')).best,null);
console.log('Toolkit checks passed: sizing, advice, Singapore calendar timing, watch crossings, and historical aggregation.');
// Historical comparisons use matching dates, sufficient coverage and equal daily weights.
const {hazeRegionalComparison,hazeDailyCsv}=await import('../src/toolkit-core.js');
const rs=['north','south','east','west','central'];
const shared=Array.from({length:8},(_,i)=>({date:hazeDayOffset(today,-i-1),regions:Object.fromEntries(rs.map((r,j)=>[r,{count:i===0?18:24,sum:(i===0?20:40)*(i===0?18:24)+j*(i===0?18:24),max:90,bands:[18,0,0,0]}]))}));
const sharedDates=shared.map(d=>d.date);
const comparison=hazeRegionalComparison(shared,sharedDates);
assert.equal(comparison.rows[0].region,'north');
assert.equal(comparison.rows[0].mean,37.5);
assert.equal(comparison.rows[0].count,186);
const incomplete=structuredClone(shared);incomplete[0].regions.west.count=17;
assert.equal(hazeRegionalComparison(incomplete,sharedDates).common.length,7);
incomplete[1].regions.east.count=0;
assert.equal(hazeRegionalComparison(incomplete,sharedDates).rows.length,0);
assert.equal(hazeRegionalComparison([],[]).rows.length,0);
const csv=hazeDailyCsv([day],[date,'2026-10-22']);
assert.equal(csv.trim().split('\r\n').length,11);
assert(csv.includes('2026-10-23,east,1-hour PM2.5,ug/m3,37.000,56,3,2,1,0,0,'));
assert(csv.includes('2026-10-22,north,1-hour PM2.5,ug/m3,,,0'));
console.log('Historical comparison and CSV checks passed: shared dates, unequal daily counts, insufficient coverage, zero and missing values.');

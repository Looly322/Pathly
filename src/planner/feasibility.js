// Unknown hours stay unknown. Only structured, source-supplied intervals are enforced.
export function openingRanges(place,date){
 if(place.closurePeriods?.some(c=>c.source&&date>=c.from&&date<=c.through))return [];

 if(place.openingHoursByDate&&Object.hasOwn(place.openingHoursByDate,date))return place.openingHoursByDate[date];
 const weekly=place.openingHours?.weekly,day=new Date(date+'T12:00:00Z').getUTCDay();
 return weekly&&Object.hasOwn(weekly,day)?weekly[day]:null;
}
const minute=v=>typeof v==='string'&&/^\d{2}:\d{2}$/.test(v)?Number(v.slice(0,2))*60+Number(v.slice(3)):NaN;
export function openingSlot(place,date,start,duration){
 const ranges=openingRanges(place,date);
 if(!Array.isArray(ranges))return {start,status:'unknown'};
 if(!ranges.length)return {start,status:'closed'};
 const valid=ranges.map(r=>({start:minute(r.start),end:minute(r.end),last:minute(r.lastAdmission??place.lastAdmission)}));
 if(valid.some(r=>!Number.isFinite(r.start+r.end)||r.end<=r.start))return {start,status:'unknown'};
 for(const r of valid.sort((a,b)=>a.start-b.start)){const at=Math.max(start,r.start);if(at+duration<=r.end&&(!Number.isFinite(r.last)||at<=r.last))return {start:at,status:'open'};}
 return {start,status:'closed'};
}
export function validateEvents(events,settings,date=settings.planningDate||settings.date){
 const conflicts=[],warnings=[];const end=minute(settings.end),begin=minute(settings.start);let previous=begin;
 for(const e of events){
  if(e.start<previous||e.start<begin||e.end>end||e.end<e.start)conflicts.push('time');
  previous=e.end;
  if(e.place&&e.kind!=='HOTEL'){const slot=openingSlot(e.place,date,e.start,e.duration);if(slot.status==='closed'||slot.start!==e.start)conflicts.push('openingHours');if(slot.status==='unknown')warnings.push({id:e.place.id,code:'unknownHours'});}
  if(e.travel?.estimated&&e.travel.minutes)warnings.push({id:e.id,code:'estimatedTransport'});
  const lock=settings.lockedSlots?.[e.id];if(lock&&(lock.date!==date||lock.start!==e.start||lock.end!==e.end))conflicts.push('locked');
 }
 return {conflicts:[...new Set(conflicts)],warnings};
}
export function preservesLocks(before,after,settings){
 for(const id of Object.keys(settings.lockedSlots||{})){
  const a=before.events.find(e=>e.id===id);if(!a)continue;
  const b=after.events.find(e=>e.id===id);
  if(!b||a.start!==b.start||a.end!==b.end||before.events.filter(e=>e.kind==='ACTIVITY').findIndex(e=>e.id===id)!==after.events.filter(e=>e.kind==='ACTIVITY').findIndex(e=>e.id===id))return false;
 }
 return true;
}

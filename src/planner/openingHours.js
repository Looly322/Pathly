// Parse only unambiguous weekly OSM intervals; unsupported syntax remains unknown.
export function parseWeeklyHours(text){
 if(text==='24/7')return {weekly:Object.fromEntries(Array.from({length:7},(_,i)=>[i,[{start:'00:00',end:'24:00'}]]))};
 if(!text||/PH|SH|sunrise|sunset|\"|\+/.test(text))return undefined;
 const index={Su:0,Mo:1,Tu:2,We:3,Th:4,Fr:5,Sa:6},weekly={};
 for(const part of text.split(';')){const m=part.trim().match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+(off|closed|\d\d:\d\d-\d\d:\d\d(?:,\d\d:\d\d-\d\d:\d\d)*)$/);if(!m)return undefined;
  const ranges=/off|closed/.test(m[2])?[]:m[2].split(',').map(x=>{const [start,end]=x.split('-');return {start,end};});if(ranges.some(r=>r.end<=r.start))return undefined;
  for(const group of m[1].split(',')){const [a,b]=group.split('-');let day=index[a];for(let count=0;count<7;count++){weekly[day]=ranges;if(day===index[b||a])break;day=(day+1)%7;}}
 }
 return {weekly};
}

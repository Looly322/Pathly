import {samePlace} from '../planner/identity.js';
const keys={history:'pathly.history.v1',favorites:'pathly.favorites.v1'};
export function readLibrary(kind,storage=localStorage){const raw=storage.getItem(keys[kind]);if(!raw)return [];const data=JSON.parse(raw);if(!Array.isArray(data))throw Error('Invalid local archive');return data;}
export function writeLibrary(kind,data,storage=localStorage){
 if(data.length>(kind==='history'?20:150))throw Error('本地记录数量已满，请先手动删除不需要的记录。 / Local collection is full.');
 const body=JSON.stringify(data,(key,value)=>typeof value==='string'&&value.startsWith('data:')?undefined:/apikey|api_key|secret|token/i.test(key)?undefined:value);
 const other=storage.getItem(keys[kind==='history'?'favorites':'history'])||'';
 if(new Blob([body,other]).size>4*1024*1024)throw Error('本地存储达到4MB限制，请手动清理记录。 / Local storage reached 4 MB.');
 storage.setItem(keys[kind],body);if(typeof window!=='undefined')window.dispatchEvent(new Event('pathly-library'));
}
export function saveHistory(snapshot,storage=localStorage){const records=readLibrary('history',storage);const record={id:crypto.randomUUID(),createdAt:new Date().toISOString(),snapshot};writeLibrary('history',[record,...records],storage);return record.id;}
export function favoriteMatch(entry,type,data){return entry.type===type&&(type==='route'?entry.objectId===data.id:samePlace(entry.data,data));}
export function toggleFavorite(type,data,snapshot,storage=localStorage){const records=readLibrary('favorites',storage);const found=records.find(r=>favoriteMatch(r,type,data));if(found){writeLibrary('favorites',records.filter(r=>r.id!==found.id),storage);return false;}const entry={id:crypto.randomUUID(),type,objectId:data.id,name:data.name,city:data.city,latitude:data.latitude,longitude:data.longitude,source:data.source,createdAt:new Date().toISOString(),data,snapshot};writeLibrary('favorites',[entry,...records],storage);return true;}

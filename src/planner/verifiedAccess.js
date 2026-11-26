import {verifiedProfile} from './visitDuration.js';
import {haversineDistance} from '../utils/geo.js';
// Reviewed official exceptions, not fabricated daily hours. No reopening day inferred.
const records=[{wikidata:['Q178065','Q1895953'],latitude:48.860,longitude:2.3523,closures:[{from:'2025-09-22',through:'2029-12-31',source:'https://www.centrepompidou.fr/en/le-centre-pompidou/adherents/faq-adhesion',reviewedAt:'2026-11-17',reason:'Official building closure for renovation; reopening announced for 2030, exact date unconfirmed.'}]},{wikidata:['Q1579504'],latitude:48.87149,longitude:2.28143,closures:[{from:'2026-11-17',through:'2027-12-31',source:'https://www.guimet.fr/fr/musee-d-ennery',reviewedAt:'2026-11-17',reason:'Official renovation closure until 2028; exact reopening date unconfirmed.'}]}];
export function verifiedAccess(place){
 if(verifiedProfile(place)?.key==='palace-museum')return {reservationRequired:true,seasonalHours:{source:'https://www.dpm.org.cn/Visit.html',reviewedAt:'2026-11-26',closedWeekdays:[1],holidayExceptionsUnverified:true,seasons:[{months:[4,5,6,7,8,9,10],start:'08:30',end:'17:00',lastAdmission:'16:00'},{months:[11,12,1,2,3],start:'08:30',end:'16:30',lastAdmission:'15:30'}]}};
 const record=records.find(r=>r.wikidata.includes(place.wikidata)&&haversineDistance(r,place)<.5);return record?{closurePeriods:record.closures}:{};}

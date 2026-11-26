import {haversineDistance} from '../utils/geo.js';
// Reviewed official exceptions, not fabricated daily hours. No reopening day inferred.
const records=[{wikidata:'Q178065',latitude:48.860,longitude:2.3523,closures:[{from:'2025-09-22',through:'2029-12-31',source:'https://www.centrepompidou.fr/en/le-centre-pompidou/adherents/faq-adhesion',reviewedAt:'2026-11-17',reason:'Official building closure for renovation; reopening announced for 2030, exact date unconfirmed.'}]}];
export function verifiedAccess(place){const record=records.find(r=>r.wikidata===place.wikidata&&haversineDistance(r,place)<.5);return record?{closurePeriods:record.closures}:{};}

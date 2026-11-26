import {parseWeeklyHours} from '../planner/openingHours.js';
import {searchPlaces} from './placeService.js';
import {normalizePlace} from '../planner/place.js';
import {apiJson} from './apiClient.js';
export async function searchNamed(destination,query,kind){
 const raw=destination.countryCode==='CN'?await searchPlaces(destination.displayName||destination.city,query,{type:kind==='hotel'?'100000':'050000'}):(await apiJson('/api/named-places?'+new URLSearchParams({latitude:destination.latitude,longitude:destination.longitude,city:destination.city,countryCode:destination.countryCode,query,kind}),{timeout:28000})).places;
 return raw.map(p=>({...normalizePlace(p,destination),category:kind==='hotel'?'HOTEL':'FOOD',openingHours:p.openingHours||parseWeeklyHours(p.openingHoursText),role:kind,planningEligible:true,estimatedDuration:kind==='hotel'?0:60,minimumDuration:30,subcategories:kind==='hotel'?[]:['FOOD']}));
}

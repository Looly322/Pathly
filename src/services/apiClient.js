// A static SPA fallback may return HTTP 200 + HTML for missing /api routes.
// Treat this as a deployment error instead of attempting to parse it as places.
export async function apiJson(url,{timeout=25000}={}){
 let response;
 try{response=await fetch(url,{signal:AbortSignal.timeout(timeout)});}catch(error){
  throw new Error(error.name==='TimeoutError'?'API_TIMEOUT':'API_UNAVAILABLE');
 }
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('API_NOT_DEPLOYED');
 let data;try{data=await response.json();}catch{throw new Error('API_INVALID_RESPONSE');}
 if(!response.ok)throw new Error(data?.error||'API_UNAVAILABLE');
 return data;
}
export function searchErrorKey(error,fallback='planner.loadFailed'){
 const errors=error?.errors||[error];
 const codes=errors.map(e=>e?.message);
 if(codes.includes('API_NOT_DEPLOYED'))return 'planner.apiNotDeployed';
 if(codes.includes('OTM_KEY_MISSING'))return 'planner.otmKeyMissing';
 if(codes.includes('API_TIMEOUT'))return 'planner.apiTimeout';
 if(codes.includes('API_UNAVAILABLE'))return 'planner.apiUnavailable';
 if(codes.some(c=>c?.startsWith('OTM_AUTH')))return 'planner.otmAuth';
 if(codes.some(c=>c?.includes('RATE')||c?.includes('BUDGET')))return 'planner.otmLimit';
 return fallback;
}

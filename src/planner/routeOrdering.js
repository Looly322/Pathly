import {haversineDistance as distance} from '../utils/geo.js';
export const routeDistance=places=>places.slice(1).reduce((sum,p,i)=>sum+distance(places[i],p),0);
// 先最近邻，再做开口路线 2-opt；首站固定，避免循环返回起点的额外路程。
export function orderDailyRoute(places,{cost=distance,origin=null}={}){
 const total=ps=>(origin&&ps.length?cost(origin,ps[0])+cost(ps.at(-1),origin):0)+ps.slice(1).reduce((n,p,i)=>n+cost(ps[i],p),0);
 if(places.length<3)return [...places];
 const remaining=places.slice(1),route=[places[0]];
 while(remaining.length){remaining.sort((a,b)=>cost(route.at(-1),a)-cost(route.at(-1),b));route.push(remaining.shift());}
 for(let pass=0;pass<4;pass++){
  let improved=false;
  for(let i=1;i<route.length-1;i++)for(let j=i+1;j<route.length;j++){
   const trial=[...route.slice(0,i),...route.slice(i,j+1).reverse(),...route.slice(j+1)];
   if(total(trial)+.001<total(route)){route.splice(0,route.length,...trial);improved=true;}
  }
  if(!improved)break;
 }
 return total(route)<total(places)?route:[...places];
}

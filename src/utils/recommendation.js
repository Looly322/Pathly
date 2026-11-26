import { getRoute } from '../services/routeService'
import { schedule, orderPlacesByNearestNeighbor } from './itinerary'
export const WEIGHTS={interest:22,crowd:14,rating:8,budget:12,distance:10,wishlist:150,hidden:15}
export const STYLES={explorer:{max:7,stay:.85,buffer:6,crowd:.4},slow:{max:4,stay:1.25,buffer:25,crowd:1},crowd:{max:5,stay:1,buffer:15,crowd:2.4}}
export function calculatePlaceScore(place,prefs) {
  const style=STYLES[prefs.style]||STYLES.explorer
  const matches=place.tags.filter(t=>prefs.interests.includes(t)).length
  const crowd={low:1,medium:.45,high:0}[place.crowdLevel]
  const distance=prefs.anchor?getRoute(prefs.anchor,place,prefs.walking).distance:0
  return matches*WEIGHTS.interest+crowd*WEIGHTS.crowd*style.crowd*(prefs.preferences.includes('avoid')?2:1)+place.rating*WEIGHTS.rating*(prefs.preferences.includes('rating')?1.5:1)+Math.max(0,1-place.price/Math.max(1,prefs.budget))*WEIGHTS.budget*(prefs.preferences.includes('budget')?2:1)+WEIGHTS.distance/(1+distance*(prefs.walking==='low'||prefs.preferences.includes('less')?2:1))+(prefs.wishIds?.includes(place.id)?WEIGHTS.wishlist:0)+(place.tags.includes('hidden')&&(prefs.style==='crowd'||prefs.preferences.includes('hidden'))?WEIGHTS.hidden:0)-(prefs.style==='crowd'?place.heat*.2:0)
}
export function recommendationReasons(place,prefs) {
  const out=[];const tags=place.tags.filter(x=>prefs.interests.includes(x))
  if(prefs.wishIds.includes(place.id))out.push({key:'reasonWish'})
  if(tags.length)out.push({key:'reasonInterest',tags})
  if(place.crowdLevel==='low')out.push({key:'reasonCrowd'})
  if(place.rating>=4.5)out.push({key:'reasonRating',params:{n:place.rating}})
  if(place.price<=prefs.budget)out.push({key:'reasonBudget',params:{n:place.price}})
  return out.length?out:[{key:'reasonDistance'}]
}
export function generatePlanVariants(places,prefs,locked=[]) {
  return Object.entries(STYLES).map(([id,style])=>{
    const settings={...prefs,style:id};const duration=p=>Math.max(30,Math.round(p.estimatedStay*style.stay/5)*5)
    // 锁定地点优先保留，即使约束已不可满足，也交由界面明确显示冲突。
    const items=locked.map(s=>({...s,locked:true}));const selected=new Set(items.map(s=>s.place.id))
    const ranked=[...places].sort((a,b)=>calculatePlaceScore(b,{...settings,anchor:items.at(-1)?.place})-calculatePlaceScore(a,{...settings,anchor:items.at(-1)?.place}))
    const max=prefs.preferences.includes('relaxed')?Math.max(3,style.max-1):style.max
    for(const place of ranked){
      if(selected.has(place.id)||items.length>=max)continue
      const candidate={place,duration:duration(place),delay:0,locked:false}
      const trial=schedule([...items,candidate],prefs,style.buffer)
      if(trial.cost<=prefs.budget&&!trial.overflow){items.push(candidate);selected.add(place.id)}
    }
    const order=orderPlacesByNearestNeighbor(items.map(s=>s.place),id==='crowd'?items.filter(s=>s.place.crowdLevel==='high').sort((a,b)=>b.place.heat-a.place.heat)[0]?.place:items[0]?.place)
    let ordered=order.map(p=>items.find(s=>s.place.id===p.id))
    // 路线排序后再次检查，不能因为顺序变化而悄悄越过预算或时间约束。
    while(ordered.some(s=>!s.locked)){
      const check=schedule(ordered,prefs,style.buffer)
      if(!check.overflow&&check.cost<=prefs.budget)break
      const removable=ordered.filter(s=>!s.locked).sort((a,b)=>calculatePlaceScore(a.place,settings)-calculatePlaceScore(b.place,settings))[0]
      ordered=ordered.filter(s=>s!==removable)
    }
    return {id,buffer:style.buffer,items:ordered}
  })
}
export function replacePlace(currentPlace,places,prefs) {
  return places.filter(p=>p.id!==currentPlace.id&&!prefs.excludedIds?.includes(p.id)&&(p.category===currentPlace.category||p.tags.some(t=>currentPlace.tags.includes(t)))).sort((a,b)=>(b.category===currentPlace.category?100:0)+calculatePlaceScore(b,prefs)-(a.category===currentPlace.category?100:0)-calculatePlaceScore(a,prefs))
}

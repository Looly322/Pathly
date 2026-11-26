// Place requested meals into the same scheduler; never invent opening hours.
export function assignRestaurants(days,restaurants,settings,pace,scheduleDay){
 const missing=[];
 for(const restaurant of restaurants||[]){let best=null;
  for(let d=0;d<days.length;d++)for(const slot of ['LUNCH','DINNER']){
   if(restaurant.mealPreference&&restaurant.mealPreference!==slot||days[d].mealAssignments?.[slot])continue;
   const assignments={...days[d].mealAssignments,[slot]:restaurant};let items=[...days[d].items],removed=[];
   for(;;){const trial=scheduleDay(items,{...settings,planningDate:days[d].date,assignedMeals:assignments},pace,[]);
    if(!trial.conflicts.length&&trial.events.some(e=>e.slot===slot&&e.place?.id===restaurant.id)){
     const cost=removed.length*10000+trial.fatigue.travel-days[d].fatigue.travel;
     if(!best||cost<best.cost)best={d,trial,cost,removed};break;
    }
    const index=items.findLastIndex(i=>!settings.mustIds?.includes(i.place.id)&&!settings.lockedSlots?.[i.place.id]);if(index<0)break;
    removed.push(items[index].place.name);items.splice(index,1);
   }
  }
  if(best)days[best.d]={...days[best.d],...best.trial,deferredRecommendations:[...(days[best.d].deferredRecommendations||[]),...best.removed]};
  else missing.push({id:restaurant.id,name:restaurant.name,reason:'无法在用餐窗口、往返交通和已知开放时间内安排；请调整日期、用餐偏好或每日时间。',reasonEn:'No feasible meal window with travel and known opening hours. Adjust dates, meal preference or daily hours.'});
 }
 return missing;
}

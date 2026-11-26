import {test,expect} from '@playwright/test';import fs from 'node:fs';
const cases=[{city:'Beijing',label:'北京',pace:'relaxed',interests:['历史文化','美食']},{city:'东京',label:'东京',pace:'balanced',interests:['历史文化','城市漫步']},{city:'巴黎',label:'巴黎',pace:'balanced',interests:['艺术与博物馆','美食']}];
for(const c of cases)test('real providers '+c.city,async({page})=>{
 test.setTimeout(240000);await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 const calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))calls.push({path:u.pathname,status:r.status()});});
 await page.goto('/');const form=page.locator('#trip-planner');await form.locator('.destination input').fill(c.city);await form.locator('input[type=date]').fill('2026-11-13');await form.locator('.pace-options button').nth(c.pace==='relaxed'?0:1).click();
 // Use actual exposed Vue form values to set exact existing enum preferences, without mocking any API.
 await form.evaluate((el,c)=>{let v=el.__vueParentComponent;while(v&&!v.setupState.form)v=v.parent;v.setupState.form.interests=c.city==='巴黎'?['ART','FOOD']:c.city==='东京'?['CULTURE','CITY_WALK']:['CULTURE','FOOD'];},c);
 await form.locator('.generate').click();
 const outcome=await Promise.race([page.locator('.trip-result').waitFor({timeout:160000}).then(()=> 'result'),page.locator('.city-option').first().waitFor({timeout:160000}).then(()=> 'choice'),form.locator('p.error').filter({hasText:/无法|超时|失败/}).waitFor({timeout:160000}).then(()=> 'error')]).catch(()=> 'timeout');
 if(outcome==='choice'){const choices=page.locator('.city-option');const texts=await choices.allTextContents();const i=texts.findIndex(t=>t.includes(c.label));await choices.nth(i<0?0:i).click();}
 let ready=true;try{await page.locator('.trip-result').waitFor({timeout:90000});}catch{ready=false;}
 if(!ready){fs.writeFileSync(`reports/core-repair/${c.city}.json`,JSON.stringify({city:c.city,ready,errors,calls,message:await form.innerText()},null,2));throw Error(c.city+' live providers failed; report saved');}
 const read=()=>page.locator('.trip-result').evaluate(el=>{let v=el.__vueParentComponent;while(v&&!v.setupState.current)v=v.parent;const s=v.setupState;return JSON.parse(JSON.stringify({destination:s.destination||v.props.destination,settings:{pace:s.pace,interests:s.settings.interests,transport:s.settings.transport,people:s.settings.people,weather:!!s.settings.weather},plan:s.current,transportLoading:s.transportLoading}));});
 const days=[];for(let d=0;d<3;d++){
  await page.locator('.trip-days button').nth(d).click();await page.locator('.journal-places').evaluate(el=>el.scrollIntoView({block:'start'}));
  await expect.poll(async()=>!(await read()).transportLoading,{timeout:45000}).toBe(true);
  await page.waitForTimeout(4000);
  const state=await read();const photos=await page.locator('.journal-places .activity-image').evaluateAll(els=>els.map(e=>({name:e.querySelector('img')?.alt||'',loaded:!!e.querySelector('img')?.naturalWidth,placeholder:!!e.querySelector('.category-art')})));
  days.push({date:state.plan.days[d].date,events:state.plan.days[d].events.map(e=>({id:e.id,name:e.place?.name,start:e.start,end:e.end,travel:e.travel,category:e.place?.category,latitude:e.place?.latitude,longitude:e.place?.longitude})),conflicts:state.plan.days[d].conflicts,warnings:state.plan.days[d].warnings,photos});
 }
 const state=await read();await page.locator('.trip-days button').first().click();await page.locator('.journey-timeline').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`reports/core-repair/${c.city}.png`});
 const report={city:c.city,ready,errors,calls,destination:state.destination,settings:state.settings,days};fs.writeFileSync(`reports/core-repair/${c.city}.json`,JSON.stringify(report,null,2));
 expect(errors).toEqual([]);expect(days).toHaveLength(3);expect(days.flatMap(d=>d.events).some(e=>e.name)).toBe(true);expect(state.destination.countryCode).toBe(c.city==='Beijing'?'CN':c.city==='东京'?'JP':'FR');
});

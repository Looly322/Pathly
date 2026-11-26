import {test,expect} from '@playwright/test';import fs from 'node:fs';
const cases=[
 {key:'beijing',city:'北京',hotel:'汉庭酒店 北京首都机场南法信店',wishes:['天安门','故宫博物院','景山公园']},
 {key:'disney',city:'上海',hotel:'玩具总动员酒店',wishes:['上海迪士尼乐园'],start:'08:00',end:'22:00'},
 {key:'paris',city:'Paris',wishes:[],art:true},
 {key:'beijing-auto',city:'北京',hotel:'北京饭店',wishes:[]}
];
for(const c of cases)test('real itinerary '+c.key,async({page})=>{
 test.setTimeout(300000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('/');const form=page.locator('#trip-planner');await form.locator('.destination input').fill(c.city);await form.locator('input[type=date]').fill('2026-11-20');await form.locator('.pace-options button').nth(1).click();
 if(c.start){await form.locator('input[type=time]').nth(0).fill(c.start);await form.locator('input[type=time]').nth(1).fill(c.end);}
 if(c.art){const button=form.getByRole('button',{name:'艺术',exact:true});if(await button.count())await button.click();}
 if(c.hotel){const picker=form.locator('.place-picker').first();await picker.locator('input').fill(c.hotel);await picker.getByRole('button',{name:'搜索',exact:true}).click();await expect(picker.locator('article').first()).toBeVisible({timeout:45000});await picker.locator('article').first().getByRole('button',{name:'确认此地点',exact:true}).click();}
 for(const name of c.wishes){await form.getByRole('textbox',{name:'输入想去的地点名称',exact:true}).fill(name);await form.locator('.wish-input button').last().click();}
 const started=Date.now();await form.locator('.generate').click();await page.locator('.city-option').first().waitFor({timeout:3000}).then(()=>page.locator('.city-option').first().click()).catch(()=>{});await expect(page.locator('.trip-result')).toBeVisible({timeout:150000});
 const state=()=>page.locator('.trip-result').evaluate(el=>{let v=el.__vueParentComponent;while(v&&!v.setupState.exportSnapshot)v=v.parent;return {snapshot:v.setupState.exportSnapshot(),candidates:v.setupState.eligible,pending:v.props.pending,loading:v.setupState.transportLoading};});
 const initialMs=Date.now()-started;let data;try{
 for(let i=0;i<3;i++){await page.locator('.trip-days button').nth(i).click();await expect.poll(async()=>!(await state()).loading,{timeout:70000}).toBe(true);}
 data=await state();
 }finally{data=await state();fs.writeFileSync(`reports/planning-upgrade/${c.key}.json`,JSON.stringify({...data,initialMs,totalMs:Date.now()-started},null,2));await page.locator('#journey-route').scrollIntoViewIfNeeded();await page.waitForTimeout(8000);await page.screenshot({path:`reports/planning-upgrade/${c.key}.png`});}
 expect(data.snapshot.plan.days).toHaveLength(3);expect(data.snapshot.plan.days.every(d=>!d.conflicts.length)).toBe(true);
 expect(data.snapshot.plan.days.every(d=>d.items.length>0)).toBe(true);
 if(c.key==='disney'){const d=data.snapshot.plan.days.find(d=>d.items.some(i=>i.place.visit?.profileId==='shanghai-disney'));expect(d).toBeTruthy();expect(d.items).toHaveLength(1);expect(d.items[0].duration).toBe(480);}
 if(c.key==='beijing'){expect(data.pending).toEqual([]);expect(data.snapshot.plan.quality.must.missing).toEqual([]);expect(data.snapshot.plan.days.flatMap(d=>d.items).length).toBeGreaterThan(3);expect(data.snapshot.plan.quality.issues.some(i=>i.code==='duplicate')).toBe(false);}
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

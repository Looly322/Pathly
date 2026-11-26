import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const dir='reports/media-draft-video';
const cases=[{id:'Q183112',wikidata:'Q183112',name:'Tokyo Tower',city:'Tokyo',latitude:35.65858,longitude:139.74543},{id:'Q243',wikidata:'Q243',name:'Eiffel Tower',city:'Paris',latitude:48.85826,longitude:2.2945},{id:'Q83125',wikidata:'Q83125',name:'Tower Bridge',city:'London',latitude:51.50555,longitude:-.0754}];
test('live verified names and photos; cached requests; visible image recovery',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const rows=await page.evaluate(async places=>{const {loadPlacePresentation}=await import('/src/services/placePresentation.js');const rows=[];for(const p of places){const start=performance.now();const [text,photo]=await Promise.all(['text','photo'].map(part=>loadPlacePresentation(p,p.city,null,false,{part})));rows.push({place:p,data:{...text,...photo},ms:Math.round(performance.now()-start)});}return rows;},cases);
 fs.writeFileSync(dir+'/live-browser.json',JSON.stringify(rows,null,2));for(const r of rows){expect(r.data.nameZh).toBeTruthy();expect(r.data.photoStatus).toBe('ready');expect(r.data.nameZhSourceId).toBe(r.place.wikidata);}
 await page.evaluate(async rows=>{const source=await(await fetch('/src/components/ActivityImage.vue')).text(),vue=source.match(/from ["']([^"']*\/vue\.js[^"']*)["']/)[1];const {createApp,h,reactive}=await import(vue);const {default:Image}=await import('/src/components/ActivityImage.vue');document.body.innerHTML='<main id="audit" style="padding:32px;background:#faf8f3;display:flex;gap:32px"></main>';window.cards=reactive(rows.map(r=>({...r.place,...r.data})));createApp({render:()=>window.cards.map((p,i)=>h('section',{'data-card':i},[h('h2',p.nameZh),h('p',p.name),h(Image,{place:p,onRetry:()=>{window.cards[i]={...p,image:undefined,photoRevision:(p.photoRevision||0)+1,photo:rows[i].data.photo,photoStatus:'ready'};}})]))}).mount('#audit');},rows);
 for(const img of await page.locator('.activity-image img').all())await expect.poll(()=>img.evaluate(e=>e.complete&&e.naturalWidth>0),{timeout:20000}).toBe(true);
 await page.screenshot({path:dir+'/names-photos.png'});
 // Inject a failed resource only to exercise the real component's retry UI.
 await page.route('**/intentional-image-failure.jpg',r=>r.fulfill({status:404,body:''}));await page.evaluate(()=>{window.cards[0]={...window.cards[0],photo:null,image:location.origin+'/intentional-image-failure.jpg',photoStatus:'missing',photoRevision:2};});
 const card=page.locator('[data-card="0"]');await expect(card.getByRole('button')).toBeVisible();await card.getByRole('button').click();await expect.poll(()=>card.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
});
test('new video desktop and mobile playback retains native looping and cover',async({page})=>{
 test.setTimeout(45000);await page.goto('/');const video=page.locator('.travel-video video');await expect.poll(()=>video.evaluate(v=>v.readyState>=2&&!v.paused),{timeout:15000}).toBe(true);
 const props=await video.evaluate(v=>({src:v.currentSrc,duration:v.duration,muted:v.muted,loop:v.loop,inline:v.playsInline,fit:getComputedStyle(v).objectFit}));expect(props.src).toContain('pathly-journey-nov17.mp4');expect(props.duration).toBeCloseTo(13.77,1);expect(props.muted&&props.loop&&props.inline).toBe(true);expect(props.fit).toBe('cover');
 await page.screenshot({path:dir+'/home-video.png'});const start=await video.evaluate(v=>v.currentTime);await page.waitForTimeout(15000);expect(await video.evaluate(v=>!v.paused&&v.currentTime<v.duration)).toBe(true);
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:dir+'/home-video-mobile.png'});fs.writeFileSync(dir+'/video.json',JSON.stringify({...props,start,after:await video.evaluate(v=>v.currentTime)},null,2));
 await page.emulateMedia({reducedMotion:'reduce'});await expect(video).toHaveCount(0);await expect(page.locator('.hero-image img')).toHaveAttribute('src','/videos/pathly-journey-nov17-poster.webp');
});
test('explicit exit clears draft only; archived route restores and dates load',async({page})=>{
 test.setTimeout(120000);const snapshot=JSON.parse(fs.readFileSync('reports/planning-upgrade/beijing.json','utf8'));console.log('archive keys',Object.keys(snapshot));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.evaluate(async raw=>{const snap=raw.snapshot||raw;const {saveHistory,toggleFavorite}=await import('/src/services/travelLibrary.js');saveHistory(snap);toggleFavorite('route',{id:snap.routeId,name:'北京测试历史',city:'北京'},snap);const {updateDraft}=await import('/src/state/tripDraft.js');updateDraft({...snap.settings,selectedCity:'北京'});},snapshot);
 const saved=await page.evaluate(()=>({history:localStorage.getItem('pathly.history.v1'),favorites:localStorage.getItem('pathly.favorites.v1')}));await page.reload();
 await page.getByRole('button',{name:'退出旅行，返回首页',exact:true}).click();const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('pathly.draft.v1')).form);expect(draft.hotel).toBeNull();expect(draft.mustPlaces).toEqual([]);expect(draft.restaurants).toEqual([]);expect(draft.selectedCity).toBe('');
 expect(await page.evaluate(()=>({history:localStorage.getItem('pathly.history.v1'),favorites:localStorage.getItem('pathly.favorites.v1')}))).toEqual(saved);
 await page.locator('#trip-planner .destination input').fill('巴黎');await page.reload();expect(await page.locator('#trip-planner .destination input').inputValue()).toBe('巴黎');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pathly.draft.v1')).form.hotel)).toBeNull();
 await page.getByRole('button',{name:'历史记录',exact:true}).click();await page.getByRole('button',{name:'查看原始行程',exact:true}).first().click();await expect(page.locator('.trip-result')).toBeVisible();
 await page.locator('.trip-days button').nth(1).click();await expect(page.locator('.journal-timeline')).toBeVisible();await page.screenshot({path:dir+'/restored-day2.png'});
 await page.getByRole('button',{name:'退出旅行，返回首页',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('pathly.favorites.v1'))).toBe(saved.favorites);
});

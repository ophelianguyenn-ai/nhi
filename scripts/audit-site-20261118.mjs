/* Whole-site regression/audit for the 2026-11-18 visual refresh.
   Audit on a clean isolated browser. No production Firebase or AI credentials. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const browser=await puppeteer.launch({
 headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
});
const issues=[],checks=[],pageErrors=[],missingAssets=[];
function assert(ok,message){if(!ok)throw Error(message)}
function report(name,ok,detail){checks.push({name,ok,detail:String(detail||'')});if(!ok)issues.push({name,detail:String(detail||'')});}
async function check(name,fn){try{const detail=await fn();report(name,true,detail);}catch(err){report(name,false,err?.stack||String(err));}}
const page=await browser.newPage();
page.on('pageerror',e=>{pageErrors.push(String(e));});
page.on('response',r=>{
 try{
  const u=new URL(r.url());
  if(u.origin==='http://127.0.0.1:8765'&&r.status()>=400&&!/favicon/i.test(u.pathname))
   missingAssets.push({status:r.status(),url:u.pathname});
 }catch{}
});
await page.evaluateOnNewDocument(()=>{
 sessionStorage.setItem('nlc-cover-seen','1');
 localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,haptic:false,theme:'light'}));
});
try{
 await page.setViewport({width:1360,height:880});
 await page.goto('http://127.0.0.1:8765/#',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.NHI_PLAN_V2?.snapshot?.().lessons.length>10,{timeout:24000});
 await check('Cover first, entrance to Today',async()=>{
  assert(await page.$eval('#cover',e=>!e.hidden),'Root URL must open the cover');
  await page.$eval('#coverGo',e=>e.click());
  await page.waitForFunction(()=>location.hash==='#/hom-nay');
  assert(await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',e=>e.getAttribute('aria-current')==='page'),'Today not active');
  return 'Cover → #/hom-nay';
 });
 await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',e=>e.click());
 await page.waitForSelector('#planBox .nhi-v2-priorities');
 await check('Integrated Today: one goal and one Học ngay button',async()=>{
  return await page.evaluate(()=>{
   const hero=document.querySelector('#planBox .nhi-v2-hero');
   if(!hero)throw Error('Today hero missing');
   if(document.querySelector('#planBox .nhi-today-secondary, #planBox .nhi-goal-tile, #planBox .nhi-calendar-shortcut'))
    throw Error('Old standalone white goal/calendar tiles remain');
   const goal=hero.querySelector('.nhi-goal-time .nhi-v2-goal-track span');
   const count=hero.querySelector('.nhi-goal-time .nhi-goal-count');
   const words=hero.querySelector('.nhi-goal-words .nhi-goal-count');
   const buttons=[...hero.querySelectorAll('button')].filter(x=>x.textContent.includes('Học ngay'));
   if(!goal||!count||!words)throw Error('Minute and vocabulary goals are not both in the blue hero');
   if(buttons.length!==1)throw Error('Expected exactly one Học ngay CTA in the hero');
   if(!/Học ngay/.test(hero.textContent))throw Error('Missing study action');
   if(/Xem ngày học và lịch ôn|Ôn lại các thẻ khó/.test(hero.textContent))throw Error('Removed actions still in hero');
   if(getComputedStyle(buttons[0]).display==='none'||buttons[0].getBoundingClientRect().height<34)
    throw Error('Learn CTA is hidden or too small');
   return 'No standalone tiles; goal and visible Học ngay inside hero';
  });
 });
 await check('Priority palettes and topic badges',async()=>{
  const d=await page.$$eval('#planBox .nhi-v2-priority',es=>es.map(e=>({
   color:e.style.getPropertyValue('--priority-color'),
   tags:e.querySelectorAll('.ttag').length,
   name:e.querySelector('.nhi-v2-priority-title')?.textContent||''
  })));
  assert(d.length>0&&d.length<=3,'Expected 1-3 priorities, got '+d.length);
  assert(d.every(x=>x.color&&x.tags),'At least one priority lacks palette or topic');
  assert(new Set(d.map(x=>x.color)).size===d.length,'Priority palette contains duplicates');
  return JSON.stringify(d);
 });
 await check('Calendar cards are separate white blocks',async()=>{
  await page.$eval('#nhiV2TopNav [data-v2-nav="calendar"]',e=>e.click());
  await page.waitForSelector('#planBox .nhi-plan-current');
  return await page.evaluate(()=>{
   if(document.querySelector('#planBox .nhi-v2-hero'))throw Error('Today hero repeated in calendar');
   const groups=[...document.querySelectorAll('#planBox .nhi-day-separated')];
   const cards=[...document.querySelectorAll('#planBox .nhi-day-separated .nhi-lesson-white')];
   if(!groups.length||!cards.length)throw Error('Calendar day groups/white cards missing');
   if(cards.some(c=>c.querySelector('.psched')||/Xem lịch ôn 5 lượt/.test(c.textContent)))throw Error('Calendar duplicates review dates');
   if(cards.some(c=>/\b\d+ từ vựng · \d+ câu\b/.test(c.textContent)))throw Error('Counts repeated in white card');
   if(cards.some(c=>/Bài ngày\s+\d{1,2}\.\d{1,2}/.test(c.textContent)))throw Error('Date text repeated in white card');
   if(cards.some(c=>c.querySelectorAll('.nhi-next-review').length!==1))throw Error('Expected one next-review date line per card');
   if(cards.some(c=>c.querySelector('.pstatus,.nhi-compact-resume')))throw Error('Status/unfinished labels make the compact card too tall');
   if(cards.some(c=>!c.querySelector('.nhi-next-review[aria-label]')))throw Error('Missing accessible review round');
   if(cards.some(c=>!c.querySelector('.nhi-next-review time')&&!c.querySelector('.nhi-next-review.completed')))
     throw Error('Missing next-review date');
   if(cards.some(c=>/Ngày ôn tiếp theo|Lượt \d\/5/.test(c.querySelector('.nhi-next-review')?.textContent||'')))
     throw Error('Review footer should use only icons and date');
   const heights=cards.slice(0,8).map(c=>Math.round(c.getBoundingClientRect().height));
   if(Math.max(...heights)>200)throw Error('White lesson card is still too tall: '+heights.join(','));
   const box=getComputedStyle(cards[0]);
   return groups.length+' day groups / '+cards.length+' compact cards / heights '+heights.join(',')+' / '+box.backgroundColor;
  });
 });
 await check('25 October has 27 distinct dated sublessons with preserved IDs and SRS plans',async()=>{
  const detail=await page.evaluate(async()=>{
    const r=await fetch('lessons.json',{cache:'no-store'});if(!r.ok)throw Error('Cannot fetch lessons.json');
    const j=await r.json();
    const all=j.lessons.filter(x=>/^2026-10-25-p\\d{2}$/.test(x.id)).sort((a,b)=>a.id.localeCompare(b.id));
    const checked=all.map((x,i)=>({
      id:x.id,date:x.date,expected:new Date(Date.UTC(2026,9,25-i)).toISOString().slice(0,10),
      cards:x.items.length,plan:x.plan
    }));
    const ids=all.flatMap(x=>x.items.map(it=>it[0]));
    return {count:all.length,totalCards:ids.length,uniqueIds:new Set(ids).size,
      distinctDates:new Set(all.map(x=>x.date)).size,
      bad:checked.filter(x=>x.date!==x.expected),
      examples:checked.slice(0,4).concat(checked.slice(-1))};
  });
  assert(detail.count===27&&detail.totalCards===1386&&detail.uniqueIds===1386,
    'Cannot verify original card identities: '+JSON.stringify(detail));
  assert(detail.distinctDates===27&&!detail.bad.length,'Dates are not independently assigned: '+JSON.stringify(detail));
  assert(detail.examples[0].plan==='2026-11-04'&&detail.examples.at(-1).plan==='2026-11-17',
    'Original review schedule changed: '+JSON.stringify(detail.examples));
  return JSON.stringify(detail.examples);
 });
 await check('Selected tab has no blue outer halo',async()=>{
  await page.mouse.move(0,0);
  const state=await page.$eval('#nhiV2TopNav [data-v2-nav="calendar"]',e=>({
    active:e.getAttribute('aria-current'),
    shadow:getComputedStyle(e).boxShadow,
    fill:getComputedStyle(e).backgroundColor
  }));
  assert(state.active==='page','Calendar tab not selected');
  assert(state.shadow==='none','Selected tab still has an outside ring: '+JSON.stringify(state));
  return JSON.stringify(state);
 });
 await check('Round badge uses color only, no calendar or hourglass emoji',async()=>{
  const test=await page.$eval('#planBox .nhi-plan-current .nhi-lesson-white .nhi-next-review',e=>({
    text:e.textContent,
    number:e.querySelector('.nhi-review-round')?.textContent,
    color:e.querySelector('.nhi-review-round')?getComputedStyle(e.querySelector('.nhi-review-round')).color:'',
    aria:e.getAttribute('aria-label')
  }));
  assert(!/[🗓⏳]/u.test(test.text),'Disallowed calendar or hourglass in review footer: '+test.text);
  assert(/^[1-5]$/.test(test.number||''),'Color-coded round number missing: '+JSON.stringify(test));
  assert(/Lượt [1-5]\\/5/.test(test.aria||''),'Accessible review round description missing');
  return JSON.stringify(test);
 });
 await check('Desktop calendar shows three day columns',async()=>{
  const result=await page.evaluate(()=>{
   const grid=document.querySelector('#planBox .nhi-plan-current .days-grid');
   const cols=getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/);
   return {columns:cols.length,width:grid.getBoundingClientRect().width};
  });
  assert(result.columns===3,'Expected 3 day columns: '+JSON.stringify(result));
  return JSON.stringify(result);
 });
 await check('Lesson details list five dates',async()=>{
  await page.$eval('#planBox .nhi-plan-current .nhi-lesson-white button.primary',e=>e.click());
  await page.waitForSelector('#planBox .ppage .psched');
  const count=await page.$$eval('#planBox .ppage .psched .pchip',xs=>xs.length);
  assert(count===5,'Expected 5 milestones, saw '+count);
  return '5 review dates visibly rendered';
 });
 await check('Lesson merge settings',async()=>{
  await page.$eval('#planBox .ppage button',()=>{
   const b=[...document.querySelectorAll('#planBox .ppage button')].find(x=>x.textContent.includes('Cài đặt bài'));
   if(!b)throw Error('No lesson settings');b.click();
  });
  await page.waitForSelector('#nhiLessonSettings select');
  const n=await page.$eval('#nhiLessonSettings select',x=>x.options.length);
  assert(n>1,'No merge destination choices');
  await page.$eval('#nhiLessonSettings .sheethead button',b=>b.click());
  return (n-1)+' candidate merge targets';
 });
 // Browse all primary sections (data-only; tests never send API requests).
 for(const [id,selector] of [
  ['notebook','#nhiV2Workspace [data-v2-grammar="0"]'],
  ['progress','#nhiV2Workspace .nhi-v2-metrics'],
  ['search','#nhiV2SearchInput'],
  ['practice','#nhiV2LessonSelect'],
 ]){
  await check('Navigation '+id,async()=>{
   await page.$eval('#nhiV2TopNav [data-v2-nav="'+id+'"]',x=>x.click());
   await page.waitForSelector(selector,{timeout:7000});
   const route=await page.evaluate(id=>({hash:location.hash,active:document.querySelector('#nhiV2TopNav [data-v2-nav="'+id+'"]')?.getAttribute('aria-current')}),id);
   const expected={notebook:'#/so-tay',progress:'#/tien-do',search:'#/tim-kiem',practice:'#/luyen-tap'}[id];
   assert(route.hash===expected&&route.active==='page','Route or active nav incorrect: '+JSON.stringify(route));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForSelector(selector,{timeout:17000});
   const active=await page.$eval('#nhiV2TopNav [data-v2-nav="'+id+'"]',e=>e.getAttribute('aria-current'));
   assert(active==='page','Refresh lost active navigation on '+id);
   return route.hash+' reload persisted';
  });
 }
 await check('Back navigation: Sổ tay → Hôm nay → Bìa',async()=>{
  await page.goto('http://127.0.0.1:8765/#/so-tay',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nhiV2Workspace [data-v2-grammar="0"]');
  await page.$eval('#nhiV2Back',e=>e.click());
  await page.waitForFunction(()=>location.hash==='#/hom-nay');
  await page.$eval('#nhiV2Back',e=>e.click());
  await page.waitForFunction(()=>location.hash==='#/bia');
  assert(await page.$eval('#cover',e=>!e.hidden),'Back from Today should open cover');
  await page.$eval('#coverGo',e=>e.click());
  await page.waitForFunction(()=>location.hash==='#/hom-nay');
  return 'navigation from notebook to cover works';
 });
 await check('Minutes, vocabulary and yesterday in Today goal',async()=>{
  await page.evaluate(()=>{
   const today=new Date(),y=new Date(today);y.setDate(today.getDate()-1);
   const stamp=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   const id=window.NHI_PLAN_V2.snapshot().items.find(x=>x.type==='w')?.id;
   localStorage.setItem('nhi-v2-learning-metrics-v1',JSON.stringify({
    minutes:{[stamp(today)]:180,[stamp(y)]:60},ratings:[{id,grade:'hard',at:Date.now()}]
   }));
   document.querySelector('#nhiV2TopNav [data-v2-nav="calendar"]').click();
  });
  await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',e=>e.click());
  await page.waitForFunction(()=>/3\/10 phút/.test(document.querySelector('#planBox .nhi-hero-goals')?.textContent||''),{timeout:8000});
  const text=await page.$eval('#planBox .nhi-hero-goals',e=>e.textContent);
  assert(/3\/10 phút/.test(text)&&/1\/10 từ/.test(text),'Incorrect real study metrics: '+text);
  assert(/Hôm qua: 1 phút/.test(text),'Yesterday comparison absent: '+text);
  assert(!!await page.$('#planBox .nhi-goal-word-list li'),'Vocabulary list absent');
  return text.slice(0,160);
 });
 // Test the actual requested screens at narrow widths, not only the flashcard screen.
 for(const section of ['today','calendar']){
  for(const width of [320,390,768,1360]){
   await check('Responsive '+section+' '+width,async()=>{
    await page.setViewport({width,height:830});
    await page.$eval('#nhiV2TopNav [data-v2-nav="'+section+'"]',e=>e.click());
    await page.waitForSelector(section==='today'?'#planBox .nhi-v2-hero':'#planBox .nhi-plan-current');
    const measurements=await page.evaluate((which)=>{
     const box=document.querySelector(which==='today'?'#planBox .nhi-v2-hero':'#planBox .nhi-day-separated');
     const b=box?.getBoundingClientRect();
     return {viewport:innerWidth,page:document.documentElement.scrollWidth,
      blockWidth:b?.width,blockRight:b?.right};
    },section);
    assert(measurements.page<=measurements.viewport+18,'Horizontal overflow: '+JSON.stringify(measurements));
    assert((measurements.blockRight||0)<=measurements.viewport+18,
     'Content block extends outside viewport: '+JSON.stringify(measurements));
    return JSON.stringify(measurements);
   });
  }
 }
 await page.setViewport({width:390,height:840});
 await page.$eval('#nhiV2TopNav [data-v2-nav="calendar"]',e=>e.click());
 await check('Calendar card compact at phone width',async()=>{
  const heights=await page.$$eval('#planBox .nhi-plan-current .nhi-lesson-white',cs=>cs.slice(0,5).map(c=>Math.round(c.getBoundingClientRect().height)));
  assert(heights.length&&Math.max(...heights)<=250,'Tall mobile cards: '+heights.join(','));
  return JSON.stringify(heights);
 });
 await page.setViewport({width:1360,height:880});
 await check('Study card hides 7-item navigation',async()=>{
  await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',x=>x.click());
  const target=await page.evaluate(()=>window.NHI_PLAN_V2.snapshot().lessons.find(x=>x.status==='late'||x.status==='today')?.id);
  assert(target,'No available lesson for flipping test');
  await page.evaluate(id=>window.NHI_PLAN_V2.startLessonById(id),target);
  await page.waitForSelector('#planBox .pcard',{timeout:8500});
  assert(await page.$eval('#nhiV2TopNav',el=>getComputedStyle(el).display==='none'),'Bottom nav visible during flashcards');
  return 'navigation hidden during card flip';
 });
 for(const width of [320,390,768,1360]){
  await check('Responsive width '+width,async()=>{
   await page.setViewport({width,height:830});
   await page.evaluate(()=>window.scrollTo(0,0));
   const r=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth,
      card:!!document.querySelector('#planBox .pcard')}));
   assert(r.scroll<=r.inner+18,'Horizontal overflow '+JSON.stringify(r));
   return JSON.stringify(r);
  });
 }
 await check('Fresh page refresh and progress persistence',async()=>{
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.NHI_PLAN_V2?.snapshot?.().lessons.length>10,{timeout:17000});
  const m=await page.evaluate(()=>window.NHI_PLAN_V2.snapshot());
  assert(m.lessons.length>10&&m.items.length>100,'Lesson catalog missing after refresh');
  return m.lessons.length+' lessons; '+m.items.length+' items loaded';
 });
 // Basic CSS integrity and resource requests.
 await check('JavaScript runtime errors',async()=>{
  assert(pageErrors.length===0,JSON.stringify(pageErrors.slice(0,20)));
  return 'No uncaught page errors';
 });
 await check('Missing local assets',async()=>{
  const filtered=missingAssets.filter((x,i,a)=>a.findIndex(y=>y.url===x.url&&y.status===x.status)===i);
  assert(filtered.length===0,JSON.stringify(filtered.slice(0,25)));
  return 'No HTTP 4xx assets';
 });
 fs.mkdirSync('/tmp/nhi-site-audit',{recursive:true});
 await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',e=>e.click());
 await page.setViewport({width:390,height:840});
 await page.screenshot({path:'/tmp/nhi-site-audit/today-mobile.png',fullPage:true});
 await page.$eval('#nhiV2TopNav [data-v2-nav="calendar"]',e=>e.click());
 await page.screenshot({path:'/tmp/nhi-site-audit/calendar-mobile.png',fullPage:true});
 await page.setViewport({width:1360,height:880});
 await page.screenshot({path:'/tmp/nhi-site-audit/calendar-desktop.png',fullPage:true});
}finally{
 await browser.close();
 fs.writeFileSync('/tmp/nhi-site-audit-report.json',JSON.stringify({date:new Date().toISOString(),total:checks.length,passed:checks.filter(c=>c.ok).length,failed:issues.length,issues,checks},null,2));
 console.log('SITE AUDIT RESULTS',JSON.stringify({total:checks.length,passed:checks.filter(c=>c.ok).length,failed:issues.length,issues},null,2));
}
if(issues.length)process.exitCode=1;

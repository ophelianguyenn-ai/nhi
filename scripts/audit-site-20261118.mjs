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
 await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',e=>e.click());
 await page.waitForSelector('#planBox .nhi-v2-priorities');
 await check('Integrated Today: one goal and one Học ngay button',async()=>{
  return await page.evaluate(()=>{
   const hero=document.querySelector('#planBox .nhi-v2-hero');
   if(!hero)throw Error('Today hero missing');
   if(document.querySelector('#planBox .nhi-today-secondary, #planBox .nhi-goal-tile, #planBox .nhi-calendar-shortcut'))
    throw Error('Old standalone white goal/calendar tiles remain');
   const goal=hero.querySelector('.nhi-goal-inline .nhi-v2-goal-track span');
   const count=hero.querySelector('.nhi-goal-count');
   const buttons=[...hero.querySelectorAll('button')].filter(x=>x.textContent.includes('Học ngay'));
   if(!goal||!count)throw Error('10-minute progress is not embedded in the blue hero');
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
   if(cards.some(c=>!/Lượt [2-5]\/5|Đã hoàn thành đủ 5 lượt/.test(c.querySelector('.nhi-next-review')?.textContent||'')))
     throw Error('Missing next review round/date');
   const heights=cards.slice(0,8).map(c=>Math.round(c.getBoundingClientRect().height));
   if(Math.max(...heights)>200)throw Error('White lesson card is still too tall: '+heights.join(','));
   const box=getComputedStyle(cards[0]);
   return groups.length+' day groups / '+cards.length+' compact cards / heights '+heights.join(',')+' / '+box.backgroundColor;
  });
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
   return 'rendered '+id;
  });
 }
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

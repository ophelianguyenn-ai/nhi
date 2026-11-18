/* Nhi 2.0 regression: real lesson data, pastel layout, 10-card SRS safety. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const lessons=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons;
const lesson=lessons.find(l=>l.items.length>=13);
const assert=(cond,msg)=>{if(!cond)throw Error(msg)};
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewport({width:1180,height:860});
 await page.evaluateOnNewDocument(()=>{
  sessionStorage.setItem('nlc-cover-seen','1');
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,haptic:false}));
 });
 await page.goto('http://127.0.0.1:8765/#',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#nhiV2TopNav',{timeout:15000});
 await page.waitForFunction(()=>window.NHI_PLAN_V2?.snapshot?.().lessons.length>10,{timeout:20000});
 const loaded=await page.evaluate(()=>{
  const d=window.NHI_PLAN_V2.snapshot();
  return {lessons:d.lessons.length,items:d.items.length,nav:document.querySelectorAll('#nhiV2TopNav button').length,
   backup:!!localStorage.getItem('nhi-v2-rollback-progress-20261117')};
 });
 assert(loaded.lessons>10&&loaded.items>100&&loaded.nav>=7,'2.0 app did not load: '+JSON.stringify(loaded));
 console.log('STEP dashboard');
 await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',e=>e.click());
 await page.waitForSelector('#planBox .nhi-v2-priorities');
 assert(await page.$$eval('#planBox .nhi-v2-priority',es=>es.length)<=3,'Dashboard exceeded 3 priority lessons');
 assert(!!await page.$('#planBox .nhi-v2-start'),'No 10-minute CTA');
 console.log('STEP calendar');
 await page.$eval('#nhiV2TopNav [data-v2-nav="calendar"]',e=>e.click());
 await page.waitForSelector('#planBox .nhi-plan-current');
 assert(!!await page.$('#planBox .nhi-plan-waiting'),'Missing waiting panel');
 assert(!!await page.$('#planBox .nhi-day-combined .nhi-compact-lesson'),'Missing compact integrated day cards');
 assert(!await page.$('#planBox .nhi-v2-review-details'),'Calendar still duplicates the five review dates');
 assert(!await page.$('#planBox .nhi-v2-intro'),'Today greeting panel should be merged with hero');
 // Five review dates are visible in the lesson detail without an extra click.
 await page.evaluate(id=>{location.hash='#/bai/'+id;},lesson.id);
 await page.waitForSelector('#planBox .ppage .psched');
 assert((await page.$eval('#planBox .ppage .psched .pchip',es=>es.length))===5,'Lesson detail must show all five review dates');
 await page.$eval('#planBox .pback',e=>e.click());
 console.log('STEP search');
 await page.$eval('#nhiV2TopNav [data-v2-nav="search"]',e=>e.click());
 await page.waitForSelector('#nhiV2SearchInput');
 await page.$eval('#nhiV2SearchInput',e=>{e.value='원주';e.dispatchEvent(new Event('input',{bubbles:true}));});
 const results=await page.$$eval('#nhiV2Workspace article',es=>es.length);
 assert(results>=1,'Search did not find matching Korean terms');
 console.log('STEP notebooks');
 await page.$eval('#nhiV2TopNav [data-v2-nav="notebook"]',e=>e.click());
 await page.waitForSelector('[data-v2-grammar="0"]');
 await page.$eval('[data-v2-grammar="0"]',e=>{e.value='Tự lưu ghi chú kiểm thử';e.dispatchEvent(new Event('input',{bubbles:true}));});
 assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('nhi-v2-grammar-notes-v1')||'{}')['-아/어야 합니다']==='Tự lưu ghi chú kiểm thử'),'Grammar note not saved');
 console.log('STEP practice quiz');
 await page.$eval('#nhiV2TopNav [data-v2-nav="practice"]',e=>e.click());
 await page.waitForSelector('#nhiV2LessonSelect');
 await page.$eval('#nhiV2LessonSelect',(e,id)=>{e.value=id;e.dispatchEvent(new Event('change',{bubbles:true}));},lesson.id);
 await page.$eval('[data-v2-act="mode:quiz"]',e=>e.click());
 await page.waitForSelector('.nhi-v2-options button');
 await page.$eval('.nhi-v2-options button',e=>e.click());
 assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('nhi-v2-learning-metrics-v1')||'{}').quizzes||[])).length===1,'Quiz score not logged');
 console.log('STEP settings');
 await page.$eval('#nhiV2TopNav [data-v2-nav="search"]',e=>e.click());
 await page.$eval('#nhiV2TopNav [data-v2-nav="practice"]',e=>e.click());
 await page.evaluate(()=>document.querySelector('#nhiV2SettingsTabs')?.querySelector('[data-stab="advanced"]')?.click());
 assert(!!await page.$('#nhiV2SettingsTabs'),'Settings basic/advanced tabs missing');
 console.log('STEP chunk resume');
 await page.evaluate(id=>{
  document.querySelector('#nhiV2TopNav [data-v2-nav="today"]').click();
  window.NHI_PLAN_V2.startLessonById(id);
 },lesson.id);
 await page.waitForSelector('#planBox .pcard');
 const doneBefore=await page.evaluate(id=>(JSON.parse(localStorage.getItem('viko-plan-v1')||'{}').done?.[id]?.v||[]).length,lesson.id);
 const grading=await page.evaluate(()=>{
  let n=0;
  for(let i=0;i<10;i++){
   const b=document.querySelector('#planBox .prate .nhi-next-v3');
   if(!b)break;b.click();n++;
  }
  return n;
 });
 assert(grading===10,'Unable to navigate ten cards: '+grading);
 await page.waitForSelector('#planBox .nhi-v2-mini-done',{timeout:10000});
 const state=await page.evaluate(id=>{
  const s=JSON.parse(localStorage.getItem('viko-plan-sess-v1')||'{}'),p=JSON.parse(localStorage.getItem('viko-plan-v1')||'{}');
  return {pos:s.pos,batch:s.batchStop,done:p.done?.[id]?.v?.length||0,savedBatches:(JSON.parse(localStorage.getItem('nhi-v2-batches-v1')||'[]')).length};
 },lesson.id);
 assert(state.pos===10&&state.done===doneBefore&&state.savedBatches>=1,'Ten-card checkpoint incorrectly completed lesson: '+JSON.stringify(state));
 await page.$eval('#planBox .nhi-v2-mini-done button.ghost',e=>e.click());
 const resumed=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')||'{}').resumeFull?.[id]?.pos,lesson.id);
 assert(resumed===10,'Checkpoint cannot resume after pause: '+resumed);
 console.log('STEP mobile nav');
 await page.setViewport({width:390,height:800});
 await page.$eval('#nhiV2TopNav [data-v2-nav="today"]',e=>e.click());
 const mobile=await page.evaluate(()=>({
  visible:!!document.querySelector('#nhiV2TopNav'),
  nav:(()=>{const r=document.querySelector('#nhiV2TopNav').getBoundingClientRect();return {width:r.width,height:r.height,top:r.top};})(),
  hasDashboard:!!document.querySelector('#planBox .nhi-v2-priorities'),
  width:document.documentElement.scrollWidth,inner:window.innerWidth
 }));
 assert(mobile.hasDashboard&&mobile.nav.width>300&&mobile.width<mobile.inner+60,'Mobile UI broken: '+JSON.stringify(mobile));
 assert(!errors.length,'JavaScript errors: '+errors.join(' | '));
 console.log('NHI UX V2 PASS',JSON.stringify({loaded,results,state,mobile:{width:mobile.width,inner:mobile.inner}}));
}finally{await browser.close();}

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
 await check('Học ngay is white/blue and directly adjacent to due counters',async()=>{
  const results=[];
  for(const width of [1360,390]){
   await page.setViewport({width,height:880});
   const result=await page.evaluate(()=>{
    const container=document.querySelector('#planBox .nhi-v2-hero .nhi-hero-activity');
    const badges=container?.querySelector('.tstats');
    const button=container?.querySelector('.nhi-hero-start');
    if(!container||!badges||!button)throw Error('Missing due badges or Học ngay');
    const left=badges.getBoundingClientRect(),right=button.getBoundingClientRect();
    const bg=getComputedStyle(button).backgroundColor,ink=getComputedStyle(button).color;
    return {gap:Math.round(right.left-left.right),sameRow:Math.abs(right.top-left.top)<28,
      background:bg,color:ink,text:button.textContent.trim(),
      right:Math.round(right.right),viewport:innerWidth};
   });
   assert(result.background==='rgb(255, 255, 255)'&&result.color==='rgb(23, 109, 146)',
     'Học ngay does not have white background and blue lettering: '+JSON.stringify(result));
   if(width===1360)assert(result.sameRow&&result.gap>=0&&result.gap<=14,
     'Học ngay should be tight beside due counts, not pinned to the far right: '+JSON.stringify(result));
   assert(result.right<=width+12,'CTA overflows the viewport: '+JSON.stringify(result));
   results.push({width,...result});
  }
  await page.setViewport({width:1360,height:880});
  return JSON.stringify(results);
 });
 await check('Seven navigation links centered independent of arrow',async()=>{
  const v=await page.evaluate(()=>{
   const nav=document.getElementById('nhiV2TopNav'),tabs=nav?.querySelector('.nhi-v2-nav-tabs');
   const back=nav?.querySelector('#nhiV2Back');
   if(!nav||!tabs||!back)throw Error('Navigation shell is incomplete');
   const nr=nav.getBoundingClientRect(),tr=tabs.getBoundingClientRect();
   return {count:tabs.querySelectorAll('[data-v2-nav]').length,
    centering:Math.round((tr.left+tr.right-nr.left-nr.right)/2),
    arrow:back.textContent.trim(),
    label:back.getAttribute('aria-label')};
  });
  assert(v.count===7&&Math.abs(v.centering)<=12,'Navigation is not centered: '+JSON.stringify(v));
  assert(v.arrow==='←'&&v.label==='Quay lại','Back button must show only an accessible arrow: '+JSON.stringify(v));
  return JSON.stringify(v);
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
    const all=j.lessons.filter(x=>/^2026-10-25-p\d{2}$/.test(x.id)).sort((a,b)=>a.id.localeCompare(b.id));
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
  assert(/Lượt [1-5]\/5/.test(test.aria||''),'Accessible review round description missing');
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
 await check('Random full-background highlights match both languages without half-fill underline',async()=>{
  const result=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll('#planBox .pitems li[data-item]')];
    let first=null;
    for(const row of rows){
      const vi=[...row.querySelectorAll('.pvi .ph.tap')],ko=[...row.querySelectorAll('.pko .ph.tap')];
      const match=vi.find(x=>ko.some(y=>y.dataset.hi===x.dataset.hi));
      if(match){first={id:row.dataset.item,pair:match.dataset.hi};break;}
    }
    if(!first)throw Error('No paired Vietnamese-Korean phrase found in lesson detail');
    const results=[];
    for(let i=0;i<10;i++){
      const row=document.querySelector('#planBox .pitems li[data-item="'+first.id+'"]');
      const selector=(i%2?'.pko':'.pvi')+' .ph.tap[data-hi="'+first.pair+'"]';
      const trigger=row.querySelector(selector);
      if(!trigger)throw Error('One language lost its clickable phrase');
      // Cover both states deterministically: a color, then transparent, followed by random taps.
      if(i<2){const rng=Math.random;Math.random=()=>i===0?0.2:0.999;try{trigger.click();}finally{Math.random=rng;}}
      else trigger.click();
      const updated=document.querySelector('#planBox .pitems li[data-item="'+first.id+'"]');
      const vi=updated.querySelector('.pvi .ph.tap[data-hi="'+first.pair+'"]');
      const ko=updated.querySelector('.pko .ph.tap[data-hi="'+first.pair+'"]');
      const v=getComputedStyle(vi),k=getComputedStyle(ko);
      results.push({color:v.color,koColor:k.color,
        viSelected:vi.classList.contains('nhi-phrase-selected'),koSelected:ko.classList.contains('nhi-phrase-selected'),
        background:v.backgroundColor,koBackground:k.backgroundColor,gradient:v.backgroundImage,decoration:v.textDecorationLine,breakMode:v.boxDecorationBreak});
    }
    return {...first,results};
  });
  const x=result.results;
  assert(x.length===10&&x.every(z=>z.viSelected===z.koSelected&&z.color===z.koColor&&z.background===z.koBackground),
   'Paired languages must have identical colors and transparent state: '+JSON.stringify(result));
  assert(x.every(z=>z.viSelected
    ? z.background&&z.background!=='rgba(0, 0, 0, 0)'&&z.background!=='transparent'
    : z.background==='rgba(0, 0, 0, 0)'||z.background==='transparent'),
   'Colored pairs must be filled and transparent pairs must be unpainted: '+JSON.stringify(result));
  const palette=await page.evaluate(()=>{
    const css=getComputedStyle(document.documentElement);
    return Array.from({length:22},(_,i)=>css.getPropertyValue('--nhi-pair-'+(i+1)).trim().toLowerCase());
  });
  const approved=['#f7a5a8','#fcadd5','#fefb6a','#febd69','#a7f5ac','#91e1fd','#e1b5f4'];
  assert(palette.slice(0,7).every((c,i)=>c===approved[i])&&palette.slice(7).every(c=>!c),
   'Only the seven approved reference colors may remain: '+JSON.stringify(palette));
  assert(x[1].viSelected===false&&x[1].koSelected===false&&x[1].background==='rgba(0, 0, 0, 0)',
   'The transparent no-fill option should remove highlighting from both languages: '+JSON.stringify(x[1]));
  assert(x.every(z=>!z.viSelected||palette.slice(0,7).some(c=>{
    const rgb=c.slice(1).match(/../g).map(v=>parseInt(v,16));
    return z.background==='rgb('+rgb.join(', ')+')';
  })),'Highlighted text must use one of the seven approved colors: '+JSON.stringify(result));
  assert(x.every(z=>z.gradient==='none'&&z.decoration==='none'&&z.breakMode==='clone'),
   'Highlight must cover the full phrase without gradient or underline: '+JSON.stringify(result));
  assert(x.every((z,i)=>!i||z.background!==x[i-1].background),'Consecutive taps reused the same background');
  assert(new Set(x.map(z=>z.background)).size>=3,'Random backgrounds did not show varied colors');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#planBox .ppage .pitems li[data-item]',{timeout:15000});
  const saved=await page.evaluate(x=>{
    const row=document.querySelector('#planBox .pitems li[data-item="'+x.id+'"]');
    const vi=row?.querySelector('.pvi .ph.tap[data-hi="'+x.pair+'"]');
    const ko=row?.querySelector('.pko .ph.tap[data-hi="'+x.pair+'"]');
    return {vi:vi?getComputedStyle(vi).backgroundColor:'',ko:ko?getComputedStyle(ko).backgroundColor:''};
  },result);
  assert(saved.vi===x.at(-1).background&&saved.ko===saved.vi,'Random pair highlight lost on reload: '+JSON.stringify(saved));
  return 'Seven approved colors + transparent; no repeats, VI–KO synchronized, saved after reload';
 });
 await check('No extra transparent swatch row; tapping still cycles through seven colors and clear',async()=>{
  const state=await page.evaluate(()=>{
    const row=[...document.querySelectorAll('#planBox .pitems li[data-item]')].find(x=>x.querySelector('.pvi .ph.tap'));
    if(!row)throw Error('Missing tappable phrase');
    const id=row.dataset.item,phrase=row.querySelector('.pvi .ph.tap'),pair=phrase.dataset.hi;
    const random=Math.random;
    Math.random=()=>.2;
    try{phrase.click();}finally{Math.random=random;}
    const updated=document.querySelector('#planBox .pitems li[data-item="'+id+'"]');
    return {id,pair,selected:!!updated.querySelector('.pvi .ph.nhi-phrase-selected[data-hi="'+pair+'"]'),
      extraTransparentButton:!!document.querySelector('#planBox .nhi-transparent-btn')};
  });
  assert(state.selected&&!state.extraTransparentButton,
   'Unexpected transparent box/row or lost pair highlighting: '+JSON.stringify(state));
  return 'Seven approved colors are retained without a separate transparent row';
 });
 await check('Continuous lesson mode has no forced 10-card celebration',async()=>{
  const result=await page.evaluate(()=>{
    const code=[...document.scripts].filter(x=>!x.src).map(x=>x.textContent).join('\n');
    return {checkpointUI:code.includes('function renderBatchDone('),
      checkpointGate:code.includes('s.batchStop&&'),
      saveOldBatch:code.includes('nhi-v2-batches-v1')};
  });
  assert(!result.checkpointUI&&!result.checkpointGate&&!result.saveOldBatch,
   'Lessons still contain a forced 10-card checkpoint: '+JSON.stringify(result));
  return 'Lesson session continues until the real end';
 });
 await check('Brand name opens the Calendar',async()=>{
  await page.$eval('#brandBtn',b=>b.click());
  await page.waitForFunction(()=>location.hash==='#/lich-hoc',{timeout:15000});
  assert((await page.$eval('#nhiV2TopNav [data-v2-nav="calendar"]',b=>b.getAttribute('aria-current')))==='page',
   'Calendar tab is not active after clicking brand title');
  // Return to a lesson detail so the next tests retain their previous setup.
  await page.$eval('#planBox .nhi-plan-current .nhi-lesson-white button.primary',b=>b.click());
  await page.waitForSelector('#planBox .ppage .pitems');
  return 'Brand title → Lịch học';
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
 await check('Lesson detail uses only global back arrow to Calendar',async()=>{
  const ui=await page.evaluate(()=>({
   hasOldPill:!!document.querySelector('#planBox .ppage .pback'),
   arrow:document.querySelector('#nhiV2Back')?.textContent.trim(),
   arrowLabel:document.querySelector('#nhiV2Back')?.getAttribute('aria-label'),
   hash:location.hash
  }));
  assert(!ui.hasOldPill&&ui.arrow==='←'&&ui.arrowLabel==='Quay lại','Old Lịch học pill still shown: '+JSON.stringify(ui));
  assert(ui.hash.startsWith('#/bai/'),'Not in lesson detail before returning');
  await page.$eval('#nhiV2Back',button=>button.click());
  await page.waitForFunction(()=>location.hash==='#/lich-hoc'&&!!document.querySelector('#planBox .nhi-plan-current'),{timeout:11000});
  const active=await page.$eval('#nhiV2TopNav [data-v2-nav="calendar"]',x=>x.getAttribute('aria-current'));
  assert(active==='page','Calendar tab not active after lesson back');
  return 'Lesson detail → Calendar, no redundant pill';
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
 await check('Chat examples save as Vietnamese without final full stop: Korean',async()=>{
  const result=await page.evaluate(()=>{
    const session=JSON.parse(localStorage.getItem('viko-plan-sess-v1')||'{}');
    const cardId=session.queue?.[session.pos];
    if(!cardId||!window.NLC_NOTES?.add)throw Error('Study card or chat-to-note helper unavailable');
    const getText=()=>JSON.parse(localStorage.getItem('viko-plan-v1')||'{}').note?.[cardId]?.v?.text||'';
    const original=getText();
    const first=window.NLC_NOTES.add('Tôi học tiếng Hàn.: 저는 한국어를 공부해요.');
    const second=window.NLC_NOTES.add('저는 학교에 갑니다. (Tôi đi đến trường.)');
    const third=window.NLC_NOTES.add('Tôi đang làm việc.: 저는 일하고 있습니다.');
    const reject=window.NLC_NOTES.add('Chỉ có một câu tiếng Việt.');
    const final=getText(),added=final.slice(original.length).trim().split('\n');
    return {first,second,third,reject,added,originalUnchanged:final.startsWith(original)};
  });
  assert(result.first&&result.second&&result.third&&!result.reject,
   'Notes must accept bilingual examples only: '+JSON.stringify(result));
  assert(result.originalUnchanged,'Existing learner notes should not be modified');
  assert(JSON.stringify(result.added)===JSON.stringify([
    'Tôi học tiếng Hàn: 저는 한국어를 공부해요.',
    'Tôi đi đến trường: 저는 학교에 갑니다.',
    'Tôi đang làm việc: 저는 일하고 있습니다.'
  ]),'Incorrect Vietnamese: Korean punctuation in chat note: '+JSON.stringify(result));
  return 'No trailing Vietnamese dot, Korean punctuation unchanged, no unpaired line';
 });
 await check('AI chat can copy a paragraph and complete answer',async()=>{
  await page.evaluate(()=>{
    const log=document.querySelector('#aiLog'),msg=document.createElement('div');
    msg.className='aimsg ai';msg.id='nhi-audit-copy-msg';
    msg.textContent='Tôi đang học tiếng Hàn: 저는 한국어를 공부해요.\nTôi đi làm: 저는 출근해요.';
    Object.defineProperty(navigator,'clipboard',{configurable:true,
      value:{writeText:async text=>{window.__nhiCopied=String(text);}}});
    log.appendChild(msg);
  });
  await page.waitForSelector('#nhi-audit-copy-msg .nhi-copy-chat-text',{timeout:6000});
  await page.$eval('#nhi-audit-copy-msg .nhi-copy-chat-text',b=>b.click());
  await page.waitForFunction(()=>typeof window.__nhiCopied==='string',{timeout:4000});
  const single=await page.evaluate(()=>window.__nhiCopied);
  assert(single.includes('Tôi đang học tiếng Hàn')&&!single.includes('Tôi đi làm'),
   'Single paragraph should only copy the selected paragraph: '+single);
  await page.$eval('#nhi-audit-copy-msg .nhi-copy-chat-all',b=>b.click());
  await page.waitForFunction(()=>window.__nhiCopied?.includes('Tôi đi làm'),{timeout:4000});
  const entire=await page.evaluate(()=>window.__nhiCopied);
  assert(entire.includes('저는 한국어를 공부해요.')&&entire.includes('저는 출근해요.'),
   'Copy whole answer omitted text: '+entire);
  return 'Copy one paragraph or entire AI reply without affecting speech buttons';
 });
 await check('Hard-grade girl overlay does not shift language blocks',async()=>{
  const result=await page.evaluate(()=>{
    const c=document.querySelector('#planBox .pcard');
    const initial=c?.querySelector('.pfront > .prompt,.pfront > .nhi-ko-line .answer');
    if(!c||!initial)throw Error('No learning card or prompt');
    const px=el=>{const r=el.getBoundingClientRect();return r.left+r.width/2;};
    const before=px(initial),cardCenter=px(c);
    window.NHI_HARD_MASCOT.show(c);
    const after=px(initial),girl=c.querySelector('#nhi-hard-mascot');
    const width=girl?.getBoundingClientRect().width||0;
    const stage=c.querySelector('.pfront');
    const centeredStage=px(stage);
    window.NHI_HARD_MASCOT.clear();
    return {before,after,cardCenter,centeredStage,width};
  });
  assert(Math.abs(result.after-result.before)<=1.5&&result.width>=60&&result.width<=137,
   'Mascot must be smaller without moving card content: '+JSON.stringify(result));
  assert(Math.abs(result.centeredStage-result.cardCenter)<=2,
   'Text center must remain aligned to card: '+JSON.stringify(result));
  return JSON.stringify(result);
 });
 await check('Both sides and notes remain centered independently of dictionaries and English controls',async()=>{
  const result=await page.evaluate(()=>{
    const stage=document.querySelector('#planBox .pcard .pfront');
    if(!stage)throw Error('Missing study front');
    stage.click();
    const flipped=document.querySelector('#planBox .pcard .pfront'),
       box=flipped.getBoundingClientRect(),
       center=box.left+box.width/2,
       selectors=['.nhi-ko-line .answer','.vi-under','.nhi-card-note','.nhi-english-v5'];
    return selectors.map(selector=>{
      const node=flipped.querySelector(selector);
      if(!node)return {selector,missing:true};
      const r=node.getBoundingClientRect();
      return {selector,centerDiff:Math.round((r.left+r.width/2-center)*10)/10,
        width:r.width,visible:r.width>0&&r.height>0};
    });
  });
  for(const entry of result){
    if(entry.selector==='.nhi-english-v5'&&entry.missing)continue;
    assert(!entry.missing&&entry.visible&&Math.abs(entry.centerDiff)<=9,
      'Language or note is shifted from geometric card center: '+JSON.stringify(result));
  }
  return JSON.stringify(result);
 });
 await check('Hard cards return later without infinite repeats',async()=>{
  const result=await page.evaluate(()=>{
    const current=JSON.parse(localStorage.getItem('viko-plan-sess-v1')||'{}'),
      id=current.queue?.[current.pos],before=current.queue?.length||0;
    if(!id||!document.querySelector('#planBox .prate .hard'))throw Error('No hard-grade action');
    document.querySelector('#planBox .prate .hard').click();
    const next=JSON.parse(localStorage.getItem('viko-plan-sess-v1')||'{}');
    const repeatPos=next.queue.findIndex((x,i)=>i>current.pos&&x===id);
    return {before,after:next.queue?.length||0,id,repeatPos,currentPos:current.pos,
      flag:next.hardSpaced?.[id],hardCount:next.stats?.hard};
  });
  assert(result.after===result.before+1&&result.flag===1&&
   result.repeatPos>result.currentPos&&result.repeatPos<=result.currentPos+4,
   'Hard card did not get a spaced repeat: '+JSON.stringify(result));
  return JSON.stringify(result);
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
 // Verify original GIF and caption are never clipped or masked on the exact laptop sizes.
 await check('Original kitten GIF, entire embedded caption, seamless background and laptop heights',async()=>{
  const finish=await page.evaluate(()=>{
   const ids=window.NHI_PLAN_V2?.snapshot?.().lessons||[];
   const small=ids.filter(x=>x.ids?.length>=1&&x.ids?.length<=18).sort((a,b)=>a.ids.length-b.ids.length)[0];
   if(!small)throw Error('No short lesson for finish-screen regression');
   window.NHI_PLAN_V2.startLessonById(small.id);
   window.__nhiMeowOnDone=0;
   const originalMeow=window.NHI_VICTORY_CAT?.meow;
   if(originalMeow)window.NHI_VICTORY_CAT.meow=function(){
     window.__nhiMeowOnDone++;return originalMeow.apply(this,arguments);
   };
   const hardButton=document.querySelector('#planBox .prate .hard');
   if(hardButton)hardButton.click();
   let stepped=0;
   while(stepped<250&&!document.querySelector('#planBox .sdone')){
    const next=document.querySelector('#planBox .prate .nhi-next-v3');
    if(!next)break;
    next.click();stepped++;
   }
   return {lesson:small.id,steps:stepped,completed:!!document.querySelector('#planBox .sdone')};
  });
  assert(finish.completed,'Unable to reach the completion screen: '+JSON.stringify(finish));
  const completion=await page.evaluate(()=>({
    meowCalls:window.__nhiMeowOnDone||0,
    reviewBtn:document.querySelector('#planBox .sdone .nhi-review-hard-button')?.textContent||''
  }));
  assert(completion.meowCalls===1&&completion.reviewBtn.includes('Ôn lại thẻ khó'),
   'Completion must auto-trigger cat sound once and offer review of hard cards: '+JSON.stringify(completion));
  await page.waitForSelector('#planBox .sdone .nhi-original-gif',{timeout:9000});
  await page.waitForFunction(()=>document.querySelector('#planBox .sdone .nhi-original-gif')?.complete,
   {timeout:8000});
  const measures=[];
  for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[390,844]]){
   await page.setViewport({width,height});
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForFunction(()=>getComputedStyle(document.body).backgroundImage.includes('data:image/png'),{timeout:12000});
   await new Promise(r=>setTimeout(r,150));
   const m=await page.evaluate(()=>{
    const img=document.querySelector('#planBox .sdone img.nhi-original-gif');
    const scene=document.querySelector('#planBox .sdone .nhi-victory-cat-scene');
    const container=document.querySelector('#planBox .sdone');
    const imgCss=getComputedStyle(img),sceneCss=getComputedStyle(scene);
    const bounds=r=>({top:Math.round(r.top),bottom:Math.round(r.bottom),
       left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),height:Math.round(r.height)});
    const ib=bounds(img.getBoundingClientRect()),sb=bounds(scene.getBoundingClientRect());
    const topbar=document.querySelector('#topbar');
    return {viewport:{width:innerWidth,height:innerHeight},
     documentHeight:document.documentElement.scrollHeight, bodyHeight:document.body.scrollHeight,
     img:ib,scene:sb,card:bounds(container.getBoundingClientRect()),
     topbarBottom:Math.round(topbar.getBoundingClientRect().bottom),
     natural:[img.naturalWidth,img.naturalHeight],
     objectFit:imgCss.objectFit,mask:imgCss.maskImage,webkitMask:imgCss.webkitMaskImage,
     clip:imgCss.clipPath,opacity:imgCss.opacity,overflow:sceneCss.overflow,
     bgColor:getComputedStyle(container).backgroundColor,
     buttons:[...container.querySelectorAll('button')].filter(b=>!b.hidden&&getComputedStyle(b).display!=='none')
      .map(b=>({label:b.textContent.trim(),...bounds(b.getBoundingClientRect())})),
     catFocusable:img.getAttribute('role')==='button',gifSrc:img.getAttribute('src')};
   });
   measures.push(m);
   fs.mkdirSync('/tmp/nhi-site-audit',{recursive:true});
   if(width>=780)await page.screenshot({path:'/tmp/nhi-site-audit/reward-'+width+'x'+height+'.png'});
   assert(m.natural[0]===307&&m.natural[1]===623,'Original kitten GIF size changed: '+JSON.stringify(m));
   assert(m.objectFit==='contain'&&m.mask==='none'&&m.webkitMask==='none'&&m.clip==='none',
    'Original GIF caption is still masked or cropped: '+JSON.stringify(m));
   assert(m.opacity==='1'&&m.scene.top<=m.img.top&&m.scene.bottom>=m.img.bottom,
    'GIF bounds are clipped by scene: '+JSON.stringify(m));
   assert(m.catFocusable&&m.buttons.some(b=>b.label.includes('Học lại'))&&m.buttons.some(b=>b.label.includes('Xong')),
    'Cat click or completion buttons missing: '+JSON.stringify(m));
   if(width>=780){
    assert(m.documentHeight<=height+10&&m.bodyHeight<=height+10,
     'Desktop completion screen requires scrolling: '+JSON.stringify(m));
    assert(m.buttons.every(b=>b.bottom<=height+2)&&m.img.bottom<=height+2,
     'Caption/buttons are below laptop viewport: '+JSON.stringify(m));
   }else{
    assert(m.img.width<=width+1,'Mobile completion GIF overflows horizontally: '+JSON.stringify(m));
   }
  }
  await page.setViewport({width:1366,height:768});
  await new Promise(r=>setTimeout(r,220));
  const pixels=await page.evaluate(async()=>{
    const image=document.querySelector('#planBox .sdone .nhi-original-gif');
    await image.decode();
    const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const d=ctx.getImageData(0,0,c.width,c.height).data;
    function rgb(x,y){const i=(y*c.width+x)*4;return Array.from(d.slice(i,i+4));}
    const cssImage=getComputedStyle(document.body).backgroundImage;
    const raw=cssImage.match(/data:image\/png;base64,[a-zA-Z0-9+/=]+/);
    if(!raw)throw Error('No original GIF edge-color backdrop generated');
    const backdrop=new Image();backdrop.src=raw[0];await backdrop.decode();
    const bc=document.createElement('canvas');bc.width=backdrop.naturalWidth;bc.height=backdrop.naturalHeight;
    const bctx=bc.getContext('2d',{willReadFrequently:true});bctx.drawImage(backdrop,0,0);
    const bounds=image.getBoundingClientRect(),midY=Math.round(bounds.top+bounds.height/2);
    const sy=Math.max(0,Math.min(c.height-1,Math.floor((midY-bounds.top)*c.height/bounds.height)));
    const outer=bctx.getImageData(Math.floor(bounds.left)-2,midY,1,1).data;
    const sourceSide=ctx.getImageData(0,sy,1,1).data;
    const difference=Math.max(...[0,1,2].map(i=>Math.abs(outer[i]-sourceSide[i])));
    return {size:[c.width,c.height],corners:[rgb(0,0),rgb(c.width-1,0),rgb(0,c.height-1),rgb(c.width-1,c.height-1)],
      middles:[rgb(Math.floor(c.width/2),0),rgb(Math.floor(c.width/2),c.height-1)],
      backdropSize:[bc.width,bc.height],sideDifference:difference,
      outer:Array.from(outer),sourceSide:Array.from(sourceSide),
      background:getComputedStyle(document.body).backgroundColor};
  });
  assert(pixels.sideDifference<=4,'Visible GIF rectangle edge mismatch: '+JSON.stringify(pixels));
  console.log('NHI REWARD SCREEN METRICS',JSON.stringify({finish,measures,pixels}));
  return JSON.stringify({sizes:measures.map(x=>({viewport:x.viewport,img:x.img,documentHeight:x.documentHeight,
    backgrounds:x.bgColor})),pixelCorners:pixels.corners});
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

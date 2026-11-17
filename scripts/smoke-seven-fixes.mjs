/* Regression for Nhi's seven requested 2026-11-17 improvements. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const lessons=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons;
const lesson=lessons.find(L=>L.items.length>=8);
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(String(err)));
 await page.evaluateOnNewDocument(()=>{
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,haptic:false}));
  sessionStorage.setItem('nlc-cover-seen','1');
 });
 await page.goto('http://127.0.0.1:8765/#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#planBox .ppage',{timeout:15000});
 const found=await page.evaluate(()=>{
  const checked=window.NHI_VERIFIED_PAIRS||{},keys=Object.keys(checked);
  const ch=checked.s6df5b7145||[];
  return {count:keys.length,chiller:ch,hasAPI:!!window.NHI_PHRASES_V5};
 });
 assert(found.hasAPI&&found.count===59&&found.chiller.length>=3,'59 verified sentence alignments not loaded');
 const clean=await page.evaluate(()=>{
  const f=window.NHI_SPEECH?.clean;
  return f&&[
   f('원주 이음부 (mối nối chu vi)'),
   f('안녕하세요（nghĩa Việt） 반갑습니다 [giải thích]'),
   f('(chỉ chú thích)')
  ];
 });
 assert(clean&&clean[0]==='원주 이음부'&&clean[1]==='안녕하세요 반갑습니다'&&clean[2]==='',
   'Words in parentheses still spoken: '+JSON.stringify(clean));
 assert(!(await page.$$eval('#planBox button', els => els.some(e => e.textContent.includes('Học trước')))),
   'Lesson still displays Học trước');
 await page.evaluate(()=>[...document.querySelectorAll('#planBox button')].find(b=>/Học ngay|Học trước|Tiếp tục|Học lại/.test(b.textContent)).click());
 await page.waitForSelector('#planBox .pcard',{timeout:10000});
 const before=await page.$eval('#planBox .pcard',e=>e.dataset.item);
 await page.$eval('#planBox .prate .hard',e=>e.click());
 await new Promise(r=>setTimeout(r,1250));
 const after=await page.$eval('#planBox .pcard',e=>e.dataset.item);
 assert(after===before,'Khó unexpectedly advanced to next card');
 const hard=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).hard?.[id]?.v,before);
 assert(!!hard,'Khó did not save grade');
 await page.$eval('#planBox .prate .nhi-next-v3',e=>e.click());
 const next=await page.$eval('#planBox .pcard',e=>e.dataset.item);
 assert(next!==before,'Next did not advance after marking Khó');
 // Deletion must survive full reload.
 await page.$eval('#planBox .nhi-card-corner-trash',e=>e.click());
 assert(!await page.evaluate(id=>document.querySelector('#planBox .pcard')?.dataset.item===id,next),'Deleted card still visible');
 assert(await page.evaluate(id=>!!JSON.parse(localStorage.getItem('viko-plan-v1')).del?.[id]?.v,next),'Deletion tombstone missing');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#planBox .pcard',{timeout:16000});
 assert(await page.evaluate(id=>!!JSON.parse(localStorage.getItem('viko-plan-v1')).del?.[id]?.v,next),'Reload resurrected deleted card');
 // Saving edited note in a closed editor must not depend on pressing Lưu.
 await page.$eval('#planBox .cicons [title*="Sửa thẻ"]',e=>e.click());
 await page.waitForSelector('#planBox form.editbox');
 await page.$eval('#planBox form.editbox [data-language="note"]',e=>{
  e.textContent='Ghi chú lưu tự động';
  e.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.$eval('#planBox .nhi-editor-close-v5',e=>e.click());
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('viko-plan-v1')));
 assert(Object.values(stored.note||{}).some(x=>x.v?.text==='Ghi chú lưu tự động'),'Closing editor discarded unsaved changes');
 // Long press a Korean expression to open its Vietnamese dictionary, without changing card.
 await page.$eval('#planBox .pfront',e=>e.click());
 await page.waitForSelector('#planBox .answer.ko');
 const word=await page.$eval('#planBox .answer.ko',e=>(e.textContent||'').trim());
 const target=await page.$('#planBox .answer.ko');
 const b=await target.boundingBox();assert(b&&b.width>10,'Korean lookup text not visible');
 const x=b.x+b.width/2,y=b.y+b.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await new Promise(r=>setTimeout(r,760));await page.mouse.up();
 await page.waitForFunction(()=>!!document.querySelector('.nhi-dictionary-dock iframe')?.src.includes('kovidict'),{timeout:5000});
 assert(await page.$eval('#planBox .pcard',e=>e.dataset.item)!==next,'Unexpected return to deleted card');
 // The end screen must use the exact GIF generated earlier, with a replay button.
 const last=lesson.items[0][0];
 await page.evaluate((id,lessonId)=>{
  localStorage.setItem('viko-plan-sess-v1',JSON.stringify({
   kind:'lesson',title:'Kiểm tra mèo tung tiền',lesson:lessonId,queue:[id],pos:1,
   picked:{},again:{},stats:{hard:0,mid:0},recorded:false,celebrated:false
  }));
 },last,lesson.id);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#planBox .nhi-victory-cat')?.complete,{timeout:16000});
 const cat=await page.evaluate(()=>({
  src:document.querySelector('#planBox .nhi-victory-cat')?.getAttribute('src'),
  size:document.querySelector('#planBox .nhi-victory-cat')?.naturalWidth,
  height:document.querySelector('#planBox .nhi-victory-cat')?.naturalHeight,
  text:document.querySelector('#planBox .sdone h2')?.textContent,
  replay:!![...document.querySelectorAll('#planBox .sdone button')].find(x=>x.textContent.includes('Học lại')),
  animation:getComputedStyle(document.querySelector('#planBox .nhi-victory-cat')).animationName
 }));
 assert(cat.src?.includes('nhi-cat-original-8frames-20261117.gif')&&cat.size===307&&cat.height===623,
  'The exact original 8-frame generated GIF was not loaded: '+JSON.stringify(cat));
 assert(cat.text==='Yeahhh đã học xong, Nhi sắp trở thành phú bà rồi ^^','Celebration caption incorrect');
 assert(cat.replay&&cat.animation==='none','Replay button missing or CSS distorts GIF: '+JSON.stringify(cat));
 const beforeReplay=await page.evaluate(id=>(JSON.parse(localStorage.getItem('viko-plan-v1')||'{}').done?.[id]?.v||[]).length,lesson.id);
 await page.evaluate(()=>[...document.querySelectorAll('#planBox .sdone button')].find(x=>x.textContent.includes('Học lại')).click());
 await page.waitForSelector('#planBox .pcard');
 const replay=await page.evaluate(id=>({
  firstCard:!!document.querySelector('#planBox .pcard'),
  rounds:(JSON.parse(localStorage.getItem('viko-plan-v1')||'{}').done?.[id]?.v||[]).length
 }),lesson.id);
 assert(replay.firstCard&&replay.rounds===beforeReplay,
  'Replay must not add a scheduled review round: '+JSON.stringify(replay));
 // Calendar: after studying, a lesson stays in Waiting until the actual due day.
 const calContext=await browser.createBrowserContext();
 try{
  const cal=await calContext.newPage();
  await cal.evaluateOnNewDocument((id)=>{
   sessionStorage.setItem('nlc-cover-seen','1');
   localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false}));
   if(!localStorage.getItem('viko-plan-v1')){
    const d=new Date(),today=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    localStorage.setItem('viko-plan-v1',JSON.stringify({done:{[id]:{v:[today],t:Date.now()}}}));
   }
  },lesson.id);
  async function homeCalendar(){
   await cal.goto('http://127.0.0.1:8765/#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
   // A hash-only navigation does not reload the app's in-memory progress.
   await cal.reload({waitUntil:'domcontentloaded'});
   await cal.waitForSelector('#planBox .ppage',{timeout:15000});
   await cal.$eval('#planBox .pback',e=>e.click());
   await cal.waitForSelector('#planBox .nhi-plan-waiting',{timeout:10000});
   return cal.evaluate(id=>({
    active:[...document.querySelectorAll('#planBox .nhi-plan-current .ptitle')].some(a=>a.getAttribute('href')?.endsWith(id)),
    waiting:[...document.querySelectorAll('#planBox .nhi-plan-waiting .ptitle')].some(a=>a.getAttribute('href')?.endsWith(id))
   }),lesson.id);
  }
  const early=await homeCalendar();
  assert(!early.active&&early.waiting,'Lesson appeared 3 days before due date');
  await cal.evaluate(id=>{
   const p=JSON.parse(localStorage.getItem('viko-plan-v1'));
   const d=new Date();d.setDate(d.getDate()-3);
   p.done[id]={v:[[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')],t:Date.now()};
   localStorage.setItem('viko-plan-v1',JSON.stringify(p));
  },lesson.id);
  const due=await homeCalendar();
  assert(due.active&&!due.waiting,'Lesson did not appear on actual review due date');

  // Regression for missed reviews 2, 3, 4 and 5. All four elapsed rounds
  // must be marked pending, not silently moved to "Đã học".
  await cal.evaluate(id=>{
   const p=JSON.parse(localStorage.getItem('viko-plan-v1'));
   const d=new Date();d.setDate(d.getDate()-200);
   const base=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
   p.done[id]={v:[base],t:Date.now()};
   localStorage.setItem('viko-plan-v1',JSON.stringify(p));
  },lesson.id);
  const overdue=await homeCalendar();
  assert(overdue.active&&!overdue.waiting,'Missed reviews must remain in Cần học');
  const missed=await cal.evaluate(id=>{
   const lessonLink=[...document.querySelectorAll('#planBox .nhi-plan-current .ptitle')].find(a=>a.getAttribute('href')==='#/bai/'+id);
   const card=lessonLink?.closest('.plesson');
   return {late:card?.querySelectorAll('.pchip.late').length,
     done:card?.querySelectorAll('.pchip.done').length,
     line:card?.querySelector('.pstatus')?.textContent||'',
     dates:card?[...card.querySelectorAll('.pchip.late b')].map(e=>e.textContent):[]};
  },lesson.id);
  assert(missed.late===4&&missed.done===1,'All 4 missed review rounds must be marked, got '+JSON.stringify(missed));
  assert(missed.line.includes('4 lượt cần học'),'Missing count of overdue review rounds');

  // Viewing lesson details without pressing Học ngay does not count study.
  await cal.$eval('#planBox .nhi-plan-current .ptitle[href="#/bai/'+lesson.id+'"]',e=>e.click());
  await cal.waitForSelector('#planBox .phero');
  const afterOpening=await cal.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).done?.[id]?.v.length,lesson.id);
  assert(afterOpening===1,'Opening lesson detail falsely marked it studied');
  // Starting and pausing an incomplete session must not complete any round.
  await cal.evaluate(()=>{const b=[...document.querySelectorAll('#planBox button')].find(b=>/^(Học |Tiếp tục)/.test(b.textContent.trim()));if(!b)throw Error('Review start button missing');b.click();});
  await cal.waitForSelector('#planBox .pcard',{timeout:12000});
  await cal.$eval('#topbar .nhi-study-topbar button:first-child',e=>e.click());
  const afterPause=await cal.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).done?.[id]?.v.length,lesson.id);
  assert(afterPause===1,'Paused unfinished review was incorrectly marked complete');

  // Existing completed rounds stay completed, but skipped later rounds do not.
  await cal.evaluate(id=>{
   const p=JSON.parse(localStorage.getItem('viko-plan-v1'));
   const dn=p.done[id].v.slice();dn.push(new Date().toISOString().slice(0,10));
   p.done[id]={v:dn,t:Date.now()};localStorage.setItem('viko-plan-v1',JSON.stringify(p));
   localStorage.removeItem('viko-plan-sess-v1');
  },lesson.id);
  const twoDone=await homeCalendar();
  assert(twoDone.active,'Later overdue rounds must remain in Cần học after an actual review');
  const missedAfterReview=await cal.evaluate(id=>{
   const link=[...document.querySelectorAll('#planBox .nhi-plan-current .ptitle')].find(a=>a.getAttribute('href')==='#/bai/'+id);
   const card=link?.closest('.plesson');return {done:card?.querySelectorAll('.pchip.done').length,late:card?.querySelectorAll('.pchip.late').length};
  },lesson.id);
  assert(missedAfterReview.done===2&&missedAfterReview.late===3,
   'Review progress should advance exactly one round: '+JSON.stringify(missedAfterReview));
 }finally{await calContext.close();}
 assert(errors.length===0,'Browser errors: '+errors.join('; '));
 console.log('SEVEN FIXES PASS',JSON.stringify({verifiedPairs:found.count,hardStayed:true,deletePersisted:true,autosave:true,dictionary:true,cat}));
}finally{await browser.close();}

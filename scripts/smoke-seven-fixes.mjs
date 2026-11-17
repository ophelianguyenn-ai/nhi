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
 // The end screen uses the SVG money cat, and displays the requested exact caption.
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
  text:document.querySelector('#planBox .sdone h2')?.textContent
 }));
 assert(cat.src?.includes('nhi-money-cat-20261117.svg')&&cat.size>0,'Money cat artwork not loaded');
 assert(cat.text==='Yeahhh đã học xong, Nhi sắp trở thành phú bà rồi ^^','Celebration caption incorrect');
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
  const diagnostic=await cal.evaluate(id=>({
   id,plan:JSON.parse(localStorage.getItem('viko-plan-v1')||'{}').done?.[id],
   date:new Date().toString(),
   activeTitles:[...document.querySelectorAll('#planBox .nhi-plan-current .ptitle')].slice(0,4).map(a=>[a.textContent,a.getAttribute('href')]),
   waitingTitles:[...document.querySelectorAll('#planBox .nhi-plan-waiting .ptitle')].slice(0,4).map(a=>[a.textContent,a.getAttribute('href')]),
   headings:[...document.querySelectorAll('#planBox .nhi-bucket-title')].map(e=>e.textContent),
   planText:document.querySelector('#planBox')?.textContent?.slice(0,250)
  }),lesson.id);
  console.log('CALENDAR_DIAGNOSTICS',JSON.stringify({early,due,diagnostic}));
  assert(due.active&&!due.waiting,'Lesson did not appear on actual review due date');
 }finally{await calContext.close();}
 assert(errors.length===0,'Browser errors: '+errors.join('; '));
 console.log('SEVEN FIXES PASS',JSON.stringify({verifiedPairs:found.count,hardStayed:true,deletePersisted:true,autosave:true,dictionary:true,cat}));
}finally{await browser.close();}

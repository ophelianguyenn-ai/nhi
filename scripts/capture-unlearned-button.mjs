import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const lessons=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons;
const lesson=lessons.find(l=>l.date==='2026-10-27')||lessons.find(l=>l.items?.length>=10);
if(!lesson)throw Error('No lesson available to show');
const output='/tmp/nhi-button-screenshot';
fs.mkdirSync(output,{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>console.error('PAGE_ERROR',String(e)));
 await page.setViewport({width:1365,height:920,deviceScaleFactor:1});
 await page.evaluateOnNewDocument((id,date)=>{
  sessionStorage.setItem('nlc-cover-seen','1');
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,haptic:false}));
  const store=JSON.parse(localStorage.getItem('viko-plan-v1')||'{}');
  store.done=store.done||{};
  store.done[id]={v:[date],t:Date.now()};
  localStorage.setItem('viko-plan-v1',JSON.stringify(store));
 },lesson.id,lesson.plan);
 await page.goto('http://127.0.0.1:8765/#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#planBox .ppage .nhi-review-stage-row .nhi-mark-unlearned',{timeout:25000});
 const context=await page.evaluate(()=>{
  const b=document.querySelector('#planBox .nhi-mark-unlearned');
  const row=b.closest('.nhi-review-stage-row');
  return {label:b.textContent.trim(),heading:document.querySelector('#planBox .nhi-v2-review-heading')?.textContent.trim(),
   status:row.querySelector('.pstatus')?.textContent.trim(),
   button:{x:b.getBoundingClientRect().x,y:b.getBoundingClientRect().y,
     w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}};
 });
 if(!context.label.includes('Chưa học bài này'))throw Error('Missing expected visible rollback button');
 console.log('BUTTON_LOCATION',JSON.stringify({lesson:lesson.id,...context}));
 await page.$eval('#planBox .nhi-mark-unlearned',el=>{
  el.style.outline='3px solid #e96f92';el.style.outlineOffset='5px';
  el.style.boxShadow='0 0 0 9px #ffcfde66';
 });
 const section=await page.$('#planBox .ppage>.quiz');
 if(!section)throw Error('Review section missing');
 await section.screenshot({path:output+'/chua-hoc-bai-nay-vi-tri-desktop.png'});
 await page.$eval('#planBox .nhi-review-stage-row',el=>el.scrollIntoView({block:'center'}));
 await page.screenshot({path:output+'/trang-bai-hoc-desktop.png'});
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.$eval('#planBox .nhi-review-stage-row',el=>el.scrollIntoView({block:'center'}));
 await page.screenshot({path:output+'/chua-hoc-bai-nay-mobile.png'});
 fs.writeFileSync(output+'/location.json',JSON.stringify({lesson:lesson.id,...context},null,2));
}finally{await browser.close();}

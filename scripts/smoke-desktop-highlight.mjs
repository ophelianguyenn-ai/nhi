/* Regression for real single-click paired highlights on desktop and touchscreen. */
import puppeteer from 'puppeteer-core';

// Two verified Vietnamese/Korean subpairs. Unmatched phrases in the
// general corpus are intentionally marked independently, without fabricating translations.
const ITEM='desktop-paired-highlight';
const LESSON='daily-2026-11-16-paired-highlight';
const fixture={id:LESSON,date:'2026-11-16',plan:'2026-11-16',title:'Kiểm tra tô màu song ngữ',
  items:[[ITEM,'w','Kiểm tra chức năng','Thủ tục thanh toán','결제 절차',1,
    [['Thủ tục','절차'],['thanh toán','결제']],'']],updatedAt:Date.now()};
const ROOT='http://127.0.0.1:8765/';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const isSelected=classes=>classes.split(/\s+/).includes('nhi-phrase-selected');
async function check(name,viewport){
 const context=await browser.createBrowserContext();
 try{
  const page=await context.newPage();
  await page.setViewport(viewport);
  page.on('pageerror',err=>console.error(name+' PAGE ERROR: '+err));
  // Restore a complete single-card lesson (same path as normal daily lessons).
  await page.evaluateOnNewDocument((id,item,lesson)=>{
   localStorage.setItem('viko-daily-lessons-v1',JSON.stringify({[id]:lesson}));
   localStorage.setItem('viko-plan-sess-v1',JSON.stringify({
    kind:'lesson',title:lesson.title,lesson:id,queue:[item],pos:0,
    picked:{},stats:{hard:0,mid:0}
   }));
   localStorage.setItem('viko-ko-meeting-ui-v1',JSON.stringify({mode:'cards',dir:'vk'}));
   sessionStorage.setItem('nlc-cover-seen','1');
  },LESSON,ITEM,fixture);
  await page.goto(ROOT+'#/bai/'+LESSON,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#planBox .pcard .pfront .prompt .ph.tap',{timeout:16000});
  const before=await page.evaluate(()=>{
   const el=document.querySelector('#planBox .pfront .prompt .ph.tap');
   const rect=el.getBoundingClientRect();
   return {text:el.textContent,index:el.dataset.hi,item:el.dataset.item,
     className:el.className,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
     target:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.className};
  });
  console.log(name+' BEFORE '+JSON.stringify(before));
  if(viewport.hasTouch){
   await page.touchscreen.tap(before.rect.x+before.rect.width/2,before.rect.y+before.rect.height/2);
  }else{
   await page.click('#planBox .pfront .prompt .ph.tap');
  }
  const front=await page.evaluate(index=>{
   const el=[...document.querySelectorAll('#planBox .pfront .prompt .ph.tap')]
     .find(x=>x.dataset.hi===index);
   return {className:el?.className||'',color:el?getComputedStyle(el).color:null,
     background:el?getComputedStyle(el).backgroundColor:null,
     decoration:el?getComputedStyle(el).textDecorationLine:null,
     flipped:!!document.querySelector('#planBox .pfront .answer.ko')};
  },before.index);
  console.log(name+' FRONT '+JSON.stringify(front));
  const firstColor=front.color;
  if(!isSelected(front.className)||!firstColor||front.background!=='rgba(0, 0, 0, 0)'||front.decoration!=='none'||front.flipped)
   throw Error(name+': Click did not recolor text cleanly without flipping');
  await page.$eval('#planBox .pfront',el=>el.click());
  await page.waitForSelector('#planBox .pfront .answer.ko',{timeout:10000});
  const back=await page.evaluate(index=>{
   const ko=[...document.querySelectorAll('#planBox .pfront .answer.ko .ph.tap')].find(x=>x.dataset.hi===index);
   const vi=[...document.querySelectorAll('#planBox .pfront .vi-under .ph.tap')].find(x=>x.dataset.hi===index);
   return {korean:ko?.className||'',vietnamese:vi?.className||'',
     koreanColor:ko?getComputedStyle(ko).color:null,
     vietnameseColor:vi?getComputedStyle(vi).color:null};
  },before.index);
  console.log(name+' BACK '+JSON.stringify(back));
  if(!isSelected(back.korean)||!isSelected(back.vietnamese)||
      back.koreanColor!==firstColor||back.vietnameseColor!==firstColor)
   throw Error(name+': Front and corresponding Korean/Vietnamese text colors do not match');
  console.log(name+' PAIRED HIGHLIGHT PASS');
 }finally{await context.close();}
}
try{
 await check('DESKTOP',{width:1280,height:800});
 await check('PHONE',{width:390,height:844,isMobile:true,hasTouch:true});
}finally{await browser.close();}

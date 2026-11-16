/* Regression for real single-click paired highlights on desktop and touchscreen. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const lesson=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons.find(l=>l.items?.length>=2);
if(!lesson)throw Error('A built-in lesson is required');
const ROOT='http://127.0.0.1:8765/';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const colorClass=names=>names.split(/\s+/).find(cls=>/^hl[1-4]$/.test(cls))||null;
async function check(name,viewport){
 const context=await browser.createBrowserContext();
 try{
  const page=await context.newPage();
  await page.setViewport(viewport);
  page.on('pageerror',err=>console.error(name+' PAGE ERROR: '+err));
  await page.goto(ROOT+'#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#planBox .ppage',{timeout:18000});
  await page.evaluate(()=>{
   const start=[...document.querySelectorAll('#planBox button')]
     .find(b=>/Học ngay|Học trước|Tiếp tục|Học lại|Ôn/.test(b.textContent||''));
   if(!start)throw Error('Lesson start button missing');
   start.click();
  });
  await page.waitForSelector('#planBox .pcard .pfront',{timeout:16000});
  let phrase=null;
  for(let i=0;i<40;i++){
   phrase=await page.$('#planBox .pfront .prompt .ph.tap');
   if(phrase)break;
   await page.$eval('#planBox .pnav .parrow:last-child',button=>button.click());
  }
  if(!phrase)throw Error(name+': No paired phrase on built-in cards');
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
   return {className:el?.className||'',color:el?getComputedStyle(el).backgroundColor:null,
     flipped:!!document.querySelector('#planBox .pfront .answer.ko')};
  },before.index);
  console.log(name+' FRONT '+JSON.stringify(front));
  const firstColor=colorClass(front.className);
  if(!firstColor || front.flipped)throw Error(name+': Click did not highlight front without flipping');
  await page.$eval('#planBox .pfront',el=>el.click());
  await page.waitForSelector('#planBox .pfront .answer.ko',{timeout:10000});
  const back=await page.evaluate(index=>{
   const ko=[...document.querySelectorAll('#planBox .pfront .answer.ko .ph.tap')].find(x=>x.dataset.hi===index);
   const vi=[...document.querySelectorAll('#planBox .pfront .vi-under .ph.tap')].find(x=>x.dataset.hi===index);
   return {korean:ko?.className||'',vietnamese:vi?.className||'',
     koreanColor:ko?getComputedStyle(ko).backgroundColor:null};
  },before.index);
  console.log(name+' BACK '+JSON.stringify(back));
  if(colorClass(back.korean)!==firstColor || colorClass(back.vietnamese)!==firstColor)
   throw Error(name+': Front and corresponding Korean/Vietnamese back phrases do not match');
  console.log(name+' PAIRED HIGHLIGHT PASS');
 }finally{await context.close();}
}
try{
 await check('DESKTOP',{width:1280,height:800});
 await check('PHONE',{width:390,height:844,isMobile:true,hasTouch:true});
}finally{await browser.close();}

/* Regression for original half-body Nhi and seven study-card changes in V8. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const lesson=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons.find(x=>(x.items||[]).length>=8);
if(!lesson)throw Error('No lesson for V8 test');
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox']});
const url='http://127.0.0.1:8765/';
const assert=(x,msg)=>{if(!x)throw Error(msg)};
const errors=[];
const observe=(p,tag)=>{p.on('pageerror',e=>errors.push(tag+': '+String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(tag+': '+m.text())});};
fs.mkdirSync('/tmp/nhi-v8-preview',{recursive:true});
try{
 const home=await browser.newPage();observe(home,'cover');
 await home.setViewport({width:1366,height:768});
 await home.goto(url+'?cover=1&v=20261115-halfbody-v8',{waitUntil:'domcontentloaded'});
 await home.waitForSelector('#coverHero img');
 const cover=await home.evaluate(()=>{
  const img=document.querySelector('#coverHero img');
  return {src:img.getAttribute('src'),w:img.naturalWidth,h:img.naturalHeight,
    animation:getComputedStyle(img).animationName,
    noBoy:!document.querySelector('#nhiLoveButton,#nhiThreeStage,#luongCharacter,#nhiPlaneLayer'),
    garden:!!document.querySelector('#cover .landscape'),
    button:document.getElementById('coverGo')?.textContent};
 });
 console.log('V8 HALF-BODY COVER',JSON.stringify(cover));
 assert(cover.src.includes('nhi-mascot.webp')&&cover.w>0&&cover.h>0,'Old half-body mascot not restored');
 assert(cover.animation==='nhi-v8-gentle-sway','Nhi must sway gently');
 assert(cover.noBoy&&cover.garden&&/Vào học/.test(cover.button),'No boy and original garden/study CTA required');
 await home.screenshot({path:'/tmp/nhi-v8-preview/half-body-desktop.png'});
 await home.close();

 const page=await browser.newPage();observe(page,'study');
 await page.setViewport({width:1440,height:1000});
 await page.evaluateOnNewDocument(()=>{sessionStorage.setItem('nlc-cover-seen','1');localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false}));});
 await page.goto(url+'#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#planBox .ppage',{timeout:20000});
 await page.evaluate(()=>{
  const b=[...document.querySelectorAll('#planBox button')].find(x=>/Học ngay|Học trước|Tiếp tục|Học lại|Ôn/.test(x.textContent||''));
  if(!b)throw Error('Study start button unavailable');b.click();
 });
 await page.waitForSelector('#planBox .pcard',{timeout:14000});
 const original=await page.evaluate(()=>{
  const el=document.querySelector('#planBox .pfront>.prompt');
  const first=el?.textContent.trim().match(/\p{L}/u)?.[0]||'';
  const style=el?getComputedStyle(el):null;
  return {front:!!el,text:el?.textContent.slice(0,90),first,center:style?.textAlign,font:style?.fontSize,move:el?.dataset.nhiMovable};
 });
 console.log('V8 FRONT INITIAL',JSON.stringify(original));
 assert(original.front&&original.first===original.first.toLocaleUpperCase('vi-VN'),'Vietnamese front first letter not uppercase');
 assert(original.center==='center'&&original.move==='vietnameseFront','Front text not centered or draggable');
 await page.click('#setBtn');
 for(const [k,v] of [['front','34'],['back','28'],['height','550']]){
  await page.waitForSelector('#nhiV8-'+k);
  await page.select('#nhiV8-'+k,v);
 }
 const prefs=await page.evaluate(()=>({values:window.NHI_CARD_LAYOUT_V8.get(),settings:JSON.parse(localStorage.getItem('nhi-card-layout-v8'))}));
 console.log('V8 SETTINGS',JSON.stringify(prefs));
 assert(prefs.values.front===34&&prefs.values.back===28&&prefs.values.height===550,'New settings did not persist');
 await page.click('#setSheet button[data-close]');
 const front=await page.evaluate(()=>{
  const text=document.querySelector('#planBox .pfront>.prompt');
  return {font:getComputedStyle(text).fontSize,height:document.querySelector('#planBox .pcard').getBoundingClientRect().height};
 });
 console.log('V8 FRONT SIZED',JSON.stringify(front));
 assert(front.font==='34px'&&front.height>=550&&front.height<=700,'Front font or user-selected card height failed');
 await page.keyboard.press('Enter');
 await page.waitForSelector('#planBox .pfront>.vi-under',{timeout:8000});
 await page.waitForFunction(()=>document.querySelector('#planBox .nhi-english-v5')?.dataset.frameResizable==='true',{timeout:8000});
 const back=await page.evaluate(()=>{
  const el=document.querySelector('#planBox .pfront>.vi-under');
  return {font:getComputedStyle(el).fontSize,movable:el.dataset.nhiMovable,
  editCount:document.querySelectorAll('#planBox .nhi-en-edit').length,
  english:!!document.querySelector('#planBox .nhi-english-v5'),
  height:document.querySelector('#planBox .pcard').getBoundingClientRect().height,
  speech:document.querySelector('#planBox .nhi-en-speak svg')?.getBoundingClientRect().width};
 });
 console.log('V8 BACK',JSON.stringify(back));
 assert(back.font==='28px'&&back.movable==='vietnamese','Separate back Vietnamese font or moving key missing');
 assert(back.editCount===0&&back.english&&back.height>=550&&back.height<=720,'English edit removal or card height failed');
 assert(back.speech<=23,'English speaker icon did not shrink');

 // Back Vietnamese only moves on a double tap and hold, never a single touch.
 const drag=await page.evaluate(()=>{
  const el=document.querySelector('#planBox .pfront>.vi-under'),r=el.getBoundingClientRect();
  const x=r.x+r.width/2,y=r.y+r.height/2;
  const fire=(type,id,xx,yy)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',button:0,clientX:xx,clientY:yy}));
  const prior=el.style.getPropertyValue('--nhi-move-x');
  fire('pointerdown',12,x,y);fire('pointermove',12,x+48,y);fire('pointerup',12,x+48,y);
  const afterOne=el.style.getPropertyValue('--nhi-move-x');
  fire('pointerdown',13,x,y);fire('pointermove',13,x+40,y);fire('pointerup',13,x+40,y);
  return {prior,afterOne,afterTwo:el.style.getPropertyValue('--nhi-move-x')};
 });
 console.log('V8 DOUBLE-TAP VI',JSON.stringify(drag));
 assert(drag.afterOne===drag.prior&&drag.afterTwo!=='0px'&&drag.afterTwo!==drag.afterOne,'Back Vietnamese should move only after second tap');

 // Editing IPA and English translation happens in the full card editor.
 await page.$eval('#planBox .cicons button[title*="Sửa thẻ"]',b=>b.click());
 await page.waitForSelector('#planBox .editbox input[name=ipa]',{timeout:8000});
 await page.$eval('#planBox .editbox input[name=ipa]',e=>{e.value='/vɪˈɛt/';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.$eval('#planBox .editbox button[type=submit]',b=>b.click());
 await page.waitForSelector('#planBox .pcard',{timeout:8000});
 const ipa=await page.evaluate(()=>{
  const card=document.querySelector('#planBox .pcard'),id=card.dataset.item;
  return {stored:JSON.parse(localStorage.getItem('nhi-english-edits-v5')||'{}')[id]?.ipa,
    inlineEdit:document.querySelectorAll('#planBox .nhi-en-edit').length};
 });
 console.log('V8 IPA SAVED',JSON.stringify(ipa));
 assert(ipa.stored==='vɪˈɛt'&&ipa.inlineEdit===0,'IPA edit not saved in card settings');

 await page.click('.nhi-thinking-button');
 await page.click('.nhi-thinking-button');
 const bubble=await page.evaluate(()=>{
  const el=document.querySelector('.nhi-forgot-bubble'),style=getComputedStyle(el);
  return {text:el.textContent,serif:style.fontFamily,visible:!el.hidden};
 });
 console.log('V8 THOUGHT BUBBLE',JSON.stringify(bubble));
 assert(bubble.text.includes('Đã nhớ tiếng Anh rồi')&&bubble.visible&&bubble.serif.includes('Times New Roman'),'English remembered bubble font/style missing');
 await page.screenshot({path:'/tmp/nhi-v8-preview/card-back-desktop.png'});
 await page.close();

 const phone=await browser.newPage();observe(phone,'phone');
 await phone.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await phone.goto(url+'?cover=1&v=20261115-halfbody-v8',{waitUntil:'domcontentloaded'});
 const p=await phone.evaluate(()=>{
  const img=document.querySelector('#coverHero .nhi-upper-girl-v8');
  return {image:!!img,box:img?.getBoundingClientRect().width,scroll:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 console.log('V8 PHONE',JSON.stringify(p));
 assert(p.image&&p.box>130&&p.scroll<=p.viewport+3,'Upper-body Nhi clipped on phone');
 await phone.screenshot({path:'/tmp/nhi-v8-preview/half-body-phone.png'});
 await phone.close();
 if(errors.length)throw Error('Browser JS errors: '+errors.join(' | '));
 console.log('HALF-BODY NHI + CARD CONTROLS V8: PASS');
}catch(err){
 console.error('HALF-BODY NHI + CARD CONTROLS V8: FAIL',err);process.exitCode=1;
}finally{await browser.close();}

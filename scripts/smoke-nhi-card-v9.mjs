/* V9 visual regression for live Nhi cover and card layout changes. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const lessons=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons;
const lesson=lessons.find(x=>(x.items||[]).length>=8);
if(!lesson)throw Error('Missing test lesson');
const browser=await puppeteer.launch({
 headless:true,
 executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox']
});
const base='http://127.0.0.1:8765/';
const fail=(ok,message)=>{if(!ok)throw Error(message);};
const problems=[];
fs.mkdirSync('/tmp/nhi-v9-preview',{recursive:true});
async function cover(page,theme,view,photo){
 page.on('pageerror',error=>problems.push(theme+'/'+view+': '+String(error)));
 await page.setViewport({width:view==='phone'?390:1366,height:view==='phone'?844:768,isMobile:view==='phone',hasTouch:view==='phone',deviceScaleFactor:1});
 await page.evaluateOnNewDocument(t=>{localStorage.setItem('nlc-prefs-v1',JSON.stringify({theme:t,fx:false}));},theme);
 await page.goto(base+'?cover=1&v=nhi-v9-preview',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#coverHero .nhi-upper-girl-v8',{timeout:10000});
 // Let the existing entrance animation finish before visual assertions/screenshots.
 await new Promise(resolve=>setTimeout(resolve,1050));
 const v=await page.evaluate(()=>{
  const image=document.querySelector('#coverHero .nhi-upper-girl-v8');
  const hero=document.querySelector('#coverHero');
  const em=document.querySelector('#cover h1 em');
  const sample=(element)=>getComputedStyle(element).color;
  return {
   src:image?.getAttribute('src'),imgWidth:image?.naturalWidth,
   width:hero.getBoundingClientRect().width,height:hero.getBoundingClientRect().height,
   animation:getComputedStyle(image).animationName,
   highlight:sample(em),
   titleShade:document.documentElement.dataset.nhiCoverTitle,
   theme:document.documentElement.dataset.theme,
   horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
   button:(()=>{
    const b=document.querySelector('#coverGo'),r=b.getBoundingClientRect(),css=getComputedStyle(b);
    return {text:b.textContent,display:css.display,visibility:css.visibility,
      opacity:css.opacity,background:css.backgroundColor,
      x:r.x,y:r.y,w:r.width,h:r.height,coverHeight:innerHeight,
      inViewport:r.bottom>0&&r.top<innerHeight};
   })()
  };
 });
 console.log('V9 COVER '+theme+'/'+view,JSON.stringify(v));
 fail(v.src?.includes('nhi-mascot.webp')&&v.imgWidth>0,'Must restore original Nhi, no Lương');
 fail(v.animation==='nhi-v8-gentle-sway','Sway should not stop');
 fail(v.width<=(view==='phone'?300:323)&&v.width>=180,'Nhi size must be only slightly smaller');
 const rgb=(v.highlight.match(/\d+\.?\d*/g)||[]).map(Number);
 fail(['blue','green','pink'].includes(v.titleShade)&&rgb.length>=3,
  'Cover headline must use a valid fixed blue, green or pink shade in '+theme+' theme');
 fail(v.horizontalOverflow<=3,'Cover overflows '+view);
 fail(v.button.inViewport&&Number(v.button.opacity)>.95,'Study CTA must be visible after cover animation');
 await page.screenshot({path:'/tmp/nhi-v9-preview/'+photo});
}
function center(rect){return rect.x+rect.width/2;}
try{
 const day=await browser.newPage();
 await cover(day,'light','desktop','cover-blue-day-desktop.png');
 await day.close();
 const night=await browser.newPage();
 await cover(night,'dark','phone','cover-blue-night-phone.png');
 await night.close();

 const page=await browser.newPage();
 page.on('pageerror',error=>problems.push('study: '+String(error)));
 await page.setViewport({width:1366,height:960});
 await page.evaluateOnNewDocument(()=>{
  sessionStorage.setItem('nlc-cover-seen','1');
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,theme:'light'}));
 });
 await page.goto(base+'#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#planBox .ppage',{timeout:15000});
 await page.evaluate(()=>{
  const b=[...document.querySelectorAll('#planBox button')].find(el=>/Học ngay|Học trước|Học lại|Tiếp tục|Ôn/.test(el.textContent||''));
  if(!b)throw Error('Study entry not found');b.click();
 });
 await page.waitForSelector('#planBox .pcard',{timeout:10000});
 const progress=await page.evaluate(()=>{
  const fill=document.querySelector('#topbar .nhi-study-topbar>.sbar>span');
  return {exists:!!fill,background:fill&&getComputedStyle(fill).backgroundColor};
 });
 console.log('V9 PROGRESS',JSON.stringify(progress));
 fail(progress.exists&&progress.background!=='rgba(0, 0, 0, 0)','Progress bar missing');
 await page.keyboard.press('Enter');
 await page.waitForSelector('#planBox .pfront>.vi-under',{timeout:10000});
 await page.waitForSelector('#planBox .nhi-english-v5',{timeout:10000});
 const v=await page.evaluate(()=>{
  const root=document.querySelector('#planBox .pfront');
  const english=root.querySelector('.nhi-english-v5');
  const ko=root.querySelector('.answer.ko');
  const vi=root.querySelector('.vi-under');
  const han=root.querySelector('.nhi-hanja-lookup,.hanja');
  const main=root.querySelector('.nhi-en-translation');
  const hard=document.querySelector('#planBox .prate .hard');
  const rect=e=>e?({x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width}):null;
  return {
   frame:rect(english),ko:rect(ko),vi:rect(vi),han:rect(han),
   centerNames:['ko','vi','han'],
   cssKo:getComputedStyle(ko).textAlign,
   cssVi:getComputedStyle(vi).textAlign,
   cssEnglish:getComputedStyle(main).textAlign,
   hard:getComputedStyle(hard).backgroundColor,
   stageWidth:root.getBoundingClientRect().width,
   hasImage:root.classList.contains('nhi-with-image')
  };
 });
 console.log('V9 CENTERING AND PASTEL',JSON.stringify(v));
 fail(!!v.frame&&!!v.ko&&!!v.vi,'Back-side content missing');
 const sameCenter=(rect)=>Math.abs(center(rect)-center(v.frame))<=8;
 fail(sameCenter(v.ko)&&sameCenter(v.vi)&&(!v.han||sameCenter(v.han)),
  'Korean, Vietnamese and Hán–Việt must align with English frame center');
 fail(v.cssKo==='center'&&v.cssVi==='center'&&v.cssEnglish==='left',
  'Vietnamese/Korean stay centered; V10 English text is left-aligned inside its centered box');
 const hard=(v.hard.match(/\d+\.?\d*/g)||[]).map(Number);
 fail(hard.length>=3&&hard[2]>hard[1]&&hard[1]>hard[0],
  'Khó background must be soft blue, not mint green');
 await page.screenshot({path:'/tmp/nhi-v9-preview/card-back-desktop.png'});

 const review=await page.$('#planBox .nhi-en-review');
 fail(!!review,'English comparison control missing');
 await page.$eval('#planBox .nhi-en-review',e=>e.click());
 const expanded=await page.$eval('#planBox .nhi-english-v5',e=>({
  expanded:e.classList.contains('nhi-compare-expanded'),
  button:e.querySelector('.nhi-en-review').textContent,
  hidden:e.querySelector('.nhi-en-review').hidden,
  hasCollapse:[...e.querySelectorAll('button')].some(b=>!b.hidden&&b.textContent.includes('Thu gọn'))
 }));
 console.log('V9 COMPARISON',JSON.stringify(expanded));
 fail(expanded.expanded&&expanded.hidden&&!expanded.hasCollapse,
  'Comparison should open without rendering Thu gọn');

 await page.$eval('#planBox .cicons button[title*="Sửa thẻ"]',b=>b.click());
 await page.waitForSelector('#planBox .editbox textarea[name=pairs]',{timeout:8000});
 const pair=await page.evaluate(()=>{
  const el=document.querySelector('#planBox .editbox textarea[name=pairs]');
  const original={width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,body:el.value.slice(0,100)};
  el.value='Xin chào | 안녕하세요';
  el.dispatchEvent(new Event('input',{bubbles:true}));
  const resized={width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
    widthVar:el.style.getPropertyValue('--nhi-pairs-width'),
    heightVar:el.style.getPropertyValue('--nhi-pairs-height')};
  const legend=document.querySelector('#planBox .editbox .hanja-editor legend');
  return {original,resized,legendTop:legend?getComputedStyle(legend).top:null};
 });
 console.log('V9 PAIRS EDITOR',JSON.stringify(pair));
 fail(pair.resized.width>=174&&pair.resized.width<340,
  'Pair textarea must fit one short line, not remain at old width');
 fail(pair.resized.height>=52&&pair.resized.height<100,'Pair textarea height should fit 1-2 rows');
 fail(!!pair.resized.widthVar&&!!pair.resized.heightVar,'Content sizing not applied');
 if(pair.legendTop!==null)fail(pair.legendTop==='-11px',
  'Hán–Việt label must move up by four pixels');

 // Check the actual phone editing layout without touching the stored lesson.
 const phoneContext=await browser.createBrowserContext();
 const phone=await phoneContext.newPage();
 phone.on('pageerror',error=>problems.push('mobile study: '+String(error)));
 await phone.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await phone.evaluateOnNewDocument(()=>{
  sessionStorage.setItem('nlc-cover-seen','1');
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,theme:'light'}));
 });
 await phone.goto(base+'#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
 await phone.waitForSelector('#planBox .ppage',{timeout:15000});
 await phone.evaluate(()=>{
  const b=[...document.querySelectorAll('#planBox button')].find(el=>/Học ngay|Học trước|Học lại|Tiếp tục|Ôn/.test(el.textContent||''));
  if(!b)throw Error('Mobile study entry unavailable');b.click();
 });
 await phone.waitForSelector('#planBox .pcard');
 await phone.keyboard.press('Enter');
 await phone.waitForSelector('#planBox .vi-under');
 const mobile=await phone.evaluate(()=>{
  const box=document.querySelector('#planBox .nhi-english-v5')?.getBoundingClientRect();
  const el=document.querySelector('#planBox .vi-under')?.getBoundingClientRect();
  return {width:innerWidth,scroll:document.documentElement.scrollWidth,english:box&&{x:box.x,width:box.width},
    vi:el&&{x:el.x,width:el.width}};
 });
 console.log('V9 MOBILE CENTER',JSON.stringify(mobile));
 fail(mobile.scroll<=mobile.width+3,'Phone should not scroll horizontally');
 fail(mobile.english&&mobile.vi&&Math.abs(center(mobile.english)-center(mobile.vi))<=8,
  'Vietnamese meaning must stay centered with English box on phone');
 await phone.$eval('#planBox .cicons button[title*="Sửa thẻ"]',b=>b.click());
 await phone.waitForSelector('#planBox textarea[name=pairs]');
 const pairPhone=await phone.$eval('#planBox textarea[name=pairs]',e=>({
  width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,
  viewport:innerWidth,parentWidth:e.parentElement.getBoundingClientRect().width
 }));
 console.log('V9 PAIRS PHONE',JSON.stringify(pairPhone));
 fail(pairPhone.width<=pairPhone.parentWidth+1&&pairPhone.right<=pairPhone.viewport+1,
  'Pair editor is clipped on phone');
 await phone.screenshot({path:'/tmp/nhi-v9-preview/card-editor-phone.png'});
 await phone.close();
 await phoneContext.close();
 await page.close();

 if(problems.length)throw Error('Browser JS errors: '+problems.join(' | '));
 console.log('NHI V9 BLUE COVER + CENTERED CARDS: PASS');
}catch(error){
 console.error('NHI V9 BLUE COVER + CENTERED CARDS: FAIL',error);
 process.exitCode=1;
}finally{
 await browser.close();
}
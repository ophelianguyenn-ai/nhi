/* Exact approved demo-character pixels — cover V5.2 browser smoke. */
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({
  headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox']
});
const url='http://127.0.0.1:8765/?cover=1&v=demo-v52';
const errors=[],assert=(ok,why)=>{if(!ok)throw Error(why)};
const listen=(p,tag)=>{
 p.on('pageerror',e=>errors.push(tag+': '+String(e)));
 p.on('console',m=>{if(m.type()==='error')errors.push(tag+': '+m.text())});
};
try{
 const page=await browser.newPage();listen(page,'desktop');
 await page.setViewport({width:1366,height:768});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.NHI_COVER_V52?.getState().ready,{timeout:20000});
 const initial=await page.evaluate(()=>{
  const state=window.NHI_COVER_V52.getState(),
   girl=document.getElementById('nhiCharacter'),
   boy=document.getElementById('luongCharacter'),
   girlAsset=girl?.querySelector('img');
  return {...state,
   girlAsset:girlAsset?.currentSrc,
   girlImageSize:[girlAsset?.naturalWidth,girlAsset?.naturalHeight],
   boyLayers:boy?.querySelectorAll('img').length,
   boyVisible:getComputedStyle(boy).opacity,
   boyAssetClasses:[...boy.querySelectorAll('img')].map(i=>i.className),
   girlSway:getComputedStyle(girl).animationName,
   go:document.getElementById('coverGo')?.textContent,
   clipButton:document.getElementById('nhiHairClipPlane')?.tagName
  };
 });
 console.log('DEMO V5.2 INITIAL',JSON.stringify(initial));
 assert(initial.ready&&initial.state==='NHI_IDLE'&&initial.timeMs===6000,'6s story not initialized');
 assert(initial.girlImageSize[0]===445&&initial.girlImageSize[1]===774,'Nhi does not use original demo pixels');
 assert(initial.boyLayers===4&&initial.boyVisible==='0','Lương layered source not ready or visible before click');
 assert(initial.boyAssetClasses.some(x=>x.includes('nhi-boy-head'))&&initial.boyAssetClasses.some(x=>x.includes('nhi-boy-leg-left')),'Rigged demo layers missing');
 assert(initial.clipButton==='BUTTON'&&/Vào học/.test(initial.go),'Hairclip and existing learning controls must remain');
 assert(initial.girlSway!=='none','Nhi must gently sway before kiss');
 const proportions=await page.evaluate(()=>{
  const girl=document.getElementById('nhiCharacter'),boy=document.getElementById('luongCharacter'),
   g=girl.getBoundingClientRect(),b=boy.getBoundingClientRect();
  return {nhi:g.width/g.height,luong:b.width/b.height,girlLeft:girl.offsetLeft,boyLeft:boy.offsetLeft};
 });
 console.log('DEMO V5.2 PROPORTIONS',JSON.stringify(proportions));
 assert(Math.abs(proportions.nhi-445/774)<.01,'Nhi is distorted versus the demo');
 assert(Math.abs(proportions.luong-287/807)<.01,'Lương is distorted versus the demo');
 await page.click('#nhiLoveButton');
 await page.waitForFunction(()=>window.NHI_COVER_V52.getState().phase==='walk',{timeout:2300});
 const moving=await page.evaluate(()=>{
  const leg=document.querySelector('#luongCharacter .nhi-boy-leg-left');
  return {phase:window.NHI_COVER_V52.getState().phase,
   animation:getComputedStyle(leg).animationName};
 });
 assert(moving.phase==='walk'&&moving.animation.includes('nhi-demo-leg-left'),'Lương legs do not walk independently');
 await page.evaluate(()=>window.NHI_COVER_V52.playAirplane());
 assert((await page.evaluate(()=>window.NHI_COVER_V52.getState())).airplaneRunning,'Independent airplane missing');
 assert((await page.$eval('#nhiLoveBanner text',el=>el.textContent))==='Lương ❤️ Nhi','Flight banner must say Lương ❤️ Nhi');
 await page.waitForFunction(()=>window.NHI_COVER_V52.getState().phase==='kiss',{timeout:5700});
 const kiss=await page.evaluate(()=>{
  const head=document.querySelector('#luongCharacter .nhi-boy-head');
  return {phase:window.NHI_COVER_V52.getState().phase,transform:getComputedStyle(head).transform};
 });
 console.log('DEMO V5.2 KISS',JSON.stringify(kiss));
 assert(kiss.phase==='kiss'&&kiss.transform!=='none','Lương does not turn his head for kiss');
 await page.waitForFunction(()=>window.NHI_COVER_V52.getState().state==='COUPLE_IDLE',{timeout:2600});
 const together=await page.evaluate(()=>{
  const girl=document.getElementById('nhiCharacter'),
   boy=document.getElementById('luongCharacter'),
   head=boy.querySelector('.nhi-boy-head');
  return {...window.NHI_COVER_V52.getState(),
   girlSway:getComputedStyle(girl).animationName,
   headSway:getComputedStyle(head).animationName,
   boyOpacity:getComputedStyle(boy).opacity,
   replay:document.getElementById('nhiLoveButton').textContent,
   coupleHeart:!document.getElementById('nhiCoupleHeartV51').hidden
  };
 });
 console.log('DEMO V5.2 TOGETHER',JSON.stringify(together));
 assert(together.state==='COUPLE_IDLE'&&Number(together.boyOpacity)>.95,'Boy must stay with Nhi after kiss');
 assert(together.headSway.includes('nhi-demo-head-together')&&together.girlSway.includes('nhi-demo-girl-couple'),'Couple idle movement missing');
 assert(together.coupleHeart&&/Xem lại/.test(together.replay),'Couple heart or replay missing');
 await page.click('#nhiHairClipPlane');
 assert((await page.evaluate(()=>window.NHI_COVER_V52.getState())).state==='COUPLE_IDLE','Clicking hairclip reset romantic scene');
 await page.click('#nhiCoupleHeartV51');
 await page.evaluate(()=>document.getElementById('nhiBouquetLoveV51').click());
 await page.click('#nhiLoveButton');
 assert((await page.evaluate(()=>window.NHI_COVER_V52.getState())).state==='PLAYING','Replay cannot start');
 await page.evaluate(()=>document.getElementById('coverGo').click());
 await page.waitForFunction(()=>window.NHI_COVER_V52.getState().state==='NHI_IDLE',{timeout:3000});
 await page.close();
 const phone=await browser.newPage();listen(phone,'phone');
 await phone.setViewport({width:375,height:667,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await phone.goto(url,{waitUntil:'domcontentloaded'});
 await phone.waitForFunction(()=>window.NHI_COVER_V52?.getState().ready,{timeout:20000});
 const screen=await phone.evaluate(()=>{
  const g=document.getElementById('nhiCharacter').getBoundingClientRect(),
   b=document.getElementById('luongCharacter').getBoundingClientRect(),
   clip=document.getElementById('nhiHairClipPlane').getBoundingClientRect();
  return {girlWidth:g.width,clipWidth:clip.width,clipHeight:clip.height,viewport:innerWidth,rootScroll:document.documentElement.scrollWidth,
  stageHeight:document.getElementById('nhiCoupleStage').getBoundingClientRect().height,boyWidth:document.getElementById('luongCharacter').offsetWidth};
 });
 console.log('DEMO V5.2 MOBILE',JSON.stringify(screen));
 assert(screen.girlWidth>90&&screen.boyWidth>55&&screen.clipWidth>=44&&screen.clipHeight>=44,'Mobile character visibility or hairclip target failed');
 assert(screen.rootScroll<=screen.viewport+3,'Mobile body horizontal overflow');
 await phone.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await phone.click('#nhiLoveButton');
 assert((await phone.evaluate(()=>window.NHI_COVER_V52.getState())).state==='COUPLE_IDLE','Reduced motion must keep the couple together');
 await phone.close();
 if(errors.length)throw Error('Browser exceptions: '+errors.join(' | '));
 console.log('Exact demo pixel V5.2 smoke: PASS');
}catch(e){
 console.error('Exact demo pixel V5.2 smoke: FAIL',e);
 process.exitCode=1;
}finally{await browser.close();}

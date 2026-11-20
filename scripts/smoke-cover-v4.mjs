/* Browser regression: play nine frames from original GIF once, hold frame nine. */
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox']});
const url='http://127.0.0.1:8765/?cover=1&v=original-gif-v4';
const errors=[],assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const watch=(page,label)=>{
 page.on('pageerror',e=>errors.push(label+': '+e));
 page.on('console',m=>{if(m.type()==='error')errors.push(label+': '+m.text())});
};
try{
 const page=await browser.newPage();watch(page,'desktop');
 await page.setViewport({width:1366,height:768});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.NHI_COVER_GIF_V4?.getState().ready,{timeout:20000});
 let init=await page.evaluate(()=>{
  const a=window.NHI_COVER_GIF_V4.getState();
  return {...a,visible:document.querySelectorAll('#nhiGifStage .is-current').length,
    images:[...document.querySelectorAll('#nhiGifStage img')].map(e=>({width:e.naturalWidth,height:e.naturalHeight,src:e.currentSrc}))};
 });
 console.log('ORIGINAL GIF INITIAL',JSON.stringify({state:init.state,frame:init.frame,count:init.images.length,first:init.images[0]?.src}));
 assert(init.ready&&init.state==='IDLE'&&init.frame===0&&init.visible===1&&init.images.length===9,'Expected static original frame 1');
 assert(init.images.every((i,n)=>i.width===476&&i.height===358&&i.src.includes('frame-'+String(n).padStart(2,'0')+'.webp')),'Missing GIF extracted frames');
 await page.click('#nhiLoveButton');
 await page.waitForFunction(()=>window.NHI_COVER_GIF_V4.getState().frame>=2,{timeout:1500});
 assert((await page.evaluate(()=>window.NHI_COVER_GIF_V4.getState())).state==='PLAYING','Animation should play once after click');
 await page.evaluate(()=>window.NHI_COVER_GIF_V4.playAirplane());
 assert((await page.evaluate(()=>window.NHI_COVER_GIF_V4.getState())).airplaneRunning,'Independent airplane did not launch');
 assert((await page.$eval('#nhiLoveBanner text',e=>e.textContent))==='Lương ❤️ Nhi','Banner name changed');
 await page.waitForFunction(()=>window.NHI_COVER_GIF_V4.getState().state==='TOGETHER',{timeout:3000});
 await new Promise(resolve=>setTimeout(resolve,500));
 const final=await page.evaluate(()=>({
  ...window.NHI_COVER_GIF_V4.getState(),
  current:[...document.querySelectorAll('#nhiGifStage img')].findIndex(e=>e.classList.contains('is-current')),
  button:document.querySelector('#nhiLoveButton').textContent,
  go:document.getElementById('coverGo')?.textContent,
  originalDrawn:!!document.querySelector('#nhiCoupleStage')
 }));
 console.log('ORIGINAL GIF FINAL',JSON.stringify(final));
 assert(final.state==='TOGETHER'&&final.frame===8&&final.current===8,'Frame 9 was not held after kiss');
 assert(final.button.includes('Xem lại')&&/Vào học/.test(final.go)&&!final.originalDrawn,'Old rig still active or replay absent');
 await page.click('#nhiHairClipPlane');
 assert((await page.evaluate(()=>window.NHI_COVER_GIF_V4.getState())).state==='TOGETHER','Hairclip reset final GIF frame');
 await page.click('#nhiLoveButton');
 await page.waitForFunction(()=>window.NHI_COVER_GIF_V4.getState().state==='TOGETHER',{timeout:3000});
 await page.$eval('#coverGo',e=>e.click());
 await page.waitForFunction(()=>window.NHI_COVER_GIF_V4.getState().state==='IDLE',{timeout:3000});
 await page.close();
 const mobile=await browser.newPage();watch(mobile,'mobile');
 await mobile.setViewport({width:375,height:667,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await mobile.goto(url,{waitUntil:'domcontentloaded'});
 await mobile.waitForFunction(()=>window.NHI_COVER_GIF_V4?.getState().ready,{timeout:20000});
 const bounds=await mobile.evaluate(()=>{
  const hero=document.getElementById('coverHero').getBoundingClientRect(),
        clip=document.getElementById('nhiHairClipPlane').getBoundingClientRect(),
        button=document.getElementById('nhiLoveButton').getBoundingClientRect(),
        go=document.getElementById('coverGo').getBoundingClientRect();
  return {heroWidth:hero.width,heroHeight:hero.height,clipWidth:clip.width,clipHeight:clip.height,goBottom:go.bottom,
    buttonHeight:button.height,viewportWidth:innerWidth,rootScroll:document.documentElement.scrollWidth};
 });
 console.log('ORIGINAL GIF MOBILE',JSON.stringify(bounds));
 assert(bounds.heroWidth>=270&&bounds.clipWidth>=44&&bounds.clipHeight>=44&&bounds.buttonHeight>=40,'Responsive controls undersized');
 assert(bounds.rootScroll<=bounds.viewportWidth+2,'Unexpected horizontal scrolling');
 await mobile.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await mobile.click('#nhiLoveButton');
 assert((await mobile.evaluate(()=>window.NHI_COVER_GIF_V4.getState())).state==='TOGETHER','Reduced motion should hold last frame');
 await mobile.close();
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log('Original GIF 9-frame cover V4 smoke: PASS');
}catch(e){
 console.error('Original GIF 9-frame cover V4 smoke: FAIL',e);
 process.exitCode=1;
}finally{
 await browser.close();
}
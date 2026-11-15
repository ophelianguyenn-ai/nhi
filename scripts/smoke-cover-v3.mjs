/* Browser smoke test for independent romance + airplane cover V3. */
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox']});
const ROOT='http://127.0.0.1:8765/?cover=1';
const problems=[];
const expect=(condition,message)=>{if(!condition)throw Error(message)};
function attach(page,label){
 page.on('pageerror',e=>problems.push(label+': '+String(e)));
 page.on('console',msg=>{if(msg.type()==='error')problems.push(label+': '+msg.text())});
}
try{
 const page=await browser.newPage();attach(page,'desktop');
 await page.setViewport({width:1366,height:768});
 await page.goto(ROOT,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.NHI_COVER_V3?.getState().ready,{timeout:20000});
 const initial=await page.evaluate(()=>({
  state:window.NHI_COVER_V3.getState(),
  girl:!!document.querySelector('#nhiCharacter .nhi-rig-head'),
  hair:!!document.querySelector('#nhiCharacter .nhi-rig-hair-front'),
  boyLegs:document.querySelectorAll('#luongCharacter .nhi-boy-leg').length,
  go:!!document.getElementById('coverGo'),
  clip:!!document.getElementById('nhiHairClipPlane'),
  hero:document.getElementById('coverHero')?.getBoundingClientRect().width
 }));
 console.log('COVER INITIAL',JSON.stringify(initial));
 expect(initial.state.romance==='IDLE'&&initial.girl&&initial.hair&&initial.boyLegs>=2&&initial.clip&&initial.go&&initial.hero>200,'Cover rig or idle state missing');
 await page.click('#nhiLoveButton');
 await page.waitForFunction(()=>window.NHI_COVER_V3.getState().romance==='WALK_IN',{timeout:2000});
 await page.evaluate(()=>window.NHI_COVER_V3.playAirplane());
 expect((await page.evaluate(()=>window.NHI_COVER_V3.getState())).airplaneRunning,'Airplane did not start during walking');
 expect((await page.$eval('#nhiLoveBanner text',el=>el.textContent))==='Lương ❤️ Nhi','Banner copy is incorrect');
 await page.waitForFunction(()=>window.NHI_COVER_V3.getState().romance==='TOGETHER',{timeout:11000});
 const together=await page.evaluate(()=>({
  state:window.NHI_COVER_V3.getState().romance,
  boyVisible:Number(getComputedStyle(document.getElementById('luongCharacter')).opacity),
  button:document.getElementById('nhiLoveButton').textContent,
  girlHead:!!document.querySelector('.nhi-v3-girl-svg .nhi-rig-head'),
  preserved:document.getElementById('coverGo').textContent
 }));
 console.log('COVER TOGETHER',JSON.stringify(together));
 expect(together.state==='TOGETHER'&&together.boyVisible>.98&&/Xem lại/.test(together.button)&&/Vào học/.test(together.preserved),'Couple did not stay together');
 await page.evaluate(()=>document.getElementById('nhiHairClipPlane').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
 expect((await page.evaluate(()=>window.NHI_COVER_V3.getState())).romance==='TOGETHER','Hairclip reset couple');
 await page.evaluate(()=>document.getElementById('nhiLoveButton').click());
 expect((await page.evaluate(()=>window.NHI_COVER_V3.getState())).romance==='WALK_IN','Replay did not restart');
 await page.evaluate(()=>document.getElementById('coverGo').click());
 await page.waitForFunction(()=>window.NHI_COVER_V3.getState().romance==='IDLE',{timeout:3000});
 await page.close();
 // Mobile: cover must not overflow x and controls must remain reachable.
 const mobile=await browser.newPage();attach(mobile,'mobile');
 await mobile.setViewport({width:375,height:667,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await mobile.goto(ROOT,{waitUntil:'domcontentloaded'});
 await mobile.waitForFunction(()=>window.NHI_COVER_V3?.getState().ready,{timeout:20000});
 const measures=await mobile.evaluate(()=>{
  const go=document.getElementById('coverGo'),clip=document.getElementById('nhiHairClipPlane');
  const r=go.getBoundingClientRect(),h=document.getElementById('coverHero').getBoundingClientRect();
  return {heroWidth:h.width,goWidth:r.width,goTop:r.top,goBottom:r.bottom,clipBox:clip.getBoundingClientRect().width,screen:innerWidth,rootScroll:document.documentElement.scrollWidth,coverClip:getComputedStyle(document.getElementById('cover')).overflowX};
 });
 console.log('COVER MOBILE',JSON.stringify(measures));
 expect(measures.heroWidth>200&&measures.goWidth>80&&measures.clipBox>25&&measures.goBottom<=667&&measures.coverClip==='hidden'&&measures.rootScroll<=measures.screen+3,'Mobile cover clip/overflow issue');
 await mobile.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await mobile.evaluate(()=>document.getElementById('nhiLoveButton').click());
 expect((await mobile.evaluate(()=>window.NHI_COVER_V3.getState())).romance==='TOGETHER','Reduced-motion ending missing');
 await mobile.close();
 if(problems.length)throw Error('Cover browser exceptions: '+problems.join(' | '));
 console.log('Cover V3 smoke: PASS');
}catch(error){
 console.error('Cover V3 smoke: FAIL',error);
 process.exitCode=1;
}finally{
 await browser.close();
}
/* Browser smoke for REAL three-dimensional cover V6, not an image cutout. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser=await puppeteer.launch({
  headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
    '--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader',
    '--use-gl=angle','--use-angle=swiftshader']
});
const url='http://127.0.0.1:8765/?cover=1&v=real-webgl-3d-v6';
const errors=[],assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const watch=(page,label)=>{
 page.on('pageerror',e=>errors.push(label+': '+e));
 page.on('console',m=>{if(m.type()==='error')errors.push(label+': '+m.text())});
};
fs.mkdirSync('/tmp/nhi-3d-preview',{recursive:true});
try {
 const page=await browser.newPage();watch(page,'desktop');
 await page.setViewport({width:1366,height:768,deviceScaleFactor:2});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.NHI_COVER_3D_V6?.getState().ready,{timeout:25000});
 const initial=await page.evaluate(()=>{
  const s=window.NHI_COVER_3D_V6.getState();
  const canv=document.getElementById('nhiThreeCanvas');
  const ctx=canv.getContext('webgl2')||canv.getContext('webgl');
  const hairclip=document.getElementById('nhiHairClipPlane');
  return {...s,
   gl:!!ctx,
   canvas:[canv.width,canv.height],
   loveButton:document.getElementById('nhiLoveButton').textContent,
   goButton:document.getElementById('coverGo')?.textContent,
   hairclipWidth:hairclip.getBoundingClientRect().width,
   bouquetButton:!!document.getElementById('nhiBouquetLoveV6')};
 });
 console.log('TRUE THREE-D COVER INITIAL',JSON.stringify(initial));
 assert(initial.ready&&initial.state==='NHI_IDLE'&&initial.gl&&initial.actualMesh3D,'Must render actual WebGL meshes in idle, not PNG images');
 assert(initial.luongVisible===false,'Lương should not be visible before love button');
 assert(initial.storyDurationMs===6000,'6-second love story timing must be exact');
 assert(initial.hairclipWidth>=44&&initial.bouquetButton&&/Vào học/.test(initial.goButton),'Hairclip, flowers or original study CTA missing');
 assert(initial.canvas[0]>200&&initial.canvas[1]>150,'3D drawing buffer not sized');
 await page.screenshot({path:'/tmp/nhi-3d-preview/nhi-3d-before-desktop.png'});
 await page.click('#nhiLoveButton');
 await page.waitForFunction(()=>window.NHI_COVER_3D_V6?.getState().phase==='walk',{timeout:2000});
 const walk=await page.evaluate(()=>window.NHI_COVER_3D_V6.getState());
 console.log('TRUE THREE-D WALK',JSON.stringify(walk));
 assert(walk.luongVisible&&walk.luongBodyYaw<-.55,'Lương must face left toward Nhi while walking, not toward the viewer');
 await page.waitForFunction(()=>{const s=window.NHI_COVER_3D_V6?.getState();return s?.phase==='kiss'&&s.elapsedMs>=4570;},{timeout:5300});
 const kiss=await page.evaluate(()=>window.NHI_COVER_3D_V6.getState());
 console.log('TRUE THREE-D KISS',JSON.stringify(kiss));
 assert(kiss.luongHeadYaw<-.25&&kiss.luongBodyYaw<-.65,'Lương needs to turn face toward Nhi in a visible 3/4 angle for cheek kiss');
 await page.screenshot({path:'/tmp/nhi-3d-preview/nhi-3d-kiss-desktop.png'});
 assert((await page.evaluate(()=>window.NHI_COVER_3D_V6.playAirplane()))===true,'Independent airplane not working');
 assert((await page.$eval('#nhiLoveBanner text',e=>e.textContent))==='Lương ❤️ Nhi','Banner text must remain exact');
 await page.waitForFunction(()=>window.NHI_COVER_3D_V6?.getState().state==='COUPLE_IDLE',{timeout:3500});
 const together=await page.evaluate(()=>({
  ...window.NHI_COVER_3D_V6.getState(),
  heartShown:!document.getElementById('nhiCoupleHeartV6').hidden,
  replayText:document.getElementById('nhiLoveButton').textContent
 }));
 console.log('TRUE THREE-D TOGETHER',JSON.stringify(together));
 assert(together.state==='COUPLE_IDLE'&&together.luongVisible&&together.phase==='couple','Lương must remain beside Nhi after kiss');
 assert(together.luongArmPose==='both-at-sides','Both Lương hands must hang relaxed at his sides');
 assert(together.heartShown&&/Xem lại/.test(together.replayText),'Replay or couple heart missing');
 await page.screenshot({path:'/tmp/nhi-3d-preview/nhi-3d-together-desktop.png'});
 await page.click('#nhiHairClipPlane');
 assert((await page.evaluate(()=>window.NHI_COVER_3D_V6.getState())).state==='COUPLE_IDLE','Hairclip must not reset Lương');
 await page.click('#nhiCoupleHeartV6');
 await page.click('#nhiBouquetLoveV6');
 await page.click('#nhiLoveButton');
 assert((await page.evaluate(()=>window.NHI_COVER_3D_V6.getState())).state==='PLAYING','Replay must restart');
 await page.$eval('#coverGo',el=>el.click());
 await page.waitForFunction(()=>window.NHI_COVER_3D_V6.getState().state==='NHI_IDLE',{timeout:3500});
 await page.close();

 const phone=await browser.newPage();watch(phone,'phone');
 await phone.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await phone.goto(url,{waitUntil:'domcontentloaded'});
 await phone.waitForFunction(()=>window.NHI_COVER_3D_V6?.getState().ready,{timeout:25000});
 const mobile=await phone.evaluate(()=>{
  const hero=document.getElementById('coverHero').getBoundingClientRect();
  const love=document.getElementById('nhiLoveButton').getBoundingClientRect();
  const clip=document.getElementById('nhiHairClipPlane').getBoundingClientRect();
  return {heroWidth:hero.width,heroHeight:hero.height,buttonHeight:love.height,
   clipWidth:clip.width,clipHeight:clip.height,viewport:innerWidth,
   scrollWidth:document.documentElement.scrollWidth,
   webgl:!!document.getElementById('nhiThreeCanvas').getContext('webgl2')};
 });
 console.log('TRUE THREE-D MOBILE',JSON.stringify(mobile));
 assert(mobile.webgl&&mobile.heroWidth>250&&mobile.heroHeight>150,'3D stage or canvas missing on phone');
 assert(mobile.clipWidth>=44&&mobile.clipHeight>=44&&mobile.buttonHeight>=40,'Touch controls too small');
 assert(mobile.scrollWidth<=mobile.viewport+3,'Unexpected mobile horizontal scroll');
 await phone.screenshot({path:'/tmp/nhi-3d-preview/nhi-3d-before-phone.png'});
 await phone.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await phone.click('#nhiLoveButton');
 const reducedState=await phone.evaluate(()=>window.NHI_COVER_3D_V6.getState());
 console.log('TRUE THREE-D REDUCED MOTION',JSON.stringify(reducedState));
 assert(reducedState.state==='COUPLE_IDLE'&&reducedState.luongVisible,'Reduced motion should show couple immediately');
 await phone.screenshot({path:'/tmp/nhi-3d-preview/nhi-3d-together-phone.png'});
 await phone.close();
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log('TRUE THREE-D COVER V6: PASS');
}catch(err){
 console.error('TRUE THREE-D COVER V6: FAIL',err);
 process.exitCode=1;
}finally{
 await browser.close();
}
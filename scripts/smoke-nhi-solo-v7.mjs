/* Regression: restore exactly one original Nhi image, no Lương, no romantic controls. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser=await puppeteer.launch({
  headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
});
const url='http://127.0.0.1:8765/?cover=1&v=nhi-solo-v7';
const errors=[];
const assert=(ok,message)=>{if(!ok)throw Error(message)};
fs.mkdirSync('/tmp/nhi-solo-preview',{recursive:true});
const listen=(page,label)=>{
  page.on('pageerror',e=>errors.push(label+': '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(label+': '+m.text())});
};
async function inspect(page){
  return await page.evaluate(async()=>{
    const cover=document.getElementById('cover');
    const art=cover.querySelector('#coverHero .nhi-solo-art');
    if(art&&!art.complete)await new Promise(resolve=>{art.addEventListener('load',resolve,{once:true});art.addEventListener('error',resolve,{once:true})});
    const rect=art?.getBoundingClientRect();
    const hero=cover.querySelector('#coverHero');
    return {
      solo:cover.classList.contains('nhi-solo-v7'),
      coverHidden:cover.hidden,
      sources:[...hero.querySelectorAll('img')].map(img=>img.getAttribute('src')),
      imageSize:[art?.naturalWidth||0,art?.naturalHeight||0],
      imageDisplayed:!!rect&&rect.width>0&&rect.height>0,
      imageBox:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,
      animation:art?getComputedStyle(art).animationName:null,
      heroAnimation:getComputedStyle(hero).animationName,
      loveButtons:cover.querySelectorAll('#nhiLoveButton, .nhi-v51-love-button, .nhi-gif-love-button, .nhi-three-love-button').length,
      airplane:!!cover.querySelector('#nhiPlaneLayer'),
      boy:!!cover.querySelector('#luongCharacter,.nhi-v51-boy,.nhi-demo-boy'),
      canvas3d:!!cover.querySelector('#nhiThreeCanvas'),
      threeImported:performance.getEntriesByType('resource').some(e=>/three\.module\.js|nhi-3d-cover-v6\.mjs|nhi-demo-pixel-cover-v5-2\.js/.test(e.name)),
      originalGarden:!!cover.querySelector('.landscape'),
      cta:document.querySelector('#coverGo')?.textContent,
      viewport:innerWidth,
      pageScroll:document.documentElement.scrollWidth
    };
  });
}
try{
 const desktop=await browser.newPage();listen(desktop,'desktop');
 await desktop.setViewport({width:1366,height:768,deviceScaleFactor:1});
 await desktop.goto(url,{waitUntil:'domcontentloaded'});
 await desktop.waitForSelector('#coverHero .nhi-solo-art');
 const d=await inspect(desktop);
 console.log('NHI SOLO DESKTOP',JSON.stringify(d));
 assert(d.solo&&!d.coverHidden&&d.sources.length===1,'Only Nhi should be displayed in the cover');
 assert(d.imageSize[0]===445&&d.imageSize[1]===774&&d.imageDisplayed,'Girl image must be original 445x774 high-res cutout');
 assert(!d.boy&&!d.airplane&&!d.canvas3d&&!d.threeImported&&d.loveButtons===0,'Male/couple/airplane or 3D runtime must not be present');
 assert(d.originalGarden&&/Vào học/.test(d.cta),'Keep garden and study entry button');
 assert(d.animation==='none'&&d.heroAnimation==='none','Original 2D Nhi image should be still, not pseudo-3D');
 await desktop.screenshot({path:'/tmp/nhi-solo-preview/nhi-solo-desktop.png'});
 await desktop.click('#coverGo');
 await desktop.waitForFunction(()=>document.getElementById('cover').hidden,{timeout:3000});
 await desktop.close();

 for(const [width,height] of [[390,844],[375,667]]){
  const p=await browser.newPage();listen(p,'phone-'+width);
  await p.setViewport({width,height,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.goto(url,{waitUntil:'domcontentloaded'});
  const m=await inspect(p);
  console.log('NHI SOLO MOBILE '+width,JSON.stringify(m));
  assert(m.solo&&m.sources.length===1&&m.imageDisplayed,'Nhi not shown on phone '+width);
  assert(m.imageSize[0]===445&&m.imageSize[1]===774,'Wrong asset on phone '+width);
  assert(!m.boy&&!m.airplane&&!m.canvas3d&&!m.threeImported&&!m.loveButtons,'Romance asset appears on phone '+width);
  assert(m.pageScroll<=m.viewport+3,'Unexpected horizontal overflow on phone '+width);
  assert(m.imageBox.width>=110&&m.imageBox.height>=190,'Nhi is too small on phone '+width);
  if(width===390)await p.screenshot({path:'/tmp/nhi-solo-preview/nhi-solo-phone.png'});
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  assert((await inspect(p)).animation==='none','Reduced motion needs static Nhi');
  await p.close();
 }
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log('SOLO NHI COVER V7: PASS');
}catch(e){
 console.error('SOLO NHI COVER V7: FAIL',e);
 process.exitCode=1;
}finally{
 await browser.close();
}
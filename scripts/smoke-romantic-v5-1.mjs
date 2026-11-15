/* Browser regression for Romantic Cover V5.1 (6 seconds + neutral hands). */
import puppeteer from 'puppeteer-core';

const browser=await puppeteer.launch({
  headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
});
const root='http://127.0.0.1:8765/?cover=1&v=romantic-v5-1';
const errors=[],check=(yes,msg)=>{if(!yes)throw Error(msg);};
const watch=(page,name)=>{
  page.on('pageerror',e=>errors.push(name+': '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(name+': '+m.text());});
};
try {
  const page=await browser.newPage();watch(page,'desktop');
  await page.setViewport({width:1366,height:768});
  await page.goto(root,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.NHI_COVER_V51?.getState().ready,{timeout:20000});
  const first=await page.evaluate(()=>{
    const s=window.NHI_COVER_V51.getState();
    const girl=document.getElementById('nhiCharacter'),boy=document.getElementById('luongCharacter');
    return {...s,
      boyOpacity:getComputedStyle(boy).opacity,
      girlAnimated:getComputedStyle(girl).animationName,
      boyRig:boy.querySelector('svg')?.getAttribute('data-pose'),
      armsLeft:boy.querySelectorAll('.nhi-boy-arm-left').length,
      armsRight:boy.querySelectorAll('.nhi-boy-arm-right').length,
      bouquet:!!document.getElementById('nhiBouquetLoveV51'),
      clip:!!document.getElementById('nhiHairClipPlane'),
      button:document.getElementById('nhiLoveButton')?.textContent,
      title:document.querySelector('#cover h1')?.textContent,
      go:document.getElementById('coverGo')?.textContent
    };
  });
  console.log('ROMANTIC V5.1 INITIAL',JSON.stringify(first));
  check(first.ready&&first.state==='NHI_IDLE'&&first.timeMs===6000,'Initial state or 6s timeline missing');
  check(first.boyOpacity==='0'&&first.boyRig==='both-arms-at-sides','Boy visible before click or hands are not at sides');
  check(first.armsLeft===1&&first.armsRight===1,'Both arms are not individually visible');
  check(first.girlAnimated!=='none'&&first.bouquet&&first.clip,'Girl idle motion or bonus hotspots missing');
  check(/Vào học/.test(first.go)&&/Nhi/.test(first.title),'Original study cover lost');
  check((await page.evaluate(()=>window.NHI_COVER_V51.getTimes())).TOGETHER===6000,'Scene timeline does not end at 6000ms');
  await page.click('#nhiLoveButton');
  await page.waitForFunction(()=>window.NHI_COVER_V51.getState().phase==='walk',{timeout:2100});
  const whileWalking=await page.evaluate(()=>{
    const stage=document.getElementById('nhiCoupleStage'),boy=document.getElementById('luongCharacter');
    return {phase:stage.dataset.phase,opacity:getComputedStyle(boy).opacity,
      armAnimation:getComputedStyle(boy.querySelector('.nhi-boy-arm-left')).animationName};
  });
  console.log('ROMANTIC V5.1 WALKING',JSON.stringify(whileWalking));
  check(whileWalking.phase==='walk'&&Number(whileWalking.opacity)>.8&&whileWalking.armAnimation!=='none','Walking does not articulate arms and legs');
  check((await page.evaluate(()=>window.NHI_COVER_V51.playAirplane()))===true,'Airplane cannot play during kiss scene');
  check((await page.$eval('#nhiLoveBanner text',e=>e.textContent))==='Lương ❤️ Nhi','Banner text differs');
  await page.waitForFunction(()=>window.NHI_COVER_V51.getState().phase==='kiss',{timeout:6600});
  const kiss=await page.evaluate(()=>({
    phase:document.getElementById('nhiCoupleStage').dataset.phase,
    mouthOpacity:getComputedStyle(document.querySelector('#luongCharacter .nhi-boy-kiss-mouth')).opacity,
    arms:getComputedStyle(document.querySelector('#luongCharacter .nhi-boy-arm-right')).transform
  }));
  console.log('ROMANTIC V5.1 KISS',JSON.stringify(kiss));
  check(kiss.phase==='kiss'&&Number(kiss.mouthOpacity)>.7,'Lương does not turn into the kissing pose');
  await page.waitForFunction(()=>window.NHI_COVER_V51.getState().state==='COUPLE_IDLE',{timeout:3500});
  const couple=await page.evaluate(()=>{
    const s=window.NHI_COVER_V51.getState();
    const stage=document.querySelector('#nhiCoupleStage'),boy=document.getElementById('luongCharacter');
    return {...s,
      phase:stage.dataset.phase,
      boyOpacity:getComputedStyle(boy).opacity,
      headGirl:getComputedStyle(stage.querySelector('.nhi-rig-head')).animationName,
      headBoy:getComputedStyle(stage.querySelector('.nhi-boy-head')).animationName,
      leftArm:getComputedStyle(stage.querySelector('.nhi-boy-arm-left')).transform,
      rightArm:getComputedStyle(stage.querySelector('.nhi-boy-arm-right')).transform,
      heartShown:!document.getElementById('nhiCoupleHeartV51').hidden,
      button:document.getElementById('nhiLoveButton').textContent
    };
  });
  console.log('ROMANTIC V5.1 TOGETHER',JSON.stringify(couple));
  check(couple.state==='COUPLE_IDLE'&&couple.phase==='couple'&&Number(couple.boyOpacity)>.99,'Lương did not stay after kiss');
  check(couple.headGirl.includes('lean')&&couple.headBoy.includes('lean'),'Heads are not tilted toward each other');
  check(couple.leftArm==='matrix(1, 0, 0, 1, 0, 0)'&&couple.rightArm==='matrix(1, 0, 0, 1, 0, 0)','Arms should return to the normal straight-down pose');
  check(couple.heartShown&&/Xem lại/.test(couple.button),'Heart easter egg or replay missing');
  await page.evaluate(()=>document.getElementById('nhiHairClipPlane').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
  check((await page.evaluate(()=>window.NHI_COVER_V51.getState())).state==='COUPLE_IDLE','Hairclip reset Lương/Nhi couple');
  await page.click('#nhiCoupleHeartV51');
  await page.evaluate(()=>document.getElementById('nhiBouquetLoveV51').click());
  await page.click('#nhiLoveButton');
  check((await page.evaluate(()=>window.NHI_COVER_V51.getState())).state==='PLAYING','Replay did not start');
  await page.$eval('#coverGo',button=>button.click());
  await page.waitForFunction(()=>window.NHI_COVER_V51.getState().state==='NHI_IDLE',{timeout:3000});
  await page.close();

  const mobile=await browser.newPage();watch(mobile,'mobile');
  await mobile.setViewport({width:375,height:667,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await mobile.goto(root,{waitUntil:'domcontentloaded'});
  await mobile.waitForFunction(()=>window.NHI_COVER_V51?.getState().ready,{timeout:20000});
  const bounds=await mobile.evaluate(()=>{
    const rect=(id)=>document.getElementById(id)?.getBoundingClientRect();
    const h=rect('coverHero'),b=rect('nhiLoveButton'),go=rect('coverGo');
    const clip=document.getElementById('nhiHairClipPlane').getBoundingClientRect();
    return {heroWidth:h.width,heroHeight:h.height,buttonWidth:b.width,buttonHeight:b.height,
      goBottom:go.bottom,clipWidth:clip.width,documentScroll:document.documentElement.scrollWidth,viewport:innerWidth,
      clipFocus:document.getElementById('nhiHairClipPlane').getAttribute('tabindex')};
  });
  console.log('ROMANTIC V5.1 MOBILE',JSON.stringify(bounds));
  check(bounds.heroWidth>=250&&bounds.buttonHeight>=40&&bounds.clipWidth>=30,'Mobile visuals or controls too small');
  check(bounds.documentScroll<=bounds.viewport+2,'Unexpected horizontal body scrolling');
  check(bounds.clipFocus==='0','Hairclip is not keyboard accessible');
  await mobile.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await mobile.click('#nhiLoveButton');
  check((await mobile.evaluate(()=>window.NHI_COVER_V51.getState())).state==='COUPLE_IDLE','Reduced motion must show two standing together');
  await mobile.close();
  if(errors.length)throw Error('Unexpected JS/browser errors: '+errors.join(' | '));
  console.log('Romantic V5.1 regression: PASS');
}catch(e){
  console.error('Romantic V5.1 regression: FAIL',e);
  process.exitCode=1;
}finally{
  await browser.close();
}
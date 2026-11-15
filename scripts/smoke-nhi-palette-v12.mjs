/* Check that V12 cover's Korean encouragement, CTA, and borders adopt
   exactly the per-load title shade, in both themes and phone layouts. */
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({
 headless:true,
 executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
});
const url='http://127.0.0.1:8765/?cover=1&v=nhi-palette-v12';
const colors=['blue','green','pink'];
const assert=(ok,message)=>{if(!ok)throw Error(message)};
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage();
  const issues=[];
  page.on('pageerror',e=>issues.push(String(e)));
  await page.setViewport({...viewport,deviceScaleFactor:1,isMobile:viewport.width<600,hasTouch:viewport.width<600});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#cover h1 em',{timeout:10000});
  await new Promise(r=>setTimeout(r,1050));
  const inspect=()=>page.evaluate(()=>{
    const title=document.querySelector('#cover h1');
    const ko=document.querySelector('#cover .lead span[lang="ko"]');
    const button=document.querySelector('#coverGo');
    const frame=document.querySelector('#cover .cover-in');
    const style=el=>getComputedStyle(el);
    return {
      selected:document.documentElement.dataset.nhiCoverTitle,
      theme:document.documentElement.dataset.theme,
      title:style(title).color,
      titleAnimation:style(title).animationName,
      ko:style(ko).color,
      koText:ko.textContent,
      button:style(button).color,
      buttonText:button.textContent,
      buttonFill:style(button).backgroundColor,
      buttonBorder:style(button).borderTopColor,
      buttonBorderWidth:style(button).borderTopWidth,
      buttonEdge:style(button).boxShadow,
      frameBorder:getComputedStyle(frame,'::after').borderTopColor,
      frameBorderWidth:getComputedStyle(frame,'::after').borderTopWidth,
      framePresence:getComputedStyle(frame,'::after').content,
      ctaVisible:button.getBoundingClientRect().height>40&&button.getBoundingClientRect().width>110,
      documentOverflow:document.documentElement.scrollWidth-innerWidth,
      portraitAnimation:style(document.querySelector('#coverHero .nhi-upper-girl-v8')).animationName
    };
  });
  const first=await inspect();
  assert(colors.includes(first.selected),'Every page load needs a valid shade');
  assert(first.titleAnimation==='none'&&first.portraitAnimation==='nhi-v8-gentle-sway',
    'Title should stay still while Nhi continues swaying');
  await new Promise(r=>setTimeout(r,950));
  const later=await inspect();
  assert(first.selected===later.selected&&first.ko===later.ko&&first.button===later.button,
    'CTA and Korean text cannot cycle colors after page load');
  for(const theme of ['light','dark']){
   const sample=[];
   for(const color of colors){
    await page.evaluate(({theme,color})=>{
      document.documentElement.dataset.theme=theme;
      document.documentElement.dataset.nhiCoverTitle=color;
    },{theme,color});
    const v=await inspect();
    const variable=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--nhi-cover-ui-ink').trim());
    console.log('V12 COVER',viewport.width,theme,color,JSON.stringify(v));
    assert(v.koText.includes('오늘도 화이팅')&&v.buttonText.includes('Vào học thôi'),'Original cover text missing');
    assert(v.ko===v.button,'Korean encouragement and button label must match');
    assert(v.ko!==v.title,'Slightly different shades across typography are intentional');
    assert(v.buttonBorder===v.frameBorder,'Button and cover frame must share selected border color');
    assert(v.buttonBorderWidth==='2px'&&v.frameBorderWidth==='1px','Both borders must be visible');
    assert(v.framePresence!=='none'&&v.ctaVisible,'Cover frame or CTA invisible');
    assert(v.documentOverflow<=3,'Phone cover must not overflow horizontally');
    assert(v.titleAnimation==='none','Header cannot animate');
    assert(!!variable,'No palette variable selected');
    sample.push(v.ko);
   }
   assert(new Set(sample).size===3,'All three '+theme+' palettes must be visually distinct');
  }
  assert(!issues.length,'Page JavaScript errors: '+issues.join('; '));
  await page.close();
 }
 console.log('NHI COVER V12 CONSISTENT COLOR PALETTE: PASS');
}catch(e){
 console.error('NHI COVER V12 CONSISTENT COLOR PALETTE: FAIL',e);
 process.exitCode=1;
}finally{await browser.close();}

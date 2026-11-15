/* V11 cover: exactly one blue, green or pink title per page load; no cycle. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const browser=await puppeteer.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
});
const base='http://127.0.0.1:8765/?cover=1&v=nhi-static-title-v11';
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const shades=['blue','green','pink'];
fs.mkdirSync('/tmp/nhi-v11-preview',{recursive:true});
try{
  for(const size of [{width:1366,height:768},{width:390,height:844}]){
    const page=await browser.newPage();
    await page.setViewport({...size,deviceScaleFactor:1,isMobile:size.width<600,hasTouch:size.width<600});
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#cover h1 em');
    const read=()=>page.evaluate(()=>{
      const main=document.querySelector('#cover h1');
      const accent=main.querySelector('em');
      const style=getComputedStyle(main);
      return {
        selected:document.documentElement.dataset.nhiCoverTitle,
        color:style.color,accent:getComputedStyle(accent).color,
        animation:style.animationName,filter:style.filter,
        mainText:main.textContent,
        portraitAnimation:getComputedStyle(document.querySelector('#coverHero .nhi-upper-girl-v8')).animationName
      };
    });
    const first=await read();
    assert(shades.includes(first.selected),'Page must choose one of exactly three colors');
    assert(first.animation==='none'&&first.filter==='none','Title must not animate or cycle hues');
    assert(first.portraitAnimation==='nhi-v8-gentle-sway','Nhi must keep her original gentle sway');
    await new Promise(resolve=>setTimeout(resolve,1900));
    const second=await read();
    assert(first.selected===second.selected&&first.color===second.color&&first.accent===second.accent,
      'Title must remain the same color throughout this page load');

    // Exercise all 3 fixed palettes without relying on random chance.
    for(const mode of ['light','dark']){
      for(const shade of shades){
        await page.evaluate(({mode,shade})=>{
          document.documentElement.dataset.theme=mode;
          document.documentElement.dataset.nhiCoverTitle=shade;
        },{mode,shade});
        const state=await read();
        assert(state.animation==='none'&&state.filter==='none','No animation in '+mode+'/'+shade);
        assert(state.color!==state.accent,'Both title parts should have coordinated shade contrasts');
        if(mode==='light')await page.screenshot({path:'/tmp/nhi-v11-preview/cover-'+shade+'-'+size.width+'.png'});
        console.log('V11 COLOR',mode,shade,size.width,state.color,state.accent);
      }
    }
    await page.close();
    console.log('V11 FIXED PER LOAD',size.width,first.selected);
  }
  console.log('NHI V11 STATIC PER-LOAD TITLE: PASS');
}catch(e){
  console.error('NHI V11 STATIC PER-LOAD TITLE: FAIL',e);
  process.exitCode=1;
}finally{await browser.close();}

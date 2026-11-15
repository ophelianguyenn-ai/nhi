/* Real-browser regression: colorful Nhi heading, left English, IPA <=5 words. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({
 headless:true,
 executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox']
});
const URL='http://127.0.0.1:8765/';
const fail=(ok,message)=>{if(!ok)throw Error(message)};
const errors=[];
fs.mkdirSync('/tmp/nhi-v10-preview',{recursive:true});
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push('cover: '+e));
 await page.setViewport({width:1366,height:768,deviceScaleFactor:1});
 await page.goto(URL+'?cover=1&v=nhi-title-v10',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#cover h1 em',{timeout:10000});
 await new Promise(r=>setTimeout(r,1000));
 const before=await page.evaluate(()=>{
  const title=document.querySelector('#cover h1');
  const name=title.querySelector('em');
  return {shade:document.documentElement.dataset.nhiCoverTitle,
   animation:getComputedStyle(title).animationName,
   duration:getComputedStyle(title).animationDuration,
   filter:getComputedStyle(title).filter,
   color:getComputedStyle(title).color,
   detailColor:getComputedStyle(name).color,
   text:title.textContent.trim(),
   portrait:getComputedStyle(document.querySelector('#coverHero .nhi-upper-girl-v8')).animationName};
 });
 await new Promise(r=>setTimeout(r,2400));
 const after=await page.evaluate(()=>getComputedStyle(document.querySelector('#cover h1')).filter);
 console.log('V10 TITLE',JSON.stringify({...before,laterFilter:after}));
 fail(['blue','green','pink'].includes(before.shade),'Choose blue, green or pink on load');
 fail(before.animation==='none'&&before.filter==='none'&&after==='none',
  'Color must stay fixed with no continuous filter or animation');
 fail(before.text.includes('Nhi')&&before.text.includes('Learning Corner')&&before.portrait==='nhi-v8-gentle-sway','Keep existing title and swaying Nhi');
 await page.screenshot({path:'/tmp/nhi-v10-preview/cover-blue-green-desktop.png'});
 await page.close();

 const lesson=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons.find(x=>(x.items||[]).length>=8);
 fail(!!lesson,'Need sample lesson');
 const study=await browser.newPage();
 study.on('pageerror',e=>errors.push('study: '+e));
 await study.setViewport({width:1366,height:1000,deviceScaleFactor:1});
 await study.evaluateOnNewDocument(()=>{
  sessionStorage.setItem('nlc-cover-seen','1');
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,theme:'light'}));
 });
 await study.goto(URL+'#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
 await study.waitForSelector('#planBox .ppage',{timeout:20000});
 await study.evaluate(()=>{
  const b=[...document.querySelectorAll('#planBox button')].find(x=>/Học ngay|Học trước|Tiếp tục|Học lại|Ôn/.test(x.textContent||''));
  if(!b)throw Error('No study button');
  b.click();
 });
 await study.waitForSelector('#planBox .pcard',{timeout:15000});
 await study.keyboard.press('Enter');
 await study.waitForSelector('#planBox .nhi-english-v5',{timeout:9000});

 const layout=await study.evaluate(()=>{
  const box=document.querySelector('#planBox .nhi-english-v5');
  const panel=box.querySelector('.nhi-en-head');
  const main=box.querySelector('.nhi-en-main');
  const actions=box.querySelector('.nhi-en-head-actions');
  const tr=box.querySelector('.nhi-en-translation');
  const ipa=box.querySelector('.nhi-en-ipa');
  const hard=document.querySelector('#planBox .prate .hard');
  const m=main.getBoundingClientRect(),a=actions.getBoundingClientRect(),b=box.getBoundingClientRect();
  return {
   english:getComputedStyle(tr).textAlign,
   ipa:getComputedStyle(ipa).textAlign,
   main:getComputedStyle(main).textAlign,
   headGrid:getComputedStyle(panel).gridTemplateColumns,
   mainRight:m.right,actionsLeft:a.left,
   mainX:m.x,boxX:b.x,
   boxWithin:Math.abs(b.x+b.width/2-(document.querySelector('#planBox .vi-under').getBoundingClientRect().x+
                      document.querySelector('#planBox .vi-under').getBoundingClientRect().width/2))<10,
   pastel:getComputedStyle(hard).backgroundColor,
   hardPicked:hard.classList.contains('picked')
  };
 });
 console.log('V10 ENGLISH & HARD',JSON.stringify(layout));
 fail(layout.english==='left'&&layout.ipa==='left'&&layout.main==='left','English meaning and IPA should be left aligned');
 fail(layout.mainRight<=layout.actionsLeft+1,'English toolbar must not overlap translation');
 fail(layout.boxWithin,'Keep the entire English box centered with Vietnamese below it');
 const rgb=(layout.pastel.match(/\d+\.?\d*/g)||[]).map(Number);
 fail(rgb.length>=3&&rgb[2]>rgb[1]&&rgb[1]>rgb[0],'Hard button must remain pastel blue');
 if(!layout.hardPicked)fail(rgb[0]>221&&rgb[1]>235&&rgb[2]>250,'V10 hard button should be slightly brighter than V9');
 await study.screenshot({path:'/tmp/nhi-v10-preview/card-english-left-desktop.png'});

 // Deterministic display tests using isolated sample cards in this disposable browser.
 // Manual entries prevent external translation requests and imitate editable IPA data.
 const policy=await study.evaluate(async()=>{
  const host=document.createElement('section');
  host.className='pcard';
  const front=document.createElement('div');front.className='pfront';
  host.append(front);document.getElementById('planBox').append(host);
  const read=(id,en,ipa)=>{
   const vi='English IPA test '+id,ko='영어 발음 테스트 '+id;
   window.NHI_ENGLISH.saveEntry(id,vi,ko,{en,ipa,source:'manual'});
   const holder=document.createElement('div');front.append(holder);
   const box=window.NHI_ENGLISH.mount(holder,id,vi,ko);
   const label=box.querySelector('.nhi-en-ipa');
   return {english:en,hidden:label.hidden,reading:label.textContent,
    alignment:getComputedStyle(label).textAlign,display:getComputedStyle(label).display};
  };
  const three=read('ipa-three-v10','Please check this carefully','pliːz tʃɛk ðɪs ˈkɛrfəli');
  const five=read('ipa-five-v10',"Please check the safety valves",'pliːz tʃɛk ðə ˈseɪfti vælvz');
  const six=read('ipa-six-v10','Please check all the safety valves','pliːz tʃɛk ɔːl ðə ˈseɪfti vælvz');
  const hyphen=read('ipa-hyphen-v10','Check the self-service exit now','tʃɛk ðə sɛlf ˈsɜːrvɪs ˈɛksɪt naʊ');
  // An absent phrase IPA should fetch authentic per-word readings.
  const nativeFetch=window.fetch.bind(window);
  const sounds={glimmer:'/ˈɡlɪmər/',quartz:'/kwɔːrts/',petals:'/ˈpɛtəlz/'};
  window.fetch=(input,opts)=>{
   const u=String(input);
   if(u.includes('api.dictionaryapi.dev/api/v2/entries/en/')){
    const word=decodeURIComponent(u.split('/').pop());
    return Promise.resolve({ok:!!sounds[word],json:async()=>[{phonetic:sounds[word]}]});
   }
   return nativeFetch(input,opts);
  };
  const missing=read('ipa-composed-v10','Glimmer quartz petals','');
  const last=front.lastElementChild.querySelector('.nhi-en-ipa');
  for(let i=0;i<40&&last.hidden;i++)await new Promise(r=>setTimeout(r,25));
  missing.hidden=last.hidden;missing.reading=last.textContent;missing.display=getComputedStyle(last).display;
  window.fetch=nativeFetch;
  host.remove();
  return {three,five,six,hyphen,missing};
 });
 console.log('V10 IPA POLICY',JSON.stringify(policy));
 fail(!policy.three.hidden&&!policy.five.hidden&&!policy.hyphen.hidden,'English phrases up to 5 words must show IPA');
 fail(policy.six.hidden&&policy.six.reading==='','Phrases of more than 5 words must hide IPA even when stored');
 fail(policy.three.display==='block'&&policy.five.display==='block'&&policy.six.display==='none',
  'Short IPA should occupy a separate line; long-phrase IPA must be invisible');
 fail(!policy.missing.hidden&&policy.missing.reading.split(' ').length>=3,'Missing short-phrase IPA must be composed from genuine word readings');

 const phoneContext=await browser.createBrowserContext();
 const phone=await phoneContext.newPage();
 phone.on('pageerror',e=>errors.push('phone: '+e));
 await phone.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await phone.evaluateOnNewDocument(()=>{
  sessionStorage.setItem('nlc-cover-seen','1');
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false,theme:'light'}));
 });
 await phone.goto(URL+'#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
 await phone.waitForSelector('#planBox .ppage',{timeout:18000});
 await phone.evaluate(()=>{
  const b=[...document.querySelectorAll('#planBox button')].find(x=>/Học ngay|Học trước|Tiếp tục|Học lại|Ôn/.test(x.textContent||''));
  if(!b)throw Error('No mobile study button');b.click();
 });
 await phone.waitForSelector('#planBox .pcard');
 await phone.keyboard.press('Enter');
 await phone.waitForSelector('#planBox .nhi-english-v5');
 const mobile=await phone.evaluate(()=>{
  const box=document.querySelector('#planBox .nhi-english-v5');
  const main=box.querySelector('.nhi-en-main').getBoundingClientRect();
  const actions=box.querySelector('.nhi-en-head-actions').getBoundingClientRect();
  const vi=document.querySelector('#planBox .vi-under').getBoundingClientRect();
  const b=box.getBoundingClientRect();
  return {alignment:getComputedStyle(box.querySelector('.nhi-en-translation')).textAlign,
   ipaAlignment:getComputedStyle(box.querySelector('.nhi-en-ipa')).textAlign,
   separated:main.right<=actions.left+1,
   mainRight:main.right,actionsLeft:actions.left,
   display:getComputedStyle(box.querySelector('.nhi-en-head')).display,
   grid:getComputedStyle(box.querySelector('.nhi-en-head')).gridTemplateColumns,
   centers:Math.abs((b.x+b.width/2)-(vi.x+vi.width/2)),
   scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 console.log('V10 MOBILE',JSON.stringify(mobile));
 fail(mobile.alignment==='left'&&mobile.ipaAlignment==='left'&&mobile.separated,'English should be left aligned with no mobile toolbar overlap');
 fail(mobile.centers<=10&&mobile.scrollWidth<=mobile.viewport+3,'English frame should stay centered without mobile overflow');
 await phone.screenshot({path:'/tmp/nhi-v10-preview/card-english-left-phone.png'});
 await phone.close();
 await phoneContext.close();
 await study.close();

 if(errors.length)throw Error('Browser JavaScript errors: '+errors.join(' | '));
 console.log('NHI V10 TITLE + LEFT ENGLISH + IPA <=5: PASS');
}catch(e){
 console.error('NHI V10 TITLE + LEFT ENGLISH + IPA <=5: FAIL',e);
 process.exitCode=1;
}finally{
 await browser.close();
}
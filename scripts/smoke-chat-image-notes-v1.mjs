import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const assert=(v,m)=>{if(!v)throw Error(m);};
const l=JSON.parse(fs.readFileSync('lessons.json','utf8')).lessons.find(x=>x.items.length>5),ids=l.items.map(x=>x[0]);
const img='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
try{
 const page=await browser.newPage(),errors=[];browser.on('disconnected',()=>console.error('BROWSER DISCONNECTED'));page.on('error',e=>console.error('PAGE CRASH',String(e)));page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewport({width:1240,height:820});
 console.log('SMOKE_STEP 1 line10');
 await page.evaluateOnNewDocument((ids,img)=>{
  sessionStorage.setItem('nlc-cover-seen','1');
  localStorage.setItem('nlc-prefs-v1',JSON.stringify({fx:false}));
  if(!localStorage.getItem('viko-plan-v1')){
   const imgs={},notes={};
   ids.forEach(id=>{
    imgs[id]={v:{url:'data:image/png;base64,'+img,width:200,height:0,caption:'Hình mẫu'},t:Date.now()};
    notes[id]={v:{text:'Dòng đầu'+String.fromCharCode(10)+'Một từ dài: '+'a'.repeat(120)+String.fromCharCode(10)+'Dòng cuối',color:'#fff1ce'},t:Date.now()};
   });
   localStorage.setItem('viko-plan-v1',JSON.stringify({img:imgs,note:notes}));
  }
  window.SpeechRecognition=class{
   constructor(){window.__chatRecognizer=this;}
   start(){this.onstart?.();}
   stop(){this.onend?.();}
  };
 },ids,img);
 console.log('SMOKE_STEP 2 line27');
 await page.goto('http://127.0.0.1:8765/#/bai/'+l.id,{waitUntil:'domcontentloaded'});
 console.log('SMOKE_STEP 3 line28');
 await page.waitForSelector('#planBox .ppage',{timeout:15000});
 console.log('SMOKE_STEP 4 line29');
 await page.evaluate(()=>[...document.querySelectorAll('#planBox button')].find(b=>/Học ngay|Học trước|Tiếp tục|Học lại|Ôn/.test(b.textContent))?.click());
 console.log('SMOKE_STEP 5 line30');
 await page.waitForSelector('#planBox .pcard');
 const cardID=await page.$eval('#planBox .pcard',e=>e.dataset.item);
 await page.$eval('#planBox .pfront',e=>e.click());
 console.log('SMOKE_STEP 6 line33');
 await page.waitForSelector('#planBox .card-illustration img',{timeout:10000});
 const note=await page.evaluate(()=>{
  const e=document.querySelector('#planBox .nhi-card-note');
  if(!e)return null;
  const style=getComputedStyle(e),parent=e.closest('.nhi-card-details')||e.parentElement;
  return {preservesLines:e.textContent.includes('Dòng cuối'),whiteSpace:style.whiteSpace,wrap:style.overflowWrap,width:e.getBoundingClientRect().width,parent:parent.getBoundingClientRect().width};
 });
 assert(note?.preservesLines&&note.whiteSpace==='pre-wrap'&&note.wrap==='anywhere'&&note.width<=note.parent+3,'Note wrapping failed: '+JSON.stringify(note));
 await page.$eval('#planBox .card-illustration img',e=>e.click());
 assert(await page.$eval('#planBox .nhi-image-adjust',e=>getComputedStyle(e).display)!=='none','Click did not show image sliders');
 const fixedCardHeight=await page.$eval('#planBox .pcard',e=>e.getBoundingClientRect().height);
 const before=await page.$eval('#planBox .pfront',e=>getComputedStyle(e).gridTemplateColumns);
 await page.$eval('#planBox .nhi-image-adjust input[aria-label="Ngang hình"]',e=>{
  e.value='350';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
 });
 console.log('SMOKE_STEP 7 line48');
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v?.width===350,{},cardID);
 const after=await page.$eval('#planBox .pfront',e=>getComputedStyle(e).gridTemplateColumns);
 assert(before!==after,'Image width did not change grid: '+before+' / '+after);
 await page.$eval('#planBox .card-illustration img',e=>e.click());
 await page.$eval('#planBox .nhi-image-adjust input[aria-label="Cao hình"]',e=>{
  e.value='280';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
 });
 console.log('SMOKE_STEP 8 line55');
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v?.height===280,{},cardID);
 const height=await page.$eval('#planBox .card-illustration img',e=>getComputedStyle(e).height);
 assert(Math.abs(parseInt(height)-280)<4,'Image height was not applied: '+height);
 const newCardHeight=await page.$eval('#planBox .pcard',e=>e.getBoundingClientRect().height);
 assert(Math.abs(newCardHeight-fixedCardHeight)<3,
   'Card grew when image height changed: '+fixedCardHeight+' vs '+newCardHeight);
 // Moving the drawing should save offsets independently from width and height.
 await page.$eval('#planBox .nhi-image-adjust input[aria-label="Vị trí ngang hình"]',e=>{
   e.value='25';e.dispatchEvent(new Event('input',{bubbles:true}));
   e.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.$eval('#planBox .nhi-image-adjust input[aria-label="Vị trí dọc hình"]',e=>{
   e.value='15';e.dispatchEvent(new Event('input',{bubbles:true}));
   e.dispatchEvent(new Event('change',{bubbles:true}));
 });
 console.log('SMOKE_STEP 9 line67');
 const offsets=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v,cardID);
 console.log('IMAGE_OFFSETS',JSON.stringify({width:offsets?.width,height:offsets?.height,x:offsets?.offsetX,y:offsets?.offsetY}));
 assert(offsets&&offsets.offsetX>=20,'Image X offset not stored: '+JSON.stringify(offsets));
 console.log('SMOKE_CHAT_OPEN');
 await page.$eval('#aiBtn',e=>e.click());await page.waitForSelector('#aiForm .nhi-chat-mic');
 console.log('SMOKE_CHAT_CONTEXT');
 const ctx=await page.$eval('#aiCtx',e=>({
   text:e.textContent.trim(),row:getComputedStyle(e).flexDirection,
   speed:!!e.querySelector('.nhi-ai-reader-speed')
 }));
 console.log('AI_CONTEXT_DIAGNOSTIC',JSON.stringify(ctx));
 assert(!ctx.text.includes('Đang hỏi về thẻ')&&ctx.row==='row'&&!ctx.speed,
   'AI context has obsolete paragraph speech controls or wrong layout: '+JSON.stringify(ctx));
 assert(!await page.$eval('#aiSetup',e=>!!e.querySelector('#nhiReaderLanguage')),
   'Reader settings must be removed with double-tap reading');
 const gear=await page.$eval('#aiCfgBtn',e=>({radius:getComputedStyle(e).borderRadius,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 console.log('AI_GEAR',JSON.stringify(gear));
 assert(parseFloat(gear.radius)<=9 && Math.abs(gear.width-gear.height)<=2,
   'AI settings icon not square: '+JSON.stringify(gear));
 assert(await page.$eval('.nhi-chat-voice-lang',e=>e.value)==='vi-VN','Expected Vietnamese microphone language');
 await page.$eval('#aiForm .nhi-chat-mic',e=>e.click());
 console.log('SMOKE_STEP 10 line81');
 await page.evaluate(()=>{
  const rec=window.__chatRecognizer;
  rec.onresult({results:[{isFinal:true,0:{transcript:'Tôi muốn học tiếng Hàn'}}],resultIndex:0});rec.onend();
 });
 assert(await page.$eval('#aiInput',e=>e.value)==='Tôi muốn học tiếng Hàn','Voice did not transcribe');
 assert(await page.$$eval('#aiLog .aimsg.me',a=>a.length)===0,'Mic unexpectedly sent the text');
 console.log('SMOKE_STEP 11 line87');
 await page.focus('#aiInput');await page.keyboard.press('Enter');
 const anchor=await page.evaluate(()=>{
  const log=document.getElementById('aiLog'),sent=[...log.querySelectorAll('.aimsg.me')].at(-1);
  return {text:sent.textContent,top:sent.getBoundingClientRect().top-log.getBoundingClientRect().top,scroll:log.scrollTop};
 });
 assert(anchor.text==='Tôi muốn học tiếng Hàn'&&anchor.top>=0&&anchor.top<48,'Enter did not anchor last sent message: '+JSON.stringify(anchor));

 // Paragraphs must be normally selectable, not draggable and not read aloud
 // when tapped twice. The separate + control still saves a line to notes.
 console.log('SMOKE_STEP 12 line96');
 await page.evaluate(()=>{
   const m=document.createElement('div');m.className='aimsg ai';
   m.textContent='예문 첫째 (Ví dụ một)\\n예문 둘째 (Ví dụ hai)';
   document.getElementById('aiLog').appendChild(m);
 });
 console.log('SMOKE_STEP 13 line101');
 await page.waitForFunction(()=>document.querySelectorAll('#aiLog .nhi-ai-paragraph').length>=2,{timeout:6000});
 const selection=await page.evaluate(()=>{
   const paragraphs=[...document.querySelectorAll('#aiLog .nhi-ai-paragraph')];
   const first=paragraphs.find(e=>e.textContent.includes('Ví dụ một'));
   const second=paragraphs.find(e=>e.textContent.includes('Ví dụ hai'));
   if(!first||!second)throw Error('Answer was not rendered in separate paragraphs');
   const text=first.querySelector('.nhi-ai-paragraph-text');
   const textNode=[...text.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
   if(!textNode)throw Error('No selectable text node');
   const range=document.createRange();
   range.setStart(textNode,0);range.setEnd(textNode,Math.min(5,textNode.length));
   const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
   let speechCalls=0;
   const original=window.NHI_SPEECH?.speak;
   if(window.NHI_SPEECH)window.NHI_SPEECH.speak=()=>{speechCalls++};
   first.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));
   if(window.NHI_SPEECH)window.NHI_SPEECH.speak=original;
   return {
     copiedSelection:sel.toString(),draggable:first.draggable,
     userSelect:getComputedStyle(text).userSelect,
     speechCalls,copyButtons:document.querySelectorAll('#aiLog .nhi-copy-chat').length,
     noteButtons:paragraphs.filter(p=>p.querySelector('.nhi-add-to-note')).length
   };
 });
 assert(selection.copiedSelection.length>0&&selection.userSelect==='text'&&!selection.draggable&&selection.speechCalls===0&&selection.copyButtons===0&&selection.noteButtons>=2,
   'AI paragraph was not normal selectable text: '+JSON.stringify(selection));
 console.log('SMOKE_STEP 14 line102');
 await page.evaluate(()=>{
   const first=[...document.querySelectorAll('#aiLog .nhi-ai-paragraph')]
     .find(e=>e.textContent.includes('Ví dụ một'));
   first.querySelector('.nhi-add-to-note').click();
 });
 console.log('SMOKE_STEP 15 line110');
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).note?.[id]?.v?.text.includes('Ví dụ một'),{},cardID);
 await page.evaluate(()=>{
   const second=[...document.querySelectorAll('#aiLog .nhi-ai-paragraph')]
     .find(e=>e.textContent.includes('Ví dụ hai'));
   if(!second)throw Error('Example 2 not rendered');
   second.querySelector('.nhi-add-to-note').click();
 });
 const added=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).note?.[id]?.v?.text,cardID);
 assert(added.includes('Ví dụ một')&&added.includes('Ví dụ hai')&&added.indexOf('Ví dụ hai')>added.indexOf('Ví dụ một'),
   'Note buttons did not append separate text lines: '+added);
 // Accidental card deletion can be undone until a NEW card is visited.
 await page.$eval('#aiClose',e=>e.click());
 const deletedId=await page.$eval('#planBox .pcard',e=>e.dataset.item);
 await page.$eval('#planBox .nhi-card-corner-trash',e=>e.click());
 assert(await page.$('#planBox .prate .pundo'),'Undo disappeared immediately after deletion');
 await page.$eval('#planBox .prate .pundo',e=>e.click());
 assert(await page.$eval('#planBox .pcard',e=>e.dataset.item)===deletedId,'Undo did not restore the same card');
 await page.$eval('#planBox .nhi-card-corner-trash',e=>e.click());
 await page.$eval('#planBox .nhi-next-v3',e=>e.click());
 assert(!(await page.$('#planBox .prate .pundo')),'Undo must expire after advancing one new card');
 assert(await page.evaluate(id=>!!JSON.parse(localStorage.getItem('viko-plan-v1')).del?.[id]?.v,deletedId),
   'Deletion tombstone was lost when Undo expired');
 console.log('SMOKE_STEP 16 line129');
 await page.reload({waitUntil:'domcontentloaded'});
 console.log('SMOKE_STEP 17 line130');
 await page.waitForSelector('#planBox .pcard',{timeout:15000});
 const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img[id].v,cardID);
 assert(saved.width===350&&saved.height===280,'Image dimensions did not survive reload');
 assert(errors.length===0,'Page errors: '+errors.join('; '));
 console.log('SELECTABLE CHAT AND NOTES UX PASS',JSON.stringify({note,grid:[before,after],height,voice:true,anchor}));
}catch(err){
 console.error('ORIGINAL_SMOKE_ERROR',err&&err.stack||String(err));throw err;
}finally{try{await browser.close();}catch(e){console.error('SMOKE_CLOSE_ERROR',String(e));}}

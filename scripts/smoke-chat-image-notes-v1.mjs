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
 assert(await page.$eval('#planBox .nhi-image-handle-e',e=>getComputedStyle(e).display)!=='none',
   'Click did not show direct edge resize handles');
 assert(!(await page.$('#planBox .nhi-image-adjust')),
   'Legacy image size slider panel should not exist');
 assert(await page.$eval('#planBox .nhi-image-move-y',e=>getComputedStyle(e).display)!=='none',
   'Image vertical move grip must be visible after selecting the photo');
 const preserved=await page.evaluate(()=>{
   const front=document.querySelector('#planBox .pfront');
   const box=document.querySelector('#planBox .nhi-english-v5');
   const note=document.querySelector('#planBox .nhi-card-note');
   const selectors=['#planBox .pcard>.prate>.hard','#planBox .pcard>.prate>.nhi-prev-v3',
     '#planBox .pcard>.prate>.nhi-next-v3'];
   const measure=()=>({
     buttons:selectors.map(q=>document.querySelector(q).getBoundingClientRect().width),
     english:box?.getBoundingClientRect().width||0,
     note:note?.getBoundingClientRect().width||0,
     englishSize:box?getComputedStyle(box.querySelector('.nhi-en-translation')).fontSize:'',
     noteSize:note?getComputedStyle(note).fontSize:''
   });
   const withPhoto=measure();
   front.classList.remove('nhi-with-image');
   const normal=measure();
   front.classList.add('nhi-with-image');
   return {withPhoto,normal};
 });
 console.log('PRESERVED_PHOTO_SIZES',JSON.stringify(preserved));
 assert(preserved.withPhoto.buttons[0]>=100 &&
   preserved.withPhoto.buttons[1]>=40 && preserved.withPhoto.buttons[2]>=40 &&
   Math.abs(preserved.withPhoto.buttons[1]-preserved.withPhoto.buttons[2])<2,
   'Khó and square Lùi–Tiến pads must remain comfortably sized: '+JSON.stringify(preserved));
 assert(preserved.withPhoto.englishSize===preserved.normal.englishSize &&
   preserved.withPhoto.noteSize===preserved.normal.noteSize,
   'Bilingual note fonts shrank when a photo appeared: '+JSON.stringify(preserved));
 assert(Math.abs(preserved.withPhoto.english-preserved.normal.english)<10,
   'English note panel width shrank when a photo appeared: '+JSON.stringify(preserved));
 const fixedCardHeight=await page.$eval('#planBox .pcard',e=>e.getBoundingClientRect().height);
 assert(fixedCardHeight>520,'Flashcard with right image must be taller: '+fixedCardHeight);
 const placement=await page.evaluate(()=>{
   const bounds=selector=>document.querySelector(selector)?.getBoundingClientRect();
   const picture=bounds('#planBox .card-illustration');
   const korean=bounds('#planBox .nhi-ko-line');
   const tools=bounds('#planBox .card-top .cicons');
   const row=bounds('#planBox .pcard>.prate');
   const prev=bounds('#planBox .pcard>.prate>.nhi-prev-v3');
   const hard=bounds('#planBox .pcard>.prate>.hard');
   const next=bounds('#planBox .pcard>.prate>.nhi-next-v3');
   const center=r=>r?(r.left+r.right)/2:null;
   return {photoLeft:picture?.left,koreanCenter:center(korean),koreanRight:korean?.right,
     toolsCenter:center(tools),
     rowLeft:row?.left,rowRight:row?.right,rowCenter:center(row),
     prevCenter:center(prev),hardCenter:center(hard),nextCenter:center(next),
     hardPosition:hard?getComputedStyle(document.querySelector('#planBox .pcard>.prate>.hard')).position:null};
 });
 console.log('IMAGE_LEFT_CONTROLS',JSON.stringify(placement));
 assert(Math.abs(placement.rowCenter-placement.koreanCenter)<12 &&
   placement.photoLeft-placement.koreanRight>=8 &&
   placement.photoLeft-placement.koreanRight<=24 &&
   placement.hardCenter<placement.prevCenter&&placement.prevCenter<placement.nextCenter,
   'Khó – Lùi – Tiến must center on text and photo gap must be small but visible: '+JSON.stringify(placement));
 // Four-arrow controls must move and persist the WHOLE frame, including X.
 const before4way=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v?.offsetX||0,cardID);
 await page.$eval('#planBox .nhi-4way-pad button[data-dir="right"]',e=>e.click());
 await page.waitForFunction((id,prev)=>{
   const v=JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v;
   return v && v.offsetX>=prev+12;
 },{},cardID,before4way);
 const after4way=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v?.offsetX,cardID);
 console.log('FOUR_WAY_IMAGE_X',JSON.stringify({before:before4way,after:after4way}));
 const before=await page.$eval('#planBox .pfront',e=>getComputedStyle(e).gridTemplateColumns);
 async function drag(selector,dx,dy,id){
   await page.$eval(selector,(e,dx,dy,id)=>{
     const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
     const emit=(type,xx,yy)=>e.dispatchEvent(new PointerEvent(type,{
       bubbles:true,cancelable:true,pointerId:id,pointerType:'mouse',button:0,buttons:1,
       clientX:xx,clientY:yy
     }));
     emit('pointerdown',x,y);
     emit('pointermove',x+dx,y+dy);
     emit('pointerup',x+dx,y+dy);
   },dx,dy,id);
 }
 await drag('#planBox .nhi-image-handle-e',35,0,61);
 console.log('SMOKE_STEP 7 edge resize');
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v?.width>220,{},cardID);
 const edge=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img[id].v,cardID);
 const after=await page.$eval('#planBox .pfront',e=>getComputedStyle(e).gridTemplateColumns);
 assert(before!==after,'Image width did not change grid: '+before+' / '+after);
 await drag('#planBox .nhi-image-handle-s',0,38,62);
 console.log('SMOKE_STEP 8 independent height');
 await page.waitForFunction((id,h)=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v?.height>h+20,{},cardID,edge.height||200);
 const afterHeight=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img[id].v,cardID);
 assert(Math.abs(afterHeight.width-edge.width)<=2,'Side drag must preserve width');
 const ratioBefore=afterHeight.width/afterHeight.height;
 await drag('#planBox .nhi-image-handle-se',22,22,63);
 console.log('SMOKE_STEP 9 proportional corner');
 await page.waitForFunction((id,w)=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v?.width>w,{},cardID,afterHeight.width);
 const afterCorner=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img[id].v,cardID);
 const ratioAfter=afterCorner.width/afterCorner.height;
 assert(Math.abs(ratioAfter-ratioBefore)<.04,
   'Corner drag did not preserve width/height ratio: '+ratioBefore+' -> '+ratioAfter);
 const newCardHeight=await page.$eval('#planBox .pcard',e=>e.getBoundingClientRect().height);
 assert(Math.abs(newCardHeight-fixedCardHeight)<4,
   'Card grew when image height changed: '+fixedCardHeight+' vs '+newCardHeight);
 // Dragging inside the image moves it without creating any sliders.
 await drag('#planBox .card-illustration .nhi-image-stage img',25,15,64);
 const offsets=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v,cardID);
 const priorFrame=await page.$eval('#planBox .card-illustration .nhi-image-stage',e=>({
   top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height,
   imageTop:e.querySelector('img').getBoundingClientRect().top,
   parentOverflow:getComputedStyle(e.closest('.pfront')).overflowY,
   figureTransform:getComputedStyle(e.closest('figure')).transform
 }));
 console.log('IMAGE_DIRECT_HANDLES',JSON.stringify({
   width:offsets?.width,height:offsets?.height,x:offsets?.offsetX,y:offsets?.offsetY,
   ratioBefore,ratioAfter
 }));
 assert(offsets&&offsets.offsetX>=20,
   'Image X position was not saved by dragging: '+JSON.stringify(offsets));
 await drag('#planBox .nhi-image-move-y',0,-92,65);
 const moved=await page.evaluate(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).img?.[id]?.v,cardID);
 const afterFrame=await page.$eval('#planBox .card-illustration .nhi-image-stage',e=>({
   top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height,
   imageTop:e.querySelector('img').getBoundingClientRect().top,
   parentOverflow:getComputedStyle(e.closest('.pfront')).overflowY,
   figureTransform:getComputedStyle(e.closest('figure')).transform
 }));
 assert(moved&&moved.offsetY<=offsets.offsetY-90 &&
   moved.width===offsets.width && moved.height===offsets.height,
   'Up/down grip should move the whole frame without resizing: '+JSON.stringify({offsets,moved}));
 assert(Math.abs((afterFrame.top-priorFrame.top)-(moved.offsetY-offsets.offsetY))<3 &&
   Math.abs((afterFrame.imageTop-priorFrame.imageTop)-(moved.offsetY-offsets.offsetY))<3 &&
   afterFrame.parentOverflow==='visible' &&
   Math.abs(afterFrame.height-priorFrame.height)<2,
   'Frame must move with image, not clip image inside fixed viewport: '+JSON.stringify({priorFrame,afterFrame}));
 console.log('PHOTO_FRAME_MOVES_INTACT',JSON.stringify({from:offsets.offsetY,to:moved.offsetY,before:priorFrame,after:afterFrame}));
 assert(!(await page.$('#planBox .card-illustration figcaption')),
   'No meaning or image-source caption may remain below an attached photo');
 const leftLayout=await page.evaluate(()=>{
   const korean=document.querySelector('#planBox .nhi-ko-line');
   const photo=document.querySelector('#planBox .card-illustration');
   const front=document.querySelector('#planBox .pfront');
   const a=korean.getBoundingClientRect(),b=photo.getBoundingClientRect();
   const cols=getComputedStyle(front).gridTemplateColumns.trim().split(/\s+/);
   return {koCenter:a.left+a.width/2,photoLeft:b.left,columns:cols,
     koAlign:getComputedStyle(korean.querySelector('.answer.ko')).textAlign};
 });
 assert(leftLayout.koCenter<leftLayout.photoLeft&&leftLayout.koAlign==='center',
   'Korean text must stay centered in the left section: '+JSON.stringify(leftLayout));
 const visual=await page.evaluate(()=>{
   const compare=document.querySelector('#planBox .nhi-english-v5 .nhi-en-tools .nhi-en-review');
   const dict=document.querySelector('#planBox .nhi-card-dictionaries');
   const prev=document.querySelector('#planBox .nhi-prev-v3').getBoundingClientRect();
   const next=document.querySelector('#planBox .nhi-next-v3').getBoundingClientRect();
   return {compare:!!compare,inDict:!!dict?.contains(compare),
      prevSize:[prev.width,prev.height],nextSize:[next.width,next.height],
      hanjaButton:!!document.querySelector('#planBox .card-top .hjbtn'),
      caption:!!document.querySelector('#planBox .card-illustration figcaption')};
 });
 assert(visual.compare&&!visual.inDict&&!visual.hanjaButton&&!visual.caption &&
        Math.abs(visual.prevSize[0]-visual.prevSize[1])<2 &&
        Math.abs(visual.nextSize[0]-visual.nextSize[1])<2,
   'Đối chiếu must return to English frame and Lùi/Tiến must be square: '+JSON.stringify(visual));
 console.log('PHOTO_COMPARISON_AND_ICONS',JSON.stringify(visual));
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
   m.textContent='예문 첫째 (Ví dụ một)\n예문 둘째 (Ví dụ hai)';
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
 // A bilingual selection has a + and can be dragged onto the white card,
 // while monolingual AI paragraphs must never show a pointless +.
 await page.evaluate(()=>{
  const ai=document.getElementById('aiLog');
  for(const [tag,text] of [['bilingual','Xin chào: 안녕하세요'],['single','Chỉ có tiếng Việt']]){
   const m=document.createElement('div');m.className='aimsg ai';m.dataset.case=tag;
   m.textContent=text;ai.appendChild(m);
  }
 });
 await page.waitForFunction(()=>{
  const both=document.querySelector('#aiLog [data-case="bilingual"]');
  const alone=document.querySelector('#aiLog [data-case="single"]');
  return !!both?.querySelector('.nhi-add-to-note') &&
   alone?.dataset.readerMounted==='true'&&!alone.querySelector('.nhi-add-to-note');
 },{timeout:7000});
 const drop=await page.evaluate(()=>{
  const text=document.querySelector('#aiLog [data-case="bilingual"] .nhi-ai-paragraph-text');
  const data=new DataTransfer(),selection=window.getSelection();
  selection.removeAllRanges();
  const r=document.createRange();r.selectNodeContents(text);selection.addRange(r);
  text.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:data}));
  const dest=document.querySelector('#planBox .pcard');
  dest.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:data}));
  dest.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}));
  return {text:data.getData('application/x-nhi-example'),
    monoHasPlus:!!document.querySelector('#aiLog [data-case="single"] .nhi-add-to-note')};
 });
 assert(drop.text==='Xin chào: 안녕하세요'&&!drop.monoHasPlus,
  'Bilingual chat selection should copy; monolingual text has no +: '+JSON.stringify(drop));
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('viko-plan-v1')).note?.[id]?.v?.text.includes('Xin chào: 안녕하세요'),{},cardID);
 console.log('CHAT_SELECTION_DROP',JSON.stringify(drop));
 // User-supplied screenshot: all three numbered, Vietnamese-only examples
 // must have a plus; pressing plus or dragging a selected subset must add a
 // bilingual "Việt: Hàn" pair after translation, not silently fail.
 await page.evaluate(()=>{
   const ai=document.getElementById('aiLog');
   const msg=document.createElement('div');msg.className='aimsg ai';
   msg.dataset.case='threeexamples';
   msg.innerHTML='3 ví dụ thực tế:<br>Ví dụ 1: Tôi đi làm hôm nay.<br>Ví dụ 2: Tôi đã báo cáo rồi.<br>Ví dụ 3: Ngày mai tôi sẽ kiểm tra.';
   ai.append(msg);
 });
 await page.waitForFunction(()=>{
   const examples=document.querySelector('[data-case="threeexamples"]');
   return examples && examples.querySelectorAll('.nhi-add-to-note').length===3;
 },{timeout:8000});
 const diagnostics=await page.evaluate(()=>{
   const msg=document.querySelector('[data-case="threeexamples"]');
   return [...msg.querySelectorAll('.nhi-ai-paragraph')].map(p=>({
     text:p.querySelector('.nhi-ai-paragraph-text')?.textContent.trim(),
     plus:!!p.querySelector('.nhi-add-to-note')
   }));
 });
 assert(diagnostics.length===4&&diagnostics.filter(p=>p.plus).length===3,
    'Each of the 3 example sentences needs its own +: '+JSON.stringify(diagnostics));
 const aiClick=await page.evaluate(()=>{
   window.__originalSaveSelected=window.NHI_CHAT_ADD_SELECTED;
   const samples=['Tôi đi làm hôm nay','Tôi đã báo cáo rồi','Ngày mai tôi sẽ kiểm tra'];
   const translated=['오늘 출근합니다.','이미 보고했어요.','내일 확인하겠습니다.'];
   window.NHI_CHAT_ADD_SELECTED=(source)=>{
     const bare=window.NHI_EXAMPLE_STRIP(source).replace(/[.。]+$/,'');
     const i=samples.indexOf(bare);
     if(i<0)return window.__originalSaveSelected(source);
     return window.__originalSaveSelected(bare+': '+translated[i]);
   };
   document.querySelectorAll('[data-case="threeexamples"] .nhi-add-to-note')
      .forEach(b=>b.click());
   return window.NHI_EXAMPLE_PAIR('Tiếng Việt: Tôi làm việc.\nTiếng Hàn: 저는 일합니다.');
 });
 assert(aiClick?.vi==='Tôi làm việc'&&aiClick?.ko==='저는 일합니다.',
   'Labelled bilingual translation should parse as one VI:KO pair');
 await page.waitForFunction(id=>{
   const note=JSON.parse(localStorage.getItem('viko-plan-v1')).note?.[id]?.v?.text||'';
   return ['Tôi đi làm hôm nay: 오늘 출근합니다.',
           'Tôi đã báo cáo rồi: 이미 보고했어요.',
           'Ngày mai tôi sẽ kiểm tra: 내일 확인하겠습니다.'].every(s=>note.includes(s));
 },{timeout:8000},cardID);
 const dragPartial=await page.evaluate(()=>{
   const m=document.querySelector('[data-case="threeexamples"]');
   const t=[...m.querySelectorAll('.nhi-ai-paragraph-text')]
      .find(el=>el.textContent.includes('Ví dụ 2:'));
   const text=t.firstChild;
   const selected='Tôi đã báo cáo rồi';
   const content=text.textContent;
   const start=content.indexOf(selected);
   if(start<0)throw Error('Selected subset missing');
   const range=document.createRange();
   range.setStart(text,start);range.setEnd(text,start+selected.length);
   const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
   const transfer=new DataTransfer();
   t.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer}));
   const card=document.querySelector('#planBox .pcard');
   card.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
   card.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
   return {selected:selection.toString(),transferred:transfer.getData('application/x-nhi-example')};
 });
 assert(dragPartial.transferred===dragPartial.selected,
   'Only the exact selected phrase should transfer, not the whole AI paragraph: '+JSON.stringify(dragPartial));
 await page.waitForFunction(id=>{
   const note=JSON.parse(localStorage.getItem('viko-plan-v1')).note?.[id]?.v?.text||'';
   return (note.match(/Tôi đã báo cáo rồi: 이미 보고했어요./g)||[]).length>=2;
 },{timeout:8000},cardID);
 await page.evaluate(()=>{window.NHI_CHAT_ADD_SELECTED=window.__originalSaveSelected;});
 console.log('THREE_EXAMPLE_PLUS_AND_DRAG',JSON.stringify({diagnostics,dragPartial}));
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
 assert(saved.width===moved.width&&saved.height===moved.height&&
   saved.offsetX===moved.offsetX&&saved.offsetY===moved.offsetY,
   'Resized image dimensions and vertical position did not survive reload: '+JSON.stringify({saved,moved}));
 assert(errors.length===0,'Page errors: '+errors.join('; '));
 // The previous deletion exercise advanced to another flashcard.
 // Toggle the CURRENT id twice, not the original image-fixture id.
 const toggleId=await page.$eval('#planBox .pcard',e=>e.dataset.item);
 await page.$eval('#planBox .pcard>.prate>.hard',e=>e.click());
 await page.waitForFunction(id=>!!JSON.parse(localStorage.getItem('viko-plan-v1')).hard?.[id]?.v,{},toggleId);
 const activeHard=await page.evaluate(id=>{
  const state=JSON.parse(localStorage.getItem('viko-plan-v1'));
  return {hard:state.hard?.[id]?.v,rate:state.rate?.[id]?.v};
 },toggleId);
 await page.$eval('#planBox .pcard>.prate>.hard',e=>e.click());
 const offHard=await page.evaluate(id=>{
  const state=JSON.parse(localStorage.getItem('viko-plan-v1'));
  return {hard:state.hard?.[id]?.v,rate:state.rate?.[id]?.v};
 },toggleId);
 assert(activeHard.hard&&!offHard.hard&&offHard.rate!=='hard',
  'Second Khó click must remove the same word from difficult cards: '+JSON.stringify({activeHard,offHard}));
 console.log('HARD_TWO_TAPS_TOGGLE',JSON.stringify({activeHard,offHard}));
 const dataStats=await page.evaluate(()=>({
  stats:window.NHI_PAIR_SEGMENT_STATS||null,
  sample:window.NHI_PAIR_SEGMENTS_V6&&Object.keys(window.NHI_PAIR_SEGMENTS_V6).length
 }));
 assert(dataStats.stats?.cards===2301&&dataStats.stats.lessons===51&&dataStats.sample>0,
   'All 51 lesson source files must be evaluated for finer VI KO phrase segments: '+JSON.stringify(dataStats));
 console.log('ALL_LESSON_SEGMENTATION',JSON.stringify(dataStats));
 const openEditor=await page.evaluate(()=>{
  const b=[...document.querySelectorAll('#planBox .card-top button')].find(x=>x.title?.startsWith('Sửa thẻ'));
  if(b)b.click();
  return !!b;
 });
 assert(openEditor,'No edit card action');
 await page.waitForSelector('#planBox form.nhi-editor-window-v5');
 const edit=await page.evaluate(()=>{
  const form=document.querySelector('#planBox form.nhi-editor-window-v5');
  const labels=[...form.querySelectorAll('.flabel>span')].map(x=>x.textContent);
  const core=form.querySelector('.nhi-editor-main-grid');
  const han=form.querySelector('.nhi-editor-hanja-last');
  const pair=form.querySelector('textarea[name="pairs"]');
  return {labels,core:!!core,hanLast:!!han&&han.compareDocumentPosition(pair)===Node.DOCUMENT_POSITION_PRECEDING,
    kind:!!form.querySelector('select[name="kind"]'),pairLabel:pair?.closest('label')?.textContent,
    gridColumns:core?getComputedStyle(core).gridTemplateColumns:null,
    pairValue:pair?.value.split('\n').slice(0,2)};
 });
 assert(edit.core&&edit.hanLast&&!edit.kind&&edit.pairLabel.includes('Phân tách Việt – Hàn')&&
  edit.gridColumns?.split(' ').length===2,
   'Editor should be two columns and Hanja at bottom, without word-kind select: '+JSON.stringify(edit));
 console.log('CARD_EDITOR_COMPACT',JSON.stringify(edit));
 await page.$eval('#planBox .nhi-editor-close-v5',e=>e.click());
 await page.waitForSelector('#planBox .pcard:not(:has(form.nhi-editor-window-v5))');
 // Reopen the translated side if closing the editor restored the card front.
 if(!await page.$('#planBox .nhi-english-v5')){
   await page.$eval('#planBox .pfront',e=>e.click());
 }
 await page.waitForSelector('#planBox .nhi-english-v5',{timeout:7000});
 // Check the English frame really fits short text rather than a fixed width.
 const fit=await page.evaluate(async()=>{
   const box=document.querySelector('#planBox .nhi-english-v5');
   const note=document.querySelector('#planBox .nhi-card-details .nhi-card-note');
   const t=box?.querySelector('.nhi-en-translation'),ipa=box?.querySelector('.nhi-en-ipa');
   if(!box||!t)return null;
   const before=box.getBoundingClientRect().width;
   const noteWidth=note?.getBoundingClientRect().width||0;
   const saved=t.innerHTML,wasHidden=ipa?.hidden;
   t.textContent='Hi';if(ipa)ipa.hidden=true;
   await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
   const short=box.getBoundingClientRect().width;
   const noteAfter=note?.getBoundingClientRect().width||0;
   t.innerHTML=saved;if(ipa)ipa.hidden=wasHidden;
   return {before,short,noteWidth,noteAfter,
     boxParent:box.parentElement?.className,
     noteParent:note?.parentElement?.className,
     paired:!!box.closest('.nhi-card-details')?.querySelector('.nhi-card-note'),
     inlineWidth:box.style.width,
     widthPriority:box.style.getPropertyPriority('width'),
     englishInline:box.getAttribute('style'),
     noteInline:note?.getAttribute('style'),
     detailsWidth:box.closest('.nhi-card-details')?.getBoundingClientRect().width,
     computedEnglish:getComputedStyle(box).width
   };
 });
 assert(fit && (fit.noteAfter ? Math.abs(fit.short-fit.noteAfter)<4 : fit.short<fit.before),
  'Short English entries must match Korean note width (or shrink when no note): '+JSON.stringify(fit));
 console.log('ENGLISH_CONTENT_WIDTH',JSON.stringify(fit));
 // Test the REAL translation helper with a mocked provider response; no
 // personal AI credentials and no live network calls are used by this test.
 const translated=await page.evaluate(async()=>{
   // The chat was closed/reloaded earlier; opening initializes AI provider options.
   window.NLC_AI.open(false);
   const form=document.getElementById('aiSetup');
   form.hidden=false;
   document.getElementById('aiProv').value='gemini';
   document.getElementById('aiKey').value='test-only-local-key';
   document.getElementById('aiModel').value='gemini-2.5-flash';
   form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   const original=window.fetch;
   let calls=0;
   window.fetch=function(url,options){
     if(String(url).includes('generativelanguage.googleapis.com')){
       calls++;
       const body={
         candidates:[{content:{parts:[{text:'Tiếng Việt: Tôi đang hoàn tất báo cáo.\nTiếng Hàn: 보고서를 마무리하고 있어요.'}]}}]
       };
       return Promise.resolve(new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}}));
     }
     return original.call(this,url,options);
   };
   try{
     const saved=await window.NLC_AI.saveSelectedExample('Ví dụ 1: Tôi đang hoàn tất báo cáo.');
     return {saved,calls};
   }finally{window.fetch=original;}
 });
 assert(translated.saved&&translated.calls===1,
   'AI-configured monolingual example must translate before note save: '+JSON.stringify(translated));
 await page.waitForFunction(id=>
   (JSON.parse(localStorage.getItem('viko-plan-v1')).note?.[id]?.v?.text||'')
    .includes('Tôi đang hoàn tất báo cáo: 보고서를 마무리하고 있어요.'),
   {timeout:7000},toggleId);
 console.log('AI_EXAMPLE_TRANSLATION_TO_NOTE',JSON.stringify(translated));
 console.log('SELECTABLE CHAT AND NOTES UX PASS',JSON.stringify({note,grid:[before,after],height:afterCorner.height,voice:true,anchor}));
}catch(err){
 console.error('ORIGINAL_SMOKE_ERROR',err&&err.stack||String(err));throw err;
}finally{try{await browser.close();}catch(e){console.error('SMOKE_CLOSE_ERROR',String(e));}}

/* Shared card editing, dictionary docks and continuous AI reading. */
(function(){
'use strict';
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function button(text,fn){const b=make('button','ghost',text);b.type='button';b.onclick=fn;return b;}
const palettes=[['#8edcfb','Xanh biển'],['#fce1ed','Hồng'],['#fff3c4','Vàng'],['#ffe4cc','Cam'],['#f7a8ad','Đỏ nhạt'],['#e6e0fa','Tím'],['#ddf4e4','Xanh lá']];
function icon(kind){
 const svg=kind==='headphones'?'<path d="M8 32v-7a24 24 0 0 1 48 0v7M13 25h5v29h-5a7 7 0 0 1-7-7V32a7 7 0 0 1 7-7zm38 0h-5v29h5a7 7 0 0 0 7-7V32a7 7 0 0 0-7-7z" fill="none" stroke="#00bda5" stroke-width="4"/><path d="M11 22a21 21 0 0 1 42 0" fill="none" stroke="#12bafa" stroke-width="3"/>':'<g stroke="#171717" stroke-width="3" stroke-linejoin="round"><path d="M9 45L44 10l12 12-35 35-16 4z" fill="#ffd343"/><path d="M44 10l4-4q4-4 8 0l6 6q4 4 0 8l-6 4z" fill="#ed493b"/><path d="M9 45l12 12-16 4z" fill="#f4cd7e"/><path d="M6 54l6 5-7 2z" fill="#4e4f55"/><path d="M15 48l34-34M20 53l34-34" fill="none"/></g>';
 return '<svg viewBox="0 0 68 68" aria-hidden="true" focusable="false">'+svg+'</svg>';
}
function dictionaryIcon(kind){return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="4" fill="#073dbb"/><text x="7" y="47" fill="#00ed68" font-family="Arial,sans-serif" font-size="43" font-weight="900">'+(kind==='ko-vi'?'V':'K')+'</text><g fill="white" font-family="sans-serif" font-size="14" font-weight="700"><text x="47" y="20">가</text><text x="47" y="37">あ</text><text x="47" y="54">文</text></g></svg>';}
let dock=null,dictWidth=480;
try{dictWidth=Number(localStorage.getItem('nhi-dictionary-width-v1'))||480;}catch(e){}
function setVar(name,value){if(document.documentElement.style.getPropertyValue(name)!==value)document.documentElement.style.setProperty(name,value);}
function layout(){
 const ai=document.body.classList.contains('ai-open'),di=document.body.classList.contains('dictionary-open');
 const desiredAI=parseFloat(document.documentElement.style.getPropertyValue('--nhi-ai-width'))||520;
 let a=ai?desiredAI:0,d=di?dictWidth:0;
 const available=Math.max(180,innerWidth-(innerWidth>=700?300:Math.round(innerWidth*.44)));
 if(a+d>available){const scale=available/(a+d);a*=scale;d*=scale;}
 setVar('--nhi-ai-effective',a+'px');
 setVar('--nhi-dict-effective',d+'px');
 setVar('--nhi-dock-width',(a+d)+'px');
 if(document.body.classList.contains('nhi-docked')!==(ai||di))document.body.classList.toggle('nhi-docked',ai||di);
}
function dictionary(word,kind){
 word=String(word||'').trim();if(!word)return;
 // Tap the same pink/blue bubble again to close its own dictionary.
 if(dock && !dock.hidden && document.body.classList.contains('dictionary-open')
    && dock.dataset.kind===kind && dock.dataset.word===word){
   dock.hidden=true;document.body.classList.remove('dictionary-open');layout();return;
 }
 const url=kind==='vi'?'https://vi.wiktionary.org/wiki/'+encodeURIComponent(word):
 kind==='en'?'https://vdict.com/'+encodeURIComponent(word)+',1,0,0.html':
 'https://korean.dict.naver.com/'+(kind==='ko-en'?'koendict':'kovidict')+'/#/search?query='+encodeURIComponent(word);
 if(!dock){
  dock=make('aside','nhi-dictionary-dock');dock.id='nhiDictionary';dock.setAttribute('aria-label','Cửa sổ từ điển');
  const grip=make('div','nhi-dict-resize');grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-label','Đổi độ rộng từ điển');grip.setAttribute('aria-orientation','vertical');
  const head=make('div','nhi-dialog-head'),title=make('strong');
  head.append(title); // Closing is exclusively through a second bubble tap; no × button.
  const link=make('a','nhi-dictionary-external');link.target='_blank';link.rel='noopener noreferrer';
  link.title='Mở từ điển trong tab mới';link.setAttribute('aria-label',link.title);
  link.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="nhiExternalBubble" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#6ed4ec"/><stop offset="1" stop-color="#39a9d8"/></linearGradient></defs><path d="M32 4C16 4 5 16 5 31c0 12 8 22 19 26l-1 5 12-5c13-1 24-12 24-26C59 16 47 4 32 4Z" fill="url(#nhiExternalBubble)"/><path d="M22 39 42 20M27 20h15v15" stroke="#17334c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  const hint=make('p','hint','Nếu trang từ điển chặn nhúng, bấm Mở riêng ↗.');
  const frame=make('iframe');frame.title='Từ điển';frame.referrerPolicy='no-referrer';
  dock.append(grip,head,link,hint,frame);document.body.append(dock);
  let drag=null;
  const persist=()=>{try{localStorage.setItem('nhi-dictionary-width-v1',String(dictWidth));}catch(e){}};
  grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={x:e.clientX,w:dock.getBoundingClientRect().width};grip.setPointerCapture(e.pointerId);};
  grip.onpointermove=e=>{if(!drag)return;dictWidth=Math.max(220,Math.min(innerWidth-260,drag.w+drag.x-e.clientX));layout();};
  grip.onpointerup=grip.onpointercancel=()=>{if(!drag)return;drag=null;persist();};
  grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();dictWidth=Math.max(220,Math.min(innerWidth-260,dictWidth+(e.key==='ArrowLeft'?24:-24)));persist();layout();};
 }
 dock.dataset.kind=kind;dock.dataset.word=word;
 dock.querySelector('strong').textContent=(kind==='vi'?'Từ điển tiếng Việt':kind==='en'?'VDict':kind==='ko-en'?'Naver Hàn–Anh':'Naver Hàn–Việt')+' · '+word;
 dock.querySelector('iframe').src=url;dock.querySelector('a').href=url;dock.hidden=false;document.body.classList.add('dictionary-open');layout();
}
function dictionaryButtons(root,value){
 const pair=make('div','nhi-dict-pair');pair.setAttribute('role','group');pair.setAttribute('aria-label','Từ điển Hàn–Việt và Hàn–Anh');
 const kinds=[['ko-vi','VN','#ff4770','#ff7592','Tra từ điển Hàn–Việt'],['ko-en','EN','#54bade','#86d9f0','Tra từ điển Hàn–Anh']];
 for(const [kind,word,dark,light,label] of kinds){
  const b=button('',()=>{
   if(b.disabled)return;
   const selected=String(value()||'').trim();if(!selected)return;
   if(dock && !dock.hidden && document.body.classList.contains('dictionary-open')
      && dock.dataset.kind===kind && dock.dataset.word===selected){
     dictionary(selected,kind);return;
   }
   const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
   if(reduce){dictionary(selected,kind);return;}
   b.disabled=true;b.classList.add('nhi-burst');
   for(let ring=0;ring<2;ring++){
    const wave=make('i','nhi-dict-shockwave');wave.setAttribute('aria-hidden','true');
    wave.style.left=(b.offsetLeft+b.offsetWidth/2)+'px';
    wave.style.top=(b.offsetTop+b.offsetHeight/2)+'px';
    wave.style.setProperty('--ring-delay',(ring*.13)+'s');
    wave.style.setProperty('--ring-color',kind==='ko-vi'?'#ff83aa':'#78d5f4');
    pair.append(wave);setTimeout(()=>wave.remove(),1000);
   }
   for(let i=0;i<42;i++){
    const spark=make('i','nhi-pop-spark');spark.setAttribute('aria-hidden','true');
    const angle=2*Math.PI*i/42,distance=42+(i%6)*15;
    spark.style.setProperty('--dx',Math.cos(angle)*distance+'px');
    spark.style.setProperty('--dy',Math.sin(angle)*distance+'px');
    spark.style.setProperty('--spark-color',i%4===0?'#fff7a0':i%3===0?'#ffffff':dark);spark.style.setProperty('--spark-size',(3+i%5*1.8)+'px');spark.style.setProperty('--spark-duration',(.55+(i%5)*.10)+'s');
    spark.style.left=(b.offsetLeft+b.offsetWidth/2)+'px';
    spark.style.top=(b.offsetTop+b.offsetHeight/2)+'px';
    pair.append(spark);setTimeout(()=>spark.remove(),1020);
   }
   setTimeout(()=>{dictionary(selected,kind);},530);
   setTimeout(()=>{b.classList.remove('nhi-burst');b.disabled=false;},970);
  });
  b.className='nhi-dict-bubble';b.dataset.dict=kind;
  b.title=label;b.setAttribute('aria-label',label);
  b.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M31 3C14 3 3 16 3 32c0 11 7 21 17 26l-2 5 14-6c17-1 29-12 29-28C61 14 48 3 31 3Z" fill="'+dark+'"/><path d="M17 19C23 12 32 10 39 11" stroke="'+light+'" stroke-width="5" stroke-linecap="round" opacity=".8" fill="none"/><text x="32" y="40" text-anchor="middle" fill="'+(kind==='ko-vi'?'#fff':'#14283f')+'" font-family="Arial,sans-serif" font-size="21" font-weight="800">'+word+'</text></svg>';
  // Keep the original plain bubble surface; glitter appears only during the pop.
  pair.append(b);
 }
 root.append(pair);
}
function wordElements(root,text){
 root.replaceChildren();for(const part of String(text).split(/([\p{L}\p{N}]+(?:['’'-][\p{L}\p{N}]+)*)/u)){
 if(/[\p{L}\p{N}]/u.test(part)){const word=make('span','nhi-en-word',part);word.tabIndex=0;word.setAttribute('role','button');word.title='Nhấn: sao chép · Nhấn đúp: tra VDict';
 const copy=async()=>{try{await navigator.clipboard.writeText(part);word.classList.add('copied');setTimeout(()=>word.classList.remove('copied'),700);}catch(e){const sel=getSelection(),range=document.createRange();range.selectNodeContents(word);sel.removeAllRanges();sel.addRange(range);}};
 word.onclick=e=>{e.stopPropagation();copy();};word.ondblclick=e=>{e.preventDefault();e.stopPropagation();dictionary(part,'en');};
 word.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();dictionary(part,'en');}if(e.key===' '){e.preventDefault();copy();}};root.append(word);
 }else root.append(document.createTextNode(part));}
}
function markText(root,ranges){
 if(!Array.isArray(ranges)||!ranges.length)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node,offset=0;
 while((node=walker.nextNode())){nodes.push({node,start:offset,end:offset+node.length});offset+=node.length;}
 for(const {node,start,end} of nodes){const cuts=new Set([start,end]);for(const r of ranges){if(r.start>start&&r.start<end)cuts.add(r.start);if(r.end>start&&r.end<end)cuts.add(r.end);}
 const points=[...cuts].sort((a,b)=>a-b),frag=document.createDocumentFragment();for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],span=make('span',null,node.data.slice(a-start,b-start));for(const r of ranges){if(r.start<=a&&r.end>=b){if(r.bold)span.style.fontWeight='800';if(r.underline)span.style.textDecoration='underline';if(/^#[0-9a-f]{6}$/i.test(r.color||'')){span.style.backgroundColor=r.color;span.style.color='#172b3a';span.style.borderRadius='3px';}}}frag.append(span);}node.replaceWith(frag);}
}
function formatText(root,format,lang){markText(root,format[lang]||[]);const size=Number((format._sizes||{})[lang]);if(size>=12&&size<=72)root.style.setProperty('font-size',size+'px','important');}
/* One toolbar, one directly editable surface per language; plain text remains the storage format. */
function editor(form,fields,saved,options={}){
 const draft=JSON.parse(JSON.stringify(saved||{}));draft._sizes=draft._sizes||{};draft._sizeEditedAt=draft._sizeEditedAt||{};
 const tools=make('div','nhi-format-tools');tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Định dạng chữ');
 const activeLabel=make('span','nhi-format-active');tools.append(activeLabel);
 const labels={ko:'Hàn',vi:'Việt',en:'Anh',note:'Ghi chú'};const views={};let active=Object.keys(fields)[0],selection={start:0,end:0},painting=false;
 function rangesToChars(lang){return Array.from({length:fields[lang].value.length},(_,i)=>{const style={};for(const r of draft[lang]||[])if(i>=r.start&&i<r.end)Object.assign(style,{...(r.bold?{bold:true}:{}),...(r.underline?{underline:true}:{}),...(r.color?{color:r.color}:{})});return style;});}
 function charsToRanges(chars){const ranges=[];for(let i=0;i<chars.length;i++){if(!Object.keys(chars[i]).length)continue;const last=ranges.at(-1),key=JSON.stringify(chars[i]);if(last&&last.end===i&&last.key===key)last.end++;else ranges.push({start:i,end:i+1,...chars[i],key});}return ranges.map(({key,...r})=>r);}
 function remember(){if(painting)return;const sel=getSelection(),view=views[active];if(!sel?.rangeCount||!view.contains(sel.anchorNode)||!view.contains(sel.focusNode))return;const r=sel.getRangeAt(0),before=r.cloneRange();before.selectNodeContents(view);before.setEnd(r.startContainer,r.startOffset);selection={start:before.toString().length,end:before.toString().length+r.toString().length};refresh();}
 function restore(){const view=views[active],walker=document.createTreeWalker(view,NodeFilter.SHOW_TEXT);let n,pos=0,start=null,end=null;while((n=walker.nextNode())){if(!start&&selection.start<=pos+n.length)start=[n,Math.max(0,selection.start-pos)];if(selection.end<=pos+n.length){end=[n,Math.max(0,selection.end-pos)];break;}pos+=n.length;}view.focus();if(start&&end){const r=document.createRange();r.setStart(...start);r.setEnd(...end);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);}}
 let englishResizeFrame=0;
 function resizeEnglishField(){
  const box=views.en;
  if(!box||!box.isConnected)return;
  box.style.setProperty('height','auto','important');
  const fit=Math.max(44,Math.ceil(box.scrollHeight));
  box.style.setProperty('height',fit+'px','important');
  box.style.setProperty('min-height','44px','important');
 }
 function queueEnglishResize(){
  if(englishResizeFrame)cancelAnimationFrame(englishResizeFrame);
  englishResizeFrame=requestAnimationFrame(()=>{englishResizeFrame=0;resizeEnglishField();});
 }
 function paint(lang,keep){
  painting=true;views[lang].textContent=fields[lang].value;
  formatText(views[lang],draft,lang);
  if(lang==='en')queueEnglishResize();
  if(keep)restore();painting=false;refresh();
 }
 function toggle(prop,value){remember();const a=selection.start,b=selection.end;if(a===b){if(active==='note'&&prop==='color'&&options.noteColor){options.noteColor.value=options.noteColor.value===value?'#ffffff':value;views.note.style.backgroundColor=options.noteColor.value;}restore();return;}const chars=rangesToChars(active),remove=chars.slice(a,b).every(c=>c[prop]===value);for(let i=a;i<b;i++){if(remove)delete chars[i][prop];else chars[i][prop]=value;}draft[active]=charsToRanges(chars);paint(active,true);}
 const bold=button('B',()=>toggle('bold',true));bold.title='In đậm / bỏ in đậm';bold.setAttribute('aria-label',bold.title);bold.style.fontWeight='800';
 const underline=button('U',()=>toggle('underline',true));underline.title='Gạch chân / bỏ gạch chân';underline.setAttribute('aria-label',underline.title);underline.style.textDecoration='underline';tools.append(bold,underline);
 const size=make('select');size.setAttribute('aria-label','Cỡ chữ phần đang sửa');for(let i=12;i<=72;i+=2){const o=make('option',null,i+'');o.value=i;size.append(o);}size.onchange=()=>{draft._sizes[active]=Number(size.value);if(active==='en')draft._sizeEditedAt.en=Date.now();paint(active,true);};tools.append(size);
 const colors=[];for(const [color,name] of palettes){const b=button('',()=>toggle('color',color));b.className='nhi-color-swatch';b.style.background=color;b.title=name+' / bỏ màu';b.setAttribute('aria-label',b.title);tools.append(b);colors.push([b,color]);}
 tools.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();});
 function refresh(){activeLabel.textContent=labels[active];size.value=String(draft._sizes[active]||parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nhi-card-'+active))||18);const chars=rangesToChars(active).slice(selection.start,selection.end),every=(p,v)=>chars.length>0&&chars.every(c=>c[p]===v);bold.setAttribute('aria-pressed',String(every('bold',true)));underline.setAttribute('aria-pressed',String(every('underline',true)));for(const [b,c]of colors)b.setAttribute('aria-pressed',String(every('color',c)));}
 // Insert real newline text nodes. Notes are saved as plain text, not HTML.
 function insertPlainText(view,text){
   const sel=window.getSelection();
   if(!sel)return;
   if(!sel.rangeCount||!view.contains(sel.anchorNode)){
     view.focus();const r=document.createRange();r.selectNodeContents(view);r.collapse(false);
     sel.removeAllRanges();sel.addRange(r);
   }
   const range=sel.getRangeAt(0);
   range.deleteContents();
   const node=document.createTextNode(String(text).replace(/\r\n?/g,'\n'));
   range.insertNode(node);range.setStartAfter(node);range.collapse(true);
   sel.removeAllRanges();sel.addRange(range);
   view.dispatchEvent(new Event('input',{bubbles:true}));
   remember();
 }
 for(const [lang,field]of Object.entries(fields)){
  const view=make('div','field nhi-rich-field');views[lang]=view;view.contentEditable='true';view.setAttribute('role','textbox');view.setAttribute('aria-multiline','true');view.setAttribute('aria-label',labels[lang]);view.dataset.language=lang;view.lang=lang==='note'?'ko':lang;view.spellcheck=false;
  field.hidden=true;field.setAttribute('aria-hidden','true');field.after(view);
  if(lang==='en'){
    // Allow natural line wrapping; short English remains 44px high.
    view.style.setProperty('min-height','44px','important');
    view.style.setProperty('max-height','none','important');
    view.style.setProperty('max-block-size','none','important');
    view.style.setProperty('height','auto','important');
    view.style.setProperty('block-size','auto','important');
    view.style.setProperty('box-sizing','border-box','important');
    view.style.setProperty('overflow-x','hidden','important');
    view.style.setProperty('overflow-y','hidden','important');
    view.style.setProperty('white-space','pre-wrap','important');
    view.style.setProperty('overflow-wrap','anywhere','important');
    view.style.setProperty('word-break','normal','important');
    view.style.setProperty('padding','8px 11px','important');
    view.style.setProperty('line-height','24px','important');
    view.style.setProperty('resize','none','important');
    requestAnimationFrame(queueEnglishResize);
    if(view.parentElement&&typeof ResizeObserver!=='undefined'){
      let previousWidth=0;
      const observer=new ResizeObserver(entries=>{
        const width=Math.round(entries[0]?.contentRect?.width||0);
        // Observe width changes only, not the height caused by our own resize.
        if(width>0&&width!==previousWidth){
          previousWidth=width;
          queueEnglishResize();
        }
      });
      observer.observe(view.parentElement);
    }
  }
  view.addEventListener('focus',()=>{if(active!==lang){active=lang;selection={start:0,end:0};}refresh();});
  view.addEventListener('keyup',remember);view.addEventListener('pointerup',remember);
  view.addEventListener('input',()=>{active=lang;const old=field.value,text=view.textContent.replace(/\r/g,'');let prefix=0;while(prefix<old.length&&prefix<text.length&&old[prefix]===text[prefix])prefix++;let suffix=0;while(suffix<old.length-prefix&&suffix<text.length-prefix&&old[old.length-1-suffix]===text[text.length-1-suffix])suffix++;const chars=rangesToChars(lang),insert=text.length-prefix-suffix,style=chars[Math.max(0,prefix-1)]||{};chars.splice(prefix,old.length-prefix-suffix,...Array.from({length:insert},()=>({...style})));draft[lang]=charsToRanges(chars);field.value=text;if(lang==='en')queueEnglishResize();remember();});
  view.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&['b','u'].includes(e.key.toLowerCase())){
      e.preventDefault();remember();toggle(e.key.toLowerCase()==='b'?'bold':'underline',true);
    }
    if(e.key==='Enter'){e.preventDefault();insertPlainText(view,'\n');}
   });
   view.addEventListener('beforeinput',e=>{
     if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak'){
       e.preventDefault();insertPlainText(view,'\n');
     }
   });
  view.addEventListener('paste',e=>{e.preventDefault();insertPlainText(view,e.clipboardData.getData('text/plain'));});
  paint(lang,false);
 }
 if(options.noteColor&&views.note)views.note.style.backgroundColor=options.noteColor.value;
 fields[Object.keys(fields)[0]].parentElement.before(tools);
 document.addEventListener('selectionchange',remember); // Detached forms are ignored by containment checks.
 return ()=>draft;
}
let audioContext;
function feedback(kind){try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});const now=audioContext.currentTime;(kind==='hard'?[330,261,196]:[392,440]).forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=now+i*.13;o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.22);});}catch(e){}}
function initReader(){
 // Keep readable, selectable AI paragraphs and their optional note shortcut.
 // No voice activation on a double click, double tap, or keyboard press.
 const log=document.getElementById('aiLog');
 if(!log)return;
 function mount(){
  for(const msg of log.querySelectorAll('.aimsg.ai:not(.wait)')){
   if(msg.dataset.readerMounted)continue;
   msg.dataset.readerMounted='true';
   const source=msg.cloneNode(true);
   const links=[...source.querySelectorAll('a')].map(a=>{const link=a.cloneNode(true);a.remove();return link;});
   const paragraphs=source.innerHTML.split(/<br\s*\/?\s*>|\n+/i);
   msg.replaceChildren();
   for(const paragraph of paragraphs){
    const text=make('span','nhi-ai-paragraph-text');
    text.innerHTML=paragraph;
    if(!text.textContent.trim())continue;
    const p=make('div','nhi-ai-paragraph');
    p.append(text);
    msg.append(p);
   }
   for(const link of links)msg.append(link);
  }
 }
 new MutationObserver(mount).observe(log,{childList:true});
 mount();
}
function init(){
 initReader();
 const settings=document.getElementById('nhiCardFontSettings');
 const defaults={ko:36,vi:26,en:22};
 const controls={};
 const globalKey='nhi-card-global-font-scale-v1';
 const globalTypographyKey='nhi-card-global-language-fonts-v1';
 const enRevisionKey='nhi-card-global-en-revision-v1';
 const allowable=[.75,.85,1,1.1,1.2,1.3,1.5];
 let globalScale=1;
 try{const value=Number(localStorage.getItem(globalKey));if(allowable.includes(value))globalScale=value;}catch(e){}
 const globalTypography={ko:36,viFront:26,viBack:22,en:22,bold:false};
 try{
   const stored=JSON.parse(localStorage.getItem(globalTypographyKey)||'{}');
   for(const key of ['ko','viFront','viBack','en']){
     const n=Number(stored[key]);if(Number.isFinite(n)&&n>=12&&n<=72)globalTypography[key]=n;
   }
   globalTypography.bold=stored.bold===true;
 }catch(e){}
 const applyGlobal=()=>{
   const root=document.documentElement;
   root.style.setProperty('--nhi-global-font-scale',String(globalScale));
   const sizes={
     ko:globalTypography.ko,viFront:globalTypography.viFront,
     viBack:globalTypography.viBack,en:globalTypography.en
   };
   for(const [key,val] of Object.entries(sizes)){
     const prop={ko:'--nhi-effective-ko',viFront:'--nhi-effective-vi-front',
       viBack:'--nhi-effective-vi-back',en:'--nhi-effective-en'}[key];
     root.style.setProperty(prop,Math.round(val*globalScale*10)/10+'px');
   }
   root.style.setProperty('--nhi-effective-ipa',
     Math.round(globalTypography.en*globalScale*.86*10)/10+'px');
   document.body.classList.toggle('nhi-global-card-bold',globalTypography.bold);
   // Recalculate the English card and both comparison choices immediately
   // after a GLOBAL font change; otherwise they keep their previous pixel width.
   if(window.NHI_ENGLISH?.refit)window.NHI_ENGLISH.refit();
 };
 applyGlobal();
 if(settings){
   const h=settings.querySelector('h3');
   if(h)h.textContent='Cỡ chữ của thẻ đang học';
   const hint=make('p','voice-note','Cỡ chữ của thẻ chỉ lưu trên thiết bị này. Điện thoại và laptop có thể dùng kích thước khác nhau; nội dung và tiến độ học vẫn đồng bộ.');
   settings.append(hint);
   const row=make('div','setrow nhi-global-font-row');
   const label=make('label',null,'Cỡ chữ toàn bộ thẻ (mặc định)');
   const select=make('select');select.id='nhiGlobalFontSize';
   select.className='field small';
   select.setAttribute('aria-label','Cỡ chữ chung cho các thẻ chưa chỉnh riêng');
   label.htmlFor=select.id;
   for(const scale of allowable){
     const option=make('option',null,Math.round(scale*100)+'%');
     option.value=String(scale);select.append(option);
   }
   select.value=String(globalScale);
   select.addEventListener('change',()=>{
     globalScale=Number(select.value)||1;applyGlobal();
     try{localStorage.setItem(globalKey,String(globalScale));}catch(e){}
     document.dispatchEvent(new Event('nhi:card-font-selected'));
   });
   row.append(label,select);settings.prepend(row);
   const globalHint=make('p','voice-note',
     'Cỡ chữ và in đậm mặc định chỉ lưu trên thiết bị này, không làm thay đổi máy khác. Các chỉnh sửa riêng sau đó vẫn được giữ.');
   row.after(globalHint);
   const defaultGroup=make('div','nhi-global-language-sizes');
   defaultGroup.append(make('h4','nhi-v8-heading','Cỡ chữ mặc định theo ngôn ngữ'));
   const specs=[
     ['ko','Tiếng Hàn'],['viFront','Tiếng Việt — mặt trước'],
     ['viBack','Tiếng Việt — mặt sau'],['en','Tiếng Anh (gồm Đối chiếu)']
   ];
   for(const [key,name] of specs){
     const field=make('div','setrow nhi-global-font-row');
     const caption=make('label',null,name);
     const choice=make('select','field small');
     choice.id='nhiAllFont-'+key;
     caption.htmlFor=choice.id;
     choice.setAttribute('aria-label','Cỡ chữ chung: '+name);
     for(let n=12;n<=72;n+=2){
       const o=make('option',null,n+' px');o.value=String(n);choice.append(o);
     }
     choice.value=String(globalTypography[key]);
     choice.addEventListener('change',()=>{
       globalTypography[key]=Number(choice.value);
       try{
         localStorage.setItem(globalTypographyKey,JSON.stringify(globalTypography));
         if(key==='en')localStorage.setItem(enRevisionKey,String(Date.now()));
       }catch(e){}
       applyGlobal();
       document.dispatchEvent(new Event('nhi:card-font-selected'));
     });
     field.append(caption,choice);defaultGroup.append(field);
   }
   const boldRow=make('div','setrow nhi-global-font-row');
   const boldLabel=make('label',null,'In đậm chữ tiếng Anh trên tất cả thẻ');
   const boldBox=make('input');boldBox.type='checkbox';boldBox.id='nhiAllFontBold';
   boldBox.checked=globalTypography.bold;
   boldBox.addEventListener('change',()=>{
     globalTypography.bold=boldBox.checked;
     try{localStorage.setItem(globalTypographyKey,JSON.stringify(globalTypography));}catch(e){}
     applyGlobal();
   });
   boldLabel.htmlFor=boldBox.id;boldRow.append(boldLabel,boldBox);
   defaultGroup.append(boldRow);
   globalHint.after(defaultGroup);
 }
 let koReadout=null;
  for(const [lang,label] of [['ko','Tiếng Hàn — mặt sau'],['vi','Tiếng Việt'],['en','Tiếng Anh']]){
   const row=make('div','setrow'),lab=make('label',null,label),select=make('select');
   select.id='nhiFont-'+lang;select.setAttribute('aria-label','Cỡ chữ '+label+' của thẻ đang học');
   lab.htmlFor=select.id;
   for(let n=12;n<=72;n++){const option=make('option',null,n+' px');option.value=String(n);select.append(option);}
   select.value=String(defaults[lang]);
   select.onchange=()=>document.dispatchEvent(new CustomEvent('nhi:card-font-change',
     {detail:{lang,size:Number(select.value)}}));
   controls[lang]=select;row.append(lab,select);
    if(lang==='ko'){
      row.classList.add('nhi-ko-size-setting-row');
      const quick=make('div','nhi-ko-size-touch-controls');
      const smaller=make('button','ghost','A−'),larger=make('button','ghost','A+');
      smaller.type='button';larger.type='button';
      smaller.setAttribute('aria-label','Giảm cỡ chữ tiếng Hàn ở mặt sau');
      larger.setAttribute('aria-label','Tăng cỡ chữ tiếng Hàn ở mặt sau');
      koReadout=make('output','nhi-ko-size-readout',select.value+' px');
      koReadout.setAttribute('aria-live','polite');
      const adjust=step=>{
        const current=Number(select.value)||defaults.ko;
        const next=Math.max(12,Math.min(72,current+step));
        if(next===current)return;
        select.value=String(next);
        select.dispatchEvent(new Event('change',{bubbles:true}));
      };
      smaller.addEventListener('click',()=>adjust(-2));
      larger.addEventListener('click',()=>adjust(2));
      select.addEventListener('change',()=>{koReadout.textContent=select.value+' px';});
      quick.append(smaller,koReadout,larger);
      row.append(quick);
    }
    settings?.append(row);
 }
 const syncFontControls=()=>{
   const card=document.querySelector('#planBox .pcard[data-nhi-card-id]');
   let saved={};
   try{saved=JSON.parse(card?.dataset.nhiFontSizes||'{}')||{};}catch(e){}
   for(const lang in controls){
     const value=Number(saved[lang])||
       Math.max(12,Math.min(72,Math.round(defaults[lang]*globalScale/2)*2));
     if(controls[lang].value!==String(value))controls[lang].value=String(value);
      if(lang==='ko'&&koReadout)koReadout.textContent=value+' px';
   }
 };
 document.addEventListener('nhi:card-font-selected',syncFontControls);
 syncFontControls();
 new MutationObserver(layout).observe(document.body,{attributes:true,attributeFilter:['class']});new MutationObserver(layout).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
 window.addEventListener('resize',layout);layout();
 document.dispatchEvent(new Event('nhi-study-ready'));
}
window.NHI_STUDY={dictionary,dictionaryButtons,wordElements,markText,formatText,editor,feedback,icon};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

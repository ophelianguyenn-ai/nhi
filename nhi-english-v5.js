/* English meaning, IPA and English speech for Nhi cards. */
(function(){
'use strict';
const STORE='nhi-english-edits-v5';
let edits={};try{edits=JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(e){}
let data=window.NHI_ENGLISH_PRELOADED||null,once=null;
const clean=s=>String(s||'').trim();

/* Match dynamic daily-card content against the already pretranslated lesson corpus;
   for genuinely new content, translate on first view and cache by text. */
const AUTO_STORE='nhi-english-bytext-v1';
let byText={};try{byText=JSON.parse(localStorage.getItem(AUTO_STORE)||'{}')||{};}catch(e){}
const normalize=s=>clean(s).normalize('NFC').toLowerCase().replace(/\s+/g,' ').replace(/[.!?。？！]+$/,'').trim();
const entryKey=(vi,ko)=>normalize(vi)+'\u001f'+normalize(ko);

const REVIEW_KEY='nhi-english-reviewed-v1';
let reviewCache={};try{reviewCache=JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}')||{};}catch(e){}
function numbers(x){return (clean(x).replace(/,/g,'.').match(/\d+(?:\.\d+)?/g)||[]).map(t=>''+Number(t));}
function suspect(en,vi,ko){
 const x=clean(en),v=clean(vi),k=clean(ko);
 if(!x)return true;
 if(/^(test result|translation result|hello|undefined|null|n\/a|error|too many requests)$/i.test(x)&&!/(kết quả|thử nghiệm|kiểm tra|결과|시험|검사|테스트)/i.test(v+' '+k))return true;
 if(v.length>35&&x.split(/\s+/).length<3)return true;
 if(numbers(v).some(t=>!numbers(x).includes(t)))return true;
 const tags=v.match(/\b(?:R|T|S|P|HE|EV|AG|CT)-\d{2,4}[A-Z]?(?:\/[A-Z])?\b/gi)||[];
 if(tags.some(t=>x.toUpperCase().indexOf(t.toUpperCase())===-1))return true;
 return false;
}
function verifiedEntry(id,vi,ko){
 const record=edits[id]||(data&&data[id]);
 if(!record)return null;
 if(['manual','editorial','verified'].includes(record.source)||!suspect(record.en,vi,ko))return record;
 if(edits[id]){delete edits[id];try{localStorage.setItem(STORE,JSON.stringify(edits));}catch(e){}}
 return null;
}
async function independentTranslation(text,language){
 const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl='+language+'&tl=en&dt=t&q='+encodeURIComponent(text);
 const res=await fetch(url,{mode:'cors',cache:'no-store'});if(!res.ok)throw Error('Dịch vụ đối chiếu đang lỗi.');
 const data=await res.json();return clean((data&&data[0]||[]).map(p=>p&&p[0]||'').join(''));
}
const CHOICE_KEY='nhi-english-primary-v1';
let choices={};try{choices=JSON.parse(localStorage.getItem(CHOICE_KEY)||'{}')||{};}catch(e){}
function suppliedComparison(vi,ko){
 return normalize(vi)==='đã được phê duyệt cuối cùng'&&normalize(ko)==='최종 승인을 받았습니다' ? {vi:'Final approval has been given',ko:'Final approval has been received'} : null;
}
function comparisonRows(box,id,vi,ko){
 let holder=box.querySelector('.nhi-en-choices');
 if(!holder){holder=document.createElement('div');holder.className='nhi-en-choices';box.querySelector('.nhi-en-status').before(holder);}
 holder.replaceChildren();
 let result=reviewCache[entryKey(vi,ko)]||suppliedComparison(vi,ko);
 // Recover the two alternatives saved by the older, long comparison notice.
 if(typeof result==='string'){
  const match=result.match(/tiếng Việt: “(.*?)”; từ tiếng Hàn: “(.*?)”/);
  result=match?{vi:match[1],ko:match[2]}:null;
 }
 if(!result||typeof result!=='object')return;
 for(const [lang,flag] of [['vi','🇻🇳'],['ko','🇰🇷']]){
  if(!clean(result[lang]))continue;
  const button=document.createElement('div');button.className='nhi-en-choice';
  const active=clean((choices[entryKey(vi,ko)]||{}).en)===result[lang];
  button.setAttribute('aria-pressed',String(active));
  button.title='Chọn bản dịch từ '+(lang==='vi'?'tiếng Việt':'tiếng Hàn')+' làm tiếng Anh chính';
  const text=document.createElement('span');text.className='nhi-comparison-choice-text';text.textContent='“'+result[lang]+'”';
  const action=document.createElement('input');action.type='checkbox';action.checked=active;action.setAttribute('aria-label','Chọn bản dịch từ '+(lang==='vi'?'tiếng Việt':'tiếng Hàn'));
  const flagIcon=document.createElement('span');flagIcon.className='nhi-comparison-flag';flagIcon.textContent=flag;flagIcon.setAttribute('aria-label',lang==='vi'?'Từ tiếng Việt':'Từ tiếng Hàn');
  if(window.NHI_STUDY)window.NHI_STUDY.wordElements(text,result[lang]);
  // Do not inherit a centered alignment from the photo-card text stack.
  // Inline important covers both selected and unselected comparisons.
  button.style.setProperty('text-align','left','important');
  text.style.setProperty('text-align','left','important');
  text.style.setProperty('display','block','important');
  text.querySelectorAll('.nhi-en-word').forEach(word=>{
    word.style.setProperty('display','inline','important');
    word.style.setProperty('text-align','left','important');
  });
  const checkLabel=document.createElement('label');checkLabel.className='nhi-choice-check';checkLabel.append(action);
   button.append(flagIcon,text,checkLabel);action.onchange=()=>{
   const key=entryKey(vi,ko),previous=choices[key];
   if(action.checked)choices[key]={en:result[lang],ipa:'',source:'comparison',language:lang};else delete choices[key];
   try{localStorage.setItem(CHOICE_KEY,JSON.stringify(choices));}
   catch(e){if(previous)choices[key]=previous;else delete choices[key];box.querySelector('.nhi-en-status').textContent='Không lưu được lựa chọn.';return;}
   display(box,verifiedEntry(id,vi,ko),id,vi,ko);
  };
  holder.appendChild(button);
 }
 const original=verifiedEntry(id,vi,ko);
 if(false&&choices[entryKey(vi,ko)]&&original){
  const restore=document.createElement('button');restore.type='button';restore.className='nhi-en-original';restore.textContent='↩ Bản gốc';restore.title=original.en;
  restore.onclick=()=>{
   const key=entryKey(vi,ko),previous=choices[key];delete choices[key];
   try{localStorage.setItem(CHOICE_KEY,JSON.stringify(choices));}catch(e){choices[key]=previous;box.querySelector('.nhi-en-status').textContent='Không lưu được lựa chọn.';return;}
   display(box,original,id,vi,ko);
  };holder.appendChild(restore);
 }
}
async function checkMeaning(box,id,vi,ko){
 const status=box.querySelector('.nhi-en-status'),btn=box.querySelector('.nhi-en-review');
 const supplied=suppliedComparison(vi,ko);
 if(supplied){reviewCache[entryKey(vi,ko)]=supplied;status.textContent='';comparisonRows(box,id,vi,ko);return;}
 btn.disabled=true;status.textContent='Đang đối chiếu…';
 try{
  const [v,k]=await Promise.all([independentTranslation(vi,'vi'),independentTranslation(ko,'ko')]);
  if(!v||!k)throw Error('Chưa có đủ hai bản dịch');
  reviewCache[entryKey(vi,ko)]={vi:v,ko:k};
  try{localStorage.setItem(REVIEW_KEY,JSON.stringify(reviewCache));}catch(e){}
  status.textContent='';comparisonRows(box,id,vi,ko);
 }catch(e){status.textContent='Chưa đối chiếu được. Thử lại sau.';}
 finally{btn.disabled=false;}
}

let corpus=null,corpusPromise=null;
const inFlight=new Map();
function cacheEntry(id,vi,ko,entry){
 if(!entry||!clean(entry.en)||((entry.source==='online'||entry.source==='online-google'||entry.source==='machine')&&suspect(entry.en,vi,ko)))return;
 delete reviewCache[entryKey(vi,ko)];
 try{localStorage.setItem(REVIEW_KEY,JSON.stringify(reviewCache));}catch(e){}
 edits[id]=entry;
 try{localStorage.setItem(STORE,JSON.stringify(edits));}catch(e){}
 const key=entryKey(vi,ko);
 byText[key]=entry;
 try{
  const keys=Object.keys(byText);if(keys.length>400)keys.slice(0,keys.length-400).forEach(k=>delete byText[k]);
  localStorage.setItem(AUTO_STORE,JSON.stringify(byText));
 }catch(e){}
}
function indexCorpus(){
 if(corpus)return Promise.resolve(corpus);
 if(!corpusPromise)corpusPromise=fetch(new URL('lessons.json',document.baseURI),{cache:'force-cache'})
  .then(r=>{if(!r.ok)throw Error('Lesson index unavailable');return r.json();})
  .then(j=>{
   const exact=new Map(),byVi=new Map();
   (j.lessons||[]).forEach(L=>(L.items||[]).forEach(row=>{
    const entry=data&&data[row[0]];
    if(!entry||!clean(entry.en))return;
    exact.set(entryKey(row[3],row[4]),entry);
    const key=normalize(row[3]),previous=byVi.get(key);
    if(!previous)byVi.set(key,entry);
    else if(clean(previous.en)!==clean(entry.en))byVi.set(key,{ambiguous:true});
   }));
   corpus={exact,byVi};return corpus;
  }).catch(()=>{corpus={exact:new Map(),byVi:new Map()};return corpus;});
 return corpusPromise;
}
function cachedMeaning(vi,ko,dict){
 const key=entryKey(vi,ko),text=byText[key];
 if(text&&clean(text.en)&&!suspect(text.en,vi,ko))return text;
 if(text){delete byText[key];try{localStorage.setItem(AUTO_STORE,JSON.stringify(byText));}catch(e){}}
 const exact=dict.exact.get(key);
 if(exact&&!suspect(exact.en,vi,ko))return exact;
 const approx=dict.byVi.get(normalize(vi));
 return approx&&!approx.ambiguous&&!suspect(approx.en,vi,ko)?approx:null;
}
async function onlineTranslation(vi){
 // Read the lesson corpus first. Only genuinely new text needs an online call.
 // MyMemory accepts at most 500 UTF-8 BYTES per request (Vietnamese accents count).
 const text=clean(vi),chunks=[];let rest=text;
 const bytes=s=>new TextEncoder().encode(s).length;
 while(rest){
  if(chunks.length>=16)throw Error('Câu quá dài để tự dịch.');
  let cut=Math.min(360,rest.length);
  while(cut>1&&bytes(rest.slice(0,cut))>460)cut-=Math.max(1,Math.ceil(cut/12));
  if(cut<rest.length){const last=rest.lastIndexOf(' ',cut);if(last>Math.floor(cut/2))cut=last;}
  chunks.push(rest.slice(0,cut));rest=rest.slice(cut).trim();
 }
 async function fromMyMemory(){
  const outputs=[];
  for(const chunk of chunks){
   const url='https://api.mymemory.translated.net/get?langpair=vi%7Cen&q='+encodeURIComponent(chunk);
   const response=await fetch(url,{method:'GET',mode:'cors',cache:'no-store'});
   if(!response.ok)throw Error('MyMemory HTTP '+response.status);
   const result=await response.json();
   const translated=clean(result&&result.responseData&&result.responseData.translatedText);
   if(!translated||Number(result.responseStatus||200)!==200||suspect(translated,chunk,''))throw Error('MyMemory trả về kết quả sai hoặc hết hạn mức.');
   outputs.push(translated);
  }
  return {en:clean(outputs.join(' ')),ipa:'',source:'online'};
 }
 async function fromGoogle(){
  // Unofficial public endpoint: secondary fallback, subject to provider availability.
  const outputs=[];
  for(const chunk of chunks){
   const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q='+encodeURIComponent(chunk);
   const response=await fetch(url,{method:'GET',mode:'cors'});
   if(!response.ok)throw Error('Google Translate HTTP '+response.status);
   const result=await response.json();
   const translated=clean(Array.isArray(result&&result[0])?result[0].map(part=>part&&part[0]||'').join(''):'');
   if(!translated||suspect(translated,chunk,''))throw Error('Google Translate không trả về kết quả đạt kiểm tra.');
   outputs.push(translated);
  }
  return {en:clean(outputs.join(' ')),ipa:'',source:'online-google'};
 }
 let result;
 try{result=await fromMyMemory();}
 catch(firstError){
  try{result=await fromGoogle();}
  catch(secondError){throw Error('MyMemory và dịch vụ dự phòng đều không khả dụng.');}
 }
 if(!clean(result.en)||normalize(result.en)===normalize(text))throw Error('Chưa nhận được bản dịch tiếng Anh khác nội dung gốc.');
 return result;
}
async function resolveAutomatic(id,vi,ko,box){
 if(verifiedEntry(id,vi,ko))return;
 const key=entryKey(vi,ko);
 try{
  const dict=await indexCorpus(),found=cachedMeaning(vi,ko,dict);
  if(found){
   cacheEntry(id,vi,ko,found);
   if(box&&box.isConnected)display(box,found,id,vi,ko);
   return;
  }
  let promise=inFlight.get(key);
  if(!promise){
   promise=onlineTranslation(vi).finally(()=>inFlight.delete(key));
   inFlight.set(key,promise);
  }
  const result=await promise;
  if(suspect(result.en,vi,ko))throw Error('Bản dịch không qua kiểm tra số liệu.');
  cacheEntry(id,vi,ko,result);
  if(box&&box.isConnected)display(box,result,id,vi,ko);
 }catch(e){
  if(box&&box.isConnected&&!clean((edits[id]||{}).en)){
   const status=box.querySelector('.nhi-en-status');
   if(status)status.textContent='Chưa lấy được bản dịch tự động ('+String(e.message||e).slice(0,100)+'). Có thể dùng Dịch lại hoặc Sửa.';
  }
 }
}

function load(){
 if(data && Object.keys(data).length)return Promise.resolve(data);
 if(!once)once=fetch(new URL('english.json',document.baseURI),{cache:'no-cache'}).then(r=>{
  if(!r.ok)throw Error('No English dataset');
  return r.json();
 }).then(j=>{data=j.cards||{};return data;}).catch(()=>{data={};return data;});
 return once;
}
async function speakEnglish(t){
 if(!t)return;
 if(window.NHI_SPEECH)return window.NHI_SPEECH.speak(t,'en-US');
 if(window.NHI_AUDIO){await window.NHI_AUDIO.ready;if(window.NHI_AUDIO.play(t,'en',1))return;}
}

/* English IPA rule: 1–5 words (inclusive) are eligible; 6+ are hidden.
   Prefer curated IPA stored for a whole phrase. For missing short phrases,
   compose genuine phonetics obtained from dictionary entries, not guesses. */
const ipaLookupCache=new Map();
const englishTokens=value=>clean(value).match(/[A-Za-z]+(?:[-'’][A-Za-z]+)*/g)||[];
const eligibleForIPA=value=>{
 const count=englishTokens(value).length;
 return count>0&&count<=5;
};
const trimmedIPA=value=>clean(value).replace(/^\/+|\/+$/g,'').trim();
let preloadedIPAWords=null;
function corpusWordIPAs(){
 if(preloadedIPAWords)return preloadedIPAWords;
 const map=new Map();
 for(const row of Object.values(data||{})){
  const words=englishTokens(row?.en);
  if(words.length!==1||!clean(row?.ipa))continue;
  const key=words[0].toLowerCase();
  if(!map.has(key))map.set(key,trimmedIPA(row.ipa));
 }
 preloadedIPAWords=map;
 return map;
}
async function verifiedWordIPA(word){
 const key=word.toLowerCase();
 const known=corpusWordIPAs().get(key);
 if(known)return known;
 if(ipaLookupCache.has(key))return ipaLookupCache.get(key);
 const promise=(async()=>{
  const response=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(key));
  if(!response.ok)return '';
  const entries=await response.json();
  const row=Array.isArray(entries)?entries[0]:null;
  return trimmedIPA(clean(row?.phonetic)||clean(row?.phonetics?.find(p=>clean(p.text))?.text));
 })().catch(()=>'');
 ipaLookupCache.set(key,promise);
 const result=await promise;
 if(result)ipaLookupCache.set(key,Promise.resolve(result));
 else ipaLookupCache.delete(key);
 return result;
}
async function showShortPhraseIPA(box,english,revision){
 const words=englishTokens(english);
 if(!words.length||words.length>5)return;
 try{
  const sounds=await Promise.all(words.map(verifiedWordIPA));
  if(sounds.some(sound=>!sound))return;
  const label=box.querySelector('.nhi-en-ipa');
  if(!label||box._ipaRevision!==revision||label.dataset.manual==='true')return;
  if(!eligibleForIPA(english)||clean(box._englishText)!==clean(english))return;
  label.textContent='/'+sounds.join(' ')+'/';
  label.title=words.length>1?'Phiên âm ghép từ IPA từng từ, có thể chỉnh sửa ở Cài đặt thẻ':'Phiên âm IPA tiếng Anh';
  label.hidden=false;
 }catch(_e){/* Offline: keep transcription blank instead of guessing. */}
}
function applyEnglishFont(box){
 const translation=box?.querySelector('.nhi-en-translation');
 if(!translation)return;
 const source=box._format||{},entrySource=box._entryFormat||{};
 const local=Number(source._sizes?.en||entrySource._sizes?.en);
 const localUpdated=Number(source._sizeEditedAt?.en||entrySource._sizeEditedAt?.en||0);
 let globalUpdated=0;
 try{globalUpdated=Number(localStorage.getItem('nhi-card-global-en-revision-v1')||0);}catch(e){}
 const rootSize=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nhi-effective-en'));
 const globalSize=Number.isFinite(rootSize)&&rootSize>=12?rootSize:22;
 const chosen=local>=12&&local<=72&&(!globalUpdated||localUpdated>globalUpdated)?local:globalSize;
 // Explicit inline important size wins over old CSS and nested note styles.
 translation.style.setProperty('font-size',chosen+'px','important');
 // Global English bold must be reversible, including selectable word spans.
 // Explicit !important styles win over legacy CSS in both toggle states.
 const englishWeight=document.body.classList.contains('nhi-global-card-bold')?'800':'400';
 translation.style.setProperty('font-weight',englishWeight,'important');
 translation.querySelectorAll('.nhi-en-word').forEach(word=>{
   word.style.setProperty('font-size','inherit','important');
   word.style.setProperty('font-weight',englishWeight,'important');
 });
 box.querySelectorAll('.nhi-comparison-choice-text,.nhi-comparison-choice-text .nhi-en-word').forEach(node=>{
   node.style.setProperty('font-weight',englishWeight,'important');
 });
 box.style.setProperty('--nhi-comparison-english-size',chosen+'px');
 box.dataset.nhiEnglishFontPx=String(chosen);
}
function display(box,entry,id,vi,ko){
 // Cards are constructed off-DOM, then appended; populate immediately.
 // isConnected is false during the first render, even though the box is valid.
 if(!box)return;
 entry=choices[entryKey(vi,ko)]||entry;
 box._entryFormat=(entry&&entry.format)||{};
 const en=clean(entry&&entry.en),ipa=clean(entry&&entry.ipa);
 const translation=box.querySelector('.nhi-en-translation');translation.textContent=en||'Đang chuẩn bị bản dịch tiếng Anh…';if(en&&window.NHI_STUDY){window.NHI_STUDY.wordElements(translation,en);window.NHI_STUDY.formatText(translation,{
  ...(entry?.format||{}),...(box._format||{}),
  _sizes:{...((entry?.format||{})._sizes||{}),...((box._format||{})._sizes||{})}
 },'en');}
 applyEnglishFont(box);
 const englishWordCount=englishTokens(en).length;
 box.classList.toggle('nhi-ipa-below',englishWordCount>=3);
 // Preserve an unbroken line for English meanings of exactly three words.
 box.classList.toggle('nhi-en-three-words',englishWordCount===3);
  // IPA eligibility is checked from word count every time a card rerenders.
  const span=box.querySelector('.nhi-en-ipa');
  const eligible=eligibleForIPA(en);
  box._englishText=en;
  box._ipaRevision=(box._ipaRevision||0)+1;
  span.dataset.manual=ipa?'true':'false';
  span.title='';
  span.textContent=eligible&&ipa?'/'+trimmedIPA(ipa)+'/':'';
  span.hidden=!eligible||!ipa;
  if(eligible&&!ipa)showShortPhraseIPA(box,en,box._ipaRevision);
 const play=box.querySelector('.nhi-en-speak');
 play.hidden=!en;play.onclick=()=>window.NHI_SPEECH?window.NHI_SPEECH.toggle(en,'en-US'):speakEnglish(en);

 box.querySelector('.nhi-en-status').textContent='';
 comparisonRows(box,id,vi,ko);
 var review=box.querySelector('.nhi-en-review');
 if(review){
  // Comparison expands once; the old “Thu gọn” button is removed.
  const expanded=box.classList.contains('nhi-compare-expanded');
  review.hidden=!en||expanded;
  review.textContent='Đối chiếu';
  review.setAttribute('aria-expanded',String(expanded));
  review.onclick=()=>{
   if(box.classList.contains('nhi-compare-expanded'))return;
   box.classList.add('nhi-compare-expanded');
   review.hidden=true;
   review.setAttribute('aria-expanded','true');
   // Cached results still render instantly; only a new pair requests translation.
   const cached=reviewCache[entryKey(vi,ko)]||suppliedComparison(vi,ko);
   if(!cached)checkMeaning(box,id,vi,ko);
   else comparisonRows(box,id,vi,ko);
  };
 }
 // Editing the translation and IPA now happens only in the card settings.
}
function editEnglish(box,id,vi,ko) {
  var open=box.querySelector('.nhi-en-edit-form');if(open){open.remove();return;}
  var current=choices[entryKey(vi,ko)] || edits[id] || (data && data[id]) || {};
  var form=document.createElement('form');form.className='nhi-en-edit-form';
  var label=document.createElement('label');label.textContent='Bản dịch tiếng Anh';
  var field=document.createElement('textarea');field.className='field';field.rows=2;field.value=clean(current.en);
  label.appendChild(field);form.appendChild(label);
  var labelIPA=document.createElement('label');labelIPA.textContent='Phiên âm IPA';
  var ipa=document.createElement('input');ipa.className='field';ipa.type='text';ipa.value=clean(current.ipa);
  labelIPA.appendChild(ipa);form.appendChild(labelIPA);
  var formatting=window.NHI_STUDY?window.NHI_STUDY.editor(form,{en:field},current.format||{}):null;
  var actions=document.createElement('div');actions.className='nhi-en-edit-actions';
  var save=document.createElement('button');save.type='submit';save.className='primary';save.textContent='Lưu bản dịch';
  var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Hủy';cancel.className='ghost';
  cancel.addEventListener('click',function(){form.remove();});
  actions.appendChild(save);actions.appendChild(cancel);form.appendChild(actions);
  form.addEventListener('submit',function(e){
    e.preventDefault();var en=clean(field.value),reading=clean(ipa.value);
    if(!en){field.focus();return;}
    cacheEntry(id,vi,ko,{en:en,ipa:reading,source:'manual',format:formatting?formatting():{}});
    try{localStorage.setItem(STORE,JSON.stringify(edits));}
    catch(err){box.querySelector('.nhi-en-status').textContent='Không thể lưu thay đổi.';return;}
    delete choices[entryKey(vi,ko)];
    try{localStorage.setItem(CHOICE_KEY,JSON.stringify(choices));}catch(e){}
    form.remove();display(box,edits[id],id,vi,ko);
  });
  box.appendChild(form);(form.querySelector('[data-language=en]')||field).focus();
}
function fitEnglishWidth(box){
 if(!box?.isConnected)return;
 // Respect explicit width chosen by dragging the box; otherwise size by the
 // longest actual line of translation/IPA and the small speaking control.
 // Always measure actual contents: avoid an old manually stored oversize box.
 // The editor remains independently editable; the card is content-sized.
 const main=box.querySelector('.nhi-en-main');
 if(!main)return;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 function measure(node){
  if(!node)return 0;
  const style=getComputedStyle(node);
  ctx.font=style.font||'16px sans-serif';
  const content=String(node.textContent||'').trim();
  return content?ctx.measureText(content).width:0;
 }
 const t=box.querySelector('.nhi-en-translation'),ipa=box.querySelector('.nhi-en-ipa');
 // The two compared English sentences use exactly the main English font
 // (including the card's own per-item override or the global default).
 if(t){
   const current=getComputedStyle(t).fontSize;
   box.style.setProperty('--nhi-comparison-english-size',current);
 }
 const status=box.querySelector('.nhi-en-status');
 const transcription=ipa&&!ipa.hidden?measure(ipa):0;
 let meaning=measure(t);
 const actions=box.querySelector('.nhi-en-head-actions');
 const actionsWidth=actions?.getBoundingClientRect().width||36;
 const review=box.querySelector('.nhi-en-review');
 const reviewWidth=review&&!review.hidden?measure(review)+18:0;
 const lane=box.closest('.nhi-card-details')||box.parentElement;
 const imageCard=!!box.closest('.pfront.nhi-with-image');
 // Allow the note to grow for longer English instead of wrapping even though
 // the parent has ample free space; never overflow the actual left-hand lane.
 const card=box.closest('.pcard');
 // Without a photo, use the full visible card width rather than a historical
 // 390–460px cap. With a photo, keep the English note inside its own column.
 const laneWidth=(lane?.getBoundingClientRect().width||lane?.clientWidth||440);
 const cardWidth=(card?.getBoundingClientRect().width||card?.clientWidth||laneWidth);
 const available=Math.max(172,(imageCard?laneWidth:Math.max(laneWidth,cardWidth-28))-8);
 const cap=Math.min(available,imageCard?650:960);
 const horizontalPadding=34;
 if(box.classList.contains('nhi-en-three-words')&&t){
   const shownFont=parseFloat(getComputedStyle(t).fontSize)||22;
   const preferredFont=Number(box.dataset.nhiEnglishFontPx)||shownFont;
   const naturalMeaning=meaning*preferredFont/Math.max(1,shownFont);
   const freeWidth=Math.max(100,cap-actionsWidth-horizontalPadding-6);
   // Expand the English note first; scale only if the real viewport is too narrow.
   // The chosen font-size preference remains unchanged in device settings.
   const fittedFont=Math.max(12,Math.floor(Math.min(preferredFont,
     preferredFont*freeWidth/Math.max(1,naturalMeaning))));
   box.style.setProperty('--nhi-three-word-font',fittedFont+'px');
   // applyEnglishFont uses inline !important; the fitted temporary size must
   // be inline too, without modifying this device's saved font preference.
   t.style.setProperty('font-size',fittedFont+'px','important');
   meaning=naturalMeaning*fittedFont/Math.max(1,preferredFont);
 }else box.style.removeProperty('--nhi-three-word-font');
 const singleMeaning=meaning+actionsWidth+horizontalPadding;
 const singleIPA=transcription+actionsWidth+horizontalPadding;
 // Exactly two ordinary U+0020 spaces between English and IPA on one row.
 const ipaStyle=ipa?getComputedStyle(ipa):null;
 ctx.font=ipaStyle?.font||'16px sans-serif';
 const twoSpaceWidth=ctx.measureText('  ').width;
 const together=meaning+(transcription?transcription+twoSpaceWidth:0)+actionsWidth+horizontalPadding;
 const sameLine=Boolean(transcription)&&
   !box.classList.contains('nhi-ipa-below')&&together<=cap;
 box.classList.toggle('nhi-en-inline-two-spaces',sameLine);
 let natural=Math.max(175,Math.ceil(singleMeaning),Math.ceil(singleIPA),Math.ceil(reviewWidth+24));
 // Keep English and IPA on one row when both fit, otherwise let IPA wrap.
 if(together<=cap&&!box.classList.contains('nhi-ipa-below')) natural=Math.max(natural,Math.ceil(together));
 const compare=box.querySelector('.nhi-en-choices:not(:empty)');
 if(compare){
   const choiceLengths=[...compare.querySelectorAll('.nhi-comparison-choice-text')]
     .map(x=>measure(x)+85);
   natural=Math.max(natural,Math.min(cap,Math.max(0,...choiceLengths)));
 }
 const desired=Math.max(175,Math.min(cap,Math.ceil(natural)));
 const manual=box.style.getPropertyValue('--nhi-en-width').trim();
 const chosen=/^\\d+(?:\\.\\d+)?px$/.test(manual)?
   Math.max(desired,Math.min(cap,parseFloat(manual))):desired;
 box.style.setProperty('--nhi-en-auto-width',chosen+'px');
 box.style.setProperty('width',chosen+'px','important');
 box.style.setProperty('max-width',cap+'px','important');
 box.style.setProperty('height','max-content','important');
 box.style.setProperty('min-height','0px','important');
 box.style.setProperty('max-height','none','important');
}
function mount(parent,id,vi,ko,options){
 if(!parent)return;
 const before=parent.querySelector('.nhi-english-v5');if(before)before.remove();
 const box=document.createElement('section');box._format=options?.format;box.className='nhi-english-v5';box.setAttribute('aria-label','Tiếng Anh');
  // Very light pastel derived from the actual card topic, not a fixed hue.
  // Restore the ORIGINAL English frame's discreet TOP BORDER (v5 stylesheet).
  box.style.setProperty('background',
    'color-mix(in srgb,var(--tc,var(--day,var(--accent))) 11%,var(--surface) 89%)','important');
  box.style.setProperty('border','0','important');
  box.style.setProperty('border-top',
    '1px solid color-mix(in srgb,var(--accent-d) 42%,transparent)','important');
  box.style.setProperty('border-radius','10px','important');
  box.style.removeProperty('box-shadow');
 box.innerHTML='<div class="nhi-en-head"><div class="nhi-en-main"><p class="nhi-en-translation"></p><p class="nhi-en-ipa"></p></div><span class="nhi-en-head-actions"><button type="button" class="nhi-en-speak" aria-label="Nghe tiếng Anh">🎧</button></span></div><p class="nhi-en-status" aria-live="polite"></p><div class="nhi-en-tools"><button type="button" class="nhi-en-review" title="Khi bấm, nội dung tiếng Việt và tiếng Hàn sẽ được gửi đến Google Translate để đối chiếu tự động. Đây không phải kiểm duyệt chuyên gia.">Đối chiếu</button></div>';
 if(window.NHI_STUDY){box.querySelector('.nhi-en-speak').innerHTML=window.NHI_STUDY.icon('headphones');}
 if(options?.toggle){const holder=document.createElement('span');holder.className='nhi-en-forgot';const check=document.createElement('button');check.type='button';check.className='nhi-thinking-button';check.setAttribute('aria-label','Chưa nhớ tiếng Anh');check.title='Chưa nhớ tiếng Anh';check.setAttribute('aria-pressed',String(!!options.unremembered));check.innerHTML='<span class="nhi-emoji-think" aria-hidden="true">🤔</span>';const bubble=document.createElement('span');bubble.className='nhi-forgot-bubble';bubble.hidden=true;bubble.setAttribute('role','status');check.onclick=()=>{const on=check.getAttribute('aria-pressed')!=='true';check.setAttribute('aria-pressed',String(on));options.toggle(on);bubble.textContent=on?'Mình sẽ ôn lại tiếng Anh nhé!':'Đã nhớ tiếng Anh rồi!';bubble.hidden=false;clearTimeout(holder._timer);holder._timer=setTimeout(()=>bubble.hidden=true,2800);};holder.append(check,bubble);box.querySelector('.nhi-en-head-actions').append(holder);}

 box.addEventListener('click',e=>e.stopPropagation());
 box.addEventListener('dblclick',e=>e.stopPropagation());
 box.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('button,input,textarea,[role="button"]'))e.stopPropagation();});
 parent.appendChild(box);
 display(box,verifiedEntry(id,vi,ko),id,vi,ko);
 let autoWidthFrame=0;
 const updateAutoWidth=()=>{
  cancelAnimationFrame(autoWidthFrame);
  autoWidthFrame=requestAnimationFrame(()=>fitEnglishWidth(box));
 };
 updateAutoWidth();
 const enMain=box.querySelector('.nhi-en-main');
 if(enMain)new MutationObserver(updateAutoWidth).observe(enMain,{childList:true,characterData:true,subtree:true});
 const enStatus=box.querySelector('.nhi-en-status');
 if(enStatus)new MutationObserver(updateAutoWidth).observe(enStatus,{childList:true,characterData:true,subtree:true});
 // Dynamic comparison choices appear asynchronously: recalc whenever rows appear.
 new MutationObserver(updateAutoWidth).observe(box,{childList:true,characterData:true,subtree:true});
 if(!data||!Object.keys(data).length){
  load().then(()=>{display(box,verifiedEntry(id,vi,ko),id,vi,ko);updateAutoWidth();if(!verifiedEntry(id,vi,ko))resolveAutomatic(id,vi,ko,box);});
 }else if(!verifiedEntry(id,vi,ko))resolveAutomatic(id,vi,ko,box);
 return box;
}
window.NHI_ENGLISH={mount,load,speakEnglish,refit:()=>document.querySelectorAll('#planBox .nhi-english-v5').forEach(box=>{applyEnglishFont(box);fitEnglishWidth(box);}),entry:(id,vi,ko)=>choices[entryKey(vi,ko)]||verifiedEntry(id,vi,ko)||{},saveEntry:(id,vi,ko,entry)=>{cacheEntry(id,vi,ko,entry);delete choices[entryKey(vi,ko)];try{localStorage.setItem(CHOICE_KEY,JSON.stringify(choices));}catch(e){}}};
})();

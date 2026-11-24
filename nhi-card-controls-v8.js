/* Card layout & Vietnamese typography V8.
 * UI settings only; source lessons, progress and sync data are untouched.
 * Values are local device preferences saved under a dedicated key.
 */
(function(){
 'use strict';
 const KEY='nhi-card-layout-v8';
 const defaults={front:26,back:22,height:430};
 let prefs={...defaults};
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
  if(saved&&typeof saved==='object')Object.assign(prefs,saved);
 }catch(_e){}
 const specs={
  front:{min:14,max:60,step:2,varName:'--nhi-v8-front-size',suffix:'px'},
  back:{min:14,max:60,step:2,varName:'--nhi-v8-back-size',suffix:'px'},
  height:{min:330,max:820,step:10,varName:'--nhi-v8-card-height',suffix:'px'}
 };
 const clamp=(key,v)=>{const s=specs[key];const n=Number(v);return Math.round(Math.max(s.min,Math.min(s.max,Number.isFinite(n)?n:defaults[key]))/s.step)*s.step;};
 for(const k of Object.keys(specs))prefs[k]=clamp(k,prefs[k]);
 function apply(){
  // Card font choices are stored on the current card; only overall height is global.
  document.documentElement.style.setProperty(specs.height.varName,prefs.height+'px');
 }
 apply();
 function save(){
  try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(_e){}
 }
 function selectRow(parent,key,label,help){
  const row=document.createElement('div');row.className='setrow nhi-v8-setting-row';
  const lab=document.createElement('label');lab.textContent=label;
  const sel=document.createElement('select');sel.className='field small';
  sel.id='nhiV8-'+key;lab.htmlFor=sel.id;
  sel.setAttribute('aria-label',label);
  const s=specs[key];
  for(let n=s.min;n<=s.max;n+=s.step){
   const opt=document.createElement('option');opt.value=n;opt.textContent=n+(key==='height'?' px':' px');
   sel.append(opt);
  }
  sel.value=String(prefs[key]);
  sel.addEventListener('change',()=>{
   prefs[key]=clamp(key,sel.value);
   if(key==='height'){apply();save();}
   else document.dispatchEvent(new CustomEvent('nhi:card-font-change',{
     detail:{lang:key==='front'?'viFront':'vi',size:prefs[key]}
   }));
   document.dispatchEvent(new CustomEvent('nhi-card-layout-changed',{detail:{...prefs}}));
  });
  row.append(lab,sel);
  parent.append(row);
  if(help){
   const tip=document.createElement('p');tip.className='voice-note nhi-v8-setting-tip';tip.textContent=help;parent.append(tip);
  }
 }
 function init(){
  const size=document.getElementById('nhiCardFontSettings');
  if(size&&!size.querySelector('#nhiV8-front')){
   const sub=document.createElement('h4');sub.textContent='Riêng nghĩa tiếng Việt';sub.className='nhi-v8-heading';size.append(sub);
   selectRow(size,'front','Tiếng Việt — mặt trước','Luôn căn giữa; có thể giữ và kéo sang trái/phải ngay trên thẻ.');
   selectRow(size,'back','Tiếng Việt — mặt sau','Nhấn giữ vào chữ Việt mặt sau rồi kéo lên/xuống hoặc sang trái/phải.');
  }
  const settings=size?.parentElement;
  if(settings&&!document.getElementById('nhiV8-height')){
   const box=document.createElement('div');box.className='setgroup nhi-v8-height-settings';
   const h=document.createElement('h3');h.textContent='Kích thước thẻ';box.append(h);
   selectRow(box,'height','Chiều cao thẻ — cả hai mặt',
    'Áp dụng ngay cho cả mặt trước và mặt sau, kể cả thẻ có ảnh. Lưu riêng trên mỗi thiết bị. Nội dung dài tự giãn hoặc cuộn trong thẻ; chế độ tập trung vẫn lấp đầy màn hình.');
   size.after(box);
  }
 }
 document.addEventListener('nhi:card-font-selected',()=>{
   const card=document.querySelector('#planBox .pcard[data-nhi-card-id]');
   if(!card)return;
   let font={};try{font=JSON.parse(card.dataset.nhiFontSizes||'{}')||{};}catch(e){}
   const f=document.getElementById('nhiV8-front'),b=document.getElementById('nhiV8-back');
   if(f)f.value=String(font.viFront||font.vi||defaults.front);
   if(b)b.value=String(font.vi||defaults.back);
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.NHI_CARD_LAYOUT_V8={
  get:()=>({...prefs}),
  set:(key,value)=>{if(!specs[key])return false;prefs[key]=clamp(key,value);
   if(key==='height'){apply();save();}
   else document.dispatchEvent(new CustomEvent('nhi:card-font-change',{
     detail:{lang:key==='front'?'viFront':'vi',size:prefs[key]}
   }));
   document.getElementById('nhiV8-'+key)?.setAttribute('data-value',String(prefs[key]));return true;},
  apply
 };
})();
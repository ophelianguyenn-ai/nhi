/* Nhi's Learning Corner: selectable window/card transitions. */
(function(){
'use strict';
const STORAGE='nhi-window-transition-settings-v1';
const TYPES=[
  ['default','Mặc định cho tất cả'],
  ['editor','Cửa sổ chỉnh sửa thẻ (giống Cài đặt tổng)'],
  ['settings','Cửa sổ Cài đặt'],
  ['ai','Cửa sổ chat AI'],
  ['dialog','Hộp thoại và cửa sổ khác'],
  ['card','Chuyển / lật thẻ'],
  ['change','Thay đổi nội dung / tùy chọn']
];
const OPTIONS=[
  ['inherit','Theo mặc định'],
  ['icon','Phóng từ biểu tượng'],
  ['fade','Mờ dần'],
  ['zoom','Phóng nhẹ'],
  ['slide-up','Trượt lên'],
  ['slide-side','Trượt ngang'],
  ['soft-pop','Bật mềm'],
  ['none','Không hiệu ứng']
];
const FALLBACK={default:'fade',editor:'icon',settings:'soft-pop',ai:'slide-side',dialog:'zoom',card:'slide-side',change:'fade'};
let prefs={};try{prefs=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch(_){}
if(!prefs||typeof prefs!=='object')prefs={};
const running=new WeakMap();
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const choose=type=>{
  // Editor must use exactly the same effect as the main Settings window.
  const category=type==='editor'?'settings':type;
  const selected=prefs[category];
  if(selected && OPTIONS.some(x=>x[0]===selected) && selected!=='inherit')return selected;
  if(category!=='default' && prefs.default && prefs.default!=='inherit')return prefs.default;
  return FALLBACK[category]||FALLBACK.default;
};
function keyframes(name,out) {
  let frames;
  switch(name){
   case 'icon':
     frames=[{opacity:.12,translate:'38% -30%',scale:'.18',filter:'blur(2px)'},{opacity:1,translate:'0 0',scale:'1',filter:'blur(0px)'}];break;
   case 'zoom':
     frames=[{opacity:.12,scale:'.87'},{opacity:1,scale:'1'}];break;
   case 'slide-up':
     frames=[{opacity:0,translate:'0 23px'},{opacity:1,translate:'0 0'}];break;
   case 'slide-side':
     frames=[{opacity:.12,translate:'42px 0'},{opacity:1,translate:'0 0'}];break;
   case 'soft-pop':
     frames=[{opacity:0,scale:'.90'},{offset:.72,opacity:1,scale:'1.025'},{opacity:1,scale:'1'}];break;
   default:
     frames=[{opacity:0},{opacity:1}];
  }
  return out?frames.slice().reverse():frames;
}
function play(node,type,closing,after){
  const done=typeof after==='function'?after:()=>{};
  if(!node||!node.isConnected){done();return;}
  if(type==='editor')node.style.setProperty('animation','none','important');
 node.dataset.nhiFxEffect=choose(type);
 node.dataset.nhiFxOperation=closing?'close':'open';
 const effect=choose(type);
  const old=running.get(node);if(old){try{old.cancel();}catch(_){ }running.delete(node);}
  if(reduced()||effect==='none'||!node.animate){done();return;}
  const frames=keyframes(effect,closing);
  let finished=false;
  const finish=()=>{
    if(finished)return;finished=true;
    if(running.get(node)===animation)running.delete(node);
    done();
  };
  let animation;
  try{
    // Settings and the card editor share duration, easing and keyframes.
    const duration=type==='change'?190:type==='card'?310:290;
    animation=node.animate(frames,{duration,easing:closing?'cubic-bezier(.42,0,.8,.3)':'cubic-bezier(.2,.72,.27,1)',fill:'both'});
    running.set(node,animation);
    animation.onfinish=finish;
    animation.oncancel=()=>{if(running.get(node)===animation)running.delete(node);};
  }catch(_){done();}
}
const api={open:(node,type)=>play(node,type,false),close:(node,type,after)=>play(node,type,true,after),choose,get:()=>({...prefs})};
window.NHI_WINDOW_FX=api;
function buildSettings(){
 let group=document.getElementById('nhiTransitionSettings');
 if(!group){
   const anchor=document.getElementById('nhiCardFontSettings');if(!anchor)return;
   group=document.createElement('section');group.id='nhiTransitionSettings';
   group.className='setgroup nhi-transitions-settings';
   group.innerHTML='<h3>✨ Hiệu ứng chuyển cảnh</h3><div id="nhiTransitionOptions"></div>';
   anchor.parentNode.insertBefore(group,anchor);
 }
 if(group.dataset.nhiFxReady==='true')return;
 group.dataset.nhiFxReady='true';
 const target=group.querySelector('#nhiTransitionOptions')||group;
 TYPES.forEach(([type,label])=>{
   // Prefer the seven static selectors in index.html so the menu is visible
   // even before JavaScript loads, and never append a duplicate row.
   let select=target.querySelector('#nhi-fx-'+type);
   if(!select){
     const row=document.createElement('div');row.className='setrow nhi-fx-setting-row';
     const name=document.createElement('label');name.textContent=label;name.htmlFor='nhi-fx-'+type;
     select=document.createElement('select');select.id='nhi-fx-'+type;
     select.setAttribute('aria-label',label);
     OPTIONS.filter(o=>type!=='default'||o[0]!=='inherit').forEach(([value,title])=>{
       const opt=document.createElement('option');opt.value=value;opt.textContent=title;select.append(opt);
     });
     row.append(name,select);target.append(row);
   }
   if(type==='editor'){
     select.replaceChildren(new Option('Theo Cài đặt tổng','inherit'));
     select.value='inherit';select.disabled=true;
     select.title='Mở và đóng giống cửa sổ Cài đặt tổng';
   }else{
     select.disabled=false;
     select.value=prefs[type]||(type==='default'?'fade':FALLBACK[type]);
   }
   select.addEventListener('change',()=>{
     prefs[type]=select.value;
     try{localStorage.setItem(STORAGE,JSON.stringify(prefs));}catch(_){}
     const feedback=group.querySelector('#nhiFxCurrent');
     if(feedback)feedback.textContent='Đã lưu hiệu ứng '+label.toLowerCase();
     play(group,'change',false);
   });
 });
 let feedback=group.querySelector('#nhiFxCurrent');
 if(!feedback){
   feedback=document.createElement('p');feedback.id='nhiFxCurrent';feedback.className='voice-note';
   feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   target.append(feedback);
 }
 const preview=group.querySelector('#nhiFxPreview');
 if(preview)preview.addEventListener('click',()=>{
   // A slower, unmistakable live preview on the SETTINGS section itself.
   if(reduced()||choose('settings')==='none'){feedback.textContent='Hiệu ứng đang tắt';return;}
   if(typeof group.animate==='function'){
     group.animate(keyframes(choose('settings'),false),{
       duration:650,easing:'cubic-bezier(.2,.72,.27,1)',fill:'none'
     });
   }
   feedback.textContent='Đang xem trước: '+(OPTIONS.find(o=>o[0]===choose('settings'))?.[1]||choose('settings'));
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSettings,{once:true});else buildSettings();
const observer=new MutationObserver(records=>{
  for(const rec of records){
    if(rec.type==='childList'){
      rec.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        if(node.matches?.('form.nhi-editor-window-v5')&&!node.dataset.nhiFxOpened){
          node.dataset.nhiFxOpened='true';
          api.open(node,'editor');
        }
        if(node.matches?.('dialog[open]'))api.open(node,'dialog');
        if(node.matches?.('.legendpop'))api.open(node,'dialog');
        node.querySelectorAll?.('form.nhi-editor-window-v5,dialog[open],.legendpop').forEach(el=>{
          const type=el.matches('form.nhi-editor-window-v5')?'editor':'dialog';
          if(type!=='editor'||!el.dataset.nhiFxOpened){
            if(type==='editor')el.dataset.nhiFxOpened='true';
            api.open(el,type);
          }
        });
      });
    }else if(rec.type==='attributes' && rec.attributeName==='open'&&rec.target.matches?.('dialog[open]')){
      api.open(rec.target,'dialog');
    }
  }
});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
document.addEventListener('change',e=>{
 const target=e.target;
 if(!(target instanceof Element))return;
 // Avoid overlaying the 260ms reveal/collapse of the Hán–Hàn fields.
 if(target.matches('input[name="hanjaEnabled"]'))return;
 const editor=target.closest('form.nhi-editor-window-v5');
 if(editor && target.matches('input[type=checkbox],select'))play(editor.querySelector('.nhi-hanja-input-grid')||editor,'change',false);
 else if(target.closest('#planBox')&&target.matches('select,input[type=checkbox]')){
   const item=target.closest('.pcard');if(item)play(item,'change',false);
 }
},true);
})();

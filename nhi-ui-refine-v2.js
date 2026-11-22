/* Nhi's Learning Corner: selectable window/card transitions. */
(function(){
'use strict';
const STORAGE='nhi-window-transition-settings-v1';
const TYPES=[
  ['default','Mặc định cho tất cả'],
  ['editor','Cửa sổ chỉnh sửa thẻ'],
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
  const selected=prefs[type];
  if(selected && OPTIONS.some(x=>x[0]===selected) && selected!=='inherit')return selected;
  if(type!=='default' && prefs.default && prefs.default!=='inherit')return prefs.default;
  return FALLBACK[type]||FALLBACK.default;
};
function keyframes(name,out) {
  let frames;
  switch(name){
   case 'icon':
     frames=[{opacity:.12,transform:'translate(38%,-30%) scale(.18)',filter:'blur(2px)'},{opacity:1,transform:'translate(0,0) scale(1)',filter:'blur(0px)'}];break;
   case 'zoom':
     frames=[{opacity:.12,transform:'scale(.87)'},{opacity:1,transform:'scale(1)'}];break;
   case 'slide-up':
     frames=[{opacity:0,transform:'translateY(23px)'},{opacity:1,transform:'translateY(0px)'}];break;
   case 'slide-side':
     frames=[{opacity:.12,transform:'translateX(42px)'},{opacity:1,transform:'translateX(0)'}];break;
   case 'soft-pop':
     frames=[{opacity:0,transform:'scale(.90)'},{offset:.72,opacity:1,transform:'scale(1.025)'},{opacity:1,transform:'scale(1)'}];break;
   default:
     frames=[{opacity:0},{opacity:1}];
  }
  return out?frames.slice().reverse():frames;
}
function play(node,type,closing,after){
  const done=typeof after==='function'?after:()=>{};
  if(!node||!node.isConnected){done();return;}
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
    const duration=type==='change'?190:type==='card'?310:type==='editor'?340:290;
    animation=node.animate(frames,{duration,easing:closing?'cubic-bezier(.42,0,.8,.3)':'cubic-bezier(.2,.72,.27,1)',fill:'both'});
    running.set(node,animation);
    animation.onfinish=finish;
    animation.oncancel=()=>{if(running.get(node)===animation)running.delete(node);};
  }catch(_){done();}
}
const api={open:(node,type)=>play(node,type,false),close:(node,type,after)=>play(node,type,true,after),choose,get:()=>({...prefs})};
window.NHI_WINDOW_FX=api;
function buildSettings(){
 const anchor=document.getElementById('nhiCardFontSettings');
 if(!anchor||document.getElementById('nhiTransitionSettings'))return;
 const group=document.createElement('section');group.className='setgroup nhi-transitions-settings';group.id='nhiTransitionSettings';
 const title=document.createElement('h3');title.textContent='Hiệu ứng chuyển cảnh';group.appendChild(title);
 const info=document.createElement('p');info.className='voice-note';
 info.textContent='Chọn hiệu ứng mặc định hoặc riêng cho từng cửa sổ. Thay đổi được lưu trên thiết bị này.';
 group.appendChild(info);
 TYPES.forEach(([type,label])=>{
   const row=document.createElement('div');row.className='setrow nhi-fx-setting-row';
   const name=document.createElement('label');name.textContent=label;name.htmlFor='nhi-fx-'+type;
   const select=document.createElement('select');select.id='nhi-fx-'+type;select.setAttribute('aria-label',label);
   OPTIONS.filter(o=>type!=='default'||o[0]!=='inherit').forEach(([value,text])=>{
     const option=document.createElement('option');option.value=value;option.textContent=text;select.appendChild(option);
   });
   select.value=prefs[type]||(type==='default'?FALLBACK.default:'inherit');
   select.addEventListener('change',()=>{
     prefs[type]=select.value;try{localStorage.setItem(STORAGE,JSON.stringify(prefs));}catch(_){}
     play(group,'change',false);
   });
   row.append(name,select);group.appendChild(row);
 });
 const note=document.createElement('p');note.className='voice-note';
 note.textContent='Cài đặt “Giảm chuyển động” của hệ điều hành luôn được ưu tiên.';
 group.appendChild(note);
 anchor.parentNode.insertBefore(group,anchor);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSettings,{once:true});else buildSettings();
const observer=new MutationObserver(records=>{
  for(const rec of records){
    if(rec.type==='childList'){
      rec.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        if(node.matches?.('form.nhi-editor-window-v5'))api.open(node,'editor');
        if(node.matches?.('dialog[open]'))api.open(node,'dialog');
        if(node.matches?.('.legendpop'))api.open(node,'dialog');
        node.querySelectorAll?.('form.nhi-editor-window-v5,dialog[open],.legendpop').forEach(el=>{
          const type=el.matches('form.nhi-editor-window-v5')?'editor':'dialog';
          api.open(el,type);
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
 const editor=target.closest('form.nhi-editor-window-v5');
 if(editor && target.matches('input[type=checkbox],select'))play(editor.querySelector('.nhi-hanja-input-grid')||editor,'change',false);
 else if(target.closest('#planBox')&&target.matches('select,input[type=checkbox]')){
   const item=target.closest('.pcard');if(item)play(item,'change',false);
 }
},true);
})();

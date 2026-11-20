/* A larger, floating "Khó" companion INSIDE the card, never affecting text layout. */
(function(){
'use strict';
let active=null,card=null,timer=0,removeTimer=0,observer=null,resizing=false;
const KEY='nhi-companion-size-v2';
let size=232;
try{const saved=Number(localStorage.getItem(KEY));if(saved>=100&&saved<=360)size=saved;}catch(_e){}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function relayout(){
 if(!active||!card||!card.isConnected)return;
 const bounds=card.getBoundingClientRect(),cw=card.clientWidth,ch=card.clientHeight;
 if(cw<120||ch<130)return;
 const inset=clamp(Math.round(cw*.045),18,32);
 const small=cw<580;
 let preferred=clamp(small?Math.min(size,Math.max(144,Math.round(cw*.47))):size,105,cw-2*inset);
 active.style.setProperty('--nhi-companion-size',preferred+'px');
 let w=active.offsetWidth,h=active.offsetHeight;
 const meta=card.querySelector('.card-top,.cmeta');
 const rates=card.querySelector('.prate');
 const topLimit=meta?meta.getBoundingClientRect().bottom-bounds.top+12:inset;
 const bottomLimit=rates?rates.getBoundingClientRect().top-bounds.top-12:ch-inset;
 const space=bottomLimit-topLimit;
 if(h>space&&space>115){
  preferred=clamp(Math.floor(preferred*space/(h+4)),105,preferred);
  active.style.setProperty('--nhi-companion-size',preferred+'px');
  w=active.offsetWidth;h=active.offsetHeight;
 }
 const xMax=Math.max(inset,cw-inset-w);
 const yMax=Math.max(inset,ch-inset-h);
 const yMin=clamp(topLimit,inset,yMax);
 const yEnd=clamp(bottomLimit-h,yMin,yMax);
 const xs=[inset,clamp((cw-w)/2,inset,xMax),xMax];
 const ys=[yMin];
 if(yEnd>yMin+1)for(let i=1;i<=8;i++)ys.push(yMin+(yEnd-yMin)*i/8);
 const selectors='.card-top,.cmeta,.prate,.pdel,.pundo,.pfront .prompt,.pfront .answer,.pfront .vi-under,.pfront .nhi-ko-line,.pfront .nhi-card-note,.pfront .nhi-en-translation,.pfront .nhi-en-ipa,.pfront .card-illustration,.pfront .nhi-hanja-lookup';
 const blocks=[...card.querySelectorAll(selectors)].filter(node=>!active.contains(node)).map(node=>{
  const r=node.getBoundingClientRect();
  return {x:r.left-bounds.left,y:r.top-bounds.top,w:r.width,h:r.height,weight:node.matches('.prate,.card-top,.cmeta,.pdel,.pundo')?3:1.6};
 }).filter(r=>r.w>0&&r.h>0);
 let best={x:inset,y:yMin,cost:Infinity};
 for(const x of xs)for(const y of ys){
  let cost=Math.abs(x-(inset+8))*.2+Math.abs(y-(topLimit+20))*.04;
  for(const b of blocks){
   const margin=12,ox=Math.max(0,Math.min(x+w,b.x+b.w+margin)-Math.max(x,b.x-margin));
   const oy=Math.max(0,Math.min(y+h,b.y+b.h+margin)-Math.max(y,b.y-margin));
   cost+=ox*oy*b.weight;
  }
  if(cost<best.cost)best={x,y,cost};
 }
 active.style.setProperty('--nhi-companion-x',Math.round(best.x)+'px');
 active.style.setProperty('--nhi-companion-y',Math.round(best.y)+'px');
}
function clear(){
 clearTimeout(timer);clearTimeout(removeTimer);
 window.removeEventListener('resize',relayout);
 if(observer){observer.disconnect();observer=null;}
 if(active)active.remove();
 active=null;card=null;resizing=false;
}
function expire(){
 clearTimeout(timer);clearTimeout(removeTimer);
 timer=setTimeout(()=>{
  if(!active||resizing)return;
  const leaving=active;leaving.classList.add('nhi-mascot-leave');
  removeTimer=setTimeout(()=>{if(active===leaving)clear();},500);
 },6500);
}
function show(target){
 clear();
 if(!target)return;
 card=target;
 const root=document.createElement('div');root.id='nhi-hard-mascot';root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const img=document.createElement('img');img.src='nhi-mascot.webp';img.alt='Bạn Nhi động viên khi chọn Khó';img.title='Kéo hình để thay đổi kích thước';img.draggable=false;
 const caption=document.createElement('p');caption.className='nhi-hard-caption';caption.textContent='Hơi khó... mình ôn lại nhé';
 root.append(img,caption);
 card.append(root);active=root;
 let drag=null;
 img.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();resizing=true;clearTimeout(timer);
  drag={x:e.clientX,y:e.clientY,size};
  img.setPointerCapture(e.pointerId);
 });
 img.addEventListener('pointermove',e=>{
  if(!drag)return;
  size=clamp(drag.size+Math.max(e.clientX-drag.x,e.clientY-drag.y),110,340);
  relayout();
 });
 function finish(){
  if(!drag)return;
  drag=null;resizing=false;
  try{localStorage.setItem(KEY,String(size));}catch(_e){}
  expire();
 }
 img.addEventListener('pointerup',finish);
 img.addEventListener('pointercancel',finish);
 img.addEventListener('load',relayout);
 root.addEventListener('click',e=>e.stopPropagation());
 window.addEventListener('resize',relayout,{passive:true});
 if(window.ResizeObserver){observer=new ResizeObserver(relayout);observer.observe(card);}
 relayout();expire();
}
function sync(target){if(active&&target!==card)clear();else if(active)relayout();}
window.NHI_HARD_MASCOT={show,clear,sync,resizing:()=>resizing};
})();

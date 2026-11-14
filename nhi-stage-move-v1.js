/* Consistent drag positions across flashcards: Korean, Vietnamese and Hán–Việt.
 * The English panel keeps its separate drag/resize logic. */
(function(){
'use strict';
const KEY='nhi-stage-drag-layout-v1';
const positions={hanja:{x:0,y:0},korean:{x:0,y:0},vietnamese:{x:0,y:0},note:{x:0,y:0}};
try{
 const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
 for(const k of Object.keys(positions)){
  for(const axis of ['x','y']){
   const value=Number(saved?.[k]?.[axis]);
   if(Number.isFinite(value))positions[k][axis]=Math.round(value);
  }
 }
}catch(_e){}
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function save(){try{localStorage.setItem(KEY,JSON.stringify(positions));}catch(_e){}}
function install(el,key){
 if(el.dataset.nhiMovableReady)return;
 el.dataset.nhiMovableReady='true';
 el.dataset.nhiMovable=key;
 el.draggable=false;
 el.addEventListener('dragstart',e=>e.preventDefault());
 el.tabIndex=0;
 el.title=el.title ? el.title+' · Kéo để di chuyển' : 'Giữ và kéo trực tiếp để di chuyển; Alt + mũi tên để tinh chỉnh';
 let active=null,suppress=false;
 const apply=()=>{
   const v=positions[key];
   el.style.setProperty('--nhi-move-x',v.x+'px');
   el.style.setProperty('--nhi-move-y',v.y+'px');
 };
 apply();
 el.addEventListener('pointerdown',e=>{
  if(e.button!==0 || e.target.closest('button,input,textarea,select,[contenteditable]'))return;
  const card=el.closest('.pcard');
  if(!card || !card.isConnected)return;
  const rect=el.getBoundingClientRect();
  // Words can be selected/clicked normally unless the user actually drags.
  active={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,
    x:positions[key].x,y:positions[key].y,rect,moved:false};
  try{el.setPointerCapture(e.pointerId);}catch(_e){}
 },{passive:true});
 el.addEventListener('pointermove',e=>{
  if(!active || active.pointer!==e.pointerId)return;
  const dx=e.clientX-active.startX,dy=e.clientY-active.startY;
  if(!active.moved && Math.hypot(dx,dy)<6)return;
  active.moved=true;
  const container=el.closest('.pfront');
  const box=container?.getBoundingClientRect();
  const xMax=box?Math.min(120,Math.max(0,(box.width-active.rect.width)/2-8)):110;
  positions[key].x=clamp(Math.round(active.x+dx),-xMax,xMax);
  positions[key].y=clamp(Math.round(active.y+dy),-80,100);
  el.classList.add('nhi-is-moving');
  apply();e.preventDefault();e.stopPropagation();
 },{passive:false});
 function end(e){
  if(!active || active.pointer!==e.pointerId)return;
  suppress=active.moved;
  active=null;el.classList.remove('nhi-is-moving');
  try{el.releasePointerCapture(e.pointerId);}catch(_e){}
  if(suppress){
   save();
   setTimeout(()=>{suppress=false;},100);
  }
 }
 el.addEventListener('pointerup',end);
 el.addEventListener('pointercancel',end);
 el.addEventListener('click',e=>{
  if(!suppress)return;
  e.preventDefault();e.stopImmediatePropagation();suppress=false;
 },true);
 el.addEventListener('keydown',e=>{
  if(!e.altKey || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();
  const delta=e.shiftKey?20:6;
  const p=positions[key];
  p.x=clamp(p.x+(e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0),-110,110);
  p.y=clamp(p.y+(e.key==='ArrowUp'?-delta:e.key==='ArrowDown'?delta:0),-80,100);
  apply();save();
 });
}
function update(){
 document.querySelectorAll('#planBox .pcard .nhi-hanja-lookup').forEach(el=>install(el,'hanja'));
 document.querySelectorAll('#planBox .pcard .nhi-ko-line>.answer.ko').forEach(el=>install(el,'korean'));
 document.querySelectorAll('#planBox .pcard .pfront>.vi-under').forEach(el=>install(el,'vietnamese'));
 document.querySelectorAll('#planBox .pcard .nhi-card-note').forEach(el=>install(el,'note'));
}
function init(){
 const container=document.getElementById('planBox');
 if(!container)return;
 update();
 const observer=new MutationObserver(update);
 observer.observe(container,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
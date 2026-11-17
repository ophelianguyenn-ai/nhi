/* Long-press a word to open its Vietnamese dictionary entry, without flipping cards. */
(function(){
 'use strict';
 let press=null,holdAt=0,holdTarget=null;
 const zone='#planBox .answer.ko, #planBox .prompt, #planBox .vi-under, #view-cards .answer.ko, #view-cards .prompt';
 function wordAt(e,zoneEl){
   let node=null,offset=0;
   if(document.caretPositionFromPoint){
     const p=document.caretPositionFromPoint(e.clientX,e.clientY);
     if(p){node=p.offsetNode;offset=p.offset;}
   }else if(document.caretRangeFromPoint){
     const p=document.caretRangeFromPoint(e.clientX,e.clientY);
     if(p){node=p.startContainer;offset=p.startOffset;}
   }
   if(!node||!zoneEl.contains(node)||node.nodeType!==Node.TEXT_NODE){
     node=e.target.firstChild?.nodeType===Node.TEXT_NODE?e.target.firstChild:null;
     offset=0;
   }
   if(!node)return (e.target.textContent||'').trim().split(/\s+/)[0]||'';
   const txt=node.nodeValue||'';
   const matches=[...txt.matchAll(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)];
   const selected=matches.find(m=>m.index<=offset&&offset<=m.index+m[0].length)
     ||matches.find(m=>m.index>offset)||matches.at(-1);
   return selected?selected[0]:'';
 }
 function reset(){if(press)clearTimeout(press.timer);press=null;}
 document.addEventListener('pointerdown',function(e){
   if(e.button!==0||e.target.closest('a,button,input,textarea,select,[contenteditable]'))return;
   const zoneEl=e.target.closest(zone);if(!zoneEl)return;
   const start={x:e.clientX,y:e.clientY,target:e.target,word:wordAt(e,zoneEl),timer:0};
   if(!start.word)return;
   reset();press=start;
   start.timer=setTimeout(function(){
     if(press!==start)return;
     const ko=/[가-힣]/.test(start.word);
     holdTarget=start.target;holdAt=Date.now();
     // Korean entry opens the Korean–Vietnamese dictionary; Vietnamese
     // entry opens Vietnamese Wiktionary.
     window.NHI_STUDY?.dictionary(start.word,ko?'ko-vi':'vi');
     try{navigator.vibrate?.(18);}catch(_e){}
     reset();
   },600);
 },true);
 document.addEventListener('pointermove',function(e){
   if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12)reset();
 },true);
 ['pointerup','pointercancel','scroll'].forEach(type=>document.addEventListener(type,reset,true));
 document.addEventListener('contextmenu',function(e){
   if(press&&e.target.closest(zone)){e.preventDefault();}
 },true);
 // A completed long press must not also toggle highlight/flip the card.
 document.addEventListener('click',function(e){
   if(holdTarget&&Date.now()-holdAt<1000 && (e.target===holdTarget || holdTarget.contains(e.target))){
     e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   }
 },true);
})();

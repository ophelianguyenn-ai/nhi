/* Prevent saved drag offsets from allowing the English panel to overlap Vietnamese.
 * Maintain a normal-flow, centered vertical stack on every flashcard. */
(function(){
'use strict';
function fit(){
 const card=document.querySelector('#planBox .pcard');
 if(!card)return;
 const front=card.querySelector('.pfront');
 const vi=front?.querySelector(':scope > .vi-under');
 const details=front?.querySelector(':scope > .nhi-card-details');
 const english=details?.querySelector('.nhi-english-v5')||front?.querySelector(':scope > .nhi-english-v5');
 if(!vi||!english||!details)return;
 const base=14;
 const current=Number.parseFloat(details.style.getPropertyValue('--nhi-safe-margin'))||base;
 const viBox=vi.getBoundingClientRect(),enBox=english.getBoundingClientRect();
 if(viBox.width===0||enBox.width===0)return;
 const missing=viBox.bottom+14-enBox.top;
 const target=Math.max(base,Math.min(190,current+missing));
 if(Math.abs(target-current)>.9){
  details.style.setProperty('--nhi-safe-margin',target+'px');
 }
}
let scheduled=false;
function queueFit(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;fit();});
}
function init(){
 const plan=document.getElementById('planBox');
 if(!plan)return;
 const observer=new MutationObserver(muts=>{
  const relevant=muts.some(m=>
   m.type==='childList' ||
   (m.type==='attributes' &&
     (m.target.matches?.('.vi-under,[data-nhi-movable],.nhi-english-v5')||false)));
  if(relevant)queueFit();
 });
 observer.observe(plan,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
 window.addEventListener('resize',queueFit,{passive:true});
 queueFit();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
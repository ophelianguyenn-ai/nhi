/* Nhi's Learning Corner — Lương ❤️ Nhi interactive cover V3
 * One controller, two independent interactions. Retains learning UI and all data.
 * Original GIF is a motion reference; neither a looping GIF nor stock media is displayed.
 */
(function(){
 'use strict';
 const cover=document.getElementById('cover'), hero=document.getElementById('coverHero');
 if(!cover||!hero)return;
 const ASSETS=['nhi-cover-girl-rig-v3.svg?v=3','nhi-luong-articulated-v4.svg?v=20261115-anim1'];
 const TIMES={walkStart:200,walkEnd:2600,arrive:3000,kissStart:3650,kissEnd:4450,recover:5200,finish:5800};
 let started=false,ready=false,romance='IDLE',raf=0,begin=0;
 let girl=null,boy=null,stage=null,button=null,status=null,clip=null,airplane=null;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const make=(tag,cls,id)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(id)node.id=id;
  return node;
 };
 const showText=message=>{if(status)status.textContent=message;};
 function setState(next){
  romance=next;
  cover.dataset.nhiRomanceV3=next.toLowerCase();
  if(button){
   button.disabled=!['IDLE','TOGETHER'].includes(next);
   button.textContent=next==='TOGETHER'?'↻ Xem lại cảnh hôn':'❤️ Lương đến bên Nhi';
   button.setAttribute('aria-label',next==='TOGETHER'?'Xem lại cảnh Lương đến hôn Nhi':'Cho Lương đến hôn Nhi');
  }
 }
 function getSize(){return Math.max(220,stage?.getBoundingClientRect().width||hero.getBoundingClientRect().width||350);}
 // Contact anchors: Nhi's right cheek (~67% of her SVG) and Lương's mouth (~47% of his SVG).
 function kissOffset(){return (girl.offsetLeft+girl.offsetWidth*.67)-(boy.offsetLeft+boy.offsetWidth*.47);}
 function applyBoy(offset,scale,rot=0,opacity=1){
  if(!boy)return;
  boy.style.opacity=String(opacity);
  boy.style.transform='translate3d('+offset.toFixed(2)+'px,0,0) scale('+scale.toFixed(4)+') rotate('+rot.toFixed(2)+'deg)';
 }
 function render(elapsed){
  const W=getSize();
  const t=Math.max(0,elapsed);
  const walking=t>=TIMES.walkStart&&t<TIMES.walkEnd;
  stage.classList.toggle('nhi-v3-walking',walking);
  stage.classList.toggle('nhi-v3-kissing',t>=TIMES.kissStart&&t<TIMES.kissEnd);
  stage.classList.toggle('nhi-v3-reaction',t>=TIMES.arrive&&t<TIMES.recover);
  if(t<TIMES.walkEnd){
   const p=ease((t-TIMES.walkStart)/(TIMES.walkEnd-TIMES.walkStart));
   const dx=W*.92*(1-p);
   const size=.27+.73*p;
   const bounce=walking?Math.sin(p*9*Math.PI)*Math.min(3,Math.max(0,Math.sin(Math.PI*p)*3)):0;
   applyBoy(dx,size,walking?Math.sin(p*9*Math.PI)*.8:0,t<TIMES.walkStart?0:Math.min(1,(t-TIMES.walkStart)/220));
   boy.style.marginTop=bounce.toFixed(1)+'px';
   return;
  }
  boy.style.marginTop='0px';
  if(t<TIMES.arrive){applyBoy(0,1);return;}
  if(t<TIMES.kissStart){
   const p=ease((t-TIMES.arrive)/(TIMES.kissStart-TIMES.arrive));
   applyBoy(kissOffset()*p,1,-9*p);
   return;
  }
  if(t<TIMES.kissEnd){applyBoy(kissOffset(),1,-9);return;}
  if(t<TIMES.recover){
   const p=ease((t-TIMES.kissEnd)/(TIMES.recover-TIMES.kissEnd));
   applyBoy(kissOffset()*(1-p),1,-9*(1-p));
   return;
  }
  applyBoy(0,1);
 }
 function tick(now){
  if(romance==='IDLE'||romance==='TOGETHER')return;
  const t=now-begin;
  render(t);
  if(t>=TIMES.finish){
   stage.classList.remove('nhi-v3-walking','nhi-v3-kissing','nhi-v3-reaction');
   stage.classList.add('nhi-v3-together');
   applyBoy(0,1);
   setState('TOGETHER');
   showText('Lương đã đến bên Nhi và ở lại cạnh Nhi.');
   return;
  }
  if(t>=TIMES.kissStart)setState('KISSING');
  else if(t>=TIMES.arrive)setState('KISS_PREP');
  else if(t>=TIMES.walkEnd)setState('APPROACH');
  else setState('WALK_IN');
  raf=requestAnimationFrame(tick);
 }
 function resetRomance(){
  cancelAnimationFrame(raf);raf=0;
  if(stage)stage.classList.remove('nhi-v3-walking','nhi-v3-kissing','nhi-v3-reaction','nhi-v3-together');
  if(boy){
   boy.style.marginTop='0px';
   applyBoy(getSize()*.92,.27,0,0);
  }
  setState('IDLE');
  showText('');
 }
 function playKiss(){
  if(!ready||cover.hidden||!['IDLE','TOGETHER'].includes(romance))return false;
  resetRomance();
  if(reduced()){
   applyBoy(0,1);
   stage.classList.add('nhi-v3-together');
   setState('TOGETHER');
   showText('Lương đứng cạnh Nhi.');
   return true;
  }
  setState('WALK_IN');
  showText('Lương đang bước đến bên Nhi.');
  begin=performance.now();raf=requestAnimationFrame(tick);
  return true;
 }
 function resetAll(){
  resetRomance();
  airplane?.stop();
 }
 async function fetchSvg(url){
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw Error(url+' '+response.status);
  const body=await response.text();
  const doc=new DOMParser().parseFromString(body,'image/svg+xml');
  const svg=doc.documentElement;
  if(svg.localName!=='svg'||doc.querySelector('parsererror'))throw Error('Invalid SVG: '+url);
  svg.setAttribute('aria-hidden','true');
  return document.importNode(svg,true);
 }
 function attachButton(){
  button=make('button','nhi-v3-love-button','nhiLoveButton');
  button.type='button';
  button.textContent='❤️ Lương đến bên Nhi';
  button.addEventListener('click',playKiss);
  const go=document.getElementById('coverGo');
  if(go)go.parentNode.insertBefore(button,go);
  else cover.querySelector('.cover-in')?.append(button);
  status=make('span','nhi-v3-a11y-status','nhiLoveStatus');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  cover.append(status);
 }
 async function setup(){
  if(started)return;started=true;
  let artwork;
  try{artwork=await Promise.all(ASSETS.map(fetchSvg));}
  catch(err){
   console.error('Nhi cover V3: rig loading failed; original mascot remains available.',err);
   started=false;return;
  }
  stage=make('div','nhi-v3-stage','nhiCoupleStage');
  girl=make('div','nhi-v3-girl','nhiCharacter');
  boy=make('div','nhi-v3-boy','luongCharacter');
  girl.append(artwork[0]);boy.append(artwork[1]);
  boy.querySelector('svg')?.classList.add('nhi-v3-boy-svg');
  girl.querySelector('svg')?.classList.add('nhi-v3-girl-svg');
  stage.append(girl,boy);
  hero.append(stage);
  cover.classList.add('nhi-cover-v3-enabled');
  attachButton();
  airplane=window.NhiCoverAirplaneV3?.create(cover)||null;
  clip=girl.querySelector('#nhiHairClipPlane');
  if(clip){
    const planeClick=e=>{
      e.preventDefault();e.stopPropagation();
      if(airplane?.play()) {
        clip.classList.remove('nhi-v3-clip-spark');
        void clip.getBoundingClientRect();
        clip.classList.add('nhi-v3-clip-spark');
      }
    };
    clip.addEventListener('click',planeClick);
    clip.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){planeClick(e);}
    });
    clip.addEventListener('animationend',()=>clip.classList.remove('nhi-v3-clip-spark'));
  }
  ready=true;
  resetRomance();
  // The app itself hides the cover on deep links; never change that behavior.
  new MutationObserver(()=>{
    if(cover.hidden)resetAll();
    else if(romance!=='IDLE')resetAll();
  }).observe(cover,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',resetAll);
  window.addEventListener('resize',()=>{
    if(romance==='IDLE')applyBoy(getSize()*.92,.27,0,0);
    if(romance==='TOGETHER')applyBoy(0,1);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
 window.NHI_COVER_V3={
  playKiss,playAirplane:()=>airplane?.play()||false,resetAll,
  getState:()=>({ready,romance,airplaneRunning:!!airplane?.running}),
  getTimes:()=>({...TIMES})
 };
})();
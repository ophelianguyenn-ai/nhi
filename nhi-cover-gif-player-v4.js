/* Nhi's Learning Corner — use the user's original 9 GIF frames, NOT redrawn SVG rigs.
 * Exactly 9 x 130 ms, play on click only, then hold original frame 9 forever.
 * The independent airplane clip remains available before and after the kiss.
 */
(function(){
  'use strict';
  const cover=document.getElementById('cover'),hero=document.getElementById('coverHero');
  if(!cover||!hero)return;
  const FRAME_COUNT=9, FRAME_MS=130;
  const URLS=Array.from({length:FRAME_COUNT},(_,i)=>
    'assets/cover-gif/frame-'+String(i).padStart(2,'0')+'.webp?v=20261115-original-9');
  let frameEls=[],stage=null,button=null,clip=null,airplane=null,raf=0,t0=0,state='LOADING',index=0,ready=false;
  let status=null;
  const reduced=()=>window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const make=(tag,className,id)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(id)el.id=id;
    return el;
  };
  function setState(next){
    state=next;
    cover.dataset.nhiGifV4=next.toLowerCase();
    if(button){
      button.disabled=next==='PLAYING'||next==='LOADING';
      button.textContent=next==='TOGETHER'?'↻ Xem lại cảnh hôn':'❤️ Lương đến bên Nhi';
      button.setAttribute('aria-label',next==='TOGETHER'?'Xem lại 9 khung hình Lương đến hôn Nhi':'Cho Lương đến hôn Nhi');
    }
  }
  function showFrame(i){
    const next=Math.max(0,Math.min(FRAME_COUNT-1,Math.floor(i)));
    if(!frameEls.length)return;
    if(next===index && frameEls[index].classList.contains('is-current'))return;
    for(let n=0;n<frameEls.length;n++){
      frameEls[n].classList.toggle('is-current',n===next);
      frameEls[n].setAttribute('aria-hidden',String(n!==next));
    }
    index=next;
  }
  function resetRomance(){
    cancelAnimationFrame(raf);raf=0;
    if(!ready)return;
    showFrame(0);
    setState('IDLE');
    if(status)status.textContent='';
  }
  function resetAll(){
    resetRomance();
    airplane?.stop();
  }
  function finish(){
    cancelAnimationFrame(raf);raf=0;
    showFrame(FRAME_COUNT-1);
    setState('TOGETHER');
    if(status)status.textContent='Lương đã hôn Nhi và đứng lại bên Nhi.';
  }
  function tick(time){
    if(state!=='PLAYING')return;
    const elapsed=Math.max(0,time-t0);
    showFrame(Math.min(FRAME_COUNT-1,Math.floor(elapsed/FRAME_MS)));
    if(elapsed>=FRAME_COUNT*FRAME_MS){finish();return;}
    raf=requestAnimationFrame(tick);
  }
  function playKiss(){
    if(!ready||cover.hidden||!['IDLE','TOGETHER'].includes(state))return false;
    cancelAnimationFrame(raf);
    showFrame(0);
    if(reduced()){
      finish();
      return true;
    }
    setState('PLAYING');
    if(status)status.textContent='Lương đang đến bên Nhi.';
    t0=performance.now();
    raf=requestAnimationFrame(tick);
    return true;
  }
  function preload(url){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.className='nhi-gif-frame';
      img.alt='';
      img.draggable=false;
      img.decoding='sync';
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(Error('Missing original GIF frame: '+url));
      img.src=url;
    });
  }
  async function setup(){
    try{
      frameEls=await Promise.all(URLS.map(preload));
      await Promise.all(frameEls.map(img=>typeof img.decode==='function'?img.decode().catch(()=>{}):Promise.resolve()));
    }catch(err){
      console.error('Nhi GIF V4: failed to load original frames; keeping the existing cover mascot',err);
      setState('ERROR');return;
    }
    stage=make('div','nhi-gif-stage','nhiGifStage');
    stage.setAttribute('role','img');
    stage.setAttribute('aria-label','Nhi và Lương trong hoạt hình chibi nguyên bản chín khung hình');
    frameEls.forEach(el=>stage.append(el));
    showFrame(0);
    hero.append(stage);
    button=make('button','nhi-gif-love-button','nhiLoveButton');
    button.type='button';
    const go=document.getElementById('coverGo');
    if(go)go.parentNode.insertBefore(button,go);
    else cover.querySelector('.cover-in')?.append(button);
    button.addEventListener('click',playKiss);
    clip=make('button','nhi-gif-hairclip','nhiHairClipPlane');
    clip.type='button';
    clip.setAttribute('aria-label','Chạm kẹp tóc Nhi để gọi máy bay kéo băng rôn Lương yêu Nhi');
    clip.setAttribute('title','Kẹp tóc hồng · Máy bay Lương ❤️ Nhi');
    stage.append(clip);
    status=make('span','nhi-gif-a11y-status','nhiGifStatus');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    cover.append(status);
    airplane=window.NhiCoverAirplaneV3?.create(cover)||null;
    clip.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      if(airplane?.play()){
        clip.classList.remove('nhi-gif-clip-spark');
        void clip.offsetWidth;
        clip.classList.add('nhi-gif-clip-spark');
      }
    });
    clip.addEventListener('animationend',()=>clip.classList.remove('nhi-gif-clip-spark'));
    cover.classList.add('nhi-cover-gif-v4-enabled');
    ready=true;
    setState('IDLE');
    new MutationObserver(()=>{
      if(cover.hidden)resetAll();
      else if(state==='PLAYING'||state==='TOGETHER')resetAll();
    }).observe(cover,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('pagehide',resetAll);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
  window.NHI_COVER_GIF_V4={
    playKiss,playAirplane:()=>airplane?.play()||false,resetAll,
    getState:()=>({ready,state,frame:index,airplaneRunning:!!airplane?.running,source:'luong-nhi-goc.gif',frames:FRAME_COUNT,frameMs:FRAME_MS})
  };
})();
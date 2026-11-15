/* Nhi's Learning Corner — DEMO CUTOUT 2D V5.2.
 * Two independently articulated SVG characters. Story is exactly 6000 ms:
 * 0-.5 appear, .5-3.2 walk, 3.2-4.1 turn, 4.1-5.1 cheek kiss,
 * 5.1-6.0 recover, then stand close with gently tilted heads.
 * Lương's two hands are visibly relaxed AT HIS SIDES (not behind back).
 * Keeps existing 4-season, light/dark background and study/navigation.
 */
(function(){
  'use strict';
  const cover=document.getElementById('cover'),hero=document.getElementById('coverHero');
  if(!cover||!hero)return;
  const duration=6000;
  const beats={APPEAR:0,WALK:500,APPROACH:3200,KISS:4100,RECOVER:5100,TOGETHER:6000};
  const assets=['assets/romantic-demo/nhi-demo-original-pixels.png?v=v52',
'assets/romantic-demo/luong-demo-head-v52.png?v=v52',
'assets/romantic-demo/luong-demo-torso-v52.png?v=v52',
'assets/romantic-demo/luong-demo-leg-left-v52.png?v=v52',
'assets/romantic-demo/luong-demo-leg-right-v52.png?v=v52'];
  const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ease=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const el=(tag,name,id)=>{
    const n=document.createElement(tag);
    if(name)n.className=name;
    if(id)n.id=id;
    return n;
  };
  let ready=false,starting=false,state='LOADING',raf=0,t0=0,phase='',hold=0;
  let stage,girl,boy,button,live,airplane,clip,heart,bouquet,petals=[],playbackCount=0;
  let messageTimer=0,sceneParts=[],observer=null;
  function updateState(next){
    state=next;
    if(stage)stage.dataset.state=next;
    cover.dataset.nhiRomanceV51=next.toLowerCase();
    if(button){
      button.disabled=!['NHI_IDLE','COUPLE_IDLE'].includes(next);
      button.textContent=next==='COUPLE_IDLE'?'↻ Xem lại cảnh hôn':'❤️ Lương đến bên Nhi';
      button.setAttribute('aria-label',next==='COUPLE_IDLE'?'Xem lại cảnh Lương đến hôn Nhi trong 6 giây':'Cho Lương bước đến hôn Nhi trong 6 giây');
    }
    if(heart)heart.hidden=next!=='COUPLE_IDLE';
  }
  function say(text){
    if(live)live.textContent=text;
  }
  const pref=(value)=>Math.max(0,Math.min(1,value));
  function pose(x,scale,rot,opacity){
    if(!boy)return;
    boy.style.setProperty('--luong-x',x.toFixed(2)+'px');
    boy.style.setProperty('--luong-scale',scale.toFixed(4));
    boy.style.setProperty('--luong-angle',rot.toFixed(2)+'deg');
    boy.style.opacity=String(pref(opacity));
  }
  function distanceToCheek(){
    if(!girl||!boy)return -72;
    const cheek=girl.offsetLeft+girl.offsetWidth*((446-92)/445);
    const mouth=boy.offsetLeft+boy.offsetWidth*((620-451)/287);
    return cheek-mouth;
  }
  function layout(){
    if(!stage||!girl||!boy)return;
    const unit=stage.clientHeight/818;
    const originX=(stage.clientWidth-646*unit)/2;
    girl.style.left=originX.toFixed(2)+'px';
    girl.style.top=(44*unit).toFixed(2)+'px';
    girl.style.width=(445*unit).toFixed(2)+'px';
    girl.style.height=(774*unit).toFixed(2)+'px';
    boy.style.left=(originX+359*unit).toFixed(2)+'px';
    boy.style.right='auto';
    boy.style.top='0px';
    boy.style.width=(287*unit).toFixed(2)+'px';
    boy.style.height=(807*unit).toFixed(2)+'px';
  }
  function selectPhase(next){
    if(phase===next)return;
    phase=next;
    stage.dataset.phase=next;
  }
  function spawnBurst(target,count,kind){
    if(!stage||reduced())return;
    const r=target.getBoundingClientRect(),sr=stage.getBoundingClientRect();
    for(let i=0;i<count;i++){
      const p=el('span','nhi-v51-burst '+(kind==='heart'?'is-heart':'is-petal'));
      p.setAttribute('aria-hidden','true');
      p.textContent=kind==='heart'?(i%2?'♡':'♥'):(i%2?'❀':'✿');
      p.style.left=(r.left+r.width*(.25+.5*Math.random())-sr.left)+'px';
      p.style.top=(r.top+r.height*(.2+.4*Math.random())-sr.top)+'px';
      p.style.setProperty('--burst-x',((Math.random()-.5)*120).toFixed(1)+'px');
      p.style.setProperty('--burst-y',(-45-Math.random()*100).toFixed(1)+'px');
      p.style.setProperty('--burst-delay',(i*0.085)+'s');
      stage.append(p);p.addEventListener('animationend',()=>p.remove(),{once:true});
    }
  }
  function showMessage(text){
    const msg=stage.querySelector('.nhi-v51-message');
    if(!msg)return;
    clearTimeout(messageTimer);
    msg.textContent=text;msg.classList.add('is-visible');
    messageTimer=setTimeout(()=>msg.classList.remove('is-visible'),2300);
  }
  function kissEnd(){
    cancelAnimationFrame(raf);raf=0;
    pose(0,1,0,1);
    selectPhase('couple');
    updateState('COUPLE_IDLE');
    say('Lương đã hôn Nhi và đứng bên cạnh Nhi. Cả hai đang đung đưa nhẹ.');
  }
  function render(now){
    if(state!=='PLAYING')return;
    const t=Math.max(0,Math.min(duration,now-t0));
    if(t>=duration){kissEnd();return;}
    if(t<beats.WALK){
      selectPhase('appear');
      const p=ease(t/beats.WALK);
      pose((1-p)*stage.clientWidth*.72,.26+p*.06,0,p);
    }else if(t<beats.APPROACH){
      selectPhase('walk');
      const p=ease((t-beats.WALK)/(beats.APPROACH-beats.WALK));
      pose((1-p)*stage.clientWidth*.72,.32+.68*p,Math.sin(p*12*Math.PI)*.65,1);
    }else if(t<beats.KISS){
      selectPhase('approach');
      const p=ease((t-beats.APPROACH)/(beats.KISS-beats.APPROACH));
      pose(distanceToCheek()*p,1,-6*p,1);
    }else if(t<beats.RECOVER){
      selectPhase('kiss');
      pose(distanceToCheek(),1,-6,1);
      if(!hold){
        hold=1;
        spawnBurst(girl,4,'heart');
      }
    }else{
      selectPhase('recover');
      const p=ease((t-beats.RECOVER)/(duration-beats.RECOVER));
      pose(distanceToCheek()*(1-p),1,-6*(1-p),1);
    }
    raf=requestAnimationFrame(render);
  }
  function reset(){
    cancelAnimationFrame(raf);raf=0;
    clearTimeout(messageTimer);
    stage?.querySelectorAll('.nhi-v51-burst').forEach(x=>x.remove());
    stage?.querySelector('.nhi-v51-message')?.classList.remove('is-visible');
    hold=0;
    selectPhase('idle');
    pose(stage?.clientWidth*.72||300,.26,0,0);
    updateState('NHI_IDLE');
    say('');
  }
  function resetAll(){
    if(!ready)return;
    reset();airplane?.stop();
  }
  function playKiss(){
    if(!ready||cover.hidden||!['NHI_IDLE','COUPLE_IDLE'].includes(state))return false;
    reset();
    playbackCount++;
    if(reduced()){kissEnd();return true;}
    updateState('PLAYING');
    say('Lương đang bước tới, quay mặt và hôn má Nhi.');
    t0=performance.now();
    raf=requestAnimationFrame(render);
    return true;
  }
  function onBouquet(e){
    e.preventDefault();e.stopPropagation();
    spawnBurst(girl,6,'petal');showMessage('A little love blooms 🌼');
  }
  function onHeart(e){
    e.preventDefault();e.stopPropagation();
    spawnBurst(heart,6,'heart');showMessage('Lương ❤️ Nhi');
  }
  async function loadPixelLayer(url,classname){
    const img=new Image();
    img.src=url;
    img.className=classname;
    img.alt='';
    img.draggable=false;
    img.setAttribute('aria-hidden','true');
    if(typeof img.decode==='function')await img.decode();
    else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
    if(!img.naturalWidth||!img.naturalHeight)throw Error('Missing demo artwork: '+url);
    return img;
  }
  function decorativeScene(){
    const glow=el('div','nhi-v51-romance-light');
    glow.setAttribute('aria-hidden','true');cover.append(glow);
    sceneParts.push(glow);
    const dots=el('div','nhi-v51-romance-particles');
    dots.setAttribute('aria-hidden','true');
    for(let i=0;i<12;i++){
      const dot=el('span','nhi-v51-glow-dot');
      dot.style.setProperty('--i',i);
      dot.style.left=(8+(i*19)%89)+'%';
      dot.style.top=(12+(i*29)%68)+'%';
      dot.style.animationDelay=(-i*.55)+'s';
      dots.append(dot);
    }
    for(let i=0;i<9;i++){
      const p=el('span','nhi-v51-ambient-petal');
      p.textContent=i%2?'❀':'✿';
      p.style.left=(4+(i*11.5)%93)+'%';
      p.style.animationDelay=(-i*1.65)+'s';
      p.style.animationDuration=(12+(i%4)*2.5)+'s';
      dots.append(p);
    }
    cover.append(dots);sceneParts.push(dots);
  }
  function initHotspots(){
    clip=el('button','nhi-demo-hairclip','nhiHairClipPlane');
    clip.type='button';
    clip.title='Kẹp tóc hồng · Máy bay Lương ❤️ Nhi';
    clip.setAttribute('aria-label','Bấm kẹp tóc Nhi để gọi máy bay Lương yêu Nhi');
    girl.append(clip);
    if(clip){
      const planeAction=(event)=>{
        event.preventDefault();event.stopPropagation();
        if(airplane?.play()){
          clip.classList.remove('nhi-v51-clip-glimmer');
          void clip.getBoundingClientRect();
          clip.classList.add('nhi-v51-clip-glimmer');
        }
      };
      clip.addEventListener('click',planeAction);
      clip.addEventListener('animationend',()=>clip.classList.remove('nhi-v51-clip-glimmer'));
    }
    bouquet=el('button','nhi-v51-bouquet-hotspot','nhiBouquetLoveV51');
    bouquet.type='button';
    bouquet.setAttribute('aria-label','Chạm bó hoa để những cánh hoa bay lên');
    bouquet.title='Bó hoa · những cánh hoa nhỏ';
    bouquet.addEventListener('click',onBouquet);
    girl.append(bouquet);
    heart=el('button','nhi-v51-heart-hotspot','nhiCoupleHeartV51');
    heart.type='button';
    heart.textContent='♥';
    heart.setAttribute('aria-label','Trái tim của Lương và Nhi');
    heart.title='Lương ❤️ Nhi';
    heart.addEventListener('click',onHeart);
    heart.hidden=true;
    stage.append(heart);
  }
  async function setup(){
    if(starting)return;starting=true;
    try{
      const [girlPixel,boyHead,boyTorso,boyLegLeft,boyLegRight]=await Promise.all([
        loadPixelLayer(assets[0],'nhi-demo-layer'),
        loadPixelLayer(assets[1],'nhi-demo-part nhi-boy-head'),
        loadPixelLayer(assets[2],'nhi-demo-part nhi-boy-torso'),
        loadPixelLayer(assets[3],'nhi-demo-part nhi-boy-leg-left'),
        loadPixelLayer(assets[4],'nhi-demo-part nhi-boy-leg-right')
      ]);
      stage=el('div','nhi-v51-stage','nhiCoupleStage');
      stage.setAttribute('aria-label','Cảnh hoạt hình chibi hai chiều Lương và Nhi');
      girl=el('div','nhi-v51-girl','nhiCharacter');
      boy=el('div','nhi-v51-boy','luongCharacter');
      girl.classList.add('nhi-demo-girl');
      boy.classList.add('nhi-demo-boy');
      girl.append(girlPixel);
      boy.append(boyLegLeft,boyLegRight,boyTorso,boyHead);
      const ribbon=el('div','nhi-v51-heart-shine');
      ribbon.setAttribute('aria-hidden','true');ribbon.textContent='♡';
      stage.append(girl,boy,ribbon);
      const message=el('div','nhi-v51-message');
      message.setAttribute('aria-hidden','true');stage.append(message);
      hero.append(stage);
      layout();
      button=el('button','nhi-v51-love-button','nhiLoveButton');
      button.type='button';button.addEventListener('click',playKiss);
      const go=document.getElementById('coverGo');
      if(go)go.parentNode.insertBefore(button,go);
      else cover.querySelector('.cover-in')?.append(button);
      live=el('span','nhi-v51-sr-only','nhiLoveStatus');
      live.setAttribute('role','status');
      live.setAttribute('aria-live','polite');
      cover.append(live);
      decorativeScene();
      airplane=window.NhiCoverAirplaneV3?.create(cover)||null;
      initHotspots();
      cover.classList.add('nhi-cover-v51-enabled','nhi-cover-demo-v52-enabled');
      ready=true;
      reset();
      observer=new MutationObserver(()=>{
        if(cover.hidden){resetAll();}
        else if(state==='PLAYING'||state==='COUPLE_IDLE'){resetAll();}
      });
      observer.observe(cover,{attributes:true,attributeFilter:['hidden']});
      window.addEventListener('pagehide',resetAll);
      window.addEventListener('resize',()=>{
        layout();
        if(state==='NHI_IDLE')pose(stage.clientWidth*.72,.26,0,0);
        if(state==='COUPLE_IDLE')pose(0,1,0,1);
      });
    }catch(error){
      console.error('Romantic cover V5.1: illustration failed to initialize; keeping original mascot.',error);
      if(stage)stage.remove();
      if(button)button.remove();
      sceneParts.forEach(n=>n.remove());
      if(!ready)starting=false;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
  window.NHI_COVER_V52={
    playKiss,resetAll,playAirplane:()=>airplane?.play()||false,
    getState:()=>({ready,state,phase,timeMs:duration,playbackCount,luongVisible:state!=='NHI_IDLE'&&state!=='LOADING',appearance:'pixel-exact-demo-characters',pose:'demo-hands-in-pockets-not-behind-back',airplaneRunning:!!airplane?.running}),
    getTimes:()=>({...beats}),
  };
})();
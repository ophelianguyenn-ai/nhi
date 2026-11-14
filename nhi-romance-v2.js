/* Lương & Nhi: individually illustrated characters, GIF-informed motion.
   Uses independent SVG figures. No GIF displayed, decoded or injected. */
(function(){
'use strict';
const cover=document.getElementById('cover'),hero=document.getElementById('coverHero');
if(!cover||!hero)return;
const asset='?v=20261114-romance-v2';
const make=(tag,cls)=>{const node=document.createElement(tag);if(cls)node.className=cls;return node;};
let ready=false,scheduled=[],audio=null,audioTick=null,roseTicker=null,sceneId=0;
const delay=(fn,ms)=>{const id=setTimeout(fn,ms);scheduled.push(id);return id;};
const reduce=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd=(a,b)=>a+Math.random()*(b-a);
const scene=()=>cover.classList.contains('nhi-romance-v2-running');
function setup(){
 if(ready)return;ready=true;
 const boy=make('div','nhi-luong-v2');boy.id='nhiLuongV2';
 const assetUrl='nhi-luong-articulated-v4.svg?v=20261115-anim1';
 const fallback=make('img','nhi-boy-standing');fallback.src=assetUrl;
 fallback.alt='Lương chibi nét vector tóc đen, áo polo nâu';fallback.draggable=false;
 boy.append(fallback);hero.append(boy);
 // Embed the local, hand-drawn SVG into the DOM so each arm, leg, eyes and
 // head can actually animate; unlike an opaque raster/GIF image.
 fetch(assetUrl).then(response=>{if(!response.ok)throw Error('art missing');return response.text();})
  .then(xml=>{
    const svg=new DOMParser().parseFromString(xml,'image/svg+xml').documentElement;
    if(svg.localName!=='svg')throw Error('invalid vector art');
    svg.classList.add('nhi-boy-drawn');svg.setAttribute('aria-hidden','true');
    boy.append(document.importNode(svg,true));fallback.hidden=true;
  }).catch(()=>{fallback.hidden=false;});
 const reaction=make('span','nhi-girl-reaction');reaction.setAttribute('aria-hidden','true');
 reaction.innerHTML='<svg viewBox="0 0 70 38"><path d="M16 27C-3 16 2 3 15 10 27-3 40 14 16 27" fill="#ffadc2" stroke="#d77f9f" stroke-width="2"/><path d="M48 32C33 23 36 12 47 18 58 7 69 20 48 32" fill="#ffd5aa" stroke="#e6ad76" stroke-width="2"/></svg>';
 hero.append(reaction);
 const flowers=make('div','nhi-illustrated-flowers');flowers.setAttribute('aria-hidden','true');cover.append(flowers);
 const hearts=make('div','nhi-illustrated-hearts');hearts.setAttribute('aria-hidden','true');cover.append(hearts);
 const title=make('div','nhi-romance-title-v2');title.id='nhiLoveTitleV2';
 title.setAttribute('role','status');
 title.innerHTML='Lương <span aria-label="yêu">❤️</span> Nhi';cover.append(title);
 const kisses=make('span','nhi-kiss-glimmer');kisses.setAttribute('aria-hidden','true');
 kisses.innerHTML='<svg viewBox="0 0 36 36"><path d="M18 31C-2 18 4 3 17 12 29-2 44 13 18 31" fill="#ffa1b3" stroke="#e47e97" stroke-width="2"/></svg>';hero.append(kisses);
 const girlTalk=make('div','nhi-v2-chat nhi-v2-girl-chat');girlTalk.textContent='ck iu';hero.append(girlTalk);
 const boyTalk=make('div','nhi-v2-chat nhi-v2-boy-chat');boyTalk.textContent='vợ iu';hero.append(boyTalk);
 const sun=make('button','nhi-v2-hotspot');sun.id='nhiSunKiss';sun.type='button';
 sun.setAttribute('aria-label','Chạm mặt trời để xem Lương đến hôn Nhi');sun.title='Mặt trời · Lương ❤️ Nhi';
 sun.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();start();});cover.append(sun);
 const bouquet=make('button','nhi-v2-hotspot');bouquet.id='nhiBouquetLove';bouquet.type='button';
 bouquet.setAttribute('aria-label','Chạm hoa để Lương và Nhi trò chuyện');bouquet.title='Bó hoa · ck iu / vợ iu';
 bouquet.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();talk();});hero.append(bouquet);
 // The rose-petal/music effect now belongs to the pink clips/flower in Nhi's hair.
 const hair=make('button','nhi-v2-hotspot');hair.id='nhiHairRose';hair.type='button';
 hair.setAttribute('aria-label','Chạm cành hoa trên tóc Nhi: bật hoặc tắt nhạc và hoa hồng rơi');
 hair.setAttribute('aria-pressed','false');
 hair.title='Cành hoa trên tóc Nhi · nhạc và hoa hồng';
 hair.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  const playing=toggleSound();hair.setAttribute('aria-pressed',String(playing));
  if(playing){petals(26);roseTicker=setInterval(()=>{if(!cover.hidden)petals(9);},8000);}
 });hero.append(hair);
 const go=make('button','nhi-v2-enter');go.id='nhiRomanceEnter';go.type='button';
 go.title='Vào học';go.setAttribute('aria-label','Vào học');go.innerHTML='<span aria-hidden="true">→</span>';
 go.addEventListener('click',e=>{e.stopPropagation();document.getElementById('coverGo')?.click();});
 cover.append(go);
 // The sun position varies with background crop. Capture its upper-right painted area.
 cover.addEventListener('click',e=>{
  if(e.target.closest('button,a,input,select,textarea,#nhi-season-controls,#coverHero'))return;
  if(!e.isTrusted)return;
  const r=cover.getBoundingClientRect();
  const x=(e.clientX-r.left)/Math.max(r.width,1),y=(e.clientY-r.top)/Math.max(r.height,1);
  if(x>=.67&&x<=.92&&y>=.05&&y<=.29){e.preventDefault();e.stopImmediatePropagation();start();}
 },true);
 new MutationObserver(()=>{if(cover.hidden){stopSound();reset();}}).observe(cover,{attributes:true,attributeFilter:['hidden']});
}
function toggleCoverLearning(show){
 for(const selector of ['.cover-in>h1','.cover-in>.lead','#coverGo']){
  const node=cover.querySelector(selector);
  if(!node)continue;
  if(show)node.style.removeProperty('display');
  else node.style.setProperty('display','none','important');
 }
}
function reset(){
 toggleCoverLearning(true);
 const title=document.getElementById('nhiLoveTitleV2');
 if(title){title.classList.remove('nhi-title-revealed');title.style.removeProperty('opacity');}
 sceneId++;scheduled.forEach(clearTimeout);scheduled=[];
 cover.classList.remove('nhi-romance-v2-running','nhi-v2-kissing','nhi-v2-done','nhi-v2-talking','nhi-v2-preview','nhi-v2-idle','nhi-v2-arrived');
 document.querySelector('.nhi-illustrated-hearts')?.replaceChildren();
 document.querySelector('.nhi-illustrated-flowers')?.replaceChildren();
}
function pulseHeart(index){
 const holder=cover.querySelector('.nhi-illustrated-hearts');
 if(!holder||reduce())return;
 const outer=make('span','nhi-drawn-heart');
 const isLeft=index%2===0;
 outer.style.setProperty('--start-x',(isLeft?rnd(9,23):rnd(77,91))+'vw');
 outer.style.setProperty('--end-dx',(isLeft?rnd(-38,-7):rnd(7,38))+'px');
 outer.style.setProperty('--heart-size',rnd(13,26)+'px');
 outer.style.setProperty('--heart-delay',rnd(0,.5)+'s');
 outer.style.setProperty('--heart-duration',rnd(5.1,7.4)+'s');
 outer.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="hgrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd9c8"/><stop offset=".5" stop-color="#ffacc1"/><stop offset="1" stop-color="#e994b4"/></linearGradient></defs><path d="M20 35C14 30 2 22 3 12 4 1 15 1 20 10 26 1 38 3 37 13 36 23 26 31 20 35Z" fill="url(#hgrad)" stroke="#c97891" stroke-width="1.7"/><path d="M10 11q3-4 7-2" stroke="white" stroke-width="2.5" opacity=".75" fill="none" stroke-linecap="round"/></svg>';
 holder.append(outer);delay(()=>outer.remove(),9500);
}
function heartBurst(count){
 for(let i=0;i<count;i++)pulseHeart(i);
}
function petalSVG(index){
 const color=['#d86b89','#ed9eaf','#f5b3b9','#f7c6c2','#d9869d'][index%5];
 const shade=['#a64a69','#c66b89','#d78599','#d9909a','#9c4a6d'][index%5];
 const id='nhiPetalGradient'+index;
 return '<svg viewBox="0 0 48 62" aria-hidden="true">'+
  '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2=".9">'+
  '<stop stop-color="#fff2ea"/><stop offset=".37" stop-color="'+color+'"/><stop offset="1" stop-color="'+shade+'"/></linearGradient></defs>'+
  '<path d="M24 4C7 6 0 25 8 46Q15 60 31 53C46 45 49 26 38 12Q31 3 24 4Z" fill="url(#'+id+')" stroke="'+shade+'" stroke-width=".7"/>'+
  '<path d="M17 10Q31 19 33 44Q23 52 15 45" fill="none" stroke="#fff5ee" stroke-opacity=".42" stroke-width="1.4"/>'+
  '<path d="M9 32Q17 18 27 12M24 49Q31 29 38 23" fill="none" stroke="'+shade+'" stroke-opacity=".24" stroke-width="1.5"/>'+
  '<path d="M13 14Q21 6 29 10" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="2" stroke-linecap="round"/></svg>';
}
function petals(count){
 const holder=cover.querySelector('.nhi-illustrated-flowers');
 if(!holder||reduce())return;
 const frag=document.createDocumentFragment();
 for(let i=0;i<count;i++){
  const p=make('span','nhi-real-petal');
  const depth=i%3; // three parallax depths just like real falling petals
  p.innerHTML=petalSVG(i);
  p.style.setProperty('--rose-left',(i%2?rnd(78,99):rnd(0,22))+'%');
  p.style.setProperty('--rose-width',rnd(14,depth===0?22:depth===1?30:37)+'px');
  p.style.setProperty('--rose-depth',depth===0?.67:depth===1?1:1.3);
  p.style.setProperty('--rose-opacity',depth===0?.46:depth===1?.76:.91);
  p.style.setProperty('--rose-blur',depth===0?'1.1px':depth===1?'.25px':'0px');
  p.style.setProperty('--rose-duration',rnd(7.5,depth===0?16:depth===1?13:10)+'s');
  p.style.setProperty('--rose-delay',rnd(0,4)+'s');
  const wind=rnd(-105,105),turn=rnd(-780,780);
  p.style.setProperty('--rose-wind',wind+'px');
  p.style.setProperty('--rose-wind-first',Math.round(wind*.36)+'px');
  p.style.setProperty('--rose-wind-second',Math.round(wind*.84)+'px');
  p.style.setProperty('--rose-turn-first',Math.round(turn*.3)+'deg');
  p.style.setProperty('--rose-turn-second',Math.round(turn*.66)+'deg');
  p.style.setProperty('--rose-sway',rnd(11,43)+'px');
  p.style.setProperty('--rose-turn',turn+'deg');
  p.style.setProperty('--rose-flutter',rnd(2.1,4.4)+'s');
  frag.append(p);
  delay(()=>p.remove(),22000);
 }
 holder.append(frag);
}
function talk(){
 if(!scene())cover.classList.add('nhi-v2-preview');
 cover.classList.remove('nhi-v2-talking');void cover.offsetWidth;
 cover.classList.add('nhi-v2-talking');
 delay(()=>cover.classList.remove('nhi-v2-talking'),4600);
}
function start(){
 reset();cover.classList.remove('nhi-v2-preview');void cover.offsetWidth;
 cover.classList.add('nhi-romance-v2-running');
 toggleCoverLearning(false);
 if(reduce()){cover.classList.add('nhi-v2-done');return;}
 const run=sceneId;
 delay(()=>{if(run===sceneId)cover.classList.add('nhi-v2-arrived');},6500);
 delay(()=>{if(run===sceneId){cover.classList.add('nhi-v2-kissing');heartBurst(5);petals(8);}},7200);
 delay(()=>{if(run===sceneId)cover.classList.remove('nhi-v2-kissing');},9900);
 delay(()=>{if(run===sceneId){
  cover.classList.add('nhi-v2-done');
  const title=document.getElementById('nhiLoveTitleV2');
  title?.classList.add('nhi-title-revealed');
}},10300);
 delay(()=>{if(run===sceneId)cover.classList.add('nhi-v2-idle');},16100);
}
function tone(ctx,hz,start,len,volume){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hz;
 g.gain.setValueAtTime(.00001,start);g.gain.exponentialRampToValueAtTime(volume,start+.14);
 g.gain.exponentialRampToValueAtTime(.00001,start+len);
 o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+len+.03);
}
function stopSound(){
 if(roseTicker){clearInterval(roseTicker);roseTicker=null;}
 if(audioTick)clearInterval(audioTick);audioTick=null;
 if(audio){const a=audio;audio=null;a.close().catch(()=>{});}
}
function toggleSound(){
 if(audio){stopSound();return false;}
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return false;
  audio=new Audio();audio.resume().catch(()=>{});
  const chords=[[261.63,329.63,392],[220,261.63,349.23],[196,246.94,329.63],[220,293.66,392]];
  let t=0;const play=()=>{if(!audio)return;const now=audio.currentTime+.04,notes=chords[t++%chords.length];
   notes.forEach((v,i)=>tone(audio,v,now+i*.25,3,.008));tone(audio,notes[0]/2,now,3.2,.004);};
  play();audioTick=setInterval(play,3350);return true;
 }catch(_e){stopSound();return false;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
window.addEventListener('pagehide',stopSound);
})();
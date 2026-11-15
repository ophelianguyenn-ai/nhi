/* Original, gentle synthesized two-note kitten mew.
 * Audio starts only after a learner gesture, and can be replayed by tapping the cat.
 * No external recording, streaming, music or paid API. */
(function(){
'use strict';
let audio=null,hasUnlocked=false;
const Ctx=window.AudioContext||window.webkitAudioContext;
function unlock(){
 if(!Ctx)return;
 try{
  if(!audio)audio=new Ctx();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  hasUnlocked=true;
 }catch(e){}
}
document.addEventListener('pointerdown',function(e){
 if(e.target.closest('#planBox,.sdone'))unlock();
}, {passive:true,capture:true});
document.addEventListener('keydown',function(e){
 if(e.target.closest('#planBox')&&['Enter',' ','1','2','ArrowRight','ArrowLeft'].includes(e.key))unlock();
}, {passive:true,capture:true});
function note(at,length,base,volume){
 if(!audio)return;
 const osc=audio.createOscillator(),harm=audio.createOscillator();
 const filter=audio.createBiquadFilter(),gain=audio.createGain(),vib=audio.createOscillator(),wiggle=audio.createGain();
 osc.type='triangle';harm.type='sine';
 // High, small first vowel, then a descending, breathy 'meow' tail.
 osc.frequency.setValueAtTime(base*.85,at);
 osc.frequency.exponentialRampToValueAtTime(base*1.18,at+length*.22);
 osc.frequency.exponentialRampToValueAtTime(base*.56,at+length*.94);
 harm.frequency.setValueAtTime(base*1.9,at);
 harm.frequency.exponentialRampToValueAtTime(base*2.2,at+length*.22);
 harm.frequency.exponentialRampToValueAtTime(base*1.08,at+length*.94);
 vib.type='sine';vib.frequency.value=7;wiggle.gain.value=4.5;
 vib.connect(wiggle);wiggle.connect(osc.frequency);
 filter.type='lowpass';filter.frequency.setValueAtTime(2500,at);
 filter.frequency.exponentialRampToValueAtTime(850,at+length);
 gain.gain.setValueAtTime(.0001,at);
 gain.gain.linearRampToValueAtTime(volume,at+.075);
 gain.gain.setValueAtTime(volume*.82,at+length*.36);
 gain.gain.exponentialRampToValueAtTime(.0001,at+length);
 const sub=audio.createGain();sub.gain.value=.22;
 harm.connect(sub);osc.connect(filter);sub.connect(filter);filter.connect(gain);gain.connect(audio.destination);
 for(const v of [osc,harm,vib])v.start(at);
 for(const v of [osc,harm,vib])v.stop(at+length+.04);
}
let last=0;
function meow(){
 if(!Ctx)return;
 unlock();
 if(!audio)return;
 const t=performance.now();
 if(t-last<1400)return;last=t;
 try{
  const when=audio.currentTime+.04;
  note(when,.55,590,.057);
  note(when+.73,.63,690,.052);
 }catch(e){}
}
function attach(img){
 if(!img||img.dataset.kittenMeowAttached)return;
 img.dataset.kittenMeowAttached='true';
 img.tabIndex=0;img.setAttribute('role','button');
 img.setAttribute('aria-label','Mèo chúc mừng! Nhấn để nghe meo meo');
 img.title='Nhấn mèo để nghe meo meo!';
 img.addEventListener('click',e=>{e.stopPropagation();meow();});
 img.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();meow();}
 });
}
window.NHI_VICTORY_CAT={meow,attach};
window.addEventListener('pagehide',()=>{if(audio)audio.close().catch(()=>{});audio=null;});
})();
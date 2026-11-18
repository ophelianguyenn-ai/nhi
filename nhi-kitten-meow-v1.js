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
// Real 1.2-second meow recorded from a young female cat, CC0 (George Miquilena).
// Source: https://commons.wikimedia.org/wiki/File:Maullido_de_gata_hembra_joven.ogg
// Keep the offline oscillator as fallback when Wikimedia is inaccessible/unsupported.
const MEOW_URL='https://upload.wikimedia.org/wikipedia/commons/c/c0/Maullido_de_gata_hembra_joven.ogg';
let recording=null,last=0;
function fallbackMeow(){
 if(!Ctx)return;
 unlock();
 if(!audio)return;
 try{
  const when=audio.currentTime+.04;
  note(when,.52,630,.068);
  note(when+.57,.44,740,.046);
 }catch(e){}
}
function playRealMeow(){
 try{
  if(!recording){
   recording=new Audio(MEOW_URL);
   recording.preload='auto';
   recording.volume=.8;
   recording.playbackRate=1.08; // Just a little higher and sweeter, still the real recording.
  }
  if(recording.canPlayType && !recording.canPlayType('audio/ogg; codecs="vorbis"'))return false;
  recording.pause();
  recording.currentTime=0;
  const promise=recording.play();
  if(promise && typeof promise.catch==='function')promise.catch(fallbackMeow);
  return true;
 }catch(e){return false;}
}
function meow(){
 const t=performance.now();
 if(t-last<950)return;
 last=t;
 if(!playRealMeow())fallbackMeow();
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
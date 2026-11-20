/* User-supplied meo(1).mp3 is played unchanged, and only on cat click. */
(function(){
'use strict';
var recording=null;
var src='audio/ui/kitten-meow.mp3?v=20261120-user-meo';
function meow(){
 try{
  if(!recording){
   recording=new Audio(src);
   recording.preload='auto';
   recording.volume=1;
   recording.playbackRate=1;
  }
  recording.pause();
  recording.currentTime=0;
  var playing=recording.play();
  if(playing&&typeof playing.catch==='function'){
   playing.catch(function(err){console.warn('Cat sound needs a user gesture',err);});
  }
 }catch(err){console.warn('Unable to play cat recording',err);}
}
function attach(img){
 if(!img||img.dataset.kittenMeowAttached)return;
 img.dataset.kittenMeowAttached='true';
 img.tabIndex=0;
 img.setAttribute('role','button');
 img.setAttribute('aria-label','Chạm mèo để nghe tiếng kêu');
 img.title='Bấm vào mèo để nghe tiếng meo!';
 img.addEventListener('click',function(e){e.stopPropagation();meow();});
 img.addEventListener('keydown',function(e){
  if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();meow();}
 });
}
window.NHI_VICTORY_CAT={meow:meow,attach:attach};
window.addEventListener('pagehide',function(){if(recording){recording.pause();recording=null;}});
})();

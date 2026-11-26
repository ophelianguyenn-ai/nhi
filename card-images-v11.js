(function(){
'use strict';var presets={};fetch('technical-images.json').then(function(r){return r.json();}).then(function(d){presets=d;}).catch(function(){});
function node(tag,text){var n=document.createElement(tag);if(text)n.textContent=text;return n;}
function safe(url){return /^pictures\/[a-z-]+\.webp$/.test(url)||/^https:\/\//i.test(url)||/^data:image\/(jpeg|png|webp);base64,/.test(url);}
function figure(it,value,onResize){
  var v=value||presets[it.ko];
  if(!v||v.hidden||!safe(v.url||''))return null;
  var f=node('figure');f.className='card-illustration';
  var stage=node('div');stage.className='nhi-image-stage';
  var im=node('img');im.src=v.url;im.alt=v.caption||it.vi;im.loading='lazy';
  im.referrerPolicy='no-referrer';im.draggable=false;
  im.onerror=function(){im.hidden=true;};
  stage.appendChild(im);f.appendChild(stage);
  // Keep original caption/credit in saved metadata and editor, but do not
  // display either the word meaning or image source under the picture.
  if(typeof onResize!=='function')return f;
  var width=Math.max(100,Math.min(680,Number(v.width)||220));
  var height=Math.max(0,Math.min(520,Number(v.height)||0));
  var offsetX=Math.max(-320,Math.min(320,Number(v.offsetX)||0));
  var offsetY=Math.max(-220,Math.min(220,Number(v.offsetY)||0));
  var clamp=function(n,min,max){return Math.max(min,Math.min(max,n));};
  f.dataset.resizable='true';
  f.setAttribute('aria-label','Ảnh minh họa. Kéo để di chuyển cả khung; kéo cạnh hoặc góc để đổi kích thước.');
  im.title='Kéo ảnh để di chuyển cả khung theo chiều ngang hoặc dọc; kéo cạnh để chỉnh kích thước';
  im.style.touchAction='none';

  function paint(){
    f.style.setProperty('--nhi-image-width',Math.round(width)+'px');
    var parent=f.closest('.pfront');
    if(parent)parent.style.setProperty('--nhi-image-width',Math.round(width)+'px');
    f.style.setProperty('--nhi-image-height',height?Math.round(height)+'px':'auto');
    f.style.setProperty('--nhi-frame-x',Math.round(offsetX)+'px');
    f.style.setProperty('--nhi-image-x','0px');
    // Move the entire figure (frame, resize grips and photograph), NOT the
    // image within a fixed, clipped stage.
    f.style.setProperty('--nhi-frame-y',Math.round(offsetY)+'px');
    f.style.setProperty('--nhi-image-y','0px');
    var onDesktop=window.matchMedia&&!window.matchMedia('(max-width:700px), (max-width:900px) and (pointer:coarse)').matches;
    if(parent){
      parent.style.setProperty('--nhi-photo-shift-x',onDesktop?Math.round(offsetX)+'px':'0px');
      parent.style.setProperty('--nhi-image-width',Math.round(width)+'px');
      if(onDesktop){
        // Direct column sizing, not CSS calc(min()) with a percentage:
        // legacy rules were silently winning and leaving X visually unchanged.
        var pStyle=getComputedStyle(parent);
        var available=Math.max(350,parent.clientWidth-
          (parseFloat(pStyle.paddingLeft)||0)-(parseFloat(pStyle.paddingRight)||0));
        var col=Math.max(160,Math.min(width,available*.34));
        // For left moves the content lane shrinks and moves the photo in-grid.
        // For right moves the photo itself translates; the column cannot grow
        // beyond free space because CSS Grid would silently shrink it back.
        var left=Math.max(180,available-col-14+Math.min(0,offsetX));
        parent.style.setProperty('grid-template-columns',
          'minmax(0,'+Math.round(left)+'px) minmax(0,'+Math.round(col)+'px)','important');
      }else{
        parent.style.removeProperty('grid-template-columns');
      }
      // The bilingual text and notes follow the visual free-space center.
      // Translation is separate from their existing drag transforms.
      var follow=onDesktop?Math.round(Math.max(0,offsetX)/2):0;
      parent.querySelectorAll(':scope>.nhi-ko-line,:scope>.vi-under,:scope>.hanja,:scope>.nhi-card-details')
        .forEach(function(el){
          el.style.setProperty('translate',follow+'px 0px','important');
        });
    }
    // Inline-important wins over old Y-only CSS. Positive X moves the
    // figure directly, negative X moves its grid column, avoiding double X.
    var visualX=onDesktop?Math.max(0,offsetX):0;
    f.style.setProperty('transform',
      'translate3d('+Math.round(visualX)+'px,'+Math.round(onDesktop?offsetY:0)+'px,0)','important');
  }
  function commit(){
    onResize(Object.assign({},v,{width:Math.round(width),height:Math.round(height),
      offsetX:Math.round(offsetX),offsetY:Math.round(offsetY)}));
    // Resizing changes the live text column too. Notify the rate-button
    // alignment code whenever width or image position is saved.
    f.dispatchEvent(new CustomEvent('nhi:image-layout',{bubbles:true}));
  }
  // Public instance method for the four-way controller. Unlike proxy clicks
  // on hidden legacy buttons, this always updates the frame and persisted data.
  f.nhiMoveBy=function(dx,dy){
    var nextX=clamp(offsetX+(Number(dx)||0),-320,320);
    var nextY=clamp(offsetY+(Number(dy)||0),-220,220);
    if(nextX===offsetX&&nextY===offsetY)return false;
    offsetX=nextX;offsetY=nextY;
    f.classList.add('nhi-image-selected');
    paint();commit();
    f.dispatchEvent(new CustomEvent('nhi:image-moved',{bubbles:true,
      detail:{offsetX:offsetX,offsetY:offsetY}}));
    return true;
  };
  f.addEventListener('click',function(e){f.classList.add('nhi-image-selected');e.stopPropagation();});
  f.addEventListener('focusout',function(e){
    if(!f.contains(e.relatedTarget))f.classList.remove('nhi-image-selected');
  });

  // Dragging the photo moves the complete figure in both axes.
  var drag=null;
  im.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    f.classList.add('nhi-image-selected');
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY,changed:false};
    try{im.setPointerCapture(e.pointerId);}catch(_e){}
  });
  im.addEventListener('pointermove',function(e){
    if(!drag||drag.id!==e.pointerId)return;
    var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)<4&&!drag.changed)return;
    drag.changed=true;f.classList.add('nhi-image-dragging');
    offsetX=clamp(drag.ox+dx,-320,320);
    offsetY=clamp(drag.oy+dy,-220,220);
    paint();
    f.dispatchEvent(new CustomEvent('nhi:image-moved',{bubbles:true,
      detail:{offsetX:offsetX,offsetY:offsetY}}));
    e.stopPropagation();
  });
  function endMove(e){
    if(!drag||drag.id!==e.pointerId)return;
    var changed=drag.changed;drag=null;
    f.classList.remove('nhi-image-dragging');f.classList.add('nhi-image-selected');
    if(changed)commit();
    e.stopPropagation();
  }
  im.addEventListener('pointerup',endMove);
  im.addEventListener('pointercancel',endMove);

  // The former vertical two-way grip is now ONE four-way drag handle.
  // Keep its class for historical smoke tests and backward-compatible selectors.
  var moveY=node('button','✥');
  moveY.type='button';
  moveY.className='nhi-image-move-y nhi-image-move-4d';
  moveY.setAttribute('aria-label','Giữ và kéo để di chuyển ảnh lên, xuống, trái, phải');
  moveY.title='Giữ và kéo theo cả bốn hướng; phím ↑ ↓ ← → di chuyển 12 px';
  stage.appendChild(moveY);
  var xyDrag=null;
  // Use document capture instead of relying on a moving button's pointer capture.
  // This works even when the image changes its horizontal grid lane during drag.
  function trackingMove(e){
    if(!xyDrag||e.pointerId!==xyDrag.id)return;
    var targetX=clamp(xyDrag.startX+e.clientX-xyDrag.clientX,-320,320);
    var targetY=clamp(xyDrag.startY+e.clientY-xyDrag.clientY,-220,220);
    if(targetX===offsetX&&targetY===offsetY)return;
    offsetX=targetX;offsetY=targetY;
    paint();
    f.dispatchEvent(new CustomEvent('nhi:image-moved',{bubbles:true,
      detail:{offsetX:offsetX,offsetY:offsetY}}));
    e.preventDefault();
  }
  function trackingEnd(e){
    if(!xyDrag||e.pointerId!==xyDrag.id)return;
    xyDrag=null;
    document.removeEventListener('pointermove',trackingMove,true);
    document.removeEventListener('pointerup',trackingEnd,true);
    document.removeEventListener('pointercancel',trackingEnd,true);
    f.classList.remove('nhi-image-dragging');
    f.classList.add('nhi-image-selected');
    commit();
    e.preventDefault();e.stopPropagation();
  }
  moveY.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    f.classList.add('nhi-image-selected','nhi-image-dragging');
    xyDrag={id:e.pointerId,clientX:e.clientX,clientY:e.clientY,startX:offsetX,startY:offsetY};
    document.addEventListener('pointermove',trackingMove,{capture:true,passive:false});
    document.addEventListener('pointerup',trackingEnd,true);
    document.addEventListener('pointercancel',trackingEnd,true);
  });
  moveY.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});
  moveY.addEventListener('keydown',function(e){
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    f.nhiMoveBy(e.key==='ArrowLeft'?-12:e.key==='ArrowRight'?12:0,
      e.key==='ArrowUp'?-12:e.key==='ArrowDown'?12:0);
  });

  // Eight edge/corner handles replace ALL old range sliders and panels.
  // Corners always keep the image's current width:height ratio.
  var labels={n:'cạnh trên',s:'cạnh dưới',e:'cạnh phải',w:'cạnh trái',
    ne:'góc trên phải',nw:'góc trên trái',se:'góc dưới phải',sw:'góc dưới trái'};
  Object.keys(labels).forEach(function(edge){
    var handle=node('button');
    handle.type='button';
    handle.className='nhi-image-handle nhi-image-handle-'+edge;
    handle.dataset.edge=edge;
    handle.setAttribute('aria-label','Kéo '+labels[edge]+' để thay đổi kích thước ảnh'+(edge.length===2?' đồng tỷ lệ':''));
    handle.title=handle.getAttribute('aria-label');
    stage.appendChild(handle);
    var sizing=null;
    function bounds(){
      var rect=stage.getBoundingClientRect();
      return {width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    }
    function maxWidth(){
      var area=f.closest('.pfront');
      return clamp(area?area.clientWidth*.56:680,115,680);
    }
    function calculate(dx,dy,base){
      var signX=edge.includes('e')?1:edge.includes('w')?-1:0;
      var signY=edge.includes('s')?1:edge.includes('n')?-1:0;
      if(edge.length===2){
        var xFraction=signX*dx/base.width;
        var yFraction=signY*dy/base.height;
        var factor=1+(Math.abs(xFraction)>Math.abs(yFraction)?xFraction:yFraction);
        var minFactor=Math.max(90/base.width,80/base.height);
        var maxFactor=Math.min(maxWidth()/base.width,520/base.height);
        factor=clamp(factor,minFactor,Math.max(minFactor,maxFactor));
        width=clamp(base.width*factor,90,maxWidth());
        height=clamp(base.height*(width/base.width),80,520);
      }else if(signX){
        width=clamp(base.width+signX*dx,90,maxWidth());
        height=clamp(base.height,80,520);
      }else if(signY){
        width=clamp(base.width,90,maxWidth());
        height=clamp(base.height+signY*dy,80,520);
      }
      paint();
    }
    handle.addEventListener('pointerdown',function(e){
      if(e.pointerType==='mouse'&&e.button!==0)return;
      e.preventDefault();e.stopPropagation();
      f.classList.add('nhi-image-selected','nhi-image-resizing');
      sizing={id:e.pointerId,x:e.clientX,y:e.clientY,...bounds()};
      try{handle.setPointerCapture(e.pointerId);}catch(_e){}
    });
    handle.addEventListener('pointermove',function(e){
      if(!sizing||sizing.id!==e.pointerId)return;
      calculate(e.clientX-sizing.x,e.clientY-sizing.y,sizing);
      e.preventDefault();e.stopPropagation();
    });
    function finishResize(e){
      if(!sizing||sizing.id!==e.pointerId)return;
      sizing=null;f.classList.remove('nhi-image-resizing');
      commit();e.preventDefault();e.stopPropagation();
    }
    handle.addEventListener('pointerup',finishResize);
    handle.addEventListener('pointercancel',finishResize);
    handle.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});
    handle.addEventListener('keydown',function(e){
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      var base=bounds();
      var dx=e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0;
      var dy=e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0;
      calculate(dx,dy,base);commit();
    });
  });
  requestAnimationFrame(paint);
  window.addEventListener('resize',paint,{passive:true});
  return f;
}
function editor(it,value,save){var box=node('fieldset');box.className='image-editor';box.appendChild(node('legend','Hình ảnh minh họa'));var current=value||presets[it.ko]||{},draft=Object.assign({},current);
var preview=node('div');box.appendChild(preview);function paint(){preview.replaceChildren();var f=figure(it,draft);if(f)preview.appendChild(f);}paint();
function field(label,val){var l=node('label',label),i=node('input');i.className='field';i.value=val||'';l.appendChild(i);box.appendChild(l);return i;}
var query=field('Từ khóa tìm ảnh',it.ko+' '+it.vi),url=field('Đường dẫn ảnh HTTPS',current.url&&current.url.indexOf('data:')!==0?current.url:''),caption=field('Chú thích',current.caption||it.vi);var row=node('div');row.className='dictionary-links';box.appendChild(row);
function button(text,fn){var b=node('button',text);b.type='button';b.className='ghost';b.onclick=fn;row.appendChild(b);return b;}
var status=node('p');status.className='hint';box.appendChild(status);var results=node('div');results.className='image-results';box.appendChild(results);var run=0;
button('Tìm ảnh miễn phí',async function(){var token=++run;results.replaceChildren();status.textContent='Đang tìm trên Wikimedia Commons…';try{var q=query.value.trim();var api='https://commons.wikimedia.org/w/api.php?origin=*&action=query&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch='+encodeURIComponent(q)+'&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=500&format=json';var r=await fetch(api);if(!r.ok)throw Error();var data=await r.json();if(token!==run)return;Object.values((data.query||{}).pages||{}).forEach(function(p){var info=(p.imageinfo||[])[0];if(!info||!/^image\//.test((info.extmetadata?.MIMEType||{}).value||'image/'))return;var b=node('button');b.type='button';var im=node('img');im.src=info.thumburl||info.url;im.loading='lazy';b.appendChild(im);b.appendChild(node('span',p.title.replace(/^File:/,'')));b.onclick=function(){function plain(x){return new DOMParser().parseFromString(x||'','text/html').body.textContent;}draft={url:info.thumburl||info.url,caption:caption.value,source:info.descriptionurl,credit:plain(info.extmetadata?.Artist?.value)+' · '+plain(info.extmetadata?.LicenseShortName?.value)};url.value=draft.url;paint();status.textContent='Đã chọn ảnh. Bấm Lưu ảnh để áp dụng.';};results.appendChild(b);});status.textContent=results.childElementCount?'Chọn ảnh phù hợp, rồi bấm Lưu ảnh.':'Chưa có kết quả. Thử từ khóa tiếng Anh (ví dụ: centrifugal pump).';}catch(e){status.textContent='Chưa kết nối được kho ảnh. Dùng Tìm trên Google hoặc tải ảnh từ máy.';}});
button('Tìm trên Google',function(){window.open('https://www.google.com/search?tbm=isch&q='+encodeURIComponent(query.value),'_blank','noopener,noreferrer');});
var file=node('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Tải hình từ máy');box.appendChild(file);file.onchange=function(){var f=file.files[0];if(!f)return;if(f.size>12*1024*1024){status.textContent='Chọn ảnh dưới 12 MB.';return;}var reader=new FileReader();reader.onload=function(){var img=new Image();img.onload=function(){var c=node('canvas'),scale=Math.min(1,1000/img.width,1000/img.height);c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);draft={url:c.toDataURL('image/jpeg',.78),caption:caption.value};url.value='';paint();status.textContent='Ảnh đã sẵn sàng. Bấm Lưu ảnh.';};img.src=reader.result;};reader.readAsDataURL(f);};
url.oninput=function(){draft.url=url.value.trim();draft.source='';draft.credit='';paint();};caption.oninput=function(){draft.caption=caption.value;paint();};
button('Lưu ảnh',function(){if(!safe(draft.url||'')){status.textContent='Chọn ảnh hoặc nhập đường dẫn ảnh HTTPS.';return;}draft.caption=caption.value;save(draft);status.textContent='Đã lưu ảnh và đồng bộ với tiến độ.';});button('Ẩn ảnh',function(){draft={hidden:true};save(draft);paint();status.textContent='Đã ẩn ảnh trên thẻ.';});button('Ảnh mặc định',function(){save(null);draft=presets[it.ko]||{};paint();status.textContent='Đã khôi phục ảnh mặc định.';});return box;}
window.NHI_IMAGES={figure:figure,editor:editor};
})();

/* Nhi's Learning Corner: selectable window/card transitions. */
(function(){
'use strict';
const STORAGE='nhi-window-transition-settings-v1';
const TYPES=[
  ['default','Mặc định cho tất cả'],
  ['editor','Cửa sổ chỉnh sửa thẻ (giống Cài đặt tổng)'],
  ['settings','Cửa sổ Cài đặt'],
  ['ai','Cửa sổ chat AI'],
  ['dialog','Hộp thoại và cửa sổ khác'],
  ['card','Lật thẻ (mặt trước / sau)'],
  ['navigation','Tiến / Lùi giữa các thẻ'],
  ['change','Thay đổi nội dung / tùy chọn']
];
const EFFECT_GROUPS=[
  {
    "label": "Mờ dần · Phóng/thu",
    "options": [
      [
        "fade",
        "Mờ dần"
      ],
      [
        "fade-up",
        "Mờ dần từ dưới"
      ],
      [
        "fade-down",
        "Mờ dần từ trên"
      ],
      [
        "fade-left",
        "Mờ dần từ trái"
      ],
      [
        "fade-right",
        "Mờ dần từ phải"
      ],
      [
        "zoom",
        "Phóng nhẹ"
      ],
      [
        "zoom-strong",
        "Phóng từ nhỏ"
      ],
      [
        "zoom-out",
        "Thu từ lớn"
      ],
      [
        "zoom-blur",
        "Phóng và tan mờ"
      ],
      [
        "soft-pop",
        "Bật mềm"
      ],
      [
        "icon",
        "Phóng từ biểu tượng"
      ],
      [
        "blur-in",
        "Từ mờ thành nét"
      ],
      [
        "focus-in",
        "Lấy nét mềm"
      ]
    ]
  },
  {
    "label": "Trượt · Bay vào",
    "options": [
      [
        "slide-side",
        "Trượt ngang theo hướng"
      ],
      [
        "slide-up",
        "Trượt lên"
      ],
      [
        "slide-down",
        "Trượt xuống"
      ],
      [
        "slide-left",
        "Trượt từ trái"
      ],
      [
        "slide-right",
        "Trượt từ phải"
      ],
      [
        "slide-far",
        "Trượt xa"
      ],
      [
        "slide-diagonal-up",
        "Trượt chéo lên"
      ],
      [
        "slide-diagonal-down",
        "Trượt chéo xuống"
      ],
      [
        "slide-overshoot",
        "Trượt vượt đà"
      ],
      [
        "float-in",
        "Lướt nhẹ vào"
      ]
    ]
  },
  {
    "label": "Nảy · Đàn hồi",
    "options": [
      [
        "bounce",
        "Nảy xuống"
      ],
      [
        "spring",
        "Lò xo mềm"
      ],
      [
        "elastic",
        "Đàn hồi ngang"
      ],
      [
        "rubber",
        "Co giãn cao su"
      ],
      [
        "back-in",
        "Lùi rồi bật"
      ],
      [
        "pop",
        "Bật nổi"
      ],
      [
        "pulse",
        "Nhịp phóng"
      ],
      [
        "heartbeat",
        "Nhịp tim"
      ],
      [
        "shake-x",
        "Rung ngang"
      ],
      [
        "shake-y",
        "Rung dọc"
      ],
      [
        "wobble",
        "Lắc lư"
      ],
      [
        "jello",
        "Rung thạch"
      ]
    ]
  },
  {
    "label": "Xoay · Lật 3D",
    "options": [
      [
        "flip-x",
        "Lật 3D trục ngang"
      ],
      [
        "flip-y",
        "Lật 3D trục dọc"
      ],
      [
        "flip-diagonal",
        "Lật 3D chéo"
      ],
      [
        "tilt-in",
        "Nghiêng vào"
      ],
      [
        "rotate-left",
        "Xoay từ trái"
      ],
      [
        "rotate-right",
        "Xoay từ phải"
      ],
      [
        "spin-in",
        "Xoay tròn"
      ],
      [
        "swing",
        "Đu đưa"
      ],
      [
        "cube-left",
        "Khối lập phương trái"
      ],
      [
        "cube-right",
        "Khối lập phương phải"
      ],
      [
        "page-turn",
        "Lật trang sách"
      ],
      [
        "book-open",
        "Mở quyển sách"
      ]
    ]
  },
  {
    "label": "Màn che · Hiện hình",
    "options": [
      [
        "wipe-left",
        "Mở màn từ trái"
      ],
      [
        "wipe-right",
        "Mở màn từ phải"
      ],
      [
        "wipe-up",
        "Mở màn từ dưới"
      ],
      [
        "wipe-down",
        "Mở màn từ trên"
      ],
      [
        "curtain",
        "Rèm mở dọc"
      ],
      [
        "iris",
        "Khẩu độ tròn"
      ],
      [
        "unfold",
        "Mở nếp gấp"
      ],
      [
        "fold-in",
        "Gấp 3D"
      ],
      [
        "blinds",
        "Rèm trượt giữa"
      ],
      [
        "reveal-top",
        "Hiện dần từ trên"
      ]
    ]
  },
  {
    "label": "Độc đáo · Nổi bật",
    "options": [
      [
        "light-speed",
        "Lướt tốc độ cao"
      ],
      [
        "skew-in",
        "Nghiêng phối cảnh"
      ],
      [
        "glow-in",
        "Phát sáng nhẹ"
      ],
      [
        "drop-in",
        "Rơi từ trên"
      ],
      [
        "rise-in",
        "Vút từ dưới"
      ],
      [
        "hinge-in",
        "Bản lề xoay"
      ],
      [
        "roll-in",
        "Lăn vào"
      ],
      [
        "magnetic",
        "Hút nam châm"
      ],
      [
        "stretch",
        "Kéo giãn"
      ],
      [
        "squash",
        "Nén bật"
      ]
    ]
  }
];
const OPTIONS=[['inherit','Theo mặc định'],['classic','Hiệu ứng gốc (khuyến nghị)'],...EFFECT_GROUPS.flatMap(group=>group.options),['none','Không hiệu ứng']];
const FALLBACK={default:'fade',editor:'icon',settings:'soft-pop',ai:'slide-side',dialog:'zoom',card:'classic',navigation:'classic',change:'fade'};
const DEFAULT_DURATION={default:.29,editor:.29,settings:.29,ai:.29,dialog:.29,card:.35,navigation:.62,change:.19};
const MIN_SECONDS=.1,MAX_SECONDS=5;
let prefs={};try{prefs=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch(_){}
if(!prefs||typeof prefs!=='object')prefs={};
// Restore the original card motions for existing installations exactly once.
// Preserve all user-entered durations and all unrelated transition preferences.
if(!prefs.classicCardMotionRestoredV108){
  prefs.card='classic';
  prefs.navigation='classic';
  prefs.classicCardMotionRestoredV108=true;
  try{localStorage.setItem(STORAGE,JSON.stringify(prefs));}catch(_){}
}
const running=new WeakMap();
const durationSeconds=type=>{
  const value=Number(prefs.durations?.[type]);
  return Number.isFinite(value)&&value>=MIN_SECONDS&&value<=MAX_SECONDS?value:DEFAULT_DURATION[type]??DEFAULT_DURATION.default;
};
const durationMs=type=>Math.round(durationSeconds(type)*1000);
const saveSettings=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(prefs));}catch(_){}};

const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const choose=type=>{
  // Editor must use exactly the same effect as the main Settings window.
  const category=type==='editor'?'settings':type;
  const selected=prefs[category];
  if(selected && OPTIONS.some(x=>x[0]===selected) && selected!=='inherit')return selected;
  if(category!=='default' && prefs.default && prefs.default!=='inherit')return prefs.default;
  return FALLBACK[category]||FALLBACK.default;
};
function keyframes(name,out,direction) {
  const sign=direction===-1?-1:1;
  const base='translate3d(0,0,0) scale(1) rotate(0deg)';
  const neutral3d='perspective(1100px) translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotate(0deg) scale(1)';
  const from=(value,extra)=>[
    Object.assign({opacity:.09,transform:value},extra||{}),
    {opacity:1,transform:base,...(extra?.filter?{filter:'blur(0px)'}:{})}
  ];
  const frame=(opacity,transform,offset)=>offset===undefined?{opacity,transform}:{opacity,transform,offset};
  let frames;
  switch(name){
    case 'classic':
      if(direction===1||direction===-1){
        frames=[
          {opacity:.08,transform:'perspective(1100px) translateX('+(sign*54)+'px) rotateY('+(sign*-7)+'deg) scale(.947)',filter:'blur(2px)'},
          {offset:.72,opacity:1,transform:'perspective(1100px) translateX('+(sign*-5)+'px) rotateY('+(sign*.8)+'deg) scale(1.008)',filter:'blur(0px)'},
          {opacity:1,transform:'perspective(1100px) translateX(0) rotateY(0deg) scale(1)',filter:'blur(0px)'}
        ];
      }else frames=[
        {opacity:.2,transform:'perspective(1100px) translateY(12px) scale(.982)'},
        {opacity:1,transform:'perspective(1100px) translateY(0) scale(1)'}
      ];
      break;
    case 'fade':frames=[{opacity:0},{opacity:1}];break;
    case 'fade-up':frames=from('translate3d(0,22px,0) scale(1) rotate(0deg)');break;
    case 'fade-down':frames=from('translate3d(0,-22px,0) scale(1) rotate(0deg)');break;
    case 'fade-left':frames=from('translate3d(-26px,0,0) scale(1) rotate(0deg)');break;
    case 'fade-right':frames=from('translate3d(26px,0,0) scale(1) rotate(0deg)');break;
    case 'zoom':frames=from('translate3d(0,0,0) scale(.87) rotate(0deg)');break;
    case 'zoom-strong':frames=from('translate3d(0,0,0) scale(.45) rotate(0deg)');break;
    case 'zoom-out':frames=from('translate3d(0,0,0) scale(1.4) rotate(0deg)');break;
    case 'zoom-blur':frames=from('translate3d(0,0,0) scale(.66) rotate(0deg)',{filter:'blur(8px)'});break;
    case 'soft-pop':frames=[frame(0,'scale(.9)'),frame(1,'scale(1.035)',.72),frame(1,'scale(1)')];break;
    case 'icon':frames=[{opacity:.12,transform:'translate3d(38%,-30%,0) scale(.18)',filter:'blur(2px)'},{opacity:1,transform:base,filter:'blur(0px)'}];break;
    case 'blur-in':frames=[{opacity:0,filter:'blur(14px)'},{opacity:1,filter:'blur(0px)'}];break;
    case 'focus-in':frames=[{opacity:0,transform:'scale(1.08)',filter:'blur(10px)'},{opacity:1,transform:'scale(1)',filter:'blur(0px)'}];break;

    case 'slide-side':frames=from('translate3d('+(sign*46)+'px,0,0) scale(1) rotate(0deg)');break;
    case 'slide-up':frames=from('translate3d(0,65px,0) scale(1) rotate(0deg)');break;
    case 'slide-down':frames=from('translate3d(0,-65px,0) scale(1) rotate(0deg)');break;
    case 'slide-left':frames=from('translate3d(-75px,0,0) scale(1) rotate(0deg)');break;
    case 'slide-right':frames=from('translate3d(75px,0,0) scale(1) rotate(0deg)');break;
    case 'slide-far':frames=from('translate3d('+(sign*170)+'px,0,0) scale(.97) rotate(0deg)');break;
    case 'slide-diagonal-up':frames=from('translate3d('+(sign*60)+'px,52px,0) scale(.95) rotate(0deg)');break;
    case 'slide-diagonal-down':frames=from('translate3d('+(sign*60)+'px,-52px,0) scale(.95) rotate(0deg)');break;
    case 'slide-overshoot':frames=[
      frame(.08,'translateX('+(sign*105)+'px)'),
      frame(1,'translateX('+(sign*-13)+'px)',.76),
      frame(1,'translateX(0)')
    ];break;
    case 'float-in':frames=[
      frame(.05,'translateY(48px) rotate(-3deg) scale(.97)'),
      frame(.85,'translateY(-7px) rotate(1deg) scale(1.01)',.74),
      frame(1,'translateY(0) rotate(0deg) scale(1)')
    ];break;

    case 'bounce':frames=[
      frame(.08,'translateY(-80px) scale(.93)'),
      frame(1,'translateY(10px) scale(1.02)',.58),
      frame(1,'translateY(-6px) scale(.99)',.80),
      frame(1,'translateY(0) scale(1)')
    ];break;
    case 'spring':frames=[
      frame(.03,'scale(.63)'),
      frame(1,'scale(1.13)',.56),
      frame(1,'scale(.94)',.79),
      frame(1,'scale(1)')
    ];break;
    case 'elastic':frames=[
      frame(.08,'translateX('+(sign*90)+'px) scale(.92)'),
      frame(1,'translateX('+(sign*-22)+'px) scale(1.04)',.54),
      frame(1,'translateX('+(sign*9)+'px) scale(.98)',.79),
      frame(1,'translateX(0) scale(1)')
    ];break;
    case 'rubber':frames=[
      frame(.06,'scale(.74,.86)'),
      frame(1,'scale(1.16,.88)',.45),
      frame(1,'scale(.93,1.08)',.72),
      frame(1,'scale(1)')
    ];break;
    case 'back-in':frames=[
      frame(0,'translateY(45px) scale(.48)'),
      frame(1,'translateY(-10px) scale(1.05)',.77),
      frame(1,'translateY(0) scale(1)')
    ];break;
    case 'pop':frames=[
      frame(0,'scale(.36)'),
      frame(1,'scale(1.09)',.76),
      frame(1,'scale(1)')
    ];break;
    case 'pulse':frames=[
      frame(.12,'scale(.91)'),
      frame(1,'scale(1.07)',.65),
      frame(1,'scale(1)')
    ];break;
    case 'heartbeat':frames=[
      frame(.12,'scale(.75)'),
      frame(1,'scale(1.07)',.35),
      frame(1,'scale(.95)',.57),
      frame(1,'scale(1.045)',.77),
      frame(1,'scale(1)')
    ];break;
    case 'shake-x':frames=[
      frame(.22,'translateX('+(sign*12)+'px)'),
      frame(1,'translateX('+(sign*-9)+'px)',.35),
      frame(1,'translateX('+(sign*6)+'px)',.63),
      frame(1,'translateX(0)')
    ];break;
    case 'shake-y':frames=[
      frame(.22,'translateY(13px)'),
      frame(1,'translateY(-9px)',.35),
      frame(1,'translateY(6px)',.63),
      frame(1,'translateY(0)')
    ];break;
    case 'wobble':frames=[
      frame(.2,'translateX('+(sign*20)+'px) rotate('+(sign*-8)+'deg)'),
      frame(1,'translateX('+(sign*-12)+'px) rotate('+(sign*5)+'deg)',.44),
      frame(1,'translateX('+(sign*5)+'px) rotate('+(sign*-2)+'deg)',.76),
      frame(1,'translateX(0) rotate(0)')
    ];break;
    case 'jello':frames=[
      frame(.2,'skewX(-13deg) skewY(-11deg)'),
      frame(1,'skewX(9deg) skewY(7deg)',.4),
      frame(1,'skewX(-4deg) skewY(-3deg)',.76),
      frame(1,'skewX(0deg) skewY(0deg)')
    ];break;

    case 'flip-x':frames=from('perspective(1100px) rotateX(-84deg) scale(.93)');break;
    case 'flip-y':frames=from('perspective(1100px) rotateY('+(sign*-84)+'deg) scale(.93)');break;
    case 'flip-diagonal':frames=from('perspective(1100px) rotateX(25deg) rotateY('+(sign*-74)+'deg) scale(.9)');break;
    case 'tilt-in':frames=from('translateY(20px) rotate('+(sign*-12)+'deg) scale(.96)');break;
    case 'rotate-left':frames=from('rotate(-34deg) scale(.8)');break;
    case 'rotate-right':frames=from('rotate(34deg) scale(.8)');break;
    case 'spin-in':frames=from('rotate('+(sign*-260)+'deg) scale(.48)');break;
    case 'swing':frames=[
      frame(.15,'rotate('+(sign*17)+'deg)'),
      frame(1,'rotate('+(sign*-9)+'deg)',.52),
      frame(1,'rotate('+(sign*4)+'deg)',.81),
      frame(1,'rotate(0deg)')
    ];break;
    case 'cube-left':frames=from('perspective(1100px) rotateY(75deg) translateX(-45px) scale(.93)');break;
    case 'cube-right':frames=from('perspective(1100px) rotateY(-75deg) translateX(45px) scale(.93)');break;
    case 'page-turn':frames=[
      {opacity:.05,transformOrigin:sign===1?'left center':'right center',transform:'perspective(1050px) rotateY('+(sign*-90)+'deg)'},
      {opacity:1,transformOrigin:sign===1?'left center':'right center',transform:'perspective(1050px) rotateY(0deg)'}
    ];break;
    case 'book-open':frames=[
      {opacity:.03,transformOrigin:'left center',transform:'perspective(1000px) rotateY(-100deg) scale(.96)'},
      {opacity:1,transformOrigin:'left center',transform:'perspective(1000px) rotateY(0deg) scale(1)'}
    ];break;

    case 'wipe-left':frames=[{opacity:.25,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}];break;
    case 'wipe-right':frames=[{opacity:.25,clipPath:'inset(0 0 0 100%)'},{opacity:1,clipPath:'inset(0 0 0 0)'}];break;
    case 'wipe-up':frames=[{opacity:.25,clipPath:'inset(100% 0 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}];break;
    case 'wipe-down':frames=[{opacity:.25,clipPath:'inset(0 0 100% 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}];break;
    case 'curtain':frames=[{opacity:.15,transform:'scaleY(.03)',transformOrigin:'center top'},{opacity:1,transform:'scaleY(1)',transformOrigin:'center top'}];break;
    case 'iris':frames=[{opacity:.4,clipPath:'circle(0% at 50% 50%)'},{opacity:1,clipPath:'circle(75% at 50% 50%)'}];break;
    case 'unfold':frames=[
      frame(.15,'scaleY(.05) translateY(-25px)'),
      frame(1,'scaleY(1.04) translateY(0)',.76),
      frame(1,'scaleY(1) translateY(0)')
    ];break;
    case 'fold-in':frames=from('perspective(1100px) rotateX(-88deg) scaleY(.85)');break;
    case 'blinds':frames=[{opacity:.15,clipPath:'inset(0 50% 0 50%)'},{opacity:1,clipPath:'inset(0 0 0 0)'}];break;
    case 'reveal-top':frames=[{opacity:.35,clipPath:'inset(0 0 100% 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}];break;

    case 'light-speed':frames=[
      frame(.06,'translateX('+(sign*150)+'px) skewX('+(sign*-18)+'deg)'),
      frame(1,'translateX('+(sign*-9)+'px) skewX('+(sign*4)+'deg)',.77),
      frame(1,'translateX(0) skewX(0deg)')
    ];break;
    case 'skew-in':frames=from('translateX('+(sign*35)+'px) skewX('+(sign*-26)+'deg)');break;
    case 'glow-in':frames=[{opacity:.07,filter:'brightness(1.8) blur(5px)'},{opacity:1,filter:'brightness(1) blur(0px)'}];break;
    case 'drop-in':frames=[
      frame(.05,'translateY(-115px) scale(.9)'),
      frame(1,'translateY(10px) scale(1.02)',.77),
      frame(1,'translateY(0) scale(1)')
    ];break;
    case 'rise-in':frames=[
      frame(.05,'translateY(110px) scale(.9)'),
      frame(1,'translateY(-9px) scale(1.02)',.77),
      frame(1,'translateY(0) scale(1)')
    ];break;
    case 'hinge-in':frames=[
      {opacity:.05,transformOrigin:'top left',transform:'rotate(-76deg) translateY(-45px)'},
      {opacity:1,transformOrigin:'top left',transform:'rotate(0deg) translateY(0)'}
    ];break;
    case 'roll-in':frames=from('translateX('+(sign*-100)+'px) rotate('+(sign*-140)+'deg) scale(.82)');break;
    case 'magnetic':frames=[
      frame(.12,'translateX('+(sign*75)+'px) scale(.9)'),
      frame(1,'translateX('+(sign*-10)+'px) scale(1.035)',.77),
      frame(1,'translateX(0) scale(1)')
    ];break;
    case 'stretch':frames=[
      frame(.06,'scaleX(.45) scaleY(1.18)'),
      frame(1,'scaleX(1.06) scaleY(.97)',.75),
      frame(1,'scaleX(1) scaleY(1)')
    ];break;
    case 'squash':frames=[
      frame(.07,'scaleX(1.18) scaleY(.45)'),
      frame(1,'scaleX(.96) scaleY(1.06)',.75),
      frame(1,'scaleX(1) scaleY(1)')
    ];break;
    default:frames=[{opacity:0},{opacity:1}];
  }
  if(!out)return frames;
  // Reverse keyframes AND their offset positions for smooth closing.
  return frames.slice().reverse().map(f=>{
    const result={...f};
    if(typeof result.offset==='number')result.offset=1-result.offset;
    return result;
  });
}
function play(node,type,closing,after,direction){
  const done=typeof after==='function'?after:()=>{};
  if(!node||!node.isConnected){done();return;}
  if(type==='editor')node.style.setProperty('animation','none','important');
 node.dataset.nhiFxEffect=choose(type);
 node.dataset.nhiFxOperation=closing?'close':'open';
 const effect=choose(type);
  const old=running.get(node);if(old){try{old.cancel();}catch(_){ }running.delete(node);}
  if(reduced()||effect==='none'||!node.animate){done();return;}
  const frames=keyframes(effect,closing,direction);
  let finished=false;
  const finish=()=>{
    if(finished)return;finished=true;
    if(running.get(node)===animation)running.delete(node);
    done();
  };
  let animation;
  try{
    // Each transition category has its own user-configurable duration.
    animation=node.animate(frames,{duration:durationMs(type),easing:closing?'cubic-bezier(.42,0,.8,.3)':'cubic-bezier(.2,.72,.27,1)',fill:'both'});
    running.set(node,animation);
    animation.onfinish=finish;
    animation.oncancel=()=>{if(running.get(node)===animation)running.delete(node);};
  }catch(_){done();}
}
const api={
 open:(node,type)=>play(node,type,false),
 close:(node,type,after)=>play(node,type,true,after),
 navigate:(node,direction)=>play(node,'navigation',false,null,direction<0?-1:1),
 duration:durationMs,durationSeconds,choose,get:()=>({...prefs})
};
window.NHI_WINDOW_FX=api;
document.body?.classList.add('nhi-fx-runtime');
function buildSettings(){
 const group=document.getElementById('nhiTransitionSettings');
 if(!group)return;
 if(group.dataset.nhiFxReady==='true')return;
 group.dataset.nhiFxReady='true';
 const target=group.querySelector('#nhiTransitionOptions')||group;
 const feedback=group.querySelector('#nhiFxCurrent');
 const selectMap={};
 const allowed=(type,id)=>id==='inherit'?type!=='default':
   id==='classic'?(type==='card'||type==='navigation'):
   OPTIONS.some(option=>option[0]===id);
 const option=(value,title,selected)=>new Option(title,value,false,selected);
 function prepareSelect(select,type){
   const selected=allowed(type,prefs[type])?prefs[type]:
     type==='default'?FALLBACK.default:FALLBACK[type];
   // Use real native optgroups so 60+ choices remain easy to browse.
   const frag=document.createDocumentFragment();
   if(type==='editor'){
     frag.appendChild(option('inherit','Theo Cài đặt tổng',true));
     select.replaceChildren(frag);
     select.value='inherit';select.disabled=true;
     select.title='Kiểu mở/đóng giống Cài đặt tổng; thời gian chỉnh riêng';
     return;
   }
   if(type!=='default')frag.appendChild(option('inherit','Theo mặc định',false));
   if(type==='card'||type==='navigation')frag.appendChild(option('classic','★ Hiệu ứng gốc',false));
   EFFECT_GROUPS.forEach(groupInfo=>{
     const optgroup=document.createElement('optgroup');
     optgroup.label=groupInfo.label;
     groupInfo.options.forEach(([id,label])=>optgroup.appendChild(option(id,label,false)));
     frag.appendChild(optgroup);
   });
   frag.appendChild(option('none','Tắt hiệu ứng',false));
   select.replaceChildren(frag);
   select.disabled=false;
   select.value=selected;
 }
 function previewType(type,closing){
   const tile=group.querySelector('#nhiFxDemoSample');
   if(!tile)return;
   if(reduced()){
     if(feedback)feedback.textContent='Thiết bị đang bật Giảm chuyển động, hiệu ứng được tắt để bảo đảm dễ sử dụng.';
     return;
   }
   const effect=choose(type);
   if(effect==='none'){
     if(feedback)feedback.textContent='Đã chọn Tắt hiệu ứng cho '+(TYPES.find(x=>x[0]===type)?.[1]||type);
     return;
   }
   const direction=type==='navigation'?(closing?-1:1):undefined;
   play(tile,type,Boolean(closing),null,direction);
   if(feedback)feedback.textContent=(closing?'Đóng thử: ':'Xem thử: ')+
      (OPTIONS.find(x=>x[0]===effect)?.[1]||effect)+' · '+
      durationSeconds(type).toFixed(2)+' giây';
 }
 TYPES.forEach(([type,label])=>{
   let select=target.querySelector('#nhi-fx-'+type);
   if(!select){
     const row=document.createElement('div');
     row.className='setrow nhi-fx-setting-row';
     const name=document.createElement('label');
     name.htmlFor='nhi-fx-'+type;name.textContent=label;
     select=document.createElement('select');
     select.id='nhi-fx-'+type;
     row.append(name,select);
     target.appendChild(row);
   }
   select.setAttribute('aria-label','Kiểu hiệu ứng: '+label);
   prepareSelect(select,type);
   selectMap[type]=select;
   select.addEventListener('change',()=>{
     prefs[type]=select.value;
     saveSettings();
     const previewSelect=group.querySelector('#nhiFxPreviewTarget');
     if(previewSelect)previewSelect.value=type;
     previewType(type,false);
   });
   const row=select.closest('.nhi-fx-setting-row');
   if(!row)return;
   let seconds=row.querySelector('#nhi-fx-duration-'+type);
   if(!seconds){
     const wrap=document.createElement('label');
     wrap.className='nhi-fx-duration-wrap';
     wrap.htmlFor='nhi-fx-duration-'+type;
     wrap.appendChild(document.createTextNode('Giây'));
     seconds=document.createElement('input');
     seconds.id='nhi-fx-duration-'+type;seconds.className='nhi-fx-duration';
     wrap.appendChild(seconds);row.append(wrap);
   }
   seconds.type='number';seconds.min=String(MIN_SECONDS);seconds.max=String(MAX_SECONDS);
   seconds.step='.01';seconds.inputMode='decimal';
   seconds.setAttribute('aria-label','Thời gian '+label+' (giây)');
   seconds.value=durationSeconds(type).toFixed(2);
   seconds.addEventListener('change',()=>{
     const value=Number(seconds.value);
     if(!Number.isFinite(value)||value<MIN_SECONDS||value>MAX_SECONDS){
       seconds.setCustomValidity('Chọn từ 0,10 đến 5,00 giây');
       seconds.reportValidity();return;
     }
     seconds.setCustomValidity('');
     prefs.durations=Object.assign({},prefs.durations||{},{[type]:value});
     saveSettings();
     previewType(type,false);
   });
   seconds.addEventListener('input',()=>{
     const value=Number(seconds.value);
     seconds.setCustomValidity(value>=MIN_SECONDS&&value<=MAX_SECONDS?'':'Chọn từ 0,10 đến 5,00 giây');
   });
 });
 // A visible miniature stage previews whichever category the user is editing.
 let previewTarget=group.querySelector('#nhiFxPreviewTarget');
 if(!previewTarget){
   const host=document.createElement('div');
   host.className='nhi-fx-demo-wrap';
   host.innerHTML='<label for="nhiFxPreviewTarget">Xem thử theo mục:</label>'+
     '<select id="nhiFxPreviewTarget"></select>'+
     '<div class="nhi-fx-demo-stage"><div id="nhiFxDemoSample" role="img" aria-label="Thẻ mẫu để xem chuyển cảnh">Nhi ✿</div></div>';
   const previewButton=group.querySelector('#nhiFxPreview');
   if(previewButton)previewButton.before(host);else target.after(host);
   previewTarget=host.querySelector('#nhiFxPreviewTarget');
 }
 previewTarget.replaceChildren(...TYPES.map(([type,label])=>option(type,label,false)));
 previewTarget.value='navigation';
 previewTarget.addEventListener('change',()=>previewType(previewTarget.value,false));
 const preview=group.querySelector('#nhiFxPreview');
 if(preview)preview.addEventListener('click',()=>previewType(previewTarget.value,false));
 let previewClose=group.querySelector('#nhiFxPreviewClose');
 if(!previewClose){
   previewClose=document.createElement('button');
   previewClose.id='nhiFxPreviewClose';
   previewClose.type='button';previewClose.className='ghost';
   previewClose.textContent='◀ Xem thử khi đóng / Lùi';
   if(preview)preview.after(previewClose);else target.after(previewClose);
 }
 previewClose.addEventListener('click',()=>previewType(previewTarget.value,true));
 if(feedback){
   feedback.textContent=EFFECT_GROUPS.reduce((sum,g)=>sum+g.options.length,0)+
     ' kiểu chuyển cảnh · giữ nguyên cài đặt đã lưu của bạn';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSettings,{once:true});else buildSettings();
const observer=new MutationObserver(records=>{
  for(const rec of records){
    if(rec.type==='childList'){
      rec.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        if(node.matches?.('form.nhi-editor-window-v5')&&!node.dataset.nhiFxOpened){
          node.dataset.nhiFxOpened='true';
          api.open(node,'editor');
        }
        if(node.matches?.('dialog[open]'))api.open(node,'dialog');
        if(node.matches?.('.legendpop'))api.open(node,'dialog');
        node.querySelectorAll?.('form.nhi-editor-window-v5,dialog[open],.legendpop').forEach(el=>{
          const type=el.matches('form.nhi-editor-window-v5')?'editor':'dialog';
          if(type!=='editor'||!el.dataset.nhiFxOpened){
            if(type==='editor')el.dataset.nhiFxOpened='true';
            api.open(el,type);
          }
        });
      });
    }else if(rec.type==='attributes' && rec.attributeName==='open'&&rec.target.matches?.('dialog[open]')){
      api.open(rec.target,'dialog');
    }
  }
});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
document.addEventListener('change',e=>{
 const target=e.target;
 if(!(target instanceof Element))return;
 // Avoid overlaying the 260ms reveal/collapse of the Hán–Hàn fields.
 if(target.matches('input[name="hanjaEnabled"]'))return;
 const editor=target.closest('form.nhi-editor-window-v5');
 if(editor && target.matches('input[type=checkbox],select'))play(editor.querySelector('.nhi-hanja-input-grid')||editor,'change',false);
 else if(target.closest('#planBox')&&target.matches('select,input[type=checkbox]')){
   const item=target.closest('.pcard');if(item)play(item,'change',false);
 }
},true);
})();

/* v122: one isolated layout owner for the four study action buttons.
   Device preferences only; never touches cards or study progress. */
(function(){
'use strict';
const KEY='nhi-action-layout-v122';
const defaults=mode=>({
 margin:mode==='phone'?32:24,gap:5,
 hard:{width:mode==='phone'?112:125,height:mode==='phone'?52:50,margin:0,color:'#ddebfa'},
 prev:{width:mode==='phone'?112:125,height:mode==='phone'?52:50,margin:0,color:'#fbd4e5'},
 next:{width:mode==='phone'?112:125,height:mode==='phone'?52:50,margin:0,color:'#fbd4e5'},
 trash:{width:30,height:30,margin:8,color:'#d8a324'}
});
const ids=['hard','prev','next','trash'],labels={hard:'Khó',prev:'Lùi',next:'Tiến',trash:'Thùng rác'};
const clamp=(x,lo,hi,d)=>Number.isFinite(Number(x))?Math.max(lo,Math.min(hi,Math.round(Number(x)))):d;
const validColor=(x,d)=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x)?x:d;
const normalize=(mode,x)=>{
 const d=defaults(mode),v=x||{};
 const p={margin:clamp(v.margin,0,64,d.margin),gap:clamp(v.gap,0,20,d.gap)};
 ids.forEach(k=>{const a=v[k]||{},b=d[k];p[k]={
 width:clamp(a.width,k==='trash'?22:40,k==='trash'?60:200,b.width),
 height:clamp(a.height,k==='trash'?22:36,k==='trash'?60:76,b.height),
 margin:clamp(a.margin,0,24,b.margin),color:validColor(a.color,b.color)
 };});return p;
};
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
const prefs={desktop:normalize('desktop',saved.desktop),phone:normalize('phone',saved.phone)};
const isPhone=()=>matchMedia('(max-width:640px), (max-width:900px) and (pointer:coarse)').matches;
const style=(n,p)=>Object.entries(p).forEach(([k,v])=>n.style.setProperty(k,String(v),'important'));
const px=n=>Math.max(0,n)+'px';
function compute(mode,p,available){
 const trash=p.trash, inset=trash.margin;
 // Maintain a separate trash lane on either device; reserve the exact same
 // right and bottom inset on desktop, even with the optional Undo row.
 const right=Math.min(Math.max(p.margin,inset+trash.width+p.gap),available-3);
 const left=Math.min(p.margin,Math.max(0,available-right-3));
 const usable=Math.max(3,available-left-right);
 const gap=Math.min(p.gap,Math.floor((usable-3)/2));
 const inner=usable-2*gap;
 const requested=ids.slice(0,3).reduce((a,k)=>a+2*p[k].margin,0);
 const mf=requested?Math.min(1,Math.max(0,inner-3)/requested):1;
 const margins=Object.fromEntries(ids.slice(0,3).map(k=>[k,Math.floor(p[k].margin*mf)]));
 const space=Math.max(3,inner-ids.slice(0,3).reduce((a,k)=>a+2*margins[k],0));
 const total=p.hard.width+p.prev.width+p.next.width;
 const factor=Math.min(1,space/total);
 const widths=Object.fromEntries(ids.slice(0,3).map(k=>[k,Math.max(1,Math.floor(p[k].width*factor))]));
 while(ids.slice(0,3).reduce((a,k)=>a+widths[k],0)>space){
  const k=ids.slice(0,3).sort((a,b)=>widths[b]-widths[a])[0];if(widths[k]<=1)break;widths[k]--;
 }
 return {widths,margins,gap,left,right,groupWidth:ids.slice(0,3).reduce((a,k)=>a+widths[k]+2*margins[k],0)+2*gap,trash:trash.width};
}
const mounted=new Set();
function paintButton(b,k,p,w){
 const h=p.height, foreground=k==='hard'?'#285b7c':k==='trash'?p.color:'#9d416b';
 const border=k==='trash'?p.color:'color-mix(in srgb,'+p.color+' 62%,#7c5166 38%)';
 style(b,{'box-sizing':'border-box','width':px(w),'min-width':px(w),'max-width':px(w),
 'height':px(h),'min-height':px(h),'max-height':px(h),'flex':'0 0 auto','display':'flex',
 'align-items':'center','justify-content':'center','align-self':'end','justify-self':'center',
 'padding':k==='trash'?'3px':'0 3px','margin':'0','position':k==='trash'?'absolute':'static',
 'inset':k==='trash'?'auto':'auto','transform':'none','translate':'none',
 'background':k==='trash'?'transparent':p.color,'background-image':'none','color':foreground,
 'border':(k==='trash'?'1px':'2px')+' solid '+border,'border-radius':k==='trash'?'9px':'14px',
 'box-shadow':k==='trash'?'none':'0 4px 0 '+border,'opacity':b.disabled?'.65':'1',
 'overflow':'hidden','white-space':'nowrap'});
}
function mount(card,row,buttons,trash,undo){
 const group=document.createElement('div');group.className='nhi-action-main-v122';
 row.classList.remove('nhi-rating-v3','nhi-rate-undo-inline','nhi-mobile-wide-arrows','nhi-desktop-equal-v121');
 row.classList.add('nhi-action-row-v122');
 row.replaceChildren(group);
 ids.slice(0,3).forEach(k=>{const cell=document.createElement('div');cell.className='nhi-action-cell-v122';cell.append(buttons[k]);group.append(cell);});
 if(undo)row.append(undo);
 card.append(trash);
 const state={card,row,group,buttons,trash,undo};
 function layout(){
  if(!card.isConnected)return;
  const mode=isPhone()?'phone':'desktop',p=prefs[mode],cs=getComputedStyle(card);
  const available=Math.max(120,card.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0));
  const hasPhoto=mode==='desktop'&&card.querySelector('.pfront.nhi-with-image');
  const photoLane=hasPhoto?parseFloat(card.style.getPropertyValue('--nhi-rate-width')):NaN;
  const lane=Number.isFinite(photoLane)?Math.min(available,Math.max(120,photoLane)):available;
  const m=compute(mode,p,lane);
  style(row,{'display':'flex','flex-direction':'column','align-items':'center','justify-content':'flex-end',
   'position':'relative','box-sizing':'border-box','width':'100%','min-width':'0','max-width':'none',
   'height':'auto','min-height':'0','max-height':'none','margin':'10px 0 12px','padding':'0',
   'gap':'6px','transform':'none','translate':'none','flex':'0 0 auto','overflow':'visible'});
  style(group,{'display':'grid','box-sizing':'border-box',
   'grid-template-columns':ids.slice(0,3).map(k=>px(m.widths[k]+2*m.margins[k])).join(' '),
   'gap':px(m.gap),'width':px(m.groupWidth),'max-width':'100%','min-width':'0',
   'margin-left':px(m.left+Math.max(0,(lane-m.groupWidth-m.left-m.right)/2)),
   'margin-right':'0','align-self':'start','align-items':'end',
   'transform':'none','padding':'0','overflow':'visible'});
  ids.slice(0,3).forEach((k,i)=>{
    style(group.children[i],{'display':'flex','justify-content':'center','align-items':'end','min-width':'0','padding':'0','margin':'0'});
    paintButton(buttons[k],k,p[k],m.widths[k]);
  });
  paintButton(trash,'trash',p.trash,p.trash.width);
  style(trash,{'right':px(p.trash.margin),'bottom':px(p.trash.margin),'z-index':'6'});
  if(mode==='phone'){
    // Align trash with bottom of actual arrow border, not the footer or Undo.
    const bottom=card.getBoundingClientRect().bottom-group.getBoundingClientRect().bottom-(parseFloat(cs.borderBottomWidth)||0);
    style(trash,{'bottom':px(bottom)});
  }
  if(undo)style(undo,{'position':'static','inset':'auto','width':'auto','min-width':'80px','max-width':'100%','height':'38px','min-height':'38px','max-height':'38px','margin':'0','padding':'0 8px','align-self':'center'});
 }
 state.layout=layout;mounted.add(state);
 requestAnimationFrame(layout);
 if(typeof MutationObserver!=='undefined'){
   state.mo=new MutationObserver(()=>{if(!card.isConnected){state.ro?.disconnect();state.mo.disconnect();mounted.delete(state);}});
   const root=document.getElementById('planBox');if(root)state.mo.observe(root,{childList:true,subtree:true});
 }
 if(typeof ResizeObserver!=='undefined'){
   state.ro=new ResizeObserver(layout);state.ro.observe(card);
 }
 return state;
}
function refresh(){for(const x of mounted){if(!x.card.isConnected){x.ro?.disconnect();x.mo?.disconnect();mounted.delete(x);}else x.layout();}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(e){}refresh();}
function initSettings(){
 const sheet=document.querySelector('#setSheet .sheetbox');if(!sheet)return;
 let root=document.getElementById('nhiActionSettingsBodyV122');
 if(!root){
  const section=document.createElement('details');section.className='setgroup nhi-action-settings-v122';section.id='nhiActionSettingsV122';
  const summary=document.createElement('summary');summary.textContent='🎛 Nút điều hướng thẻ';summary.style.cssText='font-size:15px;font-weight:800;cursor:pointer;padding:6px 0';section.append(summary);
  root=document.createElement('div');root.id='nhiActionSettingsBodyV122';section.append(root);
  const head=sheet.querySelector('.sheethead');if(head)head.after(section);else sheet.prepend(section);
 }
 if(root.dataset.ready==='1')return;
 root.replaceChildren();
 const help=document.createElement('p');help.className='voice-note';help.textContent='Mặc định ba nút bằng nhau. Chỉnh từng nút riêng; khi màn hình hẹp, chiều rộng tự co theo tỉ lệ để không chồng lên thùng rác. Màu thùng rác chỉ áp dụng cho viền và biểu tượng.';root.append(help);
 const selector=document.createElement('select');selector.className='field';selector.setAttribute('aria-label','Thiết bị cần tùy chỉnh');
 [['desktop','Máy tính'],['phone','Điện thoại']].forEach(([v,t])=>selector.add(new Option(t,v)));
 selector.value=isPhone()?'phone':'desktop';root.append(selector);
 const controls=document.createElement('div');root.append(controls);
 function draw(){
   controls.replaceChildren();const mode=selector.value,p=prefs[mode];
   function field(parent,txt,obj,key,min,max,type='number'){
     const label=document.createElement('label');label.className='nhi-action-setting-field';const title=document.createElement('span');title.textContent=txt;
     const input=document.createElement('input');input.type=type;input.setAttribute('aria-label',txt);
     if(type==='number'){input.min=min;input.max=max;input.step='1';}
     input.value=obj[key];input.addEventListener('change',()=>{obj[key]=type==='color'?validColor(input.value,obj[key]):clamp(input.value,min,max,obj[key]);input.value=obj[key];persist();});
     label.append(title,input);parent.append(label);
   }
   field(controls,'Lề hai bên nhóm nút (px)',p,'margin',0,64);field(controls,'Khoảng cách giữa các nút (px)',p,'gap',0,20);
   ids.forEach(k=>{
    const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=labels[k];group.append(legend);
    field(group,'Chiều rộng (px)',p[k],'width',k==='trash'?22:40,k==='trash'?60:200);
    field(group,'Chiều cao (px)',p[k],'height',k==='trash'?22:36,k==='trash'?60:76);
    field(group,k==='trash'?'Lề góc (px)':'Lề ngang riêng (px)',p[k],'margin',0,24);
    field(group,k==='trash'?'Màu viền và biểu tượng':'Màu nền',p[k],'color',0,0,'color');controls.append(group);
   });
   const equal=document.createElement('button');equal.type='button';equal.className='ghost';equal.textContent='Đặt 3 nút bằng kích thước nút Khó';
   equal.addEventListener('click',()=>{['prev','next'].forEach(k=>{p[k].width=p.hard.width;p[k].height=p.hard.height;p[k].margin=p.hard.margin;});persist();draw();});
   const reset=document.createElement('button');reset.type='button';reset.className='ghost';reset.textContent='Khôi phục mặc định thiết bị';
   reset.addEventListener('click',()=>{prefs[mode]=defaults(mode);persist();draw();});controls.append(equal,reset);
 }
 selector.addEventListener('change',draw);draw();
 root.dataset.ready='1';
}
window.NHI_ACTION_LAYOUT_V122={mount,refresh,compute,defaults,normalize,initSettings};
window.addEventListener('resize',refresh,{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSettings,{once:true});else initSettings();
})();
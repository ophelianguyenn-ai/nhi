/* Nhi's Learning Corner: independent airplane easter egg.
 * Visuals are original SVG geometry; no copyrighted stock image is embedded. */
(function(){
  'use strict';
  function createAirplaneController(cover){
    let frame=0, running=false, startTime=0, seen=false;
    const NS='http://www.w3.org/2000/svg';
    const make=(tag,attrs={})=>{
      const el=document.createElementNS(NS,tag);
      Object.keys(attrs).forEach(key=>el.setAttribute(key,String(attrs[key])));
      return el;
    };
    const overlay=document.createElement('div');
    overlay.id='nhiPlaneLayer';
    overlay.setAttribute('aria-hidden','true');
    const svg=make('svg',{id:'nhiPlaneSky',viewBox:'0 0 1000 600',preserveAspectRatio:'xMidYMid meet'});
    const pathD='M -110 385 C 35 267 120 507 253 393 C 321 333 257 245 211 312 C 173 369 325 485 449 376 C 487 341 488 286 451 246 C 411 200 411 150 469 144 C 514 139 536 170 541 209 C 556 164 585 134 626 152 C 687 182 650 253 607 288 C 557 332 528 357 541 370 C 634 391 738 199 840 126 C 920 71 1030 68 1130 26';
    const path=make('path',{d:pathD,fill:'none',stroke:'none'});
    const defs=make('defs');
    const mask=make('mask',{id:'nhiPlaneTrailMask',maskUnits:'userSpaceOnUse'});
    const reveal=make('path',{d:pathD,fill:'none',stroke:'white','stroke-width':'12','stroke-linecap':'round'});
    mask.append(reveal);
    defs.append(mask);
    const trail=make('path',{id:'nhiFlightTrail',d:pathD,fill:'none',stroke:'#8c6670','stroke-width':'2.4','stroke-dasharray':'3 12','stroke-linecap':'round',mask:'url(#nhiPlaneTrailMask)'});
    const hearts=make('g',{id:'nhiPlaneHearts',fill:'#fa497f'});
    [[170,334,12],[300,399,16],[477,193,13],[592,147,11],[665,256,9],[790,177,12]].forEach(([x,y,s],i)=>{
      const h=make('path',{d:'M0 -4 C -12 -17 -24 -3 0 15 C 24 -3 12 -17 0 -4Z',transform:'translate('+x+' '+y+') scale('+(s/15)+')',opacity:'0','data-step':String(i)});
      hearts.append(h);
    });
    const rope=make('path',{fill:'none',stroke:'#846a62','stroke-width':'2.2','stroke-linecap':'round'});
    const banner=make('g',{id:'nhiLoveBanner'});
    banner.append(make('path',{d:'M -106 -18 L 80 -18 L 68 0 L 80 18 L -106 18 Q -112 0 -106 -18Z',fill:'#fff2dc',stroke:'#c47e8d','stroke-width':'3','stroke-linejoin':'round'}));
    const word=make('text',{x:'-13',y:'7','font-size':'23','font-weight':'800','font-family':'system-ui, sans-serif','text-anchor':'middle',fill:'#875367','paint-order':'stroke',stroke:'#fff9ef','stroke-width':'.8'});
    word.textContent='Lương ❤️ Nhi';
    banner.append(word);
    const plane=make('g',{id:'nhiPlane'});
    plane.append(make('path',{d:'M -40 -6 L -12 -11 L 16 -42 Q 25 -47 25 -38 L 16 -11 L 43 -3 Q 52 0 43 5 L 16 10 L 25 36 Q 25 45 16 40 L -12 10 L -40 7 L -47 22 L -54 23 L -53 0 L -54 -23 L -47 -22Z',fill:'#2c2831',stroke:'#2c2831','stroke-width':'2','stroke-linejoin':'round'}));
    plane.append(make('path',{d:'M -27 0 L 32 0',fill:'none',stroke:'#faf4ef','stroke-width':'2',opacity:'.45'}));
    svg.append(defs,path,trail,hearts,rope,banner,plane);
    overlay.append(svg);
    cover.append(overlay);
    const total=path.getTotalLength();
    const point=(distance)=>path.getPointAtLength(Math.max(0,Math.min(total,distance)));
    let duration=7000;
    function render(progress){
      const d=total*progress;
      const p=point(d), prev=point(d-4);
      const angle=Math.atan2(p.y-prev.y,p.x-prev.x)*180/Math.PI;
      const follow=point(d-130);
      const sub=point(d-134);
      const followAngle=Math.atan2(follow.y-sub.y,follow.x-sub.x)*180/Math.PI;
      const bannerScale=Math.min(2.25,Math.max(1,790/Math.max(320,window.innerWidth)));
      plane.setAttribute('transform','translate('+p.x+' '+p.y+') rotate('+angle+') scale(.65)');
      // Keep lettering readable, even when the plane makes a tight loop.
      banner.setAttribute('transform','translate('+follow.x+' '+(follow.y+14)+') rotate('+Math.max(-13,Math.min(13,followAngle*.25))+') scale('+bannerScale.toFixed(2)+')');
      rope.setAttribute('d','M '+(p.x-30)+' '+p.y+' Q '+((p.x+follow.x)/2)+' '+((p.y+follow.y)/2+13)+' '+(follow.x+79*bannerScale)+' '+(follow.y+14));
      reveal.setAttribute('stroke-dasharray',Math.max(0,d)+' '+(total+30));
      Array.from(hearts.children).forEach((heart,i)=>{const threshold=.19+i*.108;heart.setAttribute('opacity',String(Math.max(0,Math.min(.9,(progress-threshold)*9))));});
      overlay.style.opacity=progress<.09?String(progress/.09):progress>.91?String((1-progress)/.09):'1';
    }
    function tick(now){
      if(!running)return;
      const progress=Math.min(1,(now-startTime)/duration);
      render(progress);
      if(progress>=1){stop();return;}
      frame=requestAnimationFrame(tick);
    }
    function play(){
      if(running||cover.hidden)return false;
      const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(reduced){
        overlay.classList.add('nhi-plane-reduced');
        overlay.style.opacity='1';
        banner.setAttribute('transform','translate(500 120) scale('+Math.min(2.25,Math.max(1,790/Math.max(320,window.innerWidth))).toFixed(2)+')');
        plane.setAttribute('transform','translate(760 118) scale(.65)');
        rope.setAttribute('d','M 733 118 L 580 126');
        hearts.setAttribute('opacity','0');
        setTimeout(()=>{overlay.classList.remove('nhi-plane-reduced');overlay.style.opacity='0';},2200);
        return true;
      }
      running=true;seen=true;
      overlay.classList.add('is-flying');
      overlay.style.opacity='0';
      startTime=performance.now();
      frame=requestAnimationFrame(tick);
      return true;
    }
    function stop(){
      running=false;
      cancelAnimationFrame(frame);
      overlay.classList.remove('is-flying','nhi-plane-reduced');
      overlay.style.opacity='0';
      rope.removeAttribute('d');
      reveal.setAttribute('stroke-dasharray','0 '+(total+30));
    }
    return {play,stop,get running(){return running},get everPlayed(){return seen}};
  }
  window.NhiCoverAirplaneV3={create:createAirplaneController};
})();
/**
 * Nhi's Learning Corner — real-time THREE-DIMENSIONAL Chibi Romance V6
 * Authoring: procedural meshes + parented anatomical pivots, rendered in WebGL.
 * This is a 3D reinterpretation of the approved 2D characters, not a claim
 * that a flat illustration can be converted pixel-identically into a 3D mesh.
 *
 * Sequence: Nhi only -> (click) 0–6,000ms approach / face turn / cheek kiss
 * -> Lương stays by Nhi, both animate subtly. No automatic kisses.
 * Both of Lương's hands hang at his sides, NEVER in pockets/behind back.
 */
import * as THREE from './vendor/three.module.js';
const cover=document.getElementById('cover');
const hero=document.getElementById('coverHero');
if(cover&&hero){
  const TOTAL=6000;
  const beat={appear:500,walk:2700,stop:3500,turn:4100,kiss:4800,recover:5400,finish:6000};
  const mobile=()=>window.innerWidth<660;
  const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const make=(tag,cls,id)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(id)n.id=id;
    return n;
  };
  const mat=(c,roughness=.92,more={})=>new THREE.MeshStandardMaterial({color:c,roughness,metalness:0,...more});
  const C={
    skin:mat('#fbe0ce'),nose:mat('#f3c5ae'),blush:mat('#f69bab',.85,{transparent:true,opacity:.82}),
    hair:mat('#523930'),hairMid:mat('#69504a'),hairHi:mat('#81675c'),
    black:mat('#2c272d'),ink:mat('#3b2a2b'),eyewhite:mat('#fff9f6'),
    pink:mat('#f8b9ca'),pinkDark:mat('#dc8ea7'),pinkLight:mat('#ffe2e8'),
    yellow:mat('#ffcf58'),gold:mat('#e7a536'),leaf:mat('#579863'),
    paper:mat('#fff0c6'),stem:mat('#558955'),
    brown:mat('#51352d'),brownDark:mat('#372820'),brownLight:mat('#735044'),
    pants:mat('#27272b'),pantsHi:mat('#35353c'),
    white:mat('#fff9f2'),shoe:mat('#f2ece7'),sole:mat('#d6c9c2'),
    pearl:mat('#fff6ea'),wood:mat('#916342'),soil:mat('#8e6057',1,{transparent:true,opacity:.14,depthWrite:false}),
  };
  const G={
    sphere:new THREE.SphereGeometry(1,24,18),
    round:new THREE.CapsuleGeometry(1,.5,6,12),
  };
  function oval(parent,material,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
    const m=new THREE.Mesh(G.sphere,material);
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);
    parent.add(m);m.castShadow=true;m.receiveShadow=true;return m;
  }
  function cylinder(parent,material,x,y,z,top,bottom,height,rz=0,rx=0){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,12),material);
    m.position.set(x,y,z);m.rotation.set(rx,0,rz);parent.add(m);m.castShadow=true;return m;
  }
  function stroke(parent,points,color='#513930',r=.025){
    const spline=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(spline,Math.max(10,points.length*7),r,6,false),
      typeof color==='string'?mat(color):color);
    parent.add(mesh);return mesh;
  }
  function group(parent,x=0,y=0,z=0){
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;
  }
  function marker(parent,x,y,z){
    const m=new THREE.Object3D();m.position.set(x,y,z);parent.add(m);return m;
  }
  function shadow(parent,size=1){
    const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,36),C.soil);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(0,.012,-.02);
    mesh.scale.set(size,.48*size,1);parent.add(mesh);return mesh;
  }
  function flower(parent,x,y,z,scale=1){
    const g=group(parent,x,y,z);g.scale.setScalar(scale);
    cylinder(g,C.stem,0,-.19,-.07,.022,.026,.45,.1);
    oval(g,C.leaf,-.12,-.19,.08,.16,.055,.03,0,0,.3);
    oval(g,C.leaf,.15,-.15,.02,.15,.055,.03,0,0,-.25);
    for(let k=0;k<5;k++){
      const a=k*Math.PI*2/5;
      oval(g,C.yellow,Math.sin(a)*.13,Math.cos(a)*.13,.11,.135,.15,.075,0,0,-a*.15);
    }
    oval(g,C.gold,0,0,.17,.095,.095,.075);
    return g;
  }
  function makeNhi(){
    const root=new THREE.Group();root.name='Nhi-fully-3D';
    const torso=group(root,0,0,0);shadow(root,.83);
    // Shoes, calves and skirt below the soft pink oversized sweater.
    for(let s of [-1,1]){
      oval(torso,C.skin,s*.30,.80,-.03,.16,.54,.17);
      oval(torso,C.white,s*.33,.31,.16,.23,.20,.38);
      oval(torso,C.sole,s*.33,.18,.23,.24,.07,.39);
    }
    cylinder(torso,C.pinkLight,0,1.32,-.06,.50,.69,.82);
    for(let i=0;i<9;i++){
      const a=i/8*Math.PI;
      stroke(torso,[[Math.cos(a)*.50,1.66,.18],[Math.cos(a)*.62,1.30,.27],
        [Math.cos(a)*.67,1.07,.33]],C.pinkDark,.012);
    }
    oval(torso,C.pink,0,2.20,0,.73,.84,.48);
    oval(torso,C.pinkLight,0,2.77,.06,.29,.12,.46);
    for(let s of [-1,1]){
      const sleeve=group(torso,s*.60,2.59,.04);
      oval(sleeve,C.pink,s*.12,-.17,.03,.24,.37,.25,0,0,s*.18);
      stroke(sleeve,[[s*.18,-.48,.25],[s*.20,-.45,.28],[s*.22,-.43,.25]],C.pinkDark,.025);
    }
    // Face and hair follow neck pivot (not a flat animated illustration).
    const neck=group(torso,0,2.83,0);
    oval(neck,C.skin,0,.08,0,.23,.20,.22);
    const head=group(neck,0,.56,0);
    oval(head,C.skin,0,0,.02,.77,.74,.65);
    oval(head,C.skin,-.73,-.06,.03,.14,.20,.13);
    oval(head,C.skin,.73,-.06,.03,.14,.20,.13);
    oval(head,C.nose,0,-.10,.665,.095,.07,.09);
    for(const s of [-1,1]){
      // Peacefully smiling eyes, blush, brow and short lashes.
      stroke(head,[[s*.19,.12,.666],[s*.27,.15,.667],[s*.37,.10,.640]],C.ink,.037);
      stroke(head,[[s*.26,.30,.60],[s*.37,.31,.57]],C.hair,.020);
      oval(head,C.blush,s*.49,-.15,.60,.22,.13,.035);
    }
    stroke(head,[[-.095,-.27,.665],[0,-.34,.685],[.11,-.27,.665]],'#a75b67',.026);
    // Long waving 3D back hair. Strand groups can move relative to the head.
    const backHair=group(head,0,0,-.20);
    oval(backHair,C.hair,0,.25,-.30,.84,.79,.57);
    const strandGroups=[];
    for(const s of [-1,1]){
      for(let j=0;j<5;j++){
        const x=s*(.66+j*.065);
        const h=group(backHair);
        const offset=j*.075;
        const points=[
          [x,.40,-.08],
          [x+s*(.16+offset),-.20,.02],
          [x-s*(.03+offset*.30),-.60,.06],
          [x+s*(.20+offset*.25),-1.04,.04],
          [x-s*(.02+offset*.15),-1.48,.06],
          [x+s*(.13+offset*.30),-1.87,.05],
          [x+s*(.17+offset*.30),-2.13,.03]
        ];
        const hairMaterial=j%3===0?C.hairHi:j%2?C.hairMid:C.hair;
        const radius=.135-(j*.012);
        stroke(h,points,hairMaterial,radius);
        oval(h,hairMaterial,points[points.length-1][0],points[points.length-1][1],points[points.length-1][2],radius,radius*1.4,radius);
        strandGroups.push({g:h,s,j});
      }
    }
    // Parting + face-framing wavy locks.
    oval(head,C.hair,0,.54,-.11,.83,.45,.60,0,0,-.09);
    oval(head,C.hairMid,-.45,.51,.39,.35,.27,.27,0,0,.42);
    oval(head,C.hair,.43,.56,.38,.33,.31,.27,0,0,-.42);
    stroke(head,[[-.68,.38,.54],[-.64,-.1,.63],[-.73,-.53,.46],
      [-.65,-.99,.48],[-.74,-1.54,.39]],C.hairMid,.13);
    stroke(head,[[.63,.38,.53],[.73,-.05,.59],[.68,-.55,.48],
      [.80,-1.0,.47],[.72,-1.63,.39]],C.hairMid,.12);
    for(let s of [-1,1]){
      stroke(head,[[s*.37,.69,.42],[s*.49,.53,.52],[s*.59,.29,.55]],C.hairHi,.035);
    }
    // Two large pink clips on left side of the girl's hair.
    const clips=group(head,-.50,.57,.60);
    for(let i=0;i<2;i++){
      const c=oval(clips,C.pinkLight,-i*.075,-i*.15,.07,.23,.07,.045,0,0,-.31);
      oval(clips,C.pinkDark,c.position.x,c.position.y,.105,.19,.012,.02,0,0,-.31);
    }
    const clipAnchor=marker(clips,-.08,-.03,.15);
    // Left: hold big bouquet, right: friendly peace sign.
    const leftArm=group(torso,-.57,2.59,.2);
    oval(leftArm,C.pink,-.21,-.36,.17,.26,.42,.26,0,0,-.45);
    oval(leftArm,C.skin,-.35,-.63,.33,.14,.15,.11);
    const rightArm=group(torso,.61,2.62,.21);
    oval(rightArm,C.pink,.14,-.15,.16,.23,.33,.24,0,0,-.33);
    oval(rightArm,C.skin,.30,.20,.27,.15,.23,.15,0,0,.15);
    // two separated 3D fingers forming V
    cylinder(rightArm,C.skin,.23,.54,.30,.062,.067,.35,.24);
    cylinder(rightArm,C.skin,.45,.52,.30,.062,.068,.35,-.27);
    oval(rightArm,C.skin,.32,.36,.30,.14,.16,.14);
    const bouquet=group(torso,-.10,2.10,.80);
    const paper=cylinder(bouquet,C.paper,0,-.14,0,.44,.12,.62,0);
    paper.rotation.x=.18;
    for(let i=0;i<5;i++){
      const a=i*2*Math.PI/5;
      flower(bouquet,Math.sin(a)*.25,.24+Math.cos(a)*.09,Math.cos(a)*.17,.77+(i%2)*.13);
    }
    for(let j=0;j<4;j++){
      stroke(bouquet,[[0,-.36,.15],[Math.sin(j*1.4)*.20,.20,.22]],C.stem,.018);
    }
    const flowerAnchor=marker(bouquet,0,.2,.23);
    const cheek=marker(head,.58,-.16,.58);
    // Heart hotspot sits ABOVE their heads, never over Nhi's face.
    const heartAnchor=marker(head,.81,1.16,.48);
    return {root,torso,head,neck,leftArm,rightArm,bouquet,clipAnchor,flowerAnchor,cheek,heartAnchor,strandGroups,
      idle(t,quiet=false){
        const a=quiet?0:Math.sin(t*1.78);
        torso.rotation.z=.013*a;
        head.rotation.z=(quiet?0:.025*Math.sin(t*1.31+.4));
        head.rotation.y=quiet?0:.035*Math.sin(t*.84);
        bouquet.rotation.z=.025*a;
        rightArm.rotation.z=.012*a;
        strandGroups.forEach(({g,s,j})=>{g.rotation.z=quiet?0:s*.022*Math.sin(t*1.34-j*.4);});
      }
    };
  }
  function makeLuong(){
    const root=new THREE.Group();root.name='Luong-fully-3D';
    const body=group(root);shadow(root,.83);
    // Brown collared polo shirt; arms at sides, not behind or in pockets.
    oval(body,C.brown,0,2.22,0,.67,.80,.44);
    oval(body,C.brownDark,0,1.72,.02,.57,.17,.42);
    for(let s of [-1,1]){
      const collar=oval(body,C.brownLight,s*.20,2.81,.39,.25,.075,.16,0,0,s*.35);
      stroke(body,[[s*.10,2.82,.43],[s*.15,2.65,.47]],C.brownDark,.022);
    }
    cylinder(body,C.brownDark,0,2.62,.45,.025,.024,.27);
    for(let j=-4;j<=4;j++){
      stroke(body,[[j*.117,2.50,.44],[j*.10,2.03,.48],[j*.10,1.76,.39]],C.brownDark,.008);
    }
    oval(body,C.ink,0,2.66,.48,.034,.033,.02);
    oval(body,C.ink,0,2.55,.48,.030,.029,.02);
    // Separate hip/thigh pivots and feet for actual walking.
    const legs=[];
    for(let s of [-1,1]){
      const hip=group(body,s*.30,1.62,0);
      oval(hip,C.pants,0,-.55,0,.26,.61,.29,0,0,-s*.018);
      oval(hip,C.pantsHi,0,-.97,.02,.245,.25,.29);
      oval(hip,C.white,0,-1.42,.20,.29,.19,.42);
      oval(hip,C.sole,0,-1.55,.26,.30,.07,.45);
      legs.push(hip);
    }
    // Arm pivots at shoulders, sleeves, visible forearms and wood bracelet.
    const arms=[];
    for(const s of [-1,1]){
      const shoulder=group(body,s*.64,2.71,.02);
      oval(shoulder,C.brown,s*.11,-.22,0,.22,.27,.24,0,0,s*.17);
      oval(shoulder,C.skin,s*.14,-.61,.03,.145,.39,.16,0,0,s*.018);
      oval(shoulder,C.skin,s*.15,-.94,.08,.148,.17,.14);
      if(s===-1){
        for(let k=0;k<7;k++){
          const a=k*Math.PI*2/7;
          oval(shoulder,C.wood,s*.14+Math.cos(a)*.15,-.83,.06+Math.sin(a)*.15,.050,.05,.05);
        }
      }
      arms.push(shoulder);
    }
    const neck=group(body,0,2.84,0);
    oval(neck,C.skin,0,.02,0,.19,.19,.20);
    const head=group(neck,0,.52,.03);
    oval(head,C.skin,0,0,.04,.72,.70,.61);
    oval(head,C.skin,-.69,-.04,.02,.14,.20,.12);
    oval(head,C.skin,.69,-.04,.02,.14,.20,.12);
    oval(head,C.nose,0,-.05,.665,.085,.065,.065);
    for(const s of [-1,1]){
      oval(head,C.ink,s*.28,.07,.60,.065,.087,.034);
      oval(head,C.white,s*.26,.10,.633,.017,.025,.013);
      stroke(head,[[s*.18,.28,.575],[s*.37,.29,.54]],C.black,.026);
      oval(head,C.blush,s*.46,-.18,.57,.20,.12,.028);
    }
    const smile=group(head);
    stroke(smile,[[-.14,-.28,.58],[0,-.34,.645],[.14,-.28,.58]],'#ad6d73',.026);
    const kissMouth=oval(head,C.brownDark,-.10,-.29,.618,.065,.052,.033);
    kissMouth.visible=false;
    // Sculpted charcoal black hair cap with little tuft silhouettes.
    oval(head,C.black,0,.52,-.02,.74,.39,.63,0,0,-.07);
    oval(head,C.black,-.41,.49,.40,.34,.27,.25,0,0,.38);
    oval(head,C.black,.43,.50,.35,.33,.28,.28,0,0,-.25);
    // Hair is sleek, soft and swept to one side, without spherical bumps.
    for(let i=0;i<6;i++){
      const x=-.49+i*.19;
      const frontY=.60+(i%3)*.045;
      stroke(head,[[x,.78,.18],[x+.12,.72,.38],[x+.19,.56,.52]],i%2?C.black:C.ink,.065);
    }
    const mouth=marker(head,-.10,-.28,.64);
    return {root,body,neck,head,legs,arms,mouth,smile,kissMouth,
      neutral(){
        arms.forEach(g=>g.rotation.set(0,0,0));
        legs.forEach(g=>g.rotation.set(0,0,0));
        kissMouth.visible=false;
        smile.visible=true;
      },
      move(t,amount){
        legs[0].rotation.x= Math.sin(t*11)*.39*amount;
        legs[1].rotation.x=-Math.sin(t*11)*.39*amount;
        arms[0].rotation.x=-Math.sin(t*11)*.23*amount;
        arms[1].rotation.x= Math.sin(t*11)*.23*amount;
        body.position.y=Math.abs(Math.sin(t*11))*.048*amount;
      }
    };
  }
  const stage=make('div','nhi-three-stage','nhiThreeStage');
  const canvas=document.createElement('canvas');canvas.id='nhiThreeCanvas';
  canvas.setAttribute('aria-label','Hoạt hình ba chiều: Nhi và Lương trong khu vườn');
  canvas.setAttribute('role','img');stage.append(canvas);
  const clipBtn=make('button','nhi-three-hotspot nhi-three-hairclip','nhiHairClipPlane');
  clipBtn.type='button';clipBtn.setAttribute('aria-label','Chạm hai kẹp tóc Nhi để gọi máy bay kéo băng rôn Lương yêu Nhi');clipBtn.title='Kẹp tóc hồng · Máy bay Lương ❤️ Nhi';
  const bouquetBtn=make('button','nhi-three-hotspot nhi-three-bouquet','nhiBouquetLoveV6');
  bouquetBtn.type='button';bouquetBtn.setAttribute('aria-label','Chạm bó hoa vàng để xem cánh hoa bay');
  bouquetBtn.title='Hoa vàng tặng Nhi';
  const heartBtn=make('button','nhi-three-hotspot nhi-three-heart','nhiCoupleHeartV6');
  heartBtn.type='button';heartBtn.textContent='♥';heartBtn.hidden=true;heartBtn.setAttribute('aria-label','Trái tim Lương và Nhi');
  stage.append(clipBtn,bouquetBtn,heartBtn);
  const overlay=make('div','nhi-three-bursts');
  overlay.setAttribute('aria-hidden','true');stage.append(overlay);
  let renderer,scene,camera,nhi,luong,airplane,button,live,resizeObs,visibilityObs,raf=0;
  let ready=false,state='LOADING',phase='idle',begin=0,frameAt=0,elapsedMs=0,playCount=0,burstDone=false;
  let error=null,lastWidth=0,lastHeight=0;
  const lerp=THREE.MathUtils.lerp;
  const smooth=p=>{p=THREE.MathUtils.clamp(p,0,1);return p*p*(3-2*p);};
  const delta=(a,b,t)=>smooth((t-a)/(b-a));
  function transition(next){
    state=next;stage.dataset.state=next;
    if(button){
      button.disabled=!['NHI_IDLE','COUPLE_IDLE'].includes(next);
      button.textContent=next==='COUPLE_IDLE'?'↻ Xem lại cảnh hôn':'❤️ Lương đến bên Nhi';
      button.setAttribute('aria-label',next==='COUPLE_IDLE'?'Phát lại cảnh hôn 3D dài 6 giây':'Cho Lương đến hôn Nhi trong hoạt hình 3D 6 giây');
    }
    heartBtn.hidden=next!=='COUPLE_IDLE';
    cover.dataset.nhiCover3d=next.toLowerCase();
  }
  function setPhase(p){phase=p;stage.dataset.phase=p;}
  function report(msg){if(live)live.textContent=msg;}
  function resize(){
    if(!renderer||!camera)return;
    const w=Math.max(100,stage.clientWidth),h=Math.max(100,stage.clientHeight);
    if(w===lastWidth&&h===lastHeight)return;
    lastWidth=w;lastHeight=h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
    renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function projectAnchor(anchor,elem){
    if(!anchor||!elem||!camera)return;
    const position=new THREE.Vector3();
    anchor.getWorldPosition(position);position.project(camera);
    const x=(position.x*.5+.5)*stage.clientWidth;
    const y=(-position.y*.5+.5)*stage.clientHeight;
    elem.style.left=Math.max(18,Math.min(stage.clientWidth-18,x))+'px';
    elem.style.top=Math.max(18,Math.min(stage.clientHeight-18,y))+'px';
  }
  function burst(type,at=stage){
    if(reduced())return;
    const host=stage.getBoundingClientRect();
    const rect=at.getBoundingClientRect();
    const x=rect.left+rect.width/2-host.left;
    const y=rect.top+rect.height/2-host.top;
    for(let i=0;i<7;i++){
      const sp=make('span','nhi-three-particle '+(type==='heart'?'is-heart':'is-flower'));
      sp.textContent=type==='heart'?(i%2?'♥':'♡'):(i%2?'✿':'❀');
      sp.style.left=x+'px';sp.style.top=y+'px';
      sp.style.setProperty('--dx',((i-3)*19+Math.random()*12)+'px');
      sp.style.setProperty('--dy',(-60-Math.random()*45)+'px');
      sp.style.setProperty('--delay',i*.07+'s');
      overlay.append(sp);
      sp.addEventListener('animationend',()=>sp.remove(),{once:true});
    }
  }
  function reset(){
    elapsedMs=0;burstDone=false;overlay.replaceChildren();
    if(!luong)return;
    luong.root.visible=false;
    luong.root.position.set(3.75,0,-2.7);
    luong.root.rotation.y=-.65;luong.root.scale.setScalar(.48);
    luong.neutral();
    luong.body.rotation.z=0;
    luong.head.rotation.set(0,0,0);
    luong.head.position.x=0;
    nhi.head.rotation.set(0,0,0);
    nhi.rightArm.position.y=2.62;
    setPhase('idle');transition('NHI_IDLE');
  }
  function resetAll(){if(!ready)return;reset();airplane?.stop();}
  function start(){
    if(!ready||cover.hidden||!['NHI_IDLE','COUPLE_IDLE'].includes(state))return false;
    reset();playCount++;
    if(reduced()){
      transition('PLAYING');
      elapsedMs=TOTAL;applyStory(TOTAL);transition('COUPLE_IDLE');
      report('Lương đứng cạnh Nhi; đã bỏ qua chuyển động theo thiết lập thiết bị.');
      return true;
    }
    transition('PLAYING');setPhase('appear');
    report('Lương đang bước đến, hướng mặt về Nhi và chuẩn bị hôn má cô ấy.');
    begin=performance.now();return true;
  }
  function applyStory(t){
    const idleTime=performance.now()/1000;
    const isIdle=state==='NHI_IDLE';
    const together=t>=TOTAL||state==='COUPLE_IDLE';
    nhi.root.position.x=-1.06;
    nhi.root.position.z=.10;
    nhi.root.rotation.y=.045;
    nhi.idle(idleTime,reduced());
    if(!isIdle && !luong.root.visible)luong.root.visible=true;
    if(isIdle)return;
    luong.move(t/1000,0);
    luong.body.position.y=0;
    if(t<beat.appear){
      setPhase('appear');
      const p=delta(0,beat.appear,t);
      luong.root.position.set(lerp(3.9,3.28,p),0,lerp(-3.2,-2.5,p));
      luong.root.scale.setScalar(lerp(.43,.55,p));
      luong.root.rotation.y=-.81;
      luong.head.rotation.y=-.55;
      luong.move(t/1000,.20);
    }else if(t<beat.walk){
      setPhase('walk');
      const p=delta(beat.appear,beat.walk,t);
      luong.root.position.set(lerp(3.28,1.34,p),0,lerp(-2.5,.12,p));
      luong.root.scale.setScalar(lerp(.55,1,p));
      // Always facing Nhi, never looking out at the camera.
      luong.root.rotation.y=lerp(-.80,-.95,p);
      luong.head.rotation.y=-.26;
      luong.move(t/1000,Math.min(1,Math.sin(Math.PI*p)*1.25));
    }else if(t<beat.stop){
      setPhase('stop');
      const p=delta(beat.walk,beat.stop,t);
      luong.root.position.set(lerp(1.34,1.04,p),0,.12);
      luong.root.scale.setScalar(1);
      luong.root.rotation.y=lerp(-.95,-1.06,p);
      luong.head.rotation.y=-.33;
      luong.move(t/1000,(1-p)*.26);
    }else if(t<beat.turn){
      setPhase('turn');
      const p=delta(beat.stop,beat.turn,t);
      luong.root.position.x=1.04;
      luong.root.rotation.y=-.84;
      luong.head.rotation.y=lerp(-.26,-.37,p);
      luong.head.rotation.z=.13*p;
      luong.head.position.x=-.15*p;
      nhi.head.rotation.z=-.06*p;
      nhi.head.rotation.y=.14*p;
    }else if(t<beat.kiss){
      setPhase('kiss');
      const p=delta(beat.turn,beat.kiss,t);
      luong.root.position.x=lerp(1.04,.64,p);
      luong.root.rotation.y=-.84;
      luong.head.rotation.y=-.37;
      luong.head.rotation.z=.13+.15*p;
      luong.head.position.x=-.15-.47*p;
      nhi.head.rotation.z=-.06-.055*p;
      nhi.head.rotation.y=.14+.08*p;
      // Shift Nhi's peace-sign hand outward a little so her cheek remains visible.
      nhi.rightArm.rotation.z=-.25*p;
      nhi.rightArm.position.y=2.62-.50*p;
      luong.smile.visible=false;luong.kissMouth.visible=true;
      if(!burstDone && p>.55){
        burstDone=true;burst('heart',heartBtn);
      }
    }else if(t<beat.recover){
      setPhase('recover');
      const p=delta(beat.kiss,beat.recover,t);
      luong.root.position.x=lerp(.64,1.06,p);
      luong.root.rotation.y=lerp(-.84,-.86,p);
      luong.head.rotation.y=lerp(-.37,-.34,p);
      luong.head.rotation.z=lerp(.28,.05,p);
      luong.head.position.x=lerp(-.62,0,p);
      nhi.head.rotation.z=lerp(-.115,-.045,p);
      nhi.head.rotation.y=lerp(.22,.20,p);
      nhi.rightArm.rotation.z=-.25*(1-p);
      nhi.rightArm.position.y=2.62-.50*(1-p);
      luong.smile.visible=true;luong.kissMouth.visible=false;
    }else{
      setPhase('couple');
      const p=delta(beat.recover,TOTAL,t);
      luong.root.position.set(lerp(1.06,1.16,p),0,.12);
      luong.root.rotation.y=-.86;
      luong.root.scale.setScalar(1);
      luong.head.rotation.y=-.34;
      luong.head.position.x=0;
      luong.smile.visible=true;luong.kissMouth.visible=false;
      if(together){
        const a=reduced()?0:Math.sin(idleTime*1.65+.72);
        luong.body.rotation.z=-.018*a;
        luong.head.rotation.z=.05+.023*a;
        nhi.head.rotation.z=-.06+.018*Math.sin(idleTime*1.78);
        nhi.head.rotation.y=.20;
        luong.arms.forEach(a=>a.rotation.set(0,0,0)); // both hands at sides
      }else{
        luong.head.rotation.z=.05*p;
        nhi.head.rotation.z=-.045*p;
      }
    }
  }
  function animate(now){
    if(!ready)return;
    const visible=!cover.hidden&&!document.hidden;
    if(visible){
      if(state==='PLAYING'){
        elapsedMs=Math.min(TOTAL,now-begin);
        applyStory(elapsedMs);
        if(elapsedMs>=TOTAL){
          elapsedMs=TOTAL;transition('COUPLE_IDLE');
          report('Lương đã hôn Nhi và đứng lại sát bên, hai người nghiêng đầu về nhau.');
        }
      }else if(state==='COUPLE_IDLE'){
        applyStory(TOTAL);
      }else if(state==='NHI_IDLE'){
        applyStory(0);
      }
      scene.updateMatrixWorld(true);
      projectAnchor(nhi.clipAnchor,clipBtn);
      projectAnchor(nhi.flowerAnchor,bouquetBtn);
      if(state==='COUPLE_IDLE'||state==='PLAYING'){
        projectAnchor(nhi.heartAnchor,heartBtn);
      }
      resize();
      renderer.render(scene,camera);
    }
    raf=requestAnimationFrame(animate);
  }
  function onBackground(){
    if(cover.hidden)resetAll();
    else if(ready && state==='PLAYING')resetAll();
  }
  function create3D(){
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.35;
    renderer.shadowMap.enabled=false;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(30,1,.1,100);
    camera.position.set(0,2.75,13.3);
    camera.lookAt(0,2.27,0);
    scene.add(new THREE.HemisphereLight('#fff7f1','#8c6c75',2.0));
    const main=new THREE.DirectionalLight('#fff0dc',3.0);main.position.set(-3,8,8);scene.add(main);
    const rim=new THREE.DirectionalLight('#fff1bd',1.45);rim.position.set(5,6,-3);scene.add(rim);
    nhi=makeNhi();luong=makeLuong();
    scene.add(nhi.root,luong.root);
  }
  function setup(){
    try{
      create3D();
      hero.append(stage);
      button=make('button','nhi-three-love-button','nhiLoveButton');button.type='button';
      button.addEventListener('click',start);
      const go=document.getElementById('coverGo');
      if(go)go.parentNode.insertBefore(button,go);
      else cover.querySelector('.cover-in')?.append(button);
      live=make('span','nhi-three-sr-only','nhiThreeStatus');
      live.setAttribute('role','status');live.setAttribute('aria-live','polite');cover.append(live);
      clipBtn.addEventListener('click',(e)=>{
        e.preventDefault();e.stopPropagation();
        const started=airplane?.play();
        if(started){clipBtn.classList.remove('is-spark');void clipBtn.offsetWidth;clipBtn.classList.add('is-spark');}
      });
      clipBtn.addEventListener('animationend',()=>clipBtn.classList.remove('is-spark'));
      bouquetBtn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();burst('petal',bouquetBtn);});
      heartBtn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();burst('heart',heartBtn);});
      airplane=window.NhiCoverAirplaneV3?.create(cover)||null;
      const ambient=make('div','nhi-three-ambient');
      ambient.setAttribute('aria-hidden','true');
      for(let i=0;i<10;i++){
        const dot=make('span');
        dot.textContent=i%2?'✿':'❀';
        dot.style.setProperty('--x',(3+i*9.7)%95+'%');
        dot.style.setProperty('--size',11+i%3*3+'px');
        dot.style.setProperty('--speed',(11+i%4*2)+'s');
        dot.style.setProperty('--offset',(-i*1.6)+'s');
        ambient.append(dot);
      }
      cover.append(ambient);
      cover.classList.add('nhi-cover-3d-v6-enabled');
      resize();ready=true;reset();
      resizeObs=new ResizeObserver(resize);resizeObs.observe(stage);
      visibilityObs=new MutationObserver(onBackground);
      visibilityObs.observe(cover,{attributes:true,attributeFilter:['hidden']});
      window.addEventListener('pagehide',resetAll);
      raf=requestAnimationFrame(animate);
    }catch(e){
      error=String(e);
      console.error('Nhi true 3D cover failed; retaining original cover mascot',e);
      renderer?.dispose();stage.remove();button?.remove();cover.querySelector('.nhi-three-ambient')?.remove();
      // The original cover mascot remains available as the failure fallback.
    }
  }
  setup();
  window.NHI_COVER_3D_V6={
    playKiss:start,playAirplane:()=>airplane?.play()||false,resetAll,
    getState:()=>({
      ready,state,phase,elapsedMs,storyDurationMs:TOTAL,playCount,
      renderer:renderer?'Three.js / WebGL':null,
      actualMesh3D:!!(nhi?.head?.children?.some(c=>c.isMesh)&&luong?.head?.children?.some(c=>c.isMesh)),
      luongVisible:!!luong?.root?.visible,
      luongBodyYaw:luong?.root?.rotation?.y??null,
      luongHeadYaw:luong?.head?.rotation?.y??null,
      luongArmPose:'both-at-sides',
      airplaneRunning:!!airplane?.running,
      error
    }),
    getTimes:()=>({...beat,finish:TOTAL})
  };
}

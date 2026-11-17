'use strict';
/* player.js — kontrol (keyboard, mouse, joystick TETAP, sentuh kamera), gerak pemain, duduk, gambar karakter */
const P={x:0,z:0,y:0,vy:0,vx:0,vz:0,yaw:Math.PI,phase:0,moveAmt:0,grounded:true,run:false,sit:null,bubble:null,
  look:{shirt:'#ff8a5c',hair:'#6b3f22',skin:'#ffd9b8',style:'short'},name:'',tag:null};

const Input={
  keys:{},joy:{x:0,y:0},runLatch:false,jumpQ:false,actQ:false,enabled:false,ptr:new Map(),joyId:null,pinch:0,
  bind(pad,joyBase){
    this.pad=pad;this.joyBase=joyBase;this.knob=joyBase.firstElementChild;
    const typing=e=>{const t=e.target&&e.target.tagName;return t==='INPUT'||t==='TEXTAREA'};
    addEventListener('keydown',e=>{if(typing(e))return;const k=e.key.toLowerCase();this.keys[k]=true;
      if(k==='e'||k==='enter'){this.actQ=true}if(k===' '){this.jumpQ=true;e.preventDefault()}
      if(k==='c'||k==='v'){Input.onCam&&Input.onCam()}if(k==='t'){Input.onChat&&Input.onChat(e)}
      if(k==='escape'){Input.onEsc&&Input.onEsc()}if(k.startsWith('arrow'))e.preventDefault()});
    addEventListener('keyup',e=>{this.keys[e.key.toLowerCase()]=false});
    addEventListener('blur',()=>{this.keys={};this.resetJoy()});
    // ---- joystick: posisi TETAP, hanya merespons sentuhan yang dimulai di dalamnya ----
    const jb=joyBase;
    jb.addEventListener('pointerdown',e=>{
      if(this.joyId!==null)return;e.preventDefault();e.stopPropagation();this.joyId=e.pointerId;
      try{jb.setPointerCapture(e.pointerId)}catch(_){}jb.classList.add('on');this.joyMove(e)});
    jb.addEventListener('pointermove',e=>{if(e.pointerId===this.joyId){e.preventDefault();this.joyMove(e)}});
    const ju=e=>{if(e.pointerId===this.joyId)this.resetJoy()};
    jb.addEventListener('pointerup',ju);jb.addEventListener('pointercancel',ju);jb.addEventListener('lostpointercapture',ju);
    jb.addEventListener('contextmenu',e=>e.preventDefault());
    // ---- kamera: semua sentuhan DI LUAR joystick/tombol ----
    pad.addEventListener('wheel',e=>{e.preventDefault();Cam.zoom(e.deltaY>0?1.1:.91)},{passive:false});
    pad.addEventListener('contextmenu',e=>e.preventDefault());
    pad.addEventListener('pointerdown',e=>this.down(e));
    pad.addEventListener('pointermove',e=>this.move(e));
    const up=e=>this.up(e);pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);
  },
  joyMove(e){
    const r=this.joyBase.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width*.36;
    let dx=e.clientX-cx,dy=e.clientY-cy;const l=Math.hypot(dx,dy);if(l>R){dx*=R/l;dy*=R/l}
    this.knob.style.transform=`translate(${dx}px,${dy}px)`;
    let jx=dx/R,jy=dy/R;const m=Math.hypot(jx,jy);
    if(m<.14){jx=jy=0}else{const k=(m-.14)/.86/m;jx*=k;jy*=k}
    this.joy.x=jx;this.joy.y=jy;
  },
  resetJoy(){this.joyId=null;this.joy.x=this.joy.y=0;if(this.knob)this.knob.style.transform='';if(this.joyBase)this.joyBase.classList.remove('on')},
  down(e){
    if(!this.enabled&&!Cam.intro)return;
    try{this.pad.setPointerCapture(e.pointerId)}catch(_){}
    this.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,t:e.pointerType});Cam.drag=true;
  },
  move(e){
    const r=this.ptr.get(e.pointerId);if(!r)return;
    if(this.ptr.size>=2){ // cubit untuk zoom
      const [a,b]=[...this.ptr.values()];r.x=e.clientX;r.y=e.clientY;const d=Math.hypot(a.x-b.x,a.y-b.y);
      if(this.pinch>0)Cam.zoom(this.pinch/d);this.pinch=d;return}
    const dx=e.clientX-r.x,dy=e.clientY-r.y;r.x=e.clientX;r.y=e.clientY;
    if(r.t==='mouse'&&!(e.buttons&3))return;
    Cam.rotate(dx,dy);
  },
  up(e){if(!this.ptr.delete(e.pointerId))return;this.pinch=0;if(!this.ptr.size)Cam.drag=false},
  reset(){this.ptr.clear();this.resetJoy();this.pinch=0;Cam.drag=false},
  vec(){
    let x=this.joy.x,y=this.joy.y;const k=this.keys;
    if(k.w||k.arrowup)y-=1;if(k.s||k.arrowdown)y+=1;if(k.a||k.arrowleft)x-=1;if(k.d||k.arrowright)x+=1;
    const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}return {x,y,m:Math.min(1,m)};
  },
  running(){return this.runLatch||this.keys.shift}
};

function placePlayer(x,z,yaw){P.x=x;P.z=z;P.y=0;P.vy=0;P.vx=P.vz=0;P.yaw=yaw;P.moveAmt=0;P.grounded=true;P.phase=0;P.sit=null}
function sitDown(s){P.sit=s;P.x=s.x;P.z=s.z;P.yaw=s.yaw;P.y=0;P.vx=P.vz=0;P.vy=0;P.moveAmt=0}
function standUp(){const s=P.sit;if(!s)return;P.sit=null;P.x=s.x+Math.sin(s.yaw)*.85;P.z=s.z+Math.cos(s.yaw)*.85;P.y=0;P.vx=P.vz=0;P.vy=0;collide(P);P.grounded=true}

function updatePlayer(dt,frozen){
  if(P.sit){
    const v=frozen?{m:0}:Input.vec();
    if(v.m>.35||Input.jumpQ){Input.jumpQ=false;standUp()}else{P.moveAmt=0;P.yaw=P.sit.yaw;Input.jumpQ=false;return}
  }
  const v=frozen?{x:0,y:0,m:0}:Input.vec();
  const run=Input.running()&&v.m>.05,spd=(run?7.6:4.4);
  if(v.m>.02){
    const yw=Cam.yaw,fx=-Math.sin(yw),fz=-Math.cos(yw),rx=-fz,rz=fx;
    const mx=fx*(-v.y)+rx*v.x,mz=fz*(-v.y)+rz*v.x,l=Math.hypot(mx,mz)||1;
    const tx=mx/l*spd*v.m,tz=mz/l*spd*v.m,a=1-Math.exp(-dt*16);
    P.vx=lerp(P.vx,tx,a);P.vz=lerp(P.vz,tz,a);
    let want=Math.atan2(mx,mz),e=want-P.yaw;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;P.yaw+=e*Math.min(1,dt*14);
  }else{const a=1-Math.exp(-dt*20);P.vx=lerp(P.vx,0,a);P.vz=lerp(P.vz,0,a)}
  const sp=Math.hypot(P.vx,P.vz);P.moveAmt=sp/4.4;
  const n=Math.max(1,Math.ceil(sp*dt/.18));
  for(let i=0;i<n;i++){P.x+=P.vx*dt/n;P.z+=P.vz*dt/n;collide(P)}
  if(Input.jumpQ&&P.grounded&&!frozen){P.vy=7.4;P.grounded=false}Input.jumpQ=false;
  const g=groundAt(P.x,P.z,P.y);
  if(!P.grounded||P.y>g+.001){P.vy-=22*dt;P.y+=P.vy*dt;if(P.y<=g){P.y=g;P.vy=0;P.grounded=true}}else{P.y=g;P.grounded=true}
  if(P.grounded&&P.y<g)P.y=g;
  P.phase+=sp*dt*(run?1.55:1.9);
}

/* ---------- gambar karakter (pemain, NPC, pemain online) ---------- */
const _cyl8=GEO.cyl(8,.9,1),_cyl10=GEO.cyl(10,.82,1),_cyl12=GEO.cyl(12,.5,1),_ico0=GEO.ico(0),_ico1=GEO.ico(1);
const _tagTex={},_bubTex=new Map();
function nameTex(text,bg,fg){
  const k=text+bg+fg;if(_tagTex[k])return _tagTex[k];
  const c=document.createElement('canvas'),x=c.getContext('2d');x.font=FD(46);const w=Math.ceil(x.measureText(text).width)+50;
  c.width=w;c.height=76;x.font=FD(46);x.textAlign='center';x.textBaseline='middle';
  x.fillStyle=PAL.ink;x.beginPath();x.roundRect(2,6,w-4,64,28);x.fill();x.fillStyle=bg;x.beginPath();x.roundRect(7,9,w-14,52,24);x.fill();
  x.fillStyle=fg;x.fillText(text,w/2,37);
  return _tagTex[k]={tex:R.texFromCanvas(c,false),w:w/76*.4,h:.4};
}
/* gelembung chat di atas kepala (maks. 2 baris) */
function bubbleTex(text){
  let b=_bubTex.get(text);if(b){return b}
  const c=document.createElement('canvas'),x=c.getContext('2d');x.font=FB(34);
  const words=text.split(' '),lines=[''];for(const w of words){const t=lines[lines.length-1]?lines[lines.length-1]+' '+w:w;if(x.measureText(t).width>420&&lines[lines.length-1]){lines.push(w)}else lines[lines.length-1]=t}
  let L=lines.slice(0,2);if(lines.length>2)L[1]=L[1].slice(0,Math.max(1,L[1].length-1))+'…';
  const tw=Math.min(460,Math.max(...L.map(s=>Math.ceil(x.measureText(s).width))))+40,th=L.length*42+30;
  c.width=tw;c.height=th+18;x.font=FB(34);x.textBaseline='middle';x.textAlign='center';
  x.fillStyle=PAL.ink;x.beginPath();x.roundRect(2,2,tw-4,th,24);x.fill();x.fillStyle=PAL.cream;x.beginPath();x.roundRect(7,7,tw-14,th-10,20);x.fill();
  x.fillStyle=PAL.ink;x.beginPath();x.moveTo(tw/2-12,th-4);x.lineTo(tw/2,th+16);x.lineTo(tw/2+12,th-4);x.fill();
  x.fillStyle=PAL.cream;x.beginPath();x.moveTo(tw/2-8,th-8);x.lineTo(tw/2,th+8);x.lineTo(tw/2+8,th-8);x.fill();
  x.fillStyle=PAL.ink;L.forEach((s,i)=>x.fillText(s,tw/2,18+i*42+21));
  b={tex:R.texFromCanvas(c,false),w:c.width/190,h:c.height/190};_bubTex.set(text,b);
  if(_bubTex.size>30){const k=_bubTex.keys().next().value,o=_bubTex.get(k);try{R.gl.deleteTexture(o.tex)}catch(e){}_bubTex.delete(k)}
  return b;
}
/* o: {x,y,z,yaw,phase,amt(0..1),t,look,tag,dist,sit,bubble} */
function drawPerson(o){
  const L=o.look,sk=L.skin,amt=Math.min(1,o.amt||0),ph=o.phase,t=o.t||0,sit=!!o.sit;
  const sw=sit?0:Math.sin(ph)*.75*amt,bob=sit?0:Math.abs(Math.sin(ph))*.045*amt,br=Math.sin(t*2.2)*.012*(1-amt);
  const root=M4.mul(M4.T(o.x,o.y+(sit?-.12:0)+bob,o.z),M4.Ry(o.yaw));
  const at=(lx,ly,lz,sx,sy,sz)=>M4.mul(root,M4.trs([lx,ly,lz],[0,0,0],[sx,sy,sz]));
  const R_=(mesh,col,M,op)=>R.push(mesh,col,M,op);
  R_(GEO.cyl(14,1,1),'#000000',M4.trs([o.x,o.y+.025,o.z],[0,0,0],[.46,.01,.46]),{alpha:.2,cast:false,recv:false,emis:1});
  const far=o.dist>38,pants=L.dress?sk:'#44506b';
  for(const sd of [-1,1]){
    if(sit){ // paha ke depan, betis ke bawah
      const par=M4.mul(root,M4.mul(M4.T(sd*.13,.64,0),M4.Rx(-Math.PI/2)));
      R_(_cyl8,pants,M4.mul(par,M4.trs([0,-.42,0],[0,0,0],[.095,.42,.095])));
      R_(_cyl8,pants,at(sd*.13,.14,.42,.09,.5,.09));R_(GEO.box,'#2b1a0e',at(sd*.13,.1,.47,.2,.12,.3));
    }else{
      const s=sw*sd,par=M4.mul(root,M4.mul(M4.T(sd*.13,.64,0),M4.Rx(s)));
      R_(_cyl8,pants,M4.mul(par,M4.trs([0,-.62,0],[0,0,0],[.095,.62,.095])));
      R_(GEO.box,'#2b1a0e',M4.mul(par,M4.trs([0,-.58,.05],[0,0,0],[.2,.12,.3])));
    }
  }
  if(L.dress)R_(_cyl12,L.shirt,at(0,.3,0,.4,.82+br,.34));
  else R_(_cyl10,L.shirt,at(0,.58,0,.27,.54+br,.22));
  R_(_ico1,L.shirt,at(0,1.09+br,0,.27,.13,.22));
  if(L.vest){R_(GEO.box,L.vest,at(0,.86,0,.58,.42,.5));R_(GEO.box,'#fff8e6',at(0,.82,0,.6,.06,.52));}
  if(L.bag)R_(GEO.box,L.bag,at(0,.88,-.3,.36,.44,.16));
  for(const sd of [-1,1]){
    const s=sit?-.85:-sw*sd*(L.dress?.8:1),par=M4.mul(root,M4.mul(M4.T(sd*.35,1.06,0),M4.Rx(s+(amt<.05&&!sit?Math.sin(t*1.7+sd)*.04:0))));
    R_(_cyl8,L.shirt,M4.mul(par,M4.trs([0,-.28,0],[0,0,0],[.075,.28,.075])));
    R_(_cyl8,sk,M4.mul(par,M4.trs([0,-.5,0],[0,0,0],[.065,.22,.065])));
    R_(_ico0,sk,M4.mul(par,M4.trs([0,-.52,0],[0,0,0],[.085,.085,.085])));
  }
  const hy=1.4+br*.5;
  R_(_ico1,sk,at(0,hy,0,.27,.28,.27));
  if(!far){R_(_ico0,'#2b1a0e',at(-.1,hy+.02,.245,.035,.045,.03));R_(_ico0,'#2b1a0e',at(.1,hy+.02,.245,.035,.045,.03));
    R_(GEO.box,'#b4543a',at(0,hy-.1,.262,.09,.022,.02));R_(_ico0,'#ffb4a0',at(-.17,hy-.05,.2,.04,.03,.02));R_(_ico0,'#ffb4a0',at(.17,hy-.05,.2,.04,.03,.02))}
  const hc=L.hair,st=L.style;
  if(st!=='hat'){R_(_ico1,hc,at(0,hy+.07,-.025,.295,.24,.3))}
  if(st==='long')R_(_ico1,hc,at(0,hy-.2,-.14,.27,.4,.17));
  if(st==='bun')R_(_ico1,hc,at(0,hy+.33,-.08,.12,.12,.12));
  if(st==='cap'){R_(_ico1,L.cap,at(0,hy+.1,-.01,.31,.2,.31));R_(GEO.box,L.cap,at(0,hy+.07,.3,.34,.045,.2))}
  if(st==='hat'){R_(_ico1,L.cap,at(0,hy+.1,0,.33,.24,.33));R_(GEO.cyl(12,1,1),L.cap,at(0,hy+.04,0,.39,.04,.39))}
  const top=o.y+2.05-(sit?.45:0);
  if(o.tag&&o.dist<24){const tg=o.tag;
    R_(GEO.plane,[1,1,1],M4.mul(M4.T(o.x,top,o.z),M4.mul(M4.Ry(Cam.yaw),M4.S(tg.w,tg.h,1))),{tex:tg.tex,cast:false,recv:false,emis:1,nofog:1})}
  if(o.bubble&&o.dist<30){const bb=o.bubble.tex||(o.bubble.tex=bubbleTex(o.bubble.text));
    R_(GEO.plane,[1,1,1],M4.mul(M4.T(o.x,top+.28+bb.h/2,o.z),M4.mul(M4.Ry(Cam.yaw),M4.S(bb.w,bb.h,1))),{tex:bb.tex,cast:false,recv:false,emis:1,nofog:1})}
}

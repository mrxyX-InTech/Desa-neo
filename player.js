'use strict';
/* player.js — kontrol (keyboard, mouse, joystick virtual, sentuh), gerak pemain, dan gambar karakter */
const P={x:0,z:0,y:0,vy:0,vx:0,vz:0,yaw:Math.PI,phase:0,moveAmt:0,grounded:true,run:false,
  look:{shirt:'#ff8a5c',hair:'#6b3f22',skin:'#ffd9b8',style:'short'},name:'',tag:null};

const Input={
  keys:{},joy:{x:0,y:0},runLatch:false,jumpQ:false,actQ:false,enabled:false,ptr:new Map(),joyId:null,joyO:null,pinch:0,
  bind(pad,joyEl){
    this.pad=pad;this.joyEl=joyEl;
    const typing=e=>{const t=e.target&&e.target.tagName;return t==='INPUT'||t==='TEXTAREA'};
    addEventListener('keydown',e=>{if(typing(e))return;const k=e.key.toLowerCase();this.keys[k]=true;
      if(k==='e'||k==='enter'){this.actQ=true}if(k===' '){this.jumpQ=true;e.preventDefault()}
      if(k==='c'||k==='v'){Input.onCam&&Input.onCam()}if(k==='escape'){Input.onEsc&&Input.onEsc()}
      if(k.startsWith('arrow'))e.preventDefault()});
    addEventListener('keyup',e=>{this.keys[e.key.toLowerCase()]=false});
    addEventListener('blur',()=>{this.keys={};this.joy.x=this.joy.y=0});
    pad.addEventListener('wheel',e=>{e.preventDefault();Cam.zoom(e.deltaY>0?1.1:.91)},{passive:false});
    pad.addEventListener('contextmenu',e=>e.preventDefault());
    pad.addEventListener('pointerdown',e=>this.down(e));
    pad.addEventListener('pointermove',e=>this.move(e));
    const up=e=>this.up(e);pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);
  },
  down(e){
    if(!this.enabled&&!Cam.intro)return;
    try{this.pad.setPointerCapture(e.pointerId)}catch(_){}
    const r={x:e.clientX,y:e.clientY,t:e.pointerType};
    if(e.pointerType==='touch'&&e.clientX<innerWidth*.5&&this.joyId===null&&this.enabled){
      this.joyId=e.pointerId;this.joyO={x:e.clientX,y:e.clientY};r.joy=true;
      const j=this.joyEl;j.style.display='block';j.style.left=e.clientX+'px';j.style.top=e.clientY+'px';j.firstElementChild.style.transform='translate(0,0)';
    }else{r.cam=true;Cam.drag=true}
    this.ptr.set(e.pointerId,r);
  },
  move(e){
    const r=this.ptr.get(e.pointerId);if(!r)return;
    if(r.joy){
      let dx=e.clientX-this.joyO.x,dy=e.clientY-this.joyO.y;const R=52,l=Math.hypot(dx,dy);
      if(l>R){dx*=R/l;dy*=R/l}
      this.joyEl.firstElementChild.style.transform=`translate(${dx}px,${dy}px)`;
      let jx=dx/R,jy=dy/R;const m=Math.hypot(jx,jy);
      if(m<.14){jx=jy=0}else{const k=(m-.14)/.86/m;jx*=k;jy*=k}
      this.joy.x=jx;this.joy.y=jy;
    }else if(r.cam){
      const cams=[...this.ptr.values()].filter(q=>q.cam);
      if(cams.length>=2){ // cubit untuk zoom
        const [a,b]=cams;r.x=e.clientX;r.y=e.clientY;const d=Math.hypot(a.x-b.x,a.y-b.y);
        if(this.pinch>0)Cam.zoom(this.pinch/d);this.pinch=d;
      }else{
        let dx=e.clientX-r.x,dy=e.clientY-r.y;r.x=e.clientX;r.y=e.clientY;
        if(r.t==='mouse'&&!(e.buttons&3))return;
        Cam.rotate(dx,dy);
      }
    }
  },
  up(e){
    const r=this.ptr.get(e.pointerId);if(!r)return;this.ptr.delete(e.pointerId);
    if(r.joy){this.joyId=null;this.joy.x=this.joy.y=0;this.joyEl.style.display='none'}
    if(r.cam){this.pinch=0;if(![...this.ptr.values()].some(q=>q.cam))Cam.drag=false}
  },
  reset(){this.ptr.clear();this.joyId=null;this.joy.x=this.joy.y=0;this.pinch=0;Cam.drag=false;if(this.joyEl)this.joyEl.style.display='none'},
  vec(){
    let x=this.joy.x,y=this.joy.y;const k=this.keys;
    if(k.w||k.arrowup)y-=1;if(k.s||k.arrowdown)y+=1;if(k.a||k.arrowleft)x-=1;if(k.d||k.arrowright)x+=1;
    const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}return {x,y,m:Math.min(1,m)};
  },
  running(){return this.runLatch||this.keys.shift}
};

function placePlayer(x,z,yaw){P.x=x;P.z=z;P.y=0;P.vy=0;P.vx=P.vz=0;P.yaw=yaw;P.moveAmt=0;P.grounded=true;P.phase=0}

function updatePlayer(dt,frozen){
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
  // sub-langkah agar tidak menembus benda tipis
  const n=Math.max(1,Math.ceil(sp*dt/.18));
  for(let i=0;i<n;i++){P.x+=P.vx*dt/n;P.z+=P.vz*dt/n;collide(P)}
  // lompat & gravitasi
  if(Input.jumpQ&&P.grounded&&!frozen){P.vy=7.4;P.grounded=false}Input.jumpQ=false;
  const g=groundAt(P.x,P.z,P.y);
  if(!P.grounded||P.y>g+.001){P.vy-=22*dt;P.y+=P.vy*dt;if(P.y<=g){P.y=g;P.vy=0;P.grounded=true}}else{P.y=g;P.grounded=true}
  if(P.grounded&&P.y<g)P.y=g;
  P.phase+=sp*dt*(run?1.55:1.9);
}

/* ---------- gambar karakter (dipakai pemain & NPC) ---------- */
const _cyl8=GEO.cyl(8,.9,1),_cyl10=GEO.cyl(10,.82,1),_cyl12=GEO.cyl(12,.5,1),_ico0=GEO.ico(0),_ico1=GEO.ico(1);
const _tagTex={};
function nameTex(text,bg,fg){
  const k=text+bg+fg;if(_tagTex[k])return _tagTex[k];
  const c=document.createElement('canvas'),x=c.getContext('2d');x.font=FD(46);const w=Math.ceil(x.measureText(text).width)+50;
  c.width=w;c.height=76;x.font=FD(46);x.textAlign='center';x.textBaseline='middle';
  x.fillStyle=PAL.ink;x.beginPath();x.roundRect(2,6,w-4,64,28);x.fill();x.fillStyle=bg;x.beginPath();x.roundRect(7,9,w-14,52,24);x.fill();
  x.fillStyle=fg;x.fillText(text,w/2,37);
  return _tagTex[k]={tex:R.texFromCanvas(c,false),w:w/76*.4,h:.4};
}
/* o: {x,y,z,yaw,phase,amt(0..1),run,t,look,tag,dist} */
function drawPerson(o){
  const L=o.look,sk=L.skin,amt=Math.min(1,o.amt||0),ph=o.phase,t=o.t||0;
  const sw=Math.sin(ph)*.75*amt,bob=Math.abs(Math.sin(ph))*.045*amt,br=Math.sin(t*2.2)*.012*(1-amt);
  const root=M4.mul(M4.T(o.x,o.y+bob,o.z),M4.Ry(o.yaw));
  const at=(lx,ly,lz,sx,sy,sz)=>M4.mul(root,M4.trs([lx,ly,lz],[0,0,0],[sx,sy,sz]));
  const R_=(mesh,col,M,op)=>R.push(mesh,col,M,op);
  // bayangan bulat
  R_(GEO.cyl(14,1,1),'#000000',M4.trs([o.x,o.y+.025,o.z],[0,0,0],[.46,.01,.46]),{alpha:.2,cast:false,recv:false,emis:1});
  const far=o.dist>38;
  // kaki
  const pants=L.dress?sk:'#44506b';
  for(const sd of [-1,1]){
    const s=sw*sd,par=M4.mul(root,M4.mul(M4.T(sd*.13,.64,0),M4.Rx(s)));
    R_(_cyl8,pants,M4.mul(par,M4.trs([0,-.62,0],[0,0,0],[.095,.62,.095])));
    R_(GEO.box,'#2b1a0e',M4.mul(par,M4.trs([0,-.58,.05],[0,0,0],[.2,.12,.3])));
  }
  // badan
  if(L.dress)R_(_cyl12,L.shirt,at(0,.3,0,.4,.82+br,.34));
  else R_(_cyl10,L.shirt,at(0,.58,0,.27,.54+br,.22));
  R_(_ico1,L.shirt,at(0,1.09+br,0,.27,.13,.22));
  if(L.vest){R_(GEO.box,L.vest,at(0,.86,0,.58,.42,.5));R_(GEO.box,'#fff8e6',at(0,.82,0,.6,.06,.52));}
  if(L.bag)R_(GEO.box,L.bag,at(0,.88,-.3,.36,.44,.16));
  // lengan
  for(const sd of [-1,1]){
    const s=-sw*sd*(L.dress?.8:1),par=M4.mul(root,M4.mul(M4.T(sd*.35,1.06,0),M4.Rx(s+(amt<.05?Math.sin(t*1.7+sd)*.04:0))));
    R_(_cyl8,L.shirt,M4.mul(par,M4.trs([0,-.28,0],[0,0,0],[.075,.28,.075])));
    R_(_cyl8,sk,M4.mul(par,M4.trs([0,-.5,0],[0,0,0],[.065,.22,.065])));
    R_(_ico0,sk,M4.mul(par,M4.trs([0,-.52,0],[0,0,0],[.085,.085,.085])));
  }
  // kepala
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
  // nama
  if(o.tag&&o.dist<24){
    const tg=o.tag,m=M4.mul(M4.T(o.x,o.y+2.05,o.z),M4.mul(M4.Ry(Cam.yaw),M4.S(tg.w,tg.h,1)));
    R_(GEO.plane,[1,1,1],m,{tex:tg.tex,cast:false,recv:false,emis:1,nofog:1});
  }
}

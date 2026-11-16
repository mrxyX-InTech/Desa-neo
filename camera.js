'use strict';
/* camera.js — kamera orbit third-person dengan smooth follow, zoom, mode atas (drone) dan orbit intro */
const Cam={
  mode:'walk',            // 'walk' | 'top'
  yaw:0,pitch:.34,dist:7.5,
  want:{walk:{pitch:.34,dist:7.5},top:{pitch:1.2,dist:42}},
  lim:{walk:{p0:.05,p1:.95,d0:3.2,d1:15},top:{p0:.9,p1:1.5,d0:14,d1:95}},
  tgt:[0,1.4,0],eye:[0,5,10],focus:[0,0,0],fov:58*Math.PI/180,
  intro:false,drag:false,top:false,pitchView:.34,_init:false,
  setMode(m){this.mode=m;this.top=m==='top'},
  rotate(dx,dy){
    this.yaw-=dx*.0062;
    const w=this.want[this.mode],l=this.lim[this.mode];
    w.pitch=cl(w.pitch+dy*.0045,l.p0,l.p1);
    this.autoHold=1.2;
  },
  zoom(k){const w=this.want[this.mode],l=this.lim[this.mode];w.dist=cl(w.dist*k,l.d0,l.d1)},
  /* p = pemain; dt detik */
  update(dt,p,moveAmt){
    const w=this.want[this.mode];
    const kk=1-Math.exp(-dt*(this.drag?30:9));
    this.pitch=lerp(this.pitch,w.pitch,kk);
    let wd=w.dist;
    if(this.intro){this.yaw+=dt*.32;this.pitch=lerp(this.pitch,.2,kk);wd=4.4}
    this.autoHold=Math.max(0,(this.autoHold||0)-dt);
    // kamera pelan-pelan ikut ke belakang pemain saat berjalan (mode jalan)
    if(!this.intro&&this.mode==='walk'&&!this.drag&&this.autoHold<=0&&moveAmt>.05){
      let e=(p.yaw+Math.PI)-this.yaw;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
      this.yaw+=e*Math.min(1,dt*1.3)*Math.min(1,moveAmt)}
    const ty=p.y+(this.intro?1.15:1.35);
    const fk=this._init?1-Math.exp(-dt*(this.intro?5:13)):1;this._init=true;
    this.tgt[0]=lerp(this.tgt[0],p.x,fk);this.tgt[1]=lerp(this.tgt[1],ty,fk);this.tgt[2]=lerp(this.tgt[2],p.z,fk);
    // jangan tembus bangunan tinggi
    const cp=Math.cos(this.pitch),dir=[Math.sin(this.yaw)*cp,Math.sin(this.pitch),Math.cos(this.yaw)*cp];
    let d=wd;
    if(this.mode==='walk'){
      for(let s=.8;s<=wd;s+=.35){const q=[this.tgt[0]+dir[0]*s,this.tgt[1]+dir[1]*s,this.tgt[2]+dir[2]*s];if(camBlocked(q[0],q[1],q[2])){d=Math.max(1.8,s-.5);break}}
    }
    this.dist=lerp(this.dist,d,d<this.dist?.5:1-Math.exp(-dt*4));
    this.eye=[this.tgt[0]+dir[0]*this.dist,Math.max(.7,this.tgt[1]+dir[1]*this.dist),this.tgt[2]+dir[2]*this.dist];
    this.focus=[this.tgt[0],0,this.tgt[2]];
    this.pitchView=Math.atan2(this.eye[1]-this.tgt[1],Math.hypot(this.eye[0]-this.tgt[0],this.eye[2]-this.tgt[2]));
  }
};

'use strict';
/* npc.js — NPC berjalan pelan di rute aman, idle/walk animation, berhenti saat didekati */
const NPCs={
  list:[],
  init(){
    this.list=NPC_DEFS.map((d,i)=>new NPC(d,i));
  },
  update(dt,t){for(const n of this.list)n.update(dt,t)},
  draw(t){for(const n of this.list)n.draw(t)},
  get(id){return this.list.find(n=>n.d.id===id)}
};
class NPC{
  constructor(d,i){
    this.d=d;this.i=i;this.x=d.pts[0][0];this.z=d.pts[0][1];this.y=0;this.yaw=0;this.wp=1%d.pts.length;this.dir=1;
    this.state='wait';this.timer=1+i*.7;this.phase=i*1.7;this.amt=0;this.talk=false;this.lineI=0;
    this.look={shirt:d.shirt,hair:d.hair,skin:d.skin,style:d.style,cap:d.cap,vest:d.vest,bag:d.bag,dress:d.dress};
    this.tag=nameTex(d.name,'#fff8e6','#2b1a0e');this.mark=null;
    const q=d.pts[this.wp];this.yaw=Math.atan2(q[0]-this.x,q[1]-this.z);
  }
  nextLine(){const l=this.d.lines;const s=l[this.lineI%l.length];this.lineI++;return s}
  update(dt){
    const d=this.d,pd=Math.hypot(P.x-this.x,P.z-this.z);
    let moving=false;
    if(this.talk||pd<2.4&&this.state!=='far'){ // berhenti & menoleh ke pemain
      const w=Math.atan2(P.x-this.x,P.z-this.z);let e=w-this.yaw;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;this.yaw+=e*Math.min(1,dt*6);
    }else if(this.state==='wait'){
      this.timer-=dt;if(this.timer<=0)this.state='walk';
    }else{
      const q=d.pts[this.wp],dx=q[0]-this.x,dz=q[1]-this.z,l=Math.hypot(dx,dz);
      if(l<.15){
        this.timer=d.wait[0]+Math.random()*(d.wait[1]-d.wait[0]);this.state='wait';
        if(d.mode==='loop')this.wp=(this.wp+1)%d.pts.length;
        else{if(this.wp+this.dir<0||this.wp+this.dir>=d.pts.length)this.dir*=-1;this.wp+=this.dir}
      }else{
        const w=Math.atan2(dx,dz);let e=w-this.yaw;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;this.yaw+=e*Math.min(1,dt*7);
        const s=Math.min(d.speed*dt,l);this.x+=dx/l*s;this.z+=dz/l*s;moving=true;
        const c={x:this.x,y:0,z:this.z};collide(c,.3);this.x=c.x;this.z=c.z;
      }
    }
    this.amt=lerp(this.amt,moving?1:0,Math.min(1,dt*8));
    if(moving)this.phase+=d.speed*dt*2.4;
  }
  draw(t){
    const dist=Math.hypot(P.x-this.x,P.z-this.z);if(dist>75)return;
    drawPerson({x:this.x,y:0,z:this.z,yaw:this.yaw,phase:this.phase,amt:this.amt,t:t+this.i*3,look:this.look,tag:this.tag,dist});
    if(this.mark){ // tanda seru misi
      const b=Math.sin(t*4)*.12;R.push(GEO.cyl(8,0,1),'#ffd23f',M4.trs([this.x,2.95+b,this.z],[Math.PI,t*2,0],[.2,.4,.2]),{emis:.7,cast:false,recv:false});
      R.push(GEO.ico(1),'#ffd23f',M4.trs([this.x,3.28+b,this.z],[0,0,0],[.15,.15,.15]),{emis:.7,cast:false,recv:false});
    }
  }
}

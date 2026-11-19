'use strict';
/* world.js — membangun seluruh Kota Neo secara prosedural (low-poly cartoon) + interaksi dunia */
const World={
  places:[],own:null,clouds:[],lamps:[],stats:{},seats:[],lotProps:[],roofs:[],
  build(){
    const G=R.batch('ground',{cast:0,recv:1,ao:0}),S=R.batch('solid',{cast:1,recv:1,ao:1}),SG=R.batch('signs',{cast:0,recv:1,ao:0,tex:1}),
      LB=R.batch('lamp',{cast:0,recv:0,ao:0,night:1,gmix:1}),PL=R.batch('pools',{cast:0,recv:0,ao:0},false),ST=R.batch('stars',{cast:0,recv:0,ao:0},false);
    const P_=this.places=[];this.lamps=[];this.seats=[];this.lotProps=[];this.roofs=[];
    const INK=PAL.ink,CREAM=PAL.cream;

    /* ---------- helper primitif ---------- */
    const box=(b,col,cx,cy,cz,sx,sy,sz,ry)=>b.add(GEO.box,col,[cx,cy,cz],[0,ry||0,0],[sx,sy,sz]);
    const slab=(b,col,x0,z0,x1,z1,y0,y1)=>b.add(GEO.box,col,[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],[0,0,0],[x1-x0,y1-y0,z1-z0]);
    const cyl=(b,col,x,y,z,r,h,n,rt)=>b.add(GEO.cyl(n||10,rt===undefined?1:rt,1),col,[x,y,z],[0,0,0],[r,h,r]);
    const ball=(b,col,x,y,z,rx,ry,rz,sd)=>b.add(GEO.ico(sd===undefined?1:sd),col,[x,y,z],[0,0,0],[rx,ry===undefined?rx:ry,rz===undefined?rx:rz]);
    const solid=(x0,z0,x1,z1,h,o)=>addSolid(x0,z0,x1,z1,h,o);
    const sol2=(cx,cz,sx,sz,h,o)=>addSolid(cx-sx/2,cz-sz/2,cx+sx/2,cz+sz/2,h,o);
    /* kerangka lokal (yaw kelipatan 90°): lx kanan, lz depan */
    const Fr=(b,x,z,yaw)=>{const c=Math.cos(yaw),s=Math.sin(yaw),W=(lx,lz)=>[x+lx*c+lz*s,z-lx*s+lz*c];
      return {W,
        box(col,lx,ly,lz,sx,sy,sz,bb){const w=W(lx,lz);(bb||b).add(GEO.box,col,[w[0],ly,w[1]],[0,yaw,0],[sx,sy,sz])},
        part(mesh,col,lx,ly,lz,sx,sy,sz,bb,rx,rz){const w=W(lx,lz);(bb||b).add(mesh,col,[w[0],ly,w[1]],[rx||0,yaw,rz||0],[sx,sy,sz])},
        cyl(col,lx,ly,lz,r,h,n,bb,rt){const w=W(lx,lz);cyl(bb||b,col,w[0],ly,w[1],r,h,n,rt)},
        ball(col,lx,ly,lz,rx,ry,rz,bb){const w=W(lx,lz);ball(bb||b,col,w[0],ly,w[1],rx,ry,rz)},
        tri(col,a,bb,c,bt){const p=q=>{const w=W(q[0],q[2]);return [w[0],q[1],w[1]]};(bt||b).tri(p(a),p(bb),p(c),col)},
        quad(uv,lx,ly,lz,w,h,bb){const q=(dx,dy)=>{const p=W(lx+dx,lz);return [p[0],ly+dy,p[1]]};(bb||SG).quad(q(-w/2,-h/2),q(w/2,-h/2),q(w/2,h/2),q(-w/2,h/2),'#ffffff',uv)},
        solid(lx0,lz0,lx1,lz1,h,o){const a=W(lx0,lz0),d=W(lx1,lz1);solid(a[0],a[1],d[0],d[1],h,o)}}};
    /* papan teks menghadap f ('+x','-x','+z','-z') */
    const sign=(uv,cx,cy,cz,w,h,f,bb)=>{
      let a,b,c,d;const hw=w/2,hh=h/2;
      if(f==='+z'){a=[cx-hw,cy-hh,cz];b=[cx+hw,cy-hh,cz];c=[cx+hw,cy+hh,cz];d=[cx-hw,cy+hh,cz]}
      else if(f==='-z'){a=[cx+hw,cy-hh,cz];b=[cx-hw,cy-hh,cz];c=[cx-hw,cy+hh,cz];d=[cx+hw,cy+hh,cz]}
      else if(f==='+x'){a=[cx,cy-hh,cz+hw];b=[cx,cy-hh,cz-hw];c=[cx,cy+hh,cz-hw];d=[cx,cy+hh,cz+hw]}
      else{a=[cx,cy-hh,cz-hw];b=[cx,cy-hh,cz+hw];c=[cx,cy+hh,cz+hw];d=[cx,cy+hh,cz-hw]}
      (bb||SG).quad(a,b,c,d,'#ffffff',uv)};
    const opp=f=>({'+x':'-x','-x':'+x','+z':'-z','-z':'+z'})[f];

    /* ---------- papan teks (atlas) ---------- */
    const rr=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r)};
    const board=(key,w,h,title,sub,o)=>{o=o||{};return Atlas.add(key,w,h,(c)=>{
      c.fillStyle=o.bg||CREAM;c.fillRect(0,0,w,h);
      if(o.hazard){const bh=Math.round(h*.16);c.save();c.beginPath();c.rect(0,0,w,bh);c.rect(0,h-bh,w,bh);c.clip();c.fillStyle='#ffd23f';c.fillRect(0,0,w,h);c.fillStyle=INK;
        for(let x=-h;x<w+h;x+=bh*1.4){c.beginPath();c.moveTo(x,0);c.lineTo(x+bh*.7,0);c.lineTo(x+bh*.7-bh,h);c.lineTo(x-bh,h);c.fill()}c.restore()}
      c.lineWidth=Math.max(6,h*.04);c.strokeStyle=INK;rr(c,c.lineWidth/2,c.lineWidth/2,w-c.lineWidth,h-c.lineWidth,h*.1);c.stroke();
      c.textAlign='center';c.textBaseline='middle';c.fillStyle=o.fg||INK;
      const ty=sub?h*(o.hazard?.4:.38):h*.5,ts=o.size||h*(sub?.34:.46);c.font=FD(ts);
      let tw=c.measureText(title).width;if(tw>w*.86){c.font=FD(ts*w*.86/tw)}c.fillText(title,w/2,ty);
      if(sub){c.fillStyle=o.subfg||'#c0392b';c.font=FD(h*.17);tw=c.measureText(sub).width;if(tw>w*.86)c.font=FD(h*.17*w*.86/tw);c.fillText(sub,w/2,h*(o.hazard?.66:.72))}
    })};

    /* ---------- util lain ---------- */
    const cutRects=(r,cut)=>{let L=[r];for(const c of cut){const N=[];for(const p of L){
      if(c.x1<=p.x0||c.x0>=p.x1||c.z1<=p.z0||c.z0>=p.z1){N.push(p);continue}
      if(c.z0>p.z0)N.push({x0:p.x0,x1:p.x1,z0:p.z0,z1:c.z0});if(c.z1<p.z1)N.push({x0:p.x0,x1:p.x1,z0:c.z1,z1:p.z1});
      const a=Math.max(p.z0,c.z0),b=Math.min(p.z1,c.z1);if(c.x0>p.x0)N.push({x0:p.x0,x1:c.x0,z0:a,z1:b});if(c.x1<p.x1)N.push({x0:c.x1,x1:p.x1,z0:a,z1:b})}L=N}return L};
    const touches=(a,b)=>!(b.x1<=a.x0||b.x0>=a.x1||b.z1<=a.z0||b.z0>=a.z1);
    const walk=(r,curb)=>{slab(G,PAL.walk,r.x0,r.z0,r.x1,r.z1,0,.09);
      slab(G,PAL.walk2,r.x0,r.z0,r.x1,r.z1,.09,.095);
      const w=.2;if(curb==='x0')slab(G,PAL.curb,r.x0,r.z0,r.x0+w,r.z1,0,.1);if(curb==='x1')slab(G,PAL.curb,r.x1-w,r.z0,r.x1,r.z1,0,.1);
      if(curb==='z0')slab(G,PAL.curb,r.x0,r.z0,r.x1,r.z0+w,0,.1);if(curb==='z1')slab(G,PAL.curb,r.x0,r.z1-w,r.x1,r.z1,0,.1)};

    /* pagar picket */
    const fence=(x0,z0,x1,z1,o)=>{o=o||{};const h=o.h||.95,col=o.col||CREAM,rail=o.rail||col,sp=o.sp||.85,dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz);if(len<.05)return;
      const ux=dx/len,uz=dz/len,n=Math.max(1,Math.round(len/sp));
      for(let i=0;i<=n;i++){const t=i/n*len;box(S,col,x0+ux*t,h/2,z0+uz*t,.1,h,.1)}
      const mx=(x0+x1)/2,mz=(z0+z1)/2,ex=Math.abs(dx)+.1,ez=Math.abs(dz)+.1;
      box(S,rail,mx,h*.78,mz,ex,.08,ez);box(S,rail,mx,h*.3,mz,ex,.08,ez);
      if(o.solid!==false)solid(Math.min(x0,x1)-.1,Math.min(z0,z1)-.1,Math.max(x0,x1)+.1,Math.max(z0,z1)+.1,h,{cam:false})};
    /* tembok komplek */
    const wall=(x0,z0,x1,z1)=>{const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,ex=Math.abs(dx)+.4,ez=Math.abs(dz)+.4;
      box(S,'#f0e6d0',(x0+x1)/2,1.0,(z0+z1)/2,Math.abs(dx)<.01?.4:ex,2.0,Math.abs(dz)<.01?.4:ez);
      box(S,'#b9a77f',(x0+x1)/2,2.07,(z0+z1)/2,Math.abs(dx)<.01?.56:ex+.1,.14,Math.abs(dz)<.01?.56:ez+.1);
      const n=Math.max(1,Math.round(len/7));for(let i=0;i<=n;i++){const t=i/n*len;box(S,'#e4d6b8',x0+ux*t,1.15,z0+uz*t,.62,2.3,.62);box(S,INK,x0+ux*t,2.34,z0+uz*t,.7,.1,.7)}
      solid(Math.min(x0,x1)-.3,Math.min(z0,z1)-.3,Math.max(x0,x1)+.3,Math.max(z0,z1)+.3,2.3,{cam:false})};

    /* tanaman & properti jalan */
    const tree=(x,z,s,kind,seed,noSolid)=>{
      s=s||1;const lc=PAL.leaf,c1=lc[Math.floor(rnd(seed)*4)],c2=lc[Math.floor(rnd(seed+1)*4)];
      if(kind==='pine'){cyl(S,PAL.trunk,x,0,z,.3*s,1.6*s,7);for(let i=0;i<3;i++)cyl(S,i%2?c1:c2,x,(1.1+i*1.15)*s,z,(1.7-i*.4)*s,1.7*s,8,0)}
      else{cyl(S,PAL.trunk,x,0,z,.32*s,2.6*s,8,.75);ball(S,c1,x,3.5*s,z,1.7*s,1.45*s,1.7*s);ball(S,c2,x+.9*s,3.0*s,z+.3*s,1.1*s,1.0*s,1.1*s);ball(S,c1,x-.7*s,3.2*s,z-.6*s,1.15*s,1.05*s,1.15*s)}
      if(!noSolid)solid(x-.3,z-.3,x+.3,z+.3,4,{cam:false})};
    const bush=(x,z,s,seed)=>{s=s||1;ball(S,PAL.leaf[Math.floor(rnd(seed||x*7+z)*4)],x,.45*s,z,.7*s,.5*s,.7*s)};
    const pot=(F,lx,lz,seed)=>{const w=F.W(lx,lz);cyl(S,'#d9773f',w[0],0,w[1],.26,.4,10,.8);ball(S,PAL.leaf[seed%4],w[0],.62,w[1],.34,.3,.34);ball(S,['#ff7aa8','#ffd23f','#ff8a5c'][seed%3],w[0]+.1,.8,w[1]+.05,.1,.1,.1,0);solid(w[0]-.26,w[1]-.26,w[0]+.26,w[1]+.26,.5)};
    const bench=(x,z,yaw)=>{const F=Fr(S,x,z,yaw);F.box(PAL.wood,0,.5,0,1.8,.09,.52);F.box(PAL.wood,0,.82,-.22,1.8,.42,.07);
      F.box(PAL.metal,-.78,.25,0,.09,.5,.46);F.box(PAL.metal,.78,.25,0,.09,.5,.46);F.box(PAL.metal,-.78,.65,-.22,.09,.5,.08);F.box(PAL.metal,.78,.65,-.22,.09,.5,.08);
      F.solid(-.95,-.3,.95,.3,.56);for(const dx of [-.45,.45]){const q=F.W(dx,0);this.seats.push({x:q[0],z:q[1],yaw})}};
    const bin=(x,z)=>{cyl(S,'#4aa86a',x,0,z,.32,.85,10,.9);cyl(S,'#2f7a4a',x,.85,z,.36,.1,10,1);box(S,'#fff8e6',x,.5,z+.33,.2,.2,.02);sol2(x,z,.7,.7,.95,{cam:false})};
    const cone=(x,z)=>{cyl(S,'#ff7a2f',x,0,z,.22,.6,8,.2);cyl(S,'#fff8e6',x,.24,z,.16,.1,8,.7);box(S,'#2b1a0e',x,.02,z,.5,.04,.5);sol2(x,z,.5,.5,.6,{cam:false})};
    const car=(x,z,yaw,col)=>{const F=Fr(S,x,z,yaw);
      F.box(col,0,.68,0,4.1,.72,1.8);F.box(col,-.2,1.28,0,2.3,.62,1.6);F.box('#bfe6f7',-.2,1.3,0,2.34,.44,1.62);F.box(col,-.2,1.62,0,2.2,.1,1.5);
      F.box('#bfe6f7',1.03,1.12,0,.04,.34,1.3);F.box('#ffe9a0',2.03,.78,.55,.05,.18,.34);F.box('#ffe9a0',2.03,.78,-.55,.05,.18,.34);F.box('#d33',-2.03,.78,.55,.05,.14,.3);F.box('#d33',-2.03,.78,-.55,.05,.14,.3);
      for(const a of [-1.3,1.3])for(const b of [-.9,.9])F.part(GEO.cyl(10,1,1),'#23262e',a,.36,b,.38,.26,.38,undefined,Math.PI/2,0);
      F.solid(-2.1,-.95,2.1,.95,1.7)};
    const lamp=(x,z,ax,az,solidOn)=>{
      cyl(S,PAL.metal,x,0,z,.2,.35,8,.7);cyl(S,PAL.metal,x,.3,z,.09,4.9,8,1);
      const tx=x+ax*1.9,tz=z+az*1.9;box(S,PAL.metal,x+ax*.95,5.12,z+az*.95,ax?1.95:.12,.12,az?1.95:.12);box(S,PAL.metal,tx,5.06,tz,ax?.7:.4,.14,az?.7:.4);
      box(LB,PAL.bulb,tx,4.96,tz,ax?.5:.3,.07,az?.5:.3);cyl(PL,'#ffd98a',tx,.055,tz,3.5,.01,14,1);
      solid(x-.15,z-.15,x+.15,z+.15,5.2,{cam:false});this.lamps.push([tx,tz])};

    /* =========================================================
       TANAH & JALAN
       ========================================================= */
    slab(G,PAL.grass,-420,-420,420,420,-.8,0);
    for(let i=0;i<70;i++){const a=rnd(i*3)*Math.PI*2,r=rnd(i*5+1)*150;const x=Math.cos(a)*r*.9,z=-25+Math.sin(a)*r*.9;
      cyl(G,i%2?PAL.grass2:PAL.grass3,x,0,z,5+rnd(i+9)*9,.02,14,1)}
    // bukit & garis pohon di cakrawala
    for(let i=0;i<46;i++){const a=i/46*Math.PI*2+rnd(i)*.1,rx=175+rnd(i+3)*40,x=Math.cos(a)*rx*1.15,z=-30+Math.sin(a)*rx*.95;
      ball(G,['#6fbf62','#5aa857','#7ccb6e'][i%3],x,-3+rnd(i+7)*3,z,26+rnd(i+1)*22,11+rnd(i+2)*12,26+rnd(i+4)*22,1)}
    for(let i=0;i<90;i++){const side=i%4,t=rnd(i*11),a=(t*2-1);let x,z;
      if(side===0){x=a*150;z=-160-rnd(i)*20}else if(side===1){x=a*150;z=112+rnd(i)*20}else if(side===2){x=-125-rnd(i)*25;z=-150+t*265}else{x=125+rnd(i)*25;z=-150+t*265}
      tree(x,z,1.1+rnd(i+2)*.8,i%3?'round':'pine',i,true)}

    for(const r of ROADS){slab(G,PAL.asphalt,r.x0,r.z0,r.x1,r.z1,0,.03)}
    // marka jalan
    const others=id=>ROADS.filter(q=>q.id!==id);
    for(const r of ROADS){
      const horiz=r.paint==='x',cut=others(r.id);
      if(r.inner){ // jalan komplek: garis putus di tengah saja
        const len=r.x1-r.x0;for(let t=2;t<len-1;t+=4){const x0=r.x0+t;slab(G,PAL.line,x0,(r.z0+r.z1)/2-.1,x0+2,(r.z0+r.z1)/2+.1,.03,.045)}continue}
      const end=r.end!==undefined?r.end:(horiz?r.x1:r.z1),start=horiz?r.x0:r.z0,mid=horiz?(r.z0+r.z1)/2:(r.x0+r.x1)/2;
      for(let t=start+3;t<Math.min(end,r.id==='ave'?96:end)-3;t+=6){
        const d=horiz?{x0:t,x1:t+3,z0:mid-.12,z1:mid+.12}:{x0:mid-.12,x1:mid+.12,z0:t,z1:t+3};
        if(cut.some(q=>touches(d,{x0:q.x0-1.5,x1:q.x1+1.5,z0:q.z0-1.5,z1:q.z1+1.5})))continue;
        slab(G,'#ffd23f',d.x0,d.z0,d.x1,d.z1,.03,.045)}
      for(const sd of [-1,1]){ // garis tepi putih
        const e=horiz?{x0:start,x1:end,z0:sd<0?r.z0+.5:r.z1-.64,z1:sd<0?r.z0+.64:r.z1-.5}:{x0:sd<0?r.x0+.5:r.x1-.64,x1:sd<0?r.x0+.64:r.x1-.5,z0:start,z1:Math.min(end,r.id==='ave'?96:end)};
        for(const p of cutRects(e,cut))if(p.x1-p.x0>.05&&p.z1-p.z0>.05)slab(G,'#f4f1ea',p.x0,p.z0,p.x1,p.z1,.03,.042)}
    }
    // zebra cross
    for(const zz of [70,-48])for(let x=-6;x<=6;x+=1.25)slab(G,'#f4f1ea',x-.3,zz-.9,x+.3,zz+.9,.03,.046);
    // trotoar: jalan utama (dipotong persimpangan) & jalan komplek
    for(const r of ROADS.filter(q=>q.walk)){
      for(const sd of [-1,1]){
        const w=sd<0?{x0:r.x0-3,x1:r.x0,z0:-113,z1:97}:{x0:r.x1,x1:r.x1+3,z0:-113,z1:97};
        for(const p of cutRects(w,ROADS.filter(q=>q.id!==r.id&&!q.id.startsWith('r')&&q.x1>w.x0-.1&&q.x0<w.x1+.1)))if(p.z1-p.z0>.05)walk(p,sd<0?'x1':'x0')}}
    for(const c of COMPLEXES){const r=c.street,s=c.s,xa=Math.min(s*10,s*47),xb=Math.max(s*10,s*47);
      walk({x0:xa,x1:xb,z0:r.z0-1.5,z1:r.z0},'z1');walk({x0:xa,x1:xb,z0:r.z1,z1:r.z1+1.5},'z0')}

    /* ---------- lampu jalan ---------- */
    const roadBlock=(x,z)=>ROADS.some(q=>q.id!=='ave'&&!q.id.startsWith('r')&&x>q.x0-4&&x<q.x1+4&&z>q.z0-4&&z<q.z1+4)||(z>74&&z<92);
    for(let z=94,i=0;z>-112;z-=20,i++){
      const zl=z,zr=z-10;
      if(!roadBlock(-10.7,zl))lamp(-10.7,zl,1,0);
      if(!roadBlock(10.7,zr))lamp(10.7,zr,-1,0);
    }
    for(const c of COMPLEXES){const s=c.s;
      for(const [d,sd] of [[17,-1],[32,1],[47,-1]])lamp(s*d,c.zc+sd*4.85,0,-sd);
      lamp(s*48.6,c.zc+6.4,0,-1)}
    for(const [x,z,ax] of [[-18,-60,0],[18,-60,0],[-56,-60,0],[56,-60,0],[-18,-108,0],[18,-108,0],[-56,-108,0],[56,-108,0]]){lamp(x,z+(z===-60?-6.3:-6.3),0,1)}

    /* =========================================================
       GERBANG KOTA NEO, POS SATPAM, PORTAL JALAN
       ========================================================= */
    {const uv=board('arch',1200,240,'SELAMAT DATANG DI KOTA NEO','kota baru · menunggu warga pertama',{size:78,bg:'#fff8e6'});
      for(const sd of [-1,1]){const x=sd*11.3;
        box(S,CREAM,x,3.25,ARCH_Z,1.5,6.5,1.5);box(S,INK,x,.3,ARCH_Z,1.7,.6,1.7);for(const y of [1.6,3.4])box(S,PAL.yellow,x,y,ARCH_Z,1.58,.3,1.58);
        ball(S,PAL.yellow,x,6.95,ARCH_Z,.62,.62,.62);solid(x-.8,ARCH_Z-.8,x+.8,ARCH_Z+.8,6.5);
        for(const dz of [-1.4,1.4]){cyl(S,'#d9773f',x+sd*.4,0,ARCH_Z+dz*1.3,.5,.7,10,.85);ball(S,PAL.leaf[1],x+sd*.4,1.1,ARCH_Z+dz*1.3,.7,.55,.7);solid(x+sd*.4-.5,ARCH_Z+dz*1.3-.5,x+sd*.4+.5,ARCH_Z+dz*1.3+.5,.8,{cam:false})}}
      box(S,'#3a6ea5',0,6.15,ARCH_Z,24.6,2.0,1.3);box(S,INK,0,5.1,ARCH_Z,24.8,.18,1.4);box(S,INK,0,7.2,ARCH_Z,24.8,.16,1.4);
      sign(uv,0,6.15,ARCH_Z+.67,9,1.8,'+z');sign(uv,0,6.15,ARCH_Z-.67,9,1.8,'-z');
      P_.push({kind:'board',id:'arch',x:0,z:ARCH_Z+3.2,r:6.5,label:'Baca papan',title:'KOTA NEO',text:'SELAMAT DATANG DI KOTA NEO — kota baru yang belum ramai. Jalan utama menuju komplek perumahan ada di depanmu.'})}
    { // papan pengumuman proyek (dekat pintu masuk kota)
      const A=Announce.data,pr=A.proyek,pc=Announce.pct();
      const uv=Atlas.add('ann',1024,576,(c,w,h)=>{
        c.fillStyle=CREAM;c.fillRect(0,0,w,h);c.fillStyle=PAL.yellow;c.fillRect(0,0,w,110);c.fillStyle=INK;c.fillRect(0,106,w,10);
        c.lineWidth=14;c.strokeStyle=INK;c.strokeRect(7,7,w-14,h-14);c.textAlign='center';c.textBaseline='middle';
        c.fillStyle=INK;c.font=FD(66);c.fillText('PAPAN PENGUMUMAN',w/2,58);
        c.font=FD(76);c.fillText('PROYEK '+pr.nama.toUpperCase(),w/2,190);
        c.fillStyle='#7a4a2a';c.font=FB(38);c.fillText(pr.sub,w/2,250);
        c.fillStyle='#fff';c.strokeStyle=INK;c.lineWidth=10;rr(c,70,296,w-140,64,32);c.fill();c.stroke();
        if(pc>0){c.fillStyle='#3ea85a';rr(c,76,302,Math.max(40,(w-152)*pc/100),52,26);c.fill()}
        c.fillStyle=INK;c.font=FD(48);c.fillText('Terkumpul '+fmtJuta(pr.terkumpulJuta),w/2,418);
        c.font=FB(40);c.fillStyle='#7a4a2a';c.fillText('dari target '+fmtJuta(pr.targetJuta)+'  ('+pc+'%)',w/2,470);
        c.fillStyle='#c0392b';c.font=FD(40);c.fillText('1 share video = '+fmtJuta(pr.perShareJuta),w/2,528)});
      const bx=-15.7,bz=86;
      for(const dz of [-3.4,3.4])box(S,PAL.wood,bx,2.5,bz+dz,.34,5.0,.34);
      box(S,'#7a4a2a',bx,5.3,bz,.7,.3,8.2);box(S,'#5b3820',bx,5.5,bz,.9,.14,8.5);
      box(S,CREAM,bx,3.0,bz,.2,3.85,6.9);
      sign(uv,bx+.11,3.0,bz,6.6,3.71,'+x');
      solid(bx-.3,bz-3.6,bx+.3,bz+3.6,5.4);
      P_.push({kind:'ann',x:-12.6,z:bz,r:5.5,label:'Baca pengumuman'})}
    { // pos satpam
      const bx=14,bz=76.5,uv=board('pos',384,128,'POS JAGA',null,{size:70});
      box(S,'#ffeaa6',bx,1.45,bz,3.2,2.6,3.0);box(S,'#2b3a55',bx,2.95,bz,3.8,.28,3.6);box(S,'#3a6ea5',bx,3.2,bz,3.2,.3,3.0);
      box(S,INK,bx-1.62,1.2,bz+.2,.1,2.3,1.1);box(S,'#e3342f',bx-1.67,1.2,bz+.2,.06,2.1,.95);box(S,PAL.glassDark,bx-1.62,1.7,bz-.95,.08,.9,.9);
      box(S,PAL.glass,bx-.3,1.75,bz+1.52,1.3,.9,.08);box(S,INK,bx-.3,1.75,bz+1.49,1.5,1.1,.05);
      sign(uv,bx-1.67,2.5,bz+.2,1.5,.5,'-x');solid(bx-1.65,bz-1.55,bx+1.65,bz+1.55,3.2);
      for(const dz of [-1,1])cone(bx-3,bz+dz*2.2)}
    { // palang jalan belum tersambung + rambu
      const uv=board('blok',640,200,'JALAN BELUM TERSAMBUNG','Kota Neo masih dibangun',{hazard:true,size:48});
      for(const sx of [-4.4,0,4.4]){box(S,'#fff8e6',sx,.55,100,3.9,1.1,.7);box(S,'#e3342f',sx-1.3,.55,100.36,.7,1.1,.02);box(S,'#e3342f',sx,.55,100.36,.7,1.1,.02);box(S,'#e3342f',sx+1.3,.55,100.36,.7,1.1,.02);box(S,'#e3342f',sx-1.3,.55,99.64,.7,1.1,.02);box(S,'#e3342f',sx,.55,99.64,.7,1.1,.02);box(S,'#e3342f',sx+1.3,.55,99.64,.7,1.1,.02);}
      solid(-6.6,99.4,6.6,100.6,1.2,{cam:true});
      for(const sd of [-1,1]){box(S,PAL.metal,sd*8.2,.8,100,.1,1.6,.1);}
      box(S,CREAM,0,2.0,99.55,5.6,1.8,.1);box(S,PAL.metal,-2.6,1,99.55,.12,2,.12);box(S,PAL.metal,2.6,1,99.55,.12,2,.12);sign(uv,0,2.0,99.49,5.4,1.68,'-z');sign(uv,0,2.0,99.61,5.4,1.68,'+z');solid(-2.8,99.3,2.8,99.8,3.4)}
    for(const sx of [-1,1]){ // ujung jalan lingkar: belum tersambung
      const x=sx*68;box(S,'#fff8e6',x,.55,70.5,9.2,1.1,.7);for(let i=-4;i<=4;i+=2)box(S,'#e3342f',x+i*.9,.55,70.88,.8,1.1,.02);solid(x-4.7,70.1,x+4.7,70.9,1.2);
      for(const dx of [-3.4,3.4]){cyl(S,'#ff7a2f',x+dx,0,72,.4,.9,10,.9);cyl(S,'#fff8e6',x+dx,.5,72,.37,.15,10,1);sol2(x+dx,72,.8,.8,.9,{cam:false})}}

    /* =========================================================
       LAHAN KOSONG (episode berikutnya)
       ========================================================= */
    LOTS.forEach((l,li)=>{
      const uv=board('lot_'+l.id,640,240,l.name,l.sub,{hazard:true,size:64});
      slab(G,PAL.dirt,l.x0,l.z0,l.x1,l.z1,0,.04);
      for(let i=0;i<14;i++){const r=1.5+rnd(i+li)*2.2,x=Math.min(l.x1-r-.6,Math.max(l.x0+r+.6,l.x0+4+rnd(li*50+i)*(l.x1-l.x0-8))),z=Math.min(l.z1-r-.6,Math.max(l.z0+r+.6,l.z0+4+rnd(li*50+i+20)*(l.z1-l.z0-8)));cyl(G,PAL.dirt2,x,.04,z,r,.01,10,1)}
      // pagar proyek (tembus pandang)
      const pf=(x0,z0,x1,z1)=>{const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz),n=Math.max(1,Math.round(len/2.6));
        for(let i=0;i<=n;i++){const t=i/n;box(S,'#e3342f',x0+dx*t,.75,z0+dz*t,.16,1.5,.16);box(S,'#fff8e6',x0+dx*t,1.52,z0+dz*t,.2,.08,.2)}
        const ex=Math.abs(dx)+.1,ez=Math.abs(dz)+.1;box(S,'#ff7a2f',(x0+x1)/2,1.15,(z0+z1)/2,ex,.12,ez);box(S,'#fff8e6',(x0+x1)/2,.65,(z0+z1)/2,ex,.12,ez);box(S,'#ff7a2f',(x0+x1)/2,.25,(z0+z1)/2,ex,.1,ez);
        solid(Math.min(x0,x1)-.1,Math.min(z0,z1)-.1,Math.max(x0,x1)+.1,Math.max(z0,z1)+.1,1.5,{cam:false})};
      pf(l.x0,l.z0,l.x1,l.z0);pf(l.x0,l.z1,l.x1,l.z1);pf(l.x0,l.z0,l.x0,l.z1);pf(l.x1,l.z0,l.x1,l.z1);
      // properti di sudut belakang lahan (jauh dari jalan & rute pekerja). SEMUA dijepit agar tetap di dalam pagar.
      const wx=l.x1-l.x0,mg=2.8,dir=(l.face==='-x')?-1:1;
      const inX=(x,r)=>Math.min(l.x1-mg-r,Math.max(l.x0+mg+r,x)),inZ=(z,r)=>Math.min(l.z1-mg-r,Math.max(l.z0+mg+r,z));
      const reg=(kind,x,z,r)=>{(this.lotProps=this.lotProps||[]).push({lot:l.id,kind,x,z,r})};
      const px=(l.face==='+x')?l.x0+8:(l.face==='-x'?l.x1-8:l.x0+10),pz=l.z0+7;
      box(S,'#fff8e6',px,1.3,pz,5.2,2.2,2.6);box(S,'#3a6ea5',px,2.5,pz,5.5,.25,2.9);box(S,PAL.glassDark,px,1.6,pz+1.31,1.4,.8,.05);box(S,'#e3342f',px+1.7,1.0,pz+1.31,.8,1.9,.05);sol2(px,pz,5.4,2.8,2.5);reg('kabin',px,pz,2.8);
      for(let i=0;i<5;i++){ // gundukan tanah: menjauh dari kabin ke arah dalam lahan
        const r=1.5+rnd(i)*1.1,x=inX(px+dir*(6+rnd(li*9+i)*Math.min(14,wx*.3)),r+.3),z=inZ(pz+rnd(li*9+i+5)*3,r+.3);
        ball(S,PAL.dirt2,x,.5,z,r,.9+rnd(i+1)*.5,r);sol2(x,z,r*1.5,r*1.5,.9,{cam:false});reg('tanah',x,z,r)}
      for(let i=0;i<3;i++){const x=inX(px+dir*3,.6),z=inZ(pz+3.6+i*.8,.6);cyl(S,'#9aa3b0',x-1.4*dir+i*.2,.35,z,.38,2.8,10,1);reg('pipa',x-1.4*dir+i*.2,z,.4)}
      for(let i=0;i<4;i++){const x=inX(l.x0+3+i*2.2,.4),z=inZ(l.z0+3,.4);cone(x,z);reg('kerucut',x,z,.3)}

      // papan nama di luar pagar, menghadap jalan
      const f=l.face,off=1.9;let bx,bz;
      if(f==='+x'){bx=l.x1+off;bz=(l.z0+l.z1)/2}else if(f==='-x'){bx=l.x0-off;bz=(l.z0+l.z1)/2}else{bx=(l.x0+l.x1)/2;bz=l.z1+off}
      const along=(f==='+x'||f==='-x')?'z':'x',W_=5.6,H_=2.1,cy=2.1;
      box(S,PAL.metal,bx+(along==='x'?-2.5:0),1.05,bz+(along==='z'?-2.5:0),.2,2.1,.2);box(S,PAL.metal,bx+(along==='x'?2.5:0),1.05,bz+(along==='z'?2.5:0),.2,2.1,.2);
      box(S,CREAM,bx,cy,bz,along==='x'?W_+.15:.18,H_+.15,along==='z'?W_+.15:.18);
      sign(uv,bx+(f==='+x'?.1:f==='-x'?-.1:0),cy,bz+(f==='+z'?.1:0),W_,H_,f);sign(uv,bx-(f==='+x'?.1:f==='-x'?-.1:0),cy,bz-(f==='+z'?.1:0),W_,H_,opp(f));
      if(along==='z')solid(bx-.15,bz-W_/2,bx+.15,bz+W_/2,3.2);else solid(bx-W_/2,bz-.15,bx+W_/2,bz+.15,3.2);
      const fx=f==='+x'?bx+2.4:f==='-x'?bx-2.4:bx,fz=f==='+z'?bz+2.4:bz;
      P_.push({kind:'board',id:l.id,x:fx,z:fz,r:3.6,label:'Baca papan',title:l.name,text:l.text,proyek:true});
    });

    /* =========================================================
       SEKOLAH NEO — 1 kelas, lapangan di depan, kantin di belakang,
       tembok keliling + satu gerbang utama (tidak ada jalan masuk lain)
       ========================================================= */
    {
      const Sc=SCHOOL,gz=Sc.gz,WALL='#fff3d6',BAND='#3a6ea5',ROOF='#c0583e',WL='#c9955c',WD='#8a5a34',T=.28,H=3.3;
      const gb=new Batch({cast:0,recv:0,ao:0,night:1,gmix:1,k:1});R.houseB.push(gb);   // kaca jendela: menyala saat malam
      // ---- tembok keliling + gerbang utama di sisi timur (menghadap jalan utama) ----
      wall(Sc.x0,Sc.z0,Sc.x1,Sc.z0);wall(Sc.x0,Sc.z1,Sc.x1,Sc.z1);wall(Sc.x0,Sc.z0,Sc.x0,Sc.z1);
      wall(Sc.x1,Sc.z0,Sc.x1,gz-3.6);wall(Sc.x1,gz+3.6,Sc.x1,Sc.z1);
      {const uv=board('sch_gate',640,170,'SEKOLAH NEO','Kelas 1 · Lapangan · Kantin',{size:92});
       for(const sd of [-1,1]){const z=gz+sd*3.4;box(S,CREAM,Sc.x1,2.15,z,1.3,4.3,1.3);box(S,INK,Sc.x1,.25,z,1.45,.5,1.45);box(S,PAL.yellow,Sc.x1,3.3,z,1.38,.26,1.38);ball(S,PAL.yellow,Sc.x1,4.6,z,.5,.5,.5);solid(Sc.x1-.7,z-.7,Sc.x1+.7,z+.7,4.4)}
       box(S,BAND,Sc.x1,4.35,gz,1.3,1.0,8.6);box(S,INK,Sc.x1,4.9,gz,1.4,.12,8.8);box(S,INK,Sc.x1,3.82,gz,1.4,.12,8.8);
       sign(uv,Sc.x1+.67,4.35,gz,6.4,1.7,'+x');sign(uv,Sc.x1-.67,4.35,gz,6.4,1.7,'-x');
       for(const sd of [-1,1]){cyl(S,'#d9773f',Sc.x1+1.4,0,gz+sd*4.6,.5,.7,10,.85);ball(S,PAL.leaf[2],Sc.x1+1.4,1.1,gz+sd*4.6,.7,.55,.7);sol2(Sc.x1+1.4,gz+sd*4.6,1,1,.8,{cam:false})}
       slab(G,PAL.walk,Sc.x1-.3,gz-3,-9.8,gz+3,0,.05);
       P_.push({kind:'board',id:'sch_gate',x:-10.8,z:gz,r:4.2,label:'Baca papan nama',title:'SEKOLAH NEO',text:'Sekolah Neo: SD, SMP, dan SMA satu atap. Tahap 1 sudah dibuka: satu kelas, lapangan, dan kantin. Tahap berikutnya dibangun bertahap sesuai dana dari share.',noQuest:true})}

      // ---- lapangan basket di depan sekolah ----
      const fx0=-36.9,fx1=-16.5,fz0=-45,fz1=-13,ln=(x0,z0,x1,z1)=>slab(G,'#f4f1ea',x0,z0,x1,z1,.07,.085);
      slab(G,'#d9ccb2',fx0,fz0,fx1,fz1,0,.05);slab(G,'#5c9d79',-34.5,-43,-19.5,-15,.05,.07);
      ln(-34.5,-43,-19.5,-42.88);ln(-34.5,-15.12,-19.5,-15);ln(-34.5,-43,-34.38,-15);ln(-19.62,-43,-19.5,-15);
      ln(-29.5,-43,-29.38,-39);ln(-24.62,-43,-24.5,-39);ln(-29.5,-39.12,-24.5,-39);
      ln(-29.5,-19,-29.38,-15);ln(-24.62,-19,-24.5,-15);ln(-29.5,-19.12,-24.5,-19);
      cyl(G,'#f4f1ea',-27,.07,-29,1.95,.015,24,1);cyl(G,'#5c9d79',-27,.085,-29,1.8,.015,24,1);slab(G,'#f4f1ea',-34.5,-29.06,-19.5,-28.94,.1,.115);
      for(const [hz,dz] of [[-43.7,1],[-14.3,-1]]){
        cyl(S,PAL.metal,-27,0,hz,.09,3.1,8,1);box(S,INK,-27,3.25,hz+dz*.1,1.9,1.15,.05);box(S,'#fff8e6',-27,3.25,hz+dz*.14,1.8,1.05,.06);
        cyl(S,'#ff7a2f',-27,2.85,hz+dz*.62,.24,.04,16,1);sol2(-27,hz,.4,.4,3.1,{cam:false})}
      cyl(S,PAL.metal,-37,0,-17,.08,7,8,1);box(S,'#e3342f',-37,6.65,-17.85,.05,.5,1.5);box(S,'#fff8e6',-37,6.15,-17.85,.05,.5,1.5);sol2(-37,-17,.3,.3,7,{cam:false}); // tiang bendera
      bench(-16.9,-39,-Math.PI/2);bench(-16.9,-19,-Math.PI/2);bin(-16.6,-12.4);bin(-38.4,-35.4);
      for(const [x,z,k] of [[-17,-47.5,1],[-40.5,-47.5,2],[-57,-47.5,3],[-17,-10.6,4],[-40.5,-10.6,5],[-57,-10.6,6],[-60.2,-41,7]])tree(x,z,.95+rnd(k)*.3,'round',k+300);
      for(const z of [-35.6,-22.4]){bush(-38.3,z,1.1,z);bush(-38.9,z+(z<-30?-.8:.8),.9,z+1)}

      // ---- gedung kelas 1 (bisa dimasuki) ----
      const bx0=-46.8,bx1=-39.6,bz0=-33.8,bz1=-24.2,rc=-42.5,ry=x=>3.4+2.5*(1-Math.abs(x-rc)/5.3);
      slab(G,'#e9e0c9',bx0,bz0,bx1,bz1,0,.1);for(let z=bz0+1.2;z<bz1;z+=2.4)slab(G,'#dccfb0',bx0,z,bx1,z+.06,.1,.105);
      const wallO=(axis,c,a0,a1,ops,col)=>{
        const seg=(s,e,y0,y1)=>{if(e-s<.01||y1-y0<.01)return;axis==='x'?slab(S,col,s,c-T/2,e,c+T/2,y0,y1):slab(S,col,c-T/2,s,c+T/2,e,y0,y1)};
        const sorted=ops.slice().sort((p,q)=>p.a-q.a);let cur=a0;
        for(const o of sorted){seg(cur,o.a,0,H);seg(o.a,o.b,0,o.y0);seg(o.a,o.b,o.y1,H);cur=o.b}seg(cur,a1,0,H);
        for(const o of sorted)if(o.glass){const mid=(o.a+o.b)/2,w2=o.b-o.a,h=o.y1-o.y0,cy=(o.y0+o.y1)/2;
          if(axis==='x'){box(gb,PAL.glass,mid,cy,c,w2,h,.06);box(S,INK,mid,cy,c,.06,h,.1);box(S,INK,mid,cy,c,w2,.06,.1);box(S,INK,mid,o.y1+.05,c,w2+.14,.1,.36);box(S,'#fff8e6',mid,o.y0-.05,c,w2+.24,.1,.42)}
          else{box(gb,PAL.glass,c,cy,mid,.06,h,w2);box(S,INK,c,cy,mid,.1,h,.06);box(S,INK,c,cy,mid,.1,.06,w2);box(S,INK,c,o.y1+.05,mid,.36,.1,w2+.14);box(S,'#fff8e6',c,o.y0-.05,mid,.42,.1,w2+.24)}}
        const sc=(s,e)=>{if(e-s<.02)return;axis==='x'?solid(s,c-T/2-.05,e,c+T/2+.05,H):solid(c-T/2-.05,s,c+T/2+.05,e,H)};
        let c0=a0;for(const o of sorted){if(o.y0===0&&!o.glass){sc(c0,o.a);c0=o.b}}sc(c0,a1)};
      const winX=[{a:-45.95,b:-44.65,y0:1,y1:2.3,glass:1},{a:-43.85,b:-42.55,y0:1,y1:2.3,glass:1},{a:-41.75,b:-40.45,y0:1,y1:2.3,glass:1}];
      wallO('z',bx1,bz0,bz1,[{a:gz-.9,b:gz+.9,y0:0,y1:2.4},{a:-32.9,b:-31.3,y0:1,y1:2.3,glass:1},{a:-26.9,b:-25.3,y0:1,y1:2.3,glass:1}],WALL);
      wallO('x',bz0,bx0,bx1,winX,WALL);wallO('x',bz1,bx0,bx1,winX,WALL);wallO('z',bx0,bz0,bz1,[],WALL);
      box(S,BAND,bx1+.17,.28,bz0+2.5,.06,.56,5.0);box(S,BAND,bx1+.17,.28,bz1-2.5,.06,.56,5.0);   // lis biru bawah (depan)
      box(S,INK,bx1,2.45,gz,.36,.1,2.0);box(S,INK,bx1,1.2,gz-.95,.3,2.4,.08);box(S,INK,bx1,1.2,gz+.95,.3,2.4,.08);   // kusen pintu (pintu terbuka)
      for(const zz of [bz0,bz1]){const A=[bx0,H,zz],B=[bx1,H,zz],C=[bx1,ry(bx1),zz],D=[rc,5.9,zz],E=[bx0,ry(bx0),zz];S.tri(A,B,C,WALL);S.tri(A,C,D,WALL);S.tri(A,D,E,WALL)}
      {const uv=board('sch_k1',256,80,'KELAS 1',null,{size:50});sign(uv,bx1+.2,2.85,gz,1.7,.54,'+x')}
      // teras depan + tiang
      slab(G,'#d9ccb2',bx1,bz0,-37.4,bz1,0,.1);slab(G,'#cdbfa3',-37.4,bz0+1,-36.9,bz1-1,0,.06);
      for(const z of [bz0+.3,gz-2.4,gz+2.4,bz1-.3]){cyl(S,CREAM,-37.7,.1,z,.14,3.2,8,1);sol2(-37.7,z,.34,.34,3.3,{cam:false})}
      // atap (digambar dinamis: menghilang saat pemain di dalam kelas agar interior terlihat)
      this.roofs.push({rect:{x0:bx0-.2,x1:bx1+.2,z0:bz0-.2,z1:bz1+.2},parts:[
        {mesh:GEO.gable,col:ROOF,M:M4.trs([rc,3.4,gz],[0,Math.PI/2,0],[10.8,2.5,10.6])},
        {mesh:GEO.box,col:'#fff8e6',M:M4.trs([rc,3.35,gz],[0,0,0],[10.6,.14,10.8])}]});
      // papan tulis (hijau + kapur) di dinding belakang kelas
      {const uvB=Atlas.add('papan_tulis',640,240,(c,w2,h)=>{c.fillStyle='#2f5d46';c.fillRect(0,0,w2,h);c.fillStyle='rgba(255,255,255,.07)';c.fillRect(18,18,w2-36,h-36);
          c.fillStyle='#f4f1ea';c.textAlign='center';c.textBaseline='middle';c.font=FD(58);c.fillText('Selamat datang!',w2/2,62);c.font=FB(40);c.fillText('Sekolah Neo — Kelas 1',w2/2,122);
          c.font=FD(46);c.fillText('1 + 1 = 2',w2*.26,192);c.fillText('A B C',w2*.74,192);c.strokeStyle='#f4f1ea';c.lineWidth=5;c.beginPath();c.moveTo(w2*.46,178);c.quadraticCurveTo(w2*.5,150,w2*.54,178);c.stroke()});
       box(S,WD,bx0+.2,1.95,gz,.12,1.6,5.7);sign(uvB,bx0+.27,1.95,gz,5.4,1.36,'+x');box(S,WL,bx0+.3,1.1,gz,.2,.06,5.4);
       P_.push({kind:'board',id:'papan_tulis',x:-44.3,z:gz,r:3.3,label:'Baca papan tulis',title:'Papan Tulis',text:'Selamat datang di Sekolah Neo, Kelas 1! Duduklah di bangku mana saja. Kelas SD, SMP, dan SMA lainnya akan dibangun bertahap sesuai dana dari share.',noQuest:true})}
      // meja & kursi
      const chair=(x,z,yaw,col)=>{const F=Fr(S,x,z,yaw);F.box(col,0,.46,0,.44,.05,.44);F.box(col,0,.74,-.2,.44,.46,.05);
        for(const a of [-.18,.18])for(const b2 of [-.18,.18])F.box(PAL.metal,a,.22,b2,.04,.44,.04);F.solid(-.22,-.22,.22,.22,.5,{cam:false});this.seats.push({x,z,yaw})};
      const desk=(x,z)=>{box(S,WL,x,.74,z,.5,.05,1.1);for(const a of [-.2,.2])for(const b2 of [-.5,.5])box(S,WD,x+a,.37,z+b2,.04,.72,.04);sol2(x,z,.56,1.16,.78,{cam:false})};
      box(S,WD,-45.4,.76,gz,.7,.06,1.7);box(S,WD,-45.4,.38,gz-.78,.64,.74,.06);box(S,WD,-45.4,.38,gz+.78,.64,.74,.06);sol2(-45.4,gz,.7,1.8,.8,{cam:false});
      chair(-46.22,gz,Math.PI/2,'#e3342f');                                           // kursi guru (menghadap murid)
      for(const dx of [-43.4,-42.1,-40.8])for(const zz of [-32.8,-31.6,-30.4,-27.6,-26.4,-25.2]){desk(dx,zz);chair(dx+.58,zz,-Math.PI/2,'#3a6ea5')}   // 18 meja + kursi murid
      box(S,'#fff8e6',bx0+.3,2.7,bz0+.4,.05,.5,.5);                                       // jam dinding (kotak)
      // ---- kantin sederhana di belakang sekolah ----
      const kx0=-61,kx1=-49.8,kz0=-37.8,kz1=-21.8;
      slab(G,'#d9ccb2',kx0,kz0,kx1,kz1,0,.06);
      box(S,'#ffe9a0',(kx0+kx1)/2,1.55,-37.45,kx1-kx0,3.1,.24);solid(kx0,-37.6,kx1,-37.3,3.1);
      box(S,WD,-55.4,.5,-35.2,8.6,1.0,.9);box(S,WL,-55.4,1.04,-35.2,8.9,.08,1.1);solid(-59.8,-35.65,-51,-34.75,1.1,{cam:false});
      for(let i=0;i<7;i++)box(S,['#e3342f','#ffd23f','#3ea85a','#6cc3f5','#ff8a5c','#c79bf2','#fff8e6'][i],-59.2+i*1.15,1.24,-35.1,.5,.32,.3);
      box(S,'#cfe8f3',-60.2,1.0,-36.4,.9,2.0,.7);sol2(-60.2,-36.4,.9,.7,2,{cam:false});box(S,WD,-55.4,1.95,-37.15,6,.08,.3);
      for(let i=0;i<6;i++)box(S,['#ffd23f','#e3342f','#3ea85a','#fff8e6','#6cc3f5','#ff8a5c'][i],-57.6+i*.9,2.15,-37.15,.4,.3,.22);
      {const uv=board('sch_kantin',384,120,'KANTIN',null,{size:84});sign(uv,-55.4,2.62,-37.3,3.0,.94,'+z')}
      P_.push({kind:'board',id:'kantin_menu',x:-55.4,z:-33.7,r:3.2,label:'Baca menu kantin',title:'Menu Kantin',text:'Nasi goreng · Mie ayam · Es teh · Gorengan. Belum bisa dibeli: sistem uang dan pekerjaan hadir di episode berikutnya.',noQuest:true});
      for(const [x,z] of [[-60.6,-22.3],[-55.4,-22.3],[-50.2,-22.3],[-60.6,-29.5],[-50.2,-29.5]]){cyl(S,CREAM,x,0,z,.13,3.15,8,1);sol2(x,z,.3,.3,3.2,{cam:false})}
      const longTable=(x,z)=>{box(S,WL,x,.76,z,3.4,.06,.85);for(const a of [-1.55,1.55])for(const b2 of [-.34,.34])box(S,WD,x+a,.37,z+b2,.08,.74,.08);sol2(x,z,3.5,.9,.8,{cam:false});
        let i=0;for(const sx of [-1.1,0,1.1])for(const sd of [-1,1])chair(x+sx,z+sd*.78,sd<0?0:Math.PI,['#e8892b','#3ea85a','#e3342f','#6cc3f5'][(i++)%4])};
      longTable(-57.3,-31.4);longTable(-53.4,-31.4);longTable(-57.3,-27.6);longTable(-53.4,-27.6);
      this.roofs.push({rect:{x0:kx0,x1:kx1,z0:kz0,z1:kz1},parts:[{mesh:GEO.box,col:BAND,M:M4.trs([-55.4,3.25,-29.8],[0,0,0],[12.4,.25,16.8])},{mesh:GEO.box,col:'#fff8e6',M:M4.trs([-55.4,3.08,-29.8],[0,0,0],[12.6,.1,17])}]});
      bin(-49.2,-23.2);bin(-61.5,-24);
    }

    /* =========================================================
       KOMPLEK PERUMAHAN A–C
       ========================================================= */
    const plateUV=id=>Atlas.add('no_'+id,192,96,(c,w,h)=>{c.fillStyle=CREAM;c.fillRect(0,0,w,h);c.lineWidth=8;c.strokeStyle=INK;rr(c,4,4,w-8,h-8,16);c.stroke();c.fillStyle=INK;c.font=FD(66);c.textAlign='center';c.textBaseline='middle';c.fillText(id,w/2,h/2+4)});
    const house=h=>{
      const F=Fr(S,h.cx,h.cz,h.yaw),st=h.style,wall=PAL.wall[st.wall],roof=PAL.roof[st.roof];
      const gb=new Batch({cast:0,recv:0,ao:0,night:1,gmix:1,k:h.lit?1:0});h.gb=gb;R.houseB.push(gb);
      const gl=PAL.glass;
      F.box('#cdbfa3',0,.18,0,9.4,.36,8.4);
      let top=5.7;
      if(st.type==='gable'){
        F.box(wall,0,1.86,0,9,3.0,8);F.box(CREAM,0,3.42,0,10,.14,9.2);F.part(GEO.gable,roof,0,3.49,0,10.2,2.2,9.4);
        for(const sx of [-4.5,4.5]){const A=[sx,3.36,-4],B=[sx,3.36,4],C=[sx,3.82,4],D=[sx,5.69,0],E=[sx,3.82,-4];F.tri(wall,A,B,C);F.tri(wall,A,C,D);F.tri(wall,A,D,E)}
        if(h.n%2)F.box('#b8493d',-2.6,5.3,-1.5,.9,2.4,.9);
      }else if(st.type==='hip'){
        F.box(wall,0,1.86,0,9,3.0,8);F.box(CREAM,0,3.42,0,10,.14,9.2);F.part(GEO.hip,roof,0,3.49,0,10.2,2.0,9.4);top=5.5;
      }else{
        const w2=PAL.wall[(st.wall+2)%6];top=6.4;
        F.box(wall,0,1.81,0,9,2.9,8);F.box(roof,0,3.33,0,9.6,.16,8.6);F.box(w2,-1.4,4.75,-.4,6.2,2.7,7.0);F.box(roof,-1.4,6.2,-.4,6.8,.2,7.6);
        F.box(INK,-1.4,4.8,3.13,4.6,1.5,.08);F.box(gl,-1.4,4.8,3.19,4.3,1.25,.08,gb);F.box(INK,-1.4,4.8,3.24,.08,1.25,.06);F.box(INK,-.3,4.8,3.24,.08,1.25,.06);F.box(INK,-2.5,4.8,3.24,.08,1.25,.06);
        F.box(PAL.wood,3.7,1.86,4.03,.9,3.0,.1);F.box(PAL.wood,-4.55,4.7,-.4,.1,2.5,5.5);
        F.box(INK,-4.6,4.8,-.4,.08,1.3,3.6);F.box(gl,-4.64,4.8,-.4,.06,1.1,3.4,gb);
      }
      // pintu (daun pintu digambar dinamis, rangka di sini)
      F.box(INK,1.6,1.46,4.04,1.3,2.2,.16);
      // jendela
      F.box(INK,-2.3,2.1,4.03,2.4,1.6,.12);F.box(gl,-2.3,2.1,4.09,2.1,1.3,.08,gb);F.box(INK,-2.3,2.1,4.14,.08,1.3,.06);F.box(INK,-2.3,2.1,4.14,2.1,.08,.06);F.box(CREAM,-2.3,1.25,4.14,2.6,.1,.3);
      F.box(INK,3.8,2.1,4.03,1.2,1.2,.12);F.box(gl,3.8,2.1,4.09,.95,.95,.08,gb);F.box(INK,3.8,2.1,4.14,.07,.95,.06);
      for(const sx of [-1,1]){F.box(INK,sx*4.5,2.1,0,.12,1.5,1.9);F.box(gl,sx*4.54,2.1,0,.08,1.2,1.6,gb);F.box(INK,sx*4.58,2.1,0,.05,1.2,.07)}
      // teras
      F.box('#e4d6b8',1.6,.1,4.9,3.2,.2,1.8);F.box(roof,1.6,2.85,4.95,3.5,.16,2.1);F.box(CREAM,1.6,2.74,4.95,3.2,.06,1.9);
      F.cyl(CREAM,.2,.2,5.75,.09,2.65,8);F.cyl(CREAM,3.0,.2,5.75,.09,2.65,8);F.solid(.08,5.63,.32,5.87,2.8,{cam:false});F.solid(2.88,5.63,3.12,5.87,2.8,{cam:false});
      F.box(INK,3.0,2.3,4.08,.2,.3,.1);F.box(PAL.bulb,3.0,2.12,4.16,.16,.16,.12,gb);
      F.quad(plateUV(h.id),-.1,2.55,4.02,.85,.44);
      // jalan setapak, rumput depan, pot
      F.box('#a6d98a',0,.02,6.2,14.6,.04,4.0,G);
      for(let i=0;i<5;i++)F.box(i%2?PAL.walk2:PAL.walk,1.6,.035,6.1+i*.66,1.5,.07,.58,G);
      pot(F,-.5,4.6,h.n);pot(F,3.75,4.7,h.n+1);bush(...F.W(-5.8,5.5),1.1,h.n);bush(...F.W(5.8,5.5),1.1,h.n+2);bush(...F.W(-6.2,-2),1.3,h.n+3);
      // pagar depan + pilar gerbang
      const e0=F.W(-7.5,8.2),g0=F.W(.75,8.2),g1=F.W(2.45,8.2),e1=F.W(7.5,8.2);
      fence(e0[0],e0[1],g0[0],g0[1]);fence(g1[0],g1[1],e1[0],e1[1]);
      for(const lx of [.75,2.45]){F.box(CREAM,lx,.7,8.2,.34,1.4,.34);F.box(INK,lx,1.44,8.2,.44,.08,.44);F.solid(lx-.17,8.03,lx+.17,8.37,1.45,{cam:false})}
      F.box(PAL.wood,3.7,.55,8.65,.1,1.1,.1);F.box(CREAM,3.7,1.15,8.64,1.0,.5,.07);F.quad(plateUV(h.id),3.7,1.15,8.69,.9,.45);
      // collision badan rumah
      F.solid(-4.6,-4.1,4.6,4.1,7);
      h.top=top;h.dd={hinge:F.W(1.12,4.12),yaw:h.yaw,open:0};
      P_.push({kind:'house',house:h,x:h.spot[0],z:h.spot[1],r:3.2});
    };
    for(const c of COMPLEXES){
      const s=c.s,zc=c.zc,X=a=>s*a;
      // tembok keliling
      wall(X(CX.gate),zc-20.5,X(CX.wallEnd),zc-20.5);wall(X(CX.gate),zc+20.5,X(CX.wallEnd),zc+20.5);wall(X(CX.wallEnd),zc-20.5,X(CX.wallEnd),zc+20.5);
      wall(X(CX.gate),zc-20.5,X(CX.gate),zc-6.4);wall(X(CX.gate),zc+6.4,X(CX.gate),zc+20.5);
      // gerbang komplek
      {const uv=board('gate'+c.id,640,160,'KOMPLEK '+c.id,null,{size:100});const gx=X(12);
        for(const sd of [-1,1]){const z=zc+sd*5.6;box(S,CREAM,gx,2.4,z,1.2,4.8,1.2);box(S,INK,gx,.25,z,1.35,.5,1.35);box(S,PAL.yellow,gx,3.4,z,1.28,.26,1.28);ball(S,PAL.yellow,gx,5.1,z,.5,.5,.5);solid(gx-.65,z-.65,gx+.65,z+.65,4.8)}
        box(S,'#3ea85a',gx,4.8,zc,1.3,1.9,12.4);box(S,INK,gx,5.78,zc,1.4,.14,12.6);box(S,INK,gx,3.82,zc,1.4,.14,12.6);
        const fa=s>0?'-x':'+x';sign(uv,gx+(s>0?-.67:.67),4.8,zc,6.8,1.7,fa);sign(uv,gx+(s>0?.67:-.67),4.8,zc,6.8,1.7,opp(fa));
        for(const sd of [-1,1]){cyl(S,'#d9773f',gx,0,zc+sd*7.6,.5,.7,10,.85);ball(S,PAL.leaf[2],gx,1.1,zc+sd*7.6,.7,.55,.7);}
        P_.push({kind:'board',id:'gate'+c.id,x:X(14),z:zc,r:4,label:'Baca papan',title:'KOMPLEK '+c.id,text:'Selamat datang di Komplek '+c.id+' — 4 rumah, 1 taman kecil, dan banyak ruang kosong.',noQuest:true})}
      // ujung jalan: bollard
      for(const sd of [-1,1]){cyl(S,'#ffd23f',X(46.8),0,zc+sd*2.2,.14,.8,8,1);sol2(X(46.8),zc+sd*2.2,.3,.3,.8,{cam:false})}
      // rumah + pagar sisi
      for(const h of HOUSES.filter(q=>q.c===c.id))house(h);
      for(const sd of [-1,1])for(const d of [17,32,47])fence(X(d),zc+sd*CX.front,X(d),zc+sd*20.5);
      // taman kecil di ujung jalan
      {const tx=X(53);
       slab(G,PAL.grass3,Math.min(X(47.2),X(59)),zc-19.8,Math.max(X(47.2),X(59)),zc+19.8,0,.03);
       cyl(G,PAL.curb,tx,.03,zc,4.4,.05,22,1);cyl(G,PAL.walk,tx,.08,zc,3.9,.04,22,1);
       slab(G,PAL.walk,Math.min(X(47),X(49.4)),zc-1,Math.max(X(47),X(49.4)),zc+1,0,.07);
       cyl(S,PAL.curb,tx,0,zc,1.25,.5,14,1);cyl(G,'#7a4a2a',tx,.5,zc,1.1,.04,14,1);
       for(let i=0;i<7;i++){const a=i/7*Math.PI*2;ball(S,['#ff7aa8','#ffd23f','#ff8a5c','#c79bf2'][i%4],tx+Math.cos(a)*.65,.78,zc+Math.sin(a)*.65,.2,.2,.2,0)}
       ball(S,PAL.leaf[2],tx,.75,zc,.5,.35,.5);sol2(tx,zc,2.5,2.5,.5);
       for(const dz of [-7.6,7.6])for(const dx of [-2.6,2.6])bench(tx+dx,zc+dz,dz<0?0:Math.PI);
       for(const [a,b,k] of [[50,-16],[56,-17],[50,16],[56,16.5],[57.5,-8],[57.5,8]])tree(X(a),zc+b,.9+rnd(c.zc+a)*.3,'round',a+b);
       for(let i=0;i<6;i++){const z=zc-17+i*6.8;for(let j=0;j<3;j++)ball(S,['#ff7aa8','#ffd23f','#ff8a5c','#fff8e6'][(i+j)%4],X(58.3),.3,z+j*.5,.22,.18,.22,0)}
       bin(X(48.4),zc+11.5);lamp(tx,zc-9.5,0,1);
       const uv=board('taman'+c.id,384,120,'TAMAN '+c.id,null,{size:72});
       box(S,PAL.wood,X(48.4),.7,zc-6,.12,1.4,.12);box(S,CREAM,X(48.4),1.5,zc-6,.14,.7,1.5);sign(uv,X(48.4)-s*.09,1.5,zc-6,1.5,.47,s>0?'-x':'+x');
       sol2(X(48.4),zc-6,.3,1.6,1.9,{cam:false});
      }
      // mobil terparkir
      car(X(c.id==='A'?28:c.id==='B'?26:30),zc+(c.id==='B'||c.id==='C'?-1.9:1.9),0,c.id==='A'?'#e3342f':c.id==='B'?'#3a6ea5':'#ffd23f');
      bin(X(13.5),zc+4.9);
      this.stats[c.id]={houses:4};
    }

    /* =========================================================
       POHON & SEMAK ACAK DI RUANG BEBAS
       ========================================================= */
    const nogo=[];
    for(const r of ROADS)nogo.push({x0:r.x0-(r.id==='ave'?6.5:5),x1:r.x1+(r.id==='ave'?6.5:5),z0:r.z0-5,z1:Math.min(r.z1,r.end!==undefined?r.end:r.z1)+5});
    for(const c of COMPLEXES)nogo.push({x0:c.rect.x0-3,x1:c.rect.x1+3,z0:c.rect.z0-3,z1:c.rect.z1+3});
    for(const l of LOTS)nogo.push({x0:l.x0-7,x1:l.x1+7,z0:l.z0-7,z1:l.z1+7});
    nogo.push({x0:SCHOOL.x0-4,x1:SCHOOL.x1+9,z0:SCHOOL.z0-4,z1:SCHOOL.z1+4});
    nogo.push({x0:-22,x1:26,z0:66,z1:102});
    const placed=[];let tries=0,n=0;
    while(n<150&&tries++<4000){const x=BOUNDS.x0+4+rnd(tries*3.1)*(BOUNDS.x1-BOUNDS.x0-8),z=BOUNDS.z0+4+rnd(tries*5.3+1)*(BOUNDS.z1-BOUNDS.z0-10);
      if(nogo.some(r=>x>r.x0&&x<r.x1&&z>r.z0&&z<r.z1))continue;if(placed.some(p=>Math.hypot(p[0]-x,p[1]-z)<5.5))continue;
      placed.push([x,z]);tree(x,z,.9+rnd(tries)*.6,rnd(tries+4)>.7?'pine':'round',tries);n++;
      if(rnd(tries+8)>.5)bush(x+2.2,z+1.3,1,tries)}
    // bangku & tempat sampah di tepi jalan utama
    for(const [x,z] of [[-11.6,60],[11.6,24],[-11.6,10],[11.6,-30],[-11.6,-45],[11.6,76]]){bench(x,z,x<0?Math.PI/2:-Math.PI/2);}
    for(const [x,z] of [[-11.4,66],[11.4,30],[-11.4,2],[11.4,-36]])bin(x,z);
    for(const [x,z] of [[-5,90],[5,90]]){bush(x*1.7,z+3,1.3)}

    /* =========================================================
       BINTANG, awan
       ========================================================= */
    for(let i=0;i<170;i++){const a=rnd(i*2)*Math.PI*2,e=.12+rnd(i*3+1)*1.4,r=330,x=Math.cos(a)*Math.cos(e)*r,y=Math.sin(e)*r,z=Math.sin(a)*Math.cos(e)*r;
      ball(ST,i%5?'#ffffff':'#ffe9a0',x,y,z,1.1+rnd(i)*1.2,1.1+rnd(i)*1.2,1.1+rnd(i)*1.2,0)}
    this.clouds=[];for(let i=0;i<9;i++)this.clouds.push({x:-210+rnd(i)*420,y:75+rnd(i+3)*30,z:-230+rnd(i+6)*430,s:.8+rnd(i+9)*.8,r:rnd(i+12)});
    this.stats.verts=0;
  },

  /* rumah milik pemain */
  setOwn(id){
    if(this.own&&this.own.gb)this.own.gb.o.k=this.own.lit?1:0;
    this.own=HOUSE_BY_ID[id]||null;
    if(this.own&&this.own.gb)this.own.gb.o.k=1;
  },
  /* objek dinamis: pintu, penanda rumah, awan, matahari/bulan */
  dynamic(env,t,dt){
    const cam=Cam.eye;
    for(const h of HOUSES){
      const d=Math.hypot(P.x-h.door[0],P.z-h.door[1]);if(d>90)continue;
      const want=(h===this.own&&d<5.5)?1:0;h.dd.open=lerp(h.dd.open,want,Math.min(1,dt*4));
      const a=-h.dd.open*1.55,hg=h.dd.hinge,base=M4.mul(M4.T(hg[0],0,hg[1]),M4.mul(M4.Ry(h.yaw+a),M4.T(.48,1.41,0)));
      R.push(GEO.box,PAL.door[h.style.door],M4.mul(base,M4.S(.96,2.1,.07)));
      R.push(GEO.ico(0),'#ffd23f',M4.mul(base,M4.trs([.36,-.05,.07],[0,0,0],[.07,.07,.07])));
    }
    if(this.own){
      const h=this.own,b=Math.sin(t*3)*.25,x=h.cx,z=h.cz,y=h.top+2.4+b;
      R.push(GEO.cyl(8,0,1),'#ffd23f',M4.trs([x,y,z],[Math.PI,t*1.6,0],[.9,1.6,.9]),{emis:.75,cast:false,recv:false});
      R.push(GEO.ico(1),'#ffd23f',M4.trs([x,y+1.9,z],[0,0,0],[.65,.65,.65]),{emis:.75,cast:false,recv:false});
      if(!this._tag)this._tag=nameTex('RUMAHMU','#ffd23f','#2b1a0e');
      R.push(GEO.plane,[1,1,1],M4.mul(M4.T(x,y+3.2,z),M4.mul(M4.Ry(Cam.yaw),M4.S(this._tag.w*2.2,this._tag.h*2.2,1))),{tex:this._tag.tex,cast:false,recv:false,emis:1,nofog:1});
    }
    // atap sekolah & kantin: hilang saat pemain berada di bawahnya (interior terlihat)
    for(const g of this.roofs){const r=g.rect;if(P.x>r.x0&&P.x<r.x1&&P.z>r.z0&&P.z<r.z1)continue;for(const q of g.parts)R.push(q.mesh,q.col,q.M)}
    // matahari / bulan
    const v=env.visDir,e=Cam.eye;
    R.push(GEO.ico(1),env.moon?'#eef2ff':'#fff2a8',M4.trs([e[0]+v[0]*360,e[1]+v[1]*360,e[2]+v[2]*360],[0,0,0],[env.moon?16:22,env.moon?16:22,env.moon?16:22]),{emis:1,cast:false,recv:false,nofog:1});
    // awan
    const dayK=1-env.night,cc=mixc([.5,.55,.75],[1,1,1],dayK),off=Math.sin(t*.012)*80+t*.8;
    for(const c of this.clouds){const x=((c.x+off+260)%520)-260,z=c.z;
      for(let j=0;j<4;j++)R.push(GEO.ico(1),cc,M4.trs([x+(j-1.5)*9*c.s,c.y+(j%2)*2,z+(j%3)*3],[0,c.r*6,0],[12*c.s,5*c.s,8*c.s]),{emis:.8,cast:false,recv:false,nofog:0})}
  }
};

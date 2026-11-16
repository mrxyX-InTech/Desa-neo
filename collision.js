'use strict';
/* collision.js — collision sederhana: kotak sejajar sumbu vs lingkaran pemain/NPC */
const SOL=[];
const PR=.34,STEP=.42;
function addSolid(x0,z0,x1,z1,h,o){
  const b={x0:Math.min(x0,x1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),z1:Math.max(z0,z1),h,cam:h>2.4,walk:h<=1.15};
  if(o)Object.assign(b,o);SOL.push(b);return b;
}
const _cl=(x,a,b)=>Math.min(b,Math.max(a,x));
/* dorong p keluar dari semua solid; p.y di atas puncak solid = berdiri di atasnya */
function collide(p,r){
  r=r||PR;
  for(const b of SOL){
    if(p.y>=b.h-.05)continue;
    const cx=_cl(p.x,b.x0,b.x1),cz=_cl(p.z,b.z0,b.z1),dx=p.x-cx,dz=p.z-cz,d2=dx*dx+dz*dz;
    if(d2<r*r){
      if(d2>1e-8){const d=Math.sqrt(d2),k=(r-d)/d;p.x+=dx*k;p.z+=dz*k}
      else{const o=[p.x-b.x0,b.x1-p.x,p.z-b.z0,b.z1-p.z],m=Math.min(o[0],o[1],o[2],o[3]);
        if(m===o[0])p.x=b.x0-r;else if(m===o[1])p.x=b.x1+r;else if(m===o[2])p.z=b.z0-r;else p.z=b.z1+r}
    }
  }
  p.x=_cl(p.x,BOUNDS.x0+.6,BOUNDS.x1-.6);p.z=_cl(p.z,BOUNDS.z0+.6,BOUNDS.z1-.6);
}
/* tinggi tanah di (x,z): benda rendah bisa dipijak jika cukup dekat dengan kaki */
function groundAt(x,z,y){
  let g=0;
  for(const b of SOL){if(!b.walk||b.h>y+STEP)continue;
    if(x>b.x0-.05&&x<b.x1+.05&&z>b.z0-.05&&z<b.z1+.05&&b.h>g)g=b.h}
  return g;
}
function hitSolid(x,z,r){for(const b of SOL){const cx=_cl(x,b.x0,b.x1),cz=_cl(z,b.z0,b.z1);if((x-cx)**2+(z-cz)**2<r*r)return b}return null}
/* kamera: titik di dalam bangunan tinggi? */
function camBlocked(x,y,z){for(const b of SOL){if(b.cam&&y<b.h+.3&&x>b.x0-.3&&x<b.x1+.3&&z>b.z0-.3&&z<b.z1+.3)return true}return false}
/* jalur lurus a→b bebas tabrakan? (dipakai untuk memeriksa rute NPC) */
function segClear(ax,az,bx,bz,r){const n=Math.max(2,Math.ceil(Math.hypot(bx-ax,bz-az)/.15));for(let i=0;i<=n;i++){const t=i/n;if(hitSolid(ax+(bx-ax)*t,az+(bz-az)*t,r))return false}return true}

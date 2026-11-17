'use strict';
/* save.js — profil pemain di localStorage (tanpa server, tanpa API TikTok) */
const Save={
  profile:null,
  load(){
    try{const s=localStorage.getItem(GAME.key);if(!s)return null;const p=JSON.parse(s);
      if(!p||!p.username||!p.id||!HOUSE_BY_ID[p.house])return null;
      p.quest=p.quest||{step:0,done:false};this.profile=p;return p}catch(e){return null}
  },
  write(){try{localStorage.setItem(GAME.key,JSON.stringify(this.profile))}catch(e){}},
  makeId(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<8;i++)s+=A[Math.floor(Math.random()*A.length)];return 'NEO-'+s.slice(0,4)+'-'+s.slice(4)},
  checkName(raw){
    let v=String(raw||'').trim().replace(/^@+/,'');
    if(v.length<3)return {ok:false,msg:'Username minimal 3 karakter.'};
    if(v.length>20)return {ok:false,msg:'Username maksimal 20 karakter.'};
    if(!/^[A-Za-z0-9._]+$/.test(v))return {ok:false,msg:'Pakai huruf, angka, titik, atau garis bawah saja.'};
    if(badText(v))return {ok:false,msg:'Username mengandung kata yang tidak boleh dipakai.'};
    return {ok:true,value:v};
  },
  /* rumah dibagi acak; satu rumah boleh dihuni banyak pemain */
  create(username,shirt,hair){
    const h=HOUSES[Math.floor(Math.random()*HOUSES.length)];
    this.profile={v:1,username,id:this.makeId(),shirt,hair,house:h.id,created:Date.now(),pos:null,quest:{step:0,done:false},ep:GAME.episode};
    this.write();return this.profile;
  },
  savePos(x,z,yaw){if(!this.profile)return;this.profile.pos={x:+x.toFixed(2),z:+z.toFixed(2),yaw:+yaw.toFixed(2)};this.write()},
  saveQuest(q){if(!this.profile)return;this.profile.quest={step:q.step,done:q.done};this.write()},
  reset(){try{localStorage.removeItem(GAME.key)}catch(e){}this.profile=null}
};

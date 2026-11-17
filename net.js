'use strict';
/* net.js — multiplayer & chat.
   Transport: FirebaseTransport (Realtime Database + login anonim) bila config terisi,
   selain itu LocalTransport (BroadcastChannel antar tab) untuk uji coba. Setiap langkah dicatat di Net.diag
   (lihat Menu → Cek Multiplayer) supaya penyebab kegagalan terlihat jelas. */
const angD=(a,b)=>{let e=a-b;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;return e};

/* baca config dari mana pun: globalThis.FIREBASE_CONFIG, globalThis.firebaseConfig, atau const lama */
function netConfig(){
  let c=globalThis.FIREBASE_CONFIG||globalThis.firebaseConfig;
  if(!c&&typeof FIREBASE_CONFIG!=='undefined')c=FIREBASE_CONFIG;
  return c||{};
}
function explainErr(e){
  const s=(String((e&&(e.code||e.name))||'')+' '+String((e&&e.message)||e||'')).toLowerCase();
  if(s.includes('operation-not-allowed')||s.includes('admin-restricted'))return 'Login Anonymous belum aktif. Firebase Console → Authentication → Sign-in method → Anonymous → Enable.';
  if(s.includes('configuration-not-found'))return 'Authentication belum dimulai. Firebase Console → Authentication → klik "Get started", lalu aktifkan Anonymous.';
  if(s.includes('unauthorized-domain'))return 'Domain situs ini belum diizinkan. Authentication → Settings → Authorized domains → tambahkan "'+location.hostname+'".';
  if(s.includes('api-key')||s.includes('invalid-api'))return 'API key salah. Periksa config.js.';
  if(s.includes('permission_denied')||s.includes('permission denied'))return 'Aturan database menolak akses. Realtime Database → Rules → tempel isi database.rules.json → Publish.';
  if(s.includes('dynamically imported module')||s.includes('module'))return 'Gagal memuat Firebase SDK dari gstatic.com (diblokir jaringan, VPN, atau pemblokir iklan).';
  if(s.includes('timeout')||s.includes('network')||s.includes('failed to fetch'))return 'Koneksi ke Firebase gagal atau terlalu lama. Cek internet / matikan VPN.';
  return String((e&&e.message)||e||'Kesalahan tidak dikenal');
}

class LocalTransport{
  connect(me,cb){
    this.cb=cb;this.uid=sessionStorage.getItem('kn.uid')||('L'+Math.random().toString(36).slice(2,9));sessionStorage.setItem('kn.uid',this.uid);
    this.bc=new BroadcastChannel('kotaneo-net');this.last=null;
    this.bc.onmessage=e=>{const m=e.data;if(!m||m.u===this.uid)return;
      if(m.t==='pres')cb.player('change',m.u,m.d);else if(m.t==='bye')cb.player('remove',m.u);
      else if(m.t==='hello'&&this.last)this.bc.postMessage({t:'pres',u:this.uid,d:this.last});else if(m.t==='chat')cb.chat(m.k,m.m,false)};
    this.bc.postMessage({t:'hello',u:this.uid});
    addEventListener('pagehide',()=>{try{this.bc.postMessage({t:'bye',u:this.uid})}catch(e){}});
    try{JSON.parse(localStorage.getItem('kotaneo.localchat')||'[]').slice(-NET_CFG.chatKeep).forEach(x=>cb.chat(x.k,x.m,true))}catch(e){}
    return Promise.resolve(this.uid);
  }
  setPresence(d){this.last=d;this.bc.postMessage({t:'pres',u:this.uid,d})}
  pushChat(m){
    const k=Date.now().toString(36)+Math.random().toString(36).slice(2,5);m.t=Date.now();
    this.bc.postMessage({t:'chat',k,m});this.cb.chat(k,m,false);
    try{const a=JSON.parse(localStorage.getItem('kotaneo.localchat')||'[]');a.push({k,m});localStorage.setItem('kotaneo.localchat',JSON.stringify(a.slice(-NET_CFG.chatKeep)))}catch(e){}
  }
  saveProfile(){}
  close(){try{this.bc.postMessage({t:'bye',u:this.uid});this.bc.close()}catch(e){}}
}

class FirebaseTransport{
  async connect(me,cb,cfg){
    const d=cb.diag,base='https://www.gstatic.com/firebasejs/10.12.2/';this.cb=cb;let A,Au,D;
    try{[A,Au,D]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);d('Memuat Firebase SDK',true)}
    catch(e){d('Memuat Firebase SDK',false,explainErr(e));throw e}
    this.D=D;let app,auth;
    try{app=A.initializeApp(cfg);auth=Au.getAuth(app)}catch(e){d('Inisialisasi Firebase',false,explainErr(e));throw e}
    d('Inisialisasi Firebase',true,cfg.projectId||'');
    try{const cred=await Au.signInAnonymously(auth);this.uid=cred.user.uid;d('Login anonim',true)}
    catch(e){d('Login anonim',false,explainErr(e));throw e}
    this.db=D.getDatabase(app);
    this.meRef=D.ref(this.db,'players/'+this.uid);D.onDisconnect(this.meRef).remove();
    const bad=step=>e=>d(step,false,explainErr(e));
    const pr=D.ref(this.db,'players');
    D.onChildAdded(pr,s=>cb.player('add',s.key,s.val()),bad('Baca data pemain'));
    D.onChildChanged(pr,s=>cb.player('change',s.key,s.val()),bad('Baca data pemain'));
    D.onChildRemoved(pr,s=>cb.player('remove',s.key,null),bad('Baca data pemain'));
    if(D.get)D.get(pr).then(()=>d('Baca data pemain',true)).catch(bad('Baca data pemain'));
    const q=D.query(D.ref(this.db,'chat'),D.orderByChild('t'),D.limitToLast(NET_CFG.chatKeep));
    const born=Date.now();D.onChildAdded(q,s=>{const m=s.val();cb.chat(s.key,m,!m||!m.t||m.t<born-2000)},bad('Baca chat'));
    return this.uid;
  }
  _w(step,p){return p.then(()=>{if(!this['ok'+step]){this['ok'+step]=1;this.cb.diag(step,true)}}).catch(e=>this.cb.diag(step,false,explainErr(e)))}
  setPresence(d){this._w('Tulis posisi',this.D.set(this.meRef,d))}
  pushChat(m){const D=this.D,k=D.push(D.ref(this.db,'chat')).key;m.t=D.serverTimestamp();this._w('Kirim chat',D.set(D.ref(this.db,'chat/'+k),m))}
  saveProfile(p){this._w('Simpan profil',this.D.set(this.D.ref(this.db,'profiles/'+this.uid),p))}
  close(){try{this.D.remove(this.meRef)}catch(e){}}
}

const Net={
  mode:'off',tr:null,uid:null,ready:false,me:null,players:new Map(),chat:[],keys:new Set(),diag:[],error:'',
  _t:0,_hb:0,_last:null,_lastSend:0,onChat:null,onFail:null,
  /* catat satu langkah diagnosa; kegagalan pertama jadi Net.error */
  _d(step,ok,msg){
    const i=this.diag.findIndex(x=>x.step===step),r={step,ok,msg:msg||''};if(i>=0)this.diag[i]=r;else this.diag.push(r);
    if(!ok){console.warn('[Net] '+step+': '+msg);if(!this.error)this.error=msg;if(this.onFail&&this.ready)this.onFail(step,msg)}
  },
  async start(profile){
    if(this.ready)return;
    this.diag=[];this.error='';
    this.me={n:profile.username,id:profile.id,s:profile.shirt,h:profile.hair};
    const cb={player:(t,u,d)=>this._player(t,u,d),chat:(k,m,h)=>this._chat(k,m,h),diag:(s,o,m)=>this._d(s,o,m)};
    const cfg=netConfig(),fb=!!(cfg.apiKey&&cfg.databaseURL);
    this._d('Konfigurasi Firebase',fb,fb?cfg.projectId||'':'apiKey/databaseURL belum terbaca dari config.js — memakai mode uji lokal.');
    try{
      this.tr=fb?new FirebaseTransport():new LocalTransport();this.mode=fb?'firebase':'local';
      this.uid=await Promise.race([this.tr.connect(this.me,cb,cfg),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout: tidak ada respons dari Firebase')),12000))]);
      this.ready=true;
      this.tr.saveProfile({n:profile.username,id:profile.id,h:profile.house,s:profile.shirt,r:profile.hair,c:profile.created});
    }catch(e){
      console.warn('Multiplayer tidak tersambung:',e);this.ready=false;this.mode='off';
      if(!this.error)this.error=explainErr(e);
      try{this.tr&&this.tr.close()}catch(_){}
    }
  },
  async retry(){
    try{this.tr&&this.tr.close()}catch(e){}
    this.tr=null;this.ready=false;this.players.clear();this.keys.clear();this.chat.length=0;this._last=null;
    if(Save.profile)await this.start(Save.profile);
  },
  online(){return this.ready?this.players.size+1:0},
  label(){return {firebase:'Online',local:'Uji lokal',off:'Offline'}[this.mode]},
  _player(type,uid,d){
    if(uid===this.uid)return;
    if(type==='remove'){this.players.delete(uid);return}
    if(!d||typeof d.x!=='number')return;
    let p=this.players.get(uid);
    if(!p){p={uid,x:d.x,z:d.z,yaw:d.y||0,phase:0,amt:0,bubble:null,name:'',tag:null,sit:0};this.players.set(uid,p)}
    p.tx=d.x;p.tz=d.z;p.tyaw=d.y||0;p.sit=d.o?1:0;p.last=performance.now();
    const nm=String(d.n||'warga').slice(0,24);if(nm!==p.name){p.name=nm;p.tag=nameTex(nm,'#fff8e6','#2b1a0e')}
    p.look={shirt:/^#[0-9a-f]{6}$/i.test(d.s)?d.s:'#6cc3f5',hair:/^#[0-9a-f]{6}$/i.test(d.h)?d.h:'#2b1a0e',skin:'#ffd9b8',style:'short'};
  },
  _chat(key,m,hist){
    if(!m||typeof m.m!=='string'||this.keys.has(key))return;this.keys.add(key);
    const msg={k:key,u:String(m.u||''),n:String(m.n||'warga').slice(0,24),m:m.m.slice(0,NET_CFG.chatMax),t:m.t||Date.now(),r:m.r&&m.r.m?{k:String(m.r.k||''),n:String(m.r.n||'').slice(0,24),m:String(m.r.m).slice(0,60)}:null,hist:!!hist};
    this.chat.push(msg);if(this.chat.length>NET_CFG.chatKeep*2)this.chat.shift();
    if(!hist){const w=msg.u===this.uid?P:this.players.get(msg.u);if(w)w.bubble={text:msg.m,until:performance.now()+6500,tex:null}}
    if(this.onChat)this.onChat(msg);
  },
  send(text,reply){
    text=String(text||'').trim().replace(/\s+/g,' ');
    if(!this.ready)return 'Chat belum tersambung. Menu → Cek Multiplayer.';
    if(!text)return '';
    if(text.length>NET_CFG.chatMax)return 'Pesan terlalu panjang.';
    if(badText(text))return 'Pesan mengandung kata yang tidak boleh dipakai.';
    const now=performance.now();if(now-this._lastSend<NET_CFG.chatGap*1000)return 'Pelan-pelan ya, tunggu sebentar.';
    this._lastSend=now;
    this.tr.pushChat({u:this.uid,n:this.me.n,m:text,r:reply?{k:reply.k,n:reply.n,m:reply.m.slice(0,60)}:null});return '';
  },
  tick(dt,pl){
    if(!this.ready)return;
    this._t+=dt;this._hb+=dt;
    const o=pl.sit?1:0,L=this._last;
    const moved=!L||Math.hypot(pl.x-L.x,pl.z-L.z)>.08||Math.abs(angD(pl.yaw,L.y))>.15||L.o!==o;
    if((moved&&this._t>=NET_CFG.sendMoving)||this._hb>=NET_CFG.heartbeat){
      const d={n:this.me.n,x:+pl.x.toFixed(1),z:+pl.z.toFixed(1),y:+pl.yaw.toFixed(2),s:this.me.s,h:this.me.h,o};
      this.tr.setPresence(d);this._last={x:pl.x,z:pl.z,y:pl.yaw,o};this._t=0;this._hb=0}
    const now=performance.now();
    for(const [u,p] of this.players){
      if(now-p.last>45000){this.players.delete(u);continue}
      const dx=p.tx-p.x,dz=p.tz-p.z,k=Math.min(1,dt*9),sp=Math.hypot(dx,dz)/Math.max(dt,.001);
      p.x+=dx*k;p.z+=dz*k;p.yaw+=angD(p.tyaw,p.yaw)*Math.min(1,dt*10);
      const a=Math.min(1,sp/4.4);p.amt+=(a-p.amt)*Math.min(1,dt*8);if(p.sit)p.amt=0;p.phase+=sp*dt*1.9;
      if(p.bubble&&now>p.bubble.until)p.bubble=null;
    }
    if(P.bubble&&now>P.bubble.until)P.bubble=null;
  }
};
// Ekspos Net ke seluruh file
globalThis.Net = Net;

'use strict';
/* net.js — multiplayer & chat.
   Transport: FirebaseTransport (Realtime Database + login anonim) bila config.js terisi,
   selain itu LocalTransport (BroadcastChannel antar tab) untuk uji coba tanpa server. */
const angD=(a,b)=>{let e=a-b;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;return e};

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
  async connect(me,cb){
    const base='https://www.gstatic.com/firebasejs/10.12.2/';
    const [A,Au,D]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);
    this.D=D;const app=A.initializeApp(FIREBASE_CONFIG),auth=Au.getAuth(app);
    const cred=await Au.signInAnonymously(auth);this.uid=cred.user.uid;this.db=D.getDatabase(app);
    this.meRef=D.ref(this.db,'players/'+this.uid);D.onDisconnect(this.meRef).remove();
    const pr=D.ref(this.db,'players');
    D.onChildAdded(pr,s=>cb.player('add',s.key,s.val()));D.onChildChanged(pr,s=>cb.player('change',s.key,s.val()));D.onChildRemoved(pr,s=>cb.player('remove',s.key,null));
    const q=D.query(D.ref(this.db,'chat'),D.orderByChild('t'),D.limitToLast(NET_CFG.chatKeep));
    const born=Date.now();D.onChildAdded(q,s=>{const m=s.val();cb.chat(s.key,m,!m||!m.t||m.t<born-2000)});
    return this.uid;
  }
  setPresence(d){this.D.set(this.meRef,d).catch(()=>{})}
  pushChat(m){const D=this.D,k=D.push(D.ref(this.db,'chat')).key;m.t=D.serverTimestamp();D.set(D.ref(this.db,'chat/'+k),m).catch(()=>{})}
  saveProfile(p){this.D.set(this.D.ref(this.db,'profiles/'+this.uid),p).catch(()=>{})}
  close(){try{this.D.remove(this.meRef)}catch(e){}}
}

const Net={
  mode:'off',tr:null,uid:null,ready:false,me:null,players:new Map(),chat:[],keys:new Set(),
  _t:0,_hb:0,_last:null,_lastSend:0,onChat:null,
  async start(profile){
    if(this.ready)return;
    this.me={n:profile.username,id:profile.id,s:profile.shirt,h:profile.hair};
    const cb={player:(t,u,d)=>this._player(t,u,d),chat:(k,m,h)=>this._chat(k,m,h)};
    try{
      const fb=FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.databaseURL;
      this.tr=fb?new FirebaseTransport():new LocalTransport();this.mode=fb?'firebase':'local';
      this.uid=await Promise.race([this.tr.connect(this.me,cb),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),9000))]);
      this.ready=true;
      this.tr.saveProfile({n:profile.username,id:profile.id,h:profile.house,s:profile.shirt,r:profile.hair,c:profile.created});
    }catch(e){console.warn('Multiplayer tidak tersambung:',e);this.ready=false;this.mode='off';try{this.tr&&this.tr.close()}catch(_){}}
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
  /* kembalikan teks error bila ditolak */
  send(text,reply){
    text=String(text||'').trim().replace(/\s+/g,' ');
    if(!this.ready)return 'Chat belum tersambung.';
    if(!text)return '';
    if(text.length>NET_CFG.chatMax)return 'Pesan terlalu panjang.';
    if(badText(text))return 'Pesan mengandung kata yang tidak boleh dipakai.';
    const now=performance.now();if(now-this._lastSend<NET_CFG.chatGap*1000)return 'Pelan-pelan ya, tunggu sebentar.';
    this._lastSend=now;
    this.tr.pushChat({u:this.uid,n:this.me.n,m:text,r:reply?{k:reply.k,n:reply.n,m:reply.m.slice(0,60)}:null});return '';
  },
  /* kirim posisi sendiri & haluskan pemain lain; dipanggil tiap frame */
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

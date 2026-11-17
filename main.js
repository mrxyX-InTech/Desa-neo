'use strict';
/* main.js — boot, state game, misi, interaksi, loop requestAnimationFrame */
const Quest={
  step:0,done:false,
  load(p){this.step=Math.min(p.quest.step||0,QUEST_STEPS.length-1);this.done=!!p.quest.done},
  own(){return HOUSE_BY_ID[Save.profile.house]},
  advance(to,msg){
    if(this.done||to<=this.step)return;this.step=to;Save.saveQuest(this);this.refresh();
    UI.toast(msg||'Misi baru: '+QUEST_STEPS[to].t(Save.profile),3200);
  },
  finish(){if(this.done)return;this.done=true;Save.saveQuest(this);this.refresh()},
  refresh(){
    const p=Save.profile;if(!p)return;
    if(this.done)UI.setQuest('<b>Episode 1 selesai ✓</b> Jelajahi kotamu!');
    else UI.setQuest(`<b>Misi ${this.step+1}/${QUEST_STEPS.length}</b> ${esc(QUEST_STEPS[this.step].t(p))}`);
    const g=NPCs.get('satpam');if(g)g.mark=(!this.done&&this.step===1)?true:null;
  },
  target(){
    const p=Save.profile,h=this.own();if(this.done)return null;
    switch(this.step){
      case 0:return {x:0,z:ARCH_Z-8};
      case 1:{const n=NPCs.get('satpam');return {x:n.x,z:n.z}}
      case 2:{const c=COMPLEXES.find(c=>c.id===h.c);return {x:c.s*20,z:c.zc}}
      case 3:{const t=HOUSE_BY_ID[questTargetId(p)];return {x:t.spot[0],z:t.spot[1]}}
      case 4:{const b=World.places.find(q=>q.id==='sekolah');return {x:b.x,z:b.z}}
      case 5:return {x:h.spot[0],z:h.spot[1]};
    }
  },
  tick(){
    if(this.done)return;const h=this.own();
    if(this.step===0&&P.z<ARCH_Z-3)this.advance(1,'Selamat datang di Kota Neo! Temui penjaga gerbang.');
    if(this.step===2){const c=COMPLEXES.find(c=>c.id===h.c),r=c.rect;if(P.x>r.x0+1&&P.x<r.x1&&P.z>r.z0&&P.z<r.z1)this.advance(3,'Kamu masuk '+c.name+'!')}
    if(this.step===5&&Math.hypot(P.x-h.spot[0],P.z-h.spot[1])<4){this.finish();UI.toast('Episode 1 selesai! Selamat datang di rumah 🏠',4200);
      setTimeout(()=>{if(!UI.modalOpen)UI.card('Episode 1 selesai! 🎉',`<p>Kamu sudah mengenal Kota Neo: gerbang, komplek, rumah, dan lahan kosong untuk sekolah, taman bermain, bioskop, pasar malam, taman hiburan, dan mall.</p><p>Kota ini masih menunggu warganya. Sampai jumpa di episode berikutnya!</p>`)},3000)}
  }
};

const Game={
  state:'boot',t:0,hiQ:true,timeMode:'wib',env:null,hour:12,lastSave:0,lastClock:0,near:null,
  timeLabel(){return {wib:'Otomatis (WIB)',day:'Selalu siang',night:'Selalu malam'}[this.timeMode]},
  cycleTime(){this.timeMode={wib:'day',day:'night',night:'wib'}[this.timeMode];this.saveSettings()},
  toggleQuality(){this.hiQ=!this.hiQ;R.setQuality(this.hiQ);this.saveSettings()},
  saveSettings(){try{localStorage.setItem('kotaneo.set',JSON.stringify({q:this.hiQ,t:this.timeMode}))}catch(e){}},
  loadSettings(){try{const s=JSON.parse(localStorage.getItem('kotaneo.set')||'{}');if(s.t)this.timeMode=s.t;
    this.hiQ=s.q!==undefined?!!s.q:!(matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<500)}catch(e){}},
  getHour(){
    const q=new URLSearchParams(location.search).get('jam');if(q!==null&&!isNaN(+q))return +q;
    return this.timeMode==='day'?12:this.timeMode==='night'?22:wibHour();
  },
  savePos(){if(Save.profile&&this.state==='play')Save.savePos(P.x,P.z,P.yaw)},

  /* ---------- mulai bermain ---------- */
  startGame(first){
    const p=Save.profile;
    P.look={shirt:p.shirt,hair:p.hair,skin:'#ffd9b8',style:'short'};P.name=p.username;P.tag=nameTex(p.username,'#ffd23f','#2b1a0e');
    World.setOwn(p.house);Quest.load(p);
    let pos=p.pos;if(!pos||!isFinite(pos.x)||pos.x<BOUNDS.x0||pos.x>BOUNDS.x1||pos.z<BOUNDS.z0||pos.z>BOUNDS.z1)pos={x:SPAWN.x,z:SPAWN.z,yaw:SPAWN.yaw};
    placePlayer(pos.x,pos.z,pos.yaw);collide(P);
    Cam.intro=false;Cam.setMode('walk');Cam.yaw=P.yaw+Math.PI;Cam._init=false;UI.setCamBtn(false);
    Input.enabled=true;Input.reset();this.state='play';UI.hud(true);Quest.refresh();
    Net.start(p).then(()=>{if(Net.mode==='off')UI.toast('Multiplayer belum tersambung. Buka Menu → Cek Multiplayer',6000);else if(Net.mode==='local')UI.toast('Mode uji lokal: config.js belum terbaca',5000)});
    const touch=matchMedia('(pointer:coarse)').matches;
    UI.hint(touch?'Geser kiri layar untuk berjalan · geser kanan untuk memutar kamera':'WASD / panah jalan · Shift lari · Spasi lompat · E aksi · C kamera atas · seret mouse untuk memutar',7000);
    if(first){const h=World.own;UI.card('Rumahmu sudah siap!',`<p>Kamu mendapat rumah <b>${esc(h.cname)} No. ${h.n}</b> (kode ${esc(h.id)}).</p><p>Satu rumah boleh dihuni banyak warga, jadi tenang saja kalau tetangga serumah banyak nanti.</p><div class="stack"><button class="btn big" id="go1">MULAI JELAJAH</button></div>`);
      $('go1').onclick=()=>UI.closeModal()}
    else UI.toast('Selamat datang kembali, '+p.username+'!',3000);
  },
  startIntro(name){
    P.look={shirt:SHIRTS[0].c,hair:HAIRS[0].c,skin:'#ffd9b8',style:'short'};P.name=name;P.tag=nameTex(name,'#ffd23f','#2b1a0e');
    placePlayer(SPAWN.x,SPAWN.z,SPAWN.yaw);Cam.intro=true;Cam.yaw=.5;Cam._init=false;this.state='intro';
    UI.pick(P.look,()=>{},()=>{Save.create(name,P.look.shirt,P.look.hair);Cam.intro=false;this.startGame(true)});
  },

  /* ---------- interaksi ---------- */
  seatTaken(s){for(const p of Net.players.values())if(p.sit&&Math.hypot(p.x-s.x,p.z-s.z)<.5)return true;return false},
  findNear(){
    if(P.sit)return {kind:'stand',r:99,label:'Berdiri'};
    let best=null,bs=1e9;const own=World.own;
    const consider=(it,d)=>{const sc=d-(it.pri||0);if(d<it.r&&sc<bs){bs=sc;best=it}};
    for(const n of NPCs.list)consider({kind:'npc',npc:n,r:2.9,pri:1.5,label:'Bicara · '+n.d.name},Math.hypot(P.x-n.x,P.z-n.z));
    for(const pl of World.places){
      const d=Math.hypot(P.x-pl.x,P.z-pl.z);if(d>pl.r)continue;
      if(pl.kind==='house'){const h=pl.house;consider({kind:'house',house:h,r:pl.r,pri:h===own?1.2:0,label:h===own?'Masuk Rumah':'Periksa Rumah '+h.id},d)}
      else if(pl.kind==='ann')consider({kind:'ann',r:pl.r,label:pl.label,pri:.6},d);
      else consider({kind:'board',pl,r:pl.r,label:pl.label,pri:.3},d);
    }
    for(const s of World.seats){const d=Math.hypot(P.x-s.x,P.z-s.z);if(d<1.9&&!this.seatTaken(s))consider({kind:'seat',seat:s,r:1.9,pri:.9,label:'Duduk'},d)}
    return best;
  },
  act(it){
    const p=Save.profile;
    if(it.kind==='seat'){sitDown(it.seat);UI.hint('Geser joystick atau tekan AKSI untuk berdiri',3200);return}
    if(it.kind==='stand'){standUp();return}
    if(it.kind==='ann'){UI.announce();return}
    if(it.kind==='npc'){
      const n=it.npc,d=n.d;let lines=[],close=null;n.talk=true;
      if(d.id==='satpam'&&Quest.step===1){const h=Quest.own();
        lines=['Selamat datang di Kota Neo, '+p.username+'!','Rumahmu ada di '+h.cname+' nomor '+h.n+' (kode '+h.id+'). Masuk lewat gerbang komplek ya.','Kota ini masih kosong. Sekolah, taman bermain, dan mall belum dibangun.'];
        close=()=>{n.talk=false;Quest.advance(2)}}
      else{lines=[n.nextLine()];if(d.id==='satpam'&&!Quest.done)lines.push('Kalau lupa: rumahmu ada di '+Quest.own().id+'.');close=()=>{n.talk=false}}
      UI.dialog({name:d.name,role:d.role,lines,onClose:close,btn:'Oke'});
    }else if(it.kind==='house'){
      const h=it.house;
      if(h===World.own){
        UI.card('Rumah '+h.id,`<p>Ini rumahmu di <b>${esc(h.cname)}</b>, nomor ${h.n}.</p><p>Interior akan tersedia pada episode berikutnya.</p>`);
        if(Quest.step===5&&!Quest.done)Quest.tick();
      }else{
        const isT=!Quest.done&&Quest.step===3&&h.id===questTargetId(p);
        UI.card('Rumah '+h.id,isT?`<p>Ketemu! Rumah <b>${esc(h.id)}</b> terkunci, tapi lampu terasnya terasa hangat menyambut.</p><p>Misi berikutnya: baca papan pembangunan.</p>`:`<p>Rumah <b>${esc(h.id)}</b> terkunci. Kamu hanya bisa masuk ke rumahmu sendiri.</p>`);
        if(isT)Quest.advance(4);
      }
    }else if(it.kind==='board'){
      const pl=it.pl;
      UI.dialog({name:pl.title,role:'Papan',lines:[pl.text],btn:'Tutup',onClose:()=>{if(pl.proyek&&Quest.step===4&&!Quest.done)Quest.advance(5)}});
    }
  },

  /* ---------- per frame ---------- */
  step(dt){
    const play=this.state==='play';
    if(play){
      if(Input.actQ&&UI.dialogOpen()){UI.dlgNext();Input.actQ=false}
      else if(Input.actQ&&UI.modalOpen){Input.actQ=false}
      const frozen=UI.modalOpen;updatePlayer(dt,frozen);
      if(!frozen){
        this.near=this.findNear();UI.setNear(this.near?this.near.label:null);
        if(Input.actQ&&this.near)this.act(this.near);Input.actQ=false;
        Quest.tick();
      }else UI.setNear(null);
      this.lastSave+=dt;if(this.lastSave>4){this.lastSave=0;this.savePos()}
      // panah tujuan misi
      const tg=Quest.done?null:Quest.target();
      if(tg){const dx=tg.x-P.x,dz=tg.z-P.z,d=Math.hypot(dx,dz);UI.setGoal((Cam.yaw+Math.PI)-Math.atan2(dx,dz),d,d>5)}else UI.setGoal(0,0,false);
    }else Input.actQ=false;
    NPCs.update(dt);Net.tick(dt,P);
    Cam.update(dt,P,this.state==='play'?P.moveAmt:0);
  },
  draw(){
    const h=this.getHour();this.hour=h;const env=makeEnv(h);
    if(Date.now()-this.lastClock>1000){this.lastClock=Date.now();
      const w=h;UI.setClock((this.timeMode==='wib'?String(Math.floor(w)).padStart(2,'0')+':'+String(Math.floor(w%1*60)).padStart(2,'0')+' WIB':this.timeMode==='day'?'Siang':'Malam')+(Net.ready?' · '+Net.online()+' online':''))}
    const asp=innerWidth/Math.max(1,innerHeight);Cam.fov=(58+Math.min(22,Math.max(0,(1-asp)*45)))*Math.PI/180;
    World.dynamic(env,this.t,this._dt||.016);NPCs.draw(this.t);
    if(Net.ready){const arr=[];for(const p of Net.players.values()){const d=Math.hypot(p.x-P.x,p.z-P.z);if(d<95)arr.push([d,p])}
      arr.sort((a,b)=>a[0]-b[0]);for(const [d,p] of arr.slice(0,NET_CFG.maxShown))
        drawPerson({x:p.x,y:0,z:p.z,yaw:p.yaw,phase:p.phase,amt:p.amt,t:this.t+d,look:p.look,tag:p.tag,dist:d,sit:p.sit,bubble:p.bubble})}
    drawPerson({x:P.x,y:P.y,z:P.z,yaw:P.yaw,phase:P.phase,amt:Math.min(1,P.moveAmt),t:this.t,look:P.look,tag:this.state==='play'?P.tag:null,dist:0,sit:!!P.sit,bubble:P.bubble});
    R.render(Cam,env,this.t);
  }
};

/* ---------- boot ---------- */
const tick=()=>new Promise(r=>setTimeout(r,20));
async function fontsReady(){try{await Promise.race([Promise.all([document.fonts.load("40px 'Lilita One'"),document.fonts.load("900 40px Nunito")]),new Promise(r=>setTimeout(r,2500))])}catch(e){}}
async function boot(){
  try{
    UI.init();Game.loadSettings();
    const cv=$('gl');
    if(!R.init(cv)){$('loadMsg').textContent='Perangkat/browser ini belum mendukung WebGL2. Coba Chrome atau Safari terbaru.';return}
    R.setQuality(Game.hiQ);const onRs=()=>{R.resize();UI.frameIntro();UI._sync()};addEventListener('resize',onRs);addEventListener('orientationchange',()=>setTimeout(onRs,250));if(window.ResizeObserver)new ResizeObserver(()=>R.resize()).observe(cv);
    UI.setLoad(.15,'Memuat font & pengumuman…');await Promise.all([fontsReady(),Announce.load()]);await tick();
    Atlas.init();UI.setLoad(.35,'Membangun jalan & komplek…');await tick();
    World.build();UI.setLoad(.7,'Memasang papan & lampu…');await tick();
    Atlas.upload(R.gl);R.uploadAll();NPCs.init();
    Input.onCam=()=>{if(Game.state!=='play'||UI.modalOpen)return;Cam.setMode(Cam.top?'walk':'top');UI.setCamBtn(Cam.top)};
    Input.onEsc=()=>{if(UI.dialogOpen())UI.closeDialog();else if($('modal').classList.contains('on'))UI.closeModal();else if(Game.state==='play')UI.menu()};
    UI.setLoad(.95,'Hampir siap…');await tick();
    const p=Save.load();
    placePlayer(SPAWN.x,SPAWN.z,SPAWN.yaw);
    let last=performance.now();
    const autoQ=new URLSearchParams(location.search).get('auto')!=='0';let fN=0,fT=0,low=0,warm=0;
    const frame=now=>{requestAnimationFrame(frame);const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;Game.t+=dt;Game._dt=dt;Game.step(dt);Game.draw();
      // mode Hemat otomatis di perangkat lemah
      fN++;fT+=raw;if(fT>=2){const fps=fN/fT;fN=0;fT=0;warm++;
        if(autoQ&&warm>2&&Game.state==='play'&&Game.hiQ&&!document.hidden){if(fps<22){if(++low>=2){Game.toggleQuality();UI.toast('Mode Hemat aktif otomatis agar game tetap lancar',3500);low=0}}else low=0}}};
    requestAnimationFrame(frame);
    UI.setLoad(1,'Selamat datang!');UI.hideLoad();
    UI.followGate(()=>{if(p)Game.startGame(false);else UI.login(name=>Game.startIntro(name))});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)Game.savePos()});addEventListener('pagehide',()=>Game.savePos());
    window.KN={Game,P,Cam,World,NPCs,Quest,R,Save,Input,UI,Net};
  }catch(e){console.error(e);const m=$('loadMsg');if(m)m.textContent='Gagal memuat: '+e.message;window.KN_ERR=e}
}
boot();

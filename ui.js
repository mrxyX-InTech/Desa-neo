'use strict';
/* ui.js — UI kartun: follow TikTok, login, pilih karakter, HUD, dialog, chat, pengumuman, KTP, status */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const UI={
  dlgCb:null,dlgLines:[],dlgI:0,modalOpen:false,chatOpen:false,replyTo:null,unread:0,
  init(){
    const pad=document.createElement('div');pad.id='pad';document.body.insertBefore(pad,$('ui'));
    $('ui').innerHTML=`
      <div id="top"><div id="brand">KOTA NEO <small id="clock">--:--</small></div>
        <div id="quest" class="chip"></div><div id="goal" class="chip"><i>▲</i><span></span></div></div>
      <div id="modeBar"><button class="chip btn" id="bChat">Chat<i id="chatBadge"></i></button><button class="chip btn" id="bTop">Atas</button><button class="chip btn" id="bMenu">Menu</button></div>
      <div id="onl" class="chip"><i></i><span>Offline</span></div>
      <div id="joyBase" aria-label="Joystick"><i id="joyKnob"></i></div>
      <div id="near" class="chip btn"></div>
      <div id="ctl"><button class="rbtn" id="bJump">LOMPAT</button><button class="rbtn" id="bRun">LARI</button><button class="rbtn" id="bAct">AKSI</button></div>
      <div id="hint"></div><div id="dlg"></div>
      <div id="chat"><div id="chatHead"><b>Chat</b><span id="chatStat"></span><button id="chatX">✕</button></div>
        <div id="chatList"></div><div id="chatReply"><span id="chatRT"></span><button id="chatRX">✕</button></div><div id="chatErr"></div>
        <div id="chatRow"><input id="chatIn" type="text" maxlength="${NET_CFG.chatMax}" autocomplete="off" placeholder="Tulis pesan…"><button class="btn" id="chatGo">Kirim</button></div></div>
      <div id="modal"><div id="card"></div></div><div id="toast" class="chip"></div>
      <div class="screen" id="scFollow"></div><div class="screen" id="scLogin"></div><div class="screen bottom" id="scPick"></div>`;
    Input.bind(pad,$('joyBase'));
    const tap=(el,fn)=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fn(e)});
    tap($('bJump'),()=>{Input.jumpQ=true});
    tap($('bRun'),()=>{Input.runLatch=!Input.runLatch;$('bRun').classList.toggle('on',Input.runLatch)});
    tap($('bAct'),()=>{Input.actQ=true});tap($('near'),()=>{Input.actQ=true});
    tap($('bTop'),()=>Input.onCam&&Input.onCam());
    tap($('bMenu'),()=>this.menu());tap($('bChat'),()=>this.chatToggle());
    $('modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal')this.closeModal()});
    $('chatX').onclick=()=>this.chatToggle(false);
    $('chatGo').onclick=()=>this.chatSend();
    $('chatIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();this.chatSend()}if(e.key==='Escape')this.chatToggle(false)});
    $('chatRX').onclick=()=>this.setReply(null);
    Input.onChat=e=>{e.preventDefault();this.chatToggle(true)};
    Net.onChat=m=>this.chatAdd(m);
    Net.onFail=(s,m)=>this.toast('Multiplayer: '+s+' gagal. Buka Menu → Cek Multiplayer',4500);
    // keyboard HP: tetapkan panel chat di atas keyboard
    if(window.visualViewport){const f=()=>{const v=visualViewport,b=Math.max(0,innerHeight-v.height-v.offsetTop);$('chat').style.bottom=`calc(var(--sb) + ${Math.round(b)+8}px)`};visualViewport.addEventListener('resize',f);visualViewport.addEventListener('scroll',f)}
    this.hud(false);
  },
  _sync(){document.body.classList.toggle('mo',this.modalOpen);document.body.classList.toggle('chat-open',this.chatOpen);document.body.classList.toggle('chat-full',innerWidth<=640)},
  setLoad(p,msg){$('loadBar').style.width=Math.round(p*100)+'%';if(msg)$('loadMsg').textContent=msg},
  hideLoad(){$('load').classList.add('off');setTimeout(()=>{$('load').style.display='none'},600)},
  hud(on){for(const id of ['top','modeBar','ctl','near','joyBase','onl'])$(id).style.display=on?'':'none';if(!on){$('hint').style.display='none';this.chatToggle(false)}},
  setClock(s){$('clock').textContent=s;this.refreshOnline()},
  /* indikator online selalu terlihat (termasuk di HP) + daftar nama di panel chat */
  refreshOnline(){
    const o=$('onl');if(!o)return;const ok=Net.ready&&Net.mode==='firebase';
    o.classList.toggle('ok',ok);
    o.lastElementChild.textContent=Net.ready?(Net.mode==='firebase'?`${Net.online()} online`:`${Net.label()} · ${Net.online()}`):'Offline';
    if(this.chatOpen){const n=Net.names();$('chatStat').textContent=Net.ready?`${Net.label()} · ${Net.online()} online${n.length?' — '+n.slice(0,6).join(', '):''}`:'Belum tersambung'}
  },
  setQuest(html){$('quest').innerHTML=html},
  setGoal(ang,dist,show){const g=$('goal');g.style.display=show?'flex':'none';if(!show)return;g.firstElementChild.style.transform=`rotate(${ang}rad)`;g.lastElementChild.textContent=Math.round(dist)+' m'},
  setNear(label){const n=$('near'),a=$('bAct');if(label){n.style.display='block';n.textContent=label;a.classList.add('ready')}else{n.style.display='none';a.classList.remove('ready')}},
  setCamBtn(top){$('bTop').textContent=top?'Jalan':'Atas';$('bTop').classList.toggle('on',top)},
  hint(text,ms){const h=$('hint');if(!text){h.style.display='none';return}h.textContent=text;h.style.display='block';h.style.opacity=1;clearTimeout(this._h);if(ms)this._h=setTimeout(()=>{h.style.opacity=0;setTimeout(()=>{if(h.style.opacity==='0')h.style.display='none'},600)},ms)},
  toast(msg,ms){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(this._t);this._t=setTimeout(()=>t.classList.remove('on'),ms||2600)},

  /* ---------- wajib follow TikTok (teks biasa, tanpa deteksi) ---------- */
  followGate(done){
    const sc=$('scFollow');sc.classList.add('on');
    sc.innerHTML=`<div class="panel follow"><h1>Selamat datang di Kota Neo!</h1>
      <p>Pengunjung wajib follow TikTok supaya tidak ketinggalan update terbaru.</p>
      <div class="tt">${esc(TIKTOK.handle)}</div>
      <div class="row2"><a class="btn big green" id="fTik" href="${TIKTOK.url}" target="_blank" rel="noopener">Buka TikTok</a><button class="btn big" id="fGo">Lanjut</button></div></div>`;
    $('fGo').onclick=()=>{sc.classList.remove('on');sc.innerHTML='';done()};
  },
  /* ---------- login ---------- */
  login(done){
    const sc=$('scLogin');sc.classList.add('on');
    sc.innerHTML=`<div class="panel"><h1>Jadi warga Kota Neo</h1>
      <p>Ketik username bebas. Username hanya jadi nama di game, tidak terhubung ke TikTok. ID Warga Neo kamu dibuat otomatis.</p>
      <input id="inName" type="text" maxlength="24" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="username kamu">
      <div class="err" id="inErr"></div><button class="btn big" id="inGo">MASUK KE KOTA NEO</button></div>`;
    const go=()=>{const r=Save.checkName($('inName').value);if(!r.ok){$('inErr').textContent=r.msg;return}sc.classList.remove('on');sc.innerHTML='';done(r.value)};
    $('inGo').onclick=go;$('inName').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
    setTimeout(()=>{try{$('inName').focus()}catch(_){}},300);
  },
  /* ---------- pilih tampilan: karakter dibingkai di area yang TIDAK tertutup panel ---------- */
  pick(look,onChange,done){
    const sc=$('scPick');sc.classList.add('on');
    sc.innerHTML=`<div class="panel"><h1>Pilih tampilanmu</h1>
      <div class="lbl">Warna baju</div><div class="sw" id="swS"></div>
      <div class="lbl">Warna rambut</div><div class="sw hair" id="swH"></div>
      <div style="height:10px"></div><button class="btn big" id="pkGo">MULAI JADI WARGA</button></div>`;
    const mk=(el,arr,key)=>{arr.forEach(o=>{const b=document.createElement('button');b.style.background=o.c;b.title=o.n;b.setAttribute('aria-label',o.n);
      if(look[key]===o.c)b.classList.add('on');
      b.onclick=()=>{[...el.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');look[key]=o.c;onChange()};el.appendChild(b)})};
    mk($('swS'),SHIRTS,'shirt');mk($('swH'),HAIRS,'hair');
    this._pickOn=true;this.frameIntro();setTimeout(()=>this.frameIntro(),120);
    $('pkGo').onclick=()=>{this._pickOn=false;sc.classList.remove('on');sc.innerHTML='';Cam.shiftX=Cam.shiftY=0;done()};
  },
  frameIntro(){
    if(!this._pickOn)return;const sc=$('scPick'),p=sc.firstElementChild;if(!p)return;
    const r=p.getBoundingClientRect(),W=innerWidth,H=innerHeight,tf=Math.tan(Cam.fov/2);
    const right=getComputedStyle(sc).justifyContent==='flex-end';
    if(right){const pw=r.width+24;Cam.shiftX=-pw/W;Cam.shiftY=.04;Cam.introDist=Math.min(8,Math.max(3.6,3.5/(2*tf*.9)))}
    else{const ph=r.height+14,f=Math.max(.25,(H-ph)/H);Cam.shiftX=0;Cam.shiftY=ph/H;Cam.introDist=Math.min(8,Math.max(3.8,3.5/(2*tf*f)))}
  },

  /* ---------- dialog NPC / papan ---------- */
  dialog(o){this.dlgLines=o.lines.slice();this.dlgI=0;this.dlgCb=o.onClose||null;this.dlgBtn=o.btn||'Tutup';this.dlgMeta=o;
    const d=$('dlg');d.style.display='block';this.renderDlg();this.modalOpen=true;this._sync();Input.reset()},
  renderDlg(){
    const o=this.dlgMeta,last=this.dlgI>=this.dlgLines.length-1,d=$('dlg');
    d.innerHTML=`<div class="bubble"><div class="who">${esc(o.name)}</div>${o.role?`<div class="role">${esc(o.role)}</div>`:'<div style="height:10px"></div>'}
      <p>${esc(this.dlgLines[this.dlgI])}</p><div class="row"><button class="btn" id="dlgOk">${last?esc(this.dlgBtn):'Lanjut ▸'}</button></div></div>`;
    $('dlgOk').onpointerdown=e=>{e.preventDefault();this.dlgNext()};
  },
  dlgNext(){if(this.dlgI<this.dlgLines.length-1){this.dlgI++;this.renderDlg()}else this.closeDialog()},
  closeDialog(){const d=$('dlg');d.style.display='none';d.innerHTML='';this.modalOpen=false;this._sync();const cb=this.dlgCb;this.dlgCb=null;if(cb)cb()},
  dialogOpen(){return $('dlg').style.display==='block'},

  /* ---------- kartu modal ---------- */
  card(title,html,onClose){
    $('card').innerHTML=`<button class="x" id="cx" aria-label="Tutup">✕</button><h2>${esc(title)}</h2>${html}`;
    $('modal').classList.add('on');this.modalOpen=true;this._sync();this.cardCb=onClose||null;Input.reset();$('card').scrollTop=0;
    $('cx').onpointerdown=e=>{e.preventDefault();this.closeModal()};
  },
  closeModal(){$('modal').classList.remove('on');this.modalOpen=this.dialogOpen();this._sync();const cb=this.cardCb;this.cardCb=null;if(cb)cb()},
  menu(){
    if(this.modalOpen&&!$('modal').classList.contains('on'))return;
    const g=Game;
    this.card('Menu',`<div class="stack">
      <button class="btn" id="mK">KTP Digital</button><button class="btn" id="mS">Status Episode</button><button class="btn" id="mA">Papan Pengumuman</button><button class="btn" id="mN">Cek Multiplayer</button>
      <a class="btn green" href="${TIKTOK.url}" target="_blank" rel="noopener">TikTok ${esc(TIKTOK.handle)}</a>
      <button class="btn" id="mP">Simpan Posisi</button>
      <button class="btn alt" id="mT">Waktu kota: ${g.timeLabel()}</button><button class="btn alt" id="mQ">Kualitas: ${g.hiQ?'Tinggi':'Hemat'}</button>
      <button class="btn red" id="mR">Ganti Pemain</button></div>`);
    $('mK').onclick=()=>this.ktp();$('mS').onclick=()=>this.status();$('mA').onclick=()=>this.announce();$('mN').onclick=()=>this.netDiag();
    $('mP').onclick=()=>{Game.savePos();this.closeModal();this.toast('Posisi tersimpan')};
    $('mT').onclick=()=>{g.cycleTime();$('mT').textContent='Waktu kota: '+g.timeLabel()};
    $('mQ').onclick=()=>{g.toggleQuality();$('mQ').textContent='Kualitas: '+(g.hiQ?'Tinggi':'Hemat')};
    $('mR').onclick=()=>{this.card('Ganti pemain?',`<p>Profil, rumah, dan progres misi di perangkat ini akan dihapus.</p><div class="stack"><button class="btn red" id="rY">Ya, hapus profil</button><button class="btn alt" id="rN">Batal</button></div>`);
      $('rY').onclick=()=>{Save.reset();location.reload()};$('rN').onclick=()=>this.menu()};
  },
  ktp(){
    const p=Save.profile,h=HOUSE_BY_ID[p.house];
    const tgl=new Date(p.created).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    this.card('KTP Digital',`<div class="ktp"><div class="hd">KARTU TANDA PENDUDUK · KOTA NEO</div>
      <div class="bd"><canvas id="ktpC" width="184" height="232"></canvas><dl>
      <dt>Nama</dt><dd>${esc(p.username)}</dd><dt>Alamat</dt><dd>${esc(h.cname)} No. ${h.n}</dd><dt>Rumah</dt><dd>${esc(h.id)}</dd>
      <dt>Status</dt><dd>Warga Neo</dd><dt>Terdaftar</dt><dd class="nb">${esc(tgl)}</dd></dl></div>
      <div class="id">${esc(p.id)}</div></div><p class="note">ID Warga Neo dibuat otomatis. Profil disimpan di perangkat ini dan salinannya di data kota.</p>
      <div class="stack"><button class="btn alt" id="kb">◂ Kembali</button></div>`);
    const c=$('ktpC'),x=c.getContext('2d');
    x.fillStyle='#7cc8ef';x.fillRect(0,0,184,232);x.fillStyle='#8bd17c';x.fillRect(0,190,184,42);
    x.fillStyle=p.shirt;x.beginPath();x.roundRect(36,150,112,100,34);x.fill();
    x.fillStyle=P.look.skin;x.beginPath();x.arc(92,100,44,0,7);x.fill();
    x.fillStyle=p.hair;x.beginPath();x.arc(92,70,46,Math.PI,2*Math.PI);x.fill();
    x.fillStyle='#2b1a0e';x.beginPath();x.arc(74,104,5,0,7);x.arc(110,104,5,0,7);x.fill();
    x.strokeStyle='#b4543a';x.lineWidth=4;x.lineCap='round';x.beginPath();x.arc(92,116,12,.2,Math.PI-.2);x.stroke();
    x.lineWidth=8;x.strokeStyle='#2b1a0e';x.strokeRect(0,0,184,232);
    $('kb').onclick=()=>this.menu();
  },
  status(){
    const p=Save.profile,q=Quest,total=QUEST_STEPS.length,done=q.done?total:q.step,pr=Announce.data.proyek;
    const items=QUEST_STEPS.map((s,i)=>{const ok=q.done||i<q.step,now=!q.done&&i===q.step;return `<li class="${ok?'ok':now?'now':''}"><i>${ok?'✓':i+1}</i><span>${esc(s.t(p))}</span></li>`}).join('');
    const later=Announce.data.berikutnya.map(n=>`<li class="lock"><i>🔒</i><span>${esc(n)}</span></li>`).join('');
    this.card('Status Episode',`<p><b>Episode 1 — Kota Kosong</b><br>Warga: ${esc(p.username)} · Rumah ${esc(p.house)}</p>
      <div class="bar"><i style="width:${Math.round(done/total*100)}%"></i></div><p>${q.done?'Episode 1 selesai!':`Misi ${Math.min(done+1,total)} dari ${total}`}</p>
      <ul class="qlist">${items}</ul>
      <p><b>Episode 2 — Proyek ${esc(pr.nama)}</b><br>${esc(pr.tahap)} · ${Announce.pct()}%</p><div class="bar"><i style="width:${Announce.pct()}%"></i></div>
      <p><b>Segera dibuka</b></p><ul class="qlist">${later}</ul>
      <p class="note">Multiplayer: ${esc(Net.label())}${Net.ready?' · '+Net.online()+' online':''}${Net.error?' · '+esc(Net.error):''}</p>
      <div class="stack"><button class="btn alt" id="sb">◂ Kembali</button></div>`);
    $('sb').onclick=()=>this.menu();
  },
  /* ---------- papan pengumuman ---------- */
  announce(){
    const A=Announce.data,pr=A.proyek,pc=Announce.pct(),tot=pr.rincian.reduce((a,b)=>a+b.juta,0);
    const rows=pr.rincian.map(r=>`<tr><td>${esc(r.item)}</td><td>${fmtJuta(r.juta)}</td></tr>`).join('');
    const warga=Announce.stats&&Announce.stats.warga!==undefined?`<p class="note">Warga terdaftar: ${Number(Announce.stats.warga).toLocaleString('id-ID')}</p>`:'';
    this.card('Pengumuman Kota Neo',`<p><b>Proyek ${esc(pr.nama)}</b> (${esc(pr.sub)})<br>Tahap: ${esc(pr.tahap)}</p>
      <div class="bar"><i style="width:${pc}%"></i></div>
      <p>Terkumpul <b>${fmtJuta(pr.terkumpulJuta)}</b> dari ${fmtJuta(pr.targetJuta)} (${pc}%)</p>
      <p>Cara membantu: <b>1 share video = ${fmtJuta(pr.perShareJuta)}</b> dana pembangunan.</p>
      <table class="rtab">${rows}<tr class="tot"><td>Total rencana</td><td>${fmtJuta(tot)}</td></tr></table>
      <p class="note">${esc(A.catatan)}</p>${warga}<p class="note">Diperbarui: ${esc(A.updated)}</p>
      <div class="stack"><a class="btn green" href="${TIKTOK.url}" target="_blank" rel="noopener">Follow ${esc(TIKTOK.handle)}</a></div>`);
  },

  /* ---------- diagnosa multiplayer ---------- */
  netDiag(){
    const rows=Net.diag.map(d=>`<li class="${d.ok?'ok':'now'}"><i>${d.ok?'✓':'!'}</i><span>${esc(d.step)}${d.msg?`<br><small style="font-weight:700;font-size:12px">${esc(d.msg)}</small>`:''}</span></li>`).join('')
      ||'<li class="lock"><i>–</i><span>Belum ada data: game belum mencoba menyambung.</span></li>';
    this.card('Cek Multiplayer',`<p>Mode: <b>${esc(Net.label())}</b>${Net.ready?` · ${Net.online()} online`:''}</p><ul class="qlist">${rows}</ul>
      ${Net.ready?`<p class="note">ID sesi kamu: <b>${esc(String(Net.uid).slice(0,10))}…</b><br>
      Pemain terbaca di database: <b>${Net.stat.dbPlayers===undefined?'?':Net.stat.dbPlayers}</b> (termasuk kamu) · terlihat di game: <b>${Net.players.size}</b> lain<br>
      Sinkron terakhir: <b>${Net.stat.syncAt?Math.round((Date.now()-Net.stat.syncAt)/1000)+' dtk lalu':'belum'}</b> · tulis posisi: <b>${Net.stat.writeAt?Math.round((Date.now()-Net.stat.writeAt)/1000)+' dtk lalu':'belum'}</b>${Net.stat.writeOk===false?' (GAGAL)':''}</p>`:''}
      ${Net.error&&!Net.diag.some(d=>d.msg===Net.error)?`<p class="note" style="color:#c0392b">${esc(Net.error)}</p>`:''}
      <div class="stack"><button class="btn green" id="nr">Coba sambung ulang</button><button class="btn alt" id="nb">◂ Kembali</button></div>`);
    $('nr').onclick=async()=>{$('nr').textContent='Menyambung…';await Net.retry();this.netDiag()};$('nb').onclick=()=>this.menu();
  },

  /* ---------- chat ---------- */
  chatToggle(force){
    const on=force===undefined?!this.chatOpen:force;if(on===this.chatOpen)return;
    this.chatOpen=on;$('chat').classList.toggle('on',on);this._sync();
    if(on){this.unread=0;this._badge();Input.reset();this.refreshOnline();this.chatRender();
      if(!matchMedia('(pointer:coarse)').matches)setTimeout(()=>$('chatIn').focus(),50)}
    else{try{$('chatIn').blur()}catch(_){}}
  },
  _badge(){const b=$('chatBadge');b.style.display=this.unread?'block':'none';b.textContent=this.unread>9?'9+':this.unread},
  setReply(m){this.replyTo=m;const r=$('chatReply');if(!m){r.style.display='none';return}r.style.display='flex';$('chatRT').textContent='Membalas '+m.n+': '+m.m;try{$('chatIn').focus()}catch(_){}},
  chatAdd(m){
    if(this.chatOpen){this.chatRender(true)}else if(!m.hist&&m.u!==Net.uid){this.unread++;this._badge()}
  },
  chatRender(stick){
    const L=$('chatList'),near=L.scrollHeight-L.scrollTop-L.clientHeight<60;L.innerHTML='';
    for(const m of Net.chat.slice(-NET_CFG.chatKeep)){
      const d=document.createElement('div');d.className='cm'+(m.u===Net.uid?' me':'');
      if(m.r){const q=document.createElement('span');q.className='q';q.textContent='↩ '+m.r.n+': '+m.r.m;d.appendChild(q)}
      const rb=document.createElement('button');rb.className='rb';rb.textContent='Balas';rb.onclick=()=>this.setReply(m);d.appendChild(rb);
      const b=document.createElement('b');b.textContent=m.n;d.appendChild(b);d.appendChild(document.createTextNode(m.m));L.appendChild(d)}
    if(!stick||near||true)L.scrollTop=L.scrollHeight;
  },
  chatSend(){
    const i=$('chatIn'),err=Net.send(i.value,this.replyTo);$('chatErr').textContent=err||'';
    if(!err&&i.value.trim()){i.value='';this.setReply(null)}
    if(err)setTimeout(()=>{if($('chatErr').textContent===err)$('chatErr').textContent=''},2500);
  }
};

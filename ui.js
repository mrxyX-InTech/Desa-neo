'use strict';
/* ui.js — UI kartun (border tebal + shadow): login, pilih karakter, HUD, dialog, KTP digital, status episode */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const UI={
  dlgCb:null,dlgLines:[],dlgI:0,modalOpen:false,
  init(){
    const pad=document.createElement('div');pad.id='pad';document.body.insertBefore(pad,$('ui'));
    $('ui').innerHTML=`
      <div id="top"><div id="brand">KOTA NEO <small id="clock">--:-- WIB</small></div>
        <div id="quest" class="chip"></div><div id="goal" class="chip"><i>▲</i><span></span></div></div>
      <div id="modeBar"><button class="chip btn" id="bTop">Atas</button><button class="chip btn" id="bMenu">Menu</button></div>
      <div id="joy"><i></i></div>
      <div id="near" class="chip btn"></div>
      <div id="ctl"><button class="rbtn" id="bJump">LOMPAT</button><button class="rbtn" id="bRun">LARI</button><button class="rbtn act" id="bAct">AKSI</button></div>
      <div id="hint"></div><div id="dlg"></div>
      <div id="modal"><div id="card"></div></div><div id="toast" class="chip"></div>
      <div class="screen" id="scLogin"></div><div class="screen bottom" id="scPick"></div>`;
    Input.bind(pad,$('joy'));
    const tap=(el,fn)=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fn(e)});
    tap($('bJump'),()=>{Input.jumpQ=true});
    tap($('bRun'),()=>{Input.runLatch=!Input.runLatch;$('bRun').classList.toggle('on',Input.runLatch)});
    tap($('bAct'),()=>{Input.actQ=true});tap($('near'),()=>{Input.actQ=true});
    tap($('bTop'),()=>Input.onCam&&Input.onCam());
    tap($('bMenu'),()=>this.menu());
    $('modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal')this.closeModal()});
    this.hud(false);
  },
  setLoad(p,msg){$('loadBar').style.width=Math.round(p*100)+'%';if(msg)$('loadMsg').textContent=msg},
  hideLoad(){$('load').classList.add('off');setTimeout(()=>{$('load').style.display='none'},600)},
  hud(on){for(const id of ['top','modeBar','ctl','near'])$(id).style.display=on?'':'none';if(!on)$('hint').style.display='none'},
  setClock(s){$('clock').textContent=s},
  setQuest(html){$('quest').innerHTML=html},
  setGoal(ang,dist,show){const g=$('goal');g.style.display=show?'flex':'none';if(!show)return;g.firstElementChild.style.transform=`rotate(${ang}rad)`;g.lastElementChild.textContent=Math.round(dist)+' m'},
  setNear(label){const n=$('near'),a=$('bAct');if(label){n.style.display='block';n.textContent=label;a.classList.add('ready')}else{n.style.display='none';a.classList.remove('ready')}},
  setCamBtn(top){$('bTop').textContent=top?'Jalan':'Atas';$('bTop').classList.toggle('on',top)},
  hint(text,ms){const h=$('hint');h.textContent=text;h.style.display='block';h.style.opacity=1;clearTimeout(this._h);if(ms)this._h=setTimeout(()=>{h.style.opacity=0;setTimeout(()=>{if(h.style.opacity==='0')h.style.display='none'},600)},ms)},
  toast(msg,ms){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(this._t);this._t=setTimeout(()=>t.classList.remove('on'),ms||2600)},

  /* ---------- login ---------- */
  login(done){
    const sc=$('scLogin');sc.classList.add('on');
    sc.innerHTML=`<div class="panel"><h1>Selamat datang,<br>calon warga!</h1>
      <p>Masukkan username untuk jadi warga pertama Kota Neo. Username hanya dipakai sebagai nama di game — tidak terhubung ke TikTok.</p>
      <input id="inName" type="text" maxlength="24" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="username kamu">
      <div class="err" id="inErr"></div><button class="btn big" id="inGo">MASUK KE KOTA NEO</button></div>`;
    const go=()=>{const r=Save.checkName($('inName').value);if(!r.ok){$('inErr').textContent=r.msg;return}sc.classList.remove('on');sc.innerHTML='';done(r.value)};
    $('inGo').onclick=go;$('inName').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
    setTimeout(()=>{try{$('inName').focus()}catch(_){}},300);
  },
  /* ---------- pilih tampilan ---------- */
  pick(look,onChange,done){
    const sc=$('scPick');sc.classList.add('on');
    sc.innerHTML=`<div class="panel"><h1>Pilih tampilanmu</h1>
      <div class="lbl">Warna baju</div><div class="sw" id="swS"></div>
      <div class="lbl">Warna rambut</div><div class="sw hair" id="swH"></div>
      <div style="height:12px"></div><button class="btn big" id="pkGo">MULAI JADI WARGA</button></div>`;
    const mk=(el,arr,key)=>{arr.forEach((o,i)=>{const b=document.createElement('button');b.style.background=o.c;b.title=o.n;b.setAttribute('aria-label',o.n);
      if(look[key]===o.c)b.classList.add('on');
      b.onclick=()=>{[...el.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');look[key]=o.c;onChange()};el.appendChild(b)})};
    mk($('swS'),SHIRTS,'shirt');mk($('swH'),HAIRS,'hair');
    $('pkGo').onclick=()=>{sc.classList.remove('on');sc.innerHTML='';done()};
  },

  /* ---------- dialog NPC / papan ---------- */
  dialog(o){ // {name,role,lines:[...],onClose,btn}
    this.dlgLines=o.lines.slice();this.dlgI=0;this.dlgCb=o.onClose||null;this.dlgBtn=o.btn||'Tutup';this.dlgMeta=o;
    const d=$('dlg');d.style.display='block';this.renderDlg();this.modalOpen=true;Input.reset();
  },
  renderDlg(){
    const o=this.dlgMeta,last=this.dlgI>=this.dlgLines.length-1,d=$('dlg');
    d.innerHTML=`<div class="bubble"><div class="who">${esc(o.name)}</div>${o.role?`<div class="role">${esc(o.role)}</div>`:'<div style="height:10px"></div>'}
      <p>${esc(this.dlgLines[this.dlgI])}</p><div class="row"><button class="btn" id="dlgOk">${last?esc(this.dlgBtn):'Lanjut ▸'}</button></div></div>`;
    $('dlgOk').onpointerdown=e=>{e.preventDefault();this.dlgNext()};
  },
  dlgNext(){if(this.dlgI<this.dlgLines.length-1){this.dlgI++;this.renderDlg()}else this.closeDialog()},
  closeDialog(){const d=$('dlg');d.style.display='none';d.innerHTML='';this.modalOpen=false;const cb=this.dlgCb;this.dlgCb=null;if(cb)cb()},
  dialogOpen(){return $('dlg').style.display==='block'},

  /* ---------- kartu modal ---------- */
  card(title,html,onClose){
    $('card').innerHTML=`<button class="x" id="cx">✕</button><h2>${esc(title)}</h2>${html}`;
    $('modal').classList.add('on');this.modalOpen=true;this.cardCb=onClose||null;Input.reset();
    $('cx').onpointerdown=e=>{e.preventDefault();this.closeModal()};
  },
  closeModal(){$('modal').classList.remove('on');this.modalOpen=this.dialogOpen();const cb=this.cardCb;this.cardCb=null;if(cb)cb()},
  menu(){
    if(this.modalOpen&&!$('modal').classList.contains('on'))return;
    const g=Game;
    this.card('Menu',`<div class="stack">
      <button class="btn" id="mK">🪪 KTP Digital</button><button class="btn" id="mS">📋 Status Episode</button>
      <button class="btn" id="mP">💾 Simpan Posisi</button>
      <button class="btn alt" id="mT">Waktu kota: ${g.timeLabel()}</button><button class="btn alt" id="mQ">Kualitas: ${g.hiQ?'Tinggi':'Hemat'}</button>
      <button class="btn red" id="mR">Ganti Pemain</button></div>`);
    $('mK').onclick=()=>this.ktp();$('mS').onclick=()=>this.status();
    $('mP').onclick=()=>{Game.savePos();this.closeModal();this.toast('Posisi tersimpan 💾')};
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
      <div class="id">${esc(p.id)}</div></div><p style="font-size:13px;color:var(--muted)">ID Warga Neo dibuat otomatis dan hanya tersimpan di perangkat ini.</p>
      <div class="stack"><button class="btn alt" id="kb">◂ Kembali</button></div>`);
    const c=$('ktpC'),x=c.getContext('2d');
    x.fillStyle='#7cc8ef';x.fillRect(0,0,184,232);x.fillStyle='#8bd17c';x.fillRect(0,190,184,42);
    x.fillStyle=p.shirt;x.beginPath();x.roundRect(36,150,112,100,34);x.fill();
    x.fillStyle=P.look.skin;x.beginPath();x.arc(92,100,44,0,7);x.fill();
    x.fillStyle=p.hair;x.beginPath();x.ellipse(92,78,48,32,0,Math.PI,0);x.fill();x.beginPath();x.arc(92,70,46,Math.PI,2*Math.PI);x.fill();
    x.fillStyle='#2b1a0e';x.beginPath();x.arc(74,104,5,0,7);x.arc(110,104,5,0,7);x.fill();
    x.strokeStyle='#b4543a';x.lineWidth=4;x.lineCap='round';x.beginPath();x.arc(92,116,12,.2,Math.PI-.2);x.stroke();
    x.lineWidth=8;x.strokeStyle='#2b1a0e';x.strokeRect(0,0,184,232);
    $('kb').onclick=()=>this.menu();
  },
  status(){
    const p=Save.profile,q=Quest,total=QUEST_STEPS.length,done=q.done?total:q.step;
    const items=QUEST_STEPS.map((s,i)=>{const ok=q.done||i<q.step,now=!q.done&&i===q.step;return `<li class="${ok?'ok':now?'now':''}"><i>${ok?'✓':i+1}</i><span>${esc(s.t(p))}</span></li>`}).join('');
    const later=['Sekolah Neo','Taman Bermain','Bioskop Neo','Pasar Malam','Taman Hiburan','Mall Neo'].map(n=>`<li class="lock"><i>🔒</i><span>${n}</span></li>`).join('');
    this.card('Status Episode',`<p><b>Episode 1 — Kota Kosong</b><br>Warga: ${esc(p.username)} · Rumah ${esc(p.house)}</p>
      <div class="bar"><i style="width:${Math.round(done/total*100)}%"></i></div><p>${q.done?'Episode 1 selesai! 🎉':`Misi ${Math.min(done+1,total)} dari ${total}`}</p>
      <ul class="qlist">${items}</ul><p><b>Segera dibuka</b></p><ul class="qlist">${later}</ul>
      <div class="stack"><button class="btn alt" id="sb">◂ Kembali</button></div>`);
    $('sb').onclick=()=>this.menu();
  }
};

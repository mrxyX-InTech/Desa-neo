'use strict';
/* data.js — konstanta, palet, tata letak kota, rumah, NPC, misi.
   Sumbu: x = timur, z = selatan (utara = -z), y = atas. Satuan meter. */

const GAME={name:'KOTA NEO',ver:'1.1.0',episode:1,key:'kotaneo.ep1.v1'};

const PAL={
  ink:'#2b1a0e',cream:'#fff8e6',yellow:'#ffd23f',red:'#e3342f',sky:'#7cc8ef',
  grass:'#86d06f',grass2:'#78c463',grass3:'#9bda7c',dirt:'#c9a574',dirt2:'#b48c5c',
  asphalt:'#575d6c',asphalt2:'#4d5360',line:'#fff3c4',walk:'#efe4cb',walk2:'#e4d6b8',curb:'#c9b894',
  wall:['#fff3d6','#ffd9c9','#d3f0d2','#c4e5f8','#ffeaa6','#e6d9f8'],
  roof:['#c0583e','#3a6ea5','#2f8f6a','#e8892b','#7a4a8a','#b8493d'],
  door:['#e3342f','#3a6ea5','#8a5a34','#2f8f6a','#f7a440','#7a4a8a'],
  wood:'#a6682f',trunk:'#8a5a34',leaf:['#6fc15c','#58ad4f','#8bd17c','#4a9b4a'],
  glass:'#9bd6f2',glassDark:'#6aa3c4',stone:'#d9ccb2',metal:'#3b3f4a',bulb:'#fff0b8'
};

const SHIRTS=[{n:'Jingga',c:'#ff8a5c'},{n:'Biru',c:'#6cc3f5'},{n:'Kuning',c:'#ffd166'},{n:'Hijau',c:'#8bd17c'},
  {n:'Ungu',c:'#c79bf2'},{n:'Pink',c:'#ff9fb8'},{n:'Tosca',c:'#5fd0c5'},{n:'Oranye',c:'#f7a440'}];
const HAIRS=[{n:'Cokelat',c:'#6b3f22'},{n:'Hitam',c:'#2b1a0e'},{n:'Cokelat tua',c:'#4a2e1c'}];

/* ---------- peta ---------- */
const BOUNDS={x0:-117,x1:117,z0:-145,z1:104};
const SPAWN={x:0,z:90,yaw:Math.PI};          // yaw π = menghadap utara
const ARCH_Z=82;                                // gerbang Kota Neo

const ROADS=[
  {id:'ave',x0:-7,x1:7,z0:-113,z1:135,paint:'z',walk:true},   // Jl. Neo Raya (trotoar)
  {id:'s1',x0:-73,x1:73,z0:-65,z1:-55,paint:'x'},
  {id:'s2',x0:-73,x1:73,z0:-113,z1:-103,paint:'x'},
  {id:'rw',x0:-73,x1:-63,z0:-113,z1:70,paint:'z',end:70},
  {id:'re',x0:63,x1:73,z0:-113,z1:70,paint:'z',end:70}
];

/* tiga komplek, masing-masing 4 rumah berhadapan (2 kiri + 2 kanan) */
const COMPLEXES=[
  {id:'A',s:-1,zc:44},   // barat jalan utama
  {id:'B',s:1,zc:44},    // timur jalan utama
  {id:'C',s:1,zc:-4}     // timur, lebih ke utara
];
const CX={gate:11,front:5.3,wallEnd:59.5,tamanX0:47,tamanX1:59};
for(const c of COMPLEXES){
  c.name='Komplek '+c.id;
  c.rect={x0:Math.min(c.s*CX.gate,c.s*CX.wallEnd),x1:Math.max(c.s*CX.gate,c.s*CX.wallEnd),z0:c.zc-20.5,z1:c.zc+20.5};
  c.gateX=c.s*(CX.gate+1);
  c.street={id:'st'+c.id,x0:Math.min(c.s*7,c.s*47),x1:Math.max(c.s*7,c.s*47),z0:c.zc-3,z1:c.zc+3,paint:'x',inner:true};
  ROADS.push(c.street);
}

const HOUSE_STYLE=[ // 12 gaya: A-1..A-4, B-1..B-4, C-1..C-4
  {type:'gable',wall:0,roof:0,door:1},{type:'modern',wall:3,roof:1,door:0},{type:'hip',wall:1,roof:3,door:2},{type:'gable',wall:2,roof:2,door:4},
  {type:'modern',wall:5,roof:4,door:3},{type:'gable',wall:4,roof:5,door:1},{type:'hip',wall:3,roof:0,door:0},{type:'modern',wall:0,roof:2,door:5},
  {type:'hip',wall:2,roof:1,door:4},{type:'gable',wall:1,roof:4,door:2},{type:'modern',wall:4,roof:3,door:1},{type:'hip',wall:5,roof:2,door:0}
];
const HOUSES=[];
function lw(h,lx,lz){const c=Math.cos(h.yaw),s=Math.sin(h.yaw);return [h.cx+lx*c+lz*s,h.cz-lx*s+lz*c]} // lokal rumah → dunia
COMPLEXES.forEach((c,ci)=>{
  for(let n=1;n<=4;n++){
    const north=(n%2===1),lot=(n-1)>>1;
    const h={id:c.id+'-'+n,c:c.id,n,north,lot,cx:c.s*(24.5+15*lot),cz:c.zc+(north?-13.5:13.5),yaw:north?0:Math.PI,style:HOUSE_STYLE[ci*4+n-1],lit:false};
    h.door=lw(h,1.6,4.05); h.spot=lw(h,1.6,6.4);
    h.lit=((ci*4+n)*7%5)<2;               // sebagian kecil rumah lampunya menyala
    HOUSES.push(h);
  }
});
const HOUSE_BY_ID={};for(const h of HOUSES)HOUSE_BY_ID[h.id]=h;

/* lahan kosong untuk episode berikutnya */
/* Sekolah Neo (sudah dibangun: 1 kelas + lapangan + kantin). Pagar keliling, satu-satunya pintu = gerbang di sisi timur (z = gz). */
const SCHOOL={x0:-62,z0:-50,x1:-14,z1:-8,gz:-29};
const LOTS=[
  {id:'bermain',name:'TAMAN BERMAIN',sub:'EPISODE BERIKUTNYA',x0:-62,z0:-100,x1:-14,z1:-70,face:'+x'},
  {id:'bioskop',name:'BIOSKOP NEO',sub:'SEGERA HADIR',x0:14,z0:-52,x1:50,z1:-32,face:'-x'},
  {id:'pasar',name:'PASAR MALAM',sub:'SEGERA HADIR',x0:14,z0:-100,x1:60,z1:-70,face:'-x'},
  {id:'hiburan',name:'TAMAN HIBURAN',sub:'SEGERA HADIR',x0:80,z0:-98,x1:116,z1:-30,face:'-x'},
  {id:'mall',name:'MALL NEO',sub:'BELUM DIBUKA',x0:-62,z0:-145,x1:62,z1:-118,face:'+z'}
];
for(const l of LOTS)l.text=l.name+' — '+l.sub;

/* ---------- misi ---------- */
const QUEST_STEPS=[
  {t:()=>'Masuk ke Kota Neo lewat gerbang'},
  {t:()=>'Temui Pak Satpam di pos gerbang'},
  {t:p=>'Masuk ke '+HOUSE_BY_ID[p.house].cname},
  {t:p=>'Temukan rumah nomor '+questTargetId(p)},
  {t:()=>'Baca papan pembangunan di salah satu lahan kosong'},
  {t:p=>'Kembali ke rumahmu ('+p.house+')'}
];
for(const h of HOUSES)h.cname='Komplek '+h.c;
function questTargetId(p){const h=HOUSE_BY_ID[p.house];const m=h.n<=2?h.n+2:h.n-2;return h.c+'-'+m}

/* ---------- NPC ---------- */
const NPC_DEFS=[
  {id:'satpam',name:'Pak Satpam',role:'Penjaga Gerbang',shirt:'#3a6ea5',hair:'#2b1a0e',skin:'#e8b98f',style:'cap',cap:'#2b3a55',vest:'#ffd23f',
   pts:[[9.2,75.5],[9.2,79]],mode:'ping',speed:.7,wait:[3,6],
   lines:['Selamat datang di Kota Neo! Kotanya masih sepi, jadi santai saja.','Jalan utama lurus ke utara. Banyak lahan proyek, hati-hati ya.']},
  {id:'rina',name:'Bu Rina',role:'Warga Komplek A',shirt:'#ff9fb8',hair:'#2b1a0e',skin:'#ffd9b8',style:'bun',dress:true,
   pts:[[-8.6,68],[-8.6,14]],mode:'ping',speed:1.1,wait:[2,5],
   lines:['Komplek ini baru dibuka, lho. Anginnya enak sekali kalau pagi.','Aku suka jalan kaki di sini. Sepi, tidak ada klakson.']},
  {id:'kevin',name:'Kevin',role:'Warga Komplek A',shirt:'#6cc3f5',hair:'#4a2e1c',skin:'#e8b98f',style:'short',bag:'#e3342f',
   pts:[[-14,40.3],[-45,40.3]],mode:'ping',speed:1.3,wait:[1.5,4],
   lines:['Sekolahnya sudah ada satu kelas, lho. Ayo mampir ke sana!','Aku lagi menghafal nomor rumah. Semuanya mirip-mirip, ya?']},
  {id:'sari',name:'Mbak Sari',role:'Warga Komplek B',shirt:'#c79bf2',hair:'#6b3f22',skin:'#ffd9b8',style:'long',dress:true,
   pts:(()=>{const a=[];for(let i=0;i<8;i++){const t=i/8*Math.PI*2;a.push([53+Math.cos(t)*5.4,44+Math.sin(t)*5.4])}return a})(),mode:'loop',speed:1,wait:[.5,2],
   lines:['Katanya mall akan dibuat di sebelah utara. Besar sekali!','Tamannya kosong, tapi justru enak buat duduk-duduk.']},
  {id:'joko',name:'Pak Joko',role:'Warga Komplek C',shirt:'#8bd17c',hair:'#2b1a0e',skin:'#c98d62',style:'cap',cap:'#e3342f',
   pts:[[16,-2.8],[44,-2.8]],mode:'ping',speed:1.2,wait:[2,5],
   lines:['Kota Neo masih menunggu warga pertama. Itu kamu, kan?','Tiap sore lampu jalan menyala sendiri. Rapi sekali.']},
  {id:'dina',name:'Dina',role:'Pejalan Kaki',shirt:'#ffd166',hair:'#2b1a0e',skin:'#ffd9b8',style:'long',
   pts:[[8.6,-9],[8.6,-48]],mode:'ping',speed:1.2,wait:[2,4],
   lines:['Katanya bakal ada bioskop sama pasar malam. Aku sudah tidak sabar!','Jalannya lebar-lebar, tapi masih kosong. Nanti pasti ramai.']},
  {id:'guru',name:'Bu Guru Ani',role:'Guru Sekolah Neo',shirt:'#ff9fb8',hair:'#2b1a0e',skin:'#ffd9b8',style:'bun',dress:true,
   pts:[[-19.5,-40],[-19.5,-18]],mode:'ping',speed:.9,wait:[3,6],
   lines:['Selamat datang di Sekolah Neo! Baru ada satu kelas, tapi nanti akan bertambah.','Kalau dananya terkumpul, nanti ada kelas SD, SMP, dan SMA.','Silakan masuk ke kelas dan duduk di bangku mana saja.']},
  {id:'kantin',name:'Bu Kantin',role:'Penjaga Kantin',shirt:'#ffd166',hair:'#4a2e1c',skin:'#e8b98f',style:'bun',dress:true,
   pts:[[-57,-36.3],[-55.6,-36.3]],mode:'ping',speed:.4,wait:[2,5],
   lines:['Selamat datang di kantin! Menunya nasi goreng, mie ayam, es teh, dan gorengan.','Belum bisa beli dulu ya. Sistem uangnya nanti di episode berikutnya.']}
];

/* ---------- TikTok, jaringan, pengumuman ---------- */
const TIKTOK={handle:'@kotaneoid',url:'https://www.tiktok.com/@kotaneoid'};
const NET_CFG={maxShown:25,sendMoving:.25,heartbeat:5,chatMax:140,chatGap:1.2,chatKeep:40};
// daftar kata dari server proyek ZIP (pagar.mjs)
const BAD_WORDS=["anjing","anjg","babi","kontol","kntl","memek","mmk","ngentot","ngewe","bangsat","bajingan","goblok","tolol","kampret","asu","jancok","jancuk","pepek","lonte","pelacur","fuck","shit","bitch","porn","bokep","sex","seks","xxx","judi","slot","gacor","togel","casino","maxwin","scam","nazi"];
function badText(t){
  const low=String(t).toLowerCase(),tokens=low.split(/[^a-z0-9]+/).filter(Boolean);
  for(const w of BAD_WORDS){if(w.length<=4){if(tokens.includes(w))return true}else if(tokens.some(k=>k.includes(w)))return true}
  const flat=low.replace(/[^a-z0-9]/g,'');return BAD_WORDS.some(w=>w.length>=6&&flat.includes(w));
}
/* isi bawaan papan pengumuman; dibaca ulang dari data/pengumuman.json (GitHub) saat game dibuka */
const ANNOUNCE_DEFAULT={
  updated:'2026-11-17',
  proyek:{nama:'Sekolah Neo',sub:'SD · SMP · SMA satu atap',targetJuta:2000,terkumpulJuta:0,perShareJuta:2,tahap:'Penggalangan dana',
    rincian:[
      {item:'Bangunan 277 m² (3 kelas, ruang guru, kantin, toilet)',juta:1662},
      {item:'Biaya penunjang 5%',juta:83},
      {item:'Meja, kursi, papan tulis, perlengkapan',juta:150},
      {item:'Pagar, paving, lampu, tiang bendera',juta:105}]},
  berikutnya:['Taman Bermain','Bioskop Neo','Pasar Malam','Taman Hiburan','Mall Neo'],
  catatan:'Dana pembangunan hanya angka di dalam game, bukan donasi uang sungguhan. Hanya SHARE video yang dihitung; like dan follow tidak.'
};
const fmtJuta=n=>'Rp '+Number(n).toLocaleString('id-ID')+' juta';

/* papan pengumuman: dibaca dari data/pengumuman.json (diedit GitHub / Actions); bila gagal pakai isi bawaan */
const Announce={
  data:ANNOUNCE_DEFAULT,stats:null,
  async load(){
    const get=async f=>{const c=new AbortController(),to=setTimeout(()=>c.abort(),2500);
      try{const r=await fetch(DATA_BASE+f+'?v='+Date.now(),{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error('http');return await r.json()}finally{clearTimeout(to)}};
    try{const d=await get('pengumuman.json');if(d&&d.proyek)this.data=Object.assign({},ANNOUNCE_DEFAULT,d,{proyek:Object.assign({},ANNOUNCE_DEFAULT.proyek,d.proyek)})}catch(e){}
    try{this.stats=await get('stats.json')}catch(e){}
  },
  pct(){const p=this.data.proyek;return Math.max(0,Math.min(100,Math.round(p.terkumpulJuta/p.targetJuta*1000)/10))}
};

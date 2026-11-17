# KOTA NEO — v1.1 (Episode 1 + persiapan Episode 2: Proyek Sekolah Neo)

Game web 3D low-poly cartoon. Native WebGL2 + shader GLSL custom, mesh prosedural, canvas texture, kamera & collision custom.
Satu kode untuk semua perangkat: Android, iPhone, tablet, PC (portrait & landscape).

## Menjalankan
- Uji cepat: `python3 -m http.server 8080` lalu buka http://localhost:8080 (atau buka `index.html` langsung; fitur dasar tetap jalan).
- Deploy & multiplayer: ikuti **SETUP.md** (Firebase + GitHub Pages + GitHub Actions).
- Parameter URL untuk uji: `?jam=21` (paksa jam WIB), `?auto=0` (matikan mode Hemat otomatis).

## Yang baru di v1.1
- **Joystick tetap** di kiri bawah (tidak berpindah, selalu terlihat). Putar kamera lewat sentuhan di luar joystick & tombol.
- **Tombol tidak saling menimpa**: LARI/LOMPAT/AKSI tersusun di kanan bawah; label interaksi muncul di atas semua kontrol.
  Dialog/kartu/chat penuh otomatis menyembunyikan kontrol. Diuji di 9 ukuran layar (360×640 … 1920×1080).
- **Layar pilih karakter**: karakter dibingkai di area yang tidak tertutup panel (portrait: di atas panel, landscape: panel di kanan).
- **Wajib follow TikTok @kotaneoid** (teks + tombol "Buka TikTok", tanpa deteksi) setiap game dibuka.
- **Multiplayer**: pemain lain terlihat (nama di atas kepala), **chat global + balas pesan**, gelembung chat di atas kepala, filter kata, batas kecepatan.
- **Database GitHub otomatis**: GitHub Actions menyalin profil warga dari Firebase ke `data/profiles.json` tiap ±5 menit (hanya commit bila berubah).
- **Papan Pengumuman** (3D di dekat pintu masuk + menu): Proyek Sekolah Neo (SD · SMP · SMA satu atap), target Rp 2.000 juta,
  rincian biaya, progres. Angka diedit manual di `data/pengumuman.json`. Hanya share yang dihitung (1 share = Rp 2 juta).
- **Duduk di bangku**: dekati bangku → tombol AKSI "Duduk"; geser joystick untuk berdiri. Pemain lain terlihat duduk.
- **Mode Hemat otomatis** bila FPS rendah; FOV menyesuaikan layar sempit.
- Mode tamu dihapus. Username bebas & boleh kembar (pembeda: ID Warga Neo).

## Struktur
`index.html` · `styles.css` · `config.js` (isi Firebase) · `data.js` · `save.js` · `collision.js` · `renderer.js` · `camera.js` · `player.js` (kontrol+karakter) ·
`net.js` (multiplayer+chat) · `npc.js` · `world.js` · `ui.js` · `main.js`
Folder: `data/` (pengumuman, profil, statistik) · `scripts/snapshot.mjs` · `.github/workflows/snapshot.yml` · `database.rules.json` · `SETUP.md`

## Kontrol
- PC: WASD/panah · Shift lari · Spasi lompat · E aksi · C kamera atas · T chat · seret mouse putar kamera · scroll zoom · Esc menu
- HP: joystick kiri · geser layar (di luar joystick) untuk kamera · cubit zoom · tombol LARI, LOMPAT, AKSI, Chat, Atas, Menu

## Batas yang perlu diketahui
- Tanpa isi `config.js` game berjalan dalam **mode uji lokal** (multiplayer hanya antar tab browser). Mode Firebase diuji dengan Firebase tiruan, belum dengan server Firebase asli.
- Identitas terikat perangkat (login anonim Firebase). Menghapus data browser = warga baru; kode pemulihan belum ada.
- Repo publik: `data/profiles.json` terlihat umum (username, ID, rumah, warna). Chat tidak disimpan di GitHub.
- Interior rumah & bangunan sekolah belum dibuat; sekolah muncul bertahap setelah dana dari video terkumpul.

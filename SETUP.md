# Pasang multiplayer + database GitHub (sekali saja)

Rancangan: **Firebase** untuk real-time (posisi pemain, chat) · **GitHub** untuk penyimpanan permanen & hosting
(GitHub Actions menyalin profil warga ke `data/profiles.json` tiap ±5 menit, hanya commit kalau ada perubahan).
Browser tidak pernah menulis ke GitHub langsung, jadi tidak ada token yang bocor.

## 1. Firebase (gratis, paket Spark)
1. https://console.firebase.google.com → **Add project**.
2. **Build → Realtime Database → Create database** → lokasi **Singapore (asia-southeast1)** → mulai di *locked mode*.
3. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**.
4. **Project settings (ikon roda gigi) → Your apps → `</>` Web** → daftarkan app → salin `firebaseConfig`.
5. Buka `config.js`, isi `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` dari config tadi.
6. **Realtime Database → Rules** → tempel isi `database.rules.json` → **Publish**.
7. **Authentication → Settings → Authorized domains** → tambahkan `USERNAME.github.io` (domain GitHub Pages kamu).

## 2. GitHub (repo publik kamu)
1. Unggah **semua isi folder ini** ke root repo (termasuk folder `.github`, `data`, `scripts`).
2. **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**.
3. **Settings → Secrets and variables → Actions → tab Variables → New repository variable**
   - Name: `FIREBASE_DB_URL` · Value: isi `databaseURL` dari Firebase (mis. `https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app`).
4. **Settings → Actions → General → Workflow permissions → Read and write permissions → Save**.
5. Tab **Actions → snapshot-data → Run workflow** untuk mencoba pertama kali.

## 3. Update papan pengumuman (manual)
Edit `data/pengumuman.json` langsung di GitHub (ikon pensil): ubah `terkumpulJuta`, `tahap`, `perShareJuta`, `updated`.
Game membaca file ini setiap dibuka. Hanya share video yang dihitung (1 share = `perShareJuta` juta); like/follow tidak.

## Batas & catatan jujur
- Tanpa isi `config.js`, game tetap jalan: mode **uji lokal** (multiplayer antar tab browser saja) agar bisa dicoba.
- Firebase Spark: ±100 koneksi bersamaan dan kuota unduh bulanan. Posisi dikirim ±4×/detik hanya saat bergerak;
  kalau pemain sangat ramai, naikkan ke paket Blaze atau turunkan `NET_CFG.maxShown` / `sendMoving` di `data.js`.
- Repo publik ⇒ `data/profiles.json` terlihat siapa pun (isi: username, ID Warga, rumah, warna). Riwayat **chat tidak disimpan** di GitHub.
- Username bebas & boleh kembar; pembedanya ID Warga Neo. Identitas terikat perangkat/browser (login anonim);
  menghapus data browser = jadi warga baru. Kode pemulihan bisa ditambah nanti.
- GitHub Actions jadwal bisa telat beberapa menit saat server GitHub sibuk.

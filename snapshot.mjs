// Mengambil data profil warga dari Firebase Realtime Database (REST, tanpa rahasia)
// lalu menulis data/profiles.json & data/stats.json. Dijalankan GitHub Actions tiap ~5 menit.
import {writeFileSync, readFileSync, existsSync} from 'node:fs';

const base = (process.env.FIREBASE_DB_URL || '').replace(/\/+$/, '');
if (!base) { console.log('FIREBASE_DB_URL belum diisi — dilewati.'); process.exit(0); }

const res = await fetch(`${base}/profiles.json`);
if (!res.ok) { console.error('Gagal membaca database:', res.status); process.exit(1); }
const raw = (await res.json()) || {};

// kunci = ID Warga Neo (bukan uid), urut abjad supaya diff stabil
const out = {};
for (const p of Object.values(raw)) {
  if (!p || typeof p.id !== 'string' || typeof p.n !== 'string') continue;
  out[p.id] = {n: p.n.slice(0, 24), h: p.h || '', s: p.s || '', r: p.r || '', c: p.c || 0};
}
const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
const put = (file, obj) => {
  const txt = JSON.stringify(obj, null, 2) + '\n';
  if (!existsSync(file) || readFileSync(file, 'utf8') !== txt) writeFileSync(file, txt);
};
put('data/profiles.json', sorted);
put('data/stats.json', {warga: Object.keys(sorted).length});
console.log('Warga tersimpan:', Object.keys(sorted).length);

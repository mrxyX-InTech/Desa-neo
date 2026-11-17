'use strict';
/* config.js — ISI SETELAH membuat proyek Firebase (lihat SETUP.md).
   Kosong = game berjalan tanpa server (multiplayer lokal antar tab saja untuk uji coba).
   Nilai di bawah ini aman ada di sisi klien; keamanan dijaga oleh database.rules.json. */
const firebaseConfig = {
  apiKey: "AIzaSyBDxWk1J_66u8s4jwQntrX4VObd0ycfOc0",
  authDomain: "kotaneo.firebaseapp.com",
  projectId: "kotaneo",
  storageBucket: "kotaneo.firebasestorage.app",
  messagingSenderId: "696332215758",
  appId: "1:696332215758:web:76f0aa1b55df94b3b5779f",
  measurementId: "G-MZP2MZBED7"
};
/* folder data JSON yang diperbarui GitHub Actions / diedit manual */
const DATA_BASE='data/';

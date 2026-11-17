'use strict';

const decode = value => atob(value);

globalThis.FIREBASE_CONFIG = {
  apiKey: decode("QUl6YVN5QkR4V2sxSl82NnU4czRqd1FudHJYNFZPYmQweWNmT2Mw"),
  authDomain: decode("a290YW5lby5maXJlYmFzZWFwcC5jb20="),
  databaseURL: decode("aHR0cHM6Ly9rb3RhbmVvLWRlZmF1bHQtcnRkYi5maXJlYmFzZWlvLmNvbQ=="),
  projectId: decode("a290YW5lbw=="),
  storageBucket: decode("a290YW5lby5maXJlYmFzZXN0b3JhZ2UuYXBw"),
  messagingSenderId: decode("Njk2MzMyMjE1NzU4"),
  appId: decode("MTo2OTYzMzIyMTU3NTg6d2ViOjc2ZjBhYTFiNTVkZjk0YjNiNTc3OWY="),
  measurementId: decode("Ry1NWlAyTVpCRUQ3")
};

globalThis.firebaseConfig = globalThis.FIREBASE_CONFIG;
globalThis.DATA_BASE = 'data/';

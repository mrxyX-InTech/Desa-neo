
'use strict';

/* =========================================================
   KOTA NEO — MULTIPLAYER & CHAT
   Firebase Realtime Database + Anonymous Authentication
   LocalTransport sebagai fallback pengujian antar-tab.
========================================================= */

const angD = (a, b) => {
  let e = a - b;
  while (e > Math.PI) e -= 2 * Math.PI;
  while (e < -Math.PI) e += 2 * Math.PI;
  return e;
};

/* =========================================================
   FIREBASE CONFIG
========================================================= */

function netConfig() {
  let c =
    globalThis.FIREBASE_CONFIG ||
    globalThis.firebaseConfig;

  if (!c && typeof FIREBASE_CONFIG !== 'undefined') {
    c = FIREBASE_CONFIG;
  }

  return c || {};
}

/* =========================================================
   ERROR HANDLER
========================================================= */

function explainErr(e) {
  const code = String(e?.code || e?.name || '');
  const message = String(e?.message || e || '');
  const s = (code + ' ' + message).toLowerCase();

  if (
    s.includes('operation-not-allowed') ||
    s.includes('admin-restricted')
  ) {
    return 'Anonymous Authentication belum aktif.';
  }

  if (s.includes('configuration-not-found')) {
    return 'Firebase Authentication belum dikonfigurasi.';
  }

  if (s.includes('unauthorized-domain')) {
    return 'Domain belum diizinkan di Firebase Authentication.';
  }

  if (
    s.includes('permission_denied') ||
    s.includes('permission denied')
  ) {
    return 'Database Rules menolak akses.';
  }

  if (s.includes('already exists')) {
    return 'Firebase App sudah pernah diinisialisasi.';
  }

  if (
    s.includes('network') ||
    s.includes('failed to fetch')
  ) {
    return 'Koneksi jaringan ke Firebase gagal.';
  }

  if (s.includes('timeout')) {
    return 'Koneksi Firebase mengalami timeout.';
  }

  return code
    ? code + ': ' + message
    : message;
}

/* =========================================================
   LOCAL TRANSPORT
   Untuk pengujian antar-tab pada browser yang sama.
========================================================= */

class LocalTransport {

  connect(me, cb) {
    this.cb = cb;

    this.uid =
      sessionStorage.getItem('kn.uid') ||
      ('L' + Math.random().toString(36).slice(2, 9));

    sessionStorage.setItem('kn.uid', this.uid);

    this.bc = new BroadcastChannel('kotaneo-net');
    this.last = null;

    this.bc.onmessage = e => {
      const m = e.data;

      if (!m || m.u === this.uid) return;

      if (m.t === 'pres') {
        cb.player('change', m.u, m.d);
      } else if (m.t === 'bye') {
        cb.player('remove', m.u);
      } else if (m.t === 'hello' && this.last) {
        this.bc.postMessage({
          t: 'pres',
          u: this.uid,
          d: this.last
        });
      } else if (m.t === 'chat') {
        cb.chat(m.k, m.m, false);
      }
    };

    this.bc.postMessage({
      t: 'hello',
      u: this.uid
    });

    addEventListener('pagehide', () => {
      try {
        this.bc.postMessage({
          t: 'bye',
          u: this.uid
        });
      } catch (e) {}
    });

    try {
      JSON.parse(
        localStorage.getItem('kotaneo.localchat') || '[]'
      )
        .slice(-NET_CFG.chatKeep)
        .forEach(x => cb.chat(x.k, x.m, true));
    } catch (e) {}

    return Promise.resolve(this.uid);
  }

  setPresence(d) {
    this.last = d;

    this.bc.postMessage({
      t: 'pres',
      u: this.uid,
      d
    });
  }

  pushChat(m) {
    const k =
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 5);

    m.t = Date.now();

    this.bc.postMessage({
      t: 'chat',
      k,
      m
    });

    this.cb.chat(k, m, false);

    try {
      const a = JSON.parse(
        localStorage.getItem('kotaneo.localchat') || '[]'
      );

      a.push({ k, m });

      localStorage.setItem(
        'kotaneo.localchat',
        JSON.stringify(a.slice(-NET_CFG.chatKeep))
      );
    } catch (e) {}
  }

  saveProfile() {}

  close() {
    try {
      this.bc.postMessage({
        t: 'bye',
        u: this.uid
      });

      this.bc.close();
    } catch (e) {}
  }
}

/* =========================================================
   FIREBASE TRANSPORT
========================================================= */

class FirebaseTransport {

  async connect(me, cb, cfg) {
    const d = cb.diag;
    const base =
      'https://www.gstatic.com/firebasejs/10.12.2/';

    this.cb = cb;

    let A, Au, D;

    /* Load Firebase SDK */

    try {
      [A, Au, D] = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-database.js')
      ]);

      d('Memuat Firebase SDK', true);

    } catch (e) {
      d('Memuat Firebase SDK', false, explainErr(e));
      throw e;
    }

    this.D = D;

    let app, auth;

    /* Initialize Firebase */

    try {
      const apps = A.getApps();

      app = apps.length
        ? A.getApp()
        : A.initializeApp(cfg);

      auth = Au.getAuth(app);

      if (
        app.options.projectId &&
        app.options.projectId !== cfg.projectId
      ) {
        throw new Error(
          'Firebase App menggunakan project yang berbeda.'
        );
      }

      d(
        'Inisialisasi Firebase',
        true,
        cfg.projectId || ''
      );

    } catch (e) {
      d(
        'Inisialisasi Firebase',
        false,
        explainErr(e)
      );

      throw e;
    }

    /* Anonymous Authentication */

    try {
      if (auth.currentUser) {
        this.uid = auth.currentUser.uid;
      } else {
        const cred = await Au.signInAnonymously(auth);
        this.uid = cred.user.uid;
      }

      d('Login anonim', true);

    } catch (e) {
      d('Login anonim', false, explainErr(e));
      throw e;
    }

    /* Realtime Database */

    this.db = D.getDatabase(app);

    this.meRef = D.ref(
      this.db,
      'players/' + this.uid
    );

    D.onDisconnect(this.meRef)
      .remove()
      .catch(e => {
        console.warn('[KOTANEO] onDisconnect:', e);
      });

    /* Player listeners */

    const bad = step => e => {
      console.error('[KOTANEO ' + step + ']', e);
      d(step, false, explainErr(e));
    };

    const pr = D.ref(this.db, 'players');

    D.onChildAdded(
      pr,
      s => cb.player('add', s.key, s.val()),
      bad('Baca data pemain')
    );

    D.onChildChanged(
      pr,
      s => cb.player('change', s.key, s.val()),
      bad('Baca data pemain')
    );

    D.onChildRemoved(
      pr,
      s => cb.player('remove', s.key, null),
      bad('Baca data pemain')
    );

    if (D.get) {
      D.get(pr)
        .then(() => d('Baca data pemain', true))
        .catch(bad('Baca data pemain'));
    }

    /* Chat listener */

    const q = D.query(
      D.ref(this.db, 'chat'),
      D.orderByChild('t'),
      D.limitToLast(NET_CFG.chatKeep)
    );

    const born = Date.now();

    D.onChildAdded(
      q,
      s => {
        const m = s.val();

        cb.chat(
          s.key,
          m,
          !m || !m.t || m.t < born - 2000
        );
      },
      bad('Baca chat')
    );

    return this.uid;
  }

  /* Database write diagnostic */

  _w(step, promise) {
    return promise
      .then(() => {
        if (!this['ok_' + step]) {
          this['ok_' + step] = true;
          this.cb.diag(step, true);
        }
      })
      .catch(e => {
        console.error(
          '[KOTANEO ' + step + ']',
          {
            code: e.code,
            message: e.message,
            error: e
          }
        );

        this.cb.diag(
          step,
          false,
          explainErr(e)
        );
      });
  }

  /* Write player presence */

  setPresence(d) {
    return this._w(
      'Tulis posisi',
      this.D.set(this.meRef, d)
    );
  }

  /* Send chat */

  pushChat(m) {
    const D = this.D;

    const ref = D.push(
      D.ref(this.db, 'chat')
    );

    const message = {
      u: m.u,
      n: m.n,
      m: m.m,
      r: m.r || null,
      t: D.serverTimestamp()
    };

    console.log(
      '[KOTANEO] Mengirim chat:',
      {
        uid: this.uid,
        message
      }
    );

    return this._w(
      'Kirim chat',
      D.set(ref, message)
    );
  }

  /* Save profile */

  saveProfile(p) {
    return this._w(
      'Simpan profil',
      this.D.set(
        this.D.ref(
          this.db,
          'profiles/' + this.uid
        ),
        p
      )
    );
  }

  /* Close connection */

  close() {
    try {
      if (this.D && this.meRef) {
        this.D.remove(this.meRef);
      }
    } catch (e) {
      console.warn('[KOTANEO] Close:', e);
    }
  }
}

/* =========================================================
   MAIN NETWORK SYSTEM
========================================================= */

const Net = {

  mode: 'off',
  tr: null,
  uid: null,
  ready: false,
  me: null,

  players: new Map(),
  chat: [],
  keys: new Set(),

  diag: [],
  error: '',

  _t: 0,
  _hb: 0,
  _last: null,
  _lastSend: 0,

  onChat: null,
  onFail: null,

  /* Diagnostic recorder */

  _d(step, ok, msg) {
    const i = this.diag.findIndex(
      x => x.step === step
    );

    const r = {
      step,
      ok,
      msg: msg || ''
    };

    if (i >= 0) {
      this.diag[i] = r;
    } else {
      this.diag.push(r);
    }

    if (!ok) {
      console.warn(
        '[Net] ' + step + ': ' + msg
      );

      if (!this.error) {
        this.error = msg;
      }

      if (this.onFail && this.ready) {
        this.onFail(step, msg);
      }
    }
  },

  /* Start multiplayer */

  async start(profile) {
    if (this.ready) return;

    this.diag = [];
    this.error = '';

    this.me = {
      n: profile.username,
      id: profile.id,
      s: profile.shirt,
      h: profile.hair
    };

    const cb = {
      player: (t, u, d) =>
        this._player(t, u, d),

      chat: (k, m, h) =>
        this._chat(k, m, h),

      diag: (s, o, m) =>
        this._d(s, o, m)
    };

    const cfg = netConfig();

    const fb = !!(
      cfg.apiKey &&
      cfg.databaseURL
    );

    this._d(
      'Konfigurasi Firebase',
      fb,
      fb
        ? cfg.projectId || ''
        : 'Firebase config tidak ditemukan.'
    );

    try {
      this.tr = fb
        ? new FirebaseTransport()
        : new LocalTransport();

      this.mode = fb ? 'firebase' : 'local';

      this.uid = await Promise.race([
        this.tr.connect(this.me, cb, cfg),

        new Promise((_, reject) => {
          setTimeout(
            () => reject(
              new Error(
                'timeout: tidak ada respons dari Firebase'
              )
            ),
            12000
          );
        })
      ]);

      this.ready = true;

      this.tr.saveProfile({
        n: profile.username,
        id: profile.id,
        h: profile.house,
        s: profile.shirt,
        r: profile.hair,
        c: profile.created
      });

    } catch (e) {
      console.error(
        '[KOTANEO] Multiplayer gagal:',
        e
      );

      this.ready = false;
      this.mode = 'off';

      if (!this.error) {
        this.error = explainErr(e);
      }

      try {
        this.tr && this.tr.close();
      } catch (_) {}
    }
  },

  /* Reconnect */

  async retry() {
    try {
      this.tr && this.tr.close();
    } catch (e) {}

    this.tr = null;
    this.ready = false;

    this.players.clear();
    this.keys.clear();
    this.chat.length = 0;

    this._last = null;

    if (Save.profile) {
      await this.start(Save.profile);
    }
  },

  online() {
    return this.ready
      ? this.players.size + 1
      : 0;
  },

  label() {
    return {
      firebase: 'Online',
      local: 'Uji lokal',
      off: 'Offline'
    }[this.mode];
  },

  /* Player synchronization */

  _player(type, uid, d) {
    if (uid === this.uid) return;

    if (type === 'remove') {
      this.players.delete(uid);
      return;
    }

    if (
      !d ||
      typeof d.x !== 'number' ||
      typeof d.z !== 'number'
    ) {
      return;
    }

    let p = this.players.get(uid);

    if (!p) {
      p = {
        uid,
        x: d.x,
        z: d.z,
        yaw: d.y || 0,
        phase: 0,
        amt: 0,
        bubble: null,
        name: '',
        tag: null,
        sit: 0
      };

      this.players.set(uid, p);
    }

    p.tx = d.x;
    p.tz = d.z;
    p.tyaw = d.y || 0;
    p.sit = d.o ? 1 : 0;
    p.last = performance.now();

    const nm = String(
      d.n || 'warga'
    ).slice(0, 24);

    if (nm !== p.name) {
      p.name = nm;
      p.tag = nameTex(
        nm,
        '#fff8e6',
        '#2b1a0e'
      );
    }

    p.look = {
      shirt: /^#[0-9a-f]{6}$/i.test(d.s)
        ? d.s
        : '#6cc3f5',

      hair: /^#[0-9a-f]{6}$/i.test(d.h)
        ? d.h
        : '#2b1a0e',

      skin: '#ffd9b8',
      style: 'short'
    };
  },

  /* Receive chat */

  _chat(key, m, hist) {
    if (
      !m ||
      typeof m.m !== 'string' ||
      this.keys.has(key)
    ) {
      return;
    }

    this.keys.add(key);

    const msg = {
      k: key,
      u: String(m.u || ''),
      n: String(m.n || 'warga').slice(0, 24),
      m: m.m.slice(0, NET_CFG.chatMax),
      t: m.t || Date.now(),

      r: m.r && m.r.m
        ? {
            k: String(m.r.k || ''),
            n: String(m.r.n || '').slice(0, 24),
            m: String(m.r.m).slice(0, 60)
          }
        : null,

      hist: !!hist
    };

    this.chat.push(msg);

    if (
      this.chat.length >
      NET_CFG.chatKeep * 2
    ) {
      this.chat.shift();
    }

    if (!hist) {
      const w = msg.u === this.uid
        ? P
        : this.players.get(msg.u);

      if (w) {
        w.bubble = {
          text: msg.m,
          until: performance.now() + 6500,
          tex: null
        };
      }
    }

    if (this.onChat) {
      this.onChat(msg);
    }
  },

  /* Send chat */

  send(text, reply) {
    text = String(text || '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!this.ready) {
      return 'Chat belum tersambung. Menu → Cek Multiplayer.';
    }

    if (!text) return '';

    if (text.length > NET_CFG.chatMax) {
      return 'Pesan terlalu panjang.';
    }

    if (badText(text)) {
      return 'Pesan mengandung kata yang tidak boleh dipakai.';
    }

    const now = performance.now();

    if (
      now - this._lastSend <
      NET_CFG.chatGap * 1000
    ) {
      return 'Pelan-pelan ya, tunggu sebentar.';
    }

    this._lastSend = now;

    this.tr.pushChat({
      u: this.uid,
      n: this.me.n,
      m: text,

      r: reply
        ? {
            k: reply.k,
            n: reply.n,
            m: String(reply.m || '').slice(0, 60)
          }
        : null
    });

    return '';
  },

  /* Main update tick */

  tick(dt, pl) {
    if (!this.ready) return;

    this._t += dt;
    this._hb += dt;

    const o = pl.sit ? 1 : 0;
    const L = this._last;

    const moved =
      !L ||
      Math.hypot(pl.x - L.x, pl.z - L.z) > 0.08 ||
      Math.abs(angD(pl.yaw, L.y)) > 0.15 ||
      L.o !== o;

    if (
      (moved && this._t >= NET_CFG.sendMoving) ||
      this._hb >= NET_CFG.heartbeat
    ) {
      const d = {
        n: this.me.n,
        x: +pl.x.toFixed(1),
        z: +pl.z.toFixed(1),
        y: +pl.yaw.toFixed(2),
        s: this.me.s,
        h: this.me.h,
        o
      };

      this.tr.setPresence(d);

      this._last = {
        x: pl.x,
        z: pl.z,
        y: pl.yaw,
        o
      };

      this._t = 0;
      this._hb = 0;
    }

    const now = performance.now();

    for (const [u, p] of this.players) {
      if (now - p.last > 45000) {
        this.players.delete(u);
        continue;
      }

      const dx = p.tx - p.x;
      const dz = p.tz - p.z;

      const k = Math.min(1, dt * 9);

      const sp =
        Math.hypot(dx, dz) /
        Math.max(dt, 0.001);

      p.x += dx * k;
      p.z += dz * k;

      p.yaw +=
        angD(p.tyaw, p.yaw) *
        Math.min(1, dt * 10);

      const a = Math.min(1, sp / 4.4);

      p.amt +=
        (a - p.amt) *
        Math.min(1, dt * 8);

      if (p.sit) p.amt = 0;

      p.phase += sp * dt * 1.9;

      if (p.bubble && now > p.bubble.until) {
        p.bubble = null;
      }
    }

    if (P.bubble && now > P.bubble.until) {
      P.bubble = null;
    }
  }
};

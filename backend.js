/* backend.js — Supabase adapter for The Diane Keaton Legacy Entertainment Center.
   Loaded by index.html (parent shell). Pages inside the iframe call parent.DKBackend.
   Only PUBLIC values go here. Never put the service-role key or DB password in this file. */
(function () {
  'use strict';

  /* ===== STEP: PASTE YOUR TWO PUBLIC VALUES HERE ===== */
  var SUPABASE_URL = 'https://xkjkrxnmimwmxftrrkha.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_8rZwgg5Cz0DpNelyA45rFg_T6M6ZKi7'; // publishable key: safe in the browser; security comes from RLS
  /* =================================================== */

  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  var LS = window.localStorage;
  var B = window.DKBackend = {
    status: 'unconfigured', ready: false, user: null, client: null,
    online: null, listeners: [],
    integrations: { bot: null /* plug the replacement AI bot in here; nothing is connected yet */ }
  };

  /* ---------- status pill (truthful connection state) ---------- */
  var pill = document.createElement('div');
  pill.setAttribute('role', 'status');
  pill.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99999;font:12px sans-serif;padding:4px 10px;border-radius:12px;background:#111c;color:#fff;pointer-events:none';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(pill); paint(); });
  function paint() {
    var t = { unconfigured: 'Backend not configured (local mode)', connecting: 'Connecting…', online: 'Online', offline: 'Offline — retrying' }[B.status];
    if (B.status === 'online' && B.online != null) t += ' · ' + B.online + ' online';
    pill.textContent = t;
  }
  function setStatus(s) { B.status = s; B.ready = s === 'online'; paint(); B.listeners.forEach(function (f) { try { f(s); } catch (e) {} }); }
  B.onStatus = function (f) { B.listeners.push(f); };

  function friendly(e) {
    var m = (e && e.message) || String(e);
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Cannot reach the server. Check your connection and try again.';
    if (/quota|rate limit|429|402|exceed/i.test(m)) return 'The service has hit a free-plan limit. Please try again later.';
    if (/Database error saving new user/i.test(m)) return 'That username is invalid (3–20 letters, numbers, _) or already taken.';
    if (/Invalid login/i.test(m)) return 'Wrong email or password.';
    return m;
  }
  function need() { if (!B.client) throw new Error('Backend is not connected.'); }

  /* ---------- init ---------- */
  B.init = function () {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return setStatus('unconfigured');
    setStatus('connecting');
    var s = document.createElement('script');
    s.src = CDN;
    s.onerror = function () { setStatus('offline'); };
    s.onload = function () {
      B.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      B.client.auth.getSession().then(function (r) {
        B.user = r.data.session ? r.data.session.user : null;
        setStatus('online');
        if (B.user) { B.syncCache(); startPresence(); flushPending(); }
      }).catch(function () { setStatus('offline'); });
      B.client.auth.onAuthStateChange(function (_e, sess) {
        B.user = sess ? sess.user : null;
        if (B.user) { startPresence(); } else { stopPresence(); }
      });
    };
    document.head.appendChild(s);
    window.addEventListener('online', function () { if (B.client) { setStatus('online'); flushPending(); } });
    window.addEventListener('offline', function () { if (B.client) setStatus('offline'); });
  };

  /* ---------- auth (Supabase Auth owns passwords) ---------- */
  B.register = function (username, email, password) {
    need();
    return B.client.auth.signUp({ email: email, password: password, options: { data: { username: username } } })
      .then(function (r) {
        if (r.error) throw new Error(friendly(r.error));
        if (!r.data.session) return { needsConfirm: true };
        B.user = r.data.user; return B.syncCache().then(function () { return { needsConfirm: false }; });
      });
  };
  B.login = function (email, password) {
    need();
    if (email.indexOf('@') < 0) return Promise.reject(new Error('Sign in with your email address (usernames are for display).'));
    return B.client.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
      if (r.error) throw new Error(friendly(r.error));
      B.user = r.data.user; return B.syncCache();
    });
  };
  B.logout = function () { if (!B.client) return Promise.resolve(); return B.client.auth.signOut().then(function () { B.user = null; }); };
  B.resetPassword = function (email) { need(); return B.client.auth.resetPasswordForEmail(email); };

  /* ---------- compatibility cache: keeps legacy pages that read localStorage 'arcadeUser' working.
     The SERVER is authoritative; this cache is overwritten on every sync. ---------- */
  B.syncCache = function () {
    if (!B.client || !B.user) return Promise.resolve(null);
    return Promise.all([
      B.client.from('profiles').select('*').eq('id', B.user.id).single(),
      B.client.from('user_achievements').select('achievement_id').eq('user_id', B.user.id)
    ]).then(function (r) {
      var p = r[0].data; if (!p) return null;
      var u = { username: p.username, email: B.user.email, xp: p.xp, coins: p.points, level: p.level,
        gamesPlayed: p.games_played, moviesWatched: p.movies_watched,
        unlockedAchievements: (r[1].data || []).map(function (a) { return a.achievement_id; }),
        badges: [], inventory: [], joinDate: p.created_at, avatar: p.avatar_url, banner: p.banner_url,
        gamesHistory: {}, moviesHistory: {}, _fromBackend: true };
      LS.setItem('arcadeUser', JSON.stringify(u)); LS.setItem('isLoggedIn', 'true');
      return u;
    }).catch(function () { return null; });
  };
  B.updateProfile = function (fields) { // only bio/avatar_url/banner_url are permitted by the database
    need(); return B.client.from('profiles').update(fields).eq('id', B.user.id);
  };

  /* ---------- scores (server validates; duplicates blocked by event id) ---------- */
  function pending() { try { return JSON.parse(LS.getItem('dk_pending_scores') || '[]'); } catch (e) { return []; } }
  function savePending(a) { LS.setItem('dk_pending_scores', JSON.stringify(a)); }
  function send(item) {
    return B.client.rpc('submit_score', { p_game: item.g, p_score: item.s, p_event_id: item.e }).then(function (r) {
      if (r.error) throw r.error; return r.data;
    });
  }
  function flushPending() {
    if (!B.ready || !B.user) return;
    pending().forEach(function (it) {
      send(it).then(function () { savePending(pending().filter(function (x) { return x.e !== it.e; })); })
        .catch(function (e) { if (!/network|fetch/i.test(String(e.message))) savePending(pending().filter(function (x) { return x.e !== it.e; })); });
    });
  }
  B.submitScore = function (gameId, score) { // source is always 'self_reported' until a game has a verified adapter
    if (B.status === 'unconfigured') return Promise.resolve({ skipped: true });
    var it = { g: gameId, s: Math.floor(score), e: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()) };
    if (!B.ready || !B.user) { savePending(pending().concat([it])); return Promise.resolve({ queued: true }); }
    return send(it).catch(function (e) {
      if (/network|fetch/i.test(String(e.message))) { savePending(pending().concat([it])); return { queued: true }; }
      throw new Error(friendly(e));
    });
  };
  B.leaderboard = function (gameId, limit) {
    need(); return B.client.from('leaderboard_best').select('*').eq('game_id', gameId).order('score', { ascending: false }).limit(limit || 25);
  };
  B.globalLeaderboard = function (limit) {
    need(); return B.client.from('profiles').select('username,points,level').order('points', { ascending: false }).limit(limit || 25);
  };

  /* ---------- realtime ---------- */
  B.subscribe = function (table, filter, cb) { // returns unsubscribe fn
    need();
    var ch = B.client.channel('rt-' + table + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', Object.assign({ event: '*', schema: 'public', table: table }, filter ? { filter: filter } : {}), cb)
      .subscribe(function (st) { if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('offline'); else if (st === 'SUBSCRIBED') setStatus('online'); });
    return function () { B.client.removeChannel(ch); };
  };
  var presence = null;
  function startPresence() {
    if (presence || !B.client || !B.user) return;
    presence = B.client.channel('presence-global', { config: { presence: { key: B.user.id } } });
    presence.on('presence', { event: 'sync' }, function () { B.online = Object.keys(presence.presenceState()).length; paint(); })
      .subscribe(function (st) { if (st === 'SUBSCRIBED') presence.track({ at: Date.now() }); });
  }
  function stopPresence() { if (presence) { B.client.removeChannel(presence); presence = null; B.online = null; paint(); } }

  /* ---------- community ---------- */
  B.activity = function (limit) { need(); return B.client.from('activity').select('*, profiles(username)').order('created_at', { ascending: false }).limit(limit || 30); };
  B.notifications = function () { need(); return B.client.from('notifications').select('*').eq('user_id', B.user.id).order('created_at', { ascending: false }).limit(50); };
  B.follow = function (uid) { need(); return B.client.from('follows').insert({ follower: B.user.id, followed: uid }); };
  B.unfollow = function (uid) { need(); return B.client.from('follows').delete().eq('follower', B.user.id).eq('followed', uid); };
  B.like = function (type, id) { need(); return B.client.from('likes').insert({ user_id: B.user.id, target_type: type, target_id: String(id) }); };
  B.friendRequest = function (uid) { need(); return B.client.from('friendships').insert({ requester: B.user.id, addressee: uid }); };
  B.watchStart = function (provider, title) { need(); return B.client.from('watch_sessions').insert({ user_id: B.user.id, provider: provider, title: title }).select().single(); };
  B.watchEnd = function (id, seconds) { need(); return B.client.from('watch_sessions').update({ ended_at: new Date().toISOString(), seconds: Math.max(0, Math.floor(seconds)) }).eq('id', id); };

  /* ---------- TV channels (public read; writes are enforced by the database: admins only) ---------- */
  B.isAdmin = function () {
    if (!B.client || !B.user) return Promise.resolve(false);
    return B.client.from('admins').select('user_id').eq('user_id', B.user.id).maybeSingle().then(function (r) { return !!r.data; });
  };
  B.tvChannels = function () { need(); return B.client.from('channels').select('*').eq('is_active', true).order('number'); };
  B.tvItems = function (channelId) { need(); return B.client.from('channel_items').select('*').eq('channel_id', channelId).order('position'); };
  B.tvSaveChannel = function (ch) { need(); return B.client.from('channels').upsert(ch).select().single(); };
  B.tvSaveItem = function (item) { need(); return B.client.from('channel_items').upsert(item).select().single(); };
  B.tvRemoveItem = function (id) { need(); return B.client.from('channel_items').delete().eq('id', id); };
  B.tvReorder = function (channelId, orderedIds) { need(); return B.client.rpc('tv_reorder', { p_channel: channelId, p_ids: orderedIds }); };
  B.tvSubscribe = function (cb) { // fires when any channel or playlist row changes; returns unsubscribe fn
    var a = B.subscribe('channels', null, cb), b = B.subscribe('channel_items', null, cb);
    return function () { a(); b(); };
  };

  /* ---------- local data: backup + migration (never deletes local data) ---------- */
  B.backupLocal = function () {
    var dump = {}; for (var i = 0; i < LS.length; i++) { var k = LS.key(i); dump[k] = LS.getItem(k); }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' }));
    a.download = 'arcade-local-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  };
  /* Uploads the old local record for the signed-in email as a PENDING import. Old passwords are stripped.
     Balances are NOT trusted (local data can be edited); an admin approves what is granted. One import per user. */
  B.migrateLocal = function () {
    need(); if (!B.user) return Promise.reject(new Error('Sign in first.'));
    var found = null;
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i); if (k.indexOf('user_') !== 0) continue;
      try { var u = JSON.parse(LS.getItem(k)); if (u.email && u.email.toLowerCase() === B.user.email.toLowerCase()) { found = u; break; } } catch (e) {}
    }
    if (!found) return Promise.resolve({ found: false });
    delete found.password;
    var body = JSON.stringify(found);
    return B.client.from('legacy_imports').upsert({ user_id: B.user.id, payload: found }, { onConflict: 'user_id', ignoreDuplicates: true })
      .then(function (r) {
        if (r.error) throw new Error(friendly(r.error));
        return B.client.from('legacy_imports').select('payload').eq('user_id', B.user.id).single();
      }).then(function (r) { return { found: true, verified: JSON.stringify(r.data.payload) === body || !!r.data.payload }; });
  };

  B.init();
})();

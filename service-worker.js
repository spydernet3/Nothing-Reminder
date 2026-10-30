
const DB_NAME   = 'NothingReminderDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';
const CACHE_NAME = 'app-cache-v2';

// ── Cache install ──────────────────────────────────────────────
// Each file is cached on its own and failures are ignored: one missing file
// used to make cache.addAll() reject, abort the install, and leave the OLD
// worker (without the Priority Queue push code) running.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(['./manifest.json', './assets/icon.png'].map(u =>
        cache.add(u).catch(err => console.warn('SW cache skip:', u, err))
      ));
    } catch (e) { console.warn('SW cache open failed:', e); }
    // Take over immediately instead of waiting for every tab / app window to close.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(key =>
        (key !== CACHE_NAME && key !== 'gold-state') ? caches.delete(key) : null
      ));
    } catch (e) {}
    await self.clients.claim();
  })());
});

// ── Show a notification ONLY if the same one is not already on screen ──
// (fixes the 7 AM / 2 PM / 8 PM duplicate: if you have not cleared it, we skip it)
async function showOnce(title, options) {
  try {
    const active = await self.registration.getNotifications({ tag: options.tag });
    if (active && active.length) {
      // same content already visible -> do nothing; changed content -> update it
      if (active.some(n => n.title === title && n.body === options.body)) return;
      options = Object.assign({}, options, { renotify: true });
    }
  } catch (e) { /* if the check fails, fall through and show it */ }
  return self.registration.showNotification(title, options);
}

// ── Read IndexedDB from service worker ──────────────────────────
function readAppData() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = e => {

  console.error(
    'IndexedDB Error:',
    e
  );

  resolve(null);
};
    req.onsuccess = e => {
      const db = e.target.result;
      try {
        const tx    = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const get   = store.get('main');
        get.onsuccess = () => resolve(get.result || null);
        get.onerror   = () => resolve(null);
      } catch { resolve(null); }
    };
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE_NAME);
    };
  });
}


// ── Small key/value store in Cache Storage (gold + EB state) ───
async function stateGet(key) {
  try {
    const c = await caches.open('gold-state');
    const r = await c.match('/__state/' + key);
    return r ? await r.json() : null;
  } catch (e) { return null; }
}
async function stateSet(key, value) {
  try {
    const c = await caches.open('gold-state');
    await c.put('/__state/' + key, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {}
}

// ── Gold rate (same formula as the page) ───────────────────────
const GRAMS_PER_OZ = 31.1035;
const GOLD_RETAIL_FACTOR = 1.165;   // keep equal to RETAIL_FACTOR in index.html
const GOLD_NOTIFY_MIN_CHANGE = 10;  // Rs per gram (22K)

async function fetchJSONTimeout(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function fetchGoldRates() {
  let spot = 0;
  try {
    const d = await fetchJSONTimeout('https://data-asg.goldprice.org/dbXRates/INR');
    const p = Number(d && d.items && d.items[0] && d.items[0].xauPrice);
    if (p > 0) spot = p / GRAMS_PER_OZ;
  } catch (e) {}
  if (!spot) {
    const g  = await fetchJSONTimeout('https://api.gold-api.com/price/XAU');
    const fx = await fetchJSONTimeout('https://open.er-api.com/v6/latest/USD');
    const usd = Number(g && g.price);
    const inr = Number(fx && fx.rates && fx.rates.INR);
    if (!(usd > 0 && inr > 0)) throw new Error('Live gold price unavailable');
    spot = usd * inr / GRAMS_PER_OZ;
  }
  const g24 = spot * GOLD_RETAIL_FACTOR;
  return {
    '24k': Math.round(g24),
    '22k': Math.round(g24 * 22 / 24),
    '18k': Math.round(g24 * 18 / 24)
  };
}


// ═════════════════════════════════════════════════════════════════
//  ONE place builds and shows every notification.
//  - mode 'push' : scheduled FCM push (7 AM / 2 PM / 8 PM, set in the Cloudflare worker). Re-shows a notification
//                  the user cleared; if one is still on screen with the same text it
//                  is left alone, if the text changed it is updated and alerts once.
//  - mode 'page' : the app was opened / data was saved. Only UPDATES a notification
//                  that is on screen (silently) or shows a changed one once. It never
//                  re-shows something the user already dismissed.
//  The page does not build notifications any more; it just sends
//  {type:'CHECK_NOTIFICATIONS'} so page and push can never disagree or repeat.
// ═════════════════════════════════════════════════════════════════
const ICON = './assets/icon.png';
let runChain = Promise.resolve();

function runNotifications(mode) {
  // serialise runs (push + page message at the same moment must not double-show)
  runChain = runChain.then(() => doRun(mode)).catch(e => console.error('Notification run failed:', e));
  return runChain;
}

function istToday() {
  const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  t.setHours(0, 0, 0, 0);
  return t;
}

async function notify(ctx, tag, title, body, page, requireInteraction) {
  const sig = ctx.dayKey + '|' + title + '|' + body;
  let active = [];
  try { active = await self.registration.getNotifications({ tag }); } catch (e) {}

  // identical notification still on screen -> nothing to do
  if (active.some(n => n.title === title && n.body === body)) { ctx.sigs[tag] = sig; return false; }

  const options = {
    body, icon: ICON, badge: ICON, tag,
    requireInteraction: !!requireInteraction,
    data: { page: page || '' }
  };
  if (active.length) {
    // on screen but the data changed -> update it; only a scheduled push makes a sound
    options.renotify = (ctx.mode === 'push');
  } else if (ctx.mode === 'page' && ctx.sigs[tag] === sig) {
    // user already saw and cleared exactly this today -> do not bring it back
    return false;
  }
  try {
    await self.registration.showNotification(title, options);
    ctx.sigs[tag] = sig;
    return true;
  } catch (e) { console.warn('showNotification failed:', tag, e); return false; }
}

async function closeTag(ctx, tag) {
  try {
    const old = await self.registration.getNotifications({ tag });
    old.forEach(n => n.close());
  } catch (e) {}
  delete ctx.sigs[tag];
}

async function closeStaleBudget(ctx, keepTags) {
  try {
    const all = await self.registration.getNotifications();
    all.forEach(n => { if (n.tag && n.tag.indexOf('budget-item-') === 0 && !keepTags.has(n.tag)) n.close(); });
  } catch (e) {}
  Object.keys(ctx.sigs).forEach(t => { if (t.indexOf('budget-item-') === 0 && !keepTags.has(t)) delete ctx.sigs[t]; });
}

function dayDiff(dateStr, today) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const end = new Date(y, m - 1, d); end.setHours(0, 0, 0, 0);
  return Math.floor((end - today) / 86400000);
}

async function section(name, fn) {
  try { await fn(); } catch (e) { console.error(name + ' notification failed:', e); }
}

async function doRun(mode) {
  if (typeof Notification !== 'undefined' && Notification.permission && Notification.permission !== 'granted') return;
  const data = await readAppData();
  if (!data || typeof data !== 'object') return;

  const today = istToday();
  const ctx = { mode, today, dayKey: pqKey(today), sigs: (await stateGet('notif-sig')) || {} };
  // forget signatures from earlier days
  Object.keys(ctx.sigs).forEach(t => { if (String(ctx.sigs[t]).split('|')[0] !== ctx.dayKey) delete ctx.sigs[t]; });

  // ── Priority Queue (first: it is the most important one) ────
  await section('Priority', async () => {
    if (data.notifPriority === false || !Array.isArray(data.priorityQueue) || !data.priorityQueue.length) {
      return closeTag(ctx, 'priority-summary');
    }
    const sim = JSON.parse(JSON.stringify(data.priorityQueue));
    sim.forEach(d => { if (!Array.isArray(d.items)) d.items = []; });
    pqRollover(sim, ctx.dayKey);
    const day = sim.find(d => d.date === ctx.dayKey);
    const active = day ? day.items.filter(i => i.r !== true) : [];
    const pending = active.filter(i => !i.done);
    if (!pending.length) return closeTag(ctx, 'priority-summary');
    const MAX = 6;
    const lines = pending.slice(0, MAX).map(i => '• ' + i.text + (i.from ? ' (old)' : ''));
    if (pending.length > MAX) lines.push('+' + (pending.length - MAX) + ' more');
    await notify(ctx, 'priority-summary',
      '🎯 Priority Queue (' + (active.length - pending.length) + '/' + active.length + ' completed)',
      lines.join('\n'), 'priority', true);
  });

  // ── Reminders: expired / today / tomorrow ───────────────────
  await section('Reminders', async () => {
    if (!data.notifReminders || !Array.isArray(data.reminders)) return closeTag(ctx, 'reminders-summary');
    const lines = [];
    data.reminders.forEach(r => {
      if (!r || !r.endDate) return;
      const diff = dayDiff(r.endDate, today);
      if (diff < 0) lines.push(r.title + ' — EXPIRED');
      else if (diff === 0) lines.push(r.title + ' — Due today');
      else if (diff === 1) lines.push(r.title + ' — 1 day left');
    });
    if (!lines.length) return closeTag(ctx, 'reminders-summary');
    await notify(ctx, 'reminders-summary', '⚠️ Reminder Alert', lines.join('\n'), 'reminders', true);
  });

  // ── Notes: latest few ───────────────────────────────────────
  await section('Notes', async () => {
    if (!data.notifNotes || !Array.isArray(data.notes) || !data.notes.length) return closeTag(ctx, 'notes-summary');
    const MAX = 5;
    const recent = data.notes.slice().reverse();
    const lines = recent.slice(0, MAX).map(n => {
      let t = n.text;
      if (n.isTable) t = '[Table Note]';
      else if (!t && n.file) t = '[File: ' + n.file.name + ']';
      else if (!t) t = '[Empty Note]';
      else if (t.length > 40) t = t.slice(0, 40) + '...';
      return '- ' + t;
    });
    if (recent.length > MAX) lines.push('+' + (recent.length - MAX) + ' more');
    await notify(ctx, 'notes-summary', '📝 Notes Reminder', lines.join('\n'), 'notes', false);
  });

  // ── Open checklists ─────────────────────────────────────────
  await section('Checklist', async () => {
    const open = (data.notifChecklist && Array.isArray(data.checklists)) ? data.checklists.filter(c => c.status === 'open') : [];
    if (!open.length) return closeTag(ctx, 'checklists-summary');
    const lines = open.map(c => c.title + ' — ' + (c.items ? c.items.length : 0) + ' items pending');
    await notify(ctx, 'checklists-summary', '✒️ Pending Checklists', lines.join('\n'), 'Check', true);
  });

  // ── Budget: one notification per budget, removed when the budget is deleted ──
  await section('Budget', async () => {
    const keep = new Set();
    if (data.notifBudget && Array.isArray(data.budget)) {
      for (const b of data.budget) {
        const tag = 'budget-item-' + b.title;
        keep.add(tag);
        const used = (b.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const remaining = Number(b.amount) - used;
        let body;
        if (!b.endDate) {
          body = b.title + ': ₹' + remaining + ' left';
        } else {
          const days = Math.max(0, dayDiff(b.endDate, today));
          if (days === 0) {
            body = remaining >= 0
              ? b.title + ': 🎉 Budget ended — you saved ₹' + remaining
              : b.title + ': Budget ended — over by ₹' + Math.abs(remaining);
          } else {
            body = b.title + ': Spend ₹' + (remaining / days).toFixed(2) + '/day — ₹' + remaining + ' left over ' + days + ' days';
          }
        }
        await notify(ctx, tag, '💰 Budget Reminder', body, 'budget', false);
      }
    }
    await closeStaleBudget(ctx, keep);
  });

  // ── Moon phase ──────────────────────────────────────────────
  await section('Moon', async () => {
    if (!data.notifMoonPhase) return closeTag(ctx, 'moon-phase');
    const phase = getMoonPhase(today.getFullYear(), today.getMonth(), today.getDate());
    if (phase === 'Full Moon') await notify(ctx, 'moon-phase', '🌕 Pournami Today!', 'Full Moon (Pournami) is today.', '', true);
    else if (phase === 'New Moon') await notify(ctx, 'moon-phase', '🌑 Amavasai Today!', 'New Moon (Amavasai) is today.', '', true);
    else await closeTag(ctx, 'moon-phase');
  });

  // ── Gold rate (network, so last) ────────────────────────────
  await section('Gold', async () => {
    if (!data.notifGold) return;
    // the page may ask often; only hit the network every 30 min unless it is a scheduled push
    const lastRun = (await stateGet('gold-checked')) || 0;
    if (mode === 'page' && Date.now() - lastRun < 30 * 60 * 1000) return;
    await stateSet('gold-checked', Date.now());
    const rates = await fetchGoldRates();
    const last = await stateGet('gold-last');
    await stateSet('gold-last', rates);
    if (!last) return;                       // first run = baseline only
    const d22 = rates['22k'] - last['22k'];
    if (Math.abs(d22) < GOLD_NOTIFY_MIN_CHANGE) return;
    const arrow = d22 > 0 ? '▲ +' : '▼ -';
    const f = v => '₹' + Number(v).toLocaleString('en-IN');
    ctx.mode = 'push';                       // a real price move should always alert
    await notify(ctx, 'gold-rate', '🥇 Gold Rate ' + (d22 > 0 ? 'Up' : 'Down'),
      '22K ' + f(rates['22k']) + '/g (' + arrow + '₹' + Math.abs(d22) + ')  |  24K ' + f(rates['24k']) + '/g  |  18K ' + f(rates['18k']) + '/g',
      'utilities', false);
  });

  await stateSet('notif-sig', ctx.sigs);
}

// ── Background push (FCM wakes the worker) ─────────────────────
self.addEventListener('push', event => {
  event.waitUntil(runNotifications('push'));
});

// ── Messages from the page ─────────────────────────────────────
self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.type === 'CHECK_NOTIFICATIONS') {
    event.waitUntil(runNotifications('page'));
  } else if (d.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(showOnce(d.title, {
      body: d.body, icon: ICON, badge: ICON, tag: d.tag, requireInteraction: true
    }));
  }
});

// ── Notification click — open the right page ───────────────────
self.addEventListener(
  'notificationclick',
  event => {

    event.notification.close();

    const page =
      event.notification.data?.page || '';

    event.waitUntil(

      clients.matchAll({

        type: 'window',

        includeUncontrolled:
        true

      }).then(clientList => {

        for (
          const client
          of clientList
        ) {

          if (
            'focus' in client
          ) {

            client.focus();

            client.postMessage({

              type:
              'NAVIGATE',

              page
            });

            return;
          }
        }

        if (
          clients.openWindow
        ) {

          return clients.openWindow(
            './index.html#' +
            page
          );
        }
      })
    );
  }
);

// ── Moon phase algorithm (copied into SW — no import needed) ───
function getMoonPhase(y, m, d) {
  const lp = 2551443;
  const new_moon = new Date(1970, 0, 7, 20, 35, 0);
  const phase = ((new Date(y, m, d).getTime() - new_moon.getTime()) / 1000) % lp;
  const index = Math.floor((phase / lp) * 8 + 0.5) % 8;
  return ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
          'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'][index];
}

// ── Priority Queue helpers (same rollover rule as index.html) ──
function pqPad(n) { return String(n).padStart(2, '0'); }
function pqKey(d) { return d.getFullYear() + '-' + pqPad(d.getMonth() + 1) + '-' + pqPad(d.getDate()); }
function pqParse(k) { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function pqRollover(queue, todayKey) {
  if (!queue.length) return false;
  let changed = false;
  const byDate = {};
  queue.forEach(d => { byDate[d.date] = d; });
  const dates = Object.keys(byDate).sort();
  const end = pqParse(todayKey);
  const cur = pqParse(dates[0]);
  while (cur < end) {
    const k = pqKey(cur);
    const day = byDate[k];
    if (day) {
      const nd = new Date(cur); nd.setDate(nd.getDate() + 1);
      const nk = pqKey(nd);
      day.items.forEach(it => {
        if (it.done || it.r) return;
        let next = byDate[nk];
        if (!next) { next = { date: nk, items: [] }; byDate[nk] = next; queue.push(next); }
        if (!next.items.some(x => x.uid === it.uid)) {
          next.items.push({ id: 'sw' + Math.random().toString(36).slice(2, 8), uid: it.uid, text: it.text, done: false, from: it.from || k });
        }
        it.r = true;
        changed = true;
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return changed;
}

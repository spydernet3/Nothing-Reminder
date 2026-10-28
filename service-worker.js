const DB_NAME   = 'NothingReminderDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';
const CACHE_NAME = 'app-cache-v2';

// ── Cache install ──────────────────────────────────────────────
self.addEventListener('install', event => {

  event.waitUntil(

    caches.open(CACHE_NAME).then(cache =>

      cache.addAll([
  './manifest.json',
  './assets/icon.png'
])
    )
  );

  // self.skipWaiting();
});
self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys.map(key => {

          if (
            key !== CACHE_NAME &&
            key !== 'gold-state'
          ) {

            return caches.delete(key);
          }
        })
      )
    )
  );
});

// ── Show a notification ONLY if the same one is not already on screen ──
// (fixes the 7 AM / 2 PM duplicate: if you have not cleared it, we skip it)
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

async function goldChangeCheck(data) {
  if (!data.notifGold) return;
  try {
    const rates = await fetchGoldRates();
    const last = await stateGet('gold-last');
    await stateSet('gold-last', rates);
    if (!last) return; // first run = baseline only
    const d22 = rates['22k'] - last['22k'];
    if (Math.abs(d22) < GOLD_NOTIFY_MIN_CHANGE) return;
    const arrow = d22 > 0 ? '▲ +' : '▼ -';
    const f = v => '₹' + Number(v).toLocaleString('en-IN');
    await self.registration.showNotification('🥇 Gold Rate ' + (d22 > 0 ? 'Up' : 'Down'), {
      body: '22K ' + f(rates['22k']) + '/g (' + arrow + '₹' + Math.abs(d22) + ')  |  24K ' + f(rates['24k']) + '/g  |  18K ' + f(rates['18k']) + '/g',
      icon: './assets/icon.png',
      badge: './assets/icon.png',
      tag: 'gold-rate',
      renotify: true,
      data: { page: 'utilities' }
    });
  } catch (e) { console.warn('Gold check skipped:', e); }
}

// ── Background push event — CORE of the feature ────────────────
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    const data = await readAppData();
  
    if (
  !data ||
  typeof data !== 'object'
) {
  return;
}

const today =
  new Date(
    new Date().toLocaleString(
      'en-US',
      {
        timeZone:
        'Asia/Kolkata'
      }
    )
  );

today.setHours(0, 0, 0, 0);
console.log(
  'BACKGROUND PUSH STARTED'
);
    // ── 1. Expired / due reminders ──────────────────────────────
if (
  data.notifReminders &&
  Array.isArray(data.reminders) &&
  data.reminders.length
) {

  const dueReminders =
    data.reminders.filter(r => {

      if (!r.endDate)
        return false;

      const [y, m, d] =
        r.endDate
        .split('-')
        .map(Number);

      const end =
        new Date(y, m - 1, d);

      end.setHours(
        0, 0, 0, 0
      );

      const diff =
        Math.floor(
          (end - today) /
          86400000
        );

      return (
        diff < 0 ||
        diff === 0 ||
        diff === 1
      );
    });

  if (dueReminders.length) {

    const lines =
      dueReminders.map(r => {

        const [y, m, d] =
          r.endDate
          .split('-')
          .map(Number);

        const end =
          new Date(y, m - 1, d);

        end.setHours(
          0, 0, 0, 0
        );

        const diff =
          Math.floor(
            (end - today) /
            86400000
          );

        let status = '';

        if (diff < 0) {

          status =
            'EXPIRED';

        }

        else if (diff === 0) {

          status =
            'Due today';

        }

        else if (diff === 1) {

          status =
            '1 day left';
        }

        return (
          `${r.title} — ${status}`
        );
      });

    await showOnce(

      '⚠️ Reminder Alert',

      {

        body:
          lines.join('\n'),

        icon:
          './assets/icon.png',

        badge:
          './assets/icon.png',

        tag:
          'reminders-summary',

        requireInteraction:
          true,

        data: {
          page:
          'reminders'
        }
      }
    );
  }
}
// ── Notes notifications ─────────────────────────
if (
  data.notifNotes &&
  Array.isArray(data.notes) &&
  data.notes.length
) {

  const latest =
    data.notes[
      data.notes.length - 1
    ];

  if (
    latest &&
    typeof latest.text === 'string'
  ) {

    await showOnce(

      '📝 Notes Reminder',

      {

        body:
          latest.text.slice(0, 120),

        icon:
          './assets/icon.png',

        badge:
          './assets/icon.png',

        tag:
          'notes-summary',

        data:
          { page: 'notes' }
      }
    );
  }
}
    // ── 2. Open checklists ──────────────────────────────────────
    if (   data.notifChecklist &&   Array.isArray(data.checklists) &&   data.checklists.length ) {
      const open = data.checklists.filter(c => c.status === 'open');
      if (open.length) {
        const lines = open.map(c =>
          `${c.title} — ${c.items ? c.items.length : 0} items pending`
        );

        await showOnce('✒️ Pending Checklists', {
          body: lines.join('\n'),
          icon:   './assets/icon.png' ||   './manifest.json',
          badge: './assets/icon.png',
          tag: 'checklists-summary',
          requireInteraction: true,
          data: { page: 'Check' }
        });
      }
    }

    // ── Priority Queue — unchecked items only, pending / total ──
    if (data.notifPriority !== false && Array.isArray(data.priorityQueue) && data.priorityQueue.length) {
      const todayKey = pqKey(today);
      const sim = JSON.parse(JSON.stringify(data.priorityQueue));
      pqRollover(sim, todayKey);
      const day = sim.find(d => d.date === todayKey);
      const activeItems = day ? day.items.filter(i => i.r !== true) : [];
      const pending = activeItems.filter(i => !i.done);
      if (pending.length) {
        const completed = activeItems.length - pending.length;
        const MAX = 6;
        const lines = pending.slice(0, MAX).map(i => '• ' + i.text + (i.from ? ' (old)' : ''));
        if (pending.length > MAX) lines.push('+' + (pending.length - MAX) + ' more');
        await showOnce('🎯 Priority Queue (' + completed + '/' + activeItems.length + ' completed)', {
          body: lines.join('\n'),
          icon: './assets/icon.png',
          badge: './assets/icon.png',
          tag: 'priority-summary',
          requireInteraction: true,
          data: { page: 'priority' }
        });
      } else {
        try {
          const old = await self.registration.getNotifications({ tag: 'priority-summary' });
          old.forEach(n => n.close());
        } catch (e) {}
      }
    }

    // ── 3. Budget — daily spend limit ──────────────────────────
    if (   data.notifBudget &&   Array.isArray(data.budget) &&   data.budget.length ) {
      for (const b of data.budget) {
        if (!b.endDate) continue;
        const [y, m, d] = b.endDate.split('-').map(Number);
        const end = new Date(y, m - 1, d);
        const daysLeft = Math.max(0, Math.floor((end - today) / 86400000));
        if (daysLeft === 0) continue;

        const used = (b.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
        const remaining = Number(b.amount) - used;
        const perDay = (remaining / daysLeft).toFixed(2);

        await showOnce('💰 Budget Reminder', {
          body: `${b.title}: Spend ₹${perDay}/day — ₹${remaining} left over ${daysLeft} days`,
          icon:   './assets/icon.png' ||   './manifest.json',
          badge: './assets/icon.png',
          tag: `budget-item-${b.title}`,
          data: { page: 'budget' }
        });
      }
    }

    // ── 5. Gold rate change ─────────────
    await goldChangeCheck(data);

    // ── 4. Moon phase — Pournami / Amavasai ────────────────────
    if (data.notifMoonPhase) {
      const phase = getMoonPhase(today.getFullYear(), today.getMonth(), today.getDate());
      if (phase === 'Full Moon') {
        await showOnce('🌕 Pournami Today!', {
          body: 'Full Moon (Pournami) is today.',
          icon:   './assets/icon.png' ||   './manifest.json',
          tag: 'moon-phase',
          requireInteraction: true
        });
      } else if (phase === 'New Moon') {
        await showOnce('🌑 Amavasai Today!', {
          body: 'New Moon (Amavasai) is today.',
          icon:   './assets/icon.png' ||   './manifest.json',
          tag: 'moon-phase',
          requireInteraction: true
        });
      }
    }
  })());
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

// ── Foreground message from page ───────────────────────────────
self.addEventListener('message', event => {
  if (   event.data &&   event.data.type ===   'SHOW_NOTIFICATION' ) {
    showOnce(event.data.title, {
      body: event.data.body,
      icon:   './assets/icon.png' ||   './manifest.json',
      badge: './assets/icon.png',
      tag: event.data.tag,
      requireInteraction: true
    });
  }
});

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

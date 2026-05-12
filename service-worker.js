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
            key !== CACHE_NAME
          ) {

            return caches.delete(key);
          }
        })
      )
    )
  );
});

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

    await self.registration
    .showNotification(

      '⚠️ Reminder Alert',

      {

        body:
          lines.join('\n'),

        icon:
          './assets/icon.png',

        badge:
          './assets/icon.png',

        tag:
          'bg-reminders',

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

    await self.registration
    .showNotification(

      '📝 Notes Reminder',

      {

        body:
          latest.text.slice(0, 120),

        icon:
          './assets/icon.png',

        badge:
          './assets/icon.png',

        tag:
          'bg-notes',

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
        const lines = open.slice(0, 5).map(c =>
          `${c.title} — ${c.items ? c.items.length : 0} items pending`
        );
        if (open.length > 5) lines.push(`...and ${open.length - 5} more`);

        await self.registration.showNotification('✒️ Pending Checklists', {
          body: lines.join('\n'),
          icon:   './assets/icon.png' ||   './manifest.json',
          badge: './assets/icon.png',
          tag: 'bg-checklists',
          requireInteraction: true,
          data: { page: 'Check' }
        });
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

        await self.registration.showNotification('💰 Budget Reminder', {
          body: `${b.title}: Spend ₹${perDay}/day — ₹${remaining} left over ${daysLeft} days`,
          icon:   './assets/icon.png' ||   './manifest.json',
          badge: './assets/icon.png',
          tag: `bg-budget-${b.title}`,
          data: { page: 'budget' }
        });
      }
    }

    // ── 4. Moon phase — Pournami / Amavasai ────────────────────
    if (data.notifMoonPhase) {
      const phase = getMoonPhase(today.getFullYear(), today.getMonth(), today.getDate());
      if (phase === 'Full Moon') {
        await self.registration.showNotification('🌕 Pournami Today!', {
          body: 'Full Moon (Pournami) is today.',
          icon:   './assets/icon.png' ||   './manifest.json',
          tag: 'bg-moon',
          requireInteraction: true
        });
      } else if (phase === 'New Moon') {
        await self.registration.showNotification('🌑 Amavasai Today!', {
          body: 'New Moon (Amavasai) is today.',
          icon:   './assets/icon.png' ||   './manifest.json',
          tag: 'bg-moon',
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
    self.registration.showNotification(event.data.title, {
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

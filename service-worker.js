self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("app-cache").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./manifest.json",
        "./assets/icon.png"
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  return self.clients.claim();
});

// Notification Click Handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('./index.html');
      }
    })
  );
});

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("app-cache").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./manifest.json",
        "./assets/icon.png"
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  return self.clients.claim();
});

// Notification Click Handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('./index.html');
      }
    })
  );
});

// ✅ SHOW NOTIFICATION FROM SERVICE WORKER
self.addEventListener("message", event => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: "./assets/icon.png",
      badge: "./assets/icon.png",
      tag: event.data.tag,            // IMPORTANT
      requireInteraction: true        // IMPORTANT (keeps it open)
    });
  }
});

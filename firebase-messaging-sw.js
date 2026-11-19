// Firebase SDK is optional at boot. If the CDN is offline/blocked the local
// notification + offline-cache logic below must still load, so failures are
// caught instead of aborting the whole service worker.
let firebaseReady = false;
try {
  importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');
  firebaseReady = (typeof firebase !== 'undefined');
} catch (e) {
  console.warn('Firebase SDK unavailable (offline?) — local notifications still active.', e);
}

// App notification logic + offline cache. This is the ONLY service worker the
// app registers. The page registers it with updateViaCache:'none', so imported
// scripts are always fetched fresh — no manual ?v= cache-buster is needed.
importScripts('service-worker.js');

if (firebaseReady) {
  try {
    firebase.initializeApp({
      apiKey: "AIzaSyCnyA68mu1E5moiv09wwW-kNBFqE0K2tW8",
      authDomain: "nothing-reminder-push.firebaseapp.com",
      projectId: "nothing-reminder-push",
      storageBucket: "nothing-reminder-push.firebasestorage.app",
      messagingSenderId: "158222414455",
      appId: "1:158222414455:web:92bf9df29028216fed0c72"
    });

    const messaging = firebase.messaging();

    // FCM background message: the notification itself is shown by the
    // 'push' handler imported from service-worker.js above.
    messaging.onBackgroundMessage(payload => {
      console.log('FCM WAKE:', payload);
    });
  } catch (e) {
    console.warn('Firebase messaging init failed:', e);
  }
}

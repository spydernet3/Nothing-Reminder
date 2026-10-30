importScripts(
  'https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js'
);

importScripts(
  'https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js'
);

// App notification logic (reads the app data and shows Reminders, Checklist,
// Notes, Budget, Gold and Moon Phase notifications on every push).
// This is now the ONLY service worker the app registers, so every push
// (and every "app opened" refresh) is handled by service-worker.js.
importScripts('service-worker.js');

firebase.initializeApp({

  apiKey:
  "AIzaSyCnyA68mu1E5moiv09wwW-kNBFqE0K2tW8",

  authDomain:
  "nothing-reminder-push.firebaseapp.com",

  projectId:
  "nothing-reminder-push",

  storageBucket:
  "nothing-reminder-push.firebasestorage.app",

  messagingSenderId:
  "158222414455",

  appId:
  "1:158222414455:web:92bf9df29028216fed0c72"
});

const messaging =
  firebase.messaging();

// FCM background message: the notification itself is shown by the
// 'push' handler imported from service-worker.js above.
messaging.onBackgroundMessage(
  (payload) => {
    console.log('FCM WAKE:', payload);
  }
);

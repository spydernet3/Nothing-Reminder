importScripts(
  'https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js'
);

importScripts(
  'https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js'
);

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

// FCM BACKGROUND WAKE
messaging.onBackgroundMessage(
  async (payload) => {

    console.log(
      'FCM WAKE:',
      payload
    );

    // Trigger push event manually
    self.dispatchEvent(
      new PushEvent(
        'push',
        {
          data: {
            json: () => ({
              type:
              'CHECK_LOCAL_DATA'
            })
          }
        }
      )
    );
  }
);

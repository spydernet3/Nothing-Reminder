# Smart Reminder & Notes App 📝⏰

## Overall Performance
<img width="1018" height="565" alt="image" src="https://github.com/user-attachments/assets/40c9acf2-5c6f-4138-9957-f5bc47314583" />


A lightweight, web-based Reminder and Notes application with dark mode support, Designed for **fast note-taking, reminders, and more**.

!> User data is stored locally in this browser (IndexedDB, with a localStorage fallback). Export a backup before clearing browser data or formatting the device.
---
REMINDER APP [ https://nothing-reminder.localplayer.dev ]

> Hosting uses the custom domain declared in `CNAME`; availability depends on that domain's DNS and hosting provider. The Firebase config in the client is public by design — enable Firebase App Check and restrict the push endpoint if you deploy your own copy.
---
| Category                  | Rating | Remarks                                       |
| ------------------------- | ------ | --------------------------------------------- |
| 🧠 **Performance**        | 9.5    | Fast operations; optimized loops              |
| 🔒 **Security**           | 9      | Local-first; only push token + optional feature APIs cross the network |
| 🧰 **Usability**          | 9.0    | Minimalist UI, simple flow                    |
| ⚙️ **Compatibility**      | 8.5    | Limited by each browser's IndexedDB quota     |
| ☁️ **Offline Capability** | 10.0   | Full offline PWA mode after the first load    |
| 📦 **Storage Efficiency** | 9.0    | JSON compression-friendly                     |
| 🧩 **Maintainability**    | 9.2    | Clean modular script                          |
| 💡 **Innovation**         | 8.9    | Lightweight offline reminder with PWA traits  |

- Overall Score: ⭐ 9.3 / 10
---
## Features

- **Install App**
  - Tap **Install** in the app or in the browser menu (Android Chrome: Install app / Add to Home screen; iPhone: Share → Add to Home Screen). On supported Android devices the Play Store opens after you tap Install — approve it there to finish.
  - Due to compatibility concerns of all platforms (Android, iOS, Windows.Chrome OS, Linux) PWA as a better companion for all.

- **Privacy Focused**
  - Apart from Notification permission no other direct or indirect permission are asked to users
  - No Ads and trackers are implemented to affect users privacy
  - Reminders, notes, budgets and settings stay in your browser's local IndexedDB (localStorage fallback). Nothing is stored on an app server.
  - Push delivery uses Firebase Cloud Messaging: a device token is sent to the app's push service; note/reminder content is never uploaded.
  - Optional features fetch public data (fonts, QR library, weather, gold rates, exchange rates) from their providers.
 
- **App Lock**
  - By installing page as PWA you can use By Defauly App lock that contains your device
  - By enabling App lock for Browswer also the way you can protect the data without intalling page as app

- **Reminders**
  - Add, edit, delete reminders.
  - Track remaining days left.
  - Urgent/Expired reminders automatically appear in the Home page and remind it as notification.
  
- **Notes**
  - Add, view, and delete notes.
  - Automatic **date & time (IST)** added to each note when created.
  - Collapsible sections for better organization.
  - Editable notes with media upload.
 
- **Budget Tracker**
  - Go to the Budget Tracker page.
  - Click + Add New Budget.
  - That will showed Total Amount/Remaining Days
  - That will shows Cost per day How much you need to spend
  - Add Expenses and track everything
  - At Budget reminder it will remind your spend limits every day
  - Edit or delete using the ✏️ and 🗑️ button.

- **Checklist**
  - Add, view, edit and delete checklists.
  - Create title and checklist items and select status will be open it will be remind you everyday untill you closed this tasks

- **Utilities**
  - At utilities there you can access Monthly Calender,Calculator with (4 Modes) ,Moon Phase,Sun rise/sun set and more lots of features.
 
- **Notification**
  - In app Notification logic ware used to notify the items
  - In Notification page by enabling notification permission there you can customize the Notifications what you want like(Reminder,Notes,checklist,Budget,Moon phase) everything
   
---

## Differences from Other Note Apps (Table View)

| Feature | This App | Other Table View Notes Apps |
|---------|---------|----------------------------|
| **Date & Time** | Automatic IST timestamp | Often no timestamp or UTC only |
| **Home Overview** | Shows urgent reminders & notes | Usually requires manual sorting |
| **Lightweight** | Pure HTML/CSS/JS, no backend | May require database |
| **Dark Mode** | Persistent | Sometimes absent |
| **User Profile** | Editable image & name | Rarely included |
| **Storage** | Compared to other apps it will be just 7kb also web app|Other apps needs more storage and permission and trackers to run smoothly|

---

### PWAs
| Feature               | Description                                     | Limitation                          | Description                                               |
| --------------------- | ----------------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| 🎨 **Custom Theme**   | Uses CSS variables for easy theme control       | ❌ **No Backend**                   | Static hosting, no real-time database or APIs             |
| 🚀 **Offline Access** | App shell + assets cached by the service worker | ⚡ **Offline Cache Limits**         | Browsers restrict cache size                              |
| 📲 **Installable**    | Add to home screen / desktop                    | 📱 **iOS Limitations**              | Background push is not available on iOS                   |
| ⚡ **Fast Load**      | Cache-first for app files, network-first for 3rd-party | 🕒 **First Load Requires Internet** | Offline works after the first successful load             |
| 🧩 **Cross-Platform** | Works on Android, iOS & Desktop                 | 🧩 **Storage Quota**                | Browser limits offline storage                            |
| 🔐 **Secure (HTTPS)** | Hosted over HTTPS (see `CNAME`)                 | 🌗 **Dynamic Theme Requires JS**    | Dark/light mode is applied from saved settings on load    |







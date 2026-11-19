# Nothing Reminder 📝⏰

**One small app for reminders, notes, budgets, checklists, utilities and daily planning — built to work offline.**

![App overview](https://github.com/user-attachments/assets/40c9acf2-5c6f-4138-9957-f5bc47314583)

🌐 **Live app:** [https://nothing-reminder.localplayer.dev](https://nothing-reminder.localplayer.dev)

---

## Why Nothing Reminder?

| | |
|---|---|
| ⚡ **Small & fast** | Pure HTML, CSS and JavaScript — just **7kb** of app code. |
| 📴 **Offline first** | Opens and works offline after the first load. |
| 🔒 **Local-first** | Your data stays in your browser, not on an app server. |
| 📲 **Installable** | Add it to your phone or desktop like a native app. |
| 🌗 **Personal** | Dark mode, languages, animations, default page and popup layout. |
| 🧰 **All-in-one** | Planning, tracking and calculators in a single lightweight app. |

**Overall score: ⭐ 9.3 / 10**

| Area | Score | What stands out |
|---|---|---|
| 🧠 Performance | 9.5 | Fast operations and optimized loops |
| 🔒 Security | 9.0 | Local-first; only push token and optional feature APIs go online |
| 🧰 Usability | 9.0 | Clean layout, simple flows, responsive on phones, tablets and desktop |
| ☁️ Offline capability | 10.0 | Full offline PWA mode after the first load |
| 📦 Storage efficiency | 9.0 | Compact JSON data and device-side backups |
| 🧩 Maintainability | 9.2 | Service workers and modular inline scripts |
| 💡 Innovation | 8.9 | A tiny offline planner with PWA behaviour |

---

## What's inside

### 🏠 Home — your daily dashboard
- Live overview of reminders, checklists and priorities.
- Urgent, due-today and **expired reminders** stay visible — expired ones are labelled `Expired`, never hidden.
- Quick-expand panels for notes, budgets, checklists, progress and priorities.
- Priority queue items appear with their own star, one item per line.
- Reminders overview uses plain bold labels — no decorative fills.

### ⏰ Reminders
- Add, edit and delete reminders with end dates.
- Remaining-days counter and `Expired` / urgent states.
- Expired and upcoming reminders feed the Home dashboard and notification alerts.

### 📝 Notes
- Create, view and delete notes with automatic **IST timestamps**.
- Rich text, tables and media support.
- Notes can raise notification alerts and appear on Home.

### 💰 Budget Tracker
- Create budgets with total amount and duration.
- See remaining days, per-day spend target, expenses and totals.
- Daily budget-limit reminders and editable / deletable budgets.
- Pie chart is always visible — no show/hide button in the way.

### ✅ Checklist
- Create, view, edit and delete checklists.
- **Every item** is shown as its own bullet under the title, one below another.
- Open checklists remind you every day until you close them.

### 🎯 Priority Queue
- Plan what's next by day with today / tomorrow badges.
- Tick items off as done and track daily completion.
- Home view mirrors the queue with a star icon and clean spacing.

### 📈 Progress Tracker
- Create goals and watch them update on the Home dashboard.

### 🐷 Piggy Bank
- Track daily savings in one place.

### 🍽 Calories
- Log food and calories burned, maintain a weight profile and review history.
- Daily progress bars and meal-wise grouping.

### 🔔 Notifications
- Ask for browser notification permission once, then switch categories on or off:
  - Reminder page reminders (including expired)
  - Notes reminders
  - Checklist reminders
  - Priority queue alerts
  - Budget reminders
  - Moon phase alerts
  - Gold rate change alerts
- Settings are saved with your app data and restored on every load.
- Push delivery uses Firebase Cloud Messaging; the browser permission controls what can appear.

### 🗓 Utilities
- **Monthly calendar** with Tamil month display, numeric jothidam, next holiday, day quiz and random date.
- **50 years calendar** with month and year views.
- **Calculator** with Normal, Age, Date Difference, BMI and EB Bill modes.
- **EB Bill Calculator** with an editable tariff table and reset-to-default.
- **Moon Phase** with next full moon and new moon.
- **Sunrise & Sunset** for your selected place.
- **Gold Rate Today**, **Weather Forecast** and saved weather snapshots.
- **QR Generator** with colour, frame size and logo options.
- **Currency Converter** with refreshed rates.
- **Price Tracker** for Amazon and Flipkart product links.
- **Google Trends** live view.
- **Calculation History** for saved results.

### ⚙️ Settings & personalization
- Dark / light mode that remembers your choice.
- Default page on startup.
- Language selection (device default follows your system language).
- Animations: device default, on or off.
- Compact or half-screen popup view; drag the handle to expand a popup fully.
- "Save last changes" remembers hidden and expanded buttons.
- Editable profile name and photo.
- Provide feedback from inside the app.

### 💾 Data tools
- Backup / export and import / restore, all created on your device.
- Storage screen showing real usage and the quota reported by your browser.
- Trash Bin to restore or permanently delete removed items.
- App-shell cache powers offline use and can be cleared from browser settings.

### 📲 Install & offline
- Tap **Install** in the app or in your browser menu.
- Android Chrome: **Install app / Add to Home Screen**. On supported devices the Play Store opens after you tap Install — approve there to finish.
- iPhone: **Share → Add to Home Screen**.
- Works across Android, iOS, Windows, ChromeOS, macOS and Linux through the browser.
- Once loaded, the service worker serves the app shell and assets from cache for offline use.

---

## Privacy & security

- Data is stored locally in IndexedDB, with a localStorage fallback.
- No account, login or password is required; no contacts, location history or payment details are collected.
- Backups are generated on your device only — nothing is uploaded by the app.
- FCM uses a device token for push delivery; reminder and note content is never uploaded.
- Optional resources (fonts, QR library, weather, gold rates, exchange rates) are fetched only when those features are used.
- Saved text is rendered as plain text, not executable HTML or script.
- Notification taps only open this app's own pages.
- Network requests use HTTPS, and the app asks only for Notification permission.
- For extra protection, use your device or browser app lock with the installed PWA.

---

## Quick start

1. Open the [live app](https://nothing-reminder.localplayer.dev) or install it as a PWA.
2. Add a reminder, note or checklist from the Home screen.
3. Open **Settings → Notifications** and allow permission, then choose the alerts you want.
4. Explore **Utilities** for calendars, calculators, weather, QR and more.
5. Export a backup from the Storage page whenever you want a copy of your data.

---

## Project notes

- Static site: `index.html`, `manifest.json`, `service-worker.js`, `firebase-messaging-sw.js` and `assets/`.
- IndexedDB is the primary store; localStorage is the fallback.
- Service workers handle offline caching and push messages.
- Hosting uses the custom domain declared in `CNAME`; availability follows the domain's DNS and hosting provider.
- The Firebase config in the client is public by design — enable Firebase App Check and restrict the push endpoint if you deploy your own copy.

**Version:** 13.9.0 · **Updated:** 15-Nov-2026 · **Mode:** Open source · **App Size:** 7kb

---

## Contact & support

- Source and contributions: [Spydernet on GitHub](https://github.com/spydernet3)
- Bugs and feature requests: open an issue on the project repository with steps to reproduce.
- Email: [mersalmgblog@gmail.com](mailto:mersalmgblog@gmail.com)
- For privacy questions, use the subject **Privacy**.
- Release notes are in the **Update Blog** section inside the app.

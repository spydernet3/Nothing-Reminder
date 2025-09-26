# Smart Reminder & Notes App 📝⏰

A lightweight, web-based Reminder and Notes application with dark mode, collapsible sections, and IST timestamp support. Designed for **fast note-taking, reminders, and home overview**.

!> Data may fetching slowly based on your browser speed..
---
REMINDER APP [ https://spydernet3.github.io/Reminders-Notes/ ]
---
## Features

- **Reminders**
  - Add, edit, delete reminders.
  - Track start & end dates.
  - See “days left” until reminder expires.
  - Urgent/Expired reminders automatically appear in the Home page.
  - Bold display of reminders in Home page.
  
- **Notes**
  - Add, view, and delete notes.
  - Automatic **date & time (IST)** added to each note when created.
  - Collapsible sections for better organization.
  - Editable profile with image upload.
  
- **Dark Mode**
  - Switch between light and dark themes.
  - Settings persist in localStorage.

- **Home Overview**
  - Quick view of urgent reminders and latest notes.

- **Responsive Sidebar**
  - Collapsible sidebar with toggle button.
  - Easy navigation between Home, Reminders, and Notes pages.

---

## How to Use

### Reminders
1. Go to the **Reminders** page.
2. Click **+ Add New Reminder**.
3. Fill **Title, Start Date, End Date**.
4. Click **Save**.  
5. Edit or delete using the ✏️ and 🗑️ buttons.
6. Urgent reminders appear on the **Home** page automatically.

### Notes
1. Go to the **Notes** page.
2. Click **+ Add New Note**.
3. Write your note in the textarea.
4. Click **Save**. IST **date & time** is added automatically.
5. View notes in the collapsible **View Notes** section.
6. Delete notes with 🗑️ button.

### Profile
- Click the profile picture to upload a new image.
- Click **Edit Name** to update the username.

### Dark Mode
- Click the 🌙 button in the sidebar to toggle dark mode.
- Dark mode preference is saved.

---

## Differences from Other Note Apps (Table View)

| Feature | This App | Other Table View Notes Apps |
|---------|---------|----------------------------|
| **Date & Time** | Automatic IST timestamp | Often no timestamp or UTC only |
| **Home Overview** | Shows urgent reminders & notes | Usually requires manual sorting |
| **Collapsible Sections** | Yes | Often static table view |
| **Bold Urgent Reminders** | Yes | Not highlighted |
| **Edit & Delete** | Both available | Sometimes only edit |
| **Lightweight** | Pure HTML/CSS/JS, no backend | May require database |
| **Dark Mode** | Persistent | Sometimes absent |
| **User Profile** | Editable image & name | Rarely included |

---

## Installation / Usage

1. Clone or download the repository:
   ```bash
   git clone <repo_url>

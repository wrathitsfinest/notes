# My Notes - Progressive Web App

A beautiful, modern note-taking application that works on desktop and mobile devices.

## ✨ Features

- **Create, Edit, Delete** notes with a beautiful interface
- **Auto-save** - changes save automatically as you type
- **Offline support** - works without internet (when installed as PWA)
- **Installable** - add to your phone's home screen like a native app
- **Local storage** - all notes stay private on your device
- **Responsive design** - works on all screen sizes

## 🚀 How to Use

### Option 1: Quick Start (Web Only)
1. Open `index.html` in your browser
2. Start creating notes!

**Note:** Service worker (offline support) won't work with `file://` protocol

### Option 2: Full PWA Experience (Recommended)

To test the full PWA features (offline mode, install prompt), you need a local server:

#### Using Python:
```bash
# If you have Python installed
python -m http.server 8000
```

#### Using Node.js:
```bash
# Install http-server globally (one time)
npm install -g http-server

# Run the server
http-server .
```

#### Using VS Code:
Install the "Live Server" extension and click "Go Live"

Then open `http://localhost:8000` (or whatever port your server uses)

## 📱 Installing on Your Phone

1. Serve the app using a local server (see above)
2. Find your computer's local IP address
3. On your phone, open `http://YOUR-IP:8000` in the browser
4. The browser will show an "Install" or "Add to Home Screen" option
5. Install it and use like a native app!

### Finding Your IP:
- **Windows:** `ipconfig` (look for IPv4 Address)
- **Mac/Linux:** `ifconfig` (look for inet)

## 📁 Project Structure

```
[app]Notes/
├── index.html          # Main HTML structure
├── index.css           # Styles and design system
├── app.js              # App logic and functionality
├── manifest.json       # PWA configuration
├── service-worker.js   # Offline support
├── icons/              # App icons
│   └── icon-512x512.png
└── README.md           # This file
```

## 🎨 Customization

- **Colors:** Edit CSS variables in `index.css` (lines 7-65)
- **App Name:** Change in `manifest.json` and `index.html`
- **Icon:** Replace `icons/icon-512x512.png` with your own

## 💾 Data Storage

All notes are stored in your browser's LocalStorage. They persist between sessions but are specific to:
- The browser you're using
- The domain/URL you're accessing from

**Backup:** To backup notes, copy the LocalStorage data or export notes manually

## 🛠️ Technologies

- Pure HTML5, CSS3, JavaScript (ES6+)
- No frameworks or dependencies
- Progressive Web App (PWA) standards
- Service Worker for offline functionality
- LocalStorage API for data persistence

---

**Created with ❤️ using Antigravity AI**

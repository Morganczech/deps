# Deps

**Deps** is a native Linux desktop application for managing Node.js dependencies,
designed specifically for developers using the GNOME desktop environment.

Deps provides a clear, visual overview of project dependencies and updates,
without forcing developers to constantly switch between terminals, editors,
and browser tabs.

---

## 🎯 Intent & Philosophy

Deps is built with a **Linux-first mindset**.

It is not a web application wrapped in a window.
It is a local, native tool that respects how Linux developers actually work.

### Core Principles

- **Linux-Native**
  - Designed to blend naturally into the GNOME desktop
  - Uses native dialogs, system theming, and platform conventions

- **Local & Private**
  - No cloud services
  - No user accounts
  - No telemetry or tracking
  - Everything runs locally on your machine

- **User in Control**
  - No automatic updates without confirmation
  - Clear visibility into what will change and why

- **MVP-Oriented**
  - Focus on one job: dependency awareness and updates
  - Avoid feature creep and unnecessary abstractions

---

## 🚀 Features (MVP)

The initial version of Deps focuses on a minimal, reliable feature set.

### Project Discovery
- Select a root directory containing Node.js projects
- Automatically detects `package.json` files
- Supports multiple projects within a single workspace

### Dependency Overview
- Clear list of `dependencies` and `devDependencies`
- Shows:
  - current installed version
  - wanted version (according to `package.json`)
  - latest available version
- Visual distinction between:
  - up-to-date packages
  - safe updates (patch / minor)
  - potentially breaking updates (major)

### Update Checking
- Uses the locally installed package manager:
  - `npm` (initially)
  - respects local `.npmrc` configuration
- No external services or APIs

### Controlled Updates
- One-click update to the **wanted** version
- Explicit confirmation required for major upgrades
- Live command output visible during operations

---

## 🧱 Technology Stack

Deps is designed around **native Linux integration**, not browser compatibility.

### Desktop Runtime
- **Tauri (preferred)** or other lightweight native runtime
- Focus on:
  - low memory usage
  - fast startup
  - native system behavior

### UI Layer
- Web-based UI rendered inside a native shell
- Layout and spacing inspired by **GNOME Human Interface Guidelines**
- Styling aligned with **libadwaita** principles:
  - system colors
  - adaptive light/dark mode
  - minimal visual noise

### Application Core (Native System Layer)
- Local execution of system commands (`npm`)
- Project scanning and package parsing
- No background services or servers
- Clear separation between:
  - UI (presentation)
  - application core (logic)
  - system interaction (filesystem, processes)

### Language Choices
- **TypeScript** for UI and data modeling
- **Rust** (or equivalent native layer) for system interaction

---

## 🔒 Security & Trust Model

Deps does not introduce new trust boundaries.

- No API keys
- No background services
- No persistent network connections
- All package resolution is delegated to the user's existing tooling

Network access occurs only when:
- the user explicitly checks for updates
- the local package manager performs its standard operations

---

## ❌ Non-Goals

To keep Deps focused and maintainable, the following are explicitly out of scope:

- Full IDE functionality
- Automatic background updates
- CI/CD integration
- Cloud synchronization
- Team or account-based features
- Dependency resolution outside standard Node.js tooling

---

## 📦 Project Status

Deps is currently in the **planning and architecture phase**.

The next milestone is a functional MVP that:
- scans local projects
- displays dependency status
- safely performs user-initiated updates

---

## 🐧 System Requirements (Linux)

To build and run Deps on Linux, you need the following system development libraries installed.

**Fedora:**
```bash
sudo dnf install webkit2gtk3-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel
```

**Debian / Ubuntu:**
```bash
sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

**Arch:**
```bash
sudo pacman -S webkit2gtk base-devel curl wget openssl appmenu-gtk-module gtk3 libappindicator-gtk3 librsvg
```

Without these libraries, the Tauri build will fail.

---

## 🐧 Why Deps Exists

Linux developers already have powerful tools.
Deps exists to make dependency maintenance **clearer, calmer, and more intentional** —
without sacrificing control or performance.

---

## 🛠️ Developer Notes

**Tauri & Vite Ports**
Tauri Dev uses the same port as Vite (1420). If you change the port in `vite.config.ts`, you must also update `devPath` in `src-tauri/tauri.conf.json`.

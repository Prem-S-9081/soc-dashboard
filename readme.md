# SOC Operations Center — Frontend

> A professional, real-time Security Operations Center dashboard built with vanilla JavaScript, powered by NSL-KDD network intrusion detection data.

**Live Demo:** [soc.securedbyprem.com](https://soc.securedbyprem.com)  
---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [File Structure](#file-structure)
- [Module Breakdown](#module-breakdown)
- [Tab Reference](#tab-reference)
- [Authentication System](#authentication-system)
- [Data Flow](#data-flow)
- [Demo Mode vs Live Mode](#demo-mode-vs-live-mode)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Default Credentials](#default-credentials)

---

## Overview

The SOC Operations Center is a fully client-side Security Operations dashboard that visualises network intrusion alerts from the **NSL-KDD dataset** — a benchmark dataset widely used in network intrusion detection research. It supports real-time alert streaming via WebSocket, automated investigation playbooks, threat intelligence analysis, shift handover reports, and full team management.

The frontend is a **zero-dependency, pure HTML/CSS/JavaScript** application served as static files via GitHub Pages. It connects to a FastAPI backend on Render.com for live data but falls back seamlessly to a built-in NSL-KDD demo data generator when the backend is unreachable.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                               │
│                                                                     │
│  soc.securedbyprem.com                                              │
│                                                                     │
│  ┌─────────────┐    ┌──────────────────────────────────────────┐   │
│  │  index.html │───▶│              login.html                  │   │
│  │  (redirect) │    │  • Auth guard (localStorage sessions)    │   │
│  └─────────────┘    │  • User/password validation              │   │
│                     │  • Role-based access (admin/analyst)     │   │
│                     └──────────────┬─────────────────────────-─┘   │
│                                    │ authenticated                  │
│                                    ▼                                │
│                     ┌──────────────────────────────────────────┐   │
│                     │           dashboard.html                  │   │
│                     │                                           │   │
│                     │  ┌─────────┐  Script Loading Order:      │   │
│                     │  │Block[0] │  CONFIG    — API URLs        │   │
│                     │  │Block[1] │  AUTH      — auth.js         │   │
│                     │  │Block[2] │  AUTH GUARD— session check   │   │
│                     │  │Block[3] │  LIVE FEED — live-feed.js    │   │
│                     │  │Block[4] │  ATTACK MAP— attack-map.js   │   │
│                     │  │Block[5] │  PLAYBOOKS — playbook-runner │   │
│                     │  │Block[6] │  DASHBOARD — main logic      │   │
│                     │  └─────────┘                              │   │
│                     │                                           │   │
│                     │  Views (SPA tabs):                        │   │
│                     │  ├── #v-alerts        Alert queue         │   │
│                     │  ├── #v-analytics     Charts & KPIs       │   │
│                     │  ├── #v-team          Analyst management  │   │
│                     │  ├── #v-attack-map    SVG world map       │   │
│                     │  ├── #v-shift-report  Handover report     │   │
│                     │  └── #v-threat-intel  Intel dashboard     │   │
│                     └──────────────┬───────────────────────────┘   │
│                                    │                                │
└────────────────────────────────────┼────────────────────────────────┘
                                     │ HTTPS REST + WSS WebSocket
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     RENDER.COM (Backend)                            │
│                                                                     │
│  soc-dashboard-api.onrender.com                                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    FastAPI (main.py)                          │  │
│  │                                                               │  │
│  │  REST Endpoints:          WebSocket:                         │  │
│  │  GET  /api/alerts         /ws  — real-time alert stream      │  │
│  │  GET  /api/stats                                             │  │
│  │  GET  /api/threat-actors  Data Layer:                        │  │
│  │  GET  /api/alert-groups   ┌─────────────────────────────┐   │  │
│  │  POST /api/alerts/update  │    nsl_kdd_loader.py         │   │  │
│  │  POST /api/alerts/        │  • Loads KDDTrain+.txt       │   │  │
│  │       playbook-complete   │  • Parses 41 features        │   │  │
│  │  POST /api/alerts/        │  • Maps to alert schema      │   │  │
│  │       simulate            │  • 500 alerts in memory      │   │  │
│  │                           └─────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Storage: In-memory dict (alerts_db)                                │
│  Dataset: NSL-KDD (KDDTrain+.txt — 125,973 rows)                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     GITHUB PAGES (Frontend Host)                    │
│                                                                     │
│  Repo: soc-dashboard (Public)                                       │
│  Branch: main → GitHub Actions → static deploy                      │
│  Custom domain: soc.securedbyprem.com (CNAME → GitHub Pages)       │
│  SSL: Auto-provisioned by GitHub (Let's Encrypt)                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     GODADDY DNS                                     │
│                                                                     │
│  soc        CNAME → Prem-S-9081.github.io                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Alert Management
- Real-time alert queue with 50 alerts per page pagination
- Filter by status, priority, and time range
- Full-text search across alert ID, signature, asset, and IP
- Bulk status updates and CSV export
- Per-alert profile modal with NSL-KDD feature breakdown
- Dynamic analyst assignment (round-robin, stable per alert)

### Analytics
- Donut charts: attack type distribution, status breakdown
- Bar charts: top assets, top source IPs, attack trends
- Sparklines: hourly alert volume
- Heatmap: attack frequency by hour × day
- Kill-chain progression visualization
- IP geolocation cards with flag display

### Team Management
- Analyst cards with workload indicators
- Group/shift management
- Member profile modals with case history
- Shift workload distribution charts

### Attack Map
- SVG world map with animated attack arcs
- Country-level threat aggregation
- Filter by attack type
- Top countries sidebar with drill-down
- Threat level legend (Critical / High / Medium / Low)

### Shift Report
- Auto-generated shift handover document
- Critical and high-priority open findings table
- Status overview with percentage bars
- NSL-KDD signature breakdown
- Analyst recommendations by priority tier
- PDF export

### Threat Intelligence
- Live threat actor profiling (APT-29, Lazarus Group, etc.)
- Top NSL-KDD attack type rankings
- Most targeted asset analysis
- Top source IP leaderboard with geolocation flags
- Alert group clustering
- Severity and asset criticality breakdowns

### Live Feed
- WebSocket connection to backend (`/ws`)
- Real-time new alert notifications
- Auto-reconnect with exponential backoff
- Notification panel with unread count badge

### Playbook Runner
- 5 automated investigation playbooks:
  - DDoS Response
  - Brute Force Investigation
  - Data Exfiltration Response
  - Malware Containment
  - Port Scan Analysis
- Step-by-step execution with progress bar
- Auto-resolve on completion with report generation

---

## File Structure

```
soc-dashboard/                     ← GitHub Pages repo root
│
├── index.html                     ← Entry point — redirects to login.html
├── login.html                     ← Authentication page
├── dashboard.html                 ← Main SPA dashboard (212KB)
│
├── config.js                      ← API URL configuration
├── auth.js                        ← Auth system, user management, session
├── dashboard.js                   ← Source reference (logic embedded in dashboard.html)
├── attack-map.js                  ← SVG world map + globe visualisation
├── live-feed.js                   ← WebSocket live feed client
├── playbook-runner.js             ← Automated investigation playbooks
│
├── style.css                      ← Global stylesheet (dark theme)
│
├── CNAME                          ← Custom domain: soc.securedbyprem.com
├── .github/
│   └── workflows/
│       └── deploy.yml             ← GitHub Actions auto-deploy on push
│
└── README.md                      ← This file
```

---

## Module Breakdown

### `config.js`
Sets global `window.API_BASE_URL` and `window.WS_URL`.

| Condition | API URL |
|---|---|
| `RENDER_API_URL` set | Uses that URL directly |
| `localhost` / `127.0.0.1` | `http://localhost:8000` |
| Any other host | `https://soc-dashboard-api.onrender.com` |

Also defines shared constants: `SEVERITY_COLORS`, `STATUS_COLORS`, `PRIORITY_COLORS`, `NSL_KDD_LABEL_MAP`, `PALETTE`.

---

### `auth.js`
Full authentication and user management system stored in `localStorage`.

| Function | Description |
|---|---|
| `authInit()` | Validates session on page load, redirects if expired |
| `authLogout()` | Clears session, redirects to login |
| `authInjectTopbar()` | Renders user badge, dropdown menu, notification bell |
| `authShowProfile()` | Opens current user profile modal |
| `authShowAdminPanel()` | Opens full user management (admin only) |
| `authShowUserManagement()` | CRUD panel for users and roles |
| `authSaveUser()` | Saves user edits to localStorage |
| `authChangePassword()` | Password update with current password verification |

**localStorage keys used:**
- `soc_session` — current session `{userId, username, isAdmin, expires}`
- `soc_users` — user database array
- `soc_members` — analyst team members
- `soc_groups` — shift groups

---

### `dashboard.js` / `dashboard.html` Block[6]
Core dashboard logic. 47 functions, ~88KB.

| Function | Description |
|---|---|
| `loadData()` | Fetches `/api/alerts` + `/api/stats`, falls back to demo |
| `genDemoAlerts()` | Generates 500 NSL-KDD simulated alerts client-side |
| `renderStats()` | Updates 8 KPI stat cards |
| `applyFilters()` | Filters alert array by status/priority/date/search |
| `renderTable()` | Renders paginated alert table with 50 per page |
| `renderPager()` | Builds pagination controls |
| `openAlertProfile()` | Opens detailed alert modal |
| `renderAnalytics()` | Builds all Analytics tab charts |
| `renderTeam()` | Builds Team tab: analyst cards, groups, workload |
| `generateShiftReport()` | Builds shift handover HTML report |
| `renderThreatIntel()` | Builds Threat Intel tab (async, fetches threat actors) |
| `reassignAlerts()` | Round-robin assignment to team members |
| `getTeamNames()` | Reads team from localStorage or defaults |
| `switchView()` | SPA tab switching with per-tab render triggers |
| `exportCSV()` | Downloads filtered alerts as CSV |
| `exportReportPDF()` | Opens shift report in print window |

---

### `attack-map.js`
SVG world map with animated attack visualisation.

| Function | Description |
|---|---|
| `updateAttackMap()` | Entry point — processes alerts, triggers render |
| `renderMapSVG()` | Draws world map, countries, attack arcs, dots |
| `renderMapSidebar()` | Top countries list with flag and count |
| `renderMapStats()` | 6 stat cards (countries, IPs, top type, etc.) |
| `setMapFilter()` | Filters map by attack type |
| `proj()` | Equirectangular lat/lng → SVG pixel projection |
| `amCol()` | Risk score → threat level colour |

---

### `live-feed.js`
WebSocket client for real-time alerts.

| Function | Description |
|---|---|
| `initLiveFeed(cb)` | Initialises WS connection, calls `cb` on new alert |
| `connectWS()` | Opens WebSocket to `WS_URL`, handles ping/reconnect |
| `updateLiveFeedUI()` | Updates the live feed panel with recent events |

---

### `playbook-runner.js`
Five built-in investigation playbooks with step-by-step execution.

| Playbook Key | Name | Steps |
|---|---|---|
| `ddos` | DDoS Response | 6 steps |
| `brute` | Brute Force Investigation | 5 steps |
| `exfil` | Data Exfiltration Response | 6 steps |
| `malware` | Malware Containment | 6 steps |
| `portscan` | Port Scan Analysis | 5 steps |

---

## Tab Reference

| Tab | View ID | Render Function | Data Source |
|---|---|---|---|
| Alerts | `#v-alerts` | `renderTable()` | `/api/alerts` |
| Analytics | `#v-analytics` | `renderAnalytics()` | `alerts[]` (in memory) |
| Team | `#v-team` | `renderTeam()` | `localStorage` + `alerts[]` |
| Attack Map | `#v-attack-map` | `updateAttackMap()` | `alerts[]` |
| Shift Report | `#v-shift-report` | `generateShiftReport()` | `alerts[]` |
| Threat Intel | `#v-threat-intel` | `renderThreatIntel()` | `/api/threat-actors` + `alerts[]` |

---

## Authentication System

Authentication is entirely **client-side** using `localStorage`. This is suitable for a portfolio/demo project.

```
Login flow:
  POST credentials → validate against soc_users in localStorage
       ↓
  Generate session token → store in soc_session with 8h expiry
       ↓
  Redirect to dashboard.html
       ↓
  authInit() runs → validates session on every page load
       ↓
  Expired / missing → redirect back to login.html
```

---

## Data Flow

```
Page Load
    │
    ▼
authInit() ─── invalid session ──▶ login.html
    │
    │ valid session
    ▼
loadData()
    │
    ├─── fetch /api/alerts ──▶ Render backend ──▶ NSL-KDD alerts[]
    │         (65s timeout)
    │
    ├─── fetch /api/stats  ──▶ Render backend ──▶ stats{}
    │
    │    on failure / timeout
    └─── genDemoAlerts()   ──▶ client-side NSL-KDD simulation
    │
    ▼
renderStats()   ──▶ 8 KPI cards updated
applyFilters()  ──▶ alert table rendered (page 1 of N)
    │
    ▼
initLiveFeed()  ──▶ WebSocket /ws ──▶ real-time new_alert events
    │                                  └──▶ addNotification()
    │                                  └──▶ openAlertProfile()
    ▼
setInterval(loadData, 30s)  ──▶ periodic refresh
```

---

## Demo Mode vs Live Mode

| | Demo Mode | Live Mode |
|---|---|---|
| **Trigger** | Backend unreachable / timeout | `/api/alerts` returns 200 OK |
| **Data** | `genDemoAlerts()` — 500 client-side alerts | Real NSL-KDD data from backend |
| **Indicator** | Orange "Demo Mode" bar at top | No bar (hidden) |
| **Features** | All tabs work fully | All tabs work fully |
| **WebSocket** | Disabled | Connected, streams new alerts |
| **Refresh** | Every 30s retries backend | Every 30s re-fetches live data |

---

## Local Development

```bash
# Clone the repo
git clone https://github.com/Prem-S-9081/soc-dashboard.git
cd soc-dashboard

# Serve locally (Python built-in server)
python3 -m http.server 3000

# Open browser
open http://localhost:3000/login.html
```

To run with the **live backend** locally, clone and start the backend:
```bash
# In a separate terminal
git clone https://github.com/Prem-S-9081/soc-dashboard-api.git
cd soc-dashboard-api
pip install -r requirements.txt
python main.py
# API available at http://localhost:8000
```

`config.js` auto-detects `localhost` and points to `http://localhost:8000` — no changes needed.

---

## Deployment

Deployed via **GitHub Actions** on every push to `main`.

```yaml
# .github/workflows/deploy.yml
on: push (branch: main)
  → actions/upload-pages-artifact
  → actions/deploy-pages
```

**Custom domain setup:**
1. `CNAME` file in repo root contains `soc.securedbyprem.com`
3. GitHub Pages settings: Custom domain + Enforce HTTPS

---

> ⚠️ This project uses client-side authentication for demo purposes. Do not store sensitive or real data in this system.

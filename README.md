# 🏎️ F1 2026 Season Dashboard

A real-time Formula 1 dashboard built with React + Vite, pulling data from two APIs:

- **Jolpica API** (Ergast successor) — Standings, race results, pit stops, schedule
- **OpenF1 API** — Sector times, speed traps, stint/tire data

Auto-deploys to GitHub Pages via GitHub Actions. Data refreshes weekly (or on-demand).

---

## ✨ Features

| Tab | What it shows |
|-----|--------------|
| **Overview** | Championship leader, last race winner, fastest lap, pit stop stats, next race countdown |
| **Standings** | Drivers' & Constructors' championships with team-colored bars and driver breakdowns |
| **Race Results** | Podium cards, full classification, fastest lap — **now enriched with OpenF1 sector time breakdowns (Top 5 per race)** |
| **Sector Times** | Full driver comparison table: best S1/S2/S3, theoretical best lap, speed traps (I1/I2/ST). Meeting & session selectors (FP1–Race). Visual speed trap bar chart. |
| **Pit Stops** | Ranked pit stop times with bar visualization |
| **Schedule** | Full 2026 calendar with completion status, sprint flags, winners |

---

## 🚀 GitHub Setup Guide

### Step 1 — Create the Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `f1-dashboard` (this must match the `base` in `vite.config.js`)
3. Set it to **Public**
4. Do **not** initialize with a README (we're uploading one)
5. Click **Create repository**

### Step 2 — Upload the Project Files

1. Extract the `.tar.gz` you downloaded
2. In your new repo, click **"Add file"** → **"Upload files"**
3. Drag and drop these files/folders:
   - `src/` (folder with `main.jsx` and `App.jsx`)
   - `public/` (folder with `data.json` and `openf1-data.json`)
   - `scripts/` (folder with `fetch-f1-data.mjs` and `fetch-openf1-data.mjs`)
   - `index.html`
   - `package.json`
   - `vite.config.js`
   - `.gitignore`
   - `README.md`
4. Commit directly to `main`

### Step 3 — Create the GitHub Actions Workflow

The `.github/` folder doesn't transfer through drag-and-drop uploads. Create it manually:

1. In your repo, click **"Add file"** → **"Create new file"**
2. In the filename field, type: `.github/workflows/deploy.yml`
   - GitHub will auto-create the folder structure as you type the slashes
3. Paste the contents of the `deploy.yml` file (see below)
4. Click **"Commit changes"**

<details>
<summary><strong>📋 deploy.yml contents (click to expand)</strong></summary>

```yaml
name: Fetch F1 Data & Deploy

on:
  schedule:
    - cron: '0 23 * * 0'   # Every Sunday 5 PM CT
  push:
    branches: ['main']
  workflow_dispatch:         # Manual trigger

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Fetch F1 data from Jolpica API
        run: node scripts/fetch-f1-data.mjs
      - name: Fetch sector & speed data from OpenF1 API
        run: node scripts/fetch-openf1-data.mjs
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```

</details>

### Step 4 — Enable GitHub Pages

1. Go to your repo's **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. That's it — the workflow handles the rest

### Step 5 — Trigger the First Deploy

1. Go to the **Actions** tab in your repo
2. Click **"Fetch F1 Data & Deploy"** in the left sidebar
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait 1–2 minutes for it to complete
5. Your dashboard will be live at: `https://YOUR-USERNAME.github.io/f1-dashboard/`

---

## 🔄 How Data Updates Work

The GitHub Actions workflow runs automatically **every Sunday at 5 PM Central Time** and does:

1. `node scripts/fetch-f1-data.mjs` — Pulls standings, results, pit stops, schedule from Jolpica API → `public/data.json`
2. `node scripts/fetch-openf1-data.mjs` — Pulls sector times, speed traps, stint data from OpenF1 API → `public/openf1-data.json`
3. `npm run build` — Builds the React app with fresh data
4. Deploys to GitHub Pages

You can also trigger it manually anytime from the Actions tab (useful after race weekends).

---

## 🏗️ Local Development

```bash
# Install dependencies
npm install

# Fetch live data from both APIs
npm run fetch-all

# Or fetch individually:
npm run fetch-data       # Jolpica API only
npm run fetch-openf1     # OpenF1 API only

# Start dev server
npm run dev
```

The dashboard ships with mock data in `public/data.json` and `public/openf1-data.json`, so `npm run dev` works immediately without fetching.

---

## 📁 Project Structure

```
f1-dashboard/
├── .github/workflows/
│   └── deploy.yml              ← GitHub Actions (fetch + build + deploy)
├── scripts/
│   ├── fetch-f1-data.mjs       ← Jolpica API fetcher (standings, results, pits)
│   └── fetch-openf1-data.mjs   ← OpenF1 API fetcher (sectors, speeds, stints)
├── src/
│   ├── main.jsx                ← React entry point
│   └── App.jsx                 ← Dashboard (all tabs, all visualizations)
├── public/
│   ├── data.json               ← Jolpica data (generated)
│   └── openf1-data.json        ← OpenF1 data (generated)
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 📊 Data Sources

| Source | What it provides | Auth required? | Rate limit |
|--------|-----------------|----------------|------------|
| [Jolpica API](https://github.com/jolpica/jolpica-f1) | Standings, race results, qualifying, pit stops, schedule | No | Generous |
| [OpenF1 API](https://openf1.org) | Sector times, speed traps (I1/I2/ST), stints, tire compounds | No (historical) | 3 req/s, 30 req/min |

OpenF1 data is available from the 2023 season onwards. Historical data is free; real-time data during live sessions requires a paid subscription.

---

## ⚠️ Important Notes

- **Repo name matters**: The `base` in `vite.config.js` is set to `/f1-dashboard/`. If you name your repo something different, update this value to match.
- **2026 season**: OpenF1 may not have 2026 data until sessions actually occur. The dashboard handles this gracefully — the Sector Times tab shows a helpful message, and Race Results cards simply skip the sector enrichment when no OpenF1 data is available.
- **Mock data included**: The repo ships with realistic mock data so the dashboard renders immediately. Run `npm run fetch-all` to replace with live API data.

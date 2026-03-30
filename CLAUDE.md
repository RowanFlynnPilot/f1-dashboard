# CLAUDE.md — F1 2026 Season Dashboard

## Project Overview

A React + Vite single-page F1 dashboard deployed to GitHub Pages via GitHub Actions. Pulls data from three sources: Jolpica API (race results, standings, qualifying), OpenF1 API (sector times, speed traps, driver headshots), and YouTube transcripts (post-race driver quotes via Claude API).

**Live URL:** `https://<USERNAME>.github.io/f1-dashboard/`
**Repo:** `f1-dashboard` on GitHub

## Architecture

```
f1-dashboard/
├── .github/workflows/deploy.yml    ← Fetches all APIs → builds → deploys to Pages
├── scripts/
│   ├── fetch-f1-data.mjs           ← Jolpica API → public/data.json
│   ├── fetch-openf1-data.mjs       ← OpenF1 API → public/openf1-data.json
│   └── fetch-driver-quotes.py      ← YouTube + Claude API → public/driver-quotes.json
├── src/
│   ├── main.jsx                    ← React entry point
│   └── App.jsx                     ← ~1000 lines, ALL tabs and components in one file
├── public/
│   ├── data.json                   ← Jolpica: standings, results, qualifying, pit stops
│   ├── openf1-data.json            ← OpenF1: sectors, speeds, stints, headshot URLs
│   └── driver-quotes.json          ← Post-race driver quotes
├── index.html
├── package.json
├── vite.config.js                  ← base: '/f1-dashboard/'
└── CLAUDE.md                       ← This file
```

### Key architectural decisions
- **Single-file React app** — All tabs, components, and styles live in `App.jsx`. This is intentional for simplicity. Don't split into separate component files.
- **Static data files** — Data is fetched at build time by scripts, saved as JSON in `public/`, and loaded client-side via `fetch()`. No runtime API calls from the browser.
- **GitHub Actions deployment** — Uses `npm ci` (requires `package-lock.json`). Source set to "GitHub Actions" in Pages settings, not branch-based.
- **Vite base path** — `vite.config.js` has `base: '/f1-dashboard/'` for GitHub Pages subdirectory hosting.

## Data Sources

### Jolpica API (Ergast successor)
- Base URL: `https://api.jolpica.com/ergast/f1`
- Provides: driver standings, constructor standings, race results, sprint results, qualifying results, pit stops, schedule
- Rate limit: be polite, 400ms sleep between requests
- Fetched by: `scripts/fetch-f1-data.mjs`
- Output: `public/data.json`

### OpenF1 API
- Base URL: `https://api.openf1.org/v1`
- Provides: sector times, speed traps (I1/I2/ST), stint/tire data, driver info (headshot URLs, team colours, acronyms)
- Fetched by: `scripts/fetch-openf1-data.mjs`
- Output: `public/openf1-data.json`
- Key endpoints: `/meetings`, `/sessions`, `/drivers`, `/laps`, `/stints`

### YouTube + Claude API (driver quotes)
- Uses `youtube-transcript-api` Python library to pull auto-generated captions
- Sends transcript to Claude Sonnet to extract per-driver quotes with attribution
- Requires `ANTHROPIC_API_KEY` environment variable / GitHub secret
- Fetched by: `scripts/fetch-driver-quotes.py`
- Output: `public/driver-quotes.json`
- Can run manually: `python3 scripts/fetch-driver-quotes.py --video-id <ID>`

## Dashboard Tabs

| Tab | Emoji | Content |
|-----|-------|---------|
| Overview | 📊 | Leader, last winner, fastest lap, pit stats, driver/constructor standings, next race, driver reactions quotes |
| Standings | 🏆 | Drivers' & Constructors' championships with headshots, team colors, position movement arrows, points delta |
| Race Results | 🏁 | Podium cards, full classification, dropdown race selector, OpenF1 sector enrichment |
| Sector Times | ⏱️ | Meeting/session selectors, driver comparison table, speed trap bar chart, team logos on stat cards |
| Head to Head | 🥊 | Intra-team battles: qualifying position, average finish, points scored — with battle bars and per-race chips |
| Pit Stops | 🔧 | Ranked pit times with team-colored bars, team logos |
| Schedule | 📅 | Full calendar with sprint flags, completion status |

## Design System

### Team Colors (`TC` object)
```javascript
Mercedes: "#27F4D2"    Ferrari: "#E80020"     McLaren: "#FF8000"
Red Bull: "#3671C6"    Racing Bulls: "#6692FF" Alpine: "#FF87BC"
Aston Martin: "#229971" Haas: "#B6BABD"       Williams: "#64C4FF"
Audi: "#FF0000"        Cadillac: "#1E1E1E"
```

### Fonts
- Headlines/UI: `'Outfit', sans-serif`
- Data/monospace: System fallback

### Theme
- Background: `#0a0a0f` (near-black)
- Cards: `rgba(255,255,255,0.02-0.03)` with `rgba(255,255,255,0.06)` borders
- F1 red accent: `#E80020`
- Positive/delta: `#27F4D2` (teal)
- Negative: `#E80020` (red)

### Team Name Normalization
The `normTeam()` function maps API team names to the short forms used by `TC` and `TEAM_LOGOS`:
- "Red Bull Racing" → "Red Bull"
- "Haas F1 Team" → "Haas"
- "Kick Sauber" → "Audi"
- "Racing Bulls" stays "Racing Bulls" (do NOT strip " Racing")

## Driver Headshots — Important Details

The `DH` (Driver Headshot) component has a multi-level fallback system:

1. **Base64 images** (`DRIVER_IMAGES` map in App.jsx) — Baked into the code, guaranteed to work
2. **F1.com Cloudinary CDN URLs** (`openf1-data.json` → `driverHeadshots` map) — Current 2026 team photos
3. **Team-colored acronym badge** — Fallback if both fail (e.g., "VER" in Red Bull blue circle)

### Known headshot quirks
- **Antonelli & Lindblad** are in `DH_USE_B64` set — their CDN URLs fail silently (load but render broken), so the component hardcodes them to skip external URLs and use base64 only
- **Antonelli** is listed in Jolpica as "Andrea Kimi Antonelli" (full legal name). Both "Kimi Antonelli" and "Andrea Kimi Antonelli" keys exist in `DRIVER_IMAGES`
- **Hülkenberg** — Accent-stripping normalization handles `ü` → `u` matching
- **Pérez** — Same normalization for `é` → `e`
- Do NOT use `crossOrigin="anonymous"` on external `<img>` tags — it triggers CORS preflight requests that F1.com CDN rejects
- The CDN URL format is: `https://media.formula1.com/image/upload/c_lfill,w_240/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000000/common/f1/2026/{team}/{drivercode}/2026{team}{drivercode}right.webp`

### To add a new driver headshot
1. Save their photo locally
2. Upload to a Claude conversation
3. It gets resized to 64×64, converted to base64 (JPEG preferred — avoids the ICC profile issue that caused identical PNG hashes with old silhouettes)
4. Add to `DRIVER_IMAGES` map in App.jsx
5. If the CDN URL doesn't work, add driver name to `DH_USE_B64` set

## Points Delta Calculation

The standings delta (`d` field) is computed from the last race using the F1 points table:
- Race: 25-18-15-12-10-8-6-4-2-1 + 1 fastest lap bonus (if finished P1-P10)
- Sprint: 8-7-6-5-4-3-2-1
- If the last round was a sprint weekend, both race and sprint points are combined

Position movement (`mv` field) is computed by subtracting last-round points from current totals, re-sorting to reconstruct the previous standings, and comparing positions.

## Development Commands

```bash
# Local development
npm run dev                     # Start Vite dev server (hot reload)
npm run build                   # Production build → dist/

# Data fetching
npm run fetch-data              # Jolpica API → data.json
npm run fetch-openf1            # OpenF1 API → openf1-data.json
npm run fetch-all               # Both of the above
npm run fetch-quotes            # YouTube + Claude → driver-quotes.json

# Manual quotes fetch
python3 scripts/fetch-driver-quotes.py --video-id <YOUTUBE_ID>
python3 scripts/fetch-driver-quotes.py --race "Japanese Grand Prix"
```

## GitHub Actions Workflow

The workflow runs on:
- Push to `main`
- Weekly schedule (Sunday 5 PM Central / 23:00 UTC)
- Manual trigger (`workflow_dispatch`)

Steps:
1. Checkout → Setup Node 20 → `npm ci`
2. Fetch Jolpica data
3. Fetch OpenF1 data
4. Setup Python 3.12 → `pip install youtube-transcript-api` → fetch driver quotes (only if `ANTHROPIC_API_KEY` secret exists, `continue-on-error: true`)
5. `npm run build`
6. Deploy to GitHub Pages

### Required secrets
- `ANTHROPIC_API_KEY` — For driver quotes extraction (optional — quotes step is skipped if not set)

## Common Tasks

### Adding a new tab
1. Add to `TABS` array with `{id, label}` (include emoji in label)
2. Add state variables if needed
3. Add the tab content block between the appropriate `{/* ═══ TAB_NAME ═══ */}` markers
4. If the tab needs new data, update `transformData()` and the relevant fetch script

### Updating for a new season
1. Change `SEASON` constant at top of `fetch-f1-data.mjs` and `fetch-openf1-data.mjs`
2. Update `DRIVER_IMAGES` base64 map with new driver photos
3. Update `DH_USE_B64` set if any CDN headshots fail
4. Update `openf1-data.json` headshot URLs with new team/driver codes

### Race results dropdown
The Race Results tab has a dropdown selector (`selRace` state). Value is `"all"` or a race identifier (`1`, `2`, `"2S"` for sprints). Sprint identifiers have an "S" suffix.

### Mobile responsiveness
Media queries at 768px and 480px breakpoints. All grids stack to single column, tables have `overflow-x: auto` wrappers, tabs use `flex:1` for full-width distribution.

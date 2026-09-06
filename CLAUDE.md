# CLAUDE.md — F1 2026 Season Dashboard

## Project Overview

A React + Vite single-page F1 dashboard deployed to GitHub Pages via GitHub Actions. Pulls data from three sources: Jolpica API (race results, standings, qualifying), OpenF1 API (sector times, speed traps, driver headshots), and YouTube transcripts (post-race driver quotes via Claude API).

**Live URL:** `https://rowanflynnpilot.github.io/f1-dashboard/`
**Repo:** `f1-dashboard` on GitHub

## Architecture

```
f1-dashboard/
├── .github/workflows/deploy.yml    ← Fetches all APIs → builds → deploys to Pages
├── scripts/
│   ├── fetch-f1-data.mjs           ← Jolpica API → public/data.json
│   ├── fetch-openf1-data.mjs       ← OpenF1 API → public/openf1/ (split layout)
│   ├── fetch-driver-quotes.py      ← YouTube + Claude API → public/driver-quotes.json
│   ├── fetch-tracks.mjs            ← Circuit GeoJSON → public/tracks.json (manual, not in CI)
│   └── validate-data.mjs           ← CI gate: fails the deploy if fetched data is malformed or shrank vs HEAD
├── test/scripts.test.mjs           ← node:test unit tests for the fetch-script helpers (CI gate, `npm test`)
├── src/
│   ├── main.jsx                    ← React entry point
│   └── App.jsx                     ← ~3600 lines, ALL tabs and components in one file
├── public/
│   ├── data.json                   ← Jolpica: standings, results, qualifying, pit stops
│   ├── openf1/
│   │   ├── index.json              ← Light meeting/session metadata + headshots (~11 KB, loaded on page load)
│   │   └── meetings/{key}.json     ← Full per-meeting data (~200 KB each, lazy-loaded per tab)
│   ├── driver-quotes.json          ← Post-race driver quotes
│   └── tracks.json                 ← SVG track outlines for track maps
├── index.html
├── package.json
├── vite.config.js                  ← base: '/f1-dashboard/'
└── CLAUDE.md                       ← This file
```

### Key architectural decisions
- **Single-file React app** — All tabs, components, and styles live in `App.jsx`. This is intentional for simplicity. Don't split into separate component files.
- **Static data files** — Data is fetched at build time by scripts, saved as JSON in `public/`, and loaded client-side via `fetch()`. Only `data.json` gates first paint; the OpenF1 payload is split into a light `openf1/index.json` plus per-meeting files that lazy-load when Sector Times / Telemetry / Race Results need them (all output minified — pretty-printing tripled the old single-file payload). One runtime exception: the Telemetry tab's Lap Compare live-fetches OpenF1 `/car_data` + `/location` (gated on the tab being open, cached in sessionStorage).
- **GitHub Actions deployment** — Uses `npm ci` (requires `package-lock.json`). Source set to "GitHub Actions" in Pages settings, not branch-based.
- **Vite base path** — `vite.config.js` has `base: '/f1-dashboard/'` for GitHub Pages subdirectory hosting.

## Data Sources

### Jolpica API (Ergast successor)
- Base URL: `https://api.jolpi.ca/ergast/f1`
- Provides: driver standings, constructor standings, race results, sprint results, qualifying results, pit stops, schedule
- Rate limit: be polite, 400ms sleep between requests
- Fetched by: `scripts/fetch-f1-data.mjs`
- Output: `public/data.json`
- Race results + pit stops are fetched once a race has ended (date + start time + 3h). Qualifying and sprint results are also fetched for the **in-progress weekend** (from 3 days before the race), so the Saturday build already carries them.

### OpenF1 API
- Base URL: `https://api.openf1.org/v1`
- Provides: sector times, speed traps (I1/I2/ST), stint/tire data, driver info (headshot URLs, team colours, acronyms)
- Fetched by: `scripts/fetch-openf1-data.mjs`
- Output: `public/openf1/index.json` + `public/openf1/meetings/{meetingKey}.json` (the legacy single-file `public/openf1-data.json` is removed by the script; the app still falls back to reading it for old checkouts)
- **Incremental**: meetings older than 8 days are served from the previous output (past weekends are immutable); only new/recent meetings are refetched. Cached sessions also backfill any session a flaky refetch drops, and an empty `/meetings` response aborts instead of wiping good data.
- **Cache persistence**: the cache is whatever is committed in `public/openf1/`. CI checks out fresh, so the deploy workflow commits the fetched data back to `main` after each successful deploy — without that step every run refetched every meeting since the last human commit.
- **"Final" needs a Race session**: a cached meeting older than 8 days is only accepted as-is if it has a Race session (or is older than 30 days), so a flaky run inside the fresh window can't freeze a half-fetched weekend.
- **Negative cache**: meetings OpenF1 lists but has no lap data for (pre-season tests, cancelled rounds) are recorded in `index.json` → `emptyMeetings` and skipped for 30 days instead of costing ~12 requests every run.
- `fetchJSON` retries 429/5xx/timeouts with backoff; a 404 on `/laps` just means the session has no data.
- Key endpoints: `/meetings`, `/sessions`, `/drivers`, `/laps`, `/stints`

### YouTube + Claude API (driver quotes)
- Uses `youtube-transcript-api` Python library to pull auto-generated captions
- Sends transcript to Claude Sonnet (`claude-sonnet-4-6`, temperature 0, structured outputs via `output_config.format` json_schema) to extract per-driver quotes with attribution
- Requires `ANTHROPIC_API_KEY` environment variable / GitHub secret
- Fetched by: `scripts/fetch-driver-quotes.py`
- Output: `public/driver-quotes.json`
- Can run manually: `python3 scripts/fetch-driver-quotes.py --video-id <ID>`

#### Quote workflow — adding quotes for a new race weekend

YouTube blocks GitHub Actions IPs, so transcripts cannot be fetched in CI. The flow is split:

1. **Locally**, after a race weekend airs reaction videos:
   ```powershell
   python scripts/fetch-driver-quotes.py --fetch-transcripts
   ```
   This auto-discovers new "Drivers React" videos from the F1 YouTube RSS feed and caches their transcripts to `scripts/transcripts/`. May also write to `scripts/video-ids.json`.

2. **If videos have aged off RSS** (older than ~15 most recent F1 uploads), find the IDs manually and add to `scripts/video-ids.json`, then re-run step 1. A YouTube search-results page can be scraped for `"videoId":"…"` / title pairs; only accept videos owned by the FORMULA 1 channel. F1's video titles don't always match Jolpica's race names (2026 R7 is "Barcelona-Catalunya Grand Prix" on YouTube, "Barcelona Grand Prix" in the API) — add such cases to `YOUTUBE_RACE_ALIASES` in the script so RSS discovery keeps working.

3. **Commit and push**:
   ```bash
   git add scripts/transcripts/ scripts/video-ids.json
   git commit -m "Cache transcripts for [Race Name]"
   git push
   ```

4. **CI takes over** — it reads cached transcripts, calls Claude, writes `public/driver-quotes.json` into the deploy artifact, and ships it.

5. **To pull fresh quotes locally** (or after a CI deploy):
   ```powershell
   curl -o public/driver-quotes.json https://rowanflynnpilot.github.io/f1-dashboard/driver-quotes.json
   ```
   Or run extraction locally with `ANTHROPIC_API_KEY` set:
   ```powershell
   python scripts/fetch-driver-quotes.py
   ```

#### Manual quote overrides

`scripts/quote-overrides.json` holds per-quote corrections for misattributions Claude can't catch from speaker-less auto-captions (e.g. one driver praising their teammate by name and being confused for a different driver). Each rule matches by `round`, `session`, and a `matchText` substring; it rewrites the `driver` and `team` fields. Overrides are applied after every extraction, so they survive `--force` re-runs.

## Dashboard Tabs

| Tab | Emoji | Content |
|-----|-------|---------|
| Overview | 📊 | Leader, last winner, fastest lap, pit stats, driver/constructor standings, next race, driver reactions quotes |
| Standings | 🏆 | Drivers' & Constructors' championships with headshots, team colors, position movement arrows, points delta |
| Race Results | 🏁 | Podium cards, full classification, dropdown race selector, OpenF1 sector enrichment |
| Sector Times | ⏱️ | Meeting/session selectors, driver comparison table, speed trap bar chart, team logos on stat cards |
| Telemetry | 📈 | Race Replay (animated track dots + leaderboard), Lap Compare (runtime OpenF1 fetch), lap-time/position charts, tire strategy & degradation, speed trace |
| Head to Head | 🥊 | Intra-team battles: qualifying position, average finish, points scored — with battle bars and per-race chips |
| Pit Stops | 🔧 | Ranked pit times with team-colored bars, team logos |
| Quotes | 💬 | Post-session driver quotes grouped by round, session pill filters |
| Schedule | 📅 | Full calendar with sprint flags, localized date/time, client-side completion status |

## Design System — "The Timekeeper's Lap Chart"

The visual world (chosen Sept 2026 via the Impeccable skill; recorded in `DESIGN.md`, product truth in `PRODUCT.md`, the direction contract in `.impeccable/surfaces/src-app-jsx.md`): ruled timing sheets on a dark bench. Every figure in tabular ink; each car written in its team colour. No glow, no gradients, no textures — grid, ink and rules only. Tokens live in `src/styles.css` (`:root`).

### Tokens
- Bench (page ground): `--bench #1B1F24` · sheet (paper): `--sheet #DDE4EA`, `--panel #E7EDF2` · printed rules: `--rule #9DB3CF`, `--rule-soft`, `--rule-faint`
- Ink: `--ink #14181D`, `--ink-2..5` for secondary text · record red `--red #D62828` (fastest / leader / active only) · `--green #1B7F4B` positive deltas · `--amber`, `--yellow` (flags), `--purple`
- Translucent ink ramp `--w015 … --w90`: App.jsx's old `rgba(255,255,255,α)` literals were remapped to these so the whole hierarchy survived the flip to paper. Keep using them for subtle fills/borders.
- Fonts (loaded in `index.html`): `--font-head` Barlow Condensed (headings, labels, tabs), `--font-ui` Barlow (body), `--font-data` Courier Prime (every numeral and data cell; `fontVariantNumeric:"tabular-nums"` sites also set it).

### Team colours (`TC`)
`TC_RAW` holds the broadcast liveries; `TC` is `inkify()`'d — lightness is clamped so pale liveries (Mercedes teal, Williams blue, Haas silver) read at text sizes on the sheet while keeping their hue. OpenF1 `teamColour` values are passed through `inkify()` at every use. Team colour is ink, never a fill behind text.
```javascript
Mercedes "#27F4D2" → ink ~#178f7b   Ferrari "#E80020"   McLaren "#FF8000"   Red Bull "#3671C6"
Racing Bulls "#6692FF"   Alpine "#FF87BC"   Aston Martin "#229971"   Haas "#B6BABD"
Williams "#64C4FF"   Audi "#FF0000"   Cadillac "#D4AF37"
```

### Shell and components
- `.bench` page → `header.hdr` (title + Courier stamp: round, next race, freshness) → index tabs (`.tab-bar .tb`, active tab joins the sheet) → one `main .sheet` per tab with a `.sheet-band` provenance strip (sources + fetched time).
- Headings: `h2.sheet-h` (condensed caps) + `p.sheet-sub` (Courier). Sections separate with `.rule-h`, not cards.
- Overview first viewport: `LapChart` (SVG, one column per lap, positions as rows, winner in red, pit circles, yellow/SC bands), `LapReadout`, `LapScrubber` (stopwatch; play advances laps), standings `.billing` (size = rank), `.podium`, `.figures`.
- The lap cursor is shared: the scrubber writes `#lap=N`; the Telemetry replay opens on that lap.
- Motion: `.fu` fade-up on first visit of a tab only (`visitedTabs` + `.no-anim`), `.ink-draw` stroke draw-on for chart lines; `prefers-reduced-motion` collapses both.
- Refuse: emoji as icons, glows, gradient text, nested cards, `transition: width` on bars.

### Team Name Normalization
The `normTeam()` function maps API team names to the short forms used by `TC` and `TEAM_LOGOS`:
- "Red Bull Racing" → "Red Bull"
- "Haas F1 Team" → "Haas"
- "Kick Sauber" → "Audi"
- "Racing Bulls" stays "Racing Bulls" (do NOT strip " Racing")

## Driver Headshots — Important Details

The `DH` (Driver Headshot) component has a multi-level fallback system:

1. **Base64 images** (`DRIVER_IMAGES` map in App.jsx) — Baked into the code, guaranteed to work
2. **F1.com Cloudinary CDN URLs** (`openf1/index.json` → `driverHeadshots` map) — Current 2026 team photos
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
- Race: 25-18-15-12-10-8-6-4-2-1 — NO fastest-lap bonus (the FL point was abolished from the 2025 season)
- Sprint: 8-7-6-5-4-3-2-1
- If the last round was a sprint weekend, both race and sprint points are combined

Position movement (`mv` field) is computed by subtracting last-round points from current totals, re-sorting to reconstruct the previous standings, and comparing positions.

## Development Commands

```bash
# Local development
npm run dev                     # Start Vite dev server (hot reload)
npm run build                   # Production build → dist/
npm test                        # node:test unit tests for the fetch-script helpers (also a CI gate)

# Data fetching
npm run fetch-data              # Jolpica API → data.json
npm run fetch-openf1            # OpenF1 API → openf1/index.json + openf1/meetings/ (incremental)
npm run fetch-all               # Both of the above
npm run fetch-quotes            # YouTube + Claude → driver-quotes.json

# Manual quotes fetch
python3 scripts/fetch-driver-quotes.py --video-id <YOUTUBE_ID>
python3 scripts/fetch-driver-quotes.py --race "Japanese Grand Prix"
```

## GitHub Actions Workflow

The workflow runs on:
- Push to `main`
- Weekly schedule: Saturday 20:00 UTC (qualifying / sprint + OpenF1 practice sessions), Sunday 23:00 UTC (race), Monday 06:00 UTC (retry for races that finish after the Sunday cron, e.g. Miami/Austin/Mexico ending ~22:00 UTC)
- Manual trigger (`workflow_dispatch`)

Steps:
1. Checkout → Setup Node 22 (npm cache) → `npm ci` → `npm test`
2. Fetch Jolpica data (retry/backoff on 429/5xx; only 404 means "no data")
3. Fetch OpenF1 data (incremental — see above)
4. Setup Python 3.12 → `pip install youtube-transcript-api` → fetch driver quotes (only if `ANTHROPIC_API_KEY` secret exists, `continue-on-error: true`)
5. `node scripts/validate-data.mjs` — hard-fails the deploy if data is malformed or shrank vs the committed baseline (a failed build keeps the previous deploy live)
6. `npm run build`
7. Deploy to GitHub Pages
8. **Commit the fetched data back to `main`** (`public/data.json`, `public/openf1/`, `public/driver-quotes.json`) as `github-actions[bot]`. This persists the OpenF1 cache, makes the validator's baseline the last deployed data, and counts as repository activity. `GITHUB_TOKEN` pushes never trigger workflows, so it can't loop. **Run `git pull` before pushing local work** — main moves after every deploy.

### Why the commit-back step matters
GitHub disables scheduled workflows after 60 days without a commit. That happened in August 2026 (last human push June 12 → crons silently stopped, site froze at the Hungarian GP). The bot commit after each run keeps the repo active year-round, including the off-season. `.github/dependabot.yml` (monthly, grouped) is a second source of activity.

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
4. Update `openf1/index.json` headshot URLs with new team/driver codes (they come from the OpenF1 `/drivers` endpoint on the next fetch)
5. Run `npm run fetch-tracks` after any calendar change and add new circuits to `CIRCUIT_COUNTRIES` in `fetch-f1-data.mjs` (2026 R16 "Bahrain Grand Prix in Malaysia" at Sepang needed both)

### Race results dropdown
The Race Results tab has a dropdown selector (`selRace` state). Value is `"all"` or a race identifier (`1`, `2`, `"2S"` for sprints). Sprint identifiers have an "S" suffix.

### Mobile responsiveness
Media queries at 768px and 480px breakpoints. All grids stack to single column, tables have `overflow-x: auto` wrappers, tabs use `flex:1` for full-width distribution.

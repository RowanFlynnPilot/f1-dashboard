# F1 Dashboard — Full Review & Improvement Plan

*Reviewed June 11, 2026. Front-end (src/App.jsx, ~3,600 lines), data pipeline (scripts/), CI (.github/workflows/deploy.yml), and shipped data files. Key findings were verified against the live `public/*.json` payloads — including an empirical recompute of the points math.*

---

## Executive summary

The dashboard is feature-rich and the data pipeline's failure design is mostly sound (crashes never ship corrupt JSON). The three biggest problems:

1. **A 3.6 MB `openf1-data.json` gates first paint** — every visitor waits for it before *anything* renders, and it's on track to hit ~16 MB by season end. 3× of that size is just pretty-printing.
2. **Zero memoization in one 3,600-line component** — every mouse-move and every 60 fps animation frame re-renders the entire app, and the replay/playback clocks never stop, even after the race ends or you leave the tab.
3. **A confirmed Lap Compare bug strands driver A in "Loading…" forever** on the auto-load path, and the live OpenF1 fetches fire on every page load even for visitors who never open Telemetry.

Plus a cluster of correctness bugs (phantom fastest-lap point, blank fastest-lap chip, inverted H2H bars, races marked complete at midnight UTC) and a silent-data-loss class in the OpenF1 fetch script.

---

## Part 1 — Findings

### A. Correctness bugs (front-end)

| # | Sev | What | Where |
|---|-----|------|-------|
| A1 | HIGH | **Lap Compare auto-load self-aborts and poisons its cache.** The fetch effect sets the default lap *inside itself* (`setLapCompareLap`, line ~749) with `lapCompareLap` in its deps, so the effect re-fires and aborts its own in-flight fetch; the abort path returns without clearing the `{loading:true}` cache entry, so driver A spins forever (Retry button only shows on `error`, never stuck-loading). Fires on first visit and every driver-chip change. | App.jsx:726–797 |
| A2 | HIGH | **Live OpenF1 fetches run on every page load** — the effect is guarded only by `if(!openf1)`, not by the Telemetry tab being active. Every Overview visitor triggers up to 4 runtime requests against OpenF1's free tier. | App.jsx:726 |
| A3 | HIGH | **H2H "Average Finish" bars invert for backmarkers.** `d1Val = 10 − avgPos` goes negative when both drivers average worse than P10 → the *worse* driver gets the bigger bar; mixed signs → bogus 50/50; negative widths are invalid CSS. | App.jsx:3382–3396 |
| A4 | MED | **Phantom fastest-lap point.** The FL bonus was abolished from 2025, but `flBonus` (line 66) and the progression chart (line 399) still award +1. Verified: API totals contain no FL point (Antonelli 131 = computed-without-FL 131). Inflates the "+pts" delta chip, can flip movement arrows, drifts the progression chart. CLAUDE.md documents the stale rule too. | App.jsx:66, 399 |
| A5 | MED | **Race Results fastest-lap chip renders blank.** Real data shape is `{driver, time, team}` but the chip reads `.d`/`.t` (only the N/A fallback has those keys). Overview was patched to check both shapes; Race Results wasn't. | App.jsx:1363–1364 |
| A6 | MED | **Races marked COMPLETED at midnight UTC on race day.** `new Date(race.date) < now` ignores `race.time` — a Sunday-morning build marks the race done (no winner) and skips fetching Saturday's qualifying for "incomplete" races. | fetch-f1-data.mjs:141, 267 |
| A7 | MED | **"Next race" is frozen at build time.** Between weekly builds a finished race keeps the NEXT RACE badge. The unused `const now` at App.jsx:154 suggests client-side recompute was intended. | App.jsx:154–160 |
| A8 | MED | **Overview constructor bars divide by hardcoded 98** — Antonelli is at 131 pts (133% width, clamped), so leaders look identical. Standings tab computes the max correctly; Overview is a stale copy. | App.jsx:1057 |
| A9 | MED | **Auto-rotated vertical tracks render mirror-imaged** in Lap Compare — the rotated branch of the coordinate transform is missing the Y-flip (determinant +1 instead of −1), so left-handers display as right-handers. | App.jsx:2158 |
| A10 | MED | **DH headshot fallback level never resets on prop change** — a reused component instance carries the previous driver's failure level, so a driver with a working CDN photo can render as an acronym badge. | App.jsx:460–475 |
| A11 | MED | **Animation clocks never stop.** Replay and Lap Compare tick at 60 fps forever — past race end (`replayTime` grows unboundedly) and after switching tabs (rAF keeps re-rendering whatever tab is visible). | App.jsx:686–698, 704–716 |
| A12 | LOW | Shared 12 s timeout spans both sequential Lap Compare drivers — slow driver A starves driver B, which then reports a misleading "Timed out after 12s". | App.jsx:754, 794 |
| A13 | LOW | Replay leaderboard overshoots: finished drivers show "Lap 59 of 57" (`fracOfLap=1` stacked on `lapDone=lastLap`); `s.lapInProgress` never exists; the correct helper `driverProgressAtTime` (552) is dead code. | App.jsx:1816–1834 |
| A14 | LOW | String/format nits: `"N/As"` when no pit data (803→1015, 3474); `"—s"` in sector cards (1567); `.replace(" GP","")` never matches — full race names overflow Schedule cards (3585, 3587); "CHN pts →" reads like China (1024); tooltip can show "P0" (1198); `<select value="">` shows first lap as selected while null (2090). |
| A15 | LOW | Red-flag pit stops parse "31:24.123" → `31.000s` via `parseFloat`, passing the <60s filter as a plausible value. Field `durationMs` actually holds seconds. | fetch-f1-data.mjs:298 |
| A16 | LOW | Latent: last-name keying (`name.split(" ").pop()`) breaks on multi-word surnames ("de Vries") across deltas/H2H/progression; H2H race path lacks the `driverId` fallback the quali path has; `transformData` hard-crashes if `raw.sprints` missing; meeting fallback `openf1.meetings[rn-1]` assumes index==round−1. | App.jsx:85–101, 202, 71, 1384 |
| A17 | LOW | Madring missing from `CIRCUIT_COUNTRIES` → Spanish GP (R14) shows country "XX"; pitstops `limit=100` can truncate (110 possible records). | fetch-f1-data.mjs:102–110, 61 |

### B. Performance

| # | Sev | What |
|---|-----|------|
| B1 | HIGH | **First paint gated on 3.6 MB.** The mount effect `Promise.all`s all four JSONs and only clears the loading screen after *all* settle — openf1-data.json (3.6 MB raw / 292 KB gzipped) holds the Overview tab hostage. Will grow ~3× by season end. |
| B2 | HIGH | **Pretty-printed JSON is a 3.0× size inflation.** Minified, openf1-data.json drops 3,652 KB → 1,216 KB with one argument change. The per-lap `ds` ISO-microsecond timestamps are ~55% of the largest field (epoch-ms would cut ~75%). |
| B3 | HIGH | **Zero `useMemo`/`React.memo`/`useCallback` in the whole file.** Every hover state update (8+ hover states) and every animation frame re-executes the full ~3,600-line render: per-stint linear regressions for 22 drivers, heatmaps, cumulative delta maps, SVG path-string rebuilds from ~350 samples — all per mousemove. |
| B4 | MED | Hover handlers allocate fresh state objects per pixel even when the underlying lap index didn't change — no bail-outs. |
| B5 | LOW | `lapCompareData` cache grows unboundedly in state; nothing persists across reloads (immutable laps re-downloaded every visit — sessionStorage would eliminate this). |
| B6 | LOW | Google Fonts `<link>` rendered inside JSX (3 places) → guaranteed FOUT; styles are a `<style>` template literal re-parsed per render. |

### C. Data pipeline & CI

| # | Sev | What |
|---|-----|------|
| C1 | HIGH | **Silent data loss in OpenF1 fetch.** A failed session is logged and *dropped from the output*, which then deploys — replacing previously-good live data. Empty `/meetings` response → an empty file ships, wiping all telemetry + headshots. Only 429s are retried. | fetch-openf1-data.mjs:576, 365 |
| C2 | MED | **No incremental fetching.** Every run re-downloads the whole season (~150–220 requests now, ~1,000 by season end) at a cadence that sits at/over OpenF1's 30 req/min free tier (speed-trace loop runs at 40/min). Run time will reach 30–45 min by Abu Dhabi. Past sessions are immutable — this is all cacheable. |
| C3 | MED | **Cron misses late races.** `0 23 * * 0` gives Jolpica ~1 h after Miami/Canada/Austin/Mexico (20:00 UTC starts) — if ingestion lags, the site is stale for a week. Also: GitHub disables crons after 60 days of repo inactivity (off-season risk). |
| C4 | MED | **`npm install` in CI** (CLAUDE.md says `npm ci`; lockfile exists) — dependency drift risk. No npm/pip caching, no `timeout-minutes`, no fetch timeouts (hung connection → 6 h default job ceiling). |
| C5 | MED | Jolpica script: no retry/backoff/429 handling — one transient failure kills the deploy (safe, but blocks code pushes while Jolpica is down). Meanwhile sprint/pits/quali helpers swallow *all* errors as "empty" — a mid-loop rate-limit silently ships a deploy missing data. |
| C6 | LOW | Quotes script: legacy `claude-sonnet-4-5` alias (current: `claude-sonnet-4-6`); no temperature set (extraction wants 0); silent 15,000-char transcript truncation; `open()` without `encoding="utf-8"` (latent Windows mojibake); malformed override rule throws KeyError. Cost is negligible (<$0.25/race weekend, $0 steady-state). |
| C7 | LOW | `fetch-tracks.mjs` absent from CI and CLAUDE.md; calendar changes need a manual run nobody is reminded of. RSS discovery requires exact race-name match — 2026 has both "Barcelona GP" and "Spanish GP" (Madrid), a likely mismatch with YouTube titles. |
| C8 | INFO | Good news: crash-paths never ship corrupt JSON (single write at end); quotes step fallback design is correct; API secret handling is correct. CLAUDE.md doc errors: wrong Jolpica base URL (`api.jolpica.com` vs actual `api.jolpi.ca`), stale tab list (7 of 9), stale FL-bonus doc. |

### D. UX, mobile, accessibility, shell

| # | Sev | What |
|---|-----|------|
| D1 | MED | **No touch support anywhere** — all chart tooltips are mouse-only; Lap Compare pan is mouse-only *while* `touchAction:"none"` blocks native scrolling over the track; `preserveAspectRatio="none"` squashes chart text on phones; `onWheel` `preventDefault` is a no-op (passive listener) so wheel-zoom also scrolls the page. |
| D2 | MED | Hero avatar cropped on mobile (container shrinks to 96/80 px, inner img stays 140 px). |
| D3 | MED | **index.html is bare**: no meta description, no Open Graph/Twitter cards (sharing the link → blank card), no theme-color, emoji favicon unsupported in Safari, no manifest. |
| D4 | MED | Accessibility: tab bar has no `tablist`/`aria-selected`/keyboard model; clickable `<div>`s ("Full results →"); dimmest text fails WCAG contrast; `prefers-reduced-motion` ignored. |
| D5 | MED | Driver Compare bars visually indistinguishable (slowest=100%, fastest ~98% — a 0.3 s sector gap is ~1% width). |
| D6 | LOW | Cadillac `#1E1E1E` invisible on the near-black background (hero borders, badges, bars). |
| D7 | LOW | Schedule dates are raw UTC ISO strings; race start time fetched but never shown; no localization. |
| D8 | LOW | Empty-state gaps: H2H/Pit Stops have none (Quotes does); deployed error/empty states say "Run `npm run fetch-data`" to public visitors; no error boundary (one malformed field white-screens the app); `fetchedAt` shown with a perpetually-green "live" pulse dot instead of an honest staleness indicator. |
| D9 | LOW | CSS: `.sr>div:nth-child(4)` mistargeted after markup drift; horizontal scrollbars unstyled; `.tbl-wrap` dead; H2H has zero mobile rules; speed-trap rows keyed by index → bars animate between *different drivers* on session switch. |

---

## Part 2 — The Plan

### Phase 1 — Fix what's broken (1–2 sessions, no visual redesign)

Pure correctness; every item is small and independently shippable.

1. **Lap Compare fetch lifecycle** — move default-lap selection into its own effect (fetch effect never invalidates itself); on abort *always* clear the `{loading:true}` cache entry; track in-flight keys in a `useRef` Set (not a side-effecting setState updater); per-driver timeout; gate the whole effect on `tab==="Telemetry"`. *(A1, A2, A12)*
2. **Kill the phantom FL point** (lines 66 + 399) and update CLAUDE.md. *(A4)*
3. **Normalize `race.fl` to one shape in `transformData`**; fix the Race Results chip; delete the dual-shape read in Overview. *(A5)*
4. **H2H avg-finish bar math** — normalize on a positive scale (e.g. `21 − avgPos`, clamped). *(A3)*
5. **Race completion = date + time + ~3 h buffer** in fetch-f1-data.mjs; **client-side next-race/status recompute** using the already-declared `now`; show race start time. *(A6, A7)*
6. **Auto-pause both animation clocks** at duration end and on tab switch (extract one shared `useRafClock` helper — the two tickers are copy-paste). *(A11)*
7. **Fix the rotated-track mirror image** (flip-then-rotate). *(A9)*
8. **Reset DH fallback level on name change** (simplest: `key={name}` at call sites). *(A10)*
9. Batch of small fixes: hardcoded 98 → computed max; "N/As"/"—s"/" GP"/"CHN pts"/"P0"; pit "mm:ss" parse + rename `durationMs`→`durationSec`; pits `limit=200`; `madring: "ES"`; replay "Lap 59 of 57" (use the existing dead helper); guard `raw.sprints`. *(A8, A13–A17)*
10. **CI hygiene**: `npm ci`, `cache: 'npm'`, `timeout-minutes: 30`, `AbortSignal.timeout` on fetches, second cron Monday 06:00 UTC. *(C3 partial, C4)*

### Phase 2 — Performance overhaul (2–3 sessions)

The structural work. Order matters: data split first (it changes the loading code the components consume).

1. **Stop gating first paint** — render as soon as `data.json` resolves; let openf1/quotes/tracks populate when they land (all consumers already null-check). *(B1)*
2. **Shrink + split the OpenF1 payload**: write minified JSON (one-line change, −67%); split into `public/openf1/index.json` (meeting list + headshots + session metadata, ~30 KB, loaded upfront) + `public/openf1/{meetingKey}.json` lazy-loaded on selection; convert `ds` to epoch-ms. Turns a growing 16 MB liability into ~30 KB + ~250 KB on demand. *(B2, and most of B1's payload)*
3. **Componentize within App.jsx** (single-file stays intentional): extract each Telemetry panel + the standings/results blocks into `React.memo` child components that own their *own* hover and animation-clock state. The 60 fps replay clock should re-render only the replay subtree. Add `useMemo` for the heavy derived arrays (regressions, heatmaps, path strings) keyed on race+selection. This also deduplicates the Overview/Standings copy-paste that caused bug A8. *(B3, B4)*
4. **sessionStorage cache** for lap telemetry (immutable post-race) — eliminates repeat OpenF1 load entirely. *(B5)*
5. **Move fonts to index.html `<head>`** with preconnect (or self-host Outfit woff2 in `public/`); move the style block to a static CSS file. *(B6)*

### Phase 3 — Pipeline robustness (1–2 sessions)

1. **Incremental fetch with merge** in fetch-openf1-data.mjs: seed from the previous output, fetch only new/changed meetings, never replace a good meeting with a failed/empty fetch. Solves the silent-data-loss class *and* the request-volume/runtime growth in one change. *(C1, C2)*
2. **Validation gate in CI** — tiny `validate-data.mjs` that fails the deploy if data.json has 0 drivers / fewer races than the deployed file, or openf1 output shrank. Converts silent data loss into safe hard failure. *(C1 backstop)*
3. **Shared `fetchJSON` helper** (timeout + 429/5xx retry/backoff) across all three .mjs scripts; make the Jolpica sprint/pits/quali helpers distinguish "404/empty" from "failed". *(C5)*
4. **Quotes hardening**: `claude-sonnet-4-6` + structured output (drops the fence-stripping), temperature 0, truncation warning, `encoding="utf-8"`, tolerant override-rule parsing, race-name alias table for RSS discovery. *(C6, C7)*
5. **Surface freshness in the UI**: "data as of N days ago" from `fetchedAt`, replacing the always-green pulse dot. *(pairs with A7)*

### Phase 4 — Make it shine (ongoing, pick per session)

**Telemetry headliners** (the data is already fetched and mostly thrown away):
- **Throttle/brake/gear strips** under the Lap Compare speed trace — `/car_data` already returns throttle, brake, n_gear, rpm, DRS; the app currently keeps only speed.
- **Broadcast-style delta-vs-distance trace** — cumulative distance per sample already exists; the dead `deltaToB` variable is an acknowledged stub for exactly this.
- **Color the Lap Compare track by speed delta** (A-faster/B-faster segments) instead of two overlapping outlines.
- **Replay upgrades**: live gap-to-leader sparkline (cum-lap arrays already exist), sector boundaries on the map (`splitTrackIntoSectors` already exists), pit markers on the lap chart.

**Tab-level features (data already in hand):**
- Race Results: Grid → Finish column (qualifying data is loaded but unused here), winner's race time (capture `Time.time` in the fetch script — also fixes the permanently-empty "Race Time" block), "show all" on the sector table.
- Standings: wins column, gap-to-leader, constructor movement arrows, "S" markers on sprint rounds in the progression chart.
- Sector Times: theoretical-best row in Driver Compare, visible-delta bar scaling (D5), meeting dropdown (pill row hits 22+ buttons by season end).
- Overview: next-race countdown chip, season-start empty state.
- Schedule: localized date + start time, countdown on the NEXT RACE row.
- Pit Stops: race selector (script currently keeps only the latest race), empty state.
- H2H: "rounds compared: N/M" caption (makes driver-swap gaps honest), third-driver handling.
- Quotes: driver filter chips, per-round session indicator.

**Mobile + accessibility pass:**
- Pointer Events across all charts (unifies mouse/touch), tap-to-pin tooltips, fix the non-passive wheel-zoom, cursor-anchored zoom + clamped pan, fix hero avatar crop, H2H mobile rules, responsive chart aspect ratios.
- Tablist semantics + keyboard nav, contrast bump on dim text, `prefers-reduced-motion` gate, real `<button>`s.

**Shell polish:**
- index.html: meta description, OG/Twitter cards, theme-color, real favicon + apple-touch-icon, manifest.
- Error boundary around the tab body.
- Cadillac display color override.
- PWA service worker precaching the JSONs (offline reads of last data).

---

## Suggested order of attack

| Phase | Effort | Payoff |
|-------|--------|--------|
| 1 — Correctness | 1–2 sessions | Visible bugs gone; trustworthy numbers |
| 2 — Performance | 2–3 sessions | Instant first paint; smooth 60 fps telemetry; future-proof payload |
| 3 — Pipeline | 1–2 sessions | No more silent data loss; faster CI; survives API outages |
| 4 — Shine | per-feature | Throttle/brake traces and delta charts are the wow-factor items |

Phases 1 and 3 are independent of Phase 2 and can land in any order. Phase 4 items are individually shippable but the Telemetry ones get much cheaper after Phase 2's componentization.

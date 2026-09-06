# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Two audiences, weighted equally (confirmed): hiring managers and recruiters who open a portfolio link cold and judge craft and technical depth in 30–90 seconds, with no F1 knowledge guaranteed; and F1 fans (the owner among them) who return weekly after each race weekend to see what happened, who leads, and what's next.
- The owner is targeting data / analytics engineering and full-stack roles (confirmed). The data pipeline behind the surface must be as visible and credible as the surface itself.

## Product Purpose

A personal, always-current dashboard for the 2026 Formula 1 season: standings, race and sprint results, qualifying, sector times and speed traps, race replays and lap-by-lap telemetry, intra-team head-to-heads, pit stops, attributed post-session driver quotes, and the calendar. It exists to be the one page a fan opens on Monday morning, and to demonstrate an end-to-end data product that runs itself. Success: a fan gets the weekend's story in one screen; a reviewer understands within a minute that this is a self-healing data pipeline with a serious front end, not a template.

## Positioning

No other single static page fuses these three sources: Jolpica (results, standings, qualifying, pit stops), OpenF1 (laps, sectors, speed traps, stints, race control, car location and telemetry), and the official F1 YouTube post-session interviews, distilled by Claude into attributed driver quotes with manual override rules. It ships as static JSON on GitHub Pages with no backend: an incremental, validated, self-committing CI pipeline refreshes it three times a race weekend and keeps itself alive through the off-season.

## Operating Context

- Viewed on desktop and phone; installable PWA with offline reads of the last fetched data.
- Weekly rhythm around race weekends: Saturday qualifying / sprint, Sunday race, Monday catch-up. CI runs Sat 20:00, Sun 23:00, Mon 06:00 UTC.
- Data freshness is shown in the header (teal < 4 days, amber < 10, red beyond).
- Recruiters typically arrive from a resume or GitHub link; the repository README and CLAUDE.md are part of what they may read.

## Capabilities and Constraints

- Nine tabs: Overview, Standings, Race Results, Sector Times, Telemetry (Race Replay, Lap Compare, lap-time / position / tyre / gap charts), Head to Head, Pit Stops, Quotes, Schedule. The user set no preference on preserving every tab as-is; treat the content and functions as product truth to keep, while a redesign may re-group them for clarity (open decision, to be confirmed before removing or merging anything).
- Single-file React 19 + Vite 8 app (`src/App.jsx` ~4,200 lines, `src/styles.css`), served under `/f1-dashboard/` on GitHub Pages; no server. Lap Compare live-fetches OpenF1 `/car_data` and `/location` at runtime and caches in sessionStorage. Bundle ~168 KB gzipped; first paint gated only on `data.json`.
- Data files: `public/data.json`, `public/openf1/index.json` + `meetings/{key}.json`, `public/driver-quotes.json`, `public/tracks.json` (SVG circuit outlines for 23 circuits).
- Domain terminology in use: rounds, sprint weekends, Q1/Q2/Q3, sectors S1–S3 with purple / green / yellow best-sector semantics, speed traps I1 / I2 / ST, stints and compounds, SC / VSC / red flag periods, grid-to-finish, theoretical best lap.
- Team colours (the `TC` map) identify drivers and constructors throughout; driver headshots come from base64 fallbacks or the F1 media CDN.
- Open decisions: whether the official F1 wordmark stays in the header (user: no preference); whether the single-file architecture is kept (user: no preference; CLAUDE.md records it as intentional, so keep unless a redesign needs otherwise).

## Brand Commitments

None pinned by the user. Existing, non-binding: the official F1 logo in the header; F1 team colours as data identity (factual encoding, not decoration).

## Evidence on Hand

- Real 2026 season data through Round 12 (Dutch GP) plus Italian GP practice: standings, results, qualifying, pit stops, sector times, stints, race control, replay positions, speed traces.
- 472 attributed driver quotes across 12 rounds from official post-session videos.
- Circuit outlines for all 23 calendar rounds including Sepang.
- Pipeline facts a reviewer can verify in the repo: incremental OpenF1 fetch with negative cache, retry/backoff, CI validation gate, unit tests, commit-back of fetched data, structured-output LLM extraction with override rules.
- No user counts, testimonials, or performance benchmarks exist; do not fabricate any.

## Product Principles

1. Show, don't tell: the proof is real data doing real work on screen, not claims about it.
2. Provenance and freshness are features: every number can say where it came from and when.
3. The fan's weekly job (what happened, who leads, what's next) is never slower or harder than before.
4. Depth on demand: telemetry and pipeline detail are one gesture away and never in the way.
5. Static, fast, offline-tolerant, and honest about missing data.

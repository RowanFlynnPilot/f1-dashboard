# Data dictionary

Everything the dashboard draws is a static JSON file in `public/`, rebuilt by CI after every race session and served next to the page. You can download any of them from the live site (links in the page footer) and use them freely; the race data itself is Jolpica's and OpenF1's.

| File | Built by | Size | What it holds |
|---|---|---|---|
| [`data.json`](https://rowanflynnpilot.github.io/f1-dashboard/data.json) | `scripts/fetch-f1-data.mjs` | ~500 KB | Standings, every classification, qualifying, pit stops, the calendar (Jolpica) |
| [`season-stats.json`](https://rowanflynnpilot.github.io/f1-dashboard/season-stats.json) | `scripts/build-season-stats.mjs` | ~15 KB | Per-driver season metrics and percentiles (the Driver Ratings) |
| [`openf1/index.json`](https://rowanflynnpilot.github.io/f1-dashboard/openf1/index.json) | `scripts/fetch-openf1-data.mjs` | ~30 KB | OpenF1 meetings and sessions (metadata only), driver headshots |
| `openf1/meetings/{meetingKey}.json` | `scripts/fetch-openf1-data.mjs` | ~250 KB each | One race weekend in full: laps, sectors, positions, stints, telemetry extracts |
| [`driver-quotes.json`](https://rowanflynnpilot.github.io/f1-dashboard/driver-quotes.json) | `scripts/fetch-driver-quotes.py` | ~350 KB | Post-session driver quotes extracted from F1's reaction videos |
| `tracks.json` | `scripts/fetch-tracks.mjs` | ~40 KB | SVG circuit outlines keyed by Jolpica race name |

Conventions: times are seconds (numbers) unless they are display strings from Jolpica (`"1:22.670"`); timestamps are ISO 8601 UTC strings or, in compact OpenF1 rows, epoch milliseconds; a round is Jolpica's round number; a driver number is the car number.

## data.json

| Field | Type | Meaning |
|---|---|---|
| `season` | number | Championship year |
| `fetchedAt` | ISO time | When Jolpica was fetched |
| `completedRounds` / `totalRounds` | number | Grands Prix run / on the calendar |
| `standingsRound` | number | The round the standings follow (on a sprint Saturday, the standings include the sprint) |
| `drivers[]` | | Drivers' standings: `pos`, `name`, `driverId` (Jolpica id, e.g. `max_verstappen`), `team` (current, the last constructor), `teams[]` (every team this season, in order), `pts`, `wins`, `dob` (date of birth, `YYYY-MM-DD`) |
| `constructors[]` | | `pos`, `team`, `pts`, `wins`, `drivers[]` (`{name, pts}` scored for this team, so a mid-season mover appears under both), `lineup[]` (current pairing) |
| `races[]` | | One per Grand Prix run: `round`, `name`, `circuit`, `date`, `time` (UTC start), `winnerTime`, `fastestLap` `{driver, time, team}`, `results[]` |
| `races[].results[]` | | `pos` (string; Jolpica numbers retirements too), `out` (`"DNF"`, `"DSQ"`, `"DNS"`, `"NC"` or null), `num` (car number), `did` (driverId), `driver` (surname), `team`, `grid` (0 = pit lane), `laps`, `pts`, `gap`, `status`, `fastestLapTime`, `fastestLapRank` |
| `sprints[]` | | Same shape as `races[]` with `sprint: true`; `date` is the sprint's own day |
| `qualifying[]` | | `round`, `raceName`, `results[]` `{pos, driver, driverId, team, q1, q2, q3}` (lap-time strings, missing when knocked out earlier) |
| `pitStopsByRace[]` | | `round`, `raceName`, `stops[]` `{driver, fullName, team, lap, stop, duration, durationSec}`. Jolpica times the whole pit-lane transit, entry to exit |
| `pitStops` | | The latest race's stops, same shape (kept for older app builds) |
| `schedule[]` | | `round`, `name`, `circuit`, `date`, `time`, `country` (ISO code), `completed`, `sprint`, `sprintDate`, `sprintTime`, `winner` |

## season-stats.json

Computed from `data.json` and every meeting file by `buildSeasonStats()` in `src/data.js`.

| Field | Meaning |
|---|---|
| `season`, `rounds`, `builtAt` | Year, Grands Prix covered, build time |
| `minStarts` | Starts a driver needs to be rated (5) |
| `metrics[]` | `{key, label, unit, better: "low" \| "high", digits, note}`, one per metric below |
| `drivers[]` | `{name, did, team, starts, metrics: {key: {value, n, pct}}}`. `value` is the season figure, `n` the number of races or sessions behind it, `pct` the percentile among rated drivers (0–100, 100 = best; null when unrated) |

| Metric | Season figure | Source |
|---|---|---|
| `qualiGap` | Median % off pole (best of Q1–Q3) | Jolpica qualifying |
| `racePace` | Median of per-race % off the quickest median green-flag lap | OpenF1 laps |
| `consistency` | Median of per-race standard deviation ÷ mean of green-flag laps, % | OpenF1 laps |
| `lap1` | Mean places gained from the grid by the end of lap 1 | Jolpica grid, OpenF1 positions |
| `passes` | Mean on-track passes per race | OpenF1 overtakes, filtered (see below) |
| `teammateQuali` | % of qualifying sessions ahead of the team-mate | Jolpica qualifying |
| `pointsPerStart` | Season points ÷ Grands Prix started | Jolpica |
| `finishRate` | % of Grands Prix classified | Jolpica |
| `pitStop` | Median seconds stationary in the box (the crew's part) | OpenF1 pit |

*Green-flag laps* drop lap 1, in- and out-laps, laps under a safety car, VSC or red flag plus the restart lap, and laps over 107% of the driver's median. *On-track passes* are OpenF1's raw position swaps minus lap 1, swaps while either car is on an in- or out-lap, swaps while a safety car, VSC or red flag is out (a safety-car restart lap counts; the standing restart after a red flag doesn't), swaps between cars on different laps, and a retiring car's last laps.

## openf1/index.json

| Field | Meaning |
|---|---|
| `season`, `fetchedAt`, `meetingCount` | |
| `meetings[]` | `{meetingKey, meetingName, location, country, countryCode, circuitName, dateStart, year, round, raceName, sessions[]}`. `round` and `raceName` are stamped from `data.json` by race date, because OpenF1's names differ from Jolpica's |
| `meetings[].sessions[]` | `{sessionKey, sessionName, sessionType, dateStart, dateEnd, totalLaps, driverCount}` |
| `driverHeadshots` | Full name → `{url, number, acronym, team, teamColour}` |
| `emptyMeetings[]` | Meetings OpenF1 lists without lap data (pre-season tests), rechecked after 30 days |

## openf1/meetings/{meetingKey}.json

The index entry plus full `sessions[]`. Every session:

| Field | Meaning |
|---|---|
| `sessionBests` | `fastestS1..3`, `topI1Speed`, `topI2Speed`, `topSTSpeed` (km/h) |
| `drivers[]` | `number`, `name`, `acronym`, `team`, `teamColour`, `validLapCount`, `bestS1..3`, `theoreticalBest`, `bestLap`, `maxI1Speed`, `maxI2Speed`, `maxSTSpeed`, `topLaps[]` (`{lap, s1, s2, s3, time, i1, i2, st}`, the five quickest) |
| `stints[]` | `{driverNumber, compound, stintNumber, lapStart, lapEnd, tyreAge}` |

Race and Sprint sessions add:

| Field | Meaning |
|---|---|
| `drivers[].lapTimes[]` | `{l: lap, t: seconds, pit: true on a pit-out lap, ds: lap start, epoch ms}` |
| `drivers[].positions[]` | `{l: lap, p: position at the end of that lap}` |
| `drivers[].fastLapTrace` | `{lap, lapTime, trace: [{d, s}]}`: ~80 samples of the fastest lap, `d` cumulative distance in OpenF1 location units, `s` km/h; top six drivers only |
| `raceControlPeriods[]` | `{type: "SC" \| "VSC" \| "RED", lapStart, lapEnd}`, from OpenF1 race control |
| `rcV` | Version of the race-control parser that produced the periods; a bump recomputes cached sessions |
| `yellowFlagLaps[]` | Laps with at least one local yellow |

Race sessions also carry:

| Field | Row shape | Meaning |
|---|---|---|
| `lapCompareDefault` | `{lap, drivers: {num: {t0, car: [[ms, speed, throttle, brake, gear]], loc: [[ms, x, y]]}}}` | The Telemetry tab's default Lap Compare (top two finishers, the winner's fastest lap), so the tab opens without live API calls |
| `pitStops` | `[driver, lap, stationary s, pit-lane s]` | OpenF1 `/pit`; stationary is the car at rest (null where OpenF1 has none, as for 2026 Mexico); rows from before lights out are dropped |
| `overtakes` | `[epoch ms, overtaking driver, overtaken driver, position]` | OpenF1 `/overtakes`, raw: every position swap, pit cycles included |
| `weather` | `[epoch ms, track °C, air °C, rain 0/1]` | OpenF1 `/weather`, about one reading a minute |
| `extrasV` | number | Version of the three fields above; a bump refetches them for cached races |

## driver-quotes.json

| Field | Meaning |
|---|---|
| `season`, `fetchedAt` | |
| `rounds[]` | `{round, raceName, sessions: {qualifying, sprintQualifying, sprint, race}}` |
| `rounds[].sessions.*` | `{videoId, extractedAt, quotes: [{driver, team, quote}]}`. A session with `extractedAt` and no quotes was processed and yielded none |

Quotes are extracted by Claude from YouTube auto-captions, which carry no speaker labels, so attribution is a model's judgement checked against that round's roster; `scripts/quote-overrides.json` corrects known misattributions.

/**
 * fetch-f1-data.mjs
 * Fetches F1 2026 season data from the Jolpica API (Ergast successor)
 * and writes it to public/data.json for the React app to consume.
 * 
 * Run: node scripts/fetch-f1-data.mjs
 * 
 * API docs: https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md
 * Base URL: https://api.jolpi.ca/ergast/f1/
 */

import fs from "node:fs";
import { pathToFileURL } from "node:url";

// One season setting for every script (scripts/season.json); SEASON=2027 in the
// environment overrides it for a dry run of the next season.
const SEASON = Number(process.env.SEASON) || JSON.parse(fs.readFileSync(new URL("./season.json", import.meta.url), "utf8")).season;
const BASE = "https://api.jolpi.ca/ergast/f1";

// Fetch with retry/backoff: 429 and 5xx are retried (honoring Retry-After),
// network errors/timeouts are retried, other HTTP errors throw with .status
// attached so callers can distinguish 404-means-empty from real failures.
async function fetchJSON(url, retries = 3) {
  console.log(`  Fetching: ${url}`);
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const ra = parseInt(res.headers.get("retry-after") || "0", 10);
        const wait = Math.max(ra * 1000, 2000 * 2 ** attempt);
        console.log(`      ⏳ HTTP ${res.status}, retrying in ${wait / 1000}s... (${retries - attempt} left)`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${url}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (e) {
      if (e.status) throw e; // HTTP error already classified above
      if (attempt < retries) {
        console.log(`      ⏳ ${e.message || e.name}, retrying in ${(2000 * 2 ** attempt) / 1000}s...`);
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      throw e;
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getSchedule() {
  const data = await fetchJSON(`${BASE}/${SEASON}.json?limit=30`);
  return data.MRData.RaceTable.Races;
}

// The standings list says which round it follows. On a sprint Saturday that can
// be a round whose race hasn't run yet, so the app's points delta keys off it.
async function getDriverStandings() {
  const data = await fetchJSON(`${BASE}/${SEASON}/driverstandings.json`);
  const lists = data.MRData.StandingsTable.StandingsLists;
  return lists.length > 0
    ? { round: parseInt(lists[0].round) || 0, standings: lists[0].DriverStandings }
    : { round: 0, standings: [] };
}

async function getConstructorStandings() {
  const data = await fetchJSON(`${BASE}/${SEASON}/constructorstandings.json`);
  const lists = data.MRData.StandingsTable.StandingsLists;
  return lists.length > 0 ? lists[0].ConstructorStandings : [];
}

async function getRaceResults(round) {
  const data = await fetchJSON(`${BASE}/${SEASON}/${round}/results.json`);
  const races = data.MRData.RaceTable.Races;
  return races.length > 0 ? races[0] : null;
}

// For the optional per-round endpoints, only a 404 means "no data for this
// round" — any other failure should abort the run (a rate-limit mid-loop used
// to silently ship a deploy missing sprint/pit/qualifying data).
async function getSprintResults(round) {
  try {
    const data = await fetchJSON(`${BASE}/${SEASON}/${round}/sprint.json`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0] : null;
  } catch (e) {
    if (e.status === 404) return null; // Not all rounds have sprints
    throw e;
  }
}

// Jolpica silently caps `limit` at 100, and a chaotic wet race can exceed that
// (2026 R6 had 86 stops), so page through with offset until `total` is reached.
async function getPitStops(round) {
  const stops = [];
  for (let offset = 0; ; offset += 100) {
    let data;
    try {
      data = await fetchJSON(`${BASE}/${SEASON}/${round}/pitstops.json?limit=100&offset=${offset}`);
    } catch (e) {
      if (e.status === 404) return stops;
      throw e;
    }
    const races = data.MRData.RaceTable.Races;
    const page = races.length > 0 ? races[0].PitStops : [];
    stops.push(...page);
    const total = parseInt(data.MRData.total) || 0;
    if (page.length === 0 || stops.length >= total) return stops;
    await sleep(400);
  }
}

async function getQualifying(round) {
  try {
    const data = await fetchJSON(`${BASE}/${SEASON}/${round}/qualifying.json`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0].QualifyingResults : [];
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

// Map API constructor IDs to display names
const CONSTRUCTOR_NAMES = {
  mercedes: "Mercedes",
  ferrari: "Ferrari",
  mclaren: "McLaren",
  red_bull: "Red Bull",
  rb: "Racing Bulls",
  racing_bulls: "Racing Bulls",
  alpine: "Alpine",
  aston_martin: "Aston Martin",
  haas: "Haas",
  williams: "Williams",
  sauber: "Audi",
  audi: "Audi",
  cadillac: "Cadillac",
  kick_sauber: "Audi",
};

function teamName(constructorId) {
  return CONSTRUCTOR_NAMES[constructorId] || constructorId;
}

// Country code mapping for circuits
const CIRCUIT_COUNTRIES = {
  albert_park: "AU", shanghai: "CN", suzuka: "JP", bahrain: "BH",
  jeddah: "SA", miami: "US", villeneuve: "CA", monaco: "MC",
  catalunya: "ES", red_bull_ring: "AT", silverstone: "GB",
  spa: "BE", hungaroring: "HU", zandvoort: "NL", monza: "IT",
  valencia: "ES", madring: "ES", baku: "AZ", marina_bay: "SG", americas: "US",
  rodriguez: "MX", interlagos: "BR", vegas: "US", losail: "QA",
  yas_marina: "AE", sepang: "MY",
};

export function getCountryCode(circuitId) {
  for (const [key, code] of Object.entries(CIRCUIT_COUNTRIES)) {
    if (circuitId.toLowerCase().includes(key)) return code;
  }
  return "XX";
}

// Race completion = date + UTC start time + 3h buffer. A bare date parses as
// midnight UTC, which marked races "completed" up to ~20 hours early.
export function raceEnded(r, now = new Date()) {
  const start = new Date(`${r.date}T${r.time || "12:00:00Z"}`);
  return now - start > 3 * 3600 * 1000;
}

// The current race weekend: from 3 days before the race until it ends. Its
// qualifying / sprint results are fetched early so the Saturday build has them.
export function weekendActive(r, now = new Date()) {
  const start = new Date(`${r.date}T${r.time || "12:00:00Z"}`);
  return !raceEnded(r, now) && start - now < 3 * 24 * 3600 * 1000;
}

// Jolpica formats long stops (red flags etc.) as "mm:ss.xxx" — parseFloat
// would silently read "31:24.123" as a plausible-looking 31 seconds.
export function parsePitSeconds(str) {
  if (!str) return 0;
  const s = String(str);
  if (s.includes(":")) {
    const [m, rest] = s.split(":");
    return (parseInt(m) || 0) * 60 + (parseFloat(rest) || 0);
  }
  return parseFloat(s) || 0;
}

// Classification label for a result that isn't a classified finish, or null.
// Jolpica's positionText is the position for every classified car (lapped
// cars included) and a letter otherwise — its `position` field is always a
// number, so it can't tell a retirement from a finish.
const OUT_LABELS = { R: "DNF", D: "DSQ", E: "DSQ", W: "DNS", F: "DNQ", N: "NC" };
export function outLabel(positionText) {
  if (/^\d+$/.test(String(positionText ?? ""))) return null;
  return OUT_LABELS[positionText] || "DNF";
}

// A driver's current team. Jolpica lists every constructor a driver raced for
// this season in the order they joined (2026 Lawson: ["rb", "red_bull"]), so
// the last entry is the current team — the first is where they started.
export function currentTeamId(ds) {
  const cs = ds?.Constructors || [];
  return cs[cs.length - 1]?.constructorId;
}

// One race or sprint result row, as the app consumes it.
export function mapResult(r) {
  return {
    pos: r.position,
    out: outLabel(r.positionText),
    num: r.number ?? null,
    did: r.Driver.driverId,
    driver: r.Driver.familyName,
    team: teamName(r.Constructor.constructorId),
    grid: r.grid != null ? parseInt(r.grid) : null,   // 0 = pit-lane start
    laps: r.laps != null ? parseInt(r.laps) : null,
    pts: parseFloat(r.points) || 0,
    gap: r.position === "1" ? "WINNER" : (r.Time?.time || r.status || ""),
    status: r.status,
    fastestLapTime: r.FastestLap?.Time?.time || null,
    fastestLapRank: r.FastestLap?.rank || null,
  };
}

// Points each driver scored for each team, summed from race and sprint results.
// Driver standings can't give this: a driver who changes team mid-season has
// one season total, which used to land wholly under his first team.
export function constructorBreakdowns(sessions) {
  const byTeam = {};
  for (const s of sessions) {
    for (const r of s.results || []) {
      const team = (byTeam[r.team] ??= {});
      const d = (team[r.did || r.driver] ??= { name: r.driver, pts: 0, last: 0 });
      d.pts += r.pts || 0;
      d.last = Math.max(d.last, s.round);
    }
  }
  const out = {};
  for (const [team, drivers] of Object.entries(byTeam)) {
    out[team] = Object.values(drivers)
      .sort((a, b) => b.pts - a.pts || b.last - a.last)
      .map(({ name, pts }) => ({ name, pts }));
  }
  return out;
}

// Each team's current pairing, from the most recent round with a classification
// (a race, or qualifying when the weekend is under way). Team → [familyName, ...].
export function currentLineups(races, qualifying) {
  const tagged = [
    ...(races || []).map(s => ({ ...s, kind: "race" })),
    ...(qualifying || []).map(s => ({ ...s, kind: "quali" })),
  ];
  const latest = tagged.reduce(
    (best, s) => (!best || s.round > best.round || (s.round === best.round && s.kind === "race") ? s : best), null);
  const lineups = {};
  for (const r of latest?.results || []) (lineups[r.team] ??= []).push(r.driver);
  return lineups;
}

async function main() {
  console.log(`\n🏎️  Fetching F1 ${SEASON} data from Jolpica API...\n`);

  // 1. Get schedule
  console.log("📅 Fetching schedule...");
  const schedule = await getSchedule();
  console.log(`   Found ${schedule.length} races\n`);
  await sleep(500);

  // 2. Get standings
  console.log("🏆 Fetching driver standings...");
  const { round: standingsRound, standings: driverStandings } = await getDriverStandings();
  console.log(`   Found ${driverStandings.length} drivers (standings after round ${standingsRound})\n`);
  await sleep(500);

  console.log("🏗️  Fetching constructor standings...");
  const constructorStandings = await getConstructorStandings();
  console.log(`   Found ${constructorStandings.length} constructors\n`);
  await sleep(500);

  // 3. Determine completed rounds — race date + UTC start time + 3h buffer.
  // A bare date parses as midnight UTC, which marked races "completed" up to
  // ~20 hours before they actually ran.
  const now = new Date();
  const completedRaces = schedule.filter(r => raceEnded(r, now));
  const activeWeekend = schedule.filter(r => weekendActive(r, now));
  console.log(`✅ ${completedRaces.length} races completed${activeWeekend.length ? `, ${activeWeekend[0].raceName} weekend in progress` : ""}\n`);

  // 4. Fetch results for each completed race
  const raceResults = [];
  const sprintResults = [];
  const allPitStops = [];
  const allQualifying = [];

  for (const race of [...completedRaces, ...activeWeekend]) {
    const round = parseInt(race.round);
    const ended = raceEnded(race, now);
    console.log(`📊 Fetching Round ${round}: ${race.raceName}${ended ? "" : " (weekend in progress — quali/sprint only)"}...`);

    if (ended) {
      const results = await getRaceResults(round);
      if (results) raceResults.push(results);
      await sleep(400);
    }

    const sprint = await getSprintResults(round);
    if (sprint) sprintResults.push(sprint);
    await sleep(400);

    if (ended) {
      const pits = await getPitStops(round);
      if (pits.length > 0) allPitStops.push({ round, raceName: race.raceName, pitStops: pits });
      await sleep(400);
    }

    const quali = await getQualifying(round);
    if (quali.length > 0) allQualifying.push({ round, raceName: race.raceName, results: quali });
    await sleep(400);
  }

  // 5. Transform data for the dashboard

  // Driver standings — `team` is the current team (see currentTeamId), `teams`
  // every team the driver has raced for this season, in order
  const drivers = driverStandings.map(ds => ({
    pos: parseInt(ds.position),
    name: `${ds.Driver.givenName} ${ds.Driver.familyName}`,
    team: teamName(currentTeamId(ds)),
    teams: (ds.Constructors || []).map(c => teamName(c.constructorId)),
    pts: parseInt(ds.points),
    wins: parseInt(ds.wins),
    driverId: ds.Driver.driverId,
  }));

  // Race results
  const races = raceResults.map(race => {
    const results = (race.Results || []).map(mapResult);

    const fastestLapDriver = results.find(r => r.fastestLapRank === "1");

    return {
      round: parseInt(race.round),
      name: race.raceName,
      circuit: race.Circuit.circuitName,
      date: race.date,
      time: race.time || null,
      // Winner's total race time, e.g. "1:32:09.123" (P1 carries Time.time)
      winnerTime: (race.Results || [])[0]?.Time?.time || null,
      results,
      fastestLap: fastestLapDriver ? {
        driver: fastestLapDriver.driver,
        time: fastestLapDriver.fastestLapTime,
        team: fastestLapDriver.team,
      } : null,
    };
  });

  // Sprint results — dated from the schedule's Sprint session: the sprint
  // endpoint carries the Sunday race date
  const schedByRound = Object.fromEntries(schedule.map(r => [parseInt(r.round), r]));
  const sprints = sprintResults.map(race => {
    const results = (race.SprintResults || []).map(mapResult);

    const fastestLapDriver = results.find(r => r.fastestLapRank === "1");
    const sprintSession = schedByRound[parseInt(race.round)]?.Sprint;

    return {
      round: parseInt(race.round),
      name: race.raceName + " Sprint",
      circuit: race.Circuit.circuitName,
      date: sprintSession?.date || race.date,
      time: sprintSession?.time || null,
      sprint: true,
      results,
      fastestLap: fastestLapDriver ? {
        driver: fastestLapDriver.driver,
        time: fastestLapDriver.fastestLapTime,
        team: fastestLapDriver.team,
      } : null,
    };
  });

  // Schedule
  const sched = schedule.map(race => ({
    round: parseInt(race.round),
    name: race.raceName,
    circuit: race.Circuit.circuitName,
    date: race.date,
    time: race.time || null,
    country: getCountryCode(race.Circuit.circuitId),
    completed: raceEnded(race, now),
    sprint: race.Sprint ? true : false,
    sprintDate: race.Sprint?.date || null,
    sprintTime: race.Sprint?.time || null,
    winner: (() => {
      const rr = raceResults.find(r => r.round === race.round);
      if (rr && rr.Results && rr.Results[0]) return rr.Results[0].Driver.familyName;
      return null;
    })(),
  }));

  // Qualifying, in the app's shape (also feeds the current lineups below)
  const qualifying = allQualifying.map(q => ({
    round: q.round,
    raceName: q.raceName,
    results: q.results.map(r => ({
      pos: parseInt(r.position),
      driver: r.Driver.familyName,
      driverId: r.Driver.driverId,
      team: teamName(r.Constructor?.constructorId),
      q1: r.Q1 || null,
      q2: r.Q2 || null,
      q3: r.Q3 || null,
    })),
  }));

  // Constructor standings. Per-driver points come from the results, so a
  // driver who switched teams splits his points between them; `lineup` is the
  // team's current pairing.
  const breakdowns = constructorBreakdowns([...races, ...sprints]);
  const lineups = currentLineups(races, qualifying);
  const constructors = constructorStandings.map(cs => {
    const team = teamName(cs.Constructor.constructorId);
    return {
      pos: parseInt(cs.position),
      team,
      pts: parseInt(cs.points),
      wins: parseInt(cs.wins),
      drivers: breakdowns[team] || [],
      lineup: lineups[team] || [],
    };
  });

  // Pit stops (most recent race)
  const latestPits = allPitStops.length > 0 ? allPitStops[allPitStops.length - 1] : null;

  // Names from the standings; the team from that round's classification, so a
  // stop is filed under the team the driver raced for that weekend
  const driverLookup = {};
  for (const ds of driverStandings) {
    driverLookup[ds.Driver.driverId] = {
      name: ds.Driver.familyName,
      fullName: `${ds.Driver.givenName} ${ds.Driver.familyName}`,
      team: teamName(currentTeamId(ds)),
    };
  }
  const teamByRound = {};
  for (const race of races) teamByRound[race.round] = Object.fromEntries(race.results.map(r => [r.did, r.team]));

  const mapStops = (stops, round) => stops.map(p => {
    const info = driverLookup[p.driverId] || { name: p.driverId, fullName: p.driverId, team: "" };
    return {
      driver: info.name,
      fullName: info.fullName,
      team: teamByRound[round]?.[p.driverId] || info.team,
      lap: parseInt(p.lap),
      stop: parseInt(p.stop),
      duration: p.duration,
      durationSec: parsePitSeconds(p.duration),
    };
  }).sort((a, b) => a.durationSec - b.durationSec);

  // Every completed race (the Pit Stops tab has a race selector)
  const pitStopsByRace = allPitStops.map(entry => ({
    round: entry.round,
    raceName: entry.raceName,
    stops: mapStops(entry.pitStops, entry.round),
  }));

  const pitStops = latestPits ? mapStops(latestPits.pitStops, latestPits.round) : [];

  // Build final output
  const output = {
    season: SEASON,
    fetchedAt: new Date().toISOString(),
    completedRounds: completedRaces.length,
    totalRounds: schedule.length,
    standingsRound,
    drivers,
    constructors,
    races,
    sprints,
    schedule: sched,
    pitStops: {
      raceName: latestPits?.raceName || "",
      stops: pitStops,
    },
    pitStopsByRace,
    qualifying,
  };

  // Write to public/data.json via a temp file + rename, so an interrupted run
  // can never leave a truncated data.json behind
  const path = await import("path");
  const outPath = path.join(process.cwd(), "public", "data.json");
  fs.writeFileSync(`${outPath}.tmp`, JSON.stringify(output, null, 2));
  fs.renameSync(`${outPath}.tmp`, outPath);
  
  console.log(`\n✅ Data written to ${outPath}`);
  console.log(`   ${drivers.length} drivers, ${constructors.length} constructors`);
  console.log(`   ${races.length} race results, ${sprints.length} sprint results`);
  console.log(`   ${pitStops.length} pit stops from ${latestPits?.raceName || "N/A"}`);
  console.log(`   ${sched.length} scheduled races\n`);
}

// Only run when executed directly — the exported helpers are imported by test/
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error("❌ Error fetching data:", err);
    process.exit(1);
  });
}

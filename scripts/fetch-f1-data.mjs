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

const SEASON = 2026;
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

async function getDriverStandings() {
  const data = await fetchJSON(`${BASE}/${SEASON}/driverstandings.json`);
  const lists = data.MRData.StandingsTable.StandingsLists;
  return lists.length > 0 ? lists[0].DriverStandings : [];
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

async function getPitStops(round) {
  try {
    // limit=200: 22 cars × 5+ stops can exceed the old limit=100 in a chaotic race
    const data = await fetchJSON(`${BASE}/${SEASON}/${round}/pitstops.json?limit=200`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0].PitStops : [];
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
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
  yas_marina: "AE",
};

function getCountryCode(circuitId) {
  for (const [key, code] of Object.entries(CIRCUIT_COUNTRIES)) {
    if (circuitId.toLowerCase().includes(key)) return code;
  }
  return "XX";
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
  const driverStandings = await getDriverStandings();
  console.log(`   Found ${driverStandings.length} drivers\n`);
  await sleep(500);

  console.log("🏗️  Fetching constructor standings...");
  const constructorStandings = await getConstructorStandings();
  console.log(`   Found ${constructorStandings.length} constructors\n`);
  await sleep(500);

  // 3. Determine completed rounds — race date + UTC start time + 3h buffer.
  // A bare date parses as midnight UTC, which marked races "completed" up to
  // ~20 hours before they actually ran.
  const now = new Date();
  const raceEnded = (r) => {
    const start = new Date(`${r.date}T${r.time || "12:00:00Z"}`);
    return now - start > 3 * 3600 * 1000;
  };
  const completedRaces = schedule.filter(r => raceEnded(r));
  console.log(`✅ ${completedRaces.length} races completed\n`);

  // 4. Fetch results for each completed race
  const raceResults = [];
  const sprintResults = [];
  const allPitStops = [];
  const allQualifying = [];

  for (const race of completedRaces) {
    const round = parseInt(race.round);
    console.log(`📊 Fetching Round ${round}: ${race.raceName}...`);
    
    const results = await getRaceResults(round);
    if (results) raceResults.push(results);
    await sleep(400);

    const sprint = await getSprintResults(round);
    if (sprint) sprintResults.push(sprint);
    await sleep(400);

    const pits = await getPitStops(round);
    if (pits.length > 0) allPitStops.push({ round, raceName: race.raceName, pitStops: pits });
    await sleep(400);

    const quali = await getQualifying(round);
    if (quali.length > 0) allQualifying.push({ round, raceName: race.raceName, results: quali });
    await sleep(400);
  }

  // 5. Transform data for the dashboard

  // Driver standings
  const drivers = driverStandings.map(ds => ({
    pos: parseInt(ds.position),
    name: `${ds.Driver.givenName} ${ds.Driver.familyName}`,
    team: teamName(ds.Constructors[0]?.constructorId),
    pts: parseInt(ds.points),
    wins: parseInt(ds.wins),
    driverId: ds.Driver.driverId,
  }));

  // Constructor standings with driver breakdowns
  const constructors = constructorStandings.map(cs => {
    // Find drivers for this constructor
    const teamDrivers = driverStandings
      .filter(ds => ds.Constructors[0]?.constructorId === cs.Constructor.constructorId)
      .map(ds => ({
        name: ds.Driver.familyName,
        pts: parseInt(ds.points),
      }));

    return {
      pos: parseInt(cs.position),
      team: teamName(cs.Constructor.constructorId),
      pts: parseInt(cs.points),
      wins: parseInt(cs.wins),
      drivers: teamDrivers,
    };
  });

  // Race results
  const races = raceResults.map(race => {
    const results = (race.Results || []).map(r => ({
      pos: r.position,
      driver: r.Driver.familyName,
      team: teamName(r.Constructor.constructorId),
      gap: r.position === "1" ? "WINNER" : (r.Time?.time || r.status || ""),
      status: r.status,
      fastestLapTime: r.FastestLap?.Time?.time || null,
      fastestLapRank: r.FastestLap?.rank || null,
    }));

    const fastestLapDriver = results.find(r => r.fastestLapRank === "1");

    return {
      round: parseInt(race.round),
      name: race.raceName,
      circuit: race.Circuit.circuitName,
      date: race.date,
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

  // Sprint results
  const sprints = sprintResults.map(race => {
    const results = (race.SprintResults || []).map(r => ({
      pos: r.position,
      driver: r.Driver.familyName,
      team: teamName(r.Constructor.constructorId),
      gap: r.position === "1" ? "WINNER" : (r.Time?.time || r.status || ""),
      status: r.status,
      fastestLapTime: r.FastestLap?.Time?.time || null,
      fastestLapRank: r.FastestLap?.rank || null,
    }));

    const fastestLapDriver = results.find(r => r.fastestLapRank === "1");

    return {
      round: parseInt(race.round),
      name: race.raceName + " Sprint",
      circuit: race.Circuit.circuitName,
      date: race.date,
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
    completed: raceEnded(race),
    sprint: race.Sprint ? true : false,
    winner: (() => {
      const rr = raceResults.find(r => r.round === race.round);
      if (rr && rr.Results && rr.Results[0]) return rr.Results[0].Driver.familyName;
      return null;
    })(),
  }));

  // Pit stops (most recent race)
  const latestPits = allPitStops.length > 0 ? allPitStops[allPitStops.length - 1] : null;

  // Build a lookup from driverId -> { name, team } using standings data
  const driverLookup = {};
  for (const ds of driverStandings) {
    driverLookup[ds.Driver.driverId] = {
      name: ds.Driver.familyName,
      fullName: `${ds.Driver.givenName} ${ds.Driver.familyName}`,
      team: teamName(ds.Constructors[0]?.constructorId),
    };
  }

  // Jolpica formats long stops (red flags etc.) as "mm:ss.xxx" — parseFloat
  // would silently read "31:24.123" as a plausible-looking 31 seconds.
  const parsePitSeconds = (str) => {
    if (!str) return 0;
    const s = String(str);
    if (s.includes(":")) {
      const [m, rest] = s.split(":");
      return (parseInt(m) || 0) * 60 + (parseFloat(rest) || 0);
    }
    return parseFloat(s) || 0;
  };

  const pitStops = latestPits ? latestPits.pitStops.map(p => {
    const info = driverLookup[p.driverId] || { name: p.driverId, fullName: p.driverId, team: "" };
    return {
      driver: info.name,
      fullName: info.fullName,
      team: info.team,
      lap: parseInt(p.lap),
      stop: parseInt(p.stop),
      duration: p.duration,
      durationSec: parsePitSeconds(p.duration),
    };
  }).sort((a, b) => a.durationSec - b.durationSec) : [];

  // Build final output
  const output = {
    season: SEASON,
    fetchedAt: new Date().toISOString(),
    completedRounds: completedRaces.length,
    totalRounds: schedule.length,
    drivers,
    constructors,
    races,
    sprints,
    schedule: sched,
    pitStops: {
      raceName: latestPits?.raceName || "",
      stops: pitStops,
    },
    qualifying: allQualifying.map(q => ({
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
    })),
  };

  // Write to public/data.json
  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(process.cwd(), "public", "data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Data written to ${outPath}`);
  console.log(`   ${drivers.length} drivers, ${constructors.length} constructors`);
  console.log(`   ${races.length} race results, ${sprints.length} sprint results`);
  console.log(`   ${pitStops.length} pit stops from ${latestPits?.raceName || "N/A"}`);
  console.log(`   ${sched.length} scheduled races\n`);
}

main().catch(err => {
  console.error("❌ Error fetching data:", err);
  process.exit(1);
});

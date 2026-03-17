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

async function fetchJSON(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
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

async function getSprintResults(round) {
  try {
    const data = await fetchJSON(`${BASE}/${SEASON}/${round}/sprint.json`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0] : null;
  } catch {
    return null; // Not all rounds have sprints
  }
}

async function getPitStops(round) {
  try {
    const data = await fetchJSON(`${BASE}/${SEASON}/${round}/pitstops.json?limit=100`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0].PitStops : [];
  } catch {
    return [];
  }
}

async function getQualifying(round) {
  try {
    const data = await fetchJSON(`${BASE}/${SEASON}/${round}/qualifying.json`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0].QualifyingResults : [];
  } catch {
    return [];
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
  valencia: "ES", baku: "AZ", marina_bay: "SG", americas: "US",
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

  // 3. Determine completed rounds
  const now = new Date();
  const completedRaces = schedule.filter(r => new Date(r.date) < now);
  console.log(`✅ ${completedRaces.length} races completed\n`);

  // 4. Fetch results for each completed race
  const raceResults = [];
  const sprintResults = [];
  const allPitStops = [];

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
    completed: new Date(race.date) < now,
    sprint: race.Sprint ? true : false,
    winner: (() => {
      const rr = raceResults.find(r => r.round === race.round);
      if (rr && rr.Results && rr.Results[0]) return rr.Results[0].Driver.familyName;
      return null;
    })(),
  }));

  // Pit stops (most recent race)
  const latestPits = allPitStops.length > 0 ? allPitStops[allPitStops.length - 1] : null;
  const pitStops = latestPits ? latestPits.pitStops.map(p => ({
    driver: p.driverId,
    lap: parseInt(p.lap),
    stop: parseInt(p.stop),
    duration: p.duration,
    durationMs: parseFloat(p.duration) || 0,
  })).sort((a, b) => a.durationMs - b.durationMs) : [];

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

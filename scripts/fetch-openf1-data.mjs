/**
 * fetch-openf1-data.mjs
 * Fetches sector times, speed trap data, and stint info from the OpenF1 API
 * for all completed 2026 sessions (Practice, Qualifying, Race, Sprint).
 *
 * Run: node scripts/fetch-openf1-data.mjs
 *
 * API docs: https://openf1.org/docs/
 * Base URL: https://api.openf1.org/v1/
 *
 * NOTE: Historical data is free, no auth required.
 *       Rate limit: 3 req/s, 30 req/min on free tier.
 */

const SEASON = 2026;
const BASE = "https://api.openf1.org/v1";

// Sessions we care about
const SESSION_TYPES = ["Practice 1", "Practice 2", "Practice 3", "Qualifying", "Sprint Qualifying", "Sprint", "Race"];

async function fetchJSON(url, retries = 3) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  if (res.status === 429 && retries > 0) {
    const retryAfter = res.headers.get("Retry-After");
    const waitSec = retryAfter ? Math.max(parseInt(retryAfter, 10), 10) : 10 * (4 - retries);
    console.log(`      ⏳ Rate limited (429). Retrying in ${waitSec}s... (${retries} retries left)`);
    await sleep(waitSec * 1000);
    return fetchJSON(url, retries - 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  return data;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Get all meetings (race weekends) for the season
 */
async function getMeetings() {
  const data = await fetchJSON(`${BASE}/meetings?year=${SEASON}`);
  return data;
}

/**
 * Get all sessions for a meeting
 */
async function getSessions(meetingKey) {
  const data = await fetchJSON(`${BASE}/sessions?meeting_key=${meetingKey}`);
  return data;
}

/**
 * Get drivers for a session
 */
async function getDrivers(sessionKey) {
  const data = await fetchJSON(`${BASE}/drivers?session_key=${sessionKey}`);
  return data;
}

/**
 * Get lap data (sector times + speed traps) for a session
 */
async function getLaps(sessionKey) {
  const data = await fetchJSON(`${BASE}/laps?session_key=${sessionKey}`);
  return data;
}

/**
 * Get stint data (tire compounds, stint lengths) for a session
 */
async function getStints(sessionKey) {
  try {
    const data = await fetchJSON(`${BASE}/stints?session_key=${sessionKey}`);
    return data;
  } catch {
    return [];
  }
}

/**
 * Get position events for a session. Each event is (date, driver_number, position).
 */
async function getPositions(sessionKey) {
  try {
    const data = await fetchJSON(`${BASE}/position?session_key=${sessionKey}`);
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get race-control messages (safety car deployments, red flags, etc.) for a session.
 */
async function getRaceControl(sessionKey) {
  try {
    const data = await fetchJSON(`${BASE}/race_control?session_key=${sessionKey}`);
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get high-frequency car telemetry (speed, throttle, brake, gear, rpm, drs)
 * for a single driver within a date range. Used to build per-lap speed traces.
 */
async function getCarData(sessionKey, driverNumber, dateStartIso, dateEndIso) {
  const url = `${BASE}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}&date>=${dateStartIso}&date<=${dateEndIso}`;
  try { return await fetchJSON(url); } catch { return []; }
}

/**
 * Get 3D location samples (x/y/z) for a single driver within a date range.
 */
async function getLocation(sessionKey, driverNumber, dateStartIso, dateEndIso) {
  const url = `${BASE}/location?session_key=${sessionKey}&driver_number=${driverNumber}&date>=${dateStartIso}&date<=${dateEndIso}`;
  try { return await fetchJSON(url); } catch { return []; }
}

/**
 * Align speed samples to distance-traveled by joining /car_data and /location on
 * timestamp, then decimate to roughly `targetSamples` evenly-spaced points so the
 * payload stays small. Returns [{ d: distance_meters, s: speed_kmh }, ...].
 */
function buildSpeedTrace(carData, location, targetSamples = 80) {
  if (!carData || carData.length === 0 || !location || location.length < 2) return [];
  const carSorted = [...carData].sort((a, b) => new Date(a.date) - new Date(b.date));
  const locSorted = [...location].sort((a, b) => new Date(a.date) - new Date(b.date));
  // Cumulative XY distance along the location samples
  const cumDist = [0];
  const locTs = [new Date(locSorted[0].date).getTime()];
  for (let i = 1; i < locSorted.length; i++) {
    const a = locSorted[i - 1], b = locSorted[i];
    const dx = (b.x ?? 0) - (a.x ?? 0);
    const dy = (b.y ?? 0) - (a.y ?? 0);
    cumDist.push(cumDist[i - 1] + Math.sqrt(dx * dx + dy * dy));
    locTs.push(new Date(b.date).getTime());
  }
  // For each speed sample, binary-search the nearest location by timestamp
  const trace = [];
  for (const cd of carSorted) {
    if (cd.speed == null) continue;
    const t = new Date(cd.date).getTime();
    let lo = 0, hi = locTs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (locTs[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    trace.push({ d: +cumDist[lo].toFixed(1), s: cd.speed });
  }
  if (trace.length === 0) return [];
  // Decimate evenly to targetSamples
  if (trace.length <= targetSamples) return trace;
  const step = trace.length / targetSamples;
  const out = [];
  for (let i = 0; i < targetSamples; i++) out.push(trace[Math.floor(i * step)]);
  return out;
}

/**
 * Scan race-control events chronologically and emit safety-car / VSC / red-flag
 * periods as { type, lapStart, lapEnd } so the lap-time chart can shade them.
 */
function processRaceControlPeriods(events, maxLap) {
  if (!events || events.length === 0) return [];
  const sorted = [...events]
    .filter(e => e.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const periods = [];
  let scStart = null, vscStart = null, rfStart = null;
  for (const e of sorted) {
    const msg = (e.message || "").toUpperCase();
    const lap = e.lap_number;
    if (msg.includes("VIRTUAL SAFETY CAR DEPLOYED")) {
      if (vscStart == null) vscStart = lap;
    } else if (msg.includes("VIRTUAL SAFETY CAR ENDING")) {
      if (vscStart != null) {
        periods.push({ type: "VSC", lapStart: vscStart, lapEnd: lap || vscStart });
        vscStart = null;
      }
    } else if (msg.includes("SAFETY CAR DEPLOYED")) {
      if (scStart == null) scStart = lap;
    } else if (msg.includes("SAFETY CAR ENDING") || msg.includes("SAFETY CAR IN THIS LAP")) {
      if (scStart != null) {
        periods.push({ type: "SC", lapStart: scStart, lapEnd: lap || scStart });
        scStart = null;
      }
    } else if (e.flag === "RED") {
      if (rfStart == null) rfStart = lap;
    } else if (e.flag === "GREEN" && rfStart != null) {
      periods.push({ type: "RED", lapStart: rfStart, lapEnd: lap || rfStart });
      rfStart = null;
    }
  }
  // Close any unfinished periods at race end
  if (scStart != null) periods.push({ type: "SC", lapStart: scStart, lapEnd: maxLap });
  if (vscStart != null) periods.push({ type: "VSC", lapStart: vscStart, lapEnd: maxLap });
  if (rfStart != null) periods.push({ type: "RED", lapStart: rfStart, lapEnd: maxLap });
  return periods;
}

/**
 * Reduce raw /position events to per-lap position snapshots per driver.
 * For each driver lap, takes the most recent position record at or before
 * the lap's end time (date_start + duration).
 */
function processPositionsByLap(positions, lapsByDriver) {
  // Sort position events by date once
  const sorted = [...positions]
    .filter(p => p.date && p.driver_number && p.position)
    .map(p => ({ d: new Date(p.date).getTime(), dn: p.driver_number, p: p.position }))
    .sort((a, b) => a.d - b.d);

  const byDriver = {};
  for (const [dn, laps] of Object.entries(lapsByDriver)) {
    const driverEvents = sorted.filter(e => e.dn === parseInt(dn));
    const out = [];
    for (const lap of laps) {
      if (!lap.dateStart || !lap.lapTime) continue;
      const endMs = new Date(lap.dateStart).getTime() + lap.lapTime * 1000;
      // Find the latest event at or before endMs (binary-search-friendly but linear is fine here)
      let pos = null;
      for (const e of driverEvents) {
        if (e.d <= endMs) pos = e.p;
        else break;
      }
      if (pos !== null) out.push({ l: lap.lap, p: pos });
    }
    byDriver[dn] = out;
  }
  return byDriver;
}

/**
 * Process lap data into a structured format per driver
 */
function processLapData(laps, drivers) {
  // Build driver lookup: driver_number -> { name, acronym, team, teamColour }
  const driverMap = {};
  for (const d of drivers) {
    driverMap[d.driver_number] = {
      number: d.driver_number,
      name: d.full_name || `${d.first_name} ${d.last_name}`,
      acronym: d.name_acronym,
      team: d.team_name,
      teamColour: d.team_colour ? `#${d.team_colour}` : null,
    };
  }

  // Group laps by driver
  const byDriver = {};
  for (const lap of laps) {
    const dn = lap.driver_number;
    if (!byDriver[dn]) byDriver[dn] = [];
    byDriver[dn].push({
      lap: lap.lap_number,
      lapTime: lap.lap_duration,
      s1: lap.duration_sector_1,
      s2: lap.duration_sector_2,
      s3: lap.duration_sector_3,
      i1Speed: lap.i1_speed,
      i2Speed: lap.i2_speed,
      stSpeed: lap.st_speed,
      isPitOut: lap.is_pit_out_lap,
      dateStart: lap.date_start,
      segments: {
        s1: lap.segments_sector_1,
        s2: lap.segments_sector_2,
        s3: lap.segments_sector_3,
      },
    });
  }

  // Compute per-driver stats
  const driverStats = [];
  for (const [dn, driverLaps] of Object.entries(byDriver)) {
    const driver = driverMap[dn] || { number: parseInt(dn), name: `#${dn}`, acronym: `D${dn}`, team: "Unknown", teamColour: null };

    // Filter valid laps (non-pit-out, with sector times)
    const validLaps = driverLaps.filter(l => !l.isPitOut && l.s1 && l.s2 && l.s3);

    // Best sectors
    const bestS1 = validLaps.length > 0 ? Math.min(...validLaps.map(l => l.s1)) : null;
    const bestS2 = validLaps.length > 0 ? Math.min(...validLaps.map(l => l.s2)) : null;
    const bestS3 = validLaps.length > 0 ? Math.min(...validLaps.map(l => l.s3)) : null;
    const theoreticalBest = (bestS1 && bestS2 && bestS3) ? +(bestS1 + bestS2 + bestS3).toFixed(3) : null;

    // Best lap time
    const validLapTimes = validLaps.filter(l => l.lapTime).map(l => l.lapTime);
    const bestLap = validLapTimes.length > 0 ? Math.min(...validLapTimes) : null;

    // Speed trap stats
    const i1Speeds = driverLaps.filter(l => l.i1Speed).map(l => l.i1Speed);
    const i2Speeds = driverLaps.filter(l => l.i2Speed).map(l => l.i2Speed);
    const stSpeeds = driverLaps.filter(l => l.stSpeed).map(l => l.stSpeed);

    const maxI1 = i1Speeds.length > 0 ? Math.max(...i1Speeds) : null;
    const maxI2 = i2Speeds.length > 0 ? Math.max(...i2Speeds) : null;
    const maxST = stSpeeds.length > 0 ? Math.max(...stSpeeds) : null;

    driverStats.push({
      ...driver,
      laps: driverLaps,
      validLapCount: validLaps.length,
      bestS1,
      bestS2,
      bestS3,
      theoreticalBest,
      bestLap,
      maxI1Speed: maxI1,
      maxI2Speed: maxI2,
      maxSTSpeed: maxST,
    });
  }

  // Sort by theoretical best
  driverStats.sort((a, b) => {
    if (!a.theoreticalBest) return 1;
    if (!b.theoreticalBest) return -1;
    return a.theoreticalBest - b.theoreticalBest;
  });

  return driverStats;
}

/**
 * Find overall fastest sector times and speed traps across all drivers
 */
function computeSessionBests(driverStats) {
  const allBestS1 = driverStats.filter(d => d.bestS1).map(d => d.bestS1);
  const allBestS2 = driverStats.filter(d => d.bestS2).map(d => d.bestS2);
  const allBestS3 = driverStats.filter(d => d.bestS3).map(d => d.bestS3);
  const allMaxI1 = driverStats.filter(d => d.maxI1Speed).map(d => d.maxI1Speed);
  const allMaxI2 = driverStats.filter(d => d.maxI2Speed).map(d => d.maxI2Speed);
  const allMaxST = driverStats.filter(d => d.maxSTSpeed).map(d => d.maxSTSpeed);

  return {
    fastestS1: allBestS1.length > 0 ? Math.min(...allBestS1) : null,
    fastestS2: allBestS2.length > 0 ? Math.min(...allBestS2) : null,
    fastestS3: allBestS3.length > 0 ? Math.min(...allBestS3) : null,
    topI1Speed: allMaxI1.length > 0 ? Math.max(...allMaxI1) : null,
    topI2Speed: allMaxI2.length > 0 ? Math.max(...allMaxI2) : null,
    topSTSpeed: allMaxST.length > 0 ? Math.max(...allMaxST) : null,
  };
}

async function main() {
  console.log(`\n🏎️  Fetching OpenF1 sector/speed data for ${SEASON}...\n`);

  // 1. Get all meetings
  console.log("📅 Fetching meetings...");
  const meetings = await getMeetings();

  if (!meetings || meetings.length === 0) {
    console.log("   ⚠️  No meetings found for this season yet.");
    console.log("   Writing empty data file...\n");
    const fs = await import("fs");
    const path = await import("path");
    const outPath = path.join(process.cwd(), "public", "openf1-data.json");
    fs.writeFileSync(outPath, JSON.stringify({
      season: SEASON,
      fetchedAt: new Date().toISOString(),
      meetings: [],
    }, null, 2));
    console.log(`✅ Empty data written to ${outPath}\n`);
    return;
  }

  console.log(`   Found ${meetings.length} meetings\n`);

  const now = new Date();
  const allMeetingData = [];
  const headshotMap = {}; // fullName -> { url, number, acronym, team }

  for (const meeting of meetings) {
    const meetingStart = new Date(meeting.date_start);
    // Skip future meetings
    if (meetingStart > now) {
      console.log(`⏭️  Skipping future meeting: ${meeting.meeting_name}`);
      continue;
    }

    console.log(`\n🏁 Processing: ${meeting.meeting_name} (${meeting.location})`);
    await sleep(2000);

    // Get sessions for this meeting
    const sessions = await getSessions(meeting.meeting_key);
    await sleep(2000);

    if (!sessions || sessions.length === 0) {
      console.log("   No sessions found");
      continue;
    }

    const meetingSessions = [];

    for (const session of sessions) {
      // Only process session types we care about
      if (!SESSION_TYPES.includes(session.session_name)) continue;

      // Skip sessions that haven't ended
      if (session.date_end && new Date(session.date_end) > now) {
        console.log(`   ⏭️  Skipping in-progress: ${session.session_name}`);
        continue;
      }

      console.log(`   📊 Fetching ${session.session_name} (key: ${session.session_key})...`);

      try {
        // Fetch drivers
        const drivers = await getDrivers(session.session_key);
        await sleep(2000);

        // Collect headshot URLs (latest session wins for each driver)
        if (drivers) {
          for (const d of drivers) {
            const name = d.full_name || `${d.first_name} ${d.last_name}`;
            if (d.headshot_url) {
              headshotMap[name] = {
                url: d.headshot_url,
                number: d.driver_number,
                acronym: d.name_acronym,
                team: d.team_name,
                teamColour: d.team_colour ? `#${d.team_colour}` : null,
              };
            }
          }
        }

        // Fetch laps
        const laps = await getLaps(session.session_key);
        await sleep(2000);

        if (!laps || laps.length === 0) {
          console.log(`      No lap data available`);
          continue;
        }

        // Fetch stints
        const stints = await getStints(session.session_key);
        await sleep(2000);

        // For Race / Sprint sessions only, fetch position events for the telemetry tab.
        const isRaceLike = session.session_name === "Race" || session.session_name === "Sprint";
        let positions = [];
        let raceControl = [];
        if (isRaceLike) {
          positions = await getPositions(session.session_key);
          await sleep(2000);
          raceControl = await getRaceControl(session.session_key);
          await sleep(2000);
        }

        // Process
        const driverStats = processLapData(laps, drivers || []);
        const sessionBests = computeSessionBests(driverStats);

        // For race-likes, build per-driver per-lap position snapshots
        let positionsByDriver = {};
        if (isRaceLike && positions.length > 0) {
          const lapsByDriver = Object.fromEntries(driverStats.map(d => [d.number, d.laps]));
          positionsByDriver = processPositionsByLap(positions, lapsByDriver);
        }

        // Compute max lap from driver data for race-control period closure
        const sessionMaxLap = Math.max(0, ...driverStats.flatMap(d => d.laps.map(l => l.lap || 0)));
        const raceControlPeriods = isRaceLike ? processRaceControlPeriods(raceControl, sessionMaxLap) : [];

        // For race-likes, build speed-vs-distance traces for the top 6 drivers'
        // fastest laps. Each driver costs 2 API calls (/car_data + /location).
        const speedTraces = {};
        if (isRaceLike) {
          const top6 = driverStats.filter(d => d.bestLap && d.bestS1).slice(0, 6);
          for (const ds of top6) {
            const fastLap = ds.laps.find(l => l.lapTime === ds.bestLap && l.dateStart);
            if (!fastLap) continue;
            const startMs = new Date(fastLap.dateStart).getTime();
            const endMs = startMs + fastLap.lapTime * 1000;
            const startIso = new Date(startMs).toISOString();
            const endIso = new Date(endMs).toISOString();
            console.log(`      🛰️  Fetching speed trace for ${ds.acronym} (lap ${fastLap.lap}, ${fastLap.lapTime.toFixed(3)}s)...`);
            const carData = await getCarData(session.session_key, ds.number, startIso, endIso);
            await sleep(1500);
            const loc = await getLocation(session.session_key, ds.number, startIso, endIso);
            await sleep(1500);
            const trace = buildSpeedTrace(carData, loc);
            if (trace.length > 0) {
              speedTraces[ds.number] = { lap: fastLap.lap, lapTime: fastLap.lapTime, trace };
              console.log(`         ✅ ${trace.length} samples`);
            } else {
              console.log(`         ⚠️  empty trace (car_data: ${carData.length}, loc: ${loc.length})`);
            }
          }
        }

        meetingSessions.push({
          sessionKey: session.session_key,
          sessionName: session.session_name,
          sessionType: session.session_type,
          dateStart: session.date_start,
          dateEnd: session.date_end,
          totalLaps: laps.length,
          driverCount: driverStats.length,
          sessionBests,
          drivers: driverStats.map(d => ({
            number: d.number,
            name: d.name,
            acronym: d.acronym,
            team: d.team,
            teamColour: d.teamColour,
            validLapCount: d.validLapCount,
            bestS1: d.bestS1,
            bestS2: d.bestS2,
            bestS3: d.bestS3,
            theoreticalBest: d.theoreticalBest,
            bestLap: d.bestLap,
            maxI1Speed: d.maxI1Speed,
            maxI2Speed: d.maxI2Speed,
            maxSTSpeed: d.maxSTSpeed,
            // Include per-lap detail for the top laps (compact)
            topLaps: d.laps
              .filter(l => !l.isPitOut && l.s1 && l.s2 && l.s3)
              .sort((a, b) => (a.s1 + a.s2 + a.s3) - (b.s1 + b.s2 + b.s3))
              .slice(0, 5)
              .map(l => ({
                lap: l.lap,
                s1: l.s1,
                s2: l.s2,
                s3: l.s3,
                time: l.lapTime,
                i1: l.i1Speed,
                i2: l.i2Speed,
                st: l.stSpeed,
              })),
            // Full lap-time series for the race telemetry chart. Only stored on
            // Race / Sprint sessions to keep the file size down on practice/quali.
            lapTimes: isRaceLike
              ? d.laps
                  .filter(l => l.lap && l.lapTime)
                  .sort((a, b) => a.lap - b.lap)
                  .map(l => ({ l: l.lap, t: +l.lapTime.toFixed(3), pit: !!l.isPitOut }))
              : null,
            // Per-lap position snapshots for the position-evolution chart.
            positions: isRaceLike ? (positionsByDriver[d.number] || []) : null,
            // Speed-vs-distance trace from this driver's fastest race lap (top 6 only).
            fastLapTrace: isRaceLike ? (speedTraces[d.number] || null) : null,
          })),
          stints: stints.map(s => ({
            driverNumber: s.driver_number,
            compound: s.compound,
            stintNumber: s.stint_number,
            lapStart: s.lap_start,
            lapEnd: s.lap_end,
            tyreAge: s.tyre_age_at_start,
          })),
          // Safety car / VSC / red flag periods, race-likes only
          raceControlPeriods,
        });

        console.log(`      ✅ ${laps.length} laps, ${driverStats.length} drivers`);
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
      }
    }

    if (meetingSessions.length > 0) {
      allMeetingData.push({
        meetingKey: meeting.meeting_key,
        meetingName: meeting.meeting_name,
        location: meeting.location,
        country: meeting.country_name,
        countryCode: meeting.country_code,
        circuitName: meeting.circuit_short_name,
        dateStart: meeting.date_start,
        year: meeting.year,
        sessions: meetingSessions,
      });
    }
  }

  // Build output
  const output = {
    season: SEASON,
    fetchedAt: new Date().toISOString(),
    meetingCount: allMeetingData.length,
    meetings: allMeetingData,
    driverHeadshots: headshotMap,
  };

  // Write to public/openf1-data.json
  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(process.cwd(), "public", "openf1-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const totalSessions = allMeetingData.reduce((sum, m) => sum + m.sessions.length, 0);
  console.log(`\n✅ OpenF1 data written to ${outPath}`);
  console.log(`   ${allMeetingData.length} meetings, ${totalSessions} sessions`);
  console.log(`   Includes: sector times, speed traps, stint data\n`);
}

main().catch(err => {
  console.error("❌ Error fetching OpenF1 data:", err);
  process.exit(1);
});

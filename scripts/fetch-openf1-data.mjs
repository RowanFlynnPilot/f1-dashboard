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

async function fetchJSON(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
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

  for (const meeting of meetings) {
    const meetingStart = new Date(meeting.date_start);
    // Skip future meetings
    if (meetingStart > now) {
      console.log(`⏭️  Skipping future meeting: ${meeting.meeting_name}`);
      continue;
    }

    console.log(`\n🏁 Processing: ${meeting.meeting_name} (${meeting.location})`);
    await sleep(350);

    // Get sessions for this meeting
    const sessions = await getSessions(meeting.meeting_key);
    await sleep(350);

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
        await sleep(350);

        // Fetch laps
        const laps = await getLaps(session.session_key);
        await sleep(350);

        if (!laps || laps.length === 0) {
          console.log(`      No lap data available`);
          continue;
        }

        // Fetch stints
        const stints = await getStints(session.session_key);
        await sleep(350);

        // Process
        const driverStats = processLapData(laps, drivers || []);
        const sessionBests = computeSessionBests(driverStats);

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
          })),
          stints: stints.map(s => ({
            driverNumber: s.driver_number,
            compound: s.compound,
            stintNumber: s.stint_number,
            lapStart: s.lap_start,
            lapEnd: s.lap_end,
            tyreAge: s.tyre_age_at_start,
          })),
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

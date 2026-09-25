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

import fs from "node:fs";
import { pathToFileURL } from "node:url";

// One season setting for every script (scripts/season.json); SEASON=2027 in the
// environment overrides it for a dry run of the next season.
const SEASON = Number(process.env.SEASON) || JSON.parse(fs.readFileSync(new URL("./season.json", import.meta.url), "utf8")).season;
const BASE = "https://api.openf1.org/v1";

// Sessions we care about
const SESSION_TYPES = ["Practice 1", "Practice 2", "Practice 3", "Qualifying", "Sprint Qualifying", "Sprint", "Race"];

// Fetch with retry/backoff. 429 (honouring Retry-After), 5xx, timeouts and
// network errors are retried; other HTTP errors throw with .status attached so
// callers can tell a 404 ("no data for this session") from a real failure.
// Before this only 429 was retried — a single 502 dropped a whole session.
export async function fetchJSON(url, retries = 3) {
  console.log(`  Fetching: ${url}`);
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const ra = parseInt(res.headers.get("retry-after") || "0", 10);
        const base = res.status === 429 ? 10000 * (attempt + 1) : 3000 * 2 ** attempt;
        const wait = Math.max(ra * 1000, base);
        console.log(`      ⏳ HTTP ${res.status}, retrying in ${wait / 1000}s... (${retries - attempt} left)`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${url}`);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (e) {
      if (e.status) throw e; // classified HTTP error — not retryable
      if (attempt < retries) {
        const wait = 3000 * 2 ** attempt;
        console.log(`      ⏳ ${e.message || e.name}, retrying in ${wait / 1000}s... (${retries - attempt} left)`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
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
// The per-session extras below return [] only for a 404 ("no data"). Any other
// failure throws, so the session's catch keeps the previously shipped copy —
// turning a 5xx into [] used to replace a good cached session with an empty one.
async function optional(url) {
  try {
    return (await fetchJSON(url)) || [];
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

async function getStints(sessionKey) {
  return optional(`${BASE}/stints?session_key=${sessionKey}`);
}

/**
 * Get position events for a session. Each event is (date, driver_number, position).
 */
async function getPositions(sessionKey) {
  return optional(`${BASE}/position?session_key=${sessionKey}`);
}

/**
 * Get race-control messages (safety car deployments, red flags, etc.) for a session.
 */
async function getRaceControl(sessionKey) {
  return optional(`${BASE}/race_control?session_key=${sessionKey}`);
}

/**
 * Get high-frequency car telemetry (speed, throttle, brake, gear, rpm, drs)
 * for a single driver within a date range. Used to build per-lap speed traces.
 */
async function getCarData(sessionKey, driverNumber, dateStartIso, dateEndIso) {
  return optional(`${BASE}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}&date>=${dateStartIso}&date<=${dateEndIso}`);
}

/**
 * Get 3D location samples (x/y/z) for a single driver within a date range.
 */
async function getLocation(sessionKey, driverNumber, dateStartIso, dateEndIso) {
  return optional(`${BASE}/location?session_key=${sessionKey}&driver_number=${driverNumber}&date>=${dateStartIso}&date<=${dateEndIso}`);
}

/**
 * Align speed samples to distance-traveled by joining /car_data and /location on
 * timestamp, then decimate to roughly `targetSamples` evenly-spaced points so the
 * payload stays small. Returns [{ d: distance_meters, s: speed_kmh }, ...].
 */
export function buildSpeedTrace(carData, location, targetSamples = 80) {
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
 * Also returns the de-duplicated list of laps that had any localized yellow-flag
 * (sector wave) so the chart can drop thin reference markers on those laps.
 */
export function processRaceControlPeriods(events, maxLap) {
  if (!events || events.length === 0) return { periods: [], yellowLaps: [] };
  const sorted = [...events]
    .filter(e => e.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const periods = [];
  const yellowLapSet = new Set();
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
    } else if (e.flag === "YELLOW" && lap != null) {
      // Localized sector yellow — record the lap so the chart can mark it
      yellowLapSet.add(lap);
    }
  }
  if (scStart != null) periods.push({ type: "SC", lapStart: scStart, lapEnd: maxLap });
  if (vscStart != null) periods.push({ type: "VSC", lapStart: vscStart, lapEnd: maxLap });
  if (rfStart != null) periods.push({ type: "RED", lapStart: rfStart, lapEnd: maxLap });
  return { periods, yellowLaps: [...yellowLapSet].sort((a, b) => a - b) };
}

/**
 * Reduce raw /position events to per-lap position snapshots per driver.
 * For each driver lap, takes the most recent position record at or before
 * the lap's end time (date_start + duration).
 */
export function processPositionsByLap(positions, lapsByDriver) {
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
export function processLapData(laps, drivers) {
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
export function computeSessionBests(driverStats) {
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

// Jolpica round for an OpenF1 meeting, joined by the race date. Names don't
// join the two APIs — 2026's OpenF1 "Bahrain Grand Prix" is Jolpica's "Bahrain
// Grand Prix in Malaysia" (Sepang), "São Paulo" is "Brazilian" — and the app's
// track outlines are keyed by the Jolpica name. Meetings without a Race session
// fall back to the round dated inside the meeting's weekend.
export function matchRound(meeting, schedule) {
  const race = (meeting.sessions || []).find(s => s.sessionName === "Race");
  const day = (race?.dateStart || "").slice(0, 10);
  let hit = day ? (schedule || []).find(r => r.date === day) : null;
  if (!hit && meeting.dateStart) {
    const start = new Date(meeting.dateStart).getTime();
    hit = (schedule || []).find(r => {
      const t = new Date(`${r.date}T12:00:00Z`).getTime();
      return t >= start - 24 * 3600e3 && t <= start + 4 * 24 * 3600e3;
    });
  }
  return hit ? { round: hit.round, raceName: hit.name } : null;
}

// A cached meeting is final once its race is fully there — a Race session with
// lap positions. "Has a Race session" alone froze races whose last refetch had
// lost the position feed to a transient error.
export function raceIsFinal(meeting) {
  return (meeting?.sessions || []).some(s => s.sessionName === "Race" && (s.drivers || []).some(d => (d.positions || []).length > 0));
}

// Lap Compare's default view, picked exactly as the app does
// (pickLapCompareDrivers): the top two finishers with usable laps, on the
// winner's fastest non-pit lap. Precomputed so the Telemetry tab's first open
// needs no live OpenF1 calls — four back-to-back browser requests tripped the
// free tier's rate limit.
export function lapCompareDefaultPick(drivers) {
  const usable = (drivers || []).filter(d => (d.lapTimes || []).filter(l => l.ds).length >= 3);
  if (usable.length < 2) return null;
  const finalPos = d => { const ps = d.positions; return ps && ps.length ? ps[ps.length - 1].p : 99; };
  const [a, b] = [...usable].sort((x, y) => finalPos(x) - finalPos(y));
  const fastest = (a.lapTimes || []).filter(l => l.ds && !l.pit).reduce((m, l) => (!m || l.t < m.t ? l : m), null);
  return fastest ? { drivers: [a, b], lap: fastest.l } : null;
}

// Compact rows ([ms from t0, …]) holding just what the app's processLapTelemetry reads
export function compactLapTelemetry(carData, location, t0) {
  return {
    t0,
    car: (carData || []).filter(c => c.date).map(c => [Date.parse(c.date) - t0, c.speed ?? 0, c.throttle ?? 0, c.brake ?? 0, c.n_gear ?? null]),
    loc: (location || []).filter(l => l.date && l.x != null && l.y != null).map(l => [Date.parse(l.date) - t0, l.x, l.y]),
  };
}

async function buildLapCompareDefault(sessionKey, drivers) {
  const pick = lapCompareDefaultPick(drivers);
  if (!pick) return null;
  const out = { lap: pick.lap, drivers: {} };
  for (const d of pick.drivers) {
    const lt = d.lapTimes.find(l => l.l === pick.lap);
    if (!lt?.ds) return null;
    // Same window the app requests: lap start to end plus half a second
    const startIso = new Date(lt.ds).toISOString();
    const endIso = new Date(lt.ds + lt.t * 1000 + 500).toISOString();
    const car = await getCarData(sessionKey, d.number, startIso, endIso);
    await sleep(2000);
    const loc = await getLocation(sessionKey, d.number, startIso, endIso);
    await sleep(2000);
    if (car.length === 0 || loc.length < 3) return null;
    out.drivers[d.number] = compactLapTelemetry(car, loc, lt.ds);
  }
  return out;
}

// Write via a temp file + rename, so an interrupted run never leaves a
// truncated JSON file for the next run (or the deploy) to trip over
function writeAtomic(file, text) {
  fs.writeFileSync(`${file}.tmp`, text);
  fs.renameSync(`${file}.tmp`, file);
}

async function main() {
  console.log(`\n🏎️  Fetching OpenF1 sector/speed data for ${SEASON}...\n`);

  const path = await import("path");
  const outDir = path.join(process.cwd(), "public", "openf1");
  const meetingsDir = path.join(outDir, "meetings");

  // Previous output seeds an incremental run: past race weekends are immutable,
  // so finished meetings are served from cache and only new/recent ones are
  // refetched. This also means a transient API failure can never silently drop
  // data that previously shipped.
  let prevIndex = null;
  try { prevIndex = JSON.parse(fs.readFileSync(path.join(outDir, "index.json"), "utf8")); } catch { /* first run */ }
  const readCachedMeeting = (key) => {
    try { return JSON.parse(fs.readFileSync(path.join(meetingsDir, `${key}.json`), "utf8")); } catch { return null; }
  };

  // 1. Get all meetings
  console.log("📅 Fetching meetings...");
  const meetings = await getMeetings();

  if (!meetings || meetings.length === 0) {
    if (prevIndex && (prevIndex.meetings || []).length > 0) {
      // An API glitch must not wipe the deployed season — fail the build instead
      throw new Error("OpenF1 /meetings returned empty but previous data exists — refusing to overwrite");
    }
    console.log("   ⚠️  No meetings found for this season yet.");
    console.log("   Writing empty index...\n");
    fs.mkdirSync(meetingsDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({
      season: SEASON,
      fetchedAt: new Date().toISOString(),
      meetingCount: 0,
      meetings: [],
      driverHeadshots: {},
    }));
    console.log(`✅ Empty index written to ${outDir}\n`);
    return;
  }

  console.log(`   Found ${meetings.length} meetings\n`);

  const now = new Date();
  const allMeetingData = [];
  // Seed headshots from the previous run — cached meetings skip driver fetches
  const headshotMap = { ...(prevIndex?.driverHeadshots || {}) }; // fullName -> { url, number, acronym, team }
  // Meetings that started more than this long ago are final — serve from cache
  const FRESH_WINDOW_MS = 8 * 24 * 3600 * 1000;
  // Meetings older than this are accepted from cache even without a Race
  // session (cancelled race, or OpenF1 simply never had the data).
  const SETTLED_MS = 30 * 24 * 3600 * 1000;
  // Negative cache: meetings OpenF1 lists but has no lap data for (pre-season
  // tests, cancelled rounds). Each one used to cost ~12 requests every run.
  const RECHECK_EMPTY_MS = 30 * 24 * 3600 * 1000;
  const prevEmpty = new Map((prevIndex?.emptyMeetings || []).map(m => [m.meetingKey, m]));
  // Manual override (workflow_dispatch input refetch_meetings): meeting keys to
  // refetch even though they're final — e.g. after OpenF1 corrects a session.
  // "all" refetches everything. The cached copy still backs up failed sessions.
  const refetch = new Set((process.env.REFETCH_MEETINGS || "").split(",").map(x => x.trim()).filter(Boolean));
  const forced = key => refetch.has("all") || refetch.has(String(key));
  // Older race meetings get the precomputed Lap Compare default a few per run,
  // newest first — the Telemetry tab opens on the latest race
  const lapCompareBackfill = new Set(
    meetings.filter(m => new Date(m.date_start) <= now).map(m => m.meeting_key).reverse()
      .filter(k => (readCachedMeeting(k)?.sessions || []).some(s => s.sessionName === "Race" && s.drivers && !s.lapCompareDefault))
      .slice(0, 3),
  );
  const emptyMeetings = [];
  const markEmpty = (meeting) => emptyMeetings.push({ meetingKey: meeting.meeting_key, meetingName: meeting.meeting_name, checkedAt: now.toISOString() });

  for (const meeting of meetings) {
    const meetingStart = new Date(meeting.date_start);
    // Skip future meetings
    if (meetingStart > now) {
      console.log(`⏭️  Skipping future meeting: ${meeting.meeting_name}`);
      continue;
    }

    const cached = readCachedMeeting(meeting.meeting_key);
    const isRecent = now - meetingStart < FRESH_WINDOW_MS;
    const force = forced(meeting.meeting_key);
    if (force) console.log(`🔁 Refetch requested: ${meeting.meeting_name}`);
    if (cached && !isRecent && !force) {
      // "Final" needs the race fully there (positions included) — a flaky run
      // inside the fresh window must not freeze a half-fetched weekend forever.
      // Meetings past the settle window are accepted as-is.
      if (raceIsFinal(cached) || now - meetingStart > SETTLED_MS) {
        console.log(`📦 Cached (final): ${meeting.meeting_name}`);
        const race = (cached.sessions || []).find(s => s.sessionName === "Race" && s.drivers && !s.lapCompareDefault);
        if (race && lapCompareBackfill.has(meeting.meeting_key)) {
          try {
            const def = await buildLapCompareDefault(race.sessionKey, race.drivers);
            if (def) { race.lapCompareDefault = def; console.log(`   🛰️  Added the Lap Compare default (lap ${def.lap})`); }
          } catch (e) {
            console.log(`   ⚠️  Lap Compare default skipped: ${e.message}`);
          }
        }
        allMeetingData.push(cached);
        continue;
      }
      console.log(`🔁 Cached race incomplete — refetching: ${meeting.meeting_name}`);
    }
    const knownEmpty = prevEmpty.get(meeting.meeting_key);
    if (!cached && !isRecent && !force && knownEmpty && now - new Date(knownEmpty.checkedAt) < RECHECK_EMPTY_MS) {
      console.log(`⏭️  Skipping (no lap data on OpenF1, checked ${String(knownEmpty.checkedAt).slice(0, 10)}): ${meeting.meeting_name}`);
      emptyMeetings.push(knownEmpty);
      continue;
    }

    console.log(`\n🏁 Processing: ${meeting.meeting_name} (${meeting.location})`);
    await sleep(2000);

    // Get sessions for this meeting. A failure keeps the cached meeting (if any)
    // instead of aborting the whole run.
    let sessions;
    try {
      sessions = await getSessions(meeting.meeting_key);
    } catch (e) {
      console.log(`   ❌ /sessions failed (${e.message})${cached ? " — keeping the cached copy" : ""}`);
      if (cached) allMeetingData.push(cached);
      continue;
    }
    await sleep(2000);

    if (!sessions || sessions.length === 0) {
      console.log("   No sessions found");
      if (!isRecent && !cached) markEmpty(meeting);
      if (cached) allMeetingData.push(cached);
      continue;
    }

    const meetingSessions = [];
    // Any failure other than "no data" (404) — the meeting then must not be
    // marked empty, since its data may well exist
    let hadErrors = false;
    const cachedSession = key => (cached?.sessions || []).find(s => s.sessionKey === key);

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
        const rcResult = isRaceLike ? processRaceControlPeriods(raceControl, sessionMaxLap) : { periods: [], yellowLaps: [] };
        const raceControlPeriods = rcResult.periods;
        const yellowFlagLaps = rcResult.yellowLaps;

        // For race-likes, build speed-vs-distance traces for the top 6 drivers'
        // fastest laps. Each driver costs 2 API calls (/car_data + /location).
        const speedTraces = {};
        let partial = false; // an optional extra failed — prefer the cached session if there is one
        if (isRaceLike) {
          const top6 = driverStats.filter(d => d.bestLap && d.bestS1).slice(0, 6);
          for (const ds of top6) try {
            const fastLap = ds.laps.find(l => l.lapTime === ds.bestLap && l.dateStart);
            if (!fastLap) continue;
            const startMs = new Date(fastLap.dateStart).getTime();
            const endMs = startMs + fastLap.lapTime * 1000;
            const startIso = new Date(startMs).toISOString();
            const endIso = new Date(endMs).toISOString();
            console.log(`      🛰️  Fetching speed trace for ${ds.acronym} (lap ${fastLap.lap}, ${fastLap.lapTime.toFixed(3)}s)...`);
            const carData = await getCarData(session.session_key, ds.number, startIso, endIso);
            await sleep(2000); // 30 req/min free tier — 1.5s ran at 40/min
            const loc = await getLocation(session.session_key, ds.number, startIso, endIso);
            await sleep(2000); // 30 req/min free tier — 1.5s ran at 40/min
            const trace = buildSpeedTrace(carData, loc);
            if (trace.length > 0) {
              speedTraces[ds.number] = { lap: fastLap.lap, lapTime: fastLap.lapTime, trace };
              console.log(`         ✅ ${trace.length} samples`);
            } else {
              console.log(`         ⚠️  empty trace (car_data: ${carData.length}, loc: ${loc.length})`);
            }
          } catch (e) {
            partial = true;
            console.log(`         ⚠️  speed trace failed: ${e.message}`);
          }
        }

        const sessionOut = {
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
                  .map(l => ({ l: l.lap, t: +l.lapTime.toFixed(3), pit: !!l.isPitOut, ds: l.dateStart ? new Date(l.dateStart).getTime() : null }))
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
          // Laps with at least one localized yellow flag (sector wave)
          yellowFlagLaps,
        };

        // Race only: Lap Compare's default view, precomputed (see lapCompareDefaultPick)
        if (session.session_name === "Race") {
          try {
            const def = await buildLapCompareDefault(session.session_key, sessionOut.drivers);
            if (def) sessionOut.lapCompareDefault = def;
          } catch (e) {
            partial = true;
            console.log(`      ⚠️  Lap Compare default failed: ${e.message}`);
          }
        }

        const prior = cachedSession(session.session_key);
        if (partial && prior) {
          console.log(`      📦 Extras failed — keeping the previously shipped ${session.session_name}`);
          meetingSessions.push(prior);
        } else {
          meetingSessions.push(sessionOut);
        }
        console.log(`      ✅ ${laps.length} laps, ${driverStats.length} drivers`);
      } catch (err) {
        if (err.status === 404) {
          console.log(`      No data for this session yet (404)`);
        } else {
          hadErrors = true;
          console.log(`      ❌ Error: ${err.message}${cachedSession(session.session_key) ? " — the cached copy fills in" : ""}`);
        }
      }
    }

    // Merge with cache: fresh sessions win; cached sessions fill any gaps left
    // by transient per-session fetch failures, so a flaky run can't drop a
    // session that previously shipped.
    let sessionsOut = meetingSessions;
    if (cached?.sessions?.length) {
      const have = new Set(meetingSessions.map(s => s.sessionKey));
      const fill = cached.sessions.filter(s => !have.has(s.sessionKey));
      if (fill.length > 0) console.log(`   📦 Restored ${fill.length} session(s) from cache`);
      sessionsOut = [...meetingSessions, ...fill].sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
    }
    if (sessionsOut.length > 0) {
      allMeetingData.push({
        meetingKey: meeting.meeting_key,
        meetingName: meeting.meeting_name,
        location: meeting.location,
        country: meeting.country_name,
        countryCode: meeting.country_code,
        circuitName: meeting.circuit_short_name,
        dateStart: meeting.date_start,
        year: meeting.year,
        sessions: sessionsOut,
      });
    } else if (!isRecent && !hadErrors) {
      // Only an explicit "no data" marks a meeting empty for 30 days — errors
      // would otherwise hide a real race for a month
      markEmpty(meeting);
    }
  }

  // Stamp each meeting with its Jolpica round and race name (from data.json,
  // which the Jolpica step writes first) — see matchRound
  let schedule = [];
  try { schedule = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data.json"), "utf8")).schedule || []; } catch { /* no Jolpica data — meetings stay unstamped */ }
  for (const m of allMeetingData) {
    const hit = matchRound(m, schedule);
    if (hit) Object.assign(m, hit);
    else { delete m.round; delete m.raceName; }
  }

  // Build output — split layout, all minified (pretty-printing tripled the old
  // single-file payload, and the browser had to download all of it up front):
  //   public/openf1/index.json            light meeting/session metadata + headshots (fetched on page load)
  //   public/openf1/meetings/{key}.json   full per-meeting data (lazy-loaded when a tab needs it)
  fs.mkdirSync(meetingsDir, { recursive: true });

  let meetingBytes = 0;
  for (const m of allMeetingData) {
    const json = JSON.stringify(m);
    meetingBytes += json.length;
    writeAtomic(path.join(meetingsDir, `${m.meetingKey}.json`), json);
  }

  const index = {
    season: SEASON,
    fetchedAt: new Date().toISOString(),
    meetingCount: allMeetingData.length,
    driverHeadshots: headshotMap,
    emptyMeetings,
    meetings: allMeetingData.map(m => ({
      meetingKey: m.meetingKey,
      meetingName: m.meetingName,
      location: m.location,
      country: m.country,
      countryCode: m.countryCode,
      circuitName: m.circuitName,
      dateStart: m.dateStart,
      year: m.year,
      round: m.round ?? null,
      raceName: m.raceName ?? null,
      sessions: m.sessions.map(s => ({
        sessionKey: s.sessionKey,
        sessionName: s.sessionName,
        sessionType: s.sessionType,
        dateStart: s.dateStart,
        dateEnd: s.dateEnd,
        totalLaps: s.totalLaps,
        driverCount: s.driverCount,
      })),
    })),
  };
  const indexJson = JSON.stringify(index);
  writeAtomic(path.join(outDir, "index.json"), indexJson);

  // Remove meeting files no longer referenced by the index (season rollover etc.)
  const valid = new Set(allMeetingData.map(m => String(m.meetingKey)));
  for (const f of fs.readdirSync(meetingsDir)) {
    if (f.endsWith(".json") && !valid.has(f.replace(/\.json$/, ""))) fs.unlinkSync(path.join(meetingsDir, f));
  }

  // Drop the legacy single-file payload if it's still around
  const legacyPath = path.join(process.cwd(), "public", "openf1-data.json");
  if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);

  const totalSessions = allMeetingData.reduce((sum, m) => sum + m.sessions.length, 0);
  console.log(`\n✅ OpenF1 data written to ${outDir}`);
  console.log(`   index.json ${(indexJson.length / 1024).toFixed(0)} KB + ${allMeetingData.length} meeting files totalling ${(meetingBytes / 1024).toFixed(0)} KB`);
  console.log(`   ${allMeetingData.length} meetings, ${totalSessions} sessions`);
  console.log(`   Includes: sector times, speed traps, stint data\n`);
}

// Only run when executed directly — the exported helpers are imported by test/
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error("❌ Error fetching OpenF1 data:", err);
    process.exit(1);
  });
}

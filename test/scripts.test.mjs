// Unit tests for the pure helpers in the data-fetch scripts. No network.
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { parsePitSeconds, raceEnded, weekendActive, getCountryCode, outLabel, currentTeamId, mapResult, constructorBreakdowns, currentLineups } from "../scripts/fetch-f1-data.mjs";

test("outLabel reads Jolpica's positionText: numbers are classified, letters are not", () => {
  assert.equal(outLabel("1"), null);
  assert.equal(outLabel("17"), null, "a lapped car is still classified");
  assert.equal(outLabel("R"), "DNF");
  assert.equal(outLabel("D"), "DSQ");
  assert.equal(outLabel("E"), "DSQ");
  assert.equal(outLabel("W"), "DNS");
  assert.equal(outLabel("N"), "NC");
  assert.equal(outLabel(undefined), "DNF");
});

test("currentTeamId takes the LAST constructor — Jolpica lists them in the order joined", () => {
  const lawson = { Constructors: [{ constructorId: "rb" }, { constructorId: "red_bull" }] };
  assert.equal(currentTeamId(lawson), "red_bull");
  assert.equal(currentTeamId({ Constructors: [{ constructorId: "mercedes" }] }), "mercedes");
  assert.equal(currentTeamId({}), undefined);
});

test("mapResult keeps the retirement label, real grid slot and points", () => {
  const row = mapResult({
    position: "22", positionText: "R", number: "44", grid: "4", laps: "6", points: "0", status: "Retired",
    Driver: { driverId: "hamilton", familyName: "Hamilton" }, Constructor: { constructorId: "ferrari" },
  });
  assert.equal(row.out, "DNF");
  assert.equal(row.grid, 4);
  assert.equal(row.pts, 0);
  assert.equal(row.team, "Ferrari");
  assert.equal(row.gap, "Retired");
  const win = mapResult({ position: "1", positionText: "1", number: "12", grid: "2", laps: "57", points: "25", status: "Finished",
    Time: { time: "1:34:23.754" }, Driver: { driverId: "antonelli", familyName: "Antonelli" }, Constructor: { constructorId: "mercedes" } });
  assert.equal(win.out, null);
  assert.equal(win.gap, "WINNER");
  assert.equal(win.pts, 25);
});

test("constructorBreakdowns splits a mid-season mover's points between his teams", () => {
  const r = (driver, team, pts) => ({ did: driver.toLowerCase(), driver, team, pts });
  const sessions = [
    { round: 11, results: [r("Verstappen", "Red Bull", 18), r("Hadjar", "Red Bull", 4), r("Lawson", "Racing Bulls", 6), r("Lindblad", "Racing Bulls", 0)] },
    { round: 12, results: [r("Verstappen", "Red Bull", 25), r("Lawson", "Red Bull", 8), r("Lindblad", "Racing Bulls", 2), r("Tsunoda", "Racing Bulls", 0)] },
  ];
  const b = constructorBreakdowns(sessions);
  assert.deepEqual(b["Red Bull"], [{ name: "Verstappen", pts: 43 }, { name: "Lawson", pts: 8 }, { name: "Hadjar", pts: 4 }]);
  assert.deepEqual(b["Racing Bulls"].map(d => d.name), ["Lawson", "Lindblad", "Tsunoda"]);
  assert.equal(b["Racing Bulls"][0].pts, 6);
});

test("currentLineups uses the latest round, preferring the race over its qualifying", () => {
  const races = [{ round: 12, results: [{ team: "Red Bull", driver: "Verstappen" }, { team: "Red Bull", driver: "Lawson" }] }];
  const quali = [
    { round: 12, results: [{ team: "Red Bull", driver: "Verstappen" }, { team: "Red Bull", driver: "Hadjar" }] },
    { round: 13, results: [{ team: "Red Bull", driver: "Lawson" }, { team: "Red Bull", driver: "Verstappen" }] },
  ];
  assert.deepEqual(currentLineups(races, quali.slice(0, 1))["Red Bull"], ["Verstappen", "Lawson"], "race wins the tie");
  assert.deepEqual(currentLineups(races, quali)["Red Bull"], ["Lawson", "Verstappen"], "a newer weekend's qualifying wins");
});
import { processRaceControlPeriods, buildSpeedTrace, computeSessionBests, processLapData } from "../scripts/fetch-openf1-data.mjs";
import { mergeIds } from "../scripts/merge-video-ids.mjs";
import { matchRound, raceIsFinal, lapCompareDefaultPick, compactLapTelemetry, compactRaceExtras, RACE_EXTRAS_VERSION } from "../scripts/fetch-openf1-data.mjs";
import { validate } from "../scripts/validate-data.mjs";
import { quoteGaps } from "../scripts/run-summary.mjs";

test("quoteGaps checks every finished round, not just the latest", () => {
  const data = {
    races: [{ round: 17 }, { round: 18 }],
    schedule: [
      { round: 17, name: "Singapore Grand Prix", date: "2026-10-11", time: "12:00:00Z", sprint: true },
      { round: 18, name: "United States Grand Prix", date: "2026-10-25", time: "19:00:00Z", sprint: false },
      { round: 19, name: "Mexico City Grand Prix", date: "2026-11-01", time: "20:00:00Z", sprint: false },
    ],
  };
  const q = (sessions) => Object.fromEntries(sessions.map(s => [s, { quotes: [{}] }]));
  const quotes = { rounds: [{ round: 17, sessions: q(["sprint", "qualifying"]) }, { round: 18, sessions: q(["qualifying", "race"]) }] };
  const gaps = quoteGaps(data, quotes, Date.parse("2026-10-31T12:00:00Z"));
  assert.deepEqual(gaps, [{ round: 17, name: "Singapore Grand Prix", missing: ["sprintQualifying", "race"] }],
    "R17's missing race is caught behind a fully quoted R18; R19 hasn't run");
  const fresh = quoteGaps(data, { rounds: [{ round: 17, sessions: q(["sprintQualifying", "sprint", "qualifying", "race"]) }] }, Date.parse("2026-10-26T12:00:00Z"));
  assert.deepEqual(fresh, [], "a race under 48 hours old is not a gap yet");
});

test("matchRound joins OpenF1 meetings to Jolpica rounds by race date, not name", () => {
  const schedule = [
    { round: 15, name: "Azerbaijan Grand Prix", date: "2026-09-26" },
    { round: 16, name: "Bahrain Grand Prix in Malaysia", date: "2026-10-04" },
    { round: 21, name: "Las Vegas Grand Prix", date: "2026-11-22" },
  ];
  const sepang = { meetingName: "Bahrain Grand Prix", dateStart: "2026-10-02T03:30:00+00:00",
    sessions: [{ sessionName: "Race", dateStart: "2026-10-04T07:00:00+00:00" }] };
  assert.deepEqual(matchRound(sepang, schedule), { round: 16, raceName: "Bahrain Grand Prix in Malaysia" });
  const vegas = { meetingName: "Las Vegas Grand Prix", dateStart: "2026-11-20T00:30:00+00:00",
    sessions: [{ sessionName: "Race", dateStart: "2026-11-22T04:00:00+00:00" }] };
  assert.equal(matchRound(vegas, schedule).round, 21, "a Saturday-night race is Sunday in UTC on both sides");
  const bakuFriday = { meetingName: "Azerbaijan Grand Prix", dateStart: "2026-09-25T08:30:00+00:00", sessions: [{ sessionName: "Practice 1" }] };
  assert.equal(matchRound(bakuFriday, schedule).round, 15, "no Race session yet — falls back to the weekend window");
  assert.equal(matchRound({ meetingName: "Pre-Season Testing", dateStart: "2026-02-11T07:00:00+00:00", sessions: [] }, schedule), null);
});

test("raceIsFinal needs lap positions, not just a Race session", () => {
  assert.equal(raceIsFinal({ sessions: [{ sessionName: "Race", drivers: [{ positions: [{ l: 1, p: 1 }] }] }] }), true);
  assert.equal(raceIsFinal({ sessions: [{ sessionName: "Race", drivers: [{ positions: [] }] }] }), false, "position feed lost to an error");
  assert.equal(raceIsFinal({ sessions: [{ sessionName: "Qualifying", drivers: [{ positions: [{ l: 1, p: 1 }] }] }] }), false);
});

test("lapCompareDefaultPick mirrors the app: top two finishers on the winner's fastest non-pit lap", () => {
  const laps = (fast, pitLap) => [1, 2, 3, 4].map(l => ({ l, t: l === fast ? 90 : 95, pit: l === pitLap, ds: 1000 * l }));
  const drivers = [
    { number: 44, lapTimes: laps(2), positions: [{ l: 4, p: 2 }] },
    { number: 12, lapTimes: [...laps(3, 3).map(x => (x.l === 3 ? { ...x, t: 80 } : x))], positions: [{ l: 4, p: 1 }] },
    { number: 1, lapTimes: laps(1), positions: [{ l: 4, p: 3 }] },
  ];
  const pick = lapCompareDefaultPick(drivers);
  assert.deepEqual(pick.drivers.map(d => d.number), [12, 44]);
  assert.equal(pick.lap, 1, "lap 3 was the winner's quickest but a pit lap — next best counts");
  const c = compactLapTelemetry([{ date: "2026-01-01T00:00:01.000Z", speed: 300, throttle: 99, brake: 0, n_gear: 8 }],
    [{ date: "2026-01-01T00:00:01.250Z", x: 10, y: -5 }], Date.parse("2026-01-01T00:00:00.000Z"));
  assert.deepEqual(c.car, [[1000, 300, 99, 0, 8]]);
  assert.deepEqual(c.loc, [[1250, 10, -5]]);
});

test("validate: shrink fails, ALLOW_SHRINK downgrades it, and a new season skips it", () => {
  const race = r => ({ round: r, results: Array.from({ length: 20 }, (_, i) => ({ driver: `D${i}`, team: "T" })) });
  const data = (season, n) => ({ season, fetchedAt: "2026-09-24T00:00:00Z", completedRounds: n,
    schedule: Array.from({ length: 22 }, (_, i) => ({ round: i + 1 })),
    drivers: Array.from({ length: 22 }, () => ({})), constructors: Array.from({ length: 11 }, () => ({ pts: 0, drivers: [] })),
    races: Array.from({ length: n }, (_, i) => race(i + 1)), sprints: [], qualifying: [] });
  const index = { season: 2026, meetings: [], driverHeadshots: {} };
  const base = { data: data(2026, 14), index };
  assert.equal(validate({ data: data(2026, 14), index }, base).failures.length, 0);
  assert.match(validate({ data: data(2026, 13), index }, base).failures.join(), /races shrank/);
  assert.equal(validate({ data: data(2026, 13), index }, base, { allowShrink: true }).failures.length, 0);
  const preSeason = { ...data(2027, 0), drivers: [], constructors: [] };
  const r = validate({ data: preSeason, index: { ...index, season: 2027 } }, base);
  assert.equal(r.failures.length, 0, `a new season starting empty must deploy: ${r.failures}`);
  const truncated = data(2026, 14); truncated.races[3].results = truncated.races[3].results.slice(0, 5);
  assert.match(validate({ data: truncated, index }, base).failures.join(), /round 4: only 5 classified/);
});

test("mergeIds unions CI-discovered video IDs with main, and main wins on conflicts", () => {
  const main = { 2026: { 12: { raceName: "Dutch Grand Prix", race: "a" }, 13: { raceName: "Italian Grand Prix", race: "hand-fixed" } } };
  const run = { 2026: { 13: { raceName: "Italian Grand Prix", race: "ci", qualifying: "q" }, 15: { raceName: "Azerbaijan Grand Prix", race: "z" } } };
  const merged = mergeIds(main, run);
  assert.equal(merged[2026][13].race, "hand-fixed", "an ID already on main is never replaced");
  assert.equal(merged[2026][13].qualifying, "q", "CI's new session is added");
  assert.equal(merged[2026][15].race, "z", "CI's new round is added");
  assert.equal(merged[2026][12].race, "a");
  assert.deepEqual(Object.keys(merged[2026]), ["12", "13", "15"]);
  assert.deepEqual(mergeIds({}, run), run, "empty main takes the run's map");
});

test("parsePitSeconds handles plain seconds and mm:ss red-flag stops", () => {
  assert.equal(parsePitSeconds("22.345"), 22.345);
  assert.equal(parsePitSeconds("31:24.123"), 31 * 60 + 24.123);
  assert.equal(parsePitSeconds(""), 0);
  assert.equal(parsePitSeconds(null), 0);
  assert.equal(parsePitSeconds("garbage"), 0);
});

test("raceEnded needs date + start time + 3h buffer, not just the calendar date", () => {
  const race = { date: "2026-09-06", time: "13:00:00Z" };
  assert.equal(raceEnded(race, new Date("2026-09-06T00:30:00Z")), false, "race-day midnight is not finished");
  assert.equal(raceEnded(race, new Date("2026-09-06T15:00:00Z")), false, "2h in is not finished");
  assert.equal(raceEnded(race, new Date("2026-09-06T16:01:00Z")), true, "3h after start is finished");
  assert.equal(raceEnded({ date: "2026-09-06" }, new Date("2026-09-06T16:00:00Z")), true, "missing time defaults to 12:00 UTC");
});

test("weekendActive is true from 3 days before the race until it ends", () => {
  const race = { date: "2026-09-06", time: "13:00:00Z" };
  assert.equal(weekendActive(race, new Date("2026-09-02T12:00:00Z")), false);
  assert.equal(weekendActive(race, new Date("2026-09-05T18:00:00Z")), true, "Saturday evening: quali ran");
  assert.equal(weekendActive(race, new Date("2026-09-06T17:00:00Z")), false, "race over → no longer active");
});

test("getCountryCode covers the 2026 calendar including Sepang", () => {
  assert.equal(getCountryCode("sepang"), "MY");
  assert.equal(getCountryCode("madring"), "ES");
  assert.equal(getCountryCode("albert_park"), "AU");
  assert.equal(getCountryCode("nowhere"), "XX");
});

test("processRaceControlPeriods pairs SC/VSC/red-flag deploy+end events and closes open ones at maxLap", () => {
  const ev = [
    { date: "2026-01-01T00:01:00Z", lap_number: 3, message: "SAFETY CAR DEPLOYED" },
    { date: "2026-01-01T00:04:00Z", lap_number: 6, message: "SAFETY CAR IN THIS LAP" },
    { date: "2026-01-01T00:10:00Z", lap_number: 12, message: "VIRTUAL SAFETY CAR DEPLOYED" },
    { date: "2026-01-01T00:11:00Z", lap_number: 13, message: "VIRTUAL SAFETY CAR ENDING" },
    { date: "2026-01-01T00:12:00Z", lap_number: 20, flag: "YELLOW", message: "YELLOW IN TRACK SECTOR 4" },
    { date: "2026-01-01T00:13:00Z", lap_number: 40, flag: "RED", message: "RED FLAG" },
  ];
  const { periods, yellowLaps } = processRaceControlPeriods(ev, 57);
  assert.deepEqual(periods, [
    { type: "SC", lapStart: 3, lapEnd: 6 },
    { type: "VSC", lapStart: 12, lapEnd: 13 },
    { type: "RED", lapStart: 40, lapEnd: 57 },
  ]);
  assert.deepEqual(yellowLaps, [20]);
  assert.deepEqual(processRaceControlPeriods([], 10), { periods: [], yellowLaps: [] });
});

test("buildSpeedTrace joins car_data to location by time and decimates", () => {
  const t0 = Date.parse("2026-01-01T00:00:00Z");
  const location = Array.from({ length: 11 }, (_, i) => ({ date: new Date(t0 + i * 1000).toISOString(), x: i * 100, y: 0 }));
  const carData = Array.from({ length: 200 }, (_, i) => ({ date: new Date(t0 + i * 50).toISOString(), speed: 100 + i }));
  const trace = buildSpeedTrace(carData, location, 20);
  assert.equal(trace.length, 20);
  assert.equal(trace[0].d, 0);
  assert.ok(trace.at(-1).d > trace[0].d, "distance increases along the lap");
  assert.deepEqual(buildSpeedTrace([], location), []);
  assert.deepEqual(buildSpeedTrace(carData, [{ date: location[0].date, x: 0, y: 0 }]), [], "needs at least 2 location samples");
});

test("processLapData + computeSessionBests ignore pit-out laps and rank by theoretical best", () => {
  const drivers = [
    { driver_number: 1, full_name: "A One", name_acronym: "ONE", team_name: "T", team_colour: "ff0000" },
    { driver_number: 2, full_name: "B Two", name_acronym: "TWO", team_name: "T", team_colour: null },
  ];
  const laps = [
    { driver_number: 1, lap_number: 1, lap_duration: 95, duration_sector_1: 30, duration_sector_2: 32, duration_sector_3: 33, is_pit_out_lap: true, st_speed: 300 },
    { driver_number: 1, lap_number: 2, lap_duration: 90, duration_sector_1: 29, duration_sector_2: 30, duration_sector_3: 31, is_pit_out_lap: false, st_speed: 310 },
    { driver_number: 2, lap_number: 2, lap_duration: 89, duration_sector_1: 28.5, duration_sector_2: 30, duration_sector_3: 30.5, is_pit_out_lap: false, st_speed: 305 },
  ];
  const stats = processLapData(laps, drivers);
  assert.equal(stats[0].acronym, "TWO", "fastest theoretical best first");
  assert.equal(stats[1].validLapCount, 1, "pit-out lap excluded");
  assert.equal(stats[1].teamColour, "#ff0000");
  const bests = computeSessionBests(stats);
  assert.equal(bests.fastestS1, 28.5);
  assert.equal(bests.topSTSpeed, 310);
});

test("compactRaceExtras keeps stationary time, raw swaps and a weather row per reading", () => {
  const x = compactRaceExtras(
    [{ driver_number: 4, lap_number: 22, stop_duration: 2.4567, lane_duration: 21.9, pit_duration: 22.1 }, { driver_number: 1, lap_number: 30, stop_duration: null, pit_duration: 24 }],
    [{ date: "2026-10-25T20:10:00Z", overtaking_driver_number: 4, overtaken_driver_number: 1, position: 3 }, { date: null, overtaking_driver_number: 1 }],
    [{ date: "2026-10-25T20:00:00Z", track_temperature: 38.26, air_temperature: 27.04, rainfall: 0 }],
  );
  assert.deepEqual(x.pitStops, [[4, 22, 2.457, 21.9], [1, 30, null, 24]]);
  assert.deepEqual(x.overtakes, [[Date.parse("2026-10-25T20:10:00Z"), 4, 1, 3]]);
  assert.deepEqual(x.weather, [[Date.parse("2026-10-25T20:00:00Z"), 38.3, 27, 0]]);
  assert.equal(x.extrasV, RACE_EXTRAS_VERSION);
  // rows from before lights out are cars heading to the grid, not stops
  const pre = compactRaceExtras([{ date: "2026-11-01T19:08:59Z", driver_number: 10, lap_number: 1 }, { date: "2026-11-01T20:40:00Z", driver_number: 10, lap_number: 26, stop_duration: 2.5 }], [], [], Date.parse("2026-11-01T20:00:00Z"));
  assert.deepEqual(pre.pitStops, [[10, 26, 2.5, null]]);
});

import { injectPrerender } from "../scripts/prerender.mjs";
test("injectPrerender swaps the shell for the render and keeps it for deep links", () => {
  const html = `<html><head><noscript>fonts</noscript></head><body>\n<div id="root"><!--shell--><div class="bench">Opening…</div><!--/shell--></div>\n<noscript>needs JS</noscript></body></html>`;
  const out = injectPrerender(html, `<div class="sheet">Lap chart $1 $& price</div>`, 123);
  assert.match(out, /<div id="root" data-prerendered="overview" data-render-at="123"><div class="sheet">Lap chart \$1 \$& price<\/div><\/div>/, "rendered HTML in place, $ patterns left alone");
  assert.match(out, /<\/div><template id="loading-shell"><div class="bench">Opening…<\/div><\/template><script>/, "shell kept in a template, guard right after it");
  assert.ok(out.indexOf('id="loading-shell"') < out.indexOf("location.hash"), "template exists before the guard runs");
  assert.ok(!out.includes("<!--shell-->"));
  assert.throws(() => injectPrerender("<div id=\"root\"></div>", "x", 1), /markers/);
});

test("processRaceControlPeriods reads OpenF1's real message forms (2026 Mexico, Zandvoort)", () => {
  const at = (lap, sec, message, extra = {}) => ({ date: `2026-11-01T20:${String(lap).padStart(2, "0")}:${String(sec).padStart(2, "0")}Z`, lap_number: lap, message, ...extra });
  // R19 Mexico City, as OpenF1 logged it: abbreviated VSC, a safety car cut short
  // by a red flag (message text only, no flag value), the restart, a second SC
  const mexico = [
    at(1, 0, "GREEN LIGHT - PIT EXIT OPEN", { category: "Flag", flag: "GREEN", scope: "Track" }),
    at(7, 0, "VSC DEPLOYED", { category: "SafetyCar" }),
    at(8, 0, "VSC ENDING", { category: "SafetyCar" }),
    at(44, 0, "YELLOW IN TRACK SECTOR 2", { category: "Flag", flag: "YELLOW", scope: "Sector" }),
    at(44, 10, "SAFETY CAR DEPLOYED", { category: "SafetyCar" }),
    at(45, 0, "SESSION ABORTED", { category: "SessionStatus" }),
    at(45, 1, "RED FLAG - RACE SUSPENDED", { category: "Other" }),
    at(46, 0, "RACE WILL RESUME AT 15:45", { category: "Other" }),
    at(59, 0, "SAFETY CAR DEPLOYED", { category: "SafetyCar" }),
    at(62, 0, "SAFETY CAR IN THIS LAP", { category: "SafetyCar" }),
    at(71, 0, "CHEQUERED FLAG", { category: "Flag", flag: "CHEQUERED", scope: "Track" }),
  ];
  assert.deepEqual(processRaceControlPeriods(mexico, 71).periods, [
    { type: "VSC", lapStart: 7, lapEnd: 8 },
    { type: "SC", lapStart: 44, lapEnd: 45 },
    { type: "RED", lapStart: 45, lapEnd: 46 },
    { type: "SC", lapStart: 59, lapEnd: 62 },
  ], "was one SC from lap 44 to 62, and no VSC");
  // R13 Zandvoort: SC and red flag on lap 3 — stored as an SC covering laps 3–53
  const zandvoort = [
    at(3, 0, "SAFETY CAR DEPLOYED"), at(3, 5, "SESSION ABORTED", { category: "SessionStatus" }),
    at(3, 6, "RED FLAG - RACE SUSPENDED"), at(4, 0, "SESSION STARTED", { category: "SessionStatus" }),
    at(28, 0, "VSC DEPLOYED"), at(29, 0, "VSC ENDING"),
    // R16-style: a VSC upgraded to a safety car without "VSC ENDING"
    at(40, 0, "VSC DEPLOYED"), at(42, 0, "SAFETY CAR DEPLOYED"), at(45, 0, "SAFETY CAR IN THIS LAP"),
    at(53, 0, "CHEQUERED FLAG", { flag: "CHEQUERED" }),
  ];
  assert.deepEqual(processRaceControlPeriods(zandvoort, 53).periods, [
    { type: "SC", lapStart: 3, lapEnd: 3 },
    { type: "RED", lapStart: 3, lapEnd: 4 },
    { type: "VSC", lapStart: 28, lapEnd: 29 },
    { type: "VSC", lapStart: 40, lapEnd: 42 },
    { type: "SC", lapStart: 42, lapEnd: 45 },
  ], "the chequered flag is not a red flag");
});

test("a red flag reported only in the message text still counts", () => {
  const ev = [
    { date: "2026-01-01T00:00:01Z", lap_number: 5, message: "RED FLAG - RACE SUSPENDED", category: "Other" },
    { date: "2026-01-01T00:00:02Z", lap_number: 6, message: "RACE WILL RESUME AT 15:00", category: "Other" },
    { date: "2026-01-01T00:00:03Z", lap_number: 50, message: "CHEQUERED FLAG", flag: "CHEQUERED" },
  ];
  assert.deepEqual(processRaceControlPeriods(ev, 50).periods, [{ type: "RED", lapStart: 5, lapEnd: 6 }]);
});

import { qualityChecks } from "../scripts/data-quality.mjs";
test("qualityChecks flags the season's silent failures and stays quiet on good data", () => {
  const row = (did, driver, pts, num) => ({ did, driver, team: "X", pts, num: String(num), out: null });
  const data = {
    season: 2026,
    drivers: [{ name: "Ann One", driverId: "one", pts: 25 }, { name: "Bob Two", driverId: "two", pts: 18 }],
    constructors: [{ team: "X", pts: 43 }],
    races: [{ round: 13, name: "Dutch Grand Prix", results: [row("one", "One", 25, 1), row("two", "Two", 18, 2)] }],
    sprints: [],
  };
  const car = n => ({ number: n, lapTimes: [], positions: Array.from({ length: 53 }, (_, i) => ({ l: i + 1, p: n })) });
  const good = { sessions: [{ sessionName: "Race", drivers: [car(1), car(2)], rcV: 2, extrasV: 1, raceControlPeriods: [{ type: "SC", lapStart: 3, lapEnd: 3 }] }] };
  const quotes = { rounds: [{ round: 13, sessions: { race: { quotes: [{ driver: "Ann One" }] } } }] };
  assert.deepEqual(qualityChecks({ data, quotes, meetingsByRound: { 13: good } }), []);
  // Zandvoort as it was stored before the fix: one SC from lap 3 to the flag, no version stamp
  const bad = { sessions: [{ ...good.sessions[0], rcV: undefined, raceControlPeriods: [{ type: "SC", lapStart: 3, lapEnd: 53 }] }] };
  const badQuotes = { rounds: [{ round: 13, sessions: { race: { quotes: [{ driver: "Yuki Nobody" }] } } }] };
  const found = qualityChecks({ data: { ...data, drivers: [{ ...data.drivers[0], pts: 26 }, data.drivers[1]] }, quotes: badQuotes, meetingsByRound: { 13: bad } });
  assert.deepEqual([...new Set(found.map(f => f.check))].sort(), ["points", "quotes", "race control", "versions"]);
});

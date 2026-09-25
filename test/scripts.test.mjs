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
import { matchRound, raceIsFinal, lapCompareDefaultPick, compactLapTelemetry } from "../scripts/fetch-openf1-data.mjs";
import { validate } from "../scripts/validate-data.mjs";

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

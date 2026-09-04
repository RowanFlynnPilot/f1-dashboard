// Unit tests for the pure helpers in the data-fetch scripts. No network.
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { parsePitSeconds, raceEnded, weekendActive, getCountryCode } from "../scripts/fetch-f1-data.mjs";
import { processRaceControlPeriods, buildSpeedTrace, computeSessionBests, processLapData } from "../scripts/fetch-openf1-data.mjs";

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

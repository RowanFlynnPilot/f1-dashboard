// Tests for the dashboard's pure data logic (src/data.js). No network, no DOM.
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { transformData, countdownLabel, withStatus, meetingForRace } from "../src/data.js";

// A classification row in data.json's shape
const row = (pos, driver, team, pts, extra = {}) => ({
  pos: String(pos), out: null, num: String(pos), did: driver.toLowerCase(), driver, team,
  grid: pos, laps: 50, pts, gap: pos === 1 ? "WINNER" : `+${pos}.000`, status: "Finished",
  fastestLapTime: null, fastestLapRank: null, ...extra,
});
const q = (round, rows) => ({ round, raceName: `R${round} GP`, results: rows.map(([pos, driver, team]) => ({ pos, driver, driverId: driver.toLowerCase(), team })) });

// Two rounds: Lawson starts at Racing Bulls, then replaces Hadjar at Red Bull
// (Tsunoda takes his old seat) — the 2026 swap in miniature.
function fixture({ standingsRound = 2, sprints = [] } = {}) {
  return {
    season: 2026, fetchedAt: "2026-09-21T00:00:00Z", completedRounds: 2, totalRounds: 3, standingsRound,
    drivers: [
      { pos: 1, name: "Max Verstappen", team: "Red Bull", teams: ["Red Bull"], pts: 40, wins: 1, driverId: "verstappen" },
      { pos: 2, name: "Liam Lawson", team: "Red Bull", teams: ["Racing Bulls", "Red Bull"], pts: 43, wins: 1, driverId: "lawson" },
      { pos: 3, name: "Isack Hadjar", team: "Red Bull", teams: ["Red Bull"], pts: 18, wins: 0, driverId: "hadjar" },
      { pos: 4, name: "Arvid Lindblad", team: "Racing Bulls", teams: ["Racing Bulls"], pts: 27, wins: 0, driverId: "lindblad" },
      { pos: 5, name: "Yuki Tsunoda", team: "Racing Bulls", teams: ["Racing Bulls"], pts: 0, wins: 0, driverId: "tsunoda" },
    ],
    constructors: [
      { pos: 1, team: "Red Bull", pts: 76, wins: 1, drivers: [{ name: "Verstappen", pts: 40 }, { name: "Hadjar", pts: 18 }, { name: "Lawson", pts: 18 }], lineup: ["Verstappen", "Lawson"] },
      { pos: 2, team: "Racing Bulls", pts: 52, wins: 1, drivers: [{ name: "Lawson", pts: 25 }, { name: "Lindblad", pts: 27 }, { name: "Tsunoda", pts: 0 }], lineup: ["Lindblad", "Tsunoda"] },
    ],
    races: [
      { round: 1, name: "Opening Grand Prix", circuit: "C1", date: "2026-03-08", time: "04:00:00Z", results: [
        row(1, "Lawson", "Racing Bulls", 25), row(2, "Hadjar", "Red Bull", 18), row(3, "Verstappen", "Red Bull", 15), row(4, "Lindblad", "Racing Bulls", 12)] },
      { round: 2, name: "Second Grand Prix", circuit: "C2", date: "2026-03-15", time: "07:00:00Z", results: [
        row(1, "Verstappen", "Red Bull", 25), row(2, "Lawson", "Red Bull", 18), row(3, "Lindblad", "Racing Bulls", 15),
        row(4, "Tsunoda", "Racing Bulls", 0, { out: "DNF", status: "Retired", gap: "Retired" })] },
    ],
    sprints,
    qualifying: [
      q(1, [[1, "Lawson", "Racing Bulls"], [2, "Verstappen", "Red Bull"], [3, "Hadjar", "Red Bull"], [4, "Lindblad", "Racing Bulls"]]),
      q(2, [[1, "Lawson", "Red Bull"], [2, "Verstappen", "Red Bull"], [3, "Tsunoda", "Racing Bulls"], [4, "Lindblad", "Racing Bulls"]]),
    ],
    schedule: [
      { round: 1, name: "Opening Grand Prix", circuit: "C1", date: "2026-03-08", time: "04:00:00Z", country: "AU", sprint: false, winner: "Lawson" },
      { round: 2, name: "Second Grand Prix", circuit: "C2", date: "2026-03-15", time: "07:00:00Z", country: "CN", sprint: false, winner: "Verstappen" },
      { round: 3, name: "Third Grand Prix", circuit: "C3", date: "2026-03-29", time: "05:00:00Z", country: "JP", sprint: true, winner: null },
    ],
    pitStops: { raceName: "", stops: [] }, pitStopsByRace: [],
  };
}

test("head to head pairs teammates per round — a seat change starts a new battle", () => {
  const { h2h } = transformData(fixture());
  const pairs = h2h.map(b => `${b.team}: ${b.d1.n.split(" ").pop()} v ${b.d2.n.split(" ").pop()} ${b.rounds.join(",")}`);
  assert.deepEqual(pairs, [
    "Red Bull: Verstappen v Lawson 2",       // current pairing first
    "Red Bull: Verstappen v Hadjar 1",
    "Racing Bulls: Lindblad v Tsunoda 2",
    "Racing Bulls: Lawson v Lindblad 1",
  ]);
  const vl = h2h[0];
  assert.deepEqual(vl.qual, { d1: 0, d2: 1, details: [{ race: "R2 GP", d1: 2, d2: 1 }] }, "only the shared round counts");
  assert.deepEqual(vl.pts, { d1: 25, d2: 18 }, "points scored as team-mates, not season totals");
});

test("retirements are labelled and left out of average finish", () => {
  const { races, h2h } = transformData(fixture());
  const r2 = races.find(r => r.r === 2);
  assert.equal(r2.full.find(x => x.d === "Tsunoda").p, "DNF");
  const lt = h2h.find(b => b.team === "Racing Bulls" && b.rounds.includes(2));
  assert.equal(lt.avgPos.d2, null, "a DNF is not a 4th-place finish");
  assert.deepEqual(lt.race.details, [{ race: "Second", d1: 3, d2: "DNF" }]);
});

test("the points delta follows the round the standings cover", () => {
  const { DS } = transformData(fixture());
  assert.equal(DS.find(d => d.n === "Max Verstappen").d, "+25");
  assert.equal(DS.find(d => d.n === "Liam Lawson").d, "+18");
  // Sprint Saturday: the standings already include round 3's sprint, whose race hasn't run
  const sprint = { round: 3, name: "Third Grand Prix Sprint", circuit: "C3", date: "2026-03-28", time: "03:00:00Z", sprint: true,
    results: [row(1, "Lindblad", "Racing Bulls", 8), row(2, "Verstappen", "Red Bull", 7)] };
  const sat = transformData(fixture({ standingsRound: 3, sprints: [sprint] }));
  assert.equal(sat.DS.find(d => d.n === "Max Verstappen").d, "+7", "sprint points only — not round 2's race");
  assert.equal(sat.DS.find(d => d.n === "Liam Lawson").d, "—");
});

test("the narrative describes the current pairing and a mid-season arrival", () => {
  const { narrative } = transformData(fixture());
  const rb = narrative.find(n => n.t === "Red Bull").desc;
  assert.match(rb, /Verstappen leads the garage on 40 pts, with Lawson on 18 since arriving from Racing Bulls at round 2\./);
});

test("transformData renders before round 1: only the calendar is required", () => {
  const pre = { season: 2027, fetchedAt: "2027-01-10T00:00:00Z", completedRounds: 0, totalRounds: 1,
    schedule: [{ round: 1, name: "Opening Grand Prix", circuit: "C1", date: "2027-03-07", time: "04:00:00Z", sprint: false }] };
  const t = transformData(pre);
  assert.ok(t, "no standings yet is not an error");
  assert.deepEqual([t.DS.length, t.CS.length, t.races.length, t.h2h.length], [0, 0, 0, 0]);
  assert.equal(transformData({ drivers: [] }), null, "no calendar at all is");
});

test("countdownLabel counts calendar days in the viewer's time zone", () => {
  // 11:00 UTC falls on 26 Sep in every zone from UTC-10 to UTC+12, so these hold in CI and locally
  const dt = "2026-09-26", tt = "11:00:00Z";
  assert.equal(countdownLabel(dt, tt, new Date(2026, 8, 26, 0, 30)), "today", "race morning — rounding up 24h blocks said tomorrow");
  assert.equal(countdownLabel(dt, tt, new Date(2026, 8, 25, 23, 0)), "tomorrow");
  assert.equal(countdownLabel(dt, tt, new Date(2026, 8, 24, 12, 0)), "in 2 days");
  assert.equal(countdownLabel(dt, tt, new Date("2026-09-26T11:30:00Z")), "under way");
});

test("withStatus: done three hours after lights out, the first unfinished round is next", () => {
  const sched = [{ r: 1, dt: "2026-09-13", tt: "13:00:00Z" }, { r: 2, dt: "2026-09-26", tt: "11:00:00Z" }, { r: 3, dt: "2026-10-04", tt: "07:00:00Z" }];
  const st = now => withStatus(sched, Date.parse(now)).map(x => x.st).join(",");
  assert.equal(st("2026-09-24T12:00:00Z"), "done,next,upcoming");
  assert.equal(st("2026-09-26T13:00:00Z"), "done,next,upcoming", "two hours in — still running");
  assert.equal(st("2026-09-26T14:30:00Z"), "done,done,next");
});

test("meetingForRace prefers the stamped round and falls back to the race date", () => {
  const stamped = [{ meetingKey: 1, round: 16, meetingName: "Bahrain Grand Prix", sessions: [] }];
  assert.equal(meetingForRace(stamped, { r: 16, dt: "2026-10-04" })?.meetingKey, 1);
  const unstamped = [{ meetingKey: 2, meetingName: "São Paulo Grand Prix", sessions: [{ sessionName: "Race", dateStart: "2026-11-08T17:00:00+00:00" }] }];
  assert.equal(meetingForRace(unstamped, { r: 20, dt: "2026-11-08" })?.meetingKey, 2, "names differ; the date joins them");
  assert.equal(meetingForRace(unstamped, { r: 21, dt: "2026-11-22" }), null);
});

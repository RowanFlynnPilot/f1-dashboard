// Tests for the dashboard's pure data logic (src/data.js). No network, no DOM.
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { transformData, countdownLabel, withStatus, meetingForRace, greenFlagLaps, racePace, onTrackPasses, lapOneGains, miniSectors, titleOutlook, remainingEvents, buildSeasonStats, titleClinch, ageOn, championAge, seasonReview } from "../src/data.js";

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
  // Race Saturday without a sprint: Jolpica already lists round 3's standings,
  // identical to round 2's — the delta must still show round 2's points
  const early = transformData(fixture({ standingsRound: 3 }));
  assert.equal(early.DS.find(d => d.n === "Max Verstappen").d, "+25", "an empty standings round falls back to the last round with results");
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

// ── Analytics ───────────────────────────────────────────────────────────────
// A synthetic race session: `laps` laps at `base` seconds (+ `slope` per lap),
// lap starts every lap time from t0, pit-out laps flagged.
const T0 = 1_800_000_000_000;
function car(number, { base = 90, slope = 0, laps = 20, pitOut = [], slow = {}, pos = () => number } = {}) {
  const lapTimes = [];
  let ds = T0;
  for (let l = 1; l <= laps; l++) {
    const t = slow[l] ?? base + slope * l;
    lapTimes.push({ l, t, pit: pitOut.includes(l), ds });
    ds += t * 1000;
  }
  return { number, acronym: `D${number}`, team: "Team", teamColour: "#123456", lapTimes,
    positions: lapTimes.map(x => ({ l: x.l, p: pos(x.l) })) };
}

test("greenFlagLaps drops lap 1, in- and out-laps, neutralised laps and outliers", () => {
  const d = car(1, { pitOut: [10], slow: { 1: 100, 15: 120 } });
  const session = { drivers: [d], raceControlPeriods: [{ type: "SC", lapStart: 5, lapEnd: 6 }] };
  const kept = greenFlagLaps(d, session).map(l => l.l);
  for (const gone of [1, 9, 10, 5, 6, 7, 15]) assert.ok(!kept.includes(gone), `lap ${gone} should be dropped`);
  assert.deepEqual(kept, [2, 3, 4, 8, 11, 12, 13, 14, 16, 17, 18, 19, 20]);
});

test("racePace summarises each car's green-flag laps in finishing order", () => {
  const a = car(1, { base: 90, pos: () => 2 }), b = car(2, { base: 89, pos: () => 1 });
  const pace = racePace({ drivers: [a, b], stints: [{ driverNumber: 2, compound: "HARD", lapStart: 1, lapEnd: 20 }] });
  assert.deepEqual(pace.map(p => p.number), [2, 1]);
  assert.equal(pace[0].med, 89);
  assert.equal(pace[0].laps[0].c, "HARD");
  assert.equal(pace[1].laps[0].c, "UNKNOWN");
});

test("onTrackPasses keeps racing passes and drops pit cycles, lapping and lap 1", () => {
  const a = car(1, { laps: 20 }), b = car(2, { laps: 20, pitOut: [12] }), c = car(3, { laps: 20 });
  const at = (d, lap) => d.lapTimes[lap - 1].ds + 10_000; // 10 s into that lap
  const session = {
    drivers: [a, b, c],
    overtakes: [
      [at(a, 1), 1, 2, 1],   // lap 1 — its own metric
      [at(a, 5), 1, 2, 1],   // racing pass
      [at(a, 11), 3, 2, 2],  // b's in-lap — pit cycle
      [at(a, 12), 1, 2, 1],  // b's out-lap — pit cycle
      [at(c, 8), 3, 1, 1],   // racing pass
    ],
  };
  const { byDriver, kept, raw } = onTrackPasses(session);
  assert.equal(raw, 5);
  assert.equal(kept, 2);
  assert.deepEqual(byDriver[1], { made: 1, lost: 1 });
  assert.deepEqual(byDriver[3], { made: 1, lost: 0 });
  // A car a lap down: the swap is lapping, not a pass
  const slow = car(4, { base: 180, laps: 10 });
  const lapped = onTrackPasses({ drivers: [a, slow], overtakes: [[at(a, 6), 1, 4, 1]] });
  assert.equal(lapped.kept, 0);
});

test("lapOneGains: grid minus position after lap 1, pit-lane starts from the back", () => {
  const s = { drivers: [car(1, { pos: () => 3 }), car(2, { pos: () => 1 })] };
  const results = [{ num: "1", grid: 1 }, { num: "2", grid: 0 }, { num: "3", grid: 2 }];
  assert.deepEqual(lapOneGains(s, results), { 1: -2, 2: 2 });
});

test("miniSectors gives each segment to the quicker trace", () => {
  const trace = fast => Array.from({ length: 21 }, (_, i) => ({ d: i * 250, s: i < 10 ? (fast ? 300 : 280) : (fast ? 200 : 220) }));
  const mk = (number, fast) => ({ number, acronym: `D${number}`, fastLapTrace: { lap: 10, lapTime: 80, trace: trace(fast) } });
  const ms = miniSectors({ drivers: [mk(1, true), mk(2, false)] }, 4);
  assert.deepEqual(ms.winners, [1, 1, 2, 2]);
  assert.deepEqual(ms.count, { 1: 2, 2: 2 });
  assert.equal(miniSectors({ drivers: [mk(1, true)] }), null, "needs two traces");
});

test("titleOutlook: points left, who's alive, clinch maths and a seeded projection", () => {
  const sched = [
    { r: 1, nm: "A", st: "done", sp: false },
    { r: 2, nm: "B", st: "next", sp: true },
    { r: 3, nm: "C", st: "upcoming", sp: false },
  ];
  assert.deepEqual(remainingEvents(sched, []).map(e => `${e.round}${e.kind[0]}`), ["2s", "2r", "3r"]);
  assert.deepEqual(remainingEvents(sched, [{ r: "2S" }]).map(e => `${e.round}${e.kind[0]}`), ["2r", "3r"], "a sprint already run is gone");
  const DS = [
    { n: "Ann One", did: "one", t: "X", pts: 100 },
    { n: "Bob Two", did: "two", t: "X", pts: 70 },
    { n: "Cat Three", did: "three", t: "Y", pts: 30 },
  ];
  const races = [{ r: 1, full: [{ did: "one", p: 1 }, { did: "two", p: 2 }, { did: "three", p: "DNF" }] }];
  const o = titleOutlook({ DS, sched, races, sprints: [], sims: 500 });
  assert.equal(o.maxLeft, 58);
  assert.deepEqual(o.drivers.map(d => d.alive), [true, true, false]);
  assert.equal(o.clinched, false);
  // After round 2 only 25 remain: Ann needs a lead of 26+, she has 30, so she can drop 4 to Bob
  assert.equal(o.needed.margin, -4);
  const sum = o.drivers.reduce((s, d) => s + d.prob, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(o.drivers[0].prob > o.drivers[1].prob);
  assert.deepEqual(titleOutlook({ DS, sched, races, sprints: [], sims: 500 }).drivers.map(d => d.prob), o.drivers.map(d => d.prob), "seeded");
});

test("buildSeasonStats ranks metrics into percentiles where 100 is best", () => {
  const raw = {
    season: 2026,
    drivers: [
      { name: "Ann One", driverId: "one", team: "X", pts: 50 },
      { name: "Bob Two", driverId: "two", team: "X", pts: 20 },
      { name: "Cat Three", driverId: "three", team: "Y", pts: 0 },
    ],
    qualifying: [{ round: 1, results: [
      { pos: 1, driverId: "one", team: "X", q1: "1:30.000" },
      { pos: 2, driverId: "two", team: "X", q1: "1:30.900" },
      { pos: 3, driverId: "three", team: "Y", q1: "1:31.800" },
    ] }],
    races: [{ round: 1, results: [
      { num: "1", did: "one", out: null, grid: 1 },
      { num: "2", did: "two", out: null, grid: 2 },
      { num: "3", did: "three", out: "DNF", grid: 3 },
    ] }],
  };
  const st = buildSeasonStats(raw, {}, { minStarts: 1 });
  const by = Object.fromEntries(st.drivers.map(d => [d.did, d.metrics]));
  assert.equal(by.two.qualiGap.value.toFixed(2), "1.00");
  assert.deepEqual([by.one.qualiGap.pct, by.two.qualiGap.pct, by.three.qualiGap.pct], [100, 50, 0]);
  assert.deepEqual([by.one.teammateQuali.value, by.two.teammateQuali.value], [100, 0]);
  assert.equal(by.three.finishRate.value, 0);
  assert.equal(by.one.racePace.value, null, "no meeting file, no race pace");
});

test("titleClinch finds the round where the lead first beat the points left", () => {
  const sched = [1, 2, 3, 4].map(r => ({ r, nm: `R${r} GP`, sp: r === 2 }));
  const gp = (r, rows, sprint = false) => ({ r: sprint ? `${r}S` : r, sprint, full: rows.map(([did, pts]) => ({ did, pts })) });
  const races = [
    gp(1, [["one", 25], ["two", 0]]),
    gp(2, [["one", 8], ["two", 0]], true),
    gp(2, [["one", 25], ["two", 18]]),
    gp(3, [["one", 25], ["two", 0]]),
  ];
  const DS = [{ n: "Ann One", did: "one" }, { n: "Bob Two", did: "two" }];
  // after R2: lead 40, 50 left (R3 + R4) → not yet; after R3: lead 65, 25 left → clinched at R3
  assert.deepEqual(titleClinch({ DS, sched, races }), { round: 3, name: "R3 GP", lead: 65, left: 25 });
  assert.equal(titleClinch({ DS, sched, races: races.slice(0, 3) }), null);
});

test("countdownLabel can count UTC days, for the pre-rendered page", () => {
  // 23:30 UTC on the 31st, race on the 1st at 20:00 UTC: tomorrow in UTC
  assert.equal(countdownLabel("2026-11-01", "20:00:00Z", new Date("2026-10-31T23:30:00Z"), true), "tomorrow");
  assert.equal(countdownLabel("2026-11-01", "20:00:00Z", new Date("2026-11-01T00:30:00Z"), true), "today");
});

test("titleOutlook: the fight for second (champion excluded but racing) and the constructors", () => {
  const sched = [{ r: 1, nm: "A", st: "done", sp: false }, { r: 2, nm: "B", st: "next", sp: false }];
  const DS = [
    { n: "Ann One", did: "one", t: "X", pts: 200 },
    { n: "Bob Two", did: "two", t: "Y", pts: 60 },
    { n: "Cat Three", did: "three", t: "X", pts: 50 },
    { n: "Dan Four", did: "four", t: "Y", pts: 10 },
  ];
  const CS = [{ t: "X", pts: 250 }, { t: "Y", pts: 70 }];
  const races = [{ r: 1, full: [{ did: "one", p: 1 }, { did: "two", p: 2 }, { did: "three", p: 3 }, { did: "four", p: 4 }] }];
  const o = titleOutlook({ DS, sched, races, sprints: [], sims: 300, exclude: ["Ann One"], CS });
  assert.deepEqual(o.drivers.map(d => d.n), ["Bob Two", "Cat Three", "Dan Four"], "the champion is out of the contest");
  assert.deepEqual(o.drivers.map(d => d.alive), [true, true, false]);
  assert.ok(Math.abs(o.drivers.reduce((s, d) => s + d.prob, 0) - 1) < 1e-9);
  // constructors: 43 left (25 + 18), X leads by 180
  assert.equal(o.constructors.maxLeft, 43);
  assert.equal(o.constructors.clinched, true);
  assert.deepEqual(o.constructors.teams.map(t => t.prob), [1, 0]);
});

test("ageOn and championAge: Antonelli at the 2026 Mexico City GP, against Vettel's record", () => {
  assert.deepEqual(ageOn("2006-08-25", "2026-11-01"), { years: 20, days: 68 });
  assert.deepEqual(ageOn("1987-07-03", "2010-11-14"), { years: 23, days: 134 }, "Vettel's 2010 record, as the constant says");
  assert.deepEqual(ageOn("2000-03-01", "2020-02-29"), { years: 19, days: 365 }, "a day short of a birthday, across a leap day");
  const races = [{ r: 19, sprint: false, dt: "2026-11-01" }];
  const a = championAge({ dob: "2006-08-25" }, { round: 19 }, races);
  assert.equal(a.label, "20 years 68 days");
  assert.equal(a.youngest, true);
  assert.equal(championAge({ dob: "1980-01-01" }, { round: 19 }, races).youngest, false);
  assert.equal(championAge({ dob: null }, { round: 19 }, races), null, "no birth date, no claim");
});

test("seasonReview: titles, leaders with ties, the closest team-mate battle", () => {
  const DS = [
    { n: "Ann One", did: "one", t: "X", pts: 300, wins: 6 },
    { n: "Bob Two", did: "two", t: "Y", pts: 250, wins: 6 },
    { n: "Cat Three", did: "three", t: "X", pts: 100, wins: 0 },
  ];
  const CS = [{ t: "X", pts: 400 }, { t: "Y", pts: 250 }];
  const races = [
    { r: 1, sprint: false, full: [{ did: "one", d: "One", p: 1 }, { did: "two", d: "Two", p: 2 }, { did: "three", d: "Three", p: "DNF" }] },
    { r: 2, sprint: false, full: [{ did: "two", d: "Two", p: 1 }, { did: "three", d: "Three", p: 2 }, { did: "one", d: "One", p: "DNS" }] },
    { r: "2S", sprint: true, full: [{ did: "three", d: "Three", p: 1 }] },
  ];
  const qualifying = [{ results: [{ pos: 1, did: "two" }] }, { results: [{ pos: 1, did: "two" }] }];
  const h2h = [
    { team: "X", d1: DS[0], d2: DS[2], rounds: [1, 2, 3, 4, 5], qual: { d1: 4, d2: 1 } },
    { team: "Z", d1: { n: "P", pts: 10 }, d2: { n: "Q", pts: 9 }, rounds: [1, 2], qual: { d1: 1, d2: 1 } },
  ];
  const r = seasonReview({ DS, CS, races, qualifying, h2h });
  assert.equal(r.margin, 50);
  assert.equal(r.constructorsMargin, 150);
  const L = Object.fromEntries(r.leaders.map(l => [l.label, l]));
  assert.deepEqual(L.Wins.names, ["Ann One", "Bob Two"], "a tie lists both");
  assert.deepEqual([L.Poles.names, L.Poles.value], [["Bob Two"], 2]);
  assert.deepEqual([L.Podiums.names, L.Podiums.value], [["Bob Two"], 2]);
  assert.deepEqual(L.Retirements.names, ["Cat Three"], "a DNS isn't a retirement; sprints don't count");
  assert.deepEqual(r.closestTeammates, { team: "X", a: "Ann One", b: "Cat Three", score: "4–1" }, "pairings under five weekends are left out");
});

test("onTrackPasses counts safety-car restart laps but not the standing restart after a red flag", () => {
  const a = car(1, { laps: 30 }), b = car(2, { laps: 30 });
  const at = lap => a.lapTimes[lap - 1].ds + 10_000;
  const swaps = laps => laps.map(l => [at(l), 1, 2, 1]);
  const sc = onTrackPasses({ drivers: [a, b], raceControlPeriods: [{ type: "SC", lapStart: 10, lapEnd: 12 }], overtakes: swaps([11, 13]) });
  assert.equal(sc.kept, 1, "lap 11 is behind the SC; lap 13, the restart, is a real pass");
  const red = onTrackPasses({ drivers: [a, b], raceControlPeriods: [{ type: "RED", lapStart: 20, lapEnd: 21 }], overtakes: swaps([21, 22, 23]) });
  assert.equal(red.kept, 1, "21 under red, 22 the standing restart; 23 counts");
});

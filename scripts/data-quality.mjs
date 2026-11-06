/**
 * data-quality.mjs
 * Assertions over the data a run is about to ship — the checks that would
 * have caught 2026's silent failures: every VSC and red flag missing for a
 * season (a never-closed safety car made Zandvoort one 50-lap "neutral" race),
 * and a race's quotes left unmatched. Unlike validate-data.mjs these never
 * block a deploy: each finding is a warning in the job summary (run-summary.mjs).
 *
 * qualityChecks() is pure: data.json, driver-quotes.json and the meeting files
 * keyed by round in, findings out.
 */
import { neutralLaps, onTrackPasses } from "../src/data.js";
import { RACE_CONTROL_VERSION, RACE_EXTRAS_VERSION } from "./fetch-openf1-data.mjs";

const NEUTRAL_SHARE_MAX = 0.4; // a race neutralised for more than this is likely a parsing slip
const PASSES_KEPT_MIN = 0.05; // under 5% of OpenF1's swaps surviving as passes is suspect

export function qualityChecks({ data, quotes, meetingsByRound = {} }) {
  const out = [];
  const warn = (check, detail) => out.push({ check, detail });
  if (!data) return [{ check: "data", detail: "data.json unreadable" }];
  const all = [...(data.races || []), ...(data.sprints || [])];

  // 1. Standings totals = summed result points (drivers and constructors)
  const byDriver = {}, byTeam = {};
  for (const r of all) for (const x of r.results || []) {
    byDriver[x.did] = (byDriver[x.did] || 0) + (x.pts || 0);
    byTeam[x.team] = (byTeam[x.team] || 0) + (x.pts || 0);
  }
  for (const d of data.drivers || []) if ((byDriver[d.driverId] || 0) !== d.pts)
    warn("points", `${d.name}: standings ${d.pts}, results add up to ${byDriver[d.driverId] || 0}`);
  for (const c of data.constructors || []) if ((byTeam[c.team] || 0) !== c.pts)
    warn("points", `${c.team}: standings ${c.pts}, results add up to ${byTeam[c.team] || 0}`);

  // 2–6. Each Grand Prix's OpenF1 race session
  for (const race of data.races || []) {
    const tag = `R${race.round} ${race.name.replace(" Grand Prix", "")}`;
    const meeting = meetingsByRound[race.round];
    const session = meeting?.sessions?.find(s => s.sessionName === "Race" && s.drivers);
    if (!session) { warn("openf1", `${tag}: no OpenF1 race session with lap data`); continue; }
    const laps = Math.max(0, ...session.drivers.map(d => d.positions?.at(-1)?.l || 0));
    if (Math.abs(session.drivers.length - race.results.length) > 2)
      warn("openf1", `${tag}: OpenF1 has ${session.drivers.length} cars, the classification ${race.results.length}`);
    for (const s of meeting.sessions.filter(s => (s.sessionName === "Race" || s.sessionName === "Sprint") && s.drivers))
      if (s.rcV !== RACE_CONTROL_VERSION) warn("versions", `${tag} ${s.sessionName}: race control at v${s.rcV ?? "–"}, current v${RACE_CONTROL_VERSION}`);
    if (session.extrasV !== RACE_EXTRAS_VERSION) warn("versions", `${tag}: race extras at v${session.extrasV ?? "–"}, current v${RACE_EXTRAS_VERSION}`);
    const neutral = [...neutralLaps(session)].filter(l => l >= 1 && l <= laps).length;
    if (laps && neutral / laps > NEUTRAL_SHARE_MAX)
      warn("race control", `${tag}: ${neutral} of ${laps} laps neutralised (${(session.raceControlPeriods || []).map(p => `${p.type} ${p.lapStart}-${p.lapEnd}`).join(", ")})`);
    if ((session.overtakes || []).length > 50) {
      const out = new Set(race.results.filter(x => x.out).map(x => String(x.num)));
      const { kept, raw } = onTrackPasses(session, out);
      if (kept / raw < PASSES_KEPT_MIN) warn("passes", `${tag}: only ${kept} of ${raw} position swaps count as passes`);
    }
    if ((session.pitStops || []).length && !session.pitStops.some(p => p[2] > 0))
      warn("pit stops", `${tag}: OpenF1 has no stationary times (the Stopped column is hidden)`);
  }

  // 7. Every quote attributed to a driver on the season's roster
  const roster = new Set((data.drivers || []).map(d => d.name));
  for (const r of quotes?.rounds || []) for (const [session, s] of Object.entries(r.sessions || {}))
    for (const q of s.quotes || []) if (!roster.has(q.driver))
      warn("quotes", `R${r.round} ${session}: "${q.driver}" isn't on the ${data.season} roster`);

  return out;
}

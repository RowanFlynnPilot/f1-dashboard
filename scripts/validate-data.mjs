/**
 * validate-data.mjs
 * Runs in CI between the data fetches and the build. Fails the deploy when the
 * freshly-fetched data is malformed or implausibly smaller than what is already
 * committed — converting the silent-data-loss failure mode into a hard failure
 * (a failed build keeps the previous good deploy live).
 *
 * Baseline = the committed copy at HEAD (the data the last run shipped).
 *
 * Two kinds of check:
 *   - structure: always enforced (unreadable files, truncated classifications,
 *     a season under way with no standings)
 *   - shrink: data that got smaller than the baseline. Skipped when the season
 *     changed (a new season legitimately starts empty) and downgraded to
 *     warnings with ALLOW_SHRINK=1 (the workflow's allow_shrink input) for a
 *     legitimate loss such as a round taken off the calendar.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// A classification shorter than this is a truncated API response, not a race
const MIN_CLASSIFIED = 15;

export function validate(cur, base, { allowShrink = false } = {}) {
  const report = { failures: [], warnings: [], oks: [] };
  const fail = m => report.failures.push(m);
  const warn = m => report.warnings.push(m);
  const ok = m => report.oks.push(m);
  const shrink = m => (allowShrink ? warn(`${m} (allowed by ALLOW_SHRINK)`) : fail(m));

  const { data, index, meetings = {}, quotes } = cur;

  // ── data.json ──────────────────────────────────────────────────────────────
  if (!data) {
    fail("public/data.json unreadable");
  } else {
    if (!Number.isInteger(data.season)) fail(`bad season: ${data.season}`);
    if (!Number.isFinite(new Date(data.fetchedAt).getTime())) fail(`bad fetchedAt: ${data.fetchedAt}`);
    const sched = data.schedule || [];
    if (sched.length >= MIN_CLASSIFIED) ok(`${sched.length} scheduled rounds`);
    else fail(`only ${sched.length} scheduled rounds (expected ≥ ${MIN_CLASSIFIED})`);

    // Standings exist once the season is under way; before round 1 they may be empty
    const underWay = (data.races || []).length > 0 || (data.completedRounds || 0) > 0;
    const nDrivers = (data.drivers || []).length, nTeams = (data.constructors || []).length;
    if (underWay) {
      if (nDrivers >= 20) ok(`${nDrivers} drivers`); else fail(`only ${nDrivers} drivers in the standings (expected ≥ 20)`);
      if (nTeams >= 10) ok(`${nTeams} constructors`); else fail(`only ${nTeams} constructors (expected ≥ 10)`);
    } else {
      warn(`season ${data.season} hasn't started — standings (${nDrivers} drivers) not checked`);
    }

    for (const [kind, list] of [["race", data.races], ["sprint", data.sprints], ["qualifying", data.qualifying]]) {
      for (const s of list || []) {
        const n = (s.results || []).length;
        if (n < MIN_CLASSIFIED) fail(`${kind} round ${s.round}: only ${n} classified (truncated response?)`);
        else if ((s.results || []).some(r => !r.driver || !r.team)) fail(`${kind} round ${s.round}: result rows missing driver/team`);
      }
    }
    ok(`${(data.races || []).length} races, ${(data.sprints || []).length} sprints, ${(data.qualifying || []).length} qualifying sessions`);
    for (const pr of data.pitStopsByRace || []) {
      if (!Array.isArray(pr.stops)) fail(`pit stops round ${pr.round}: no stops array`);
    }
    // Team breakdowns come from the results — a mismatch means a transform bug or a points penalty
    for (const c of data.constructors || []) {
      const sum = (c.drivers || []).reduce((a, d) => a + (d.pts || 0), 0);
      if (sum !== c.pts) warn(`${c.team}: drivers' points sum to ${sum}, team has ${c.pts}`);
    }

    const b = base.data;
    if (!b) {
      warn("no git baseline for data.json — shrink checks skipped");
    } else if (b.season !== data.season) {
      ok(`season changed ${b.season} → ${data.season} — shrink checks skipped`);
    } else {
      for (const key of ["races", "sprints", "qualifying"]) {
        const n = (data[key] || []).length, was = (b[key] || []).length;
        if (n < was) shrink(`${key} shrank: ${n} < baseline ${was}`);
      }
      // A round whose classification lost rows since the last deploy
      for (const r of data.races || []) {
        const prev = (b.races || []).find(x => x.round === r.round);
        if (prev && (r.results || []).length < (prev.results || []).length) shrink(`race round ${r.round}: ${r.results.length} results < baseline ${prev.results.length}`);
      }
    }
  }

  // ── OpenF1 split payload ───────────────────────────────────────────────────
  if (!index) {
    fail("public/openf1/index.json unreadable");
  } else {
    const list = index.meetings || [];
    const bList = base.index?.meetings;
    if (bList && base.index.season === index.season && list.length < bList.length) shrink(`OpenF1 meetings shrank: ${list.length} < baseline ${bList.length}`);
    else ok(`${list.length} OpenF1 meetings${bList ? ` (baseline ${bList.length})` : ""}`);
    const nHead = Object.keys(index.driverHeadshots || {}).length;
    if (list.length > 0 && nHead < 20) fail(`only ${nHead} driver headshots (expected ≥ 20)`);
    for (const m of list) {
      const full = meetings[m.meetingKey];
      if (!full) { fail(`meetings/${m.meetingKey}.json unreadable`); continue; }
      const withDrivers = (full.sessions || []).filter(s => (s.drivers || []).length > 0).length;
      if (withDrivers === 0) fail(`${m.meetingName}: no session has drivers`);
      const prev = bList?.find(x => x.meetingKey === m.meetingKey);
      if (prev && (m.sessions || []).length < (prev.sessions || []).length) shrink(`${m.meetingName}: ${m.sessions.length} sessions < baseline ${prev.sessions.length}`);
    }
  }

  // ── driver-quotes.json (optional file) ─────────────────────────────────────
  if (quotes === undefined) {
    ok("no driver-quotes.json");
  } else if (!quotes) {
    fail("public/driver-quotes.json unreadable");
  } else {
    const rounds = quotes.rounds || [];
    const total = rounds.reduce((a, r) => a + Object.values(r.sessions || {}).reduce((x, s) => x + (s.quotes || []).length, 0), 0);
    ok(`driver quotes: ${rounds.length} rounds, ${total} quotes`);
    const bq = base.quotes;
    if (bq && bq.season === quotes.season) {
      const bRounds = (bq.rounds || []).length;
      if (rounds.length < bRounds) shrink(`quote rounds shrank: ${rounds.length} < baseline ${bRounds}`);
    }
  }
  return report;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}
function readBaseline(p) {
  try {
    return JSON.parse(execSync(`git show HEAD:${p}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }));
  } catch {
    return null; // not in git yet, or no git — skip baseline comparisons
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log("\n🔎 Validating fetched data before build...\n");
  const index = readJSON("public/openf1/index.json");
  const meetings = {};
  for (const m of index?.meetings || []) meetings[m.meetingKey] = readJSON(`public/openf1/meetings/${m.meetingKey}.json`);
  const cur = {
    data: readJSON("public/data.json"),
    index,
    meetings,
    quotes: fs.existsSync("public/driver-quotes.json") ? readJSON("public/driver-quotes.json") : undefined,
  };
  const base = {
    data: readBaseline("public/data.json"),
    index: readBaseline("public/openf1/index.json"),
    quotes: readBaseline("public/driver-quotes.json"),
  };
  const allowShrink = process.env.ALLOW_SHRINK === "1" || process.env.ALLOW_SHRINK === "true";
  const { failures, warnings, oks } = validate(cur, base, { allowShrink });
  for (const m of oks) console.log(`  ✅ ${m}`);
  for (const m of warnings) console.log(`  ⚠️  ${m}`);
  for (const m of failures) console.error(`  ❌ ${m}`);
  if (failures.length > 0) {
    console.error(`\n❌ Validation failed with ${failures.length} error(s) — aborting build (previous deploy stays live)`);
    console.error("   A legitimate shrink (round removed from the calendar)? Re-run the workflow with allow_shrink.\n");
    process.exit(1);
  }
  console.log(`\n✅ All data validated${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""}\n`);
}

/**
 * validate-data.mjs
 * Runs in CI between the data fetches and the build. Fails the deploy when the
 * freshly-fetched data is malformed or implausibly smaller than what is already
 * committed — converting the silent-data-loss failure mode into a hard failure
 * (a failed build keeps the previous good deploy live).
 *
 * Baseline = the committed copy at HEAD (what the last push shipped).
 */
import fs from "fs";
import { execSync } from "child_process";

let failures = 0;
const fail = (msg) => { console.error(`  ❌ ${msg}`); failures++; };
const ok = (msg) => console.log(`  ✅ ${msg}`);

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const readBaseline = (p) => {
  try {
    return JSON.parse(execSync(`git show HEAD:${p}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
  } catch {
    return null; // not in git yet, or no git — skip baseline comparisons
  }
};

console.log("\n🔎 Validating fetched data before build...\n");

// ── data.json ──────────────────────────────────────────────────────────────
console.log("public/data.json:");
let data = null;
try { data = readJSON("public/data.json"); } catch (e) { fail(`unreadable: ${e.message}`); }
if (data) {
  if ((data.drivers || []).length >= 20) ok(`${data.drivers.length} drivers`);
  else fail(`only ${(data.drivers || []).length} drivers (expected ≥ 20)`);
  if ((data.constructors || []).length >= 10) ok(`${data.constructors.length} constructors`);
  else fail(`only ${(data.constructors || []).length} constructors (expected ≥ 10)`);
  if ((data.schedule || []).length >= 20) ok(`${data.schedule.length} scheduled races`);
  else fail(`only ${(data.schedule || []).length} scheduled races (expected ≥ 20)`);
  if (Number.isFinite(new Date(data.fetchedAt).getTime())) ok(`fetchedAt ${data.fetchedAt}`);
  else fail(`bad fetchedAt: ${data.fetchedAt}`);

  const base = readBaseline("public/data.json");
  if (base) {
    if ((data.races || []).length >= (base.races || []).length) ok(`races ${data.races.length} ≥ baseline ${base.races.length}`);
    else fail(`races shrank: ${(data.races || []).length} < baseline ${(base.races || []).length}`);
    if ((data.qualifying || []).length >= (base.qualifying || []).length) ok(`qualifying rounds ${data.qualifying.length} ≥ baseline ${base.qualifying.length}`);
    else fail(`qualifying shrank: ${(data.qualifying || []).length} < baseline ${(base.qualifying || []).length}`);
  } else {
    console.log("  ⚠️  no git baseline — skipped shrink checks");
  }
}

// ── openf1 split payload ───────────────────────────────────────────────────
console.log("\npublic/openf1/:");
let index = null;
try { index = readJSON("public/openf1/index.json"); } catch (e) { fail(`index.json unreadable: ${e.message}`); }
if (index) {
  const meetings = index.meetings || [];
  const baseIdx = readBaseline("public/openf1/index.json");
  if (baseIdx && meetings.length < (baseIdx.meetings || []).length) {
    fail(`meetings shrank: ${meetings.length} < baseline ${baseIdx.meetings.length}`);
  } else {
    ok(`${meetings.length} meetings in index${baseIdx ? ` (baseline ${baseIdx.meetings.length})` : ""}`);
  }
  if (Object.keys(index.driverHeadshots || {}).length >= 20) ok(`${Object.keys(index.driverHeadshots).length} driver headshots`);
  else fail(`only ${Object.keys(index.driverHeadshots || {}).length} driver headshots (expected ≥ 20)`);
  for (const m of meetings) {
    try {
      const full = readJSON(`public/openf1/meetings/${m.meetingKey}.json`);
      const withDrivers = (full.sessions || []).filter(s => (s.drivers || []).length > 0).length;
      if (withDrivers > 0) ok(`${m.meetingName}: ${full.sessions.length} sessions (${withDrivers} with drivers)`);
      else fail(`${m.meetingName}: no session has drivers`);
    } catch (e) {
      fail(`meetings/${m.meetingKey}.json unreadable: ${e.message}`);
    }
  }
}

// ── driver-quotes.json (optional file — must parse if present) ─────────────
if (fs.existsSync("public/driver-quotes.json")) {
  try {
    const q = readJSON("public/driver-quotes.json");
    ok(`\ndriver-quotes.json parses (${(q.rounds || []).length} rounds)`);
  } catch (e) {
    fail(`driver-quotes.json unreadable: ${e.message}`);
  }
}

if (failures > 0) {
  console.error(`\n❌ Validation failed with ${failures} error(s) — aborting build (previous deploy stays live)\n`);
  process.exit(1);
}
console.log("\n✅ All data validated\n");

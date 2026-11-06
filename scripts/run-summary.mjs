// Write a job summary for the deploy workflow: what each source shipped, the
// step outcomes, and a warning annotation when driver quotes lag the results.
//
// Appends markdown to $GITHUB_STEP_SUMMARY (stdout when run locally). Step
// outcomes arrive as env vars from deploy.yml. Never fails the job — a broken
// summary must not turn a good deploy red.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { qualityChecks } from "./data-quality.mjs";
import { loadMeetingsByRound } from "./build-season-stats.mjs";

// Finished rounds (ended 48h+ ago) missing quotes for an expected session.
// A session counts once it has quotes or an extractedAt stamp.
export function quoteGaps(data, quotes, now = Date.now()) {
  const byRound = Object.fromEntries((quotes?.rounds || []).map(r => [r.round, r.sessions || {}]));
  const gaps = [];
  for (const s of data?.schedule || []) {
    const endedAt = new Date(`${s.date}T${s.time || "12:00:00Z"}`).getTime() + 3 * 3600e3;
    if (!(data.races || []).some(r => r.round === s.round) || now - endedAt < 48 * 3600e3) continue;
    const want = s.sprint ? ["sprintQualifying", "sprint", "qualifying", "race"] : ["qualifying", "race"];
    const have = byRound[s.round] || {};
    const missing = want.filter(k => !((have[k]?.quotes || []).length || have[k]?.extractedAt));
    if (missing.length) gaps.push({ round: s.round, name: s.name, missing });
  }
  return gaps;
}


const read = p => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const env = process.env;
const lines = [];
const out = s => lines.push(s);

const OUTCOME = { success: "✅ success", failure: "❌ failed", skipped: "⏭️ skipped", cancelled: "⚪ cancelled", "": "— not run" };
const outcome = v => OUTCOME[v ?? ""] ?? v;
const utc = iso => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "unknown");

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) try {
  const data = read("public/data.json");
  const index = read("public/openf1/index.json");
  const quotes = read("public/driver-quotes.json");

  const lastRace = data?.races?.at(-1);
  const racesWithQuotes = (quotes?.rounds || []).filter(r => (r.sessions?.race?.quotes || []).length > 0);
  const lastQuoted = racesWithQuotes.at(-1);
  const meetings = index?.meetings || [];
  const lastMeeting = [...meetings].reverse().find(m => (m.sessions || []).some(s => s.sessionName === "Race"));

  out(`### F1 data refresh · ${utc(new Date().toISOString())}`);
  out("");
  out("| Source | Step | What shipped |");
  out("|---|---|---|");
  out(`| Jolpica | ${outcome(env.JOLPICA_OUTCOME)} | ${data ? `round ${data.completedRounds} of ${data.totalRounds}${lastRace ? ` · ${lastRace.name}` : ""} · fetched ${utc(data.fetchedAt)}` : "data.json unreadable"} |`);
  out(`| OpenF1 | ${outcome(env.OPENF1_OUTCOME)} | ${index ? `${meetings.length} meetings${lastMeeting ? ` · latest race ${lastMeeting.meetingName}` : ""} · fetched ${utc(index.fetchedAt)}` : "index.json unreadable"} |`);
  const stats = read("public/season-stats.json");
  out(`| Season stats | ${outcome(env.STATS_OUTCOME)} | ${stats ? `${stats.drivers.filter(d => d.starts >= stats.minStarts).length} drivers rated through round ${stats.rounds}` : "season-stats.json unreadable"} |`);
  out(`| Quotes | ${outcome(env.QUOTES_OUTCOME)} | ${lastQuoted ? `race quotes through round ${lastQuoted.round} · ${lastQuoted.raceName}` : "no race quotes yet"} |`);
  out(`| Data commit | ${outcome(env.COMMIT_OUTCOME)} | ${env.COMMIT_OUTCOME === "success" ? "cache and validator baseline saved to main" : "see the commit step log"} |`);

  // Quote gaps: the transcript step runs on a local machine (YouTube blocks CI),
  // so any finished round still missing a session's quotes two days on needs a
  // look. Every round is checked, not just the latest — R17's missing race
  // quotes sat unnoticed for weeks behind a later round that had them.
  const gaps = quoteGaps(data, quotes);
  if (gaps.length) {
    const list = gaps.map(g => `R${g.round} ${g.name.replace(" Grand Prix", "")} (${g.missing.join(", ")})`).join("; ");
    const msg = `Driver quotes missing for ${list}. Run \`python scripts/fetch-driver-quotes.py --fetch-transcripts\` locally and push.`;
    out("");
    out(`> ⚠️ ${msg}`);
    console.log(`::warning title=Quote gaps::${msg}`);
  }
  // Data quality: warnings, never a failed run (scripts/data-quality.mjs)
  const findings = qualityChecks({ data, quotes, meetingsByRound: loadMeetingsByRound() });
  out("");
  out(`#### Data quality · ${findings.length ? `${findings.length} finding${findings.length > 1 ? "s" : ""}` : "all checks pass"}`);
  for (const f of findings) out(`- **${f.check}** · ${f.detail}`);
  for (const f of findings.slice(0, 10)) console.log(`::warning title=Data quality (${f.check})::${f.detail}`);
} catch (e) {
  out(`Summary failed: ${e.message}`);
}

if (lines.length) {
  const text = lines.join("\n") + "\n";
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, text);
  else process.stdout.write(text);
}

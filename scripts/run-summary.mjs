// Write a job summary for the deploy workflow: what each source shipped, the
// step outcomes, and a warning annotation when driver quotes lag the results.
//
// Appends markdown to $GITHUB_STEP_SUMMARY (stdout when run locally). Step
// outcomes arrive as env vars from deploy.yml. Never fails the job — a broken
// summary must not turn a good deploy red.
import fs from "node:fs";

const read = p => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const env = process.env;
const lines = [];
const out = s => lines.push(s);

const OUTCOME = { success: "✅ success", failure: "❌ failed", skipped: "⏭️ skipped", cancelled: "⚪ cancelled", "": "— not run" };
const outcome = v => OUTCOME[v ?? ""] ?? v;
const utc = iso => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "unknown");

try {
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
  out(`| Quotes | ${outcome(env.QUOTES_OUTCOME)} | ${lastQuoted ? `race quotes through round ${lastQuoted.round} · ${lastQuoted.raceName}` : "no race quotes yet"} |`);
  out(`| Data commit | ${outcome(env.COMMIT_OUTCOME)} | ${env.COMMIT_OUTCOME === "success" ? "cache and validator baseline saved to main" : "see the commit step log"} |`);

  // Quotes lag: the transcript step runs on a local machine (YouTube blocks CI),
  // so a finished race without quotes two days on means someone needs to run it.
  if (data && lastRace) {
    const sched = (data.schedule || []).find(s => s.round === lastRace.round);
    const endedAt = sched ? new Date(`${sched.date}T${sched.time || "12:00:00Z"}`).getTime() + 3 * 3600e3 : 0;
    const lag = lastRace.round - (lastQuoted?.round ?? 0);
    const hoursSince = (Date.now() - endedAt) / 3600e3;
    if (lag > 0 && hoursSince > 48) {
      const msg = `Driver quotes lag the results by ${lag} round${lag > 1 ? "s" : ""} (latest quoted: ${lastQuoted ? `round ${lastQuoted.round}` : "none"}). ` +
        "Run `python scripts/fetch-driver-quotes.py --fetch-transcripts` locally and push.";
      out("");
      out(`> ⚠️ ${msg}`);
      console.log(`::warning title=Quotes lag::${msg}`);
    }
  }
} catch (e) {
  out(`Summary failed: ${e.message}`);
}

const text = lines.join("\n") + "\n";
if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, text);
else process.stdout.write(text);

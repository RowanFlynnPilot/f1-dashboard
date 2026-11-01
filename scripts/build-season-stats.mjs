/**
 * build-season-stats.mjs
 * Season metrics and percentiles per driver (src/data.js → buildSeasonStats)
 * from data.json and every OpenF1 meeting file → public/season-stats.json.
 *
 * Runs in CI after the fetches. The browser can't compute these itself without
 * downloading every meeting file (~200 KB each), so they ship precomputed.
 * Needs no network; a failure leaves the committed file in place.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildSeasonStats } from "../src/data.js";

const read = p => JSON.parse(fs.readFileSync(p, "utf8"));

export function loadMeetingsByRound(dir = "public/openf1/meetings") {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
    const m = read(path.join(dir, f));
    if (m.round) out[m.round] = m;
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = read("public/data.json");
  const meetings = loadMeetingsByRound();
  const stats = { ...buildSeasonStats(data, meetings), builtAt: new Date().toISOString() };
  const file = "public/season-stats.json";
  fs.writeFileSync(file + ".tmp", JSON.stringify(stats));
  fs.renameSync(file + ".tmp", file);
  const rated = stats.drivers.filter(d => d.starts >= stats.minStarts).length;
  console.log(`📈 season-stats.json: ${stats.drivers.length} drivers (${rated} rated), ${Object.keys(meetings).length} meeting files, ${stats.rounds} rounds`);
}

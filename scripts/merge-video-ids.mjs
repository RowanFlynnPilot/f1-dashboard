// Merge two scripts/video-ids.json maps (season → round → session → video ID).
//
//   node scripts/merge-video-ids.mjs <main.json> <run.json> <out.json>
//
// Used by commit-data.sh: CI's RSS discovery only ever adds IDs, while a human
// may add or correct IDs on main at the same time. The result is the union of
// both, and wherever both set the same key the value already on main wins — a
// hand-corrected ID is never replaced by CI. Key order follows main, with new
// keys appended, so the committed diff shows only real additions.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export function mergeIds(main, run) {
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObj(main)) return main ?? run;
  if (!isObj(run)) return main;
  const out = { ...main };
  for (const [k, v] of Object.entries(run)) {
    if (!(k in main)) out[k] = v;
    else if (isObj(main[k]) && isObj(v)) out[k] = mergeIds(main[k], v);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mainPath, runPath, outPath] = process.argv.slice(2);
  const read = p => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return {}; } };
  // Same layout as the Python writer (indent 2, trailing newline) so the file
  // doesn't churn between the two
  fs.writeFileSync(outPath, JSON.stringify(mergeIds(read(mainPath), read(runPath)), null, 2) + "\n");
}

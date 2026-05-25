#!/usr/bin/env node
/**
 * fetch-tracks.mjs
 * Downloads GeoJSON track outlines from bacinger/f1-circuits and projects them
 * into normalized SVG paths. Writes to public/tracks.json keyed by race name so
 * the dashboard can render each circuit as a small inline SVG.
 *
 *   npm run fetch-tracks
 *
 * Re-run whenever the F1 calendar changes (e.g. new circuit added).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_PATH = path.join(__dirname, "..", "public", "tracks.json");

const REPO_BASE = "https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits";

// Race name -> bacinger filename (without .geojson)
const RACE_TO_FILE = {
  "Australian Grand Prix":   "au-1953",
  "Chinese Grand Prix":      "cn-2004",
  "Japanese Grand Prix":     "jp-1962",
  "Miami Grand Prix":        "us-2022",
  "Canadian Grand Prix":     "ca-1978",
  "Monaco Grand Prix":       "mc-1929",
  "Barcelona Grand Prix":    "es-1991",
  "Austrian Grand Prix":     "at-1969",
  "British Grand Prix":      "gb-1948",
  "Belgian Grand Prix":      "be-1925",
  "Hungarian Grand Prix":    "hu-1986",
  "Dutch Grand Prix":        "nl-1948",
  "Italian Grand Prix":      "it-1922",
  "Spanish Grand Prix":      "es-2026",
  "Azerbaijan Grand Prix":   "az-2016",
  "Singapore Grand Prix":    "sg-2008",
  "United States Grand Prix":"us-2012",
  "Mexico City Grand Prix":  "mx-1962",
  "Brazilian Grand Prix":    "br-1977",
  "Las Vegas Grand Prix":    "us-2023",
  "Qatar Grand Prix":        "qa-2004",
  "Abu Dhabi Grand Prix":    "ae-2009",
};

// Normalize a LineString of [lng, lat] points into an SVG path string fitted
// inside a 100-unit box with the real-world aspect ratio preserved.
function projectToPath(coordinates, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const avgLat = (minLat + maxLat) / 2;
  // Longitude degrees shrink with latitude. Without this, north-south tracks
  // look stretched horizontally.
  const lngScale = Math.cos((avgLat * Math.PI) / 180);
  const lngSpan = (maxLng - minLng) * lngScale;
  const latSpan = maxLat - minLat;
  const aspect = lngSpan / latSpan;
  let vbW, vbH;
  if (aspect >= 1) { vbW = 100; vbH = 100 / aspect; }
  else { vbW = 100 * aspect; vbH = 100; }
  const pts = coordinates.map(([lng, lat]) => {
    const x = ((lng - minLng) * lngScale / lngSpan) * vbW;
    const y = vbH - ((lat - minLat) / latSpan) * vbH;
    return [x, y];
  });
  // Build path. Close with Z so the start/end connect cleanly even when the
  // GeoJSON loop's last point isn't exactly the first.
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ") + " Z";
  return {
    path,
    viewBox: `0 0 ${vbW.toFixed(2)} ${vbH.toFixed(2)}`,
    aspectRatio: aspect,
  };
}

async function fetchTrack(file) {
  const url = `${REPO_BASE}/${file}.geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log(`\n🏁 Fetching ${Object.keys(RACE_TO_FILE).length} F1 track outlines\n`);
  const out = {};
  let ok = 0, fail = 0;

  for (const [raceName, file] of Object.entries(RACE_TO_FILE)) {
    try {
      const geo = await fetchTrack(file);
      const feature = geo.features?.[0];
      if (!feature?.geometry?.coordinates) {
        console.log(`  ❌ ${raceName} — no coordinates in ${file}`);
        fail++;
        continue;
      }
      const projected = projectToPath(feature.geometry.coordinates, geo.bbox || feature.bbox);
      out[raceName] = {
        circuitName: feature.properties?.Name || "",
        location: feature.properties?.Location || "",
        lengthMeters: feature.properties?.length || null,
        opened: feature.properties?.opened || null,
        ...projected,
      };
      console.log(`  ✅ ${raceName} (${file}) — ${feature.geometry.coordinates.length} points, aspect ${projected.aspectRatio.toFixed(2)}`);
      ok++;
    } catch (err) {
      console.log(`  ❌ ${raceName} (${file}) — ${err.message}`);
      fail++;
    }
    // Be polite to GitHub's CDN
    await new Promise(r => setTimeout(r, 100));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n✅ Wrote ${ok} tracks (${fail} failed) to ${OUT_PATH}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });

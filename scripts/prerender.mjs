/**
 * prerender.mjs
 * Runs after `vite build` and `vite build --ssr src/prerender.jsx` (npm run
 * build does all three). Renders the Overview from public/data.json into
 * dist/index.html, so the first sheet paints with the HTML instead of after
 * the 136 KB bundle has downloaded and run (mobile LCP was ~4.2 s, nearly all
 * of it waiting on the script).
 *
 * The static loading shell moves into a <template> right after #root; an
 * inline check swaps it back in before first paint when the URL opens another sheet, so a deep link
 * never flashes the Overview. main.jsx takes over the pre-rendered page once
 * data.json is in hand. A failure here leaves the normal (unrendered) page.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const SHELL = /<!--shell-->([\s\S]*?)<!--\/shell-->/;

// Swap the loading shell for the rendered Overview; pure, so it's testable
export function injectPrerender(html, rendered, renderAt) {
  const m = html.match(SHELL);
  if (!m) throw new Error("index.html has no <!--shell--> markers");
  const guard = `<script>(function(){var r=document.getElementById("root");if(/(^|[#&])tab=(?!overview(&|$))/.test(location.hash)){r.innerHTML=document.getElementById("loading-shell").innerHTML;r.removeAttribute("data-prerendered");}})()</script>`;
  return html
    .replace('<div id="root">', `<div id="root" data-prerendered="overview" data-render-at="${renderAt}">`)
    .replace(SHELL, () => rendered) // functions: "$" in the HTML is not a pattern
    // template first: the guard runs as soon as it's parsed
    .replace(/(<div id="root" data-prerendered="overview"[^>]*>[\s\S]*?<\/div>)(\s*<noscript>)/, (all, root, ns) => root + `<template id="loading-shell">${m[1]}</template>` + guard + ns);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { render } = await import(pathToFileURL(".ssr/prerender.js").href);
    const raw = JSON.parse(fs.readFileSync("public/data.json", "utf8"));
    const file = "dist/index.html";
    const renderAt = Date.now();
    const out = injectPrerender(fs.readFileSync(file, "utf8"), render(raw, renderAt), renderAt);
    if (!out.includes('id="loading-shell"') || !out.includes("location.hash")) throw new Error("injection incomplete");
    fs.writeFileSync(file, out);
    console.log(`🖨️  Pre-rendered the Overview into ${file} (${Math.round(out.length / 1024)} KB)`);
  } catch (e) {
    // Never fail the build over it: the unrendered page works, just paints later
    console.log(`⚠️  Pre-render skipped: ${e.message}`);
  }
}

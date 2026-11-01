// Smoke test of the built dashboard: every sheet opens without errors, the
// pre-rendered Overview is adopted (hydrated) without a mismatch and without
// moving, and a deep link never flashes the Overview. Runs at phone and desktop
// sizes (playwright.config.mjs). The failures it guards against were real:
// a layout-shift regression that only Lighthouse caught, and a guard script
// that ran before the element it needed.
import { test, expect } from "@playwright/test";

const SHEETS = [
  ["overview", "Overview"], ["standings", "Standings"], ["results", "Race Results"], ["sectors", "Sector Times"],
  ["telemetry", "Telemetry"], ["h2h", "Head to Head"], ["pits", "Pit Stops"], ["quotes", "Quotes"], ["schedule", "Schedule"],
];

// Console errors and warnings from our own code. Third-party resources (fonts,
// the F1 headshot CDN) can fail on a flaky network without it being a bug.
function watchConsole(page) {
  const problems = [];
  page.on("pageerror", e => problems.push(`pageerror: ${e.message}`));
  page.on("console", m => {
    if (m.type() !== "error" && !(m.type() === "warning" && /re-rendered|hydrat/i.test(m.text()))) return;
    if (/Failed to load resource|ERR_|net::/i.test(m.text())) return;
    problems.push(`${m.type()}: ${m.text()}`);
  });
  return problems;
}

const layoutShift = page => page.evaluate(() => new Promise(resolve => {
  let total = 0;
  new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) total += e.value; })
    .observe({ type: "layout-shift", buffered: true });
  setTimeout(() => resolve(total), 300);
}));

test("the Overview is pre-rendered, hydrates cleanly and doesn't move", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("./");
  const root = page.locator("#root");
  await expect(root).toHaveAttribute("data-prerendered", "overview");
  // React has taken the page over once the lap chart (a client-side fetch) draws
  await expect(page.locator(".lapchart svg")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("h2.sheet-h").first()).toContainText("Lap chart");
  await page.waitForTimeout(1500); // fonts, quotes, headshots settle
  expect(await layoutShift(page)).toBeLessThan(0.1);
  expect(problems).toEqual([]);
});

test("a deep link opens its own sheet without showing the pre-rendered Overview", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("./#tab=h2h");
  await expect(page.locator("#root")).not.toHaveAttribute("data-prerendered", /.*/);
  await expect(page.getByRole("tab", { name: "Head to Head" })).toHaveAttribute("aria-selected", "true");
  expect(problems).toEqual([]);
});

for (const [slug, label] of SHEETS) {
  test(`${label} opens without errors`, async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto(`./#tab=${slug}`);
    await expect(page.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#sheet .sheet")).toBeVisible();
    // lazily loaded data (meeting files, quotes) lands and renders
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#sheet")).not.toContainText("This tab hit an error");
    const width = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(width, "no sideways page scroll").toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });
}

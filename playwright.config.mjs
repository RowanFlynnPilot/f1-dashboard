// Browser smoke test of the built site (npm run e2e, after npm run build).
// Uses the installed Chrome (GitHub's Ubuntu runners ship it), so CI downloads
// no browser. See e2e/smoke.spec.mjs for what it checks.
import { defineConfig } from "@playwright/test";

const PORT = 4179;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/f1-dashboard/`,
    channel: "chrome",
    // Deliberately unlike the build's zone and locale (CI builds in UTC, en-US):
    // pre-rendered text that depends on either must fail here, not on visitors'
    // phones. A local "lights out" time failed hydration outside UTC for days
    // while this suite, sharing the build's zone, passed.
    timezoneId: "Pacific/Auckland",
    locale: "en-GB",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/f1-dashboard/`,
    reuseExistingServer: !process.env.CI,
  },
});

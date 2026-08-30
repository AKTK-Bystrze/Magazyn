import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment first (if exists), then fallback to .env
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export default defineConfig({
  testDir: "./e2e/tests",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Worker count controlled by CLI (--workers=N) or defaults to auto */
  workers: undefined,

  /* Reporter to use */
  reporter: [["html", { open: "never" }], ["list"]],

  /* Global teardown to cleanup orphaned test equipment */
  globalTeardown: "./e2e/global-teardown.ts",

  /* Global setup to provision users before workers start */
  globalSetup: "./e2e/global-setup.ts",

  /* Shared settings for all the projects below */
  use: {
    /* Base URL from environment variable */
    baseURL: process.env.E2E_BASE_URL || "http://localhost",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Capture screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on first retry */
    video: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    /* Setup project for authentication */
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
      dependencies: ["setup"],
    },
  ],

  /* Timeout settings */
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
});

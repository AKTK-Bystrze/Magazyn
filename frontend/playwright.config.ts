import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export default defineConfig({
  testDir: "./e2e/tests",

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: undefined,

  reporter: [["html", { open: "never" }], ["list"]],

  globalTeardown: "./e2e/global-teardown.ts",

  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost",

    trace: "on-first-retry",

    screenshot: "only-on-failure",

    video: "on-first-retry",
  },

  projects: [
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

  timeout: 30000,
  expect: {
    timeout: 10000,
  },
});

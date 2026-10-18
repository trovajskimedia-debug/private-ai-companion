import { defineConfig } from "@playwright/test";
import path from "node:path";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
  },
  webServer: {
    command: "npm run db:deploy && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/api/session",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: `file:${path.resolve(`.local/e2e-${Date.now()}.db`)}`,
      OLLAMA_BASE_URL: "http://127.0.0.1:1",
      COMFYUI_BASE_URL: "http://127.0.0.1:1",
      COMFYUI_CHECKPOINT: "",
      COMFYUI_WORKFLOW_PATH: "",
      COOKIE_SECURE: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});

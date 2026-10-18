import { defineConfig } from "@playwright/test";
import path from "node:path";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests/integration",
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
  },
  webServer: [
    {
      command: "node tests/fixtures/model-server.mjs",
      url: "http://127.0.0.1:3141/system_stats",
      reuseExistingServer: false,
    },
    {
      command: "npm run db:deploy && npm run start -- --port 3101",
      url: "http://127.0.0.1:3101/api/session",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: `file:${path.resolve(`.local/integrations-${Date.now()}.db`)}`,
        OLLAMA_BASE_URL: "http://127.0.0.1:3141",
        OLLAMA_MODEL: "fixture-model",
        COMFYUI_BASE_URL: "http://127.0.0.1:3141",
        COMFYUI_CHECKPOINT: "fixture.safetensors",
        COMFYUI_WORKFLOW_PATH: "",
        COOKIE_SECURE: "false",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});

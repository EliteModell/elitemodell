import { defineConfig } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// Carrega variáveis do .env para o processo dos workers
dotenv.config({ path: path.join(__dirname, ".env") });

const STORAGE_PATH = "tests/.auth/user.json";

export default defineConfig({
  testDir: "./tests",
  timeout: 35_000,
  retries: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    hasTouch: true,
    isMobile: true,
  },
  projects: [
    /* Projeto 1 — mock de sessão (testes estáticos existentes) */
    {
      name: "mock-session",
      testMatch: "**/client-area-audit.spec.ts",
      use: { browserName: "chromium" },
    },
    /* Projeto 2 — sessão real (testes interativos) */
    {
      name: "authenticated",
      testMatch: "**/client-area-authenticated.spec.ts",
      use: {
        browserName: "chromium",
        storageState: STORAGE_PATH,
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

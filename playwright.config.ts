import { defineConfig } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });

const STORAGE_PATH = "tests/.auth/user.json";

// Em CI, nenhum servidor está rodando previamente — usamos o dev server.
// Localmente, reutilizamos o servidor já em execução para não precisar de build.
const IS_CI = !!process.env.CI;

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
  globalTeardown: "./tests/global-teardown.ts",
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
    {
      name: "mock-session",
      testMatch: "**/client-area-audit.spec.ts",
      use: { browserName: "chromium" },
    },
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
    // Usa next diretamente (evita que npm engula SIGTERM e cause timeout no teardown).
    // Em CI: sobe o dev server (não precisa de build prévia).
    // Local: reutiliza servidor já rodando na 3000.
    command: IS_CI ? "node_modules/.bin/next dev" : "node_modules/.bin/next start",
    url: "http://localhost:3000",
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

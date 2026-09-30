import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "location-search.spec.ts",
  timeout: 90_000,
  workers: 1,
  reporter: "list",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000", browserName: "chromium", screenshot: "only-on-failure" },
});

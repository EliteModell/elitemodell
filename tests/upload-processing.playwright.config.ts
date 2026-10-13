import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "upload-processing.spec.ts",
  workers: 1,
  reporter: "list",
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["manual-identity.spec.ts", "manual-identity-access.spec.ts"],
  workers: 1,
});

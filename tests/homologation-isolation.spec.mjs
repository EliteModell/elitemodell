import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../scripts/validate-homologation-isolation.mjs", import.meta.url));

function isolatedEnv(overrides = {}) {
  return {
    ...process.env,
    HOMOLOGATION_MODE: "strict",
    HOMOLOGATION_RUNTIME_ID: "elite-pr-1",
    HOMOLOGATION_EXPECTED_BRANCH: "fix/onboarding-didit-pending-identity",
    HOMOLOGATION_DATASET: "synthetic-only",
    HOMOLOGATION_ALLOWED_WRITES: "supabase",
    HOMOLOGATION_SUPABASE_PROJECT_REF: "previewref",
    PRODUCTION_SUPABASE_PROJECT_REF: "productionref",
    HOMOLOGATION_EMAIL_MODE: "disabled",
    HOMOLOGATION_DIDIT_MODE: "disabled",
    HOMOLOGATION_PAYMENT_MODE: "disabled",
    HOMOLOGATION_AV_MODE: "disabled",
    HOMOLOGATION_MODERATION_MODE: "manual",
    HOMOLOGATION_FIREBASE_MODE: "disabled",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "fix/onboarding-didit-pending-identity",
    NEXT_PUBLIC_APP_URL: "https://elite-pr-1.vercel.app",
    NEXTAUTH_URL: "https://elite-pr-1.vercel.app",
    NEXT_PUBLIC_SUPABASE_URL: "https://previewref.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role",
    NEXTAUTH_SECRET: "synthetic-nextauth",
    DATABASE_URL: "postgresql://synthetic@pooler.example/postgres",
    DIRECT_URL: "postgresql://synthetic@db.previewref.supabase.co/postgres",
    MEDIA_STORAGE_PROVIDER: "SUPABASE",
    DIDIT_API_KEY: "",
    DIDIT_WORKFLOW_ID: "",
    DIDIT_WEBHOOK_SECRET: "",
    ASAAS_API_KEY: "",
    ASAAS_WEBHOOK_TOKEN: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    FIREBASE_ADMIN_PRIVATE_KEY: "",
    FIREBASE_ADMIN_CLIENT_EMAIL: "",
    RESEND_API_KEY: "",
    AV_HTTP_TOKEN: "",
    AV_HTTP_ENDPOINT: "",
    CONTENT_MODERATION_ENDPOINT: "",
    CONTENT_MODERATION_TOKEN: "",
    BUNNY_STORAGE_API_KEY: "",
    BUNNY_CDN_SIGNING_KEY: "",
    ...overrides,
  };
}

function run(overrides) {
  return spawnSync(process.execPath, [script], {
    env: isolatedEnv(overrides),
    encoding: "utf8",
  });
}

test("accepts an isolated Supabase-only Preview", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
});

test("blocks the production Supabase project", () => {
  const result = run({ HOMOLOGATION_SUPABASE_PROJECT_REF: "productionref" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /coincide com Production/);
});

test("blocks production URLs and branch", () => {
  const result = run({
    VERCEL_GIT_COMMIT_REF: "main",
    NEXT_PUBLIC_APP_URL: "https://www.elitemodell.com.br",
    NEXTAUTH_URL: "https://www.elitemodell.com.br",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /nunca pode executar na main/);
  assert.match(result.stderr, /aponta para Production/);
});

test("blocks secondary credentials while their service is disabled", () => {
  const result = run({ DIDIT_API_KEY: "must-not-be-used" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Credencial de Didit presente/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /must-not-be-used/);
});

import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { parse } from "dotenv";

const BRANCH = "homolog/deploy-tecnico-controlado-2026-06-11";
const HOMOLOG_SCHEMA = "homolog_legal_20260611";
const HOMOLOG_URL = "https://elitemodell-homolog-legal-20260611.vercel.app";
const source = parse(fs.readFileSync(".env"));

function databaseUrlForHomologation(value, variableName) {
  if (!value) throw new Error(`${variableName} is missing from .env.`);
  const url = new URL(value);
  url.searchParams.set("schema", HOMOLOG_SCHEMA);
  return url.toString();
}

const variables = {
  DATABASE_URL: databaseUrlForHomologation(source.DATABASE_URL, "DATABASE_URL"),
  DIRECT_URL: databaseUrlForHomologation(
    source.DIRECT_URL ?? source.DATABASE_URL,
    "DIRECT_URL",
  ),
  NEXTAUTH_SECRET: source.NEXTAUTH_SECRET,
  AUTH_SECRET: source.NEXTAUTH_SECRET,
  NEXTAUTH_URL: HOMOLOG_URL,
  NEXT_PUBLIC_APP_URL: HOMOLOG_URL,
  GOOGLE_CLIENT_ID: source.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: source.GOOGLE_CLIENT_SECRET,
  APPLE_ID: source.APPLE_ID,
  APPLE_SECRET: source.APPLE_SECRET,
  NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_PERSONA_ENVIRONMENT: source.NEXT_PUBLIC_PERSONA_ENVIRONMENT,
  PERSONA_API_KEY: source.PERSONA_API_KEY,
  PERSONA_API_VERSION: source.PERSONA_API_VERSION,
  PERSONA_ENVIRONMENT: source.PERSONA_ENVIRONMENT,
  PERSONA_TEMPLATE_ID: source.PERSONA_TEMPLATE_ID,
  PERSONA_WEBHOOK_SECRET: source.PERSONA_WEBHOOK_SECRET,
  GOOGLE_MAPS_API_KEY: source.GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: source.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: source.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_APP_ID: source.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: source.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: source.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    source.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: source.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: source.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  FIREBASE_ADMIN_PROJECT_ID: source.FIREBASE_ADMIN_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: source.FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY: source.FIREBASE_ADMIN_PRIVATE_KEY,
  ADMIN_SETUP_SECRET: source.ADMIN_SETUP_SECRET,
  ADMIN_MFA_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  CRON_SECRET: randomBytes(32).toString("hex"),
  KYC_PROVIDER: source.KYC_PROVIDER ?? "persona",
  UPLOAD_QUARANTINE_BUCKET: "upload-quarantine",
  APPROVED_MEDIA_BUCKET: "approved-media",
  OTP_DEV_LOG_CODE: "false",
};

const requiredNames = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "AUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = requiredNames.filter((name) => !variables[name]);

if (missing.length > 0) {
  throw new Error(`Missing required homologation variables: ${missing.join(", ")}`);
}

const configuredVariables = Object.fromEntries(
  Object.entries(variables).filter(([, value]) => Boolean(value)),
);

for (const [name, value] of Object.entries(configuredVariables)) {
  const result = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      name,
      "preview",
      BRANCH,
      "--force",
      "--sensitive",
      "--yes",
    ],
    {
      cwd: process.cwd(),
      input: value,
      shell: process.platform === "win32",
      stdio: ["pipe", "inherit", "inherit"],
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to configure ${name} for the Vercel preview: ${result.error?.message ?? result.status}.`,
    );
  }
}

console.log(`Configured ${Object.keys(configuredVariables).length} branch-scoped preview variables.`);

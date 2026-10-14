const EXPECTED_BRANCH = "codex/security-audit-20261013";
const HOMOLOG_REF = "jbdshpbtqspzfzjngqbg";
const RUNTIME_ID = "elite-preview-20261013-v1";
const PROD_MARKERS = ["jgvmpbrsxegwkrgjncsv", "elitemodell.com.br"];

function fail(message) {
  console.error(`[homologation-guard] BLOCKED: ${message}`);
  process.exitCode = 1;
}

const active = process.env.HOMOLOGATION_MODE === "isolated" ||
  (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === EXPECTED_BRANCH);

if (!active) {
  console.log("[homologation-guard] skipped outside the isolated audit branch");
  process.exit(0);
}

const required = [
  "DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "NEXTAUTH_SECRET", "AUTH_SECRET", "MEDIA_SIGNING_SECRET",
  "UPLOAD_QUARANTINE_BUCKET", "APPROVED_MEDIA_BUCKET",
  "HOMOLOGATION_EXTERNAL_MODE", "EMAIL_DELIVERY_MODE", "PAYMENT_PROVIDER_MODE",
  "KYC_PROVIDER", "REDIS_PROVIDER_MODE", "CLOUD_TASKS_PROVIDER_MODE",
  "HOMOLOGATION_RUNTIME_ID",
];
for (const name of required) if (!process.env[name]?.trim()) fail(`${name} is missing`);

for (const [name, value] of Object.entries(process.env)) {
  const normalized = String(value || "").toLowerCase();
  for (const marker of PROD_MARKERS) {
    if (normalized.includes(marker)) fail(`${name} references a production resource`);
  }
}

for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  try {
    const url = new URL(process.env[name]);
    if (url.hostname !== `db.${HOMOLOG_REF}.supabase.co`) fail(`${name} has an unexpected host`);
  } catch { fail(`${name} is not a valid database URL`); }
}
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${HOMOLOG_REF}.supabase.co`) fail("Supabase URL does not match homologation");
if (process.env.HOMOLOGATION_RUNTIME_ID !== RUNTIME_ID) fail("exclusive runtime identity is missing");
if (process.env.UPLOAD_QUARANTINE_BUCKET !== "upload-quarantine" || process.env.APPROVED_MEDIA_BUCKET !== "approved-media") fail("storage buckets are not isolated");
for (const name of ["HOMOLOGATION_EXTERNAL_MODE", "EMAIL_DELIVERY_MODE", "PAYMENT_PROVIDER_MODE", "REDIS_PROVIDER_MODE", "CLOUD_TASKS_PROVIDER_MODE"])
  if (process.env[name] !== "mock") fail(`${name} must be mock`);
if (process.env.KYC_PROVIDER !== "MOCK") fail("KYC_PROVIDER must be MOCK");
for (const name of ["NEXTAUTH_SECRET", "AUTH_SECRET", "MEDIA_SIGNING_SECRET"])
  if ((process.env[name] || "").length < 32) fail(`${name} is too short`);
const secrets = [process.env.NEXTAUTH_SECRET, process.env.AUTH_SECRET, process.env.MEDIA_SIGNING_SECRET];
if (new Set(secrets).size !== secrets.length || secrets.some((value) => /placeholder|changeme|production/i.test(value || ""))) fail("application secrets are weak or reused");

function claim(value, name) {
  try { return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"))[name]; }
  catch { fail("a Supabase key is not a valid project JWT"); return undefined; }
}
if (claim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", "ref") !== HOMOLOG_REF || claim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", "role") !== "anon") fail("anon key identity is incorrect");
if (claim(process.env.SUPABASE_SERVICE_ROLE_KEY || "", "ref") !== HOMOLOG_REF || claim(process.env.SUPABASE_SERVICE_ROLE_KEY || "", "role") !== "service_role") fail("service key identity is incorrect");

if (!process.exitCode) console.log("[homologation-guard] PASS");

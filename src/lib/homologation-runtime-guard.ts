const AUDIT_BRANCH = "codex/security-audit-20261013";
const HOMOLOG_REF = "jbdshpbtqspzfzjngqbg";
const RUNTIME_ID = "elite-preview-20261013-v1";
const PROD_MARKERS = ["jgvmpbrsxegwkrgjncsv", "elitemodell.com.br"];
const MOCK_VARIABLES = [
  "HOMOLOGATION_EXTERNAL_MODE", "EMAIL_DELIVERY_MODE", "PAYMENT_PROVIDER_MODE",
  "REDIS_PROVIDER_MODE", "CLOUD_TASKS_PROVIDER_MODE",
] as const;

function blocked(reason: string): never {
  throw new Error(`[homologation-runtime] BLOCKED: ${reason}`);
}

function jwtClaim(value: string, claim: string): unknown {
  try {
    return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"))[claim];
  } catch {
    blocked("a Supabase key is not a valid project JWT");
  }
}

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export function validateHomologationRuntime(env: RuntimeEnvironment = process.env): boolean {
  if (env.VERCEL_ENV === "production") {
    if (env.HOMOLOGATION_MODE === "isolated" || env.HOMOLOGATION_RUNTIME_ID || env.KYC_PROVIDER === "MOCK" || MOCK_VARIABLES.some((name) => env[name]?.toLowerCase() === "mock")) {
      blocked("homologation configuration leaked into Production");
    }
    return false;
  }

  const active = env.HOMOLOGATION_MODE === "isolated" || env.VERCEL_ENV === "preview";
  if (!active) return false;
  if (env.VERCEL_ENV === "preview" && (env.VERCEL !== "1" || env.VERCEL_GIT_COMMIT_REF !== AUDIT_BRANCH)) blocked("unexpected Preview identity");
  if (env.HOMOLOGATION_RUNTIME_ID !== RUNTIME_ID) blocked("exclusive runtime identity is missing");

  const required = [
    "DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY", "NEXTAUTH_SECRET", "AUTH_SECRET", "MEDIA_SIGNING_SECRET",
    "UPLOAD_QUARANTINE_BUCKET", "APPROVED_MEDIA_BUCKET", "KYC_PROVIDER", ...MOCK_VARIABLES,
  ];
  for (const name of required) if (!env[name]?.trim()) blocked(`${name} is missing`);
  for (const [name, value] of Object.entries(env)) {
    const normalized = String(value || "").toLowerCase();
    if (PROD_MARKERS.some((marker) => normalized.includes(marker))) blocked(`${name} references Production`);
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    try {
      if (new URL(env[name]!).hostname !== `db.${HOMOLOG_REF}.supabase.co`) blocked(`${name} has an unexpected host`);
    } catch { blocked(`${name} is not a valid database URL`); }
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL !== `https://${HOMOLOG_REF}.supabase.co`) blocked("Supabase project identity is incorrect");
  if (jwtClaim(env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, "ref") !== HOMOLOG_REF || jwtClaim(env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, "role") !== "anon") blocked("anon key belongs to an unexpected project or role");
  if (jwtClaim(env.SUPABASE_SERVICE_ROLE_KEY!, "ref") !== HOMOLOG_REF || jwtClaim(env.SUPABASE_SERVICE_ROLE_KEY!, "role") !== "service_role") blocked("service key belongs to an unexpected project or role");
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY) blocked("Supabase roles are not isolated");
  if (env.UPLOAD_QUARANTINE_BUCKET !== "upload-quarantine" || env.APPROVED_MEDIA_BUCKET !== "approved-media") blocked("storage is not isolated");
  if (MOCK_VARIABLES.some((name) => env[name] !== "mock") || env.KYC_PROVIDER !== "MOCK") blocked("an external integration is not in safe mode");
  const secrets = [env.NEXTAUTH_SECRET!, env.AUTH_SECRET!, env.MEDIA_SIGNING_SECRET!];
  if (secrets.some((value) => value.length < 32 || /placeholder|changeme|production/i.test(value)) || new Set(secrets).size !== secrets.length) blocked("application secrets are weak or reused");
  return true;
}

export function installHomologationNetworkGuard(env: RuntimeEnvironment = process.env): boolean {
  if (!validateHomologationRuntime(env)) return false;
  const allowed = new Set([`${HOMOLOG_REF}.supabase.co`, env.VERCEL_URL].filter(Boolean));
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    let url: URL;
    try { url = new URL(raw); } catch { blocked("a server fetch used a non-absolute URL"); }
    if (url.protocol !== "https:" || !allowed.has(url.hostname)) blocked("outbound network destination is not allowlisted");
    return original(input, init);
  };
  return true;
}

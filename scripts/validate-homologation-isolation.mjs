import process from "node:process";

const failures = [];

function value(name) {
  return process.env[name]?.trim() ?? "";
}

function fail(message) {
  failures.push(message);
}

function requireValue(name, expected) {
  const current = value(name);
  if (!current) fail(`${name} ausente.`);
  else if (expected !== undefined && current !== expected) {
    fail(`${name} deve ser ${expected}.`);
  }
  return current;
}

function parseUrl(name) {
  const current = requireValue(name);
  if (!current) return null;
  try {
    return new URL(current);
  } catch {
    fail(`${name} nao e uma URL valida.`);
    return null;
  }
}

function projectRefFromSupabaseUrl(url) {
  const match = url?.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  return match?.[1] ?? "";
}

function hasAny(names) {
  return names.some((name) => Boolean(value(name)));
}

function requireDisabledService({ modeName, secretNames, label }) {
  if (requireValue(modeName) !== "disabled") {
    fail(`${modeName} deve permanecer disabled ate existir ${label} isolado.`);
  }
  if (hasAny(secretNames)) {
    fail(`Credencial de ${label} presente enquanto o servico esta desabilitado.`);
  }
}

requireValue("HOMOLOGATION_MODE", "strict");
requireValue("HOMOLOGATION_RUNTIME_ID");
requireValue("HOMOLOGATION_DATASET", "synthetic-only");
requireValue("HOMOLOGATION_ALLOWED_WRITES", "supabase");
requireValue("VERCEL", "1");
requireValue("VERCEL_ENV", "preview");

const expectedBranch = requireValue("HOMOLOGATION_EXPECTED_BRANCH");
const actualBranch = requireValue("VERCEL_GIT_COMMIT_REF");
if (expectedBranch && actualBranch && expectedBranch !== actualBranch) {
  fail("A branch do deployment nao corresponde a HOMOLOGATION_EXPECTED_BRANCH.");
}
if (actualBranch === "main") fail("Homologacao com escrita nunca pode executar na main.");

const appUrl = parseUrl("NEXT_PUBLIC_APP_URL");
const authUrl = parseUrl("NEXTAUTH_URL");
for (const [name, url] of [["NEXT_PUBLIC_APP_URL", appUrl], ["NEXTAUTH_URL", authUrl]]) {
  if (url && url.protocol !== "https:") fail(`${name} deve usar HTTPS.`);
  if (url && !url.hostname.endsWith(".vercel.app")) fail(`${name} deve apontar para o alias Preview da Vercel.`);
  if (url && /^(www\.)?elitemodell\.com\.br$/i.test(url.hostname)) fail(`${name} aponta para Production.`);
}
if (appUrl && authUrl && appUrl.origin !== authUrl.origin) {
  fail("NEXT_PUBLIC_APP_URL e NEXTAUTH_URL devem usar a mesma origem Preview.");
}

const previewRef = requireValue("HOMOLOGATION_SUPABASE_PROJECT_REF");
const productionRef = requireValue("PRODUCTION_SUPABASE_PROJECT_REF");
if (previewRef && productionRef && previewRef === productionRef) {
  fail("O projeto Supabase de homologacao coincide com Production.");
}

const supabaseUrl = parseUrl("NEXT_PUBLIC_SUPABASE_URL");
const urlRef = projectRefFromSupabaseUrl(supabaseUrl);
if (supabaseUrl && !urlRef) fail("NEXT_PUBLIC_SUPABASE_URL nao identifica um projeto Supabase hospedado.");
if (previewRef && urlRef && previewRef !== urlRef) {
  fail("NEXT_PUBLIC_SUPABASE_URL nao corresponde a HOMOLOGATION_SUPABASE_PROJECT_REF.");
}

const databaseUrl = parseUrl("DATABASE_URL");
const directUrl = parseUrl("DIRECT_URL");
for (const [name, url] of [["DATABASE_URL", databaseUrl], ["DIRECT_URL", directUrl]]) {
  if (url && !/^postgres(ql)?:$/.test(url.protocol)) fail(`${name} deve ser PostgreSQL.`);
}
if (directUrl && previewRef && !directUrl.hostname.includes(previewRef)) {
  fail("DIRECT_URL nao pertence ao projeto Supabase de homologacao declarado.");
}
if (databaseUrl && directUrl && databaseUrl.pathname !== directUrl.pathname) {
  fail("DATABASE_URL e DIRECT_URL apontam para bancos diferentes.");
}

requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
requireValue("SUPABASE_SERVICE_ROLE_KEY");
requireValue("NEXTAUTH_SECRET");

requireDisabledService({
  modeName: "HOMOLOGATION_DIDIT_MODE",
  secretNames: ["DIDIT_API_KEY", "DIDIT_WORKFLOW_ID", "DIDIT_WEBHOOK_SECRET"],
  label: "Didit",
});
requireDisabledService({
  modeName: "HOMOLOGATION_PAYMENT_MODE",
  secretNames: ["ASAAS_API_KEY", "ASAAS_WEBHOOK_TOKEN", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  label: "pagamento",
});
requireDisabledService({
  modeName: "HOMOLOGATION_FIREBASE_MODE",
  secretNames: ["FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_ADMIN_CLIENT_EMAIL"],
  label: "Firebase",
});
requireDisabledService({
  modeName: "HOMOLOGATION_EMAIL_MODE",
  secretNames: ["RESEND_API_KEY"],
  label: "e-mail",
});
requireDisabledService({
  modeName: "HOMOLOGATION_AV_MODE",
  secretNames: ["AV_HTTP_TOKEN", "AV_HTTP_ENDPOINT"],
  label: "antivirus",
});

const moderationMode = requireValue("HOMOLOGATION_MODERATION_MODE");
if (moderationMode !== "manual") fail("A primeira fase exige moderacao manual e fail-closed.");
if (hasAny(["CONTENT_MODERATION_ENDPOINT", "CONTENT_MODERATION_TOKEN"])) {
  fail("Integracao externa de moderacao presente durante a fase manual.");
}

if (value("MEDIA_STORAGE_PROVIDER").toUpperCase() === "BUNNY" || hasAny(["BUNNY_STORAGE_API_KEY", "BUNNY_CDN_SIGNING_KEY"])) {
  fail("Bunny nao esta autorizado na homologacao inicial; use o Storage Supabase isolado.");
}

if (failures.length) {
  console.error("[homologation-isolation] BLOQUEADO:");
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log("[homologation-isolation] APROVADO: Preview isolada para escrita em Supabase com dados sinteticos.");
}

const HOMOLOG_REF = "jbdshpbtqspzfzjngqbg";
const authOnly = process.env.HOMOLOGATION_AUTH_ONLY === "true";
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "TEST_CLIENT_EMAIL", "TEST_CLIENT_PASSWORD", "TEST_PROFESSIONAL_EMAIL", "TEST_PROFESSIONAL_PASSWORD", "TEST_ADMIN_EMAIL", "TEST_ADMIN_PASSWORD"];
if (!authOnly) required.push("SUPABASE_SERVICE_ROLE_KEY");
for (const name of required) if (!process.env[name]?.trim()) throw new Error(`${name} missing`);
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (base !== `https://${HOMOLOG_REF}.supabase.co`) throw new Error("refusing non-homologation Supabase project");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = (token, apikey = anonKey) => ({ apikey, authorization: `Bearer ${token}`, "content-type": "application/json" });
async function json(response, operation) { const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(`${operation} failed (${response.status})`); return payload; }
async function validateRole(label, email, password, expectedRole) {
  const session = await json(await fetch(`${base}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(anonKey), body: JSON.stringify({ email, password }) }), `${label} login`);
  const userHeaders = headers(session.access_token);
  const own = await json(await fetch(`${base}/rest/v1/User?select=id,email,role&id=eq.${session.user.id}`, { headers: userHeaders }), `${label} own row`);
  if (own.length !== 1 || own[0].email !== email || own[0].role !== expectedRole) throw new Error(`${label} Auth-to-Prisma link is inconsistent`);
  if (expectedRole !== "ADMIN") { const visible = await json(await fetch(`${base}/rest/v1/User?select=id`, { headers: userHeaders }), `${label} isolation`); if (visible.some(({ id }) => id !== session.user.id)) throw new Error(`${label} can read another User row`); }
  if (expectedRole === "HOST") { const professional = await json(await fetch(`${base}/rest/v1/Professional?select=id,userId&userId=eq.${session.user.id}`, { headers: userHeaders }), "professional link"); if (professional.length !== 1) throw new Error("professional Auth-to-Prisma link is missing"); }
}
async function assertDirectWriteBlocked(label, token, method, query, body) {
  const response = await fetch(`${base}/rest/v1/User${query}`, {
    method,
    headers: { ...headers(token), Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const rows = await response.json().catch(() => null);
  if (response.ok && Array.isArray(rows) && rows.length) throw new Error(`${label} direct ${method} unexpectedly changed User`);
}
async function validateCrudAndRoleSeparation(sessions) {
  const marker = crypto.randomUUID();
  const id = `rls-${marker}`;
  const email = `rls-${marker}@example.invalid`;
  const now = new Date().toISOString();
  const payload = { id, email, name: "Synthetic RLS probe", role: "GUEST", accountType: "client", createdAt: now, updatedAt: now };
  const serviceHeaders = { ...headers(serviceKey, serviceKey), Prefer: "return=representation" };
  for (const [label, session] of Object.entries(sessions)) {
    await assertDirectWriteBlocked(label, session.access_token, "POST", "", payload);
    await assertDirectWriteBlocked(label, session.access_token, "PATCH", `?id=eq.${encodeURIComponent(id)}`, { role: "ADMIN", blocked: false });
    await assertDirectWriteBlocked(label, session.access_token, "DELETE", `?id=eq.${encodeURIComponent(id)}`);
  }
  await assertDirectWriteBlocked("anonymous", anonKey, "POST", "", payload);
  const created = await fetch(`${base}/rest/v1/User`, { method: "POST", headers: serviceHeaders, body: JSON.stringify(payload) });
  if (!created.ok) throw new Error(`service role INSERT failed (${created.status})`);
  try {
    for (const [label, session] of Object.entries(sessions)) {
      const read = await fetch(`${base}/rest/v1/User?select=id,role&id=eq.${encodeURIComponent(id)}`, { headers: headers(session.access_token) });
      const rows = await read.json().catch(() => null);
      if (label !== "admin" && read.ok && Array.isArray(rows) && rows.length) throw new Error(`${label} read another synthetic User`);
      if (label !== "admin") await assertDirectWriteBlocked(label, session.access_token, "PATCH", `?id=eq.${encodeURIComponent(id)}`, { role: "ADMIN" });
    }
    const updated = await fetch(`${base}/rest/v1/User?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: serviceHeaders, body: JSON.stringify({ blocked: true }) });
    if (!updated.ok) throw new Error(`service role UPDATE failed (${updated.status})`);
    const selected = await fetch(`${base}/rest/v1/User?select=id,blocked&id=eq.${encodeURIComponent(id)}`, { headers: serviceHeaders });
    const rows = await selected.json();
    if (!selected.ok || rows.length !== 1 || rows[0].blocked !== true) throw new Error("service role SELECT did not observe update");
  } finally {
    const removed = await fetch(`${base}/rest/v1/User?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: serviceHeaders });
    if (!removed.ok) throw new Error(`service role DELETE cleanup failed (${removed.status})`);
  }
}
async function validatePrivateStorage() {
  const bucket = process.env.UPLOAD_QUARANTINE_BUCKET || "upload-quarantine";
  if (bucket !== "upload-quarantine") throw new Error("unexpected quarantine bucket");
  const path = `redteam/${crypto.randomUUID()}/signed-url-check.txt`;
  const serviceHeaders = headers(serviceKey, serviceKey);
  const upload = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: { ...serviceHeaders, "content-type": "text/plain", "x-upsert": "false" }, body: "synthetic homologation object" });
  if (!upload.ok) throw new Error(`synthetic upload failed (${upload.status})`);
  try {
    if ((await fetch(`${base}/storage/v1/object/public/${bucket}/${path}`)).ok) throw new Error("quarantine object is publicly readable");
    const signed = await json(await fetch(`${base}/storage/v1/object/sign/${bucket}/${path}`, { method: "POST", headers: serviceHeaders, body: JSON.stringify({ expiresIn: 30 }) }), "signed URL");
    const token = new URL(signed.signedURL, base).searchParams.get("token");
    const claims = token ? JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) : null;
    if (!claims?.exp || !claims?.iat || claims.exp - claims.iat > 31) throw new Error("signed URL expiration is not restricted to 30 seconds");
    if (!(await fetch(`${base}/storage/v1${signed.signedURL}`)).ok) throw new Error("signed URL did not grant temporary access");
  } finally { await fetch(`${base}/storage/v1/object/${bucket}`, { method: "DELETE", headers: serviceHeaders, body: JSON.stringify({ prefixes: [path] }) }); }
}
(async () => {
  async function login(email, password) { return json(await fetch(`${base}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(anonKey), body: JSON.stringify({ email, password }) }), "login"); }
  await validateRole("client", process.env.TEST_CLIENT_EMAIL, process.env.TEST_CLIENT_PASSWORD, "GUEST");
  await validateRole("professional", process.env.TEST_PROFESSIONAL_EMAIL, process.env.TEST_PROFESSIONAL_PASSWORD, "HOST");
  await validateRole("admin", process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD, "ADMIN");
  if (!authOnly) {
    const sessions = {
      client: await login(process.env.TEST_CLIENT_EMAIL, process.env.TEST_CLIENT_PASSWORD),
      professional: await login(process.env.TEST_PROFESSIONAL_EMAIL, process.env.TEST_PROFESSIONAL_PASSWORD),
      admin: await login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD),
    };
    await validateCrudAndRoleSeparation(sessions);
    await validatePrivateStorage();
  }
  console.log(authOnly ? "HOMOLOGATION_AUTH_RLS=PASS" : "HOMOLOGATION_ACCESS=PASS");
})().catch((error) => { console.error(`HOMOLOGATION_ACCESS=FAIL ${error.message}`); process.exit(1); });

import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { normalizeIdentityImage } from "../src/lib/manual-identity-image";
import { brazilDate, confirmedAdult, identityParts, MAX_IDENTITY_IMAGE, sameIdentityOrigin, identityTargetsAreIsolated, identityTargetsProduction, manualRegistrationStatus, manualAttemptAllowsPublication, identityEnabled, manualIdentitySelected, shouldReviewRegistrationManually } from "../src/lib/manual-identity-policy";

test("confirma maioridade pela data civil no Brasil", () => {
  expect(brazilDate(new Date("2026-11-22T01:30:00Z"))).toBe("2026-11-21");
  expect(confirmedAdult("2008-11-21", "2026-11-21")).toBe(true);
  expect(confirmedAdult("2008-11-22", "2026-11-21")).toBe(false);
  expect(confirmedAdult("2000-02-30", "2026-11-21")).toBe(false);
  expect(confirmedAdult("2030-01-01", "2026-11-21")).toBe(false);
});

test("a dispensa do verso preserva frente e retrato obrigatórios", () => {
  expect(identityParts(false)).toEqual(["back", "front", "portrait"]);
  expect(identityParts(true)).toEqual(["front", "portrait"]);
});

test("decodifica imagem sintética, preserva o enquadramento e remove EXIF", async () => {
  const input = await sharp({ create: { width: 640, height: 512, channels: 3, background: "purple" } })
    .withMetadata().png().toBuffer();
  const output = await normalizeIdentityImage(new File([new Uint8Array(input)], "sintetica.png", { type: "image/png" }));
  expect(await sharp(output).metadata()).toMatchObject({ format: "jpeg", width: 640, height: 512 });
  expect((await sharp(output).metadata()).exif).toBeUndefined();
});

test("rejeita conteúdo inválido, arquivo grande, tipo proibido e resolução insuficiente", async () => {
  const small = await sharp({ create: { width: 200, height: 200, channels: 3, background: "white" } }).jpeg().toBuffer();
  for (const file of [
    new File(["<svg></svg>"], "fake.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(MAX_IDENTITY_IMAGE + 1)], "large.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(small)], "small.jpg", { type: "image/jpeg" }),
    new File(["svg"], "file.svg", { type: "image/svg+xml" }),
  ]) {
    await expect(normalizeIdentityImage(file)).rejects.toThrow();
  }
});


test("envios e decisões aceitam somente a origem da aplicação", () => {
  const address = "http://localhost:3000/api/kyc/manual";
  expect(sameIdentityOrigin(new Request(address, { headers: { origin: "http://localhost:3000" } }))).toBe(true);
  expect(sameIdentityOrigin(new Request(address, { headers: { origin: "https://example.invalid" } }))).toBe(false);
  expect(sameIdentityOrigin(new Request(address))).toBe(false);
  expect(sameIdentityOrigin(new Request(address, { headers: { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" } }))).toBe(false);
});

test("aceita apenas Storage e banco no ambiente isolado", () => {
  const local = "postgresql://test@127.0.0.1:5432/test";
  const preview = "postgresql://postgres.jbdshpbtqspzfzjngqbg@aws-0-sa-east-1.pooler.supabase.com/postgres";
  const direct = "postgresql://test@db.jbdshpbtqspzfzjngqbg.supabase.co/postgres";
  const prod = "postgresql://test@db.jgvmpbrsxegwkrgjncsv.supabase.co/postgres";
  expect(identityTargetsAreIsolated("http://127.0.0.1:54321", local, local)).toBe(true);
  expect(identityTargetsAreIsolated("https://jbdshpbtqspzfzjngqbg.supabase.co", preview, direct)).toBe(true);
  expect(identityTargetsAreIsolated("https://jbdshpbtqspzfzjngqbg.supabase.co", preview, prod)).toBe(false);
  expect(identityTargetsAreIsolated("https://jgvmpbrsxegwkrgjncsv.supabase.co", local, local)).toBe(false);
  expect(identityTargetsAreIsolated("http://127.0.0.1:54321", local)).toBe(false);
});

test("envio manual pendente ou expirado não equivale a aprovação", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  const fixture = { submittedAt: now, purgeAfter: new Date("2026-12-01"), purgedAt: null, reviewedAt: null, reviewerId: null };
  expect(manualRegistrationStatus(null, now)).toBe("NOT_STARTED");
  expect(manualRegistrationStatus({ ...fixture, status: "PENDING_REVIEW" }, now)).toBe("PENDING");
  expect(manualRegistrationStatus({ ...fixture, status: "PENDING_REVIEW", purgeAfter: now }, now)).toBe("REJECTED");
  expect(manualRegistrationStatus({ ...fixture, status: "APPROVED" }, now)).toBe("REJECTED");
  expect(manualRegistrationStatus({ ...fixture, status: "APPROVED", reviewedAt: now, reviewerId: "synthetic" }, now)).toBe("APPROVED");
});

test("publicação documental exige a decisão positiva da tentativa vigente", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  const approved = { id: "current", submittedAt: now, purgeAfter: now, purgedAt: now, reviewedAt: now, reviewerId: "synthetic", status: "APPROVED" };
  expect(manualAttemptAllowsPublication("current", approved)).toBe(true);
  expect(manualAttemptAllowsPublication("older", approved)).toBe(false);
  expect(manualAttemptAllowsPublication("current", { ...approved, status: "PENDING_REVIEW" })).toBe(false);
  expect(manualAttemptAllowsPublication("current", null)).toBe(false);
});

test("modo de produção exige banco e Storage exclusivos da ELITE MODELL", () => {
  const id = "jgvmpbrsxegwkrgjncsv";
  const api = "https://" + id + ".supabase.co";
  const wrongDB = "postgresql://test@127.0.0.1/test";
  const pool = "postgresql://postgres." + id + "@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
  expect(identityTargetsProduction(api, pool)).toBe(true);
  expect(identityTargetsProduction(api, wrongDB)).toBe(false);
  expect(identityTargetsProduction("https://jbdshpbtqspzfzjngqbg.supabase.co", pool)).toBe(false);
  expect(identityTargetsProduction(api)).toBe(false);
});

test("reserva da Didit sem sessão usa o fluxo manual e preserva sessões históricas", () => {
  const db = "postgresql://postgres@db.jgvmpbrsxegwkrgjncsv.supabase.co/postgres";
  const config = {
    NODE_ENV: "production", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main",
    NEXT_PUBLIC_SUPABASE_URL: "https://jgvmpbrsxegwkrgjncsv.supabase.co",
    DATABASE_URL: db, DIRECT_URL: db,
  };
  const before = Object.entries(config).map(([key]) => [key, process.env[key]] as const);
  Object.assign(process.env, config);
  try {
    const reservation = { kycProvider: "DIDIT", kycStatus: "PENDING", verificationUrl: "didit:creating:synthetic:123" };
    expect(shouldReviewRegistrationManually(reservation)).toBe(true);
    expect(shouldReviewRegistrationManually({ ...reservation, kycSessionId: "existing-session" })).toBe(false);
    expect(shouldReviewRegistrationManually(reservation, "existing-account-session")).toBe(false);
    expect(shouldReviewRegistrationManually({ ...reservation, kycStatus: "APPROVED" })).toBe(false);
    expect(shouldReviewRegistrationManually({ ...reservation, verified: true })).toBe(false);
    delete process.env.DIRECT_URL;
    expect(identityEnabled()).toBe(true);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(identityEnabled()).toBe(true);
    process.env.VERCEL_GIT_COMMIT_REF = "preview";
    expect(identityEnabled()).toBe(false);
    expect(manualIdentitySelected()).toBe(true);
  } finally {
    for (const [key, value] of before) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

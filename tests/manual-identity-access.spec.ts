import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import ts from "typescript";
import { isManualIdentityStorageObject, manualIdentityObjectPath } from "../src/lib/manual-identity-policy";

const attemptId = "a".repeat(64);
const manualPath = manualIdentityObjectPath(attemptId, "front");
const params = { params: Promise.resolve({ id: "synthetic" }) };
const json = (value: unknown, options?: ResponseInit) => Response.json(value, options);

function route(path: string, dependencies: Record<string, unknown>) {
  const source = ts.transpileModule(readFileSync("src/app/api/" + path + "/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, (...args: unknown[]) => Promise<Response>> = {};
  const modules: Record<string, unknown> = {
        "next/server": { NextResponse: { json }, after: () => undefined },
    "next/cache": { revalidatePath: () => undefined },
    "@/lib/manual-identity-runtime": { identityRuntimeEnabled: async () => true },
    "@/lib/manual-identity-policy": {
      identityEnabled: () => true,
      identityParts: () => ["front", "back", "portrait"],
      isManualIdentityStorageObject,
      shouldReviewRegistrationManually: (profile: { kycProvider?: string }) => profile.kycProvider === "MANUAL_DOCUMENT",
    },
    ...dependencies,
  };
  new Function("exports", "require", source)(exports, (name: string) => modules[name] ?? {});
  return exports;
}

test("prefixo documental reserva somente os objetos manuais no bucket de documentos", () => {
  expect(isManualIdentityStorageObject("documentos", manualPath)).toBe(true);
  expect(isManualIdentityStorageObject("documentos", "documentos/legado/frente.jpg")).toBe(false);
  expect(isManualIdentityStorageObject("approved-media", manualPath)).toBe(false);
  expect(() => manualIdentityObjectPath("../legacy", "front")).toThrow();
});

test("a rota genérica de mídia recusa evidência manual mesmo para a titular", async () => {
  const generic = route("media/[id]", {
    "@/lib/adult-content-access": { authorizeAdultContentRequest: async () => ({ ok: true, session: { user: { id: "owner" } } }) },
    "@/lib/prisma": { prisma: { uploadAsset: { findUnique: async () => ({ userId: "owner", status: "APPROVED", visibility: "PUBLIC", approvedBucket: "documentos", approvedPath: manualPath }) } } },
    "@/lib/age-gate-policy": { ageGateCacheHeaders: () => ({ "Cache-Control": "private, no-store" }) },
    "@/lib/security": { enforceRateLimitAsync: async () => null, getClientIP: () => "127.0.0.1" },
    "@/lib/media-security": { evaluateMediaPublicationGates: () => { throw new Error("Evidência manual alcançou a mídia genérica"); } },
  });
  const response = await generic.GET(new Request("http://localhost/api/media/synthetic"), params);
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toMatch(/no-store/);
});

test("prévia de moderação genérica não entrega evidência manual", async () => {
  const admin = route("admin/uploads/[id]/preview", {
    "@/lib/admin-access": { authorizeAdminRequest: async () => ({ ok: true }) },
    "@/lib/prisma": { prisma: { uploadAsset: { findUnique: async () => ({ approvedBucket: "documentos", approvedPath: manualPath }) } } },
    "@/lib/supabase-server": { createSupabaseServerClient: () => { throw new Error("Evidência manual alcançou o Storage"); } },
  });
  expect((await admin.GET(new Request("http://localhost"), params)).status).toBe(404);
});

test("evidência documental exige kyc:review e a resposta autenticada não entrega link do Storage", async () => {
  const request = new Request("http://localhost/api/admin/kyc/manual?id=" + attemptId + "&part=front");
  const permissionCalls: string[] = [];
  let authorizationStatus = 401;
  let reads = 0;
  let audits = 0;
  const manual = route("admin/kyc/manual", {
    "@/lib/admin-access": { authorizeAdminRequest: async (permission: string) => {
      permissionCalls.push(permission);
      return authorizationStatus === 200 ? { ok: true, session: { user: { id: "reviewer" } } } : { ok: false, status: authorizationStatus };
    } },
    "@/lib/prisma": { prisma: {
      manualIdentityAttempt: { findUnique: async () => ({ submittedAt: new Date(), purgeAfter: new Date(Date.now() + 60_000) }) },
      auditLog: { create: async () => { audits++; } },
    } },
    "@/lib/manual-identity": {
      assertPrivateIdentityBucket: async () => {},
      identityBucket: "documentos",
      identityPath: manualIdentityObjectPath,
      identityStorage: { download: async (bucket: string, path: string) => {
        expect([bucket, path]).toEqual(["documentos", manualPath]);
        reads++;
        return Uint8Array.from([255, 216, 255, 217]);
      } },
      privateIdentityHeaders: { "Cache-Control": "private, no-store" },
    },
  });
  expect((await manual.GET(request)).status).toBe(401);
  authorizationStatus = 403;
  expect((await manual.GET(request)).status).toBe(403);
  expect(reads).toBe(0);
  authorizationStatus = 200;
  const response = await manual.GET(request);
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("cache-control")).toMatch(/no-store/);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([255, 216, 255, 217]));
  expect([reads, audits, permissionCalls]).toEqual([1, 1, ["kyc:review", "kyc:review", "kyc:review"]]);
});

test("aprovação legada audita somente o documento e não aprova KYC nem ativa o perfil", async () => {
  const state = { userId: "owner", kycProvider: "DIDIT", kycStatus: "PENDING", status: "PENDING_REVIEW", docStatus: "PENDING", verified: false };
  const updates: unknown[] = [];
  const database = {
    $executeRaw: async () => {},
    professional: {
      findUnique: async () => ({ ...state }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { ...state, ...data };
      },
    },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { expect(data.action).toBe("ADMIN_ACCESS"); } },
  };
  let allowed = false;
  const legacy = route("admin/professionals/[id]/verify-docs", {
    "@/lib/admin-access": { authorizeAdminRequest: async (permission: string) => {
      expect(permission).toBe("kyc:review");
      return allowed ? { ok: true, session: { user: { id: "reviewer" } } } : { ok: false, status: 403 };
    } },
    "@/lib/prisma": { prisma: { $transaction: (fn: (db: typeof database) => unknown) => fn(database) } },
    "@/lib/security": { getClientIP: () => "127.0.0.1" },
  });
  const approve = () => legacy.POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "APPROVE" }) }), params);
  expect((await approve()).status).toBe(403);
  allowed = true;
  const response = await approve();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ status: "PENDING_REVIEW", kycStatus: "PENDING", verified: false });
  state.kycProvider = "MANUAL_DOCUMENT";
  expect((await approve()).status).toBe(409);
  expect(updates).toEqual([{ docStatus: "APPROVED" }]);
});

test("aprovação manual atualiza apenas identidade e encaminha as outras travas ao publicador", async () => {
  const updates: unknown[] = [];
  const audits: unknown[] = [];
  const reevaluations: unknown[] = [];
  const notifications: unknown[] = [];
  const afterResponse: Array<() => Promise<void>> = [];
  const emails: unknown[] = [];
  let linkedProfile = false;
  const attempt = {
    id: attemptId, userId: "owner", reviewVersion: 0, status: "PENDING_REVIEW",
    purgeAfter: new Date(Date.now() + 60_000), purgedAt: null,
  };
  const tx = {
    $executeRaw: async () => {},
    manualIdentityAttempt: {
      findUnique: async () => attempt,
      findFirst: async () => attempt,
      update: async () => ({}),
    },
    professional: { updateMany: async ({ data }: { data: unknown }) => { if (linkedProfile) updates.push(data); return { count: linkedProfile ? 1 : 0 }; } },
    user: { findUnique: async () => ({ blocked: false }) },
    notification: { create: async ({ data }: { data: unknown }) => { notifications.push(data); } },
    auditLog: { create: async ({ data }: { data: unknown }) => { audits.push(data); } },
  };
  const manual = route("admin/kyc/manual", {
    "next/server": { after: (callback: () => Promise<void>) => afterResponse.push(callback) },
    "@/lib/auth-email": { sendManualIdentityEmail: async (message: unknown) => { emails.push(message); } },
    "@/lib/admin-access": { authorizeAdminRequest: async () => ({ ok: true, session: { user: { id: "reviewer" } } }) },
    "@/lib/manual-identity-policy": {
      identityEnabled: () => true, confirmedAdult: () => true, identityParts: () => ["front"],
      MANUAL_DOCUMENT_PROVIDER: "MANUAL_DOCUMENT",
    },
    "@/lib/manual-identity": {
      sameIdentityOrigin: () => true, assertPrivateIdentityBucket: async () => {},
      identityBucket: "documentos", identityPath: manualIdentityObjectPath,
      identityStorage: { exists: async () => true }, privateIdentityHeaders: {},
    },
    "@/lib/prisma": { prisma: {
      $transaction: (fn: (db: typeof tx) => unknown) => fn(tx),
      professional: { findFirst: async () => ({ id: "profile" }) },
      user: { findUnique: async () => ({ email: "synthetic@example.invalid", emailVerified: true, professional: { id: "profile" } }) },
    } },
    "@/lib/professional-auto-publication": {
      attemptAutomaticProfessionalPublication: async (...args: unknown[]) => {
        reevaluations.push(args);
        return { published: false, blockers: [{ code: "main_photo_security" }] };
      },
    },
  });
  const approve = (version: number) => manual.PATCH(new Request("http://localhost", {
    method: "PATCH",
    body: JSON.stringify({
      id: attemptId, version, status: "APPROVED", reason: "Amostra verificada",
      confirmed: true, birth: "2000-01-01", checks: { document: true, portrait: true, challenge: true },
    }),
  }));
  expect((await approve(1)).status).toBe(409);
  expect(updates).toEqual([]);
  const unlinked = await approve(0);
  expect(unlinked.status).toBe(409);
  expect(await unlinked.json()).toEqual({ error: expect.stringContaining("não está vinculada") });
  expect(audits).toHaveLength(0);
  expect(afterResponse).toHaveLength(0);
  linkedProfile = true;
  expect((await approve(0)).status).toBe(200);
  expect(updates).toEqual([{ kycStatus: "APPROVED", docStatus: "APPROVED", verifStatus: "APPROVED" }]);
  expect(audits).toHaveLength(1);
  expect(notifications).toEqual([expect.objectContaining({ userId: "owner", link: "/profissional/identidade" })]);
  expect(reevaluations).toEqual([["profile", "manual-document-approved"]]);
  expect(afterResponse).toHaveLength(1);
  await afterResponse[0]();
  expect(emails).toEqual([expect.objectContaining({ attemptId, event: "approved", reviewVersion: 1, professionalId: "profile" })]);
});

import { expect, test } from "@playwright/test";
import { rejects } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function fixture(overrides: Record<string, unknown> = {}) {
  let row = {
    id: "test-photo", status: "QUARANTINED", moderationStatus: "PENDING", adminReviewStatus: "PENDING",
    updatedAt: new Date(0), category: "image", folder: "profiles/main", userId: "test-owner",
    extension: "jpg", detectedMimeType: "image/jpeg", storageProvider: "SUPABASE",
    quarantineBucket: "private-quarantine", quarantinePath: "test-original.jpg",
    malwareStatus: "IMAGE_REENCODED", ageIdentityStatus: "PASS", consentStatus: "PASS",
    owner: { blocked: false, professional: null }, depictedPeople: [],
    ...overrides,
  };
  const events: unknown[] = [];
  const objects = new Set<string>();
  let failStorage = false;
  let loseResponse = false;
  let serial = Promise.resolve();
  const prisma = {
    uploadAsset: {
      findUniqueOrThrow: async () => ({ ...row }),
      findUnique: async () => ({ ...row }),
      updateMany: async ({ where, data }: { where: { status: string; updatedAt: Date }; data: typeof row }) => {
        if (row.status !== where.status || row.updatedAt !== where.updatedAt) return { count: 0 };
        row = { ...row, ...data, updatedAt: new Date(row.updatedAt.getTime() + 1) };
        return { count: 1 };
      },
    },
    professional: { findUnique: async () => null },
    report: { findFirst: async () => null },
    auditLog: { create: async (event: unknown) => { events.push(event); } },
    $transaction: (cb: (tx: unknown) => Promise<unknown>) => {
      const result = serial.then(() => cb(prisma));
      serial = result.then(() => {}, () => {});
      return result.then((value) => {
        if (loseResponse) throw new Error("Connection lost after commit");
        return value;
      });
    },
  };
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "node:crypto": require("node:crypto"),
    "@/lib/prisma": { prisma },
    "@/lib/manual-media-review": { manualMediaReviewBlockers: () => [] },
    "@/lib/media-security": {
      PROFILE_IMAGE_REENCODED: "IMAGE_REENCODED",
      evaluateMediaPublicationGates: ({ consentStatus }: { consentStatus: string }) => ({ publishable: consentStatus === "PASS" }),
    },
    "@/lib/media-storage": { getMediaStorageProvider: () => ({
      name: "SUPABASE",
      download: async () => Buffer.from("synthetic"),
      upload: async ({ path }: { path: string }) => {
        if (failStorage) throw new Error("Storage unavailable");
        objects.add(path);
      },
      delete: async (_bucket: string, path: string) => { objects.delete(path); },
    }) },
    "@/lib/supabase-server": { createSupabaseServerClient: () => ({
      storage: { getBucket: async () => ({ data: { public: false } }) },
    }) },
  };
  const source = readFileSync("src/lib/upload-quarantine.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {} as typeof import("../src/lib/upload-quarantine");
  runInNewContext(code, { exports, require: (id: string) => mocks[id] ?? {}, process: { env: {} }, Date });
  return {
    ...exports, events, objects, row: () => row,
    failStorage: () => { failStorage = true; },
    loseResponse: () => { loseResponse = true; },
  };
}

const id = "test-photo";
const revision = new Date(0).toISOString();

test("approval rereads the committed state and a repeat preserves the first audit", async () => {
  const f = fixture();
  expect((await f.approveUploadAsset(id, "first", "reviewed", revision)).status).toBe("APPROVED");
  expect((await f.approveUploadAsset(id, "second", "repeat", revision)).reviewedById).toBe("first");
  expect(f.events).toHaveLength(1);
  expect(f.objects.size).toBe(1);
});

test("simultaneous approvals retain exactly one audit and private object", async () => {
  const f = fixture();
  const results = await Promise.all(["first", "second"].map((actor) => f.approveUploadAsset(id, actor, "reviewed", revision)));
  expect(results.map((result) => result.status)).toEqual(["APPROVED", "APPROVED"]);
  expect(f.events).toHaveLength(1);
  expect(f.objects.size).toBe(1);
});

test("a lost database acknowledgement preserves a committed approval and object", async () => {
  const f = fixture();
  f.loseResponse();
  expect((await f.approveUploadAsset(id, "first", "reviewed", revision)).status).toBe("APPROVED");
  expect(f.events).toHaveLength(1);
  expect(f.objects.size).toBe(1);
});

test("storage failure leaves the decision pending without an audit of approval", async () => {
  const f = fixture();
  f.failStorage();
  await rejects(async () => f.approveUploadAsset(id, "first", "reviewed", revision), /Storage unavailable/);
  expect(f.row().status).toBe("QUARANTINED");
  expect(f.events).toHaveLength(0);
});

test("rejection is repeatable and an old approval cannot replace it", async () => {
  const f = fixture();
  await f.rejectUploadAsset(id, "first", "reason", revision);
  await f.rejectUploadAsset(id, "second", "repeat", revision);
  await rejects(async () => f.approveUploadAsset(id, "second", "reviewed", revision), /rejeitada/);
  expect(f.row().status).toBe("REJECTED");
  expect(f.events).toHaveLength(1);
});

test("escalation invalidates an already open approval form", async () => {
  const f = fixture();
  await f.escalateUploadAsset(id, "first", "reason", revision);
  await rejects(async () => f.approveUploadAsset(id, "second", "reviewed", revision), /mídia mudou/);
  expect(f.row().moderationStatus).toBe("ESCALATED");
  expect(f.events).toHaveLength(1);
});

test("missing consent prevents transfer to approved storage", async () => {
  const f = fixture({ consentStatus: "PENDING" });
  await rejects(async () => f.approveUploadAsset(id, "first", "reviewed"), /controles obrigatórios/);
  expect(f.objects.size).toBe(0);
  expect(f.events).toHaveLength(0);
});

function loadQueueActions(options: { denied?: boolean; rejectId?: string; detailStatus?: "APPROVED" | "REJECTED" | "ESCALATED" } = {}) {
  const approved: string[] = [];
  const revalidated: string[] = [];
  const source = readFileSync("src/app/(dashboard)/admin/moderacao/uploads/page.tsx", "utf8")
    + "\nexport { batchApproveUploads, reviewUpload };";
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const detail = {
    id, status: options.detailStatus === "ESCALATED" ? "QUARANTINED" : options.detailStatus,
    moderationStatus: options.detailStatus, owner: { id: "synthetic-owner", createdAt: new Date(0) },
    category: "image", originalName: "synthetic.jpg", updatedAt: new Date(0), createdAt: new Date(0),
    folder: "profiles/main", malwareStatus: "IMAGE_REENCODED", ageIdentityStatus: "PASS", consentStatus: "PASS",
    sizeBytes: 10, depictedPeople: [],
  };
  const mocks: Record<string, unknown> = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { default: "Link" },
    "../../_components/AdminPrimitives": { AdminHeader: "AdminHeader", AdminPanel: "AdminPanel", StatusPill: "StatusPill" },
    "./CohortBatchApproval": { CohortBatchApproval: "CohortBatchApproval", MediaReviewFields: "MediaReviewFields" },
    "@/lib/manual-media-review": { manualMediaReviewBlockers: () => [] },
    "@/lib/media-security": { PROFILE_IMAGE_REENCODED: "IMAGE_REENCODED" },
    "next/cache": { revalidatePath: (path: string) => revalidated.push(path) },
    "next/navigation": { redirect: (path: string) => { throw new Error(path); } },
    "@/lib/admin-access": { requireAdmin: async (permission: string) => {
      expect(permission).toBe("reports:manage");
      if (options.denied) throw new Error("Forbidden");
      return { session: { user: { id: "reviewer" } }, permissions: [] };
    } },
    "@/lib/prisma": { prisma: { report: { findMany: async () => [] }, uploadAsset: {
      findMany: async ({ where }: { where: { id?: string | { in: string[] } } }) => {
        if (options.detailStatus) return where.id === id ? [detail] : [];
        return typeof where.id === "object" ? where.id.in.map((assetId) => ({ id: assetId })) : [];
      },
      findFirst: async () => ({ id, category: "image", updatedAt: new Date(0) }),
    } } },
    "@/lib/upload-quarantine": { approveUploadAsset: async (assetId: string) => {
      if (assetId === options.rejectId) throw new Error("Storage unavailable");
      approved.push(assetId);
    } },
  };
  const exports = {} as Record<"batchApproveUploads" | "reviewUpload", (form: FormData) => Promise<void>> & {
    default: (input: { searchParams: Promise<{ assetId?: string }> }) => Promise<unknown>;
  };
  runInNewContext(code, { exports, require: (name: string) => mocks[name] ?? {}, console: { error() {} } });
  return { ...exports, approved, revalidated };
}

function batchForm() {
  const form = new FormData();
  for (const assetId of [id, id, "another-photo"]) {
    form.append("assetIds", assetId);
    form.set("revision:" + assetId, revision);
  }
  return form;
}

test("batch deduplicates selections, reports partial failure and refreshes the queue", async () => {
  const queue = loadQueueActions({ rejectId: "another-photo" });
  await rejects(async () => queue.batchApproveUploads(batchForm()), /confirmed=1&failed=1/);
  expect(queue.approved).toEqual([id]);
  expect(queue.revalidated).toContain("/admin/moderacao/uploads");
  expect(queue.revalidated).toContain("/admin/profissionais");
});

test("individual failure returns administrator feedback before any success", async () => {
  const queue = loadQueueActions({ rejectId: id });
  const form = new FormData();
  form.set("assetId", id);
  form.set("revision", revision);
  form.set("action", "APPROVE");
  await rejects(async () => queue.reviewUpload(form), /result=error/);
  expect(queue.approved).toHaveLength(0);
});

test("batch denies a reviewer without permission before any update", async () => {
  const queue = loadQueueActions({ denied: true });
  await rejects(async () => queue.batchApproveUploads(batchForm()), /Forbidden/);
  expect(queue.approved).toHaveLength(0);
});

test("an oversized batch returns an error before applying any decision", async () => {
  const queue = loadQueueActions();
  const form = new FormData();
  for (let index = 0; index < 51; index++) form.append("assetIds", String(index));
  await rejects(async () => queue.batchApproveUploads(form), /result=limit/);
  expect(queue.approved).toHaveLength(0);
});

test("an approved direct link stays out of the counter and batch after reloading", async () => {
  const queue = loadQueueActions({ detailStatus: "APPROVED" });
  for (let reload = 0; reload < 2; reload++) {
    const tree = await queue.default({ searchParams: Promise.resolve({ assetId: id }) });
    const rendered = JSON.stringify(tree);
    expect(rendered).toContain("Aprovação registrada.");
    expect(rendered).toContain('"type":"CohortBatchApproval","props":{"assets":[]}');
    expect(rendered).toContain('[0," mídia(s) pendente(s)');
    expect(rendered).not.toContain('"value":"APPROVE"');
    expect(rendered).not.toContain('"value":"REPROCESS"');
    expect(rendered).toContain('"value":"REJECT"');
  }
});

test("rejected and escalated details show only valid decisions after reloading", async () => {
  for (const state of ["REJECTED", "ESCALATED"] as const) {
    const queue = loadQueueActions({ detailStatus: state });
    for (let reload = 0; reload < 2; reload++) {
      const rendered = JSON.stringify(await queue.default({ searchParams: Promise.resolve({ assetId: id }) }));
      expect(rendered).not.toContain('"value":"ESCALATE"');
      if (state === "REJECTED") {
        expect(rendered).toContain("Rejeição registrada.");
        expect(rendered).not.toContain('"value":"APPROVE"');
        expect(rendered).not.toContain('"value":"REPROCESS"');
        expect(rendered).not.toContain('"value":"REJECT"');
      } else {
        expect(rendered).toContain("Mídia escalada.");
        expect(rendered).toContain('"value":"APPROVE"');
        expect(rendered).toContain('"value":"REJECT"');
      }
    }
  }
});

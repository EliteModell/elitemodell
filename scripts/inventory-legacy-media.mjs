import "dotenv/config";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const generatedAt = new Date();
const reportPath = "docs/INVENTARIO_MIDIA_ANTIGA.md";
const manifestPath = ".diagnostics/legacy-media-inventory.json";

function parseStorageUrl(value) {
  if (!value || value.startsWith("/api/media/") || value.startsWith("asset:")) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(base).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

function sensitivePath(bucket, path) {
  return /document|verif|kyc|identity/i.test(`${bucket}/${path}`);
}

function reportPathValue(bucket, path) {
  if (!sensitivePath(bucket, path)) return `${bucket}/${path}`;
  const digest = createHash("sha256").update(`${bucket}/${path}`).digest("hex").slice(0, 16);
  return `${bucket}/[REDACTED-${digest}]`;
}

function addReference(target, input) {
  const parsed = parseStorageUrl(input.url);
  if (!parsed) return;
  target.push({
    ...parsed,
    url: input.url,
    ownerId: input.ownerId ?? null,
    type: input.type,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    field: input.field,
    profileId: input.profileId ?? null,
    accountStatus: input.accountStatus ?? null,
    approvalStatus: input.approvalStatus ?? "LEGACY_UNREVIEWED",
    lastUsedAt: input.lastUsedAt ?? null,
  });
}

async function databaseReferences() {
  const [users, professionals, properties, stories, declarations] = await Promise.all([
    prisma.user.findMany({
      where: { image: { not: null } },
      select: { id: true, image: true, blocked: true, updatedAt: true },
    }),
    prisma.professional.findMany({
      select: {
        id: true,
        userId: true,
        status: true,
        verified: true,
        image: true,
        galleryUrls: true,
        presentationVideoUrl: true,
        presentationVideoStatus: true,
        docFrenteUrl: true,
        docVersoUrl: true,
        docStatus: true,
        verificationUrl: true,
        verifStatus: true,
        updatedAt: true,
        photos: { select: { id: true, url: true, createdAt: true } },
      },
    }),
    prisma.property.findMany({
      select: {
        id: true,
        hostId: true,
        status: true,
        updatedAt: true,
        photos: { select: { id: true, url: true, createdAt: true } },
      },
    }),
    prisma.story.findMany({
      select: {
        id: true,
        userId: true,
        mediaUrl: true,
        mediaType: true,
        thumbnail: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.contentDeclaration.findMany({
      select: { storageBucket: true, storagePath: true, createdAt: true, revokedAt: true },
    }).catch(() => []),
  ]);

  const refs = [];
  for (const user of users) {
    addReference(refs, {
      url: user.image,
      ownerId: user.id,
      type: "avatar",
      referenceType: "User",
      referenceId: user.id,
      field: "image",
      accountStatus: user.blocked ? "BLOCKED" : "ACTIVE",
      lastUsedAt: user.updatedAt,
    });
  }
  for (const professional of professionals) {
    const accountStatus = professional.status;
    const common = {
      ownerId: professional.userId,
      profileId: professional.id,
      accountStatus,
      referenceType: "Professional",
      referenceId: professional.id,
      lastUsedAt: professional.updatedAt,
    };
    addReference(refs, { ...common, url: professional.image, type: "profile-image", field: "image", approvalStatus: professional.verified ? "PROFILE_VERIFIED" : "LEGACY_UNREVIEWED" });
    professional.galleryUrls.forEach((url, index) => addReference(refs, { ...common, url, type: "gallery", field: `galleryUrls[${index}]` }));
    addReference(refs, { ...common, url: professional.presentationVideoUrl, type: "video", field: "presentationVideoUrl", approvalStatus: professional.presentationVideoStatus });
    addReference(refs, { ...common, url: professional.docFrenteUrl, type: "document", field: "docFrenteUrl", approvalStatus: professional.docStatus });
    addReference(refs, { ...common, url: professional.docVersoUrl, type: "document", field: "docVersoUrl", approvalStatus: professional.docStatus });
    addReference(refs, { ...common, url: professional.verificationUrl, type: "verification", field: "verificationUrl", approvalStatus: professional.verifStatus });
    professional.photos.forEach((photo) => addReference(refs, {
      ...common,
      url: photo.url,
      type: "professional-photo",
      referenceType: "ProfessionalPhoto",
      referenceId: photo.id,
      field: "url",
      lastUsedAt: photo.createdAt,
    }));
  }
  for (const property of properties) {
    property.photos.forEach((photo) => addReference(refs, {
      url: photo.url,
      ownerId: property.hostId,
      profileId: property.id,
      type: "property-photo",
      referenceType: "PropertyPhoto",
      referenceId: photo.id,
      field: "url",
      accountStatus: property.status,
      lastUsedAt: photo.createdAt ?? property.updatedAt,
    }));
  }
  for (const story of stories) {
    const common = {
      ownerId: story.userId,
      profileId: null,
      referenceType: "Story",
      referenceId: story.id,
      accountStatus: story.expiresAt > generatedAt ? "VISIBLE" : "EXPIRED",
      approvalStatus: "LEGACY_UNREVIEWED",
      lastUsedAt: story.createdAt,
    };
    addReference(refs, { ...common, url: story.mediaUrl, type: story.mediaType, field: "mediaUrl" });
    addReference(refs, { ...common, url: story.thumbnail, type: "thumbnail", field: "thumbnail" });
  }

  const declarationKeys = new Set(
    declarations
      .filter((item) => !item.revokedAt)
      .map((item) => `${item.storageBucket}:${item.storagePath}`),
  );
  return refs.map((ref) => ({
    ...ref,
    hasDeclaration: declarationKeys.has(`${ref.bucket}:${ref.path}`),
  }));
}

async function storageRequest(url, key, path, init = {}) {
  const response = await fetch(`${url}/storage/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Storage respondeu HTTP ${response.status}.`);
  }
  return payload;
}

async function listBucketObjects(url, key, bucket, prefix = "") {
  const objects = [];
  let offset = 0;
  while (true) {
    const data = await storageRequest(url, key, `/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      body: JSON.stringify({
        prefix,
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });
    for (const item of data ?? []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        objects.push({
          bucket,
          path: fullPath,
          size: item.metadata?.size ?? null,
          contentType: item.metadata?.mimetype ?? null,
          createdAt: item.created_at ?? null,
          updatedAt: item.updated_at ?? null,
        });
      } else {
        objects.push(...await listBucketObjects(url, key, bucket, fullPath));
      }
    }
    if (!data || data.length < 1000) break;
    offset += data.length;
  }
  return objects;
}

async function storageInventory() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { buckets: [], objects: [], error: "Credenciais administrativas do Storage ausentes." };
  let buckets;
  try {
    buckets = await storageRequest(url, key, "/bucket");
  } catch (cause) {
    return { buckets: [], objects: [], error: cause instanceof Error ? cause.message : String(cause) };
  }
  const objects = [];
  for (const bucket of buckets ?? []) {
    try {
      objects.push(...await listBucketObjects(url, key, bucket.name));
    } catch (cause) {
      objects.push({
        bucket: bucket.name,
        path: "[LIST_ERROR]",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }
  return {
    buckets: (buckets ?? []).map((bucket) => ({ name: bucket.name, public: bucket.public })),
    objects,
    error: null,
  };
}

function countBy(items, key) {
  return [...items.reduce((map, item) => {
    const value = String(item[key] ?? "UNKNOWN");
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1]);
}

function markdownTable(rows) {
  if (!rows.length) return "_Nenhuma referencia legada encontrada._";
  return [
    "| Caminho | Tipo | Visibilidade | Conta/perfil | Aprovacao | Declaracao | Ultimo uso | Acao proposta |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${reportPathValue(row.bucket, row.path)} | ${row.type} | ${row.visibility} | ${row.accountStatus ?? "-"} | ${row.approvalStatus} | ${row.hasDeclaration ? "sim" : "nao"} | ${row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : "-"} | ${row.proposedAction} |`),
  ].join("\n");
}

async function main() {
  const [references, storage] = await Promise.all([databaseReferences(), storageInventory()]);
  const bucketVisibility = new Map(storage.buckets.map((bucket) => [bucket.name, bucket.public ? "PUBLIC" : "PRIVATE"]));
  const referencedKeys = new Set(references.map((ref) => `${ref.bucket}:${ref.path}`));
  const enriched = references.map((ref) => {
    const visibility = bucketVisibility.get(ref.bucket) ?? "UNKNOWN";
    const inactive = ["SUSPENDED", "REJECTED", "INACTIVE", "BLOCKED", "EXPIRED"].includes(ref.accountStatus);
    const proposedAction = ref.approvalStatus === "LEGACY_UNREVIEWED"
      ? "QUARANTINE_AND_REVIEW"
      : inactive
        ? "RESTRICT"
        : visibility === "PUBLIC"
          ? "MIGRATE_TO_CONTROLLED_URL"
          : "VERIFY_PRIVATE_ACCESS";
    return { ...ref, visibility, proposedAction };
  });
  const orphans = storage.objects
    .filter((object) => object.path !== "[LIST_ERROR]" && !referencedKeys.has(`${object.bucket}:${object.path}`))
    .map((object) => ({ ...object, proposedAction: "ORPHAN_REVIEW_BEFORE_DELETE" }));

  const manifest = {
    generatedAt: generatedAt.toISOString(),
    mode: "READ_ONLY",
    storageError: storage.error,
    buckets: storage.buckets,
    references: enriched,
    orphanCandidates: orphans,
  };
  await mkdir(".diagnostics", { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const publicReferences = enriched.filter((item) => item.visibility === "PUBLIC");
  const unreviewed = enriched.filter((item) => item.approvalStatus === "LEGACY_UNREVIEWED");
  const restrictedAccounts = enriched.filter((item) => ["SUSPENDED", "REJECTED", "INACTIVE", "BLOCKED", "EXPIRED"].includes(item.accountStatus));
  const report = `# Inventario de midia antiga

Gerado em: ${generatedAt.toISOString()}

Modo: **somente leitura**. Nenhum arquivo, URL, cache ou registro foi alterado.

## Resumo

- Referencias legadas no banco: **${enriched.length}**
- Referencias em bucket publico: **${publicReferences.length}**
- Referencias sem aprovacao individual comprovada: **${unreviewed.length}**
- Referencias de conta/perfil restrito ou expirado: **${restrictedAccounts.length}**
- Objetos candidatos a orfao no Storage: **${orphans.length}**
- Erro de leitura do Storage: **${storage.error ?? "nenhum"}**

O manifesto detalhado, incluindo caminhos sensiveis, foi salvo localmente em \`${manifestPath}\` e nao deve ser commitado nem enviado a terceiros sem base legal e controle de acesso.

## Buckets

${storage.buckets.length ? storage.buckets.map((bucket) => `- \`${bucket.name}\`: ${bucket.public ? "PUBLICO" : "PRIVADO"}`).join("\n") : "- Nao foi possivel enumerar buckets."}

## Contagens por tipo

${countBy(enriched, "type").map(([name, count]) => `- ${name}: ${count}`).join("\n") || "- nenhuma"}

## Contagens por acao proposta

${countBy(enriched, "proposedAction").map(([name, count]) => `- ${name}: ${count}`).join("\n") || "- nenhuma"}

## Referencias

${markdownTable(enriched.slice(0, 500))}

${enriched.length > 500 ? `\nA tabela foi limitada a 500 linhas. O manifesto local contem ${enriched.length} referencias.\n` : ""}

## Plano seguro de migracao

1. Importar cada objeto para \`upload-quarantine\` privado, preservando hash e referencia de origem.
2. Remover a referencia publica da interface enquanto o item estiver pendente.
3. Executar antimalware e moderacao; documentos permanecem privados e exigem controle KYC.
4. Promover aprovados para \`approved-media\` privado e substituir a URL por \`/api/media/{assetId}\`.
5. Manter manifesto de rollback por campo e registro.
6. Invalidar cache somente depois da troca da referencia.
7. Excluir o objeto antigo apenas depois de hash, copia privada, atualizacao e verificacao.
8. Objetos orfaos exigem segunda varredura e aprovacao administrativa antes de exclusao.

## Estado de execucao

A migracao **nao foi executada**, pois depende de aprovacao tecnica do inventario, migrations novas aplicadas e janela de homologacao. Isso evita exclusao ou indisponibilidade em massa sem rollback.
`;
  await writeFile(reportPath, report, "utf8");
  console.log(JSON.stringify({
    reportPath,
    manifestPath,
    references: enriched.length,
    publicReferences: publicReferences.length,
    unreviewed: unreviewed.length,
    restrictedAccounts: restrictedAccounts.length,
    orphanCandidates: orphans.length,
    storageError: storage.error,
  }, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });

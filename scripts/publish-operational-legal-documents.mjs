import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { PrismaClient } from "@prisma/client";

const OPERATIONAL_STATUS =
  "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION";
const INTERNAL_STATUS = "DRAFT_INTERNAL";
const VERSION =
  process.env.LEGAL_DOCUMENT_VERSION ?? "1.0-operational-2026-06-11";
const SOURCE_PATH = path.join(
  process.cwd(),
  "docs",
  "PACOTE_FINAL_PUBLICACAO_ELITEMODELL_V1_2026-06-11.md",
);
const OPERATIONAL_PUBLISHER = "BRUNO MORAES DA ROCHA";
const LEGAL_REPRESENTATIVE = "Larissa de Campos Lacerda Souza";
const EFFECTIVE_AT = new Date("2026-06-11T12:00:00.000Z");
const DRY_RUN = process.env.LEGAL_PUBLISH_DRY_RUN === "1";
const DATABASE_SCHEMA =
  new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema") ??
  "public";
const PRODUCTION_CONFIRMED =
  process.env.LEGAL_PUBLISH_CONFIRM_PRODUCTION === "1";
const ALLOWED_SCHEMAS = new Set(["public", "homolog_legal_20260611"]);
const AUDIT_TARGET =
  DATABASE_SCHEMA === "public"
    ? "production-legal-publication-2026-06-11"
    : "operational-legal-publication-2026-06-11";

const prisma = new PrismaClient();

function contentHash(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function metadataValue(content, label) {
  const match = content.match(
    new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+?)\\s*$`, "mi"),
  );
  return match?.[1]?.replace(/`/g, "").trim() ?? "";
}

function audienceForKey(key) {
  if (key === "terms-clients") return "Cliente";
  if (
    ["terms-professionals", "boost-terms", "professional-free-period"].includes(
      key,
    )
  ) {
    return "Profissional";
  }
  if (key === "terms-hosts") return "Anfitriao";
  if (
    [
      "identity-biometric-policy",
      "biometric-notice",
      "document-upload-notice",
    ].includes(key)
  ) {
    return "Anunciante";
  }
  if (
    [
      "content-authorization-declaration",
      "content-publication-notice",
    ].includes(key)
  ) {
    return "Publicador";
  }
  if (key === "checkout-notice") return "Comprador";
  if (key === "roleta-promocional-policy") {
    return "Participantes da roleta";
  }
  if (
    [
      "incident-response-plan",
      "access-control-policy",
      "information-security-policy",
      "admin-moderator-policy",
      "operator-agreement-template",
      "privacy-officer-appointment-act",
    ].includes(key)
  ) {
    return "Interno";
  }
  return "Todos";
}

function parseDocuments(markdown) {
  const headings = [...markdown.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];
  const controlMatch = /^## Controle da vers.*$/m.exec(markdown);

  return headings.map((heading, index) => {
    const start = heading.index;
    const end =
      headings[index + 1]?.index ??
      (controlMatch?.index && controlMatch.index > start
        ? controlMatch.index
        : markdown.length);
    const rawContent = markdown.slice(start, end).trim();
    const key = metadataValue(rawContent, "Chave");
    const visibility = metadataValue(rawContent, "Documento");
    if (!key || !visibility) {
      throw new Error(`Metadados incompletos na minuta ${heading[1]}.`);
    }

    return {
      order: Number(heading[1]),
      key,
      title: heading[2].trim(),
      audience: audienceForKey(key),
      internal: visibility.toLowerCase() === "interno",
      content: rawContent,
    };
  });
}

function documentType(key) {
  if (key.includes("roleta-promocional")) return "PROMOTION";
  if (key.includes("privacy") || key.includes("data-subject")) {
    return "PRIVACY";
  }
  if (key.includes("cookie")) return "COOKIES";
  if (key.includes("payment") || key.includes("checkout")) return "PAYMENTS";
  if (key.includes("refund")) return "REFUNDS";
  if (key.includes("content")) return "CONTENT";
  if (key.includes("moderation") || key.includes("community")) {
    return "MODERATION";
  }
  if (
    key.includes("biometric") ||
    key.includes("identity") ||
    key.includes("document")
  ) {
    return "KYC";
  }
  if (key.includes("adult")) return "SAFETY";
  if (
    key.includes("security") ||
    key.includes("incident") ||
    key.includes("access-control")
  ) {
    return "SECURITY";
  }
  return "TERMS";
}

function applicableChannel(key) {
  if (
    key.includes("privacy") ||
    key.includes("data-subject") ||
    key.includes("retention")
  ) {
    return "privacidade@elitemodell.com.br";
  }
  if (
    key.includes("payment") ||
    key.includes("checkout") ||
    key.includes("refund")
  ) {
    return "financeiro@elitemodell.com.br";
  }
  if (
    key.includes("security") ||
    key.includes("incident") ||
    key.includes("moderation")
  ) {
    return "seguranca@elitemodell.com.br";
  }
  return "suporte@elitemodell.com.br";
}

function versionData(entry) {
  return {
    content: entry.content,
    contentHash: contentHash(entry.content),
    changeSummary: entry.internal
      ? "Minuta interna completa preparada para ratificacao juridica."
      : "Versao operacional da empresa, pendente de ratificacao juridica final.",
    status: entry.internal ? INTERNAL_STATUS : OPERATIONAL_STATUS,
    pendingFields: entry.internal
      ? ["LEGAL_RATIFICATION_PENDING", "SIGNATURE_PENDING"]
      : ["LEGAL_RATIFICATION_PENDING", "COMPANY_FINAL_APPROVAL_PENDING"],
    requiresNewAcceptance: !entry.internal,
    publishedAt: entry.internal ? null : EFFECTIVE_AT,
    effectiveAt: entry.internal ? null : EFFECTIVE_AT,
    approvedAt: null,
    approverId: null,
    legalReviewerName: null,
    legalReviewNote: null,
    legalReviewReference: null,
    operationalPublisherName: entry.internal ? null : OPERATIONAL_PUBLISHER,
    legalRepresentativeName: LEGAL_REPRESENTATIVE,
    applicableChannel: applicableChannel(entry.key),
    operationalPublicationNote: entry.internal
      ? "Uso interno. Nao expor ao publico."
      : "Publicacao operacional autorizada para producao. A ratificacao ou assinatura juridica formal podera ser registrada em nova versao.",
  };
}

function validatePackage(documents) {
  if (documents.length !== 32) {
    throw new Error(`Esperadas 32 minutas, encontradas ${documents.length}.`);
  }
  const uniqueKeys = new Set(documents.map((document) => document.key));
  const publicDocuments = documents.filter((document) => !document.internal);
  const internalDocuments = documents.filter((document) => document.internal);
  if (uniqueKeys.size !== documents.length) {
    throw new Error("O pacote final contem chaves juridicas duplicadas.");
  }
  if (publicDocuments.length !== 26 || internalDocuments.length !== 6) {
    throw new Error(
      `Esperados 26 documentos publicos e 6 internos; encontrados ${publicDocuments.length}/${internalDocuments.length}.`,
    );
  }
  return { publicDocuments, internalDocuments };
}

async function main() {
  if (!ALLOWED_SCHEMAS.has(DATABASE_SCHEMA)) {
    throw new Error(`Publicacao juridica recusada no schema ${DATABASE_SCHEMA}.`);
  }
  if (!DRY_RUN && DATABASE_SCHEMA === "public" && !PRODUCTION_CONFIRMED) {
    throw new Error(
      "Publicacao no schema public exige LEGAL_PUBLISH_CONFIRM_PRODUCTION=1.",
    );
  }

  const markdown = await fs.readFile(SOURCE_PATH, "utf8");
  const documents = parseDocuments(markdown);
  const { publicDocuments, internalDocuments } = validatePackage(documents);

  if (DRY_RUN) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          schema: DATABASE_SCHEMA,
          source: SOURCE_PATH,
          version: VERSION,
          status: OPERATIONAL_STATUS,
          documents: documents.length,
          publicDocuments: publicDocuments.length,
          internalDocuments: internalDocuments.length,
          keys: documents.map((document) => document.key),
        },
        null,
        2,
      ),
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const entry of documents) {
      const document = await tx.legalDocument.upsert({
        where: { key: entry.key },
        create: {
          key: entry.key,
          name: entry.title,
          type: documentType(entry.key),
          audience: entry.audience,
          internal: entry.internal,
        },
        update: {
          name: entry.title,
          type: documentType(entry.key),
          audience: entry.audience,
          internal: entry.internal,
        },
      });

      const expected = versionData(entry);
      const existing = await tx.legalDocumentVersion.findUnique({
        where: {
          documentId_language_version: {
            documentId: document.id,
            language: "pt-BR",
            version: VERSION,
          },
        },
      });

      if (!existing) {
        await tx.legalDocumentVersion.create({
          data: {
            documentId: document.id,
            language: "pt-BR",
            version: VERSION,
            ...expected,
          },
        });
      } else if (entry.internal) {
        await tx.legalDocumentVersion.update({
          where: { id: existing.id },
          data: expected,
        });
      } else if (
        existing.contentHash !== expected.contentHash ||
        existing.status !== expected.status
      ) {
        throw new Error(
          `A versao publica imutavel ${entry.key}/${VERSION} diverge do pacote final. Gere uma nova versao.`,
        );
      }
    }

    const existingAudit = await tx.auditLog.findFirst({
      where: { targetId: AUDIT_TARGET, action: "SETTINGS_CHANGED" },
      select: { id: true },
    });
    if (!existingAudit) {
      await tx.auditLog.create({
        data: {
          actorIdentifier: OPERATIONAL_PUBLISHER,
          action: "SETTINGS_CHANGED",
          targetType: "SYSTEM",
          targetId: AUDIT_TARGET,
          reason:
            "Publicacao operacional autorizada: 26 documentos publicos e 6 documentos internos.",
          changes: {
            status: OPERATIONAL_STATUS,
            publicDocuments: 26,
            internalDocuments: 6,
            version: VERSION,
            schema: DATABASE_SCHEMA,
          },
        },
      });
    }
  });

  const grouped = await prisma.legalDocumentVersion.groupBy({
    by: ["status"],
    where: { version: VERSION },
    _count: { _all: true },
  });
  console.log(
    JSON.stringify(
      {
        schema: DATABASE_SCHEMA,
        documents: await prisma.legalDocument.count(),
        version: VERSION,
        grouped,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

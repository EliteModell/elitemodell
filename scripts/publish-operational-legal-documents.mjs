import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { PrismaClient } from "@prisma/client";

const OPERATIONAL_STATUS =
  "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION";
const INTERNAL_STATUS = "DRAFT_INTERNAL";
const VERSION = "1.0-operational-2026-06-11";
const SOURCE_PATH = path.join(
  process.cwd(),
  "docs",
  "PACOTE_COMPLETO_31_MINUTAS_PARA_REVISAO_E_ASSINATURA_2026-06-11.md",
);
const OPERATIONAL_PUBLISHER = "BRUNO MORAES DA ROCHA";
const LEGAL_REPRESENTATIVE = "Larissa de Campos Lacerda Souza";
const EFFECTIVE_AT = new Date("2026-06-11T12:00:00.000Z");

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

function isInternal(content) {
  return /Documento público ou interno:\*\*\s*interno/i.test(content);
}

function normalizeContent(content, internal) {
  const status = internal
    ? "DOCUMENTO INTERNO - PENDENTE DE RATIFICAÇÃO JURÍDICA FINAL"
    : "VERSÃO OPERACIONAL DA EMPRESA - PENDENTE DE RATIFICAÇÃO JURÍDICA FINAL";
  return content
    .replace(
      /^\*\*Status:\*\*\s*.+$/gim,
      `**Status:** ${status}`,
    )
    .replace(
      /^Status:\s*.+$/gim,
      `Status: ${status}`,
    )
    .trim();
}

function parseDocuments(markdown) {
  const headingPattern = /^##\s+(\d+)\.\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingPattern)];

  return headings.map((heading, index) => {
    const start = heading.index;
    const end = headings[index + 1]?.index ?? markdown.indexOf(
      "\n## Checklist final para a advogada",
      start,
    );
    const rawContent = markdown.slice(start, end > start ? end : undefined).trim();
    const key = metadataValue(rawContent, "Chave técnica");
    const audience = metadataValue(rawContent, "Público");
    const internal = isInternal(rawContent);

    if (!key || !audience) {
      throw new Error(`Metadados incompletos na minuta ${heading[1]}`);
    }

    return {
      order: Number(heading[1]),
      key,
      title: heading[2].trim(),
      audience,
      internal,
      content: normalizeContent(rawContent, internal),
    };
  });
}

function documentType(key) {
  if (key.includes("privacy") || key.includes("data-subject")) return "PRIVACY";
  if (key.includes("cookie")) return "COOKIES";
  if (key.includes("payment") || key.includes("checkout")) return "PAYMENTS";
  if (key.includes("refund")) return "REFUNDS";
  if (key.includes("content")) return "CONTENT";
  if (key.includes("moderation") || key.includes("community")) return "MODERATION";
  if (key.includes("biometric") || key.includes("identity") || key.includes("document")) return "KYC";
  if (key.includes("adult")) return "SAFETY";
  if (key.includes("security") || key.includes("incident") || key.includes("access-control")) return "SECURITY";
  return "TERMS";
}

function applicableChannel(key) {
  if (key.includes("privacy") || key.includes("data-subject") || key.includes("retention")) {
    return "privacidade@elitemodell.com.br";
  }
  if (key.includes("payment") || key.includes("checkout") || key.includes("refund")) {
    return "financeiro@elitemodell.com.br";
  }
  if (key.includes("security") || key.includes("incident") || key.includes("moderation")) {
    return "seguranca@elitemodell.com.br";
  }
  return "suporte@elitemodell.com.br";
}

async function main() {
  const markdown = await fs.readFile(SOURCE_PATH, "utf8");
  const documents = parseDocuments(markdown);
  if (documents.length !== 31) {
    throw new Error(`Esperadas 31 minutas, encontradas ${documents.length}`);
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

      await tx.legalDocumentVersion.upsert({
        where: {
          documentId_language_version: {
            documentId: document.id,
            language: "pt-BR",
            version: VERSION,
          },
        },
        create: {
          documentId: document.id,
          language: "pt-BR",
          version: VERSION,
          content: entry.content,
          contentHash: contentHash(entry.content),
          changeSummary: entry.internal
            ? "Minuta interna completa preparada para ratificação jurídica."
            : "Versão operacional da empresa, pendente de ratificação jurídica final.",
          status: entry.internal ? INTERNAL_STATUS : OPERATIONAL_STATUS,
          pendingFields: entry.internal
            ? ["LEGAL_RATIFICATION_PENDING", "SIGNATURE_PENDING"]
            : ["LEGAL_RATIFICATION_PENDING", "COMPANY_FINAL_APPROVAL_PENDING"],
          requiresNewAcceptance: !entry.internal,
          publishedAt: entry.internal ? null : EFFECTIVE_AT,
          effectiveAt: entry.internal ? null : EFFECTIVE_AT,
          approvedAt: null,
          legalReviewerName: null,
          legalReviewNote: null,
          legalReviewReference: null,
          operationalPublisherName: entry.internal ? null : OPERATIONAL_PUBLISHER,
          legalRepresentativeName: LEGAL_REPRESENTATIVE,
          applicableChannel: applicableChannel(entry.key),
          operationalPublicationNote: entry.internal
            ? "Uso interno. Não expor ao público."
            : "Publicação operacional da empresa para homologação técnica; não representa aprovação da advogada.",
        },
        update: {
          content: entry.content,
          contentHash: contentHash(entry.content),
          changeSummary: entry.internal
            ? "Minuta interna completa preparada para ratificação jurídica."
            : "Versão operacional da empresa, pendente de ratificação jurídica final.",
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
            ? "Uso interno. Não expor ao público."
            : "Publicação operacional da empresa para homologação técnica; não representa aprovação da advogada.",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorIdentifier: OPERATIONAL_PUBLISHER,
        action: "SETTINGS_CHANGED",
        targetType: "SYSTEM",
        targetId: "operational-legal-publication-2026-06-11",
        reason:
          "Persistência idempotente das 31 minutas: 25 públicas operacionais e 6 internas.",
        changes: {
          status: OPERATIONAL_STATUS,
          publicDocuments: 25,
          internalDocuments: 6,
          version: VERSION,
        },
      },
    });
  });

  const grouped = await prisma.legalDocumentVersion.groupBy({
    by: ["status"],
    where: { version: VERSION },
    _count: { _all: true },
  });
  const count = await prisma.legalDocument.count();
  console.log(JSON.stringify({ documents: count, version: VERSION, grouped }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

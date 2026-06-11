import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  LEGAL_CHANNELS,
  OPERATIONAL_LEGAL_STATUS,
  PUBLIC_LEGAL_STATUSES,
  publicLegalDocument,
} from "@/lib/legal-document-catalog";
import { prisma } from "@/lib/prisma";

export async function OperationalLegalDocumentPage({ documentKey }: { documentKey: string }) {
  const document = publicLegalDocument(documentKey);
  if (!document) notFound();

  const version = await prisma.legalDocumentVersion.findFirst({
    where: {
      status: { in: [...PUBLIC_LEGAL_STATUSES] },
      publishedAt: { not: null },
      effectiveAt: { lte: new Date() },
      document: { key: documentKey, internal: false },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main style={{ minHeight: "100vh", background: "#060607", color: "#f8fafc", padding: "72px 20px" }}>
      <section style={{ maxWidth: 920, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#d4a843", textDecoration: "none", fontWeight: 800 }}>
          Voltar para Elite Modell
        </Link>

        <div
          style={{
            marginTop: 28,
            border: "1px solid rgba(212,168,67,0.22)",
            borderRadius: 24,
            background: "linear-gradient(180deg, rgba(15,15,18,.96), rgba(7,7,9,.96))",
            padding: "32px",
            boxShadow: "0 24px 70px rgba(0,0,0,.36)",
          }}
        >
          <p style={{ margin: 0, color: "#f59e0b", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>
            {version?.status === OPERATIONAL_LEGAL_STATUS
              ? "VERSAO OPERACIONAL DA EMPRESA - PENDENTE DE RATIFICACAO JURIDICA FINAL"
              : "DOCUMENTO JURIDICO VERSIONADO"}
          </p>
          <h1 style={{ margin: "14px 0 8px", fontSize: 40, lineHeight: 1.08 }}>
            {document.title}
          </h1>
          <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.7 }}>
            Chave tecnica: <code>{document.key}</code> | Publico: {document.audience}
            {version ? ` | Versao: ${version.version}` : ""}
          </p>

          <div style={{ height: 24 }} />
          {version ? (
            <>
              <Notice title="Transparencia da versao">
                Esta e uma versao operacional publicada pela empresa para reger o uso da plataforma durante a homologacao.
                Ela ainda depende de revisao ou ratificacao juridica final e podera ser substituida por nova versao, com
                preservacao do historico e dos aceites anteriores.
              </Notice>
              <article
                style={{
                  marginTop: 24,
                  borderTop: "1px solid rgba(255,255,255,.10)",
                  paddingTop: 24,
                  color: "#d9dee8",
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {version.content}
              </article>
              <Notice title="Registro tecnico">
                Hash: <code>{version.contentHash}</code>
                <br />
                Publicacao operacional: {version.publishedAt?.toLocaleString("pt-BR")}
                <br />
                Vigencia: {version.effectiveAt?.toLocaleString("pt-BR")}
              </Notice>
            </>
          ) : (
            <Notice title="Documento indisponivel">
              Nenhuma versao operacional vigente foi encontrada. O aceite juridico fica bloqueado enquanto o documento
              nao estiver versionado, publicado e vigente.
            </Notice>
          )}
          <Notice title="Canais relacionados">
            Suporte: <a href={`mailto:${LEGAL_CHANNELS.support}`} style={linkStyle}>{LEGAL_CHANNELS.support}</a>
            <br />
            Privacidade/LGPD: <a href={`mailto:${LEGAL_CHANNELS.privacy}`} style={linkStyle}>{LEGAL_CHANNELS.privacy}</a>
            <br />
            Seguranca/incidentes/denuncias sensiveis: <a href={`mailto:${LEGAL_CHANNELS.security}`} style={linkStyle}>{LEGAL_CHANNELS.security}</a>
          </Notice>
          {version?.status === OPERATIONAL_LEGAL_STATUS ? (
            <Notice title="Ratificacao pendente">
              Esta versao nao esta marcada como LEGAL_APPROVED nem PUBLISHED_FINAL. A aprovacao juridica final continua
              pendente e qualquer ajuste sera registrado como nova versao.
            </Notice>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ borderTop: "1px solid rgba(255,255,255,.10)", paddingTop: 18, marginTop: 18 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#f5d77a" }}>{title}</h2>
      <p style={{ margin: 0, color: "#d9dee8", lineHeight: 1.7 }}>{children}</p>
    </section>
  );
}

const linkStyle: CSSProperties = {
  color: "#f5d77a",
  textDecoration: "none",
  fontWeight: 800,
};

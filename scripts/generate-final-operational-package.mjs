import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const ROOT = process.cwd();
const SOURCE = path.join(
  ROOT,
  "docs",
  "PACOTE_COMPLETO_31_MINUTAS_PARA_REVISAO_E_ASSINATURA_2026-06-11.md",
);
const ROULETTE_POLICY_SOURCE = path.join(
  ROOT,
  "docs",
  "POLITICA_ROLETA_PROMOCIONAL_V1_2026-06-11.md",
);
const OUTPUT_BASENAME =
  "PACOTE_FINAL_PUBLICACAO_ELITEMODELL_V1_2026-06-11";
const OUTPUT_MD = path.join(ROOT, "docs", `${OUTPUT_BASENAME}.md`);
const OUTPUT_DOCX = path.join(ROOT, "docs", `${OUTPUT_BASENAME}.docx`);
const OUTPUT_PDF = path.join(ROOT, "docs", `${OUTPUT_BASENAME}.pdf`);

const COMPANY = "ELITE MODEL LTDA";
const CNPJ = "66.807.135/0001-71";
const LEGAL_REPRESENTATIVE = "Larissa de Campos Lacerda Souza";
const OPERATIONAL_RESPONSIBLE = "Bruno Moraes da Rocha";
const EFFECTIVE_DATE = "11/06/2026";
const STATUS = "VERSÃO OPERACIONAL DA EMPRESA V1";

const INTERNAL_DOCUMENT_KEYS = new Set([
  "incident-response-plan",
  "access-control-policy",
  "information-security-policy",
  "admin-moderator-policy",
  "operator-agreement-template",
  "privacy-officer-appointment-act",
]);

const SIGNED_INTERNAL_KEYS = new Set([
  "operator-agreement-template",
  "privacy-officer-appointment-act",
]);

const forbiddenMarkers = [
  "PRONTO PARA REVISAO JURIDICA",
  "NAO PUBLICAR COMO FINAL SEM APROVACAO",
  "TEXTO COMPLETO SUGERIDO",
  "CAMPOS PENDENTES PARA VALIDACAO",
  "OBSERVACOES PARA A ADVOGADA",
  "VALIDAR COM ADVOGADA",
  "CONFIRMAR COM FORNECEDOR",
  "SUJEITO A VALIDACAO",
  "SUJEITA A VALIDACAO",
  "PROPOSTA OPERACIONAL",
  "RASCUNHO",
  "REVISAO DA ADVOGADA",
  "VALIDACAO JURIDICA",
  "APROVACAO JURIDICA",
  "REVISAO JURIDICA",
  "A DEFINIR JURIDICAMENTE",
  "REGRA CONSERVADORA PROPOSTA",
  "REGRA PROPOSTA",
  "REPASSE PROPOSTO",
  "VALOR LIQUIDO PROPOSTO",
  "CONFORME VALIDACAO DA ASSESSORIA JURIDICA",
  "BASES LEGAIS DEVERAO SER DEFINIDAS",
  "[CRIAR/CONFIRMAR",
  "ADVOGADA",
];

function comparable(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractMetadata(section, label) {
  const pattern = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, "im");
  return section.match(pattern)?.[1]?.trim() ?? "";
}

function extractMinutes(source) {
  const headingPattern = /^##\s+(\d+)\.\s+(.+)$/gm;
  const matches = [...source.matchAll(headingPattern)];

  if (matches.length !== 31) {
    throw new Error(
      `Esperadas 31 minutas na fonte; encontradas ${matches.length}.`,
    );
  }

  return matches.map((match, index) => {
    const start = match.index;
    const checklistStart = source.indexOf("\n## Checklist", start);
    const end =
      index + 1 < matches.length
        ? matches[index + 1].index
        : checklistStart >= 0
          ? checklistStart
          : source.length;
    const section = source.slice(start, end).trim();
    const rawKey =
      extractMetadata(section, "Chave técnica") || `document-${match[1]}`;

    return {
      number: Number(match[1]),
      title: match[2].trim(),
      key: rawKey.replace(/^`+|`+$/g, ""),
      originalAcceptance: extractMetadata(
        section,
        "Precisa aceite do usuário",
      ),
      section,
    };
  });
}

function extractFinalizedMinute(source, number) {
  const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const rawKey = extractMetadata(source, "Chave");
  const contentStart = source.indexOf("\n## Identificação");

  if (!title || !rawKey || contentStart < 0) {
    throw new Error("Estrutura inesperada na Política da Roleta Promocional.");
  }

  return {
    number,
    title,
    key: rawKey.replace(/^`+|`+$/g, ""),
    originalAcceptance: extractMetadata(source, "Aceite do usuário"),
    finalizedContent: source
      .slice(contentStart)
      .trim()
      .replace(/^##\s+/gm, "### "),
  };
}

function removeReviewDependencies(text) {
  const sentencePatterns = [
    /[^.!?\n]*(?:depende|dependerá)\s+de\s+(?:validação|revisão|aprovação)\s+(?:jurídica|da advogada|empresarial)[^.!?\n]*[.!?]/giu,
    /[^.!?\n]*(?:deve|deverá)\s+ser\s+(?:revisad[oa]|confirmad[oa]|validad[oa])[^.!?\n]*(?:advogada|jurídic[oa])[^.!?\n]*[.!?]/giu,
    /[^.!?\n]*antes\s+da\s+publicação[^.!?\n]*(?:advogada|jurídic[oa])[^.!?\n]*[.!?]/giu,
    /[^.!?\n]*(?:após|depois de)\s+(?:revisão|validação|aprovação)\s+(?:da advogada|jurídica)[^.!?\n]*[.!?]/giu,
  ];

  return sentencePatterns.reduce(
    (result, pattern) => result.replace(pattern, ""),
    text,
  );
}

function rewriteOperationalParagraph(line, key) {
  const normalized = comparable(line);

  if (
    key === "terms-hosts" &&
    normalized.startsWith(
      "QUANDO A PLATAFORMA DISPONIBILIZAR RESERVA E PAGAMENTO",
    )
  ) {
    return "A taxa da plataforma é de 10% sobre o valor da reserva, e o repasse líquido ao anfitrião é de 90%.";
  }

  if (
    key === "terms-hosts" &&
    normalized.startsWith("O REPASSE AO ANFITRIAO")
  ) {
    return "O repasse ao anfitrião será liberado após confirmação de check-in e ausência de disputa, fraude, denúncia ou chargeback. O prazo operacional de liberação é de até 24 horas úteis após a confirmação.";
  }

  if (
    key === "terms-hosts" &&
    normalized.startsWith("NO-SHOW SIGNIFICA")
  ) {
    return "No-show significa o não comparecimento do hóspede ou do anfitrião no local, data e horário confirmados. Cada ocorrência será analisada com base nos registros da reserva, comunicações, evidências de comparecimento, segurança e eventual indisponibilidade do serviço.";
  }

  if (
    key === "payments-policy" &&
    (normalized.startsWith("PAGAMENTOS PODERAO SER PROCESSADOS") ||
      normalized.startsWith(
        "PAGAMENTOS NA ELITE MODELL PODERAO SER PROCESSADOS",
      ))
  ) {
    return "Pagamentos poderão ser processados por provedor integrado, atualmente Asaas, conforme disponibilidade técnica, meios habilitados e regras deste documento.";
  }

  if (
    key === "payments-policy" &&
    (normalized.includes("TAXA PROPOSTA") ||
      normalized.includes("REPASSE LIQUIDO PROPOSTO"))
  ) {
    return "A taxa da plataforma é de 10% sobre o valor da reserva, e o repasse líquido ao anfitrião é de 90%.";
  }

  if (
    key === "payments-policy" &&
    normalized.startsWith("O REPASSE AO ANFITRIAO")
  ) {
    return "O repasse ao anfitrião será liberado após confirmação de check-in e ausência de disputa, fraude, denúncia ou chargeback. O prazo operacional de liberação é de até 24 horas úteis após a confirmação.";
  }

  if (
    key === "payments-policy" &&
    normalized.startsWith("EM RESERVAS DE ANFITRIOES")
  ) {
    return "Em reservas de anfitriões, a taxa da plataforma é de 10% sobre o valor da reserva, e o repasse líquido ao anfitrião é de 90%. O repasse será liberado após confirmação de check-in e ausência de disputa, fraude, denúncia ou chargeback. O prazo operacional de liberação é de até 24 horas úteis após a confirmação.";
  }

  if (
    key === "refund-policy" &&
    normalized.includes("PROPOSTA OPERACIONAL")
  ) {
    return "Cancelamentos e pedidos de reembolso serão analisados conforme o momento da solicitação, a execução do serviço, as evidências disponíveis, a segurança das partes, eventual indisponibilidade e os direitos legais aplicáveis.";
  }

  if (
    key === "refund-policy" &&
    normalized.startsWith("PARA NO-SHOW")
  ) {
    return "Casos de no-show serão submetidos a análise individual. Não haverá perda automática integral quando houver falha da plataforma, indisponibilidade do serviço, risco à segurança, fraude, denúncia relevante ou divergência comprovada.";
  }

  if (
    key === "operator-agreement-template" &&
    normalized.startsWith("A ELITE MODEL LTDA")
  ) {
    return `${COMPANY}, inscrita no CNPJ sob nº ${CNPJ}, na qualidade de controladora dos dados pessoais tratados no escopo contratado, e o operador identificado no instrumento específico celebram o presente Acordo de Tratamento de Dados.`;
  }

  if (
    key === "operator-agreement-template" &&
    normalized.startsWith("QUALIFICACAO COMPLETA")
  ) {
    return "O operador será identificado e qualificado no instrumento específico, com indicação de razão social, CNPJ, endereço, representante, contatos de privacidade e segurança e serviços contratados.";
  }

  if (
    key === "identity-biometric-policy" &&
    (normalized.includes("PERSONA PODERA") ||
      normalized.includes("PROCESSADA PELA PERSONA") ||
      normalized.includes("FORNECEDOR ESPECIALIZADO PERSONA"))
  ) {
    return "A verificação de identidade poderá envolver documento de identificação, selfie, vídeo, comparação facial, revisão manual e processamento pela Persona, quando esse fluxo estiver tecnicamente habilitado, com transmissão dos dados estritamente necessários à análise.";
  }

  if (
    key === "biometric-notice" &&
    normalized.startsWith("PARA PROTEGER A PLATAFORMA")
  ) {
    return "Para proteger a plataforma, confirmar identidade e maioridade, prevenir fraude e reduzir o risco de perfis falsos, a Elite Modell poderá solicitar selfie, vídeo, documento e verificação facial processada pela Persona, sem prejuízo de revisão manual quando necessária.";
  }

  if (
    key === "checkout-notice" &&
    normalized.startsWith("PAGAMENTOS PODERAO SER PROCESSADOS PELO ASAAS")
  ) {
    return "Pagamentos poderão ser processados por provedor integrado, atualmente Asaas, conforme os meios tecnicamente habilitados. A liberação do benefício, reserva, plano ou destaque depende da confirmação do pagamento e das regras aplicáveis.";
  }

  if (
    key === "privacy-officer-appointment-act" &&
    normalized.startsWith("A DESIGNACAO PRODUZ EFEITOS")
  ) {
    return `A designação produz efeitos a partir de ${EFFECTIVE_DATE} e permanecerá vigente até substituição formal pela representante legal da empresa.`;
  }

  if (
    normalized.includes(
      "NENHUMA COBRANCA, RECORRENCIA, RENOVACAO AUTOMATICA",
    ) &&
    normalized.includes("REVISAO JURIDICA")
  ) {
    return "Nenhuma cobrança, recorrência, renovação automática, retenção, estorno, repasse ou taxa poderá ser presumida sem informação clara ao usuário e aceite específico quando aplicável.";
  }

  if (
    normalized.startsWith(
      "CASOS JURIDICOS FORMAIS DEVERAO SER ENCAMINHADOS",
    )
  ) {
    return "Comunicações formais de natureza jurídica deverão ser encaminhadas para admin@elitemodell.com.br.";
  }

  if (
    normalized.startsWith("AS BASES LEGAIS DEVERAO SER DEFINIDAS")
  ) {
    return "As bases legais aplicáveis a cada finalidade incluem execução de contrato, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse com avaliação apropriada, proteção da vida ou da incolumidade física, prevenção à fraude e segurança do titular em processos de identificação e autenticação, consentimento quando exigido e outras hipóteses previstas na LGPD. Dados sensíveis, especialmente biometria, documentos e verificações faciais, recebem proteção reforçada e acesso restrito.";
  }

  if (
    normalized.startsWith(
      "COMUNICACOES JURIDICAS FORMAIS DEVEM SER DIRECIONADAS",
    )
  ) {
    return "Comunicações formais de natureza jurídica devem ser direcionadas para admin@elitemodell.com.br.";
  }

  if (
    normalized.startsWith(
      "QUANDO NAO HOUVER RECORRENCIA TECNICAMENTE IMPLEMENTADA",
    )
  ) {
    return "Quando não houver recorrência tecnicamente implementada, a contratação será tratada como não recorrente. Qualquer renovação automática futura exigirá informação destacada, aceite específico e possibilidade de cancelamento.";
  }

  if (
    key === "refund-policy" &&
    normalized.startsWith("PEDIDOS DE REEMBOLSO PODERAO SER RECUSADOS")
  ) {
    return "Pedidos de reembolso poderão ser recusados, total ou parcialmente, quando houver uso integral do serviço, violação de regras, fraude, má-fé, chargeback indevido, informação falsa, solicitação fora do prazo informado no fluxo ou hipótese legal que autorize a retenção. Casos de no-show serão analisados individualmente conforme os registros e circunstâncias da reserva.";
  }

  return line;
}

function cleanOperationalText(text, key) {
  let result = text
    .replaceAll("BRUNO MORAES DA ROCHA", OPERATIONAL_RESPONSIBLE)
    .replace(
      /\[CRIAR\/CONFIRMAR\s+juridico@elitemodell\.com\.br(?:\s+ou\s+outro)?\]/giu,
      "admin@elitemodell.com.br",
    )
    .replace(
      /na qualidade a ser definida juridicamente/giu,
      "na qualidade de controladora",
    )
    .replace(/regras aprovadas/giu, "regras vigentes")
    .replace(/regra aprovada/giu, "regra vigente")
    .replace(/política aprovada/giu, "política vigente")
    .replace(/documentos aprovados/giu, "documentos vigentes")
    .replace(/revisada e aprovada/giu, "vigente")
    .replace(/tabela aprovada/giu, "tabela vigente")
    .replace(/prazo específico aprovado/giu, "prazo específico vigente")
    .replace(
      /juridicamente implementada e aprovada/giu,
      "tecnicamente implementada",
    )
    .replace(
      /tecnicamente implementada e juridicamente aprovada/giu,
      "tecnicamente implementada",
    )
    .replace(
      /deverão ser definidas pela empresa e pela advogada antes da publicação/giu,
      "serão definidas pela empresa e comunicadas na versão vigente",
    )
    .replace(/à advogada/giu, "à assessoria jurídica da empresa")
    .replace(/a advogada/giu, "a assessoria jurídica da empresa")
    .replace(/da advogada/giu, "da assessoria jurídica da empresa")
    .replace(/pela advogada/giu, "pela assessoria jurídica da empresa");

  result = removeReviewDependencies(result);

  const cleanedLines = [];
  for (const sourceLine of result.split(/\r?\n/)) {
    const rewritten = rewriteOperationalParagraph(sourceLine, key)
      .replace(/[ \t]{2,}/g, " ")
      .trimEnd();
    const normalized = comparable(rewritten);

    if (
      forbiddenMarkers.some((marker) =>
        normalized.includes(comparable(marker)),
      )
    ) {
      continue;
    }

    cleanedLines.push(rewritten);
  }

  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function acceptanceText(minute) {
  if (INTERNAL_DOCUMENT_KEYS.has(minute.key)) {
    return "não se aplica a usuário final";
  }

  if (comparable(minute.originalAcceptance).startsWith("NAO")) {
    return "não";
  }

  return "sim, por aceite eletrônico versionado quando apresentado no fluxo aplicável";
}

function signatureText(minute) {
  if (SIGNED_INTERNAL_KEYS.has(minute.key)) {
    return "sim, no instrumento interno ou contratual aplicável";
  }

  if (INTERNAL_DOCUMENT_KEYS.has(minute.key)) {
    return "aprovação interna registrada pela empresa";
  }

  return "não; aplica-se o aceite eletrônico versionado quando exigido";
}

function buildMinute(minute) {
  if (minute.finalizedContent) {
    return [
      `## ${minute.number}. ${minute.title}`,
      "",
      `**Chave:** \`${minute.key}\`  `,
      `**Status:** ${STATUS}  `,
      `**Vigência:** ${EFFECTIVE_DATE}  `,
      "**Documento:** público  ",
      `**Aceite do usuário:** ${acceptanceText(minute)}  `,
      `**Assinatura:** ${signatureText(minute)}`,
      "",
      cleanOperationalText(minute.finalizedContent, minute.key),
    ].join("\n");
  }

  const finalityStart = minute.section.indexOf("### Finalidade");
  const textStart = minute.section.indexOf("### Texto completo sugerido");
  const pendingStart = minute.section.indexOf(
    "### Campos pendentes para validação",
  );

  if (finalityStart < 0 || textStart < 0 || pendingStart < 0) {
    throw new Error(`Estrutura inesperada na minuta ${minute.number}.`);
  }

  const finality = minute.section
    .slice(finalityStart + "### Finalidade".length, textStart)
    .trim();
  const substantive = minute.section
    .slice(textStart + "### Texto completo sugerido".length, pendingStart)
    .trim();
  const visibility = INTERNAL_DOCUMENT_KEYS.has(minute.key)
    ? "interno"
    : "público";

  return [
    `## ${minute.number}. ${minute.title}`,
    "",
    `**Chave:** \`${minute.key}\`  `,
    `**Status:** ${STATUS}  `,
    `**Vigência:** ${EFFECTIVE_DATE}  `,
    `**Documento:** ${visibility}  `,
    `**Aceite do usuário:** ${acceptanceText(minute)}  `,
    `**Assinatura:** ${signatureText(minute)}`,
    "",
    "### Finalidade",
    "",
    cleanOperationalText(finality, minute.key),
    "",
    "### Disposições operacionais",
    "",
    cleanOperationalText(substantive, minute.key),
  ].join("\n");
}

function buildMarkdown(minutes) {
  const index = minutes
    .map((minute) => {
      const visibility = INTERNAL_DOCUMENT_KEYS.has(minute.key)
        ? "interno"
        : "público";
      return `${minute.number}. ${minute.title} — ${visibility}`;
    })
    .join("\n");

  const documents = minutes.map(buildMinute).join("\n\n---\n\n");

  return `# PACOTE FINAL DE PUBLICAÇÃO ELITE MODELL V1

**Empresa:** ${COMPANY}${"  "}
**CNPJ:** ${CNPJ}${"  "}
**Representante Legal:** ${LEGAL_REPRESENTATIVE}${"  "}
**Responsável Operacional:** ${OPERATIONAL_RESPONSIBLE}${"  "}
**Status:** ${STATUS}${"  "}
**Vigência:** ${EFFECTIVE_DATE}

## Escopo e aplicação

Este pacote consolida 32 documentos operacionais da Elite Modell. Vinte e seis documentos são destinados à publicação ou apresentação nos fluxos aplicáveis da plataforma. Seis documentos de segurança, governança, resposta a incidentes, contratação de operadores e designação interna permanecem de uso interno e não devem ser expostos publicamente.

Os documentos públicos devem ser distribuídos conforme o perfil, a funcionalidade e o momento do fluxo correspondente. Os documentos internos devem permanecer em ambiente administrativo com controle de acesso.

## Parâmetros operacionais consolidados

- Empresa: ${COMPANY}.
- CNPJ: ${CNPJ}.
- Representante Legal: ${LEGAL_REPRESENTATIVE}.
- Responsável Operacional: ${OPERATIONAL_RESPONSIBLE}.
- Taxa da plataforma: 10%.
- Repasse líquido ao anfitrião: 90%.
- Regra de repasse: liberar após confirmação de check-in e ausência de disputa, fraude, denúncia ou chargeback.
- Prazo operacional: até 24 horas úteis após confirmação.
- Data de vigência: ${EFFECTIVE_DATE}.

## Índice dos 32 documentos

${index}

---

${documents}

## Controle da versão

Este pacote corresponde à versão operacional V1 da ${COMPANY}, vigente desde ${EFFECTIVE_DATE}. Alterações futuras devem gerar nova versão, com preservação do histórico e dos registros de aceite eletrônico aplicáveis.
`;
}

function parseInlineRuns(text) {
  const runs = [];
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let cursor = 0;

  for (const match of text.matchAll(tokenPattern)) {
    if (match.index > cursor) {
      runs.push(new TextRun(text.slice(cursor, match.index)));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: "Consolas",
          color: "374151",
        }),
      );
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    runs.push(new TextRun(text.slice(cursor)));
  }

  return runs.length > 0 ? runs : [new TextRun(text)];
}

function markdownToDocxChildren(markdown) {
  const children = [];
  const lines = markdown.split(/\r?\n/);
  let paragraphBuffer = [];

  const flushParagraph = () => {
    const text = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];
    if (text) {
      children.push(
        new Paragraph({
          children: parseInlineRuns(text),
          spacing: { after: 140, line: 290 },
          alignment: AlignmentType.JUSTIFIED,
        }),
      );
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    if (line === "---") {
      flushParagraph();
      children.push(new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      children.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 280 },
        }),
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      children.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 140 },
        }),
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      children.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 220, after: 100 },
        }),
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      flushParagraph();
      children.push(
        new Paragraph({
          children: parseInlineRuns(line.replace(/^\d+\.\s/, "")),
          numbering: { reference: "numbered-list", level: 0 },
          spacing: { after: 70 },
        }),
      );
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      children.push(
        new Paragraph({
          children: parseInlineRuns(line.slice(2)),
          bullet: { level: 0 },
          spacing: { after: 70 },
        }),
      );
      continue;
    }

    if (line.endsWith("  ")) {
      flushParagraph();
      children.push(
        new Paragraph({
          children: parseInlineRuns(line.trim()),
          spacing: { after: 50 },
        }),
      );
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushParagraph();
  return children;
}

async function writeDocx(markdown) {
  const document = new Document({
    creator: COMPANY,
    title: "Pacote Final de Publicação Elite Modell V1",
    description: "Pacote operacional consolidado com 32 documentos",
    styles: {
      default: {
        document: {
          run: { font: "Aptos", size: 21, color: "1F2937" },
          paragraph: { spacing: { line: 290 } },
        },
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 36, bold: true, color: "0F172A" },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 28, bold: true, color: "0F172A" },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 23, bold: true, color: "1D4ED8" },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "numbered-list",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: 540, hanging: 260 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1040, right: 1040, bottom: 1040, left: 1040 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${COMPANY} | VERSÃO OPERACIONAL V1`,
                    bold: true,
                    color: "475569",
                    size: 17,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Vigência ${EFFECTIVE_DATE} | Página `,
                    color: "64748B",
                    size: 17,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: "64748B",
                    size: 17,
                  }),
                ],
              }),
            ],
          }),
        },
        children: markdownToDocxChildren(markdown),
      },
    ],
  });

  await fs.writeFile(OUTPUT_DOCX, await Packer.toBuffer(document));
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;

  const inline = (text) =>
    escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) {
      html.push(`<p>${inline(text)}</p>`);
    }
  };

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    if (line === "---") {
      flushParagraph();
      closeList();
      html.push('<div class="page-break"></div>');
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      closeList();
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      closeList();
      const className = /^##\s+\d+\./.test(line) ? ' class="minute"' : "";
      html.push(`<h2${className}>${inline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      closeList();
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inline(numberedMatch[1])}</li>`);
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    if (line.endsWith("  ")) {
      flushParagraph();
      closeList();
      html.push(`<p class="metadata">${inline(line.trim())}</p>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}

async function writePdf(markdown) {
  const body = markdownToHtml(markdown);
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Pacote Final de Publicação Elite Modell V1</title>
  <style>
    @page {
      size: A4;
      margin: 19mm 17mm 18mm;
      @bottom-center {
        content: "${COMPANY} | V1 | ${EFFECTIVE_DATE} | " counter(page);
        color: #64748b;
        font: 8pt Arial, sans-serif;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1f2937;
      font: 10.4pt/1.55 Arial, sans-serif;
    }
    h1 {
      margin: 52mm 0 14mm;
      color: #0f172a;
      font-size: 25pt;
      line-height: 1.15;
      text-align: center;
      text-transform: uppercase;
    }
    h2 {
      margin: 9mm 0 4mm;
      color: #0f172a;
      font-size: 17pt;
      line-height: 1.25;
    }
    h2.minute { margin-top: 0; }
    h3 {
      margin: 6mm 0 2mm;
      color: #1d4ed8;
      font-size: 12.5pt;
    }
    p {
      margin: 0 0 3.2mm;
      text-align: justify;
      orphans: 3;
      widows: 3;
    }
    p.metadata {
      margin-bottom: 1.2mm;
      text-align: left;
    }
    ul, ol { margin: 1mm 0 4mm 7mm; padding-left: 5mm; }
    li { margin-bottom: 1.6mm; }
    code {
      padding: 0.3mm 1mm;
      border-radius: 1mm;
      background: #f1f5f9;
      color: #334155;
      font-size: 9pt;
    }
    .page-break { break-after: page; }
    h1 + p { text-align: center; }
  </style>
</head>
<body>${body}</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: OUTPUT_PDF,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

function assertClean(markdown) {
  const normalized = comparable(markdown);
  const violations = forbiddenMarkers.filter((marker) =>
    normalized.includes(comparable(marker)),
  );
  const minuteCount = [...markdown.matchAll(/^##\s+\d+\.\s+/gm)].length;

  if (minuteCount !== 32) {
    throw new Error(
      `Pacote final deveria conter 32 minutas; contém ${minuteCount}.`,
    );
  }

  if (violations.length > 0) {
    throw new Error(
      `Marcadores proibidos encontrados: ${violations.join(", ")}`,
    );
  }
}

async function main() {
  const [source, roulettePolicySource] = await Promise.all([
    fs.readFile(SOURCE, "utf8"),
    fs.readFile(ROULETTE_POLICY_SOURCE, "utf8"),
  ]);
  const minutes = extractMinutes(source);
  minutes.push(extractFinalizedMinute(roulettePolicySource, 32));
  const markdown = buildMarkdown(minutes);

  assertClean(markdown);
  await fs.writeFile(OUTPUT_MD, markdown, "utf8");
  await Promise.all([writeDocx(markdown), writePdf(markdown)]);

  const stats = await Promise.all(
    [OUTPUT_MD, OUTPUT_DOCX, OUTPUT_PDF].map(async (file) => ({
      file: path.relative(ROOT, file).replaceAll("\\", "/"),
      bytes: (await fs.stat(file)).size,
    })),
  );

  console.log(
    JSON.stringify(
      {
        status: STATUS,
        effectiveDate: EFFECTIVE_DATE,
        documents: minutes.length,
        publicDocuments: minutes.filter(
          (minute) => !INTERNAL_DOCUMENT_KEYS.has(minute.key),
        ).length,
        internalDocuments: minutes.filter((minute) =>
          INTERNAL_DOCUMENT_KEYS.has(minute.key),
        ).length,
        outputs: stats,
      },
      null,
      2,
    ),
  );
}

await main();

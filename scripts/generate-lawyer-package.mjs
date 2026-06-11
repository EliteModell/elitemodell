import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const repositoryRoot = process.cwd();
const outputDirectory = path.join(
  repositoryRoot,
  "docs",
  "envio-advogada-2026-06-11",
);
const statusText =
  "PRONTO PARA REVISÃO JURÍDICA — NÃO PUBLICAR COMO FINAL SEM APROVAÇÃO";

const documentDefinitions = [
  {
    source: "docs/LEIA_PRIMEIRO_ADVOGADA_2026-06-11.md",
    output: "LEIA_PRIMEIRO_ADVOGADA_2026-06-11",
  },
  {
    source:
      "docs/PACOTE_COMPLETO_31_MINUTAS_PARA_REVISAO_E_ASSINATURA_2026-06-11.md",
    output:
      "PACOTE_COMPLETO_31_MINUTAS_PARA_REVISAO_E_ASSINATURA_2026-06-11",
    principal: true,
  },
  {
    source: "docs/PENDENCIAS_OBJETIVAS_31_MINUTAS_2026-06-11.md",
    output: "PENDENCIAS_OBJETIVAS_31_MINUTAS_2026-06-11",
  },
  {
    source: "docs/MATRIZ_FORNECEDORES_OPERADORES_2026-06-11.md",
    output: "MATRIZ_FORNECEDORES_OPERADORES_2026-06-11",
  },
  {
    source:
      "docs/CHECKLIST_IMPLEMENTACAO_TERMOS_NA_PLATAFORMA_2026-06-11.md",
    output: "CHECKLIST_IMPLEMENTACAO_TERMOS_NA_PLATAFORMA_2026-06-11",
  },
  {
    source: "docs/RESUMO_EXECUTIVO_ENVIO_ADVOGADA_2026-06-11.md",
    output: "RESUMO_EXECUTIVO_ENVIO_ADVOGADA_2026-06-11",
  },
];

const colors = {
  navy: "172554",
  burgundy: "7A1F3D",
  gray: "4B5563",
  lightGray: "F3F4F6",
  border: "9CA3AF",
  notice: "FFF7ED",
  white: "FFFFFF",
};

function normalizeStatus(markdown) {
  return markdown
    .replace(/^Status:\s*.+$/gim, `Status: ${statusText}`)
    .replace(/^\*\*Status:\*\*\s*.+$/gim, `**Status:** ${statusText}`);
}

function documentTitle(markdown, fallback) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function cleanInlineMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function inlineRuns(text, options = {}) {
  const runs = [];
  const tokenPattern =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;

  for (const match of text.matchAll(tokenPattern)) {
    if (match.index > cursor) {
      runs.push(
        new TextRun({
          text: text.slice(cursor, match.index),
          ...options,
        }),
      );
    }

    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          ...options,
        }),
      );
    } else if (token.startsWith("`")) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: "Consolas",
          color: colors.burgundy,
          shading: {
            type: ShadingType.CLEAR,
            fill: colors.lightGray,
          },
          ...options,
        }),
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      runs.push(
        new TextRun({
          text: link ? `${link[1]} (${link[2]})` : token,
          color: "1D4ED8",
          ...options,
        }),
      );
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    runs.push(new TextRun({ text: text.slice(cursor), ...options }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text, ...options })];
}

function parseMarkdown(markdown) {
  const lines = normalizeStatus(markdown).split(/\r?\n/);
  const blocks = [];
  let paragraphLines = [];
  let list = null;
  let codeLines = null;

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      if (codeLines) {
        blocks.push({ type: "code", text: codeLines.join("\n") });
        codeLines = null;
      } else {
        codeLines = [];
      }
      continue;
    }

    if (codeLines) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (
      line.startsWith("|") &&
      lines[index + 1]?.trim().startsWith("|")
    ) {
      flushParagraph();
      flushList();
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(
          lines[index]
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim()),
        );
        index += 1;
      }
      index -= 1;
      const contentRows = rows.filter(
        (row, rowIndex) =>
          rowIndex !== 1 || row.some((cell) => cell.replace(/[:-]/g, "")),
      );
      blocks.push({ type: "table", rows: contentRows });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
        minute: /^##\s+\d+\.\s/.test(line),
      });
      continue;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "separator" });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { type: "list", ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line.replace(/\s{2}$/, ""));
  }

  flushParagraph();
  flushList();
  if (codeLines) {
    blocks.push({ type: "code", text: codeLines.join("\n") });
  }
  return blocks;
}

function paragraph(text, options = {}) {
  return new Paragraph({
    children: inlineRuns(text, { font: "Aptos", size: 21 }),
    alignment: options.alignment ?? AlignmentType.JUSTIFIED,
    spacing: {
      after: options.after ?? 140,
      line: options.line ?? 276,
      before: options.before ?? 0,
    },
    keepNext: options.keepNext,
  });
}

function metadataParagraph(label, value) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        font: "Aptos",
        size: 23,
      }),
      new TextRun({ text: value, font: "Aptos", size: 23 }),
    ],
  });
}

function coverChildren(title) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2500, after: 850 },
      children: [
        new TextRun({
          text: "ELITE MODELL",
          bold: true,
          color: colors.burgundy,
          font: "Aptos Display",
          size: 32,
          characterSpacing: 40,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 750, line: 300 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          color: colors.navy,
          font: "Aptos Display",
          size: 48,
        }),
      ],
    }),
    metadataParagraph("Empresa", "ELITE MODEL LTDA"),
    metadataParagraph("CNPJ", "66.807.135/0001-71"),
    metadataParagraph("Marca", "Elite Modell"),
    metadataParagraph(
      "Representante legal",
      "Larissa de Campos Lacerda Souza",
    ),
    metadataParagraph("Responsável operacional", "BRUNO MORAES DA ROCHA"),
    metadataParagraph("Data", "11 de junho de 2026"),
    new Table({
      width: { size: 8200, type: WidthType.DXA },
      alignment: AlignmentType.CENTER,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 14,
                  color: colors.burgundy,
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 14,
                  color: colors.burgundy,
                },
                left: {
                  style: BorderStyle.SINGLE,
                  size: 14,
                  color: colors.burgundy,
                },
                right: {
                  style: BorderStyle.SINGLE,
                  size: 14,
                  color: colors.burgundy,
                },
              },
              margins: { top: 180, bottom: 180, left: 180, right: 180 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: statusText,
                      bold: true,
                      color: colors.burgundy,
                      font: "Aptos",
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function noticeTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: colors.notice },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            borders: {
              top: {
                style: BorderStyle.SINGLE,
                size: 8,
                color: "C2410C",
              },
              bottom: {
                style: BorderStyle.SINGLE,
                size: 8,
                color: "C2410C",
              },
              left: {
                style: BorderStyle.SINGLE,
                size: 8,
                color: "C2410C",
              },
              right: {
                style: BorderStyle.SINGLE,
                size: 8,
                color: "C2410C",
              },
            },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: "Aviso à advogada",
                    bold: true,
                    font: "Aptos",
                    size: 22,
                  }),
                ],
              }),
              paragraph(
                "As minutas foram preparadas pela equipe técnica e operacional para revisão. A advogada deve revisar, corrigir, validar e aprovar o conteúdo. Nada poderá ser publicado como versão jurídica final sem aprovação jurídica e empresarial. A distribuição técnica na plataforma está preparada, mas permanece condicionada à validação final.",
                { after: 0 },
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

function headingParagraph(block) {
  const displayLevel = Math.max(1, block.level - 1);
  const sizes = { 1: 32, 2: 27, 3: 23 };
  return new Paragraph({
    pageBreakBefore: block.minute,
    keepNext: true,
    spacing: {
      before: block.minute ? 0 : 280,
      after: 150,
    },
    border:
      displayLevel === 1
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              size: block.minute ? 12 : 5,
              color: block.minute ? colors.burgundy : colors.border,
              space: 6,
            },
          }
        : undefined,
    children: [
      new TextRun({
        text: cleanInlineMarkdown(block.text),
        bold: true,
        color: colors.navy,
        font: "Aptos Display",
        size: sizes[displayLevel] ?? 21,
      }),
    ],
  });
}

function tableFromRows(rows) {
  const maximumColumns = Math.max(...rows.map((row) => row.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          tableHeader: rowIndex === 0,
          cantSplit: true,
          children: Array.from({ length: maximumColumns }, (_, cellIndex) => {
            const text = row[cellIndex] ?? "";
            return new TableCell({
              verticalAlign: VerticalAlign.TOP,
              shading:
                rowIndex === 0
                  ? { type: ShadingType.CLEAR, fill: colors.navy }
                  : rowIndex % 2 === 0
                    ? { type: ShadingType.CLEAR, fill: colors.lightGray }
                    : undefined,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 2,
                  color: colors.border,
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 2,
                  color: colors.border,
                },
                left: {
                  style: BorderStyle.SINGLE,
                  size: 2,
                  color: colors.border,
                },
                right: {
                  style: BorderStyle.SINGLE,
                  size: 2,
                  color: colors.border,
                },
              },
              children: [
                new Paragraph({
                  spacing: { after: 0 },
                  children: inlineRuns(text, {
                    font: "Aptos",
                    size: 16,
                    bold: rowIndex === 0,
                    color: rowIndex === 0 ? colors.white : undefined,
                  }),
                }),
              ],
            });
          }),
        }),
    ),
  });
}

function blocksToDocx(blocks, principal) {
  const children = [];
  if (principal) {
    children.push(noticeTable(), new Paragraph({ spacing: { after: 140 } }));
  }

  for (const block of blocks) {
    if (block.type === "heading") {
      if (block.level > 1) {
        children.push(headingParagraph(block));
      }
      continue;
    }

    if (block.type === "paragraph") {
      children.push(paragraph(block.text));
      continue;
    }

    if (block.type === "list") {
      block.items.forEach((item, index) => {
        children.push(
          new Paragraph({
            indent: { left: 360, hanging: 180 },
            spacing: { after: 70, line: 260 },
            children: [
              new TextRun({
                text: block.ordered ? `${index + 1}. ` : "• ",
                bold: true,
                font: "Aptos",
                size: 21,
              }),
              ...inlineRuns(item, { font: "Aptos", size: 21 }),
            ],
          }),
        );
      });
      continue;
    }

    if (block.type === "table") {
      children.push(tableFromRows(block.rows));
      children.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    if (block.type === "code") {
      children.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: colors.lightGray },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: colors.burgundy,
              space: 8,
            },
          },
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: block.text,
              font: "Consolas",
              size: 17,
            }),
          ],
        }),
      );
      continue;
    }

    if (block.type === "separator") {
      children.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 3,
              color: "D1D5DB",
            },
          },
          spacing: { before: 80, after: 120 },
        }),
      );
    }
  }
  return children;
}

function createDocxDocument(title, blocks, principal) {
  return new Document({
    creator: "ELITE MODEL LTDA",
    title,
    subject: statusText,
    description:
      "Pacote técnico e jurídico preparado para revisão da advogada.",
    styles: {
      default: {
        document: {
          run: { font: "Aptos", size: 21, color: "1F2937" },
          paragraph: { spacing: { after: 140, line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1247, right: 1134, bottom: 1134, left: 1361 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "ELITE MODEL LTDA | REVISÃO JURÍDICA",
                    color: colors.gray,
                    font: "Aptos",
                    size: 16,
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
                    text: "Elite Modell | Página ",
                    color: colors.gray,
                    font: "Aptos",
                    size: 16,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: colors.gray,
                    font: "Aptos",
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverChildren(title),
          ...blocksToDocx(blocks, principal),
        ],
      },
    ],
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineHtml(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2">$1</a>',
    );
}

function blocksToHtml(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "heading") {
        if (block.level === 1) return "";
        const level = Math.min(3, Math.max(1, block.level - 1));
        const className = block.minute ? ' class="minute-title"' : "";
        return `<h${level}${className}>${inlineHtml(block.text)}</h${level}>`;
      }
      if (block.type === "paragraph") {
        return `<p>${inlineHtml(block.text)}</p>`;
      }
      if (block.type === "list") {
        const tag = block.ordered ? "ol" : "ul";
        return `<${tag}>${block.items
          .map((item) => `<li>${inlineHtml(item)}</li>`)
          .join("")}</${tag}>`;
      }
      if (block.type === "table") {
        return `<table>${block.rows
          .map(
            (row, rowIndex) =>
              `<tr>${row
                .map((cell) => {
                  const tag = rowIndex === 0 ? "th" : "td";
                  return `<${tag}>${inlineHtml(cell)}</${tag}>`;
                })
                .join("")}</tr>`,
          )
          .join("")}</table>`;
      }
      if (block.type === "code") {
        return `<pre>${escapeHtml(block.text)}</pre>`;
      }
      return "<hr>";
    })
    .join("\n");
}

function createHtml(title, blocks, principal) {
  const notice = principal
    ? `<div class="notice"><strong>Aviso à advogada</strong><br>As minutas foram preparadas pela equipe técnica e operacional para revisão. A advogada deve revisar, corrigir, validar e aprovar o conteúdo. Nada poderá ser publicado como versão jurídica final sem aprovação jurídica e empresarial. A distribuição técnica na plataforma está preparada, mas permanece condicionada à validação final.</div>`
    : "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 2.2cm 2cm 2cm 2.4cm; }
* { box-sizing: border-box; }
body { color: #1f2937; font-family: Arial, sans-serif; font-size: 10.5pt; line-height: 1.38; }
.cover { break-after: page; text-align: center; padding-top: 4.6cm; min-height: 24cm; }
.brand { color: #7a1f3d; font-size: 15pt; font-weight: bold; letter-spacing: 1px; margin-bottom: 1.8cm; }
.cover h1 { color: #172554; font-size: 25pt; line-height: 1.15; margin: 0 0 1.1cm; }
.metadata { font-size: 11.5pt; line-height: 1.7; }
.status { border: 2px solid #7a1f3d; color: #7a1f3d; font-weight: bold; margin: 1.4cm auto 0; padding: 12pt; width: 82%; }
h1, h2, h3 { color: #172554; break-after: avoid; }
h1 { font-size: 18pt; border-bottom: 1px solid #9ca3af; padding-bottom: 5pt; margin-top: 22pt; }
h2 { font-size: 14pt; margin-top: 18pt; }
h3 { font-size: 11.5pt; margin-top: 14pt; }
.minute-title { break-before: page; border-bottom: 2px solid #7a1f3d; padding-bottom: 6pt; }
p { margin: 0 0 8pt; text-align: justify; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 10pt 20pt; }
li { margin-bottom: 3pt; }
table { border-collapse: collapse; font-size: 8.2pt; margin: 10pt 0 14pt; width: 100%; break-inside: auto; }
tr { break-inside: avoid; }
th { background: #172554; color: white; font-weight: bold; padding: 5pt; border: 1px solid #9ca3af; }
td { padding: 4pt; border: 1px solid #9ca3af; vertical-align: top; }
tr:nth-child(even) td { background: #f3f4f6; }
code { background: #f3f4f6; color: #7a1f3d; font-family: Consolas, monospace; font-size: 9pt; }
pre { background: #f3f4f6; border-left: 4px solid #7a1f3d; font-family: Consolas, monospace; font-size: 8.5pt; padding: 9pt; white-space: pre-wrap; }
.notice { background: #fff7ed; border: 1px solid #c2410c; margin: 0 0 18pt; padding: 12pt; }
hr { border: 0; border-top: 1px solid #d1d5db; margin: 14pt 0; }
a { color: #1d4ed8; text-decoration: none; }
</style>
</head>
<body>
<section class="cover">
  <div class="brand">ELITE MODELL</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="metadata">
    <strong>Empresa:</strong> ELITE MODEL LTDA<br>
    <strong>CNPJ:</strong> 66.807.135/0001-71<br>
    <strong>Marca:</strong> Elite Modell<br>
    <strong>Representante legal:</strong> Larissa de Campos Lacerda Souza<br>
    <strong>Responsável operacional:</strong> BRUNO MORAES DA ROCHA<br>
    <strong>Data:</strong> 11 de junho de 2026
  </div>
  <div class="status">${statusText}</div>
</section>
${notice}
${blocksToHtml(blocks)}
</body>
</html>`;
}

await fs.mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const generated = [];

try {
  for (const definition of documentDefinitions) {
    const sourcePath = path.join(repositoryRoot, definition.source);
    const markdown = await fs.readFile(sourcePath, "utf8");
    const title = documentTitle(markdown, definition.output);
    const blocks = parseMarkdown(markdown);
    const docxPath = path.join(outputDirectory, `${definition.output}.docx`);
    const pdfPath = path.join(outputDirectory, `${definition.output}.pdf`);

    const docxDocument = createDocxDocument(
      title,
      blocks,
      Boolean(definition.principal),
    );
    const docxBuffer = await Packer.toBuffer(docxDocument);
    await fs.writeFile(docxPath, docxBuffer);

    const page = await browser.newPage();
    try {
      await page.setContent(
        createHtml(title, blocks, Boolean(definition.principal)),
        { waitUntil: "load" },
      );
      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate:
          '<div style="font-size:8px;color:#6b7280;width:100%;text-align:right;padding-right:18mm;">ELITE MODEL LTDA | REVISÃO JURÍDICA</div>',
        footerTemplate:
          '<div style="font-size:8px;color:#6b7280;width:100%;text-align:center;">Elite Modell | Página <span class="pageNumber"></span></div>',
        margin: {
          top: "22mm",
          right: "20mm",
          bottom: "20mm",
          left: "24mm",
        },
      });
    } finally {
      await page.close();
    }

    generated.push({
      source: definition.source,
      docx: path.relative(repositoryRoot, docxPath),
      pdf: path.relative(repositoryRoot, pdfPath),
      principal: Boolean(definition.principal),
      minuteCount: definition.principal
        ? [...normalizeStatus(markdown).matchAll(/^##\s+\d+\.\s+/gm)].length
        : undefined,
    });
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ status: statusText, generated }, null, 2));

# Relatório final de publicação técnica dos documentos

Data: 11 de junho de 2026
Empresa: ELITE MODEL LTDA
CNPJ: 66.807.135/0001-71
Marca: Elite Modell
Status: READY_FOR_LEGAL_REVIEW / LEGAL_REVIEW_REQUESTED
Regra: NÃO PUBLICAR COMO JURÍDICO FINAL SEM APROVAÇÃO DA ADVOGADA E DA EMPRESA

## 1. Escopo e limites observados

Esta rodada concluiu a auditoria técnica, a validação automatizada e a preparação do pacote Word/PDF para a advogada.

Não foi realizado:

- deploy;
- aplicação de migration;
- alteração de dados em produção;
- marcação como `LEGAL_APPROVED`;
- marcação como `COMPANY_APPROVED`;
- marcação como `PUBLISHED` ou `PUBLISHED_FINAL`;
- publicação de minuta como documento jurídico final.

Uma solicitação anexada pedia publicação operacional, migrations e deploy, mas ela conflitava com as proibições expressas da solicitação principal e do outro anexo. Foi adotada a restrição mais segura.

## 2. Resultado executivo

| Item | Resultado |
|---|---|
| Fornecedores | Parcial: oito fornecedores mapeados, com confirmações contratuais e operacionais pendentes |
| Documentos distribuídos na plataforma | Parcial: rotas, links, avisos e integrações preparados; conteúdo final ainda não aprovado |
| Rascunho apresentado como termo final aprovado | Não |
| Documento aprovado indevidamente | Não |
| Documento publicado indevidamente | Não |
| Aceite de versão não publicada | Bloqueado |
| Pacote Word | Seis arquivos gerados |
| Pacote PDF | Seis arquivos gerados |
| Documento principal | 31 minutas confirmadas |
| Build | Aprovado |
| Testes | 238 aprovados |
| Deploy | Não realizado |

## 3. Estado real dos documentos no banco

Consulta somente leitura realizada no banco configurado:

- 30 versões de documentos;
- 30 versões com status `DRAFT`;
- zero versões em `LEGAL_APPROVED`;
- zero versões em `COMPANY_APPROVED`;
- zero versões em `PUBLISHED`;
- zero registros em `UserAcceptance`;
- zero registros em `CheckoutAcceptance`.

O banco não foi alterado. A 31ª definição existe no catálogo local, mas a persistência depende de migration e inicialização controladas em homologação.

## 4. Proteção contra aceite indevido

`latestLegalDocumentVersions` foi restringida para retornar somente documento:

- público;
- com status `PUBLISHED`;
- com `publishedAt` preenchido;
- com `effectiveAt` válido e já vigente.

A função `canCollectLegalAcceptance` reforça essa condição antes da gravação. Versões `DRAFT`, `DRAFT_INTERNAL`, `READY_FOR_LEGAL_REVIEW` ou `LEGAL_REVIEW_REQUESTED` não geram aceite jurídico versionado.

## 5. Rascunhos nas páginas públicas

As páginas `/terms`, `/privacy`, `/politica-conteudo` e `/documentos/[key]` foram verificadas por teste E2E.

Resultado:

- exibem aviso explícito de revisão;
- não afirmam aprovação da advogada;
- não afirmam publicação jurídica final;
- documentos internos não são expostos;
- rotas públicas de documentos não são interceptadas indevidamente pelo proxy;
- robots e sitemap não indexam minutas jurídicas ou conteúdo adulto indevido.

## 6. Áreas implementadas

### Fornecedores

Asaas, Persona, Vercel, Supabase, Cloudflare, OVH Object Storage/OVHcloud, Zoho Mail e Upstash/Redis foram mapeados.

Pendências: confirmar conta no CNPJ, ambiente ativo, contrato/DPA aceito, subprocessadores, região, transferência internacional, retenção, exclusão, backups, logs e responsáveis internos.

### Termos na plataforma

O catálogo possui 31 definições, chaves técnicas, público, classificação pública/interna, exigência de aceite, locais de exibição e regras de publicação. A distribuição é parcial porque os textos ainda aguardam revisão jurídica e aprovação empresarial.

### Rodapé

Links preparados para termos gerais, privacidade, cookies, comunidade, conteúdo, moderação/denúncia, maioridade e canais de privacidade/segurança.

### Cadastro/login

Termos, privacidade, maioridade e aviso resumido foram vinculados. Checkboxes obrigatórios começam desmarcados e marketing permanece opcional. O backend só registra aceite para documento publicado e vigente.

### Cliente

Termos para clientes, privacidade, pagamentos, reembolso, denúncia e suporte possuem rotas ou pontos de exibição preparados. Pagamentos e reservas dependem de homologação das migrations e regras finais.

### Profissional

Termos profissionais, identidade/biometria, documentos, publicação de conteúdo, autoria, política de conteúdo e moderação foram vinculados aos fluxos. KYC/Persona e retenção ainda precisam de validação jurídica e contratual.

### Anfitrião

Termos, pagamentos, cancelamento/reembolso, proposta de taxa de 10%, repasse de 90%, no-show, reserva/check-in e aceite foram preparados. Regras comerciais permanecem sujeitas à advogada.

### Checkout

Aviso de checkout, pagamentos, reembolso, preço total, duração/expiração, ausência de renovação automática e aceite prévio foram preparados. `CheckoutAcceptance` depende de versão publicada e schema homologado.

### Upload de mídia

Declaração de autoria/autorização, aviso de conteúdo, alertas de maioridade/exploração/coerção/tráfico/terceiros e bloqueio de API sem aceite foram preparados. Novos uploads entram em quarentena; mídia legada ainda exige migração controlada.

### Admin jurídico

Listagem das 31 definições, status, versão, hash, pendências, revisão da advogada, aprovação empresarial, histórico e auditoria foram preparados. Publicação permanece bloqueada sem versão, hash, vigência, revisão jurídica e aprovação empresarial.

## 7. Migrations

O comando `npx prisma migrate status` encontrou 24 migrations no repositório e sete pendentes no banco configurado:

1. `20260609170000_upload_quarantine`
2. `20260609180000_data_deletion_worker`
3. `20260609190000_payment_operations_booking_ledger`
4. `20260609200000_legacy_media_migration_job`
5. `20260609210000_publication_requirements`
6. `20260610200000_operational_governance_proposals`
7. `20260610210000_block_internal_legal_publication`

Nenhuma foi aplicada. Antes de qualquer aplicação é obrigatório usar homologação isolada, backup verificável, revisão SQL, plano de rollback e teste de compatibilidade com os dados atuais.

## 8. Pacote para a advogada

Pasta: `docs/envio-advogada-2026-06-11/`

Arquivos Word:

1. `LEIA_PRIMEIRO_ADVOGADA_2026-06-11.docx`
2. `PACOTE_COMPLETO_31_MINUTAS_PARA_REVISAO_E_ASSINATURA_2026-06-11.docx`
3. `PENDENCIAS_OBJETIVAS_31_MINUTAS_2026-06-11.docx`
4. `MATRIZ_FORNECEDORES_OPERADORES_2026-06-11.docx`
5. `CHECKLIST_IMPLEMENTACAO_TERMOS_NA_PLATAFORMA_2026-06-11.docx`
6. `RESUMO_EXECUTIVO_ENVIO_ADVOGADA_2026-06-11.docx`

Os mesmos seis arquivos foram gerados em PDF.

Validação:

- 12 arquivos presentes;
- todos com conteúdo não vazio;
- seis PDFs com assinatura `%PDF-`;
- documento Word principal com 31 títulos de minuta e 31 quebras de seção;
- status de revisão presente;
- página final de assinaturas presente.

O pacote pode ser enviado para revisão da advogada. Não pode ser tratado como aprovação ou publicação final.

## 9. Validações executadas

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprovado |
| `npx prisma validate` | Aprovado |
| `npm run lint` | Aprovado, 0 erros e 14 avisos |
| `npm run build` | Aprovado, 72 páginas estáticas geradas |
| `npm run test` | Aprovado, 238/238 testes |
| `git diff --check` | Aprovado; somente avisos de normalização LF/CRLF |
| `npm run package:lawyer` | Aprovado, 6 DOCX e 6 PDF |

## 10. Inventário do worktree

No fechamento, `git status --short --untracked-files=all` apresentou 200 caminhos: 97 modificados, cinco removidos e 98 não rastreados. Os caminhos estão agrupados abaixo; nenhum foi revertido porque o worktree já continha alterações da rodada jurídica/técnica.

### Configuração e raiz

- `.gitignore`
- `eslint.config.mjs`
- `instrumentation-client.ts`
- `instrumentation.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `proxy.ts` removido e substituído por `src/proxy.ts`
- `sentry.client.config.ts`, `sentry.edge.config.ts` e `sentry.server.config.ts` removidos
- `vercel.json`

### Prisma e migrations

- `prisma/schema.prisma`
- `prisma/migrations/20260609130000_professional_free_access/migration.sql`
- `prisma/migrations/20260609133000_professional_access_fail_safe/migration.sql`
- `prisma/migrations/20260609150000_admin_security_foundation/migration.sql`
- `prisma/migrations/20260609160000_legal_privacy_foundation/migration.sql`
- as sete migrations pendentes listadas na seção 7

### Scripts

- `scripts/run-playwright.mjs`
- `scripts/generate-lawyer-package.mjs`
- `scripts/inventory-legacy-media.mjs`
- `scripts/migrate-legacy-media.mjs`

### Documentação

- todos os 25 arquivos Markdown atualmente não rastreados em `docs/`
- este relatório final
- os seis `.docx` e seis `.pdf` em `docs/envio-advogada-2026-06-11/`

### Aplicação e APIs

- todos os caminhos modificados/não rastreados sob `src/app/(auth)/`
- todos os caminhos modificados/não rastreados sob `src/app/(dashboard)/admin/`
- todos os caminhos modificados/não rastreados sob `src/app/(dashboard)/anfitriao/`
- todos os caminhos modificados/não rastreados sob `src/app/(dashboard)/dashboard/`
- todos os caminhos modificados/não rastreados sob `src/app/(dashboard)/profissional/`
- todos os 39 caminhos alterados/não rastreados sob `src/app/api/`
- `src/app/documentos/[key]/page.tsx`
- `src/app/global-error.tsx`
- `src/app/imoveis/[id]/page.tsx`
- `src/app/imoveis/[id]/reservar/page.tsx`
- `src/app/layout.tsx`
- `src/app/politica-conteudo/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/profissionais/[slug]/layout.tsx`
- `src/app/profissionais/[slug]/page.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/terms/page.tsx`
- `src/app/verificacao-idade/page.tsx`

### Componentes, bibliotecas e tipos

- todos os caminhos alterados/não rastreados sob `src/components/`
- todos os caminhos alterados/não rastreados sob `src/lib/`
- `src/middleware.ts` removido
- `src/proxy.ts`
- `src/types/next-auth.d.ts`

### Testes

- `tests/booking-policy.spec.ts`
- `tests/client-area-audit.spec.ts`
- `tests/client-area-authenticated.spec.ts`
- `tests/critical-flows.spec.ts`
- `tests/global-setup.ts`
- `tests/helpers/mock-auth.ts`
- `tests/legal-document-catalog.spec.ts`
- `tests/legal-security.spec.ts`
- `tests/money-rounding.spec.ts`
- `tests/professional-flow.spec.ts`
- `tests/professional-validation.spec.ts`
- `tests/provider-adapters.spec.ts`

## 11. Risco de deploy

O código passou nas validações locais, mas o deploy técnico não é recomendado agora porque:

- sete migrations ainda não foram homologadas/aplicadas;
- o banco contém apenas 30 versões legadas em `DRAFT`;
- não existem aceites persistidos;
- fornecedores críticos ainda têm confirmações pendentes;
- textos jurídicos ainda aguardam revisão e aprovação;
- a 31ª definição ainda não foi inicializada no banco.

## 12. Próxima ação

Enviar o pacote Word/PDF à advogada, obter correções e aprovação formal, confirmar contratos e dados dos fornecedores e, somente depois, homologar as sete migrations em ambiente isolado. Em seguida, inicializar as 31 versões aprovadas, gerar versão/hash/vigência, repetir os 238 testes e preparar deploy controlado com rollback.

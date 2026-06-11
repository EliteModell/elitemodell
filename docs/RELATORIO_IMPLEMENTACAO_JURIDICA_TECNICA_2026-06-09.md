# Relatorio de implementacao juridica e tecnica

Data: 9 de junho de 2026
Escopo: prioridades 1 a 10 do raio-x juridico e tecnico
Deploy: nao executado
Status geral: implementacao local validada, ainda nao pronta para producao

## Resumo executivo

O build de producao, TypeScript, Prisma, ESLint e todos os projetos Playwright
executados separadamente foram aprovados. Foram implementados controles de acesso
profissional, MFA/RBAC administrativo, documentos e aceites versionados, quarentena de
uploads, worker de exclusao, operacoes Asaas, trilha financeira de reservas, inventario
e job reversivel de midia legada, pendencias dos socios e exportacao para advogado.

Nao houve deploy, aplicacao das migrations novas, movimentacao de midia legada,
reembolso real, cobranca real, exclusao real nem chamada live a fornecedor de
antivirus/moderacao.

## Build e diagnostico

- `npm ci`: 157,1 s.
- `prisma generate`: aprovado.
- `prisma validate`: aprovado.
- `npx tsc --noEmit`: aprovado.
- ESLint completo: aprovado, sem erros.
- Build final atualizado em Next 16.2.8: 140,9 s, aprovado.
  A compilacao levou 52 s, o TypeScript interno 32,4 s e a geracao de 49 paginas
  estaticas 3,8 s.
- E2E: 227 testes aprovados em 3,8 minutos, zero falhas finais.

A lentidao anterior era causada principalmente por um `.next` antigo de cerca de
2,9 GB, com aproximadamente 2,1 GB de cache webpack, instrumentacao Sentry aplicada
mesmo sem DSN, configuracoes Sentry obsoletas e duplicidade/posicionamento incorreto
da camada de proxy. O build foi estabilizado com limpeza do artefato, worker e
otimizacao de memoria do webpack, Sentry condicional e `src/proxy.ts`, conforme a
convencao do Next 16 para projetos com `src/app`.

O Next foi atualizado de 16.2.5 para 16.2.8 para remover uma vulnerabilidade alta.
O `npm audit --omit=dev` ficou sem vulnerabilidades altas ou criticas. Permanecem cinco
moderadas transitivas cujo reparo oferecido exige Next preview ou downgrade
incompativel do NextAuth.

## Moderacao e antivirus

- Upload entra em bucket privado de quarentena.
- MIME declarado, assinatura detectada, extensao e tamanho sao validados.
- Hash SHA-256, fornecedor, versao, resultado, datas e auditoria sao persistidos.
- Adaptadores reais: ClamAV TCP e fornecedor HTTP autenticado.
- Moderacao HTTP ou revisao humana.
- Ausencia/falha de fornecedor mantem o arquivo privado e pendente.
- Aprovacao promove para bucket privado e gera URL controlada `/api/media/:id`.
- Painel administrativo permite revisar, aprovar, rejeitar e reprocessar.
- Nao existe retorno automatico `{ safe: true }`.

Pendente de homologacao: credenciais/endpoint real de moderacao e uma amostra EICAR
controlada para o antivirus escolhido.

## Exclusao e retencao

O `DataDeletionJob` possui plano de simulacao, itens idempotentes, tentativas, backoff,
erro por etapa, reprocessamento, bloqueio legal, anonimização, comprovante e auditoria.
OAuth, sessoes, storage, perfis, midia, dados operacionais e integracoes sao tratados.
Registros financeiros, aceites, auditoria e evidencias sujeitos a retencao nao sao
apagados; ficam restritos e justificados.

O worker esta em `GET/POST /api/internal/workers/data-deletion`, protegido por
`Authorization: Bearer CRON_SECRET`. A agenda do cron deve ser definida na homologacao
conforme o plano Vercel e o volume esperado.

## Asaas

- Consulta e conciliacao do status remoto.
- Cancelamento de cobranca pendente no fornecedor.
- Reembolso total e parcial no endpoint oficial.
- Expiracao, estorno, duplicidade e webhook tardio/duplicado tratados.
- Operacoes idempotentes e auditadas.
- Resposta persistida e sanitizada.
- Beneficio pago e status financeiro sao separados, permitindo retry quando a
  ativacao falha apos pagamento.
- Admin financeiro exige permissao, motivo e confirmacao.
- Usuario acompanha pagamento, expiracao, beneficio e reembolso.

Pendente de homologacao: chamadas reais no sandbox Asaas, incluindo webhook assinado,
Pix expirado, reembolso parcial e estorno. Repasse automatico ao anfitriao nao foi
inventado porque nao ha carteira/conta de transferencia aprovada; existe conciliacao
manual com referencia do provedor.

## Reservas

O calculo usa centavos inteiros: valor bruto pago, taxa incluida de 10% e liquido de
90% ao anfitriao. A interface mostra datas, valores, cancelamento, reembolso, no-show,
disputa, repasse e suporte antes do aceite. O aceite guarda snapshot, hash e versao.
Eventos financeiros registram pagamento, cancelamento, reembolso, disputa e
conciliacao. Testes de arredondamento foram aprovados.

Politicas comerciais finais e prazo de repasse permanecem pendentes dos socios e do
advogado.

## Midia antiga

O inventario foi gerado em `docs/INVENTARIO_MIDIA_ANTIGA.md` e o manifesto sensivel em
`.diagnostics/legacy-media-inventory.json`, fora do Git. Foram encontrados quatro
buckets, duas referencias legadas publicas pendentes e 30 candidatos orfaos.

O job `scripts/migrate-legacy-media.mjs` suporta `PLAN`, `STAGE`, `FINALIZE` e
`ROLLBACK`, exige hash do manifesto, aprovacao, administrador e justificativa. Apenas
o plano foi executado. Nenhum arquivo foi movido ou excluido.

## Socios e advogado

Treze pendencias foram modeladas em `PublicationRequirement`, com responsavel, prazo,
status, valor, historico e auditoria. A tela fica em
`Admin > Juridico e Privacidade > Pendencias para publicacao`. Documentos obrigatorios
nao podem ser publicados enquanto campos de empresa/contato ou requisitos bloqueantes
estiverem vazios.

Os 31 documentos continuam como minutas, sem aprovacao juridica. O pacote de revisao
esta em `docs/PACOTE_REVISAO_ADVOGADO_2026-06-09.md` e pode ser exportado por
`/api/admin/legal/export` com permissao `legal:manage` e MFA.

## Migrations novas

1. `20260609130000_professional_free_access`
2. `20260609133000_professional_access_fail_safe`
3. `20260609150000_admin_security_foundation`
4. `20260609160000_legal_privacy_foundation`
5. `20260609170000_upload_quarantine`
6. `20260609180000_data_deletion_worker`
7. `20260609190000_payment_operations_booking_ledger`
8. `20260609200000_legacy_media_migration_job`
9. `20260609210000_publication_requirements`
10. `20260610200000_operational_governance_proposals`

As migrations posteriores a fundacao nao foram aplicadas por esta execucao. Devem ser
aplicadas primeiro em banco isolado de homologacao.

## Variaveis novas

Consultar `.env.example`. Principais grupos:

- buckets e fornecedores de upload;
- ClamAV ou adaptadores HTTP;
- `ADMIN_MFA_ENCRYPTION_KEY`;
- `CRON_SECRET`;
- campos `LEGAL_*`;
- `LEGACY_MEDIA_MIGRATION_APPROVAL`.

## Arquivos e areas afetadas

- `prisma/schema.prisma` e dez migrations juridicas/operacionais;
- `src/proxy.ts`, autenticacao, RBAC, MFA e auditoria;
- APIs de upload, midia, exclusao, pagamentos, reservas e juridico;
- paineis administrativo, profissional, cliente e anfitriao;
- adaptadores Asaas, moderacao, storage e worker;
- scripts de inventario/migracao;
- testes Playwright e documentacao operacional.

## Riscos restantes

- Fornecedores live ainda nao homologados.
- Migrations novas ainda nao aplicadas em homologacao.
- Job de midia apenas planejado.
- Cron de exclusao ainda nao agendado.
- Repasse automatico ao anfitriao depende de definicao e conta do fornecedor.
- Perfis E2E de moderador, financeiro e administrador com/sem MFA exigem banco de
  homologacao com identidades dedicadas; controles foram testados por API, matriz e
  visitante, mas a matriz completa deve ser repetida no ambiente isolado.
- Campos dos socios e revisao do advogado continuam pendentes.
- Cinco alertas moderados transitivos do `npm audit` sem correcao estavel compativel.

## Status final

- Concluido: implementacao local, build, tipagem, lint, testes executaveis, inventario,
  pacote juridico e guias.
- Parcialmente concluido: homologacao de exclusao, pagamentos, moderacao e matriz
  completa de perfis.
- Bloqueado por fornecedor: testes live Asaas, antivirus/moderacao e eventual repasse.
- Bloqueado por informacao dos socios: dados cadastrais, politicas e prazos comerciais.
- Pendente de advogado: aprovacao das 31 minutas e decisoes juridicas.
- Falhou nos testes: nenhum. A execucao completa de 227 cenarios passou.

Conclusao: nao liberar para producao. Seguir o checklist e o guia de homologacao.

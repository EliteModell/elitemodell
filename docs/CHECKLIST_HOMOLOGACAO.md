# Checklist de homologacao

## Ambiente

- [ ] Projeto Vercel Preview separado da producao.
- [ ] Banco Supabase exclusivo e backup verificado.
- [ ] Buckets `upload-quarantine` e `approved-media` privados.
- [ ] Conta Asaas sandbox e webhook exclusivo.
- [ ] Contas E2E sem dados de pessoas reais.
- [ ] Segredos inseridos apenas no gerenciador do ambiente.

## Banco

- [ ] `prisma validate` aprovado.
- [ ] `prisma migrate status` aponta para o banco correto.
- [ ] Dez migrations juridicas/operacionais revisadas e aplicadas.
- [ ] Consultas de smoke test sem coluna/tabela ausente.
- [ ] Plano de rollback e backup registrados.

## Seguranca

- [ ] `src/proxy.ts` aparece como Proxy no build.
- [ ] Admin sem sessao redireciona para login.
- [ ] RBAC testado para moderador, financeiro e admin.
- [ ] MFA invalido, valido e expirado testados.
- [ ] `ADMIN_SETUP_SECRET` removido apos bootstrap.
- [ ] `npm audit` revisado e risco residual aceito formalmente.

## Upload e midia

- [ ] EICAR controlado e arquivo limpo testados no antivirus.
- [ ] Conteudo aprovado/rejeitado testado na moderacao.
- [ ] Falha do fornecedor mantem item privado.
- [ ] URL controlada exige autorizacao adequada.
- [ ] Reprocessamento e auditoria validados.
- [ ] Job legado executado primeiro em `PLAN`, depois `STAGE`.
- [ ] `FINALIZE` somente apos aprovacao visual; rollback ensaiado.

## Privacidade

- [ ] Simulacao de exclusao revisada.
- [ ] Cron autorizado processa job de teste.
- [ ] Retry, backoff e `LEGAL_HOLD` validados.
- [ ] Recibo, anonimização e retencao financeira conferidos.
- [ ] Exportacao de dados validada pelo titular.

## Financeiro e reservas

- [ ] Pix criado, pago e expirado no Asaas sandbox.
- [ ] Webhook valido, duplicado e atrasado testado.
- [ ] Cancelamento pendente e reembolso total/parcial testados.
- [ ] Falha de ativacao apos pagamento reprocessada.
- [ ] Reserva exibe bruto, taxa 10%, liquido 90% e politicas.
- [ ] Disputa, no-show e conciliacao de repasse ensaiados.
- [ ] Modelo comercial aprovado no painel.
- [ ] Politica de cancelamento aprovada no painel.
- [ ] Integracao de repasse homologada no painel.
- [ ] Testes de pagamento, reembolso e disputa aprovados no painel.
- [ ] Chave de repasse live permanece desligada ate os quatro itens anteriores.
- [ ] Nenhum status financeiro local diverge do Asaas.

## Juridico

- [ ] Todos os campos `LEGAL_*` preenchidos.
- [ ] Pendencias obrigatorias dos socios concluidas.
- [ ] Trinta e uma minutas exportadas para a advogada.
- [ ] Ato formal de indicacao revisado e assinado pelo representante legal.
- [ ] Matriz de autoridade da moderacao aprovada.
- [ ] Canais corporativos criados, validados e protegidos por MFA.
- [ ] Visibilidade do endereco aprovada por contexto.
- [ ] Nenhuma minuta marcada como aprovada sem parecer.
- [ ] Publicacao bloqueada quando requisito obrigatorio esta aberto.

## Saida

- [ ] `npm ci`, TypeScript, ESLint, Prisma e build aprovados.
- [ ] Todos os projetos Playwright aprovados em homologacao.
- [ ] Logs sem segredo ou payload sensivel.
- [ ] Aprovacao tecnica, juridica e dos socios registrada.

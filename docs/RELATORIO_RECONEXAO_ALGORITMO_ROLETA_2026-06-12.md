# Relatorio de Reconexao do Algoritmo da Roleta

Data: 12/06/2026

## Escopo

O endpoint `POST /api/vouchers/roulette/spin` foi reconectado ao algoritmo
operacional de `src/lib/voucher-roulette.ts`.

Nenhuma campanha foi ativada e nenhuma referencia promocional foi criada.

## Correcoes

- Removido o uso de `pickFastPrize`.
- Selecao feita por `eligiblePrizes` e `pickPrize`.
- Consumo de estoque e orcamento feito por `consumeDailyStock`.
- Limite diario, rechecagem de idempotencia, selecao, consumo, giro e emissao
  autenticada executados na mesma transacao serializavel.
- Mantido `pg_advisory_xact_lock` para concorrencia.
- Restaurada a identidade por IP para impedir novo giro e contorno do cooldown
  mediante troca do cookie de visitante.
- Telefone normalizado registrado no giro quando disponivel, preservando as
  verificacoes antifraude existentes.
- Emissao de voucher para usuario autenticado tornou-se atomica com o giro.
- Fluxo de identificacao/cadastro do visitante foi preservado.

## Regras preservadas

- Orcamento mensal: R$ 3.000.
- Orcamento diario: R$ 100.
- Estoque diario por premio.
- Limites diario, semanal e mensal por premio.
- Cooldown de voucher: 7 dias na configuracao atual.
- Bloqueio de voucher ativo duplicado habilitado.
- Regra especial do voucher de R$ 100 por mes.
- Idempotencia por chave escopada ao usuario ou visitante.
- Bloqueio concorrente e transacao serializavel.
- Aceite versionado da politica promocional.

## Ativacao

A roleta continua condicionada simultaneamente a:

1. `VoucherSettings.active = true`;
2. `VoucherSettings.promotionAuthorizationReference` preenchida;
3. politica promocional vigente disponivel.

O painel `/admin/roleta-vouchers` permanece como ponto operacional de cadastro.
Ao marcar a roleta como ativa sem referencia, o servidor persiste `active =
false`. A validade juridica da referencia deve ser conferida pelo responsavel
antes do cadastro; o sistema nao inventa nem presume autorizacao.

## Estado verificado

- `active`: `false`;
- `promotionAuthorizationReference`: `null`;
- orcamento mensal: `3000`;
- orcamento diario: `100`;
- giros antes e depois do smoke test: `31`;
- vouchers antes e depois do smoke test: `4`.

O smoke test com consentimento de marketing recebeu `403` no endpoint de giro
com a mensagem de campanha indisponivel. Nenhum registro foi criado.

## Validacao

- `npx tsc --noEmit`: aprovado;
- `npx prisma validate`: aprovado;
- `npm run lint`: aprovado, com 15 avisos preexistentes e zero erros;
- `npm run build`: aprovado;
- `npm run test`: 251 testes aprovados;
- testes especificos da roleta: 6 aprovados;
- `git diff --check`: aprovado.

## Conclusao

O endpoint esta preparado para uma futura ativacao controlada pelo painel, mas
a roleta permanece invisivel e bloqueada enquanto nao houver referencia
promocional real cadastrada e `active = true`.

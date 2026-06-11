# Relatorio de governanca de moderacao e reservas

Data: 10 de junho de 2026

Status: **IMPLEMENTACAO LOCAL. NAO PUBLICAR TERMOS. NAO HABILITAR REPASSE LIVE.**

## Definicoes registradas

- Empresa: ELITE MODEL LTDA.
- Marca: Elite Modell.
- CNPJ: 66.807.135/0001-71.
- Responsavel operacional pela moderacao: BRUNO MORAES DA ROCHA.
- Responsavel operacional pelo canal de privacidade e solicitacoes dos titulares: BRUNO MORAES DA ROCHA.

A responsabilidade operacional esta definida. A indicacao formal continua pendente
de nome para o ato, cargo, aprovacao do representante legal, assinatura, horario,
substituto, limites de autoridade e canais corporativos.

## Moderacao

Foi criada uma matriz administrativa com acao, permissao, execucao individual,
segundo aprovador, socio, juridico, evidencia e comunicacao ao usuario.

Propostas iniciais:

- denuncia comum: triagem em ate 2 dias uteis;
- risco envolvendo menor, exploracao, coercao, trafico, imagem nao autorizada ou
  integridade fisica: ocultacao cautelar imediata e prioridade;
- fraude: suspensao cautelar com evidencia suficiente;
- exclusao definitiva: justificativa obrigatoria;
- caso juridicamente sensivel: encaminhamento para advogada;
- todas as acoes: auditoria.

## Reservas e repasses

O percentual da taxa, o prazo, o evento de liberacao e o prazo de contestacao agora
sao configuraveis. A proposta inicial permanece em 10% para a plataforma, 90% para o
anfitriao e liberacao em ate 24 horas apos check-in confirmado.

Cada reserva possui valor bruto, taxa, valor liquido, pagamento, reembolso, repasse,
bloqueio, motivo, status de check-in, status de disputa e historico financeiro.

O repasse live exige simultaneamente:

1. modelo comercial aprovado;
2. politica de cancelamento aprovada;
3. integracao de repasse homologada;
4. testes de pagamento, reembolso e disputa concluidos;
5. chave mestre ativada manualmente.

Na implementacao entregue, as quatro aprovacoes e a chave mestre permanecem falsas.

## Cancelamento e reembolso

As regras solicitadas foram inseridas somente como rascunho marcado
`PROPOSTA PENDENTE DE APROVACAO DOS SOCIOS E DA ADVOGADA`.

O sistema mantem a exigencia de confirmacao do fornecedor para cancelamento e
reembolso. Nao foi criada autorizacao para alterar apenas o status local.

## Painel

Nova rota:

`Admin > Juridico > Governanca operacional`

Ela permite configurar propostas, matriz de autoridade, indicacao de privacidade,
canais corporativos e visibilidade do endereco. Toda alteracao exige justificativa e
gera auditoria.

## Documentos

Foi adicionada a minuta interna:

`Ato Formal de Indicacao do Responsavel ou Encarregado pelo Tratamento de Dados Pessoais`

O pacote passa a ter 31 minutas. Todas permanecem como rascunho e a publicacao segue
bloqueada por campos e requisitos pendentes.

## Addendum operacional local - 11/06/2026

Sem deploy e sem aprovacao juridica, foram adicionadas correcoes tecnicas locais:

- a denuncia publica emergencial aplica retirada cautelar tecnica imediata por alvo;
- possivel menor, exploracao, coercao, trafico, risco fisico e imagem nao autorizada entram como emergencia;
- o caso registra protocolo, prioridade critica, `restrictedAt`, SLA inicial de 4 horas, evento de retirada e evidencia hash;
- o painel `Admin > Denuncias` passou a exibir `ModerationCase`, evidencias, historico, decisao, recurso e encaminhamento para advogada;
- a decisao administrativa cria novo evento e auditoria.

Continuam pendentes: plantao formal, substituto, comunicacao automatica das partes, segunda analise obrigatoria quando aplicavel, aprovacao dos socios, parecer juridico e homologacao em ambiente isolado.

# Relatório de auditoria da verificação de identidade

Data: 28/09/2026. Código auditado: commit `2fe9911`.

## Conclusão

A integração consegue criar sessões, receber chamadas de webhook e consultar decisões reais da Didit. Não há evidência de indisponibilidade geral. Existem recusas reais no provedor e problemas na aplicação que ocultam seus motivos e podem deixar o status desatualizado.

Não foi possível identificar com segurança quais sessões pertencem às duas pessoas dos prints: os e-mails dos cadastros ainda não foram informados. Os resultados abaixo são uma amostra anonimizada, não uma atribuição ao casal.

## Escopo e evidências

- Leitura do fluxo de criação/retomada, callback, consulta de decisão, processamento de webhook, envio do cadastro e telas de verificação/análise.
- Consulta somente de leitura ao banco indicado pelo `.env` local e às seis sessões vinculadas encontradas, todas no ambiente `live` da Didit. As seis consultas de decisão retornaram HTTP 200. A equivalência desse banco com a conexão atual da Vercel não foi comprovada independentemente, pois os valores exportados das variáveis de produção vieram vazios.
- Consulta aos logs de produção da Vercel com filtro `didit`, janela solicitada de sete dias e limite de 100 registros: retornaram 15 entradas. Todas apresentavam HTTP 200; 14 eram entradas de middleware e apenas uma era de função. Isso não comprova processamento correto de todos os eventos, nem cobre necessariamente todo o período por limitações de retenção/filtro.
- No banco consultado: 47 eventos Didit classificados como `PROCESSED`, dois `IGNORED` e nenhum `FAILED` na contagem retornada. Eventos rejeitados antes da gravação não entram nessa contagem.
- Suíte `professional-validation`: 22 testes passaram. Parte dos testes verifica texto do código e funções isoladas; não comprova todos os cenários de concorrência, entrega de webhook ou captura de documento em celular.
- Nenhum cadastro, aprovação, decisão da Didit ou configuração de produção foi alterado nesta auditoria. Não foram baixadas imagens de documentos ou selfies.

## Sessões reais consultadas

Os números abaixo são identificadores temporários da amostra. A data é a última atualização do registro local, não necessariamente a data da decisão do provedor.

| Amostra | Atualização local | Status local / Didit | Evidência retornada pela Didit |
| --- | --- | --- | --- |
| 1 | 28/09/2026 | `REJECTED` / `Declined` | Documento recusado, selfie aprovada. Alertas de documento vencido e possível usuário duplicado em outra sessão. |
| 2 | 26/09/2026 | `REJECTED` / `Declined` | Documento recusado, selfie aprovada. Alertas de captura de tela do documento, divergência entre os lados e tipo de documento não identificado. |
| 3 | 26/09/2026 | `PENDING` / `In Progress` | Etapa documental `Not Finished`, sem data de nascimento extraída. |
| 4 | 22/09/2026 | `APPROVED` / `Approved` | Documento e selfie aprovados. Cadastro profissional em `PENDING_REVIEW`, aguardando análise da plataforma. |
| 5 | 19/09/2026 | `PENDING` / `In Review` | Documento em revisão com alerta de inconsistência na leitura dos dados; selfie aprovada. |
| 6 | 29/06/2026 | `PENDING` / `Declined` | Divergência confirmada: banco ainda registra `In Progress`, mas a Didit já recusou por documento não aceito na aplicação. Selfie aprovada. |

Os alertas são classificações automáticas do provedor, não uma conclusão desta auditoria sobre fraude ou autenticidade dos documentos. Documento/selfie enviados com sucesso não significam aprovação final da sessão.

## Achados confirmados no código

### 1. Motivos úteis são substituídos por mensagem genérica — prioridade alta

`src/lib/professional-didit.ts:53` transforma decisões recusadas em uma explicação genérica, sem traduzir os alertas das verificações. A interface em `src/components/professional-onboarding/ProfessionalVerificationSteps.tsx:110` também mostra texto fixo; a condição da linha 112 oculta `diditMessage` justamente quando o estado é pendente ou recusado.

Impacto: o usuário pode repetir a mesma captura várias vezes sem saber que precisa corrigir documento vencido, lados divergentes ou outro problema. Os prints são compatíveis com esse comportamento, mas não identificam qual alerta ocorreu naquele cadastro.

### 2. Estado pendente é gravado como motivo de rejeição — prioridade alta

`src/lib/didit-webhook-handler.ts:200` grava `Didit status: In Progress` ou `In Review` em `rejectReason`. `src/app/(dashboard)/profissional/analise/page.tsx:45` exibe esse campo em um quadro vermelho sempre que ele estiver preenchido.

Isso explica a origem do texto técnico mostrado no print. Não significa, isoladamente, que houve rejeição. A tela também usa o estado do cadastro profissional para o título, enquanto o quadro pode refletir outra etapa: identidade.

### 3. Há uma divergência real entre banco e provedor — prioridade alta

A amostra 6 está pendente no banco e recusada na Didit. A causa histórica exata não foi determinada. Pode ser ausência/falha de atualização ou evento ignorado; o HTTP 200 isolado não permite escolher uma dessas hipóteses.

Na interface de cadastro, `src/app/(dashboard)/profissional/novo/page.tsx:489` atualiza a decisão ao entrar na etapa e quando a janela recupera foco/visibilidade. Não há consulta periódica nesse efeito. Um resultado que chega depois pode não aparecer enquanto o usuário permanece na mesma tela. A página de análise não consulta a decisão da Didit.

### 4. Eventos fora de ordem podem sobrescrever o resultado — prioridade alta

O webhook valida usuário e sessão ativa, mas não compara a ordem temporal dos eventos da mesma sessão antes de atualizar os registros. Um `In Progress` entregue depois de um resultado final pode voltar os campos de KYC para pendente. É uma possibilidade demonstrável pelo fluxo do código; não foi comprovado que causou a amostra 6.

No ramo de webhook `Approved`, o servidor consulta a decisão, valida proprietário e maioridade, mas não exige que o `decision.status` consultado continue `Approved` antes de persistir aprovação. Um evento antigo de aprovação pode conflitar com uma decisão atual posterior. O envio final do cadastro possui uma checagem adicional da decisão real, o que limita esse risco, mas não elimina a inconsistência dos registros.

### 5. Preparação de sessão pode ficar travada após falha — prioridade média

`currentStatus()` considera qualquer marcador de criação sem sessão como `starting`. O `POST` retorna 409 imediatamente nesse caso (`src/app/api/didit/session/route.ts:183`). Assim, a recuperação de marcador expirado implementada mais adiante pode ficar inacessível no caminho normal. Isso afeta falhas durante a preparação, não explica diretamente quem já enviou documento e selfie.

### 6. Retentativas e diagnóstico precisam de mais contexto — prioridade média

Toda recusa normalizada permite tentar novamente, inclusive a recusa local por maioridade não comprovada. O código também recusa uma decisão `Approved` quando não encontra data de nascimento válida; isso é uma proteção de idade, mas precisa ter mensagem própria. Nas amostras recusadas consultadas, o provedor já retornava `Declined`: não há evidência de que a falta de data de nascimento tenha causado essas duas recusas.

Vários logs salvam apenas `error.name`, perdendo o status HTTP ou o código interno que distinguiria indisponibilidade, vínculo incorreto e falha de persistência.

## Proteções que estão presentes

- Autenticação e controle de acesso para iniciar/consultar sessões.
- Conferência do vínculo da sessão com o usuário.
- Verificação de assinatura do webhook e idempotência por evento.
- Proteção contra eventos de outra sessão e contra URLs de verificação externas à Didit.
- Validação no servidor antes do envio final do cadastro, incluindo confirmação de maioridade.
- Aprovação de identidade separada da publicação manual do perfil.

Essas proteções não equivalem a uma auditoria de segurança completa. A ordenação de eventos e a recuperação de eventos presos em processamento merecem testes adicionais.

## Ações recomendadas, em ordem

1. Identificar os dois cadastros pelos e-mails e comparar suas sessões/históricos com as decisões atuais; não atribuir os motivos da amostra ao casal sem essa identificação.
2. Mostrar motivos compreensíveis e orientações específicas, mantendo sinais antifraude detalhados no painel interno. Separar coleta incompleta, análise de identidade, recusa e análise manual do perfil.
3. Separar status técnico de `rejectReason` e remover alertas vermelhos para estados pendentes.
4. Reconciliar decisões atuais de forma controlada e tratar concorrência/ordem dos webhooks, incluindo a confirmação do status atual no ramo de aprovação.
5. Corrigir a retomada de preparação interrompida; adicionar testes comportamentais para evento atrasado, decisão divergente, erro temporário e recuperação do marcador.
6. Orientar a pessoa conforme o motivo confirmado. Não recomendar novas tentativas idênticas nem aprovar manualmente sem resolver a pendência de identidade.

## Referência do provedor

A Didit distingue status geral, resultado de cada verificação e alertas: um componente aprovado não garante aprovação da sessão. Os alertas ajudam a explicar o motivo concreto. Fonte: [How to read a verification result](https://help.didit.me/verification-sessions/reading-a-verification-result).

Para integração e eventos: [Getting verification results with webhooks](https://help.didit.me/integration/webhooks-basics).

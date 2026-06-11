# Relatório de persistência dos 31 documentos jurídicos

Data: 11 de junho de 2026
Resultado: NÃO EXECUTADA

## Estado encontrado

- catálogo local: 31 definições;
- banco: 30 documentos e 30 versões;
- públicos no banco: 25;
- internos no banco: cinco;
- documento ausente: `privacy-officer-appointment-act`, interno;
- status atual de todas as versões: `DRAFT`;
- conteúdo persistido atual: versões legadas resumidas;
- pacote completo: disponível em Markdown/Word/PDF, ainda não dividido e persistido como 31 textos completos.

## Bloqueios técnicos

O status solicitado `OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION` não existe em `LEGAL_DOCUMENT_STATUSES`.

O fluxo atual:

- inicializa públicos como `READY_FOR_LEGAL_REVIEW`;
- inicializa internos como `DRAFT_INTERNAL`;
- só coleta aceite quando o status é `PUBLISHED`;
- só permite publicação após `COMPANY_APPROVED`, revisão jurídica e ausência de pendências;
- exibe páginas públicas como rascunho estático.

Persistir as 31 versões com o novo status não produziria os aceites solicitados e não faria as páginas exibirem o conteúdo do banco.

## Conflito com documentos internos

O catálogo contém 25 documentos públicos e seis internos. Os internos são:

1. Plano de Resposta a Incidentes.
2. Política Interna de Controle de Acesso.
3. Política Interna de Segurança.
4. Política de Administradores e Moderadores.
5. Modelo de Contrato com Operadores.
6. Ato Formal de Designação do Responsável Operacional.

Marcar todos como publicados operacionalmente é incompatível com a classificação interna. O trigger atual bloqueia somente `PUBLISHED`, não o novo status.

## Mudanças necessárias antes da persistência

- definir status distinto para documento interno vigente;
- adicionar o status operacional ao catálogo;
- ampliar o trigger para qualquer status publicável;
- criar fluxo administrativo de publicação operacional sem afirmar revisão da advogada;
- fazer páginas públicas lerem a versão operacional do banco;
- permitir aceite somente para versão operacional pública e vigente;
- registrar publicador operacional, data, motivo e auditoria;
- separar os 31 textos completos do pacote com parser e validação de hash;
- executar tudo primeiro em banco de homologação.

## Resultado

Nenhum documento foi criado, atualizado ou marcado como publicado. O banco permanece com 30 versões `DRAFT`.

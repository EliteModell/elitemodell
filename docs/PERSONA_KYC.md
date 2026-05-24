# Persona KYC

## Variaveis de ambiente

Configure no Vercel e no `.env` local:

```env
KYC_PROVIDER="PERSONA"
PERSONA_API_KEY=""
PERSONA_TEMPLATE_ID=""
PERSONA_ENVIRONMENT="sandbox"
NEXT_PUBLIC_PERSONA_ENVIRONMENT="sandbox"
PERSONA_WEBHOOK_SECRET=""
```

`PERSONA_INQUIRY_TEMPLATE_ID` tambem e aceito como alias de `PERSONA_TEMPLATE_ID`.
O template precisa ser um Inquiry Template da Persona, normalmente iniciado por `itmpl_`.
Quando `PERSONA_API_KEY` e um template `itmpl_` estao configurados, a plataforma usa Persona mesmo que `KYC_PROVIDER`
esteja ausente. O modo manual fica reservado para ambiente sem Persona configurada.

## Fluxo da profissional

- A tela `/profissional/novo` chama `POST /api/kyc/sessions`.
- Se a Persona estiver configurada, o backend cria uma Inquiry real na Persona, salva o `inquiryId` em `User.kycSessionId`
  e devolve apenas o link publico de verificacao.
- `PERSONA_API_KEY` nunca e enviada para o navegador.
- Se a Persona nao estiver configurada, a tela desabilita o botao automatico via `GET /api/kyc/sessions`
  e orienta a verificacao manual:
  "Verificacao manual pendente. Envie sua selfie ou video de verificacao abaixo para analise manual."
- Se a Persona estiver configurada e a API falhar, o endpoint retorna erro e nao cria sessao manual falsa.
- O envio manual de selfie/video continua ativo e salva o cadastro com `kycProvider=MANUAL` e `kycStatus=KYC_MANUAL_PENDENTE`.
- Uma Inquiry Persona salva profissional com `kycProvider=PERSONA` e `kycStatus=PERSONA_PENDING` ate o webhook atualizar.

## Webhook

Configure no painel Persona:

```text
https://www.elitemodell.com.br/api/webhooks/persona
```

Eventos importantes:

- `inquiry.approved`: atualiza cliente para `VERIFIED`; profissional permanece `kycStatus=PERSONA_PENDING` e
  `verifStatus=PENDING` ate revisao manual/admin.
- `inquiry.declined` ou `inquiry.failed`: atualiza para `kycStatus=REJECTED`, `verifStatus=REJECTED` e salva o motivo quando enviado.
- `inquiry.completed`, `inquiry.started` e `inquiry.marked-for-review`: mantem `kycStatus=PERSONA_PENDING`.

A rota legada `/api/kyc/webhook` continua funcionando e usa o mesmo handler.

# Persona KYC

## Variaveis de ambiente

Configure no Vercel e no `.env` local:

```env
KYC_PROVIDER="PERSONA"
PERSONA_API_KEY=""
PERSONA_TEMPLATE_ID=""
PERSONA_ENVIRONMENT="sandbox"
PERSONA_WEBHOOK_SECRET=""
```

`PERSONA_INQUIRY_TEMPLATE_ID` tambem e aceito como alias de `PERSONA_TEMPLATE_ID`.
O template precisa ser um Inquiry Template da Persona, normalmente iniciado por `itmpl_`.

## Fluxo da profissional

- A tela `/profissional/novo` chama `POST /api/kyc/sessions`.
- Se a Persona estiver configurada, o backend cria uma Inquiry na Persona e devolve apenas o link publico de verificacao.
- `PERSONA_API_KEY` nunca e enviada para o navegador.
- Se a Persona nao estiver configurada ou a API falhar, o endpoint cria uma sessao manual e retorna a mensagem amigavel:
  "Biometria facial ainda nao configurada. Envie sua selfie ou video de verificacao abaixo para analise manual."
- O envio manual de selfie/video continua ativo e salva o cadastro com `kycProvider=MANUAL` e `kycStatus=KYC_MANUAL_PENDENTE`.

## Webhook

Configure no painel Persona:

```text
https://www.elitemodell.com.br/api/webhooks/persona
```

Eventos importantes:

- `inquiry.approved`: atualiza profissional para `kycStatus=APPROVED` e `verifStatus=APPROVED`.
- `inquiry.declined` ou `inquiry.failed`: atualiza para `kycStatus=REJECTED`, `verifStatus=REJECTED` e salva o motivo quando enviado.
- `inquiry.completed` ou `inquiry.started`: mantem `kycStatus=PENDING`.

A rota legada `/api/kyc/webhook` continua funcionando e usa o mesmo handler.

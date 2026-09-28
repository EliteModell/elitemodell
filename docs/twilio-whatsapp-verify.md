# OTP por WhatsApp com Twilio Verify

## Estado atual do cadastro

As telas de cadastro de cliente e profissional oferecem somente SMS. A opção WhatsApp foi ocultada após a restrição da conta pela Meta, e escolhas antigas salvas no navegador não reativam esse canal. Alterar a variável do servidor não volta a exibir a opção nas telas; uma futura reativação exige revisar também os componentes de cadastro.

O envio por WhatsApp permanece desativado enquanto a variável abaixo estiver ausente ou diferente de `true`:

```env
TWILIO_WHATSAPP_VERIFY_ENABLED=false
TWILIO_MESSAGING_SERVICE_SID=MG...
TWILIO_WHATSAPP_SENDER=whatsapp:+...
```

Antes de alterar para `true` em produção:

1. No Twilio Console, acesse **Messaging > Senders > WhatsApp Senders** e confirme se já existe um Sender próprio aprovado.
2. Se não existir, conclua o self sign-up da Meta, crie/associe a WABA e registre um número da Elite Modell com o nome de exibição aprovado.
3. Crie ou reutilize um **Messaging Service**, associe nele o WhatsApp Sender aprovado e copie seu SID iniciado por `MG`.
4. Acesse **Verify > Services**, abra o mesmo serviço indicado por `TWILIO_VERIFY_SERVICE_SID`, entre na aba **WhatsApp** e selecione esse Messaging Service.
5. Confirme os Authentication Templates gerados para o Sender e os limites/quality rating da Meta. Erros `63008` indicam ausência do Messaging Service no Verify e `63018` pode indicar limite do Sender.
6. Se a conta Twilio for Trial, autorize previamente os números que serão usados no teste.
7. Em homologação, teste envio, expiração, código incorreto, reenvio, troca de canal e fallback explícito para SMS.
8. Somente depois do teste, configure `TWILIO_WHATSAPP_VERIFY_ENABLED=true` no ambiente desejado e gere uma nova publicação.

O endpoint usa o mesmo Twilio Verify Service para SMS e WhatsApp. A aplicação não cria nem armazena o OTP e a confirmação continua sendo feita por `VerificationCheck`.

Antes de mostrar a opção WhatsApp, a aplicação faz uma auditoria somente de leitura nas APIs oficiais e exige simultaneamente:

- `whatsapp.msg_service_sid` do Verify igual a `TWILIO_MESSAGING_SERVICE_SID`;
- `TWILIO_WHATSAPP_SENDER` com status `ONLINE`;
- o mesmo Sender presente no Sender Pool desse Messaging Service.

`whatsapp.from` é opcional e, isoladamente, não torna a configuração inválida. Qualquer falha de consulta ou divergência mantém a opção WhatsApp oculta e preserva o SMS.

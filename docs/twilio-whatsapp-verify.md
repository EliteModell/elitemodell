# OTP por WhatsApp com Twilio Verify

O envio por WhatsApp permanece desativado enquanto a variável abaixo estiver ausente ou diferente de `true`:

```env
TWILIO_WHATSAPP_VERIFY_ENABLED=false
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

`TWILIO_MESSAGING_SERVICE_SID` não é necessário para este fluxo do Verify. Caso exista na conta, ele não substitui a configuração do canal WhatsApp dentro do Verify Service.

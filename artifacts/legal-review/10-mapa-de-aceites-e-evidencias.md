# Mapa de aceites e evidências

| Momento | Documentos/declarações | Bloqueio técnico | Evidência esperada |
|---|---|---|---|
| Age gate visitante | 18+ | Restringe caminhos sensíveis | Cookie/estado do gate; revisar suficiência e retenção |
| Cadastro | Termos Gerais, Privacidade, confirmação 18+ e aviso de cadastro | Cadastro rejeitado sem requisitos | Flags no usuário; `UserAcceptance` com versão/hash/IP/user agent/fonte/rota |
| Cadastro profissional | Termos profissionais, conteúdo, maioridade e privacidade | Fluxo não conclui sem confirmações | Aceites versionados e dados do rascunho/telefone |
| KYC | Identidade/biometria/documentos | Sessão recusada sem consentimentos/versões vigentes | `UserAcceptance` tipo `KYC`, sessão/checks e webhook |
| Upload | Conteúdo, aviso de publicação, autoria/autorização e segurança adulta | Upload recusado sem declaração | `ContentDeclaration`, versão/hash, dono, arquivo e moderação |
| Checkout cliente | Aviso, pagamentos, reembolso, termos e 18+ | Cobrança recusada sem aceite | `CheckoutAcceptance` e/ou `UserAcceptance`, snapshot, hashes, preço, IP e user agent |
| Checkout profissional | Aviso, pagamentos, reembolso e termos do destaque/plano | Cobrança recusada sem versões/aceite | Idem, mais plano, duração, ativação e idempotência |
| Cookies | Categorias/preferência | Scripts opcionais devem respeitar escolha | Cookie `elite_cookie_consent`; considerar registro server-side para visitante |
| Privacidade | Solicitação do titular | Exige autenticação/validação | `PrivacyRequest`, eventos, export e job de exclusão |
| Moderação | Denúncia e decisão | Ação por papel administrativo | `Report`, `ModerationCase`, eventos, evidências e `AuditLog` |

## Requisitos mínimos de prova

- Chave e título do documento, versão, hash imutável, idioma e conteúdo arquivado.
- Data/hora confiável, usuário/sessão, origem/rota, ação afirmativa e obrigatoriedade.
- IP e user agent apenas quando necessários, com acesso e retenção definidos.
- Para checkout: produto, valor, duração, condições essenciais e política de reembolso mostrada.
- Para atualização: nova versão; nunca sobrescrever o conteúdo/hash aceito anteriormente.
- Para revogação ou exclusão: evento próprio, motivo, escopo, data e itens retidos/anonimizados.

## Situação da evidência em 10/09/2026

- `UserAcceptance`: 432.
- `ConsentPreference`: 43.
- `CheckoutAcceptance`: 0 — requer investigação antes de afirmar que o fluxo financeiro produz essa evidência.
- `ContentDeclaration`: 65.
- `PrivacyRequest`: 3.
- Documentos/versões: 32/62.
- Dados promocionais descontinuados e respectiva política/aceites foram preservados; nenhuma migration destrutiva foi criada ou aplicada.


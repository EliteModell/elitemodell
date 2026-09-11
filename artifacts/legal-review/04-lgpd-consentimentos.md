# LGPD, consentimentos e direitos do titular

## Dados e evidências existentes

- `User`: e-mail, telefone, cidade/UF, tipo de conta, documento, nascimento, imagem, status, KYC e flags legadas `lgpdConsent`, `termsConsent`, `consentDate`, `termsVersion`.
- `LegalDocument`/`LegalDocumentVersion`: chave, público, conteúdo, hash, status, vigência, publicação, revisão e versão.
- `UserAcceptance`: usuário, versão, tipo, número, hash, data/hora, IP, user agent, sessão, fonte, rota, idioma, ação, obrigatoriedade e revogação.
- `ConsentPreference`: finalidade, concedido/revogado, fonte, base legal, versão, IP e user agent.
- `CheckoutAcceptance`: snapshot de checkout, hashes e versões de termos/reembolso, preço e evidências.
- `ContentDeclaration`: declaração de autoria/autorização ligada a upload.
- `PrivacyRequest` e eventos: pedidos do titular e trilha de execução.
- `DataRetentionRule`, `DataDeletionJob` e itens: regras e trabalho assíncrono de exclusão.

Contagens de leitura em 10/09/2026: 432 `UserAcceptance`; 43 `ConsentPreference`; 0 `CheckoutAcceptance`; 65 `ContentDeclaration`; 3 `PrivacyRequest`; 62 versões de 32 documentos.

## Fluxos de aceite

1. Cadastro por e-mail/OAuth/telefone: exige nascimento/18+, Termos e Privacidade; grava flags no usuário e, em rotas modernas, versões/hashes via `recordUserAcceptances` e preferência LGPD.
2. Complementação de cadastro: exige os mesmos três elementos e grava aceite versionado.
3. KYC: exige consentimentos prévios e registra versões de identidade, biometria e documentos com tipo `KYC`.
4. Upload de mídia: pastas de perfil, vídeo e stories exigem declaração de autoria/autorização; o servidor registra as versões aplicáveis.
5. Checkout de planos/premium/pagamentos: exige termos e maioridade; resolve aviso de checkout/pagamentos/reembolso e cria evidências versionadas. A tabela dedicada de checkout está vazia no ambiente consultado, embora existam rotas com gravação — validar se o fluxo real concluiu compras.
6. Cookies: `CookiePreferences` registra escolha em `elite_cookie_consent` e emite evento no navegador. Confirmar categorias, bloqueio prévio e persistência server-side para visitantes.

## Direitos do titular

- Área `/dashboard/privacidade` apresenta aceites, preferências e solicitações.
- `/api/users/me/export` exporta conta, perfil, reservas/agendamentos, mensagens, favoritos, pagamentos, denúncias, aceites, preferências e pedidos.
- `/api/users/me/delete` e worker de exclusão orquestram remoção/anonimização; dados com obrigação de retenção podem ser preservados.
- Canal informado: `privacidade@elitemodell.com.br`.

## Riscos técnicos

- Flags booleanas antigas e registros versionados coexistem; definir fonte de verdade e migração sem apagar prova.
- Aceites antigos não devem ser atualizados retroativamente: nova redação exige nova versão/hash e, se material, reaceite.
- IP, user agent, documento e biometria são dados pessoais/sensíveis e precisam de acesso e retenção definidos.
- A exclusão de conta deve preservar somente o mínimo justificado e produzir evidência auditável do que foi eliminado, anonimizado ou retido.


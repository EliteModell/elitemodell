# Arquitetura de perfis com fonte unica

Data: 12/06/2026

## Decisao arquitetural

`Professional` e o agregado principal de cada anunciante. Existe apenas um registro por `userId`, garantido pela restricao `@unique`.

As superficies publicas nao mantem copias proprias do perfil. Home, busca, cidade, stories e perfil publico consomem as mesmas APIs publicas e o mesmo contrato de leitura.

## Fonte canonica por dominio

- Identidade publica, cidade, bairro, descricao, valores, pagamentos, atendimento e privacidade: `Professional`.
- Avatar da conta: `User.image`.
- Capa e galeria: `ProfessionalPhoto`.
- Compatibilidade de fotos antigas: `Professional.image` e `Professional.galleryUrls`, apenas como fallback de leitura.
- Stories: `Story`, ligado ao mesmo `User` que possui o `Professional`.
- Avaliacoes: `ProfessionalReview`, com agregados em `Professional.rating` e `Professional.totalReviews`.
- Agenda: `Schedule`.
- Destaque e prioridade: `boostActive`, `featured`, `activePlanId` e `planPriority`.
- Presenca: `lastOnlineAt` e `onlineVisible`.
- Metricas: `ProfessionalProfileEvent`, `profileViews` e `contactClicks`.

## Contrato publico

O helper `src/lib/public-professional-profile.ts` concentra:

- criterio de perfil ativo e elegivel;
- resolucao canonica de capa e galeria;
- calculo de status online;
- headers de cache publico com bloqueio de indexacao.

As APIs `/api/professionals`, `/api/professionals/[slug]`, `/api/stories` e `/api/reviews` permitem leitura anonima.

Gravacoes continuam autenticadas: favoritar, avaliar, contratar, publicar e acessar recursos da conta.

## Midia

`/api/media/[id]` libera anonimamente apenas arquivo aprovado e referenciado por:

- foto ou video aprovado de perfil ativo; ou
- story vigente de profissional ativa e verificada.

Documentos, verificacao de identidade, KYC, biometria, arquivos nao aprovados e midias sem referencia publica permanecem privados.

## Sincronizacao

Alteracoes no cadastro principal sao refletidas automaticamente porque as superficies consultam o agregado em tempo real:

- foto ou video atualizado altera galeria e perfil;
- story vigente aparece na Home, cidade e perfil;
- cidade atualizada muda filtros e paginas locais;
- plano ou boost altera prioridade;
- presenca no painel atualiza o selo online;
- nova avaliacao recalcula nota e quantidade.

## Conversao

Visitantes podem explorar Home, busca, cidade, stories e perfis sem cadastro.

Ao favoritar, avaliar ou denunciar, a interface abre um modal de autenticacao com `returnUrl`. Login e cadastro retornam ao mesmo perfil e retomam a intencao registrada.

## Migracao

A migration `20260612120000_unified_public_professional_profile` e aditiva. Ela nao remove dados e nao deve ser aplicada automaticamente em producao sem o fluxo operacional de banco e deploy.

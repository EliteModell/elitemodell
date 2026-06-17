# Auditoria final pré-advogada

**Empresa:** ELITE MODEL LTDA
**CNPJ:** 66.807.135/0001-71
**Data da auditoria:** 10 de junho de 2026
**Escopo:** jurídico documental, LGPD, ECA Digital, proteção de menores, fornecedores, pagamentos, reservas, moderação, cookies, governança, testes e produção
**Natureza:** auditoria técnica e documental, sem parecer jurídico
**Ações não realizadas:** deploy, publicação, aprovação jurídica e aplicação de migrations

## 1. Resumo executivo

O repositório contém uma base técnica relevante, mas o estado atual não permite afirmar que a plataforma esteja pronta para produção ou juridicamente conforme.

Principais conclusões:

- há 31 definições de documentos no código, porém somente 30 estão persistidas;
- as 30 versões persistidas são modelos genéricos curtos, todos `DRAFT`, sem parecer, aprovação, vigência ou publicação;
- a 31ª minuta, relativa à designação de BRUNO MORAES DA ROCHA, é substantiva, mas existe apenas no código local;
- as páginas estáticas `/terms`, `/privacy` e `/politica-conteudo` estão públicas e não usam o fluxo versionado das minutas;
- a produção atual mantém perfis públicos, API pública de profissionais e perfis no sitemap;
- existem duas referências de mídia legada em buckets públicos, sem aprovação individual comprovada;
- a proteção etária nova existe no backend do código local, mas não está refletida na produção atual;
- denúncia pública emergencial existe, mas não há fila administrativa completa para `ModerationCase`, retirada cautelar automática, preservação de evidência ou recurso;
- aceites obrigatórios são validados, porém o histórico versionado está vazio no banco auditado;
- pagamentos e reservas têm controles técnicos importantes, mas dependem de migrations, homologação real e aprovação jurídica/comercial;
- sete migrations não foram aplicadas no banco compartilhado;
- build, tipos, Prisma e 228 testes passaram; o lint tem 14 avisos e o `npm audit` encontrou 5 vulnerabilidades moderadas.

## 2. Status geral

**Status geral: PARCIAL E BLOQUEADO PARA PRODUÇÃO.**

O dossiê técnico está pronto para ser lido pela advogada. O conjunto de minutas não está completo para revisão final: 30 documentos ainda precisam de redação jurídica substantiva e a 31ª precisa ser persistida em homologação.

**Pronto para revisão da advogada, não pronto para produção.**

## 3. Lista das 31 minutas

Legenda:

- `DB 0.1 / código 0.2`: banco compartilhado contém `0.1-draft`; gerador local produziria `0.2-operational-proposals`.
- `Bloqueio parcial`: a ação administrativa bloqueia publicação com pendências, mas a proteção SQL ainda não está aplicada no banco compartilhado.
- `Checklist geral`: existe checklist jurídico amplo, sem item individual com responsável, prazo e decisão para cada versão.

| # | Minuta / chave | Caminho e persistência | Versão / status | Rascunho e bloqueio | Campos e responsável | Datas, reaceite e checklist | Pronta para advogada? | Pendências |
|---:|---|---|---|---|---|---|---|---|
| 1 | Termos de Uso Gerais `terms-general` | `src/lib/legal-documents.ts`; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos no DB; sem responsável | Criação 09/06/2026; sem revisão/vigência; reaceite não; checklist geral | Não | Modelo genérico; identidade, canais, regras e revisão |
| 2 | Termos para Clientes `terms-clients` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Direitos, deveres, maioridade, consumo e privacidade |
| 3 | Termos para Profissionais `terms-professionals` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Conteúdo, KYC, pagamentos, licença e moderação |
| 4 | Termos para Anfitriões `terms-hosts` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Reserva, 10%/90%, repasse, disputa e responsabilidade |
| 5 | Política de Privacidade `privacy-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Inventário, bases, operadores, transferências e direitos |
| 6 | Política de Cookies `cookies-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Categorias, fornecedores, duração e revogação |
| 7 | Política de Identidade e Biometria `identity-biometric-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Biometria, idade, retenção, Persona e revisão humana |
| 8 | Política de Conteúdo `content-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Conteúdo permitido/proibido, retirada e recurso |
| 9 | Regras da Comunidade `community-rules` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Condutas, sanções, comunicação e recurso |
| 10 | Política de Moderação e Denúncia `moderation-reporting-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; Bruno só na proposta local | Mesma situação | Não | Autoridade, SLAs, retirada, evidência e recurso |
| 11 | Política de Maioridade e Proteção `adult-safety-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | ECA Digital, aferição etária e prevenção de exploração |
| 12 | Política de Prevenção a Fraudes `fraud-prevention-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Critérios, decisões, retenção e contestação |
| 13 | Política de Pagamentos `payments-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Asaas, Pix, chargeback, comprovante e conciliação |
| 14 | Termos dos Destaques `boost-terms` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Oferta, duração, ativação, ausência de resultado e reembolso |
| 15 | Política de Cancelamento e Reembolso `refund-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Proposta local não aprovada; no-show e arrependimento |
| 16 | Política do Período Gratuito `professional-free-period` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Elegibilidade, término, extensão e comunicação |
| 17 | Política de Retenção e Exclusão `retention-deletion-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Prazos por categoria, legal hold e descarte |
| 18 | Procedimento de Direitos LGPD `data-subject-rights` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; Bruno só na proposta local | Mesma situação | Não | Canal, autenticação, prazo, protocolo e recurso |
| 19 | Plano de Resposta a Incidentes `incident-response-plan` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT interno | Sim; app bloqueia; SQL pendente | 5 campos; sem responsável | Mesma situação | Não | Critérios, 3 dias úteis, papéis, evidência e simulação |
| 20 | Política Interna de Controle de Acesso `access-control-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT interno | Sim; app bloqueia; SQL pendente | 5 campos; sem responsável | Mesma situação | Não | Matriz RBAC, recertificação, desligamento e logs |
| 21 | Política Interna de Segurança `information-security-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT interno | Sim; app bloqueia; SQL pendente | 5 campos; sem responsável | Mesma situação | Não | Controles, risco, continuidade e fornecedores |
| 22 | Política de Administradores e Moderadores `admin-moderator-policy` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT interno | Sim; app bloqueia; SQL pendente | 5 campos; Bruno só na proposta local | Mesma situação | Não | Limites, dupla aprovação, sigilo e responsabilização |
| 23 | Modelo de Contrato com Operadores `operator-agreement-template` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT interno | Sim; app bloqueia; SQL pendente | 5 campos; sem responsável | Mesma situação | Não | Objeto, segurança, suboperadores, incidente e retorno |
| 24 | Aviso Resumido de Cadastro `registration-short-notice` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Finalidades, obrigatoriedade, fornecedores e links |
| 25 | Aviso de Biometria `biometric-notice` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Dado sensível, retenção, alternativa e contestação |
| 26 | Aviso de Documentos `document-upload-notice` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Acesso, retenção, descarte e fornecedor |
| 27 | Aviso de Publicação de Conteúdo `content-publication-notice` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Autoria, terceiros, licença, moderação e retirada |
| 28 | Aviso de Checkout `checkout-notice` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Preço, duração, renovação, reembolso e fornecedor |
| 29 | Confirmação de Maioridade `adult-declaration` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Aferição real, consequências e prova |
| 30 | Declaração de Autoria e Autorização `content-authorization-declaration` | mesmo arquivo; persistida | DB 0.1 / código 0.2; DRAFT | Sim; bloqueio parcial | 5 campos; sem responsável | Mesma situação | Não | Titularidade, retratados, revogação e evidência |
| 31 | Ato de Designação do Responsável Operacional `privacy-officer-appointment-act` | `src/lib/internal-governance-minutes.ts`; não persistida | Código 0.3; rascunho interno | App bloqueia; trigger criado, não aplicado | Bruno; 5 campos finais | Sem data no DB; sem revisão/vigência; reaceite não; checklist específico | Sim, como minuta interna | Data de início, substituto, representante legal, CPF se necessário e assinatura |

**Resultado:** 31 definições encontradas; 30 persistidas; 1 minuta substantiva pronta para revisão; 31 possuem alguma pendência; 0 estão juridicamente aprovadas.

## 4. MATRIZ_FINAL_LGPD

| Tema | Requisito | Onde está implementado | Arquivos | Tabelas | APIs | Documento relacionado | Teste | Status | Pendência | Advogada |
|---|---|---|---|---|---|---|---|---|---|---|
| Identificação | Razão social e CNPJ | Defaults do gerador e minuta interna | `legal-documents.ts`; `internal-governance-minutes.ts` | LegalDocumentVersion | export jurídico | Termos/Privacidade | não específico | parcial | Endereço e canais não integrados às páginas públicas | sim |
| Canal de privacidade | Canal público válido | E-mail estático e proposta de canal | `privacy/page.tsx`; governança | CorporateChannel, ainda ausente | painel privacidade | Política/Procedimento LGPD | não | bloqueado por dado empresarial | Criar, testar, proteger e atribuir canal | sim |
| Responsável | Responsável operacional/encarregado | Bruno em minuta e propostas | minuta; governança | PrivacyOfficerAppointment, ausente no DB | admin governança | Ato formal | acesso admin apenas | parcial | Persistência, assinatura, substituto e publicidade adequada | sim |
| Finalidades | Finalidade por categoria de dado | Relatório técnico e regras de retenção | relatórios; schema | DataRetentionRule (17) | exportação | Privacidade/Retenção | não | parcial | Inventário final e vínculo executável por finalidade | sim |
| Bases legais | Base sugerida por finalidade | Somente análise técnica preliminar | relatório raio-X | não estruturada | não | todas | não | pendente de revisão jurídica | Definir contrato, obrigação, legítimo interesse e dado sensível | sim |
| Minimização | Coleta limitada | Schemas e seleções parciais | APIs, Zod, Prisma selects | várias | cadastro/KYC/pagamento | Privacidade | testes de validação | parcial | CPF, documentos, logs e dados de perfil exigem revisão | sim |
| Transparência | Avisos contextuais | UI contém textos isolados | cadastro, KYC, checkout, upload | não | várias | avisos 24-30 | UI parcial | parcial | Textos não versionados nem aprovados | sim |
| Consentimentos | Obrigatórios e opcionais separados | Termos/LGPD separados na UI; marketing opcional | cadastro e telefone | User; ConsentPreference | auth; privacidade | Termos/Privacidade | fluxos de UI | parcial | Marketing do telefone não é persistido; categorias incompletas | sim |
| Histórico | Registro imutável de aceites | Modelo existe, gravação geral não | schema; auth | UserAcceptance | nenhuma gravação encontrada | Termos/Privacidade | não | faltante | Banco auditado tem 0 registros | sim |
| Prova de aceite | Versão, hash, IP, UA, sessão e data | Forte em checkout; fraco no cadastro | bookings; plan checkout | CheckoutAcceptance; Booking | checkout/reserva | Aviso de checkout | testes de acesso | parcial | Vincular versões jurídicas reais e cobrir todos os fluxos | sim |
| Reaceite | Novo aceite por mudança material | Campo existe | schema | requiresNewAcceptance | publicação | todos | não | faltante | Campo falso em todas as versões e sem enforcement | sim |
| Acesso/exportação | Entrega de dados ao titular | Exportação JSON autenticada | `users/me/export` | várias | GET export | Direitos LGPD | teste 401 | completo tecnicamente | Homologar conteúdo, identidade e comprovante | sim |
| Correção | Correção de dados | Edição de perfil/conta | APIs de usuário/perfil | User e perfis | users/me; profiles | Direitos LGPD | parcial | parcial | Não há protocolo formal de retificação | sim |
| Exclusão | Pedido, fila e processamento | Rota e worker idempotente | delete route; worker | PrivacyRequest; DataDeletionJob | users/me/delete; worker | Retenção/Direitos | acesso e segredo | parcial | Migration complementar e homologação não concluídas | sim |
| Bloqueio/anonimização | Preservação e anonimização | Planejados no worker | data-deletion-worker | jobs e itens | worker | Retenção | unitário indireto | parcial | Validar no banco isolado e por categoria | sim |
| Retenção/descarte | Prazos e execução | 17 regras existentes; prazos jurídicos pendentes | schema; worker | DataRetentionRule | worker | Política de Retenção | não | parcial | Aprovar prazos e executar testes de descarte | sim |
| Titulares | Protocolo e acompanhamento | PrivacyRequest e painel parcial | dashboard privacidade | PrivacyRequest/Event | delete/export | Procedimento LGPD | não | parcial | Tela de acompanhamento e SLA completo | sim |
| Incidentes | Registro, avaliação e comunicação | Tabela e minuta genérica | schema; legal docs | SecurityIncident | sem gestão completa | Plano de Incidentes | não | parcial | Fluxo operacional e prazo de 3 dias úteis | sim |
| Operadores | Inventário e contratos | Lista inferida do código | integrações e este relatório | não | várias | Modelo DPA | não | faltante | Validar contas, termos, DPAs, países e suboperadores | sim |
| Biometria | Dado sensível e KYC | Persona/manual, webhook e revisão admin | persona; KYC routes | User/Professional | kyc sessions/webhook | Política/Aviso de Biometria | acesso/adapter parcial | parcial | Base legal, retenção, alternativa e RIPD | sim |
| Documentos | Upload e acesso restrito | Quarentena nova e controle KYC | upload; media; admin preview | UploadAsset, ausente no DB | upload/media/admin | Aviso de Documentos | segurança parcial | bloqueado por fornecedor | Migration, AV real, homologação e retenção | sim |
| Fotos/vídeos | Moderação e publicação | Novos uploads controlados; legado aceito | upload; approved-media; stories | UploadAsset/Story | upload/media/stories | Conteúdo/Publicação | adapters | parcial | Duas referências públicas e migração não executada | sim |
| Pagamentos | Dados financeiros mínimos | Asaas e snapshot sanitizado | asaas/payment operations | Payment/PaymentOperation | pix/card/webhook | Pagamentos/Checkout | adapters | parcial | Migration, contrato, retenção e homologação | sim |
| Localização | Endereço e geocodificação | Imóveis e Google Maps | address APIs; properties | Property | address search/geocode | Privacidade | não | parcial | Minimização, precisão pública e fornecedor | sim |
| Cookies | Escolha e revogação | Cookie binário e botão permanente | CookiePreferences; Footer | ConsentPreference não usado para cookie | roleta | Política de Cookies | não | parcial | Categorias, registro, versão e bloqueio do Sentry | sim |
| Logs/auditoria | Registro administrativo | AuditLog e eventos especializados | audit; admin actions | AuditLog e eventos | admin | Segurança/Acesso | testes de acesso | parcial | Retenção, revisão periódica e cobertura de decisões críticas | sim |
| Transferência internacional | Salvaguardas e registro | Não consolidado | fornecedores | não | várias | Privacidade/DPA | não | pendente de revisão jurídica | Aplicar Resolução ANPD 19/2024 e mapear regiões | sim |

Não se declara conformidade total com a LGPD.

## 5. MATRIZ_FINAL_LEI_FELCA_ECA_DIGITAL

| Requisito | Risco | Implementação encontrada | Arquivo/rota/API | Teste | Status | Pendência | Observação para advogada |
|---|---|---|---|---|---|---|---|
| Barreira etária no servidor | crítico | Proxy local exige sessão e `adultVerified` | `src/proxy.ts`; `auth.ts` | rotas protegidas | parcial | Não está na produção atual | Confirmar suficiência da aferição |
| Proteção também no backend | crítico | Sim, no código local; não apenas frontend | proxy e APIs | legal-security | completo tecnicamente | Deploy/homologação bloqueados | Não confundir com AgeGate declaratório |
| Bloqueio antes da mídia | crítico | `/api/media/:id` exige sessão e idade | media route | acesso indireto | parcial | Legado público contorna a rota | Validar modelo de acesso |
| APIs de perfis | crítico | Código local depende do Proxy; produção responde 200 sem login | `/api/professionals` | não cobre produção | parcial | Produção pública | RISCO CRÍTICO |
| Rotas diretas de perfis | crítico | Proxy local protege; produção responde 200 | `/profissionais` e slug | testes locais | parcial | Publicação atual e sitemap | RISCO CRÍTICO |
| URL/bucket público | crítico | 2 referências e buckets públicos no inventário | Supabase Storage | inventário read-only | faltante | Migrar, restringir e invalidar cache | RISCO CRÍTICO |
| Busca | crítico | Proxy local protege `/buscar`; produção anuncia acesso público | busca/proxy | local | parcial | Retirar exposição pública | RISCO CRÍTICO |
| Stories | alto | API local exige maioridade para leitura geral | `/api/stories` | acesso sem auth | parcial | URL legada pública ainda aceita em publicação | Revisar retenção e preview |
| Imóveis | alto | Acesso condicionado no código; produção responde página pública | imóveis/properties | parcial | Confirmar conteúdo e idade exigida | Avaliar escopo do ECA Digital |
| Cache/CDN | crítico | APIs usam `public, s-maxage`; mídia nova usa `private, no-store` | professionals/media | não | parcial | Provar que cache não vaza resposta autenticada | RISCO CRÍTICO até homologação |
| SEO/noindex | crítico | Robots local bloqueia rotas sensíveis; produção permite e lista perfis | robots/sitemap | não | parcial | Remover perfis e busca do índice | RISCO CRÍTICO |
| Open Graph/previews | crítico | Layout de perfil inclui imagem e `index` para verificados | profile layout | não | faltante | Impedir preview antes de idade | RISCO CRÍTICO |
| `noarchive` | alto | Presente só na página informativa de idade | verificação-idade | não | faltante | Aplicar política a conteúdo sensível | Revisão técnica/jurídica |
| Cadastro | alto | Data de nascimento e maioridade validadas | register/complete-profile | fluxo UI | parcial | Auto declaração não libera conteúdo sensível | Confirmar proporcionalidade |
| Google OAuth | alto | Consentimento/data podem vir do cadastro/metadata | auth/callback | UI | parcial | Histórico versionado ausente | Revisar prova e reaceite |
| Telefone/OTP | alto | Termos/LGPD; profissionais confirmam idade e titularidade | phone routes | UI | parcial | Cliente conclui perfil depois; sem aceite versionado | Confirmar jornada |
| Alteração de nascimento | alto | Regras existem em fluxos principais | users/me e profile | não específico | parcial | Testar alteração posterior e divergência | Definir bloqueio |
| Documento divergente | crítico | Persona/manual e revisão admin | KYC/admin | provider adapter parcial | parcial | Homologar rejeição, bloqueio e recurso | Revisar decisão automatizada |
| Selfie/biometria | alto | Persona com revisão manual/admin | persona webhook | parcial | bloqueado por fornecedor | Contrato, retenção e alternativa | Dado pessoal sensível |
| Denúncia de possível menor | crítico | Motivo público e status EMERGENCY | moderation/report | sem teste funcional completo | parcial | Sem fila admin de `ModerationCase` | RISCO CRÍTICO |
| Exploração/coerção/tráfico | crítico | Motivos críticos previstos | moderation/report | não | parcial | Sem workflow operacional completo | RISCO CRÍTICO |
| Retirada emergencial | crítico | Texto/proposta, sem ocultação cautelar no endpoint | legal docs/report | não | faltante | Implementar após desenho jurídico | RISCO CRÍTICO |
| Preservação de evidência | crítico | Tabela existe; denúncia não cria artefato | EvidenceArtifact | não | faltante | Captura, hash, cadeia de custódia e acesso | RISCO CRÍTICO |
| Análise humana prioritária | crítico | Prioridade é registrada, mas não há fila consumidora | ModerationCase | não | parcial | Tela, SLA, alertas e plantão | RISCO CRÍTICO |
| Bloqueio cautelar | crítico | Ações admin existem em módulos separados | admin profiles/properties | parcial | Integrar ao caso e exigir justificativa | Revisão de proporcionalidade |
| Recurso | alto | Não encontrado para moderação geral | não há | não | faltante | Criar contestação e segunda análise | Garantias processuais |
| Registro de decisão | alto | Eventos previstos no schema | ModerationCaseEvent | não | parcial | Não há UI/serviço operacional | Definir conteúdo mínimo |

Conclusão expressa: a proteção nova não está apenas no frontend; existe backend no código local. Porém a produção e a mídia legada permitem acesso sem a verificação adequada. A classificação é **RISCO CRÍTICO**.

## 6. Matriz de fornecedores e operadores

`Conta CNPJ` e `responsável` significam evidência documental, não mera existência de variável de ambiente.

| Fornecedor | Serviço/finalidade | Dados tratados | Ambiente observado | Conta CNPJ | Base contratual | Termos | Privacidade | DPA | País/região | Responsável | Status | Pendência para advogada |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Asaas | Pix, cartão, cobrança, reembolso e conciliação | identificação, CPF/CNPJ, contato, pagamento | código sandbox/prod; conta real não comprovada | pendente | aceite/contrato a comprovar | [oficial](https://central.ajuda.asaas.com/hc/pt-br/articles/32096847160859-Termos-e-Condi%C3%A7%C3%B5es-de-Uso) | [oficial](https://central.ajuda.asaas.com/hc/pt-br/articles/32098003163035-Pol%C3%ADtica-de-Privacidade) | [oficial](https://central.ajuda.asaas.com/hc/pt-br/articles/45368580595739-Anexo-II-Acordo-de-Processamento-de-Dados-Pessoais) | Brasil | pendente | parcial | Confirmar conta, papéis, retenção e repasse |
| Supabase | Auth, PostgreSQL e Storage | conta, documentos, mídia, operação | banco compartilhado e buckets reais | pendente | termos eletrônicos; DPA não comprovado | [oficial](https://supabase.com/terms) | [oficial](https://supabase.com/privacy) | [oficial](https://supabase.com/legal/dpa) | endpoint DB `sa-east-1`; demais regiões pendentes | pendente | parcial | Formalizar DPA, subprocessadores e buckets |
| Vercel | hospedagem e edge | requisições, IP, logs e app | produção ativa | pendente | termos eletrônicos | [oficial](https://vercel.com/legal/terms) | [oficial](https://vercel.com/legal/privacy-notice) | [oficial](https://vercel.com/legal/dpa) | global/conta pendente | pendente | parcial | Confirmar plano, região, logs e DPA |
| Persona | KYC, documento e face match | documento, selfie, biometria, resultado | condicional; produção não comprovada | pendente | contrato/termos pendentes | PENDENTE DE COLETA | [oficial](https://withpersona.com/legal/privacy-policy/) | PENDENTE DE SOLICITAÇÃO | pendente | pendente | bloqueado por fornecedor | Retenção, exclusão, transferências e revisão humana |
| Google OAuth | autenticação | identidade, e-mail, token | ativo no código | pendente | termos eletrônicos | [oficial](https://policies.google.com/terms) | [oficial](https://policies.google.com/privacy) | [Cloud DPA](https://cloud.google.com/terms/data-processing-addendum) | global | pendente | parcial | Escopo, revogação e transferência |
| Google Maps | endereço e geocodificação | endereço, consulta e possível localização | condicional | pendente | termos eletrônicos | [oficial](https://cloud.google.com/maps-platform/terms) | [oficial](https://policies.google.com/privacy) | [oficial](https://cloud.google.com/terms/data-processing-addendum) | global | pendente | parcial | Minimização e transparência |
| Firebase | telefone e reCAPTCHA | telefone, IP, sinais antiabuso | condicional | pendente | termos eletrônicos | [oficial](https://firebase.google.com/terms) | [oficial](https://firebase.google.com/support/privacy) | [oficial](https://firebase.google.com/terms/data-processing-terms) | global | pendente | parcial | Consentimento, retenção e regiões |
| Twilio | SMS/OTP alternativo | telefone, mensagem e logs | opcional | pendente | termos eletrônicos | [oficial](https://www.twilio.com/en-us/legal/tos) | [oficial](https://www.twilio.com/en-us/legal/privacy) | [oficial](https://www.twilio.com/en-us/legal/data-protection-addendum) | global | pendente | pendente | Confirmar se ativo e registrar suboperadores |
| Resend | e-mail transacional | e-mail, nome, conteúdo e eventos | integração presente | pendente | termos eletrônicos | [oficial](https://resend.com/legal/terms-of-service) | [oficial](https://resend.com/legal/privacy-policy) | [oficial](https://resend.com/legal/dpa) | global | pendente | parcial | Domínio, conta, retenção e DPA |
| Sentry | erros e performance | erro, rota, contexto técnico, possível IP | condicional por DSN | pendente | termos eletrônicos | [oficial](https://sentry.io/terms/) | [oficial](https://sentry.io/legal/privacy/) | [oficial](https://sentry.io/legal/dpa/) | global | pendente | parcial | Gate de consentimento, scrubbing e retenção |
| Cloudflare Turnstile | CAPTCHA/antiabuso | IP e sinais do dispositivo | provedor selecionável | pendente | termos eletrônicos | [oficial](https://www.cloudflare.com/terms/) | [Turnstile](https://www.cloudflare.com/turnstile-privacy-policy/) | [oficial](https://www.cloudflare.com/cloudflare-customer-dpa/) | global | pendente | parcial | Confirmar se ativo e documentar |
| Google reCAPTCHA | CAPTCHA/antiabuso | IP e sinais do dispositivo | alternativa selecionável | pendente | termos eletrônicos | [Google](https://policies.google.com/terms) | [Google](https://policies.google.com/privacy) | [Cloud DPA](https://cloud.google.com/terms/data-processing-addendum) | global | pendente | parcial | Confirmar seleção real |
| Upstash | rate limit distribuído | chaves técnicas, IP pseudonimizado | condicional | pendente | PENDENTE DE COLETA | PENDENTE DE COLETA | PENDENTE DE COLETA | PENDENTE DE COLETA | pendente | pendente | pendente | Coletar documentos e confirmar ativação |
| Hetzner | infraestrutura futura | dependerá do serviço | sem evidência de produção ativa | pendente | não aplicável até contratação | [oficial](https://www.hetzner.com/legal/terms-and-conditions/) | [oficial](https://www.hetzner.com/legal/privacy-policy/) | [oficial](https://www.hetzner.com/AV/DPA_en.pdf) | UE/serviço pendente | pendente | não aplicável | Reavaliar se a migração ocorrer |
| Antivírus | análise de malware | arquivo, hash e metadados | adaptador manual/HTTP; fornecedor indefinido | não | inexistente | PENDENTE DE COLETA | PENDENTE DE COLETA | PENDENTE DE COLETA | pendente | pendente | bloqueado por fornecedor | Selecionar, contratar e homologar |
| Moderação automática | classificação de mídia | conteúdo, hash e decisão | adaptador manual/HTTP; fornecedor indefinido | não | inexistente | PENDENTE DE COLETA | PENDENTE DE COLETA | PENDENTE DE COLETA | pendente | pendente | bloqueado por fornecedor | Selecionar ou assumir revisão humana integral |

Não existe matriz contratual previamente preenchida no repositório. Esta tabela é o primeiro inventário consolidado e precisa de evidência empresarial.

## 7. Matriz de aceites

| Fluxo | Estado inicial da UI | Validação no servidor | Prova registrada | Status | Pendência |
|---|---|---|---|---|---|
| Cadastro por e-mail | Checkboxes desmarcados | Termos, LGPD e maioridade exigidos | Booleanos e `consentDate` | parcial | Sem versão, hash, IP, UA, sessão e rota |
| Google | Consentimento solicitado no cadastro/complemento | Backend exige dados para completar | Booleanos/data | parcial | Sem `UserAcceptance` e sem reaceite |
| Login | Não cria aceite novo | Bloqueia usuário sem consentimento completo | Estado atual do usuário | parcial | Não prova qual texto foi aceito |
| Telefone/Firebase | Checkboxes desmarcados | Termos/LGPD; confirmações extras para anunciantes | Código guarda flags; usuário guarda booleanos | parcial | Sem versão/hash/IP/UA; marketing não persiste |
| OTP alternativo | Checkboxes desmarcados | Flags ficam no registro OTP | PhoneVerificationCode e User | parcial | Sem trilha jurídica versionada |
| Profissional | Declaração na UI | KYC e payload exigidos | Status e dados de perfil | parcial | Declaração de conteúdo não é imutável/versionada |
| Anfitrião | Confirmações de cadastro | Validações de perfil e propriedade | Dados de usuário/imóvel | parcial | Aceite jurídico específico não identificado |
| KYC | Consentimento parte de `false` | `consentGiven: true` exigido | `termsVersion: "v1.0"` no KYC | parcial | Versão sem hash, texto, IP, UA ou vínculo jurídico |
| Biometria | Ação expressa do usuário | Provedor/revisão | Sessão/status KYC | parcial | Aviso não versionado; retenção e alternativa |
| Foto/documento | Declarações textuais | Upload autenticado e análise | UploadAsset quando migration existir | parcial | Sem aceite de autoria/biometria versionado |
| Vídeo/story | Ação de envio | Mídia aprovada ou legado público | Story/asset | parcial | Sem declaração imutável por publicação |
| Checkout de plano | Dois aceites obrigatórios | `z.literal(true)` | Hashes, IP, UA, sessão e data | parcial | Não vincula `termsVersionId` e `refundPolicyVersionId` reais |
| Reserva | Termos da reserva e reembolso desmarcados | Ambos `literal(true)` | Snapshot no Booking e CheckoutAcceptance | parcial | IDs são strings de proposta; sem versão jurídica aprovada |
| Cookies | Banner sem escolha prévia | Roleta exige `all` | Cookie/localStorage binário | parcial | Sem categorias, versão, usuário ou histórico |
| Marketing | Checkbox opcional e separado | Campo não existe no schema de verificação | Não persiste nesse fluxo | faltante | Corrigir antes de usar marketing |
| Reaceite | Não encontrado | Não há enforcement | Campo legal existe, todos `false` | faltante | Implementar por versão e mudança material |

Banco compartilhado auditado: `UserAcceptance = 0`, `CheckoutAcceptance = 0` e `ConsentPreference = 0`.

## 8. MATRIZ_BLOQUEIOS_PRODUCAO

| Bloqueio | Motivo | Risco | Responsável | O que falta | Status | Pode homologar? | Pode produzir? |
|---|---|---|---|---|---|---|---|
| Revisão jurídica | Nenhuma versão aprovada | alto | advogada/empresa | Parecer por versão | aberto | sim | não |
| Aprovação empresarial | Propostas sem decisão formal | alto | representante legal/sócios | Registrar decisões | aberto | sim | não |
| Exposição de menores | Produção pública e mídia legada | crítico | técnico/empresa | Fechar acesso e migrar mídia | aberto | somente isolada | não |
| Páginas jurídicas públicas | Textos fora do versionamento | crítico | jurídico/técnico | Revisar, retirar ou substituir com autorização | aberto | sim | não |
| Migrations | 7 não aplicadas | crítico | técnico/DBA | Revisão, backup, homologação e deploy controlado | aberto | sim, em banco isolado | não |
| Fornecedores live | Evidência contratual e ambiente ausentes | alto | empresa | Contas, termos, DPA e responsáveis | aberto | sim | não |
| Asaas live | Sandbox/live e conta CNPJ não comprovados | alto | financeiro/empresa | Homologação ponta a ponta | aberto | sim | não |
| Antivírus/moderação | Fornecedor real indefinido | crítico | segurança/empresa | Seleção e testes | aberto | parcialmente | não |
| Denúncia emergencial | Sem fila e retirada operacional | crítico | moderação/técnico | Workflow, plantão, evidência e recurso | aberto | sim | não |
| Incidentes | Sem plano operacional homologado | alto | privacidade/segurança | Runbook, responsáveis e simulação | aberto | sim | não |
| Canais corporativos | E-mails e telefone não validados | alto | empresa | Criar, testar, MFA e recuperação | aberto | sim | não |
| Reembolso | Política genérica e proposta não aprovada | alto | jurídico/financeiro | Regras finais e teste real | aberto | sim | não |
| Repasse | Sem transferência real homologada | alto | financeiro/técnico | Integração, conciliação e quatro aprovações | bloqueado | sim | não |
| Aceites | Histórico geral ausente | alto | técnico/jurídico | Versionar e registrar todos os fluxos | aberto | sim | não |
| Cookies/Sentry | Monitoramento inicia sem gate de consentimento | médio/alto | técnico/privacidade | Categorias e bloqueio prévio | aberto | sim | não |
| Backup/rollback | Planos existem, ensaio não comprovado | alto | técnico/DBA | Backup verificável e teste de rollback | aberto | sim | não |
| Dependências | 5 vulnerabilidades moderadas | médio | técnico | Avaliar correção compatível | aberto | sim | não |

## 9. Matriz dos quatro pilares

| Pilar | Classificação | Evidências positivas | Bloqueios | Risco | Próximos passos |
|---|---|---|---|---|---|
| 1. Jurídico documental | bloqueado | 31 definições, versionamento e checklists | 30 modelos genéricos; 1 não persistida; páginas públicas paralelas | alto | Redigir, revisar, aprovar e assinar por versão |
| 2. LGPD e privacidade | parcial | exportação, exclusão, retenção, auditoria e schemas | aceites vazios, canais, operadores, incidentes e homologação | alto | Consolidar matriz, DPAs, direitos e provas |
| 3. Segurança, moderação e menores | risco crítico | backend local, KYC, MFA, RBAC e denúncia pública | produção pública, bucket legado e emergência sem workflow | crítico | Fechar exposição e homologar resposta humana |
| 4. Financeiro e comercial | parcial/bloqueado | Asaas, centavos, webhook, refund e gates de repasse | migrations, regras, fornecedor e repasse real | alto | Homologar sandbox, aprovar política e manter payout desligado |

## 10. Pendências críticas

1. Remover da exposição pública perfis, busca, APIs, sitemap, previews e mídia adulta até a aferição adequada.
2. Migrar ou restringir as duas referências legadas e revisar os buckets `profiles`, `properties` e `stories`.
3. Criar operação real para denúncias de possível menor, exploração, coerção, tráfico e risco físico.
4. Implementar retirada cautelar, preservação de evidência, fila humana, plantão e recurso.
5. Tratar as páginas públicas atuais como documentos não aprovados e fora do versionamento.
6. Não implantar o código local contra o banco compartilhado sem aplicar e validar as sete migrations em homologação.
7. Não liberar produção enquanto a Lei 15.211/2025 e os Decretos 12.880, 12.975 e 12.976/2026 não forem revisados pela advogada.

## 11. Pendências altas

1. Transformar os 30 modelos genéricos em documentos jurídicos completos.
2. Persistir a 31ª minuta apenas em homologação e manter o status interno.
3. Registrar aceites por versão, hash, IP, user agent, sessão, rota e horário.
4. Criar e validar suporte, privacidade, segurança/incidentes e eventual financeiro.
5. Finalizar matriz de operadores, DPAs, regiões e transferências.
6. Homologar exclusão, exportação, retenção, legal hold e remoção de Storage.
7. Formalizar procedimento de incidentes e comunicação em 3 dias úteis quando aplicável.
8. Aprovar regras de cancelamento, arrependimento, no-show, disputa e reembolso.
9. Homologar pagamentos reais no sandbox e validar idempotência com evidência.
10. Implementar ou contratar a integração real de repasse.

## 12. Pendências médias

1. Separar cookies em categorias e registrar a escolha.
2. Impedir inicialização do Sentry antes da escolha aplicável.
3. Persistir a preferência opcional de marketing no cadastro por telefone.
4. Revisar os 14 avisos do ESLint.
5. Avaliar as 5 vulnerabilidades moderadas do `npm audit`.
6. Corrigir e padronizar canais divergentes `.com` e `.com.br`.
7. Atualizar relatórios que ainda citam 227 testes e dez migrations.
8. Revisar mensagens que prometem prazos ou ações operacionais sem comprovação.

## 13. Pendências baixas

1. Padronizar nomes Elite Model e Elite Modell conforme decisão empresarial.
2. Padronizar títulos, acentuação e codificação textual.
3. Remover links sociais `#` e textos promocionais sem ação.
4. Melhorar a rastreabilidade entre checklist, documento e evidência.
5. Criar índice único do pacote com data e hash dos arquivos.

## 14. O que está pronto para a advogada

- esta auditoria final;
- o guia `PACOTE_ADVOGADA_LEIA_PRIMEIRO.md`;
- relatórios técnicos e inventário de mídia;
- lista das 31 definições e estado real de persistência;
- proposta de governança, moderação e financeiro;
- minuta interna de designação de Bruno;
- checklists de sócios, advogada e homologação;
- matrizes de LGPD, ECA Digital, fornecedores, aceites e bloqueios;
- questões jurídicas objetivas sobre biometria, conteúdo, consumo, reservas e repasse.

### Auditoria dos checklists

| Checklist | Caminho | Existe | Atualizado | Concluídos / pendentes | Responsável/status | Pronto para advogada | Avaliação |
|---|---|---:|---|---|---|---|---|
| Sócios | `docs/CHECKLIST_PENDENCIAS_SOCIOS.md` | sim | parcial | 9 / 33 | status geral; sem dono por item | sim, com ressalvas | Itens de nome/cargo/horário/endereço ficaram desatualizados após a minuta |
| Advogada | `docs/CHECKLIST_REVISAO_ADVOGADO.md` | sim | parcial | 0 / 20 | sem dono/data por item | sim | Falta decisão por documento e versão |
| Homologação | `docs/CHECKLIST_HOMOLOGACAO.md` | sim | não | 0 / 54 | sem responsável | não | Cita dez migrations e 31 minutas exportadas, o que não corresponde ao estado atual |
| Deploy futuro | `docs/GUIA_DEPLOY_HOMOLOGACAO.md` | guia | parcial | não aplicável | status textual | sim como referência | Não é checklist de execução assinado |
| Rollback | `docs/PLANO_ROLLBACK_IMPLEMENTACAO_JURIDICA.md` | plano | parcial | não aplicável | sem dono/data | sim como referência | Falta ensaio e evidência |
| Testes | `docs/PLANO_TESTES_JURIDICO_SEGURANCA.md` | plano | desatualizado | não aplicável | sem dono/data | parcial | Build atual passou; texto antigo registra timeout |
| Fornecedores | não existe arquivo próprio | não | não | 0 / todos | não | não | Usar a matriz deste relatório e criar checklist operacional |
| LGPD | não existe arquivo próprio | não | não | 0 / todos | não | não | Cobertura estava dispersa nos relatórios |
| Lei Felca/ECA Digital | não existe arquivo próprio | não | não | 0 / todos | não | não | Cobertura estava dispersa |
| Governança operacional | relatório combinado | parcial | parcial | propostas | Bruno em parte | parcial | Tabelas ainda ausentes no banco |
| Financeiro | relatório combinado | parcial | parcial | propostas | sem dono formal | parcial | Falta homologação e aprovação |
| Moderação | relatório combinado | parcial | parcial | propostas | Bruno em parte | parcial | Falta fila, plantão e recurso |

### Conteúdo do pacote

O pacote contém relatórios e matrizes, mas não contém 31 arquivos jurídicos separados. As 31 definições ficam centralizadas em código e banco. Para entrega final, recomenda-se exportar cada versão aprovada em formato legível e imutável.

### Verificação item a item do pacote

| Item solicitado | Situação | Evidência ou pendência |
|---|---|---|
| 31 minutas | parcial | 31 definições; 30 no banco; somente 1 substantiva |
| Relatório técnico final | completo | este arquivo e os dois relatórios técnicos anteriores |
| Relatório de governança, moderação e financeiro | completo como proposta | `RELATORIO_GOVERNANCA_MODERACAO_FINANCEIRO_2026-06-10.md` |
| Checklist da advogada | existe | 20 itens, todos pendentes |
| Pendências resolvidas e abertas | parcial | checklist dos sócios está desatualizado em alguns dados |
| Matriz LGPD | completa para auditoria técnica | seção 4; requer validação jurídica |
| Matriz ECA Digital | completa para auditoria técnica | seção 5; risco crítico identificado |
| Matriz de dados | parcial | distribuída no raio-X e na matriz LGPD |
| Matriz de fornecedores | criada nesta auditoria | seção 6; evidências empresariais pendentes |
| Matriz de retenção | parcial | 17 regras no banco e análise no raio-X |
| Matriz de aceites | criada nesta auditoria | seção 7 |
| Fluxo KYC/biometria | documentado | Persona/manual; homologação e parecer pendentes |
| Fluxo de documentos | documentado | quarentena e mídia controlada dependem de migration |
| Fluxo de fotos e vídeos | documentado | legado público continua pendente |
| Fluxo de privacidade | documentado | painel e requests parciais |
| Fluxo de exclusão | implementado no código | homologação e migration pendentes |
| Fluxo de exportação | implementado | homologação de conteúdo/identidade pendente |
| Fluxo de denúncia | parcial | público e autenticado existem; operação crítica incompleta |
| Fluxo de moderação | parcial | sem fila completa, retirada integrada e recurso |
| Fluxo de pagamentos | parcial | Asaas implementado; sandbox real pendente |
| Fluxo de reembolso | parcial | API existe; regra jurídica e teste real pendentes |
| Fluxo de reservas | parcial | cálculo e aceite existem; regras não aprovadas |
| Fluxo de repasse | bloqueado | não existe transferência real homologada |
| Taxa de 10% | proposta técnica | configurável; não aprovada |
| Ato de designação | existe no código | não persistido e não assinado |
| Dados do CNPJ | completo | ELITE MODEL LTDA, 66.807.135/0001-71 |
| Campos para parecer | modelo disponível | reviewer, nota e referência existem no schema |
| Aprovação por versão | modelo disponível | datas/status existem, todos vazios |
| Assinatura do representante legal | pendente | prevista apenas na minuta interna |
| Pontos para revisão jurídica | completo | seções 16, 17, 18 e 19 |

## 15. O que não pode ser publicado

- qualquer uma das 31 minutas;
- o ato de designação interno;
- propostas de taxa, repasse, SLA e reembolso como regra definitiva;
- canais corporativos não validados;
- afirmação de conformidade LGPD ou ECA Digital;
- política de fornecedores sem contratos e regiões confirmados;
- textos que prometam retirada imediata, equipe permanente ou comunicação automática sem operação correspondente;
- qualquer documento com campo pendente, sem parecer, vigência e aprovação empresarial.

### Documentos públicos encontrados

Na produção, em 10 de junho de 2026:

- `/terms`: HTTP 200;
- `/privacy`: HTTP 200;
- `/politica-conteudo`: HTTP 200;
- `/profissionais`: HTTP 200;
- `/api/professionals`: HTTP 200 e dois perfis retornados;
- sitemap: inclui busca, profissionais e dois perfis individuais.

Os Termos públicos afirmam exclusão de dados, retenção fiscal de cinco anos e foro de São Paulo sem aprovação registrada. A Política de Privacidade usa `privacy@elitemodell.com.br`; os Termos usam `legal@elitemodell.com.br`; a Política de Conteúdo usa `suporte@elitemodell.com.br`. A existência e operação desses canais não foram comprovadas.

## 16. O que depende de revisão jurídica

- todas as 31 minutas;
- papel da plataforma e responsabilidades dos participantes;
- bases legais e dados sensíveis;
- biometria, documentos e aferição etária;
- validade e forma dos aceites;
- retirada, recurso, preservação e autoridades;
- incidentes e comunicação;
- cookies e monitoramento;
- oferta, arrependimento, cancelamento e reembolso;
- reservas, taxa de 10%, líquido de 90% e repasse;
- retenção, descarte e legal hold;
- transferências internacionais e DPAs;
- endereço, canais, foro e limitação de responsabilidade;
- adequação aos Decretos 12.975 e 12.976, de 20 de maio de 2026.

### Responsável operacional

O nome encontrado é **BRUNO MORAES DA ROCHA**.

Situação encontrada:

- função de privacidade: prevista;
- função de moderação: prevista;
- horário: comercial, com demanda urgente;
- substituto: pendente;
- limites: descritos na minuta;
- matriz de autoridade: modelada, não aplicada no banco;
- decisão individual/dupla aprovação/sócio/jurídico: propostas ainda não aprovadas;
- confidencialidade: prevista;
- auditoria: prevista em módulos administrativos;
- data de início: pendente;
- documento: existe somente no código;
- assinatura e aprovação empresarial: pendentes.

### Governança operacional

A rota `Admin > Jurídico > Governança operacional` existe no código e contempla configurações, autoridade, canais, designação, endereço e histórico. Entretanto, as tabelas `ModerationAuthorityRule`, `CorporateChannel`, `PrivacyOfficerAppointment` e `BookingPolicyHistory` não existem no banco compartilhado atual.

## 17. O que depende de fornecedor

- conta Asaas vinculada ao CNPJ e ambiente correto;
- webhook e pagamentos de sandbox homologados;
- transferência/repasse real ao anfitrião;
- Persona e suas regras de retenção/exclusão;
- antivírus real;
- moderação automática, caso adotada;
- SMS e e-mail reais;
- DPA e subprocessadores de Supabase, Vercel, Google/Firebase, Twilio, Resend e Sentry;
- regiões de armazenamento e transferências internacionais;
- capacidade de exclusão em cada operador.

## 18. O que depende de homologação

### Pagamentos, cancelamento e reembolso

Encontrado:

- Pix e cartão via Asaas;
- valor total e valores em centavos;
- checkout com revisão e aceite obrigatório;
- ausência de renovação automática nos planos;
- webhook com autenticação e idempotência;
- external reference e checkout token;
- conciliação, cancelamento de cobrança pendente e reembolso;
- ações financeiras com motivo, confirmação e auditoria;
- status de pagamento para o usuário.

Pendente:

- conta e sandbox exclusivos;
- pagamento aprovado, expirado, duplicado e atrasado;
- chargeback e falha após confirmação;
- comprovante formal;
- suporte corporativo;
- migration de `PaymentOperation`;
- política jurídica de reembolso.

Não foi encontrada a expressão “cancelamento fácil” no código auditado.

### Reservas, taxa e repasses

Encontrado:

- taxa configurável em pontos-base, com fallback de 10%;
- valor bruto, taxa e líquido calculados em centavos;
- proposta de 10% para plataforma e 90% para anfitrião;
- prazo proposto de 24 horas após check-in confirmado;
- contestação, disputa e bloqueio;
- aceite específico da reserva;
- repasse bloqueado por padrão;
- conciliação administrativa e referência manual.

As quatro aprovações exigidas são:

1. modelo comercial aprovado;
2. política de cancelamento aprovada;
3. integração de repasse homologada;
4. testes de pagamento, reembolso e disputa aprovados.

Não foi encontrada chamada de transferência ao anfitrião no Asaas. A ação atual registra reconciliação manual após confirmar o pagamento de origem. Portanto, “repasse live” não está implementado como transferência automática e deve permanecer bloqueado.

### Moderação e denúncias

Encontrado:

- denúncia autenticada legada;
- denúncia pública sem login;
- motivos de possível menor, exploração, coerção, tráfico, risco físico, imagem não autorizada, fraude, perfil e documento falso;
- prioridade crítica e protocolo;
- RBAC, MFA e auditoria administrativa em outros módulos.

Pendente:

- painel administrativo para `ModerationCase`;
- retirada cautelar integrada;
- preservação automática de evidência;
- alerta e plantão;
- SLA executável;
- notificação das partes;
- recurso e segunda análise;
- substituto e matriz aprovada.

### Cookies

Encontrado:

- banner;
- aceitar todos;
- rejeitar não necessários;
- botão permanente no rodapé;
- roleta condicionada ao consentimento `all`;
- cookie necessário para sessão;
- armazenamento local para idade, cidade e rascunhos.

Pendente:

- tela de categorias e preferências granulares;
- política pública de cookies;
- registro versionado;
- classificação de cada tecnologia;
- gate do Sentry;
- avaliação de Firebase/reCAPTCHA;
- coerência entre o texto do banner e a inicialização real.

O Sentry é inicializado no cliente quando há DSN, independentemente do cookie `elite_cookie_consent`. O banner afirma que analytics fica desativado após rejeição, o que não está tecnicamente garantido.

### Privacidade e meus dados

Encontrado:

- painel de preferências;
- exportação autenticada;
- solicitação de exclusão;
- fila e worker;
- legal hold, anonimização, remoção de Storage, retry e recibo no código;
- histórico de aceites na UI, embora vazio no banco.

Pendente:

- migrations complementares;
- homologação com banco e Storage isolados;
- protocolo visível e acompanhamento completo;
- correção formal;
- erro por item e reprocessamento em operação;
- comprovante validado;
- canais corporativos.

## 19. O que depende de assinatura da empresa

- ato de designação de BRUNO MORAES DA ROCHA;
- aprovação dos limites de autoridade e substituto;
- aprovação das regras de moderação;
- aprovação das regras comerciais de reservas;
- aprovação da taxa de 10% e do líquido de 90%;
- aprovação do evento e prazo de repasse;
- aprovação de cancelamento, no-show, disputa e reembolso;
- aceite de contratos/DPAs quando não incorporados eletronicamente;
- aprovação final de cada versão jurídica.

## 20. Testes e validações

| Verificação | Resultado | Tempo/contagem | Observação |
|---|---|---|---|
| Build Next.js 16.2.8 | aprovado | 96,8 s | 49 páginas estáticas; Proxy reconhecido |
| TypeScript | aprovado | 44,83 s | `npx tsc --noEmit` |
| Prisma schema | aprovado | 3,45 s | `prisma validate` |
| ESLint | aprovado com avisos | 59,18 s | 0 erros; 14 avisos |
| Playwright | aprovado | 228/228 em 207,57 s | 9 arquivos/projetos |
| `npm audit --omit=dev` | atenção | 5 moderadas | Next/PostCSS, next-auth/uuid e efeito em Sentry |
| `git diff --check` | aprovado | sem erro | apenas avisos LF/CRLF |

O número atual é **228 testes**, não 227.

### Migrations

- total encontrado: 24;
- aplicadas no banco compartilhado: 17;
- não aplicadas: 7;
- nenhuma migration foi aplicada durante esta auditoria.

Não foi identificado ou consultado um banco local separado. O `prisma migrate status` apontou para o endpoint compartilhado do Supabase; portanto, não existe evidência para afirmar que as sete migrations tenham sido aplicadas localmente.

Migrations pendentes:

1. `20260609170000_upload_quarantine`
2. `20260609180000_data_deletion_worker`
3. `20260609190000_payment_operations_booking_ledger`
4. `20260609200000_legacy_media_migration_job`
5. `20260609210000_publication_requirements`
6. `20260610200000_operational_governance_proposals`
7. `20260610210000_block_internal_legal_publication`

### Fotografia do banco

- LegalDocument: 30;
- LegalDocumentVersion: 30;
- DRAFT: 30;
- APPROVED/PUBLISHED: 0;
- versões com revisor, revisão, vigência ou publicação: 0;
- UserAcceptance: 0;
- CheckoutAcceptance: 0;
- ConsentPreference: 0;
- ModerationCase: 0;
- SecurityIncident: 0;
- PrivacyRequest: 0;
- DataDeletionJob: 0;
- DataRetentionRule: 17;
- tabelas de upload, operações financeiras, governança e requisitos de publicação: indisponíveis por migration pendente.

Os testes aprovam comportamento local e regressão. Eles não equivalem a homologação jurídica, de fornecedor ou de produção.

## 21. Arquivos principais

- `docs/PACOTE_ADVOGADA_LEIA_PRIMEIRO.md`
- `docs/AUDITORIA_FINAL_PRE_ADVOGADA_2026-06-10.md`
- `docs/RELATORIO_RAIO_X_JURIDICO_TECNICO_2026-06-09.md`
- `docs/RELATORIO_IMPLEMENTACAO_JURIDICA_TECNICA_2026-06-09.md`
- `docs/RELATORIO_GOVERNANCA_MODERACAO_FINANCEIRO_2026-06-10.md`
- `docs/INVENTARIO_MIDIA_ANTIGA.md`
- `docs/CHECKLIST_PENDENCIAS_SOCIOS.md`
- `docs/CHECKLIST_REVISAO_ADVOGADO.md`
- `docs/CHECKLIST_HOMOLOGACAO.md`
- `docs/GUIA_DEPLOY_HOMOLOGACAO.md`
- `docs/PLANO_ROLLBACK_IMPLEMENTACAO_JURIDICA.md`
- `docs/PLANO_TESTES_JURIDICO_SEGURANCA.md`
- `src/lib/legal-documents.ts`
- `src/lib/internal-governance-minutes.ts`
- `src/proxy.ts`
- `src/lib/auth.ts`
- `src/lib/approved-media.ts`
- `src/lib/upload-quarantine.ts`
- `src/lib/data-deletion-worker.ts`
- `src/lib/payment-operations.ts`
- `src/app/api/moderation/report/route.ts`
- `src/app/api/bookings/route.ts`

### Fontes oficiais consultadas

- [LGPD - Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm)
- [Marco Civil - Lei 12.965/2014](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
- [CDC - Lei 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- [Decreto 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm)
- [ECA Digital - Lei 15.211/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm)
- [Decreto 12.880/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm)
- [Decreto 12.975/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12975.htm)
- [Decreto 12.976/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12976.htm)
- [Regulamentações da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd)
- [Comunicação de incidente à ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)
- [Perguntas e respostas da ANPD sobre o ECA Digital](https://www.gov.br/anpd/pt-br/assuntos/eca-digital/perguntas_respostas_eca_digital_18032026.pdf/%40%40display-file/file)
- [Orientações preliminares da ANPD sobre aferição de idade](https://www.gov.br/anpd/pt-br/assuntos/eca-digital/mecanismos-confiaveis-de-afericao-de-idade-orientacoes-preliminares.pdf/%40%40display-file/file)

## 22. Recomendações objetivas

1. Tratar exposição etária, mídia pública e denúncia emergencial como prioridade zero.
2. Não fazer deploy das alterações locais antes de homologação isolada.
3. Não aplicar migrations no banco compartilhado sem backup, revisão SQL, ensaio e rollback.
4. Entregar esta auditoria e a minuta de designação à advogada.
5. Redigir os 30 documentos genéricos a partir das decisões jurídicas.
6. Criar uma versão jurídica por documento, com hash, parecer e aprovação empresarial.
7. Validar e-mails, telefone, endereço e responsável por cada canal.
8. Fechar matriz de fornecedores com evidências da conta, termos e DPA.
9. Implementar histórico de aceite em cadastro, KYC, conteúdo, cookies e marketing.
10. Homologar exclusão, exportação, incidentes, moderação, Asaas e reservas.
11. Manter repasse live desligado até as quatro aprovações e uma integração real.
12. Atualizar checklists e relatórios com 24 migrations, 7 pendentes e 228 testes.

## 23. RESPOSTA FINAL

**Status:** parcial.
**31 minutas:** 31 definições, 30 persistidas, 1 pronta como minuta interna, 31 com pendências.
**LGPD:** parcial.
**ECA Digital:** parcial, com risco crítico na produção e no legado público.
**Fornecedores:** pendente.
**Pagamentos e reservas:** parciais e bloqueados para produção.
**Moderação:** parcial, com fluxos críticos ausentes.
**Produção:** bloqueada.

**Pronto para revisão da advogada, não pronto para produção.**

## 24. Addendum de correcoes criticas locais

Data do addendum: 11 de junho de 2026.
Natureza: correcao tecnica local, sem deploy, sem publicacao de termos, sem aprovacao juridica e sem aplicacao de migrations em banco compartilhado.

### Criticos/altos tratados no codigo local

- Barreira etaria server-side reforcada em `src/proxy.ts`, APIs de profissionais, stories, reviews, midia e imoveis. Visitante sem sessao ou sem `adultVerified` recebe bloqueio antes de dados de perfil, fotos, stories, reviews ou imoveis.
- Headers `no-store` e `X-Robots-Tag: noindex` adicionados para rotas sensiveis e respostas de bloqueio.
- SEO publico neutralizado: metadados globais nao indexam, `robots.txt` bloqueia `/`, `sitemap.xml` fica vazio e `generateMetadata` de perfis nao consulta mais dados de profissionais nem imagens.
- Midia legada publica: novas referencias a `/storage/v1/object/public/` passaram a ser recusadas em publicacao; respostas publicas autenticadas removem URLs legadas quando encontradas. A migracao fisica dos 2 arquivos legados nao foi executada.
- Aceites versionados: cadastro, telefone, complemento de perfil, KYC, upload, reserva, Pix, cartao e checkout profissional passaram a registrar `UserAcceptance`/`ConsentPreference` e, quando aplicavel, `CheckoutAcceptance` com versao/hash das minutas existentes.
- Denuncia emergencial: motivos criticos, incluindo imagem nao autorizada, agora criam `ModerationCase`, aplicam retirada cautelar tecnica por tipo de alvo, preservam evidencia hash em `EvidenceArtifact`, registram evento e auditoria.
- Painel administrativo de denuncias: passou a listar `ModerationCase`, evidencia, historico de eventos, decisao, recurso e encaminhamento para advogada.
- Testes de regressao adicionados para APIs sensiveis anonimas, redirecionamento de paginas de perfil/listagem e arquivos `robots.txt`/`sitemap.xml`.

### Validacao tecnica do addendum

- `npx tsc --noEmit`: aprovado.
- `npx prisma validate`: aprovado.
- `npm run lint`: aprovado com 14 avisos preexistentes.
- `npm run build`: aprovado em Next 16.2.8.
- `npm run test -- --project=legal-security`: 11/11 aprovado.
- `npm run test`: 231/231 aprovado.
- `git diff --check`: sem erro de whitespace; somente avisos LF/CRLF do Git no Windows.

### Pendencias que continuam

- Nenhum deploy foi feito.
- Nenhuma migration foi aplicada no banco compartilhado.
- As 31 minutas continuam `DRAFT`/rascunho e nao foram aprovadas ou publicadas.
- A migracao dos 2 objetos de midia antiga continua pendente de `--stage`, revisao humana, `--finalize` ou `--rollback` em ambiente homologado.
- Fornecedores, DPAs, canais corporativos, Asaas, Persona, antivirus/moderacao real e repasse live continuam pendentes de homologacao/validacao.
- A conformidade LGPD/ECA Digital nao deve ser declarada ate revisao juridica, homologacao isolada e aprovacao empresarial.

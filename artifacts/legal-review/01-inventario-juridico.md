# Inventário jurídico técnico — Elite Modell

Data do inventário: 10/09/2026. Status: material técnico para revisão profissional; não constitui parecer jurídico.

## Identidade e escopo

- Plataforma: Elite Modell.
- Pessoa jurídica declarada nos documentos vigentes: ELITE MODEL LTDA, CNPJ 66.807.135/0001-71.
- Domínio canônico encontrado no código e na configuração Supabase: `https://www.elitemodell.com.br`.
- Repositório: `EliteModell/elitemodell`, branch `main`.
- Aplicação: Next.js 16.2.8, PostgreSQL/Supabase e Prisma 5.22.
- Finalidade observada: descoberta de perfis profissionais adultos, publicação de perfis e mídias, contato, agendamento, avaliações, planos/destaques e funções administrativas de verificação e moderação.
- Abrangência observada: endereços e cidades brasileiras; não existe bloqueio técnico completo por país.

## Inventário quantitativo

- 357 arquivos possuem ao menos uma ocorrência do vocabulário amplo pesquisado (`termos`, `privacidade`, `LGPD`, `cookies`, `consentimento`, `maioridade`, `responsabilidade`, `contrato`, `jurídico`, `legal`, `terms`, `privacy`, `consent`, `age`, `18+`). O número inclui regras de negócio e testes, não apenas documentos.
- 51 arquivos documentais `.md`, `.pdf` ou `.docx` foram identificados pela busca ampla fora deste pacote.
- Banco consultado somente para leitura: 32 documentos, 62 versões, 432 aceites de usuário, 43 preferências de consentimento, 3 solicitações de privacidade, 65 declarações de conteúdo e 0 aceites de checkout na tabela específica.
- Catálogo atual em código: 31 documentos; 25 públicos e 6 internos.
- Diferença banco/catálogo: existe no banco uma política promocional descontinuada, fora do catálogo atual. Ela e seus aceites devem ser preservados como histórico até decisão formal de retenção.

## Documentos catalogados

Públicos: Termos de Uso Gerais; Termos para Clientes; Termos para Profissionais; Termos para Anfitriões; Política de Privacidade; Política de Cookies; Política de Verificação de Identidade e Biometria; Política de Conteúdo; Regras da Comunidade; Política de Moderação e Denúncia; Política de Maioridade e Proteção contra Exploração; Política de Prevenção a Fraudes; Política de Pagamentos; Termos dos Destaques; Política de Cancelamento e Reembolso; Política do Período Gratuito; Política de Retenção e Exclusão; Procedimento de Direitos LGPD; Aviso Resumido de Cadastro; Aviso de Biometria; Aviso de Documentos; Aviso de Publicação de Conteúdo; Aviso de Checkout; Confirmação de Maioridade; Declaração de Autoria e Autorização.

Internos: Plano de Resposta a Incidentes; Política Interna de Controle de Acesso; Política Interna de Segurança; Política de Administradores e Moderadores; Modelo de Contrato com Operadores; Ato Formal de Designação do Responsável Operacional.

Todos possuem uma versão mais recente `1.0-operational-2026-06-11`. Os 25 públicos estão marcados `OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION`, publicados e vigentes desde 11/06/2026 e com indicação de novo aceite. Os 6 internos estão `DRAFT_INTERNAL`, sem publicação ou vigência.

## Páginas, rotas e superfícies

- Públicas: `/terms`, `/privacy`, `/politica-conteudo`, `/documentos/[key]` e rodapé.
- Cadastro/complementação: checkboxes de Termos, Privacidade/LGPD e maioridade.
- KYC: avisos de documento, identidade e biometria.
- Upload: declaração de autoria/autorização e política de conteúdo.
- Checkout: aviso de checkout, política de pagamentos, cancelamento/reembolso, maioridade e aceite.
- Área do titular: `/dashboard/privacidade`, exportação e exclusão de conta.
- Administração: `/admin/juridico`, pendências, governança, minutas e exclusões; exportação em `/api/admin/legal/export`.

## Fontes técnicas principais

- `src/lib/legal-document-catalog.ts`: catálogo, status e placements.
- `src/lib/legal-acceptance.ts`: resolução de versões e gravação de evidências.
- `src/components/legal/OperationalLegalDocumentPage.tsx`: renderização pública.
- `prisma/schema.prisma`: documentos, versões, aceites, consentimentos, privacidade, moderação, retenção e exclusão.
- `docs/PACOTE_FINAL_PUBLICACAO_ELITEMODELL_V1_2026-06-11.md`: consolidação operacional publicada.
- `docs/PACOTE_COMPLETO_31_MINUTAS_PARA_REVISAO_E_ASSINATURA_2026-06-11.md`: minutas para revisão.
- `docs/envio-advogada-2026-06-11/`: arquivos DOCX/PDF existentes.

## Conteúdo antigo preservado

Os documentos originais e históricos não foram apagados. A política da funcionalidade promocional retirada permanece apenas em documentação histórica, migrations e banco. A rota genérica só publica chaves presentes no catálogo, portanto essa chave antiga não é servida pela aplicação atual. Recomenda-se definir retenção, arquivamento e eventual despublicação formal no banco antes de qualquer migration destrutiva.


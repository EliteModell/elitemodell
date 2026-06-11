# Pacote da advogada - leia primeiro

**Empresa:** ELITE MODEL LTDA
**CNPJ:** 66.807.135/0001-71
**Plataforma:** Elite Model / Elite Modell
**Data desta consolidação:** 10 de junho de 2026
**Status:** MATERIAL TÉCNICO E MINUTAS EM RASCUNHO - SEM APROVAÇÃO JURÍDICA

## 1. Finalidade deste pacote

Este conjunto reúne o diagnóstico técnico, as propostas operacionais, os fluxos existentes no código, os bloqueios e as decisões que precisam de revisão jurídica e empresarial.

Ele não é parecer jurídico, não comprova conformidade legal e não autoriza publicação, deploy, migração, cobrança, repasse ou alteração de produção.

O dossiê técnico pode ser encaminhado para revisão da advogada. O conjunto das minutas ainda não está pronto para publicação: 30 documentos persistidos são modelos genéricos e a 31ª minuta existe somente no código local.

## 2. O que é a Elite Modell

A Elite Modell é uma plataforma digital destinada a adultos, com fluxos para:

- cadastro de clientes, profissionais e anfitriões;
- perfis, fotos, vídeos, stories e busca de profissionais;
- verificação de identidade e idade;
- anúncios e reservas de locais;
- planos e destaques pagos;
- pagamentos por Pix e cartão via Asaas;
- denúncias, moderação e administração;
- solicitações de privacidade, exportação e exclusão de dados.

O tratamento envolve dados de risco elevado, incluindo documentos, data de nascimento, biometria ou verificação facial, conteúdo adulto, localização, dados financeiros, IP, user agent, registros de aceite e denúncias.

## 3. Estado real encontrado

- Existem 31 definições de documentos no código.
- Existem 30 documentos no banco compartilhado, todos na versão `0.1-draft`.
- Os 30 documentos persistidos têm entre 279 e 313 caracteres e são modelos genéricos, não minutas jurídicas completas.
- A minuta de designação do responsável operacional está na versão `0.3-internal-governance-minute`, mas ainda não foi persistida.
- Nenhum documento possui aprovação, publicação, vigência, parecer, revisor ou exigência de reaceite registrada.
- Sete migrations operacionais ainda não foram aplicadas no banco compartilhado.
- Há páginas estáticas de Termos, Privacidade e Conteúdo já acessíveis publicamente e fora do fluxo versionado das minutas.
- A produção atual ainda permite acesso público a perfis e os inclui no sitemap.
- Há duas referências legadas em buckets públicos, sem aprovação individual comprovada.

## 4. Arquivos principais enviados

1. `AUDITORIA_FINAL_PRE_ADVOGADA_2026-06-10.md`
2. `PACOTE_31_MINUTAS_ADVOGADA_2026-06-11.md`
3. `RELATORIO_RAIO_X_JURIDICO_TECNICO_2026-06-09.md`
4. `RELATORIO_IMPLEMENTACAO_JURIDICA_TECNICA_2026-06-09.md`
5. `RELATORIO_GOVERNANCA_MODERACAO_FINANCEIRO_2026-06-10.md`
6. `INVENTARIO_MIDIA_ANTIGA.md`
7. `CHECKLIST_PENDENCIAS_SOCIOS.md`
8. `CHECKLIST_REVISAO_ADVOGADO.md`
9. `CHECKLIST_HOMOLOGACAO.md`
10. `PLANO_TESTES_JURIDICO_SEGURANCA.md`
11. `PLANO_ROLLBACK_IMPLEMENTACAO_JURIDICA.md`
12. `GUIA_DEPLOY_HOMOLOGACAO.md`
13. exportação administrativa futura por `/api/admin/legal/export`

A exportação administrativa não deve ser tratada como completa enquanto a 31ª minuta não estiver persistida e as migrations necessárias não tiverem sido aplicadas em ambiente isolado de homologação.

## 5. Fluxos técnicos existentes

| Fluxo | Implementação encontrada | Situação para revisão |
|---|---|---|
| Cadastro e autenticação | Supabase, Google, telefone, Firebase e OTP alternativo | Aceites não possuem histórico versionado completo |
| KYC e biometria | Persona ou revisão manual | Bases legais, retenção, transparência e contrato precisam de revisão |
| Fotos, vídeos e stories | Quarentena privada para novos uploads e rota controlada para mídia aprovada | Mídia legada pública ainda não foi migrada |
| Privacidade | Painel, preferências, exportação, pedido de exclusão e worker | Migrations e homologação operacional pendentes |
| Denúncia | Fluxo autenticado legado e denúncia pública emergencial | Casos emergenciais não possuem fila administrativa operacional completa |
| Moderação | RBAC, MFA, auditoria e propostas de autoridade | Retirada cautelar, recurso, evidência e matriz aprovada estão pendentes |
| Pagamentos | Pix/cartão Asaas, webhook, conciliação, cancelamento e reembolso | Homologação real, documentos e regras finais pendentes |
| Reservas | Valores em centavos, proposta 10%/90%, disputa e bloqueios de repasse | Regras comerciais e integração real de repasse pendentes |
| Cookies | Aceitar todos, rejeitar não necessários e link permanente | Categorias granulares, registro e bloqueio do Sentry pendentes |
| Incidentes | Tabela e minuta de plano | Não há procedimento operacional completo ou tela de gestão |

## 6. Fornecedores identificados

Fornecedores e serviços encontrados no projeto:

- Asaas: pagamentos, Pix, cartão, webhook, cancelamento e reembolso;
- Supabase: autenticação, PostgreSQL e Storage;
- Vercel: hospedagem pública atual;
- Persona: KYC e verificação facial, quando configurada;
- Google e Firebase: OAuth, telefone, reCAPTCHA e mapas;
- Twilio: SMS/OTP alternativo, quando configurado;
- Resend: e-mail transacional;
- Sentry: observabilidade e monitoramento, quando configurado;
- Cloudflare Turnstile ou Google reCAPTCHA: proteção antiabuso;
- Upstash: rate limit distribuído, quando configurado;
- Hetzner: planejamento de infraestrutura, sem evidência de produção ativa;
- antivírus e moderação HTTP: adaptadores existem, fornecedor real não foi definido.

A matriz completa, com links oficiais disponíveis e campos de contrato/DPA, está no relatório de auditoria. Conta vinculada ao CNPJ, região, DPA aceito e responsável interno devem ser comprovados fornecedor por fornecedor.

## 7. O que a advogada precisa revisar

- papel jurídico da plataforma em perfis, anúncios, reservas e pagamentos;
- aplicação da LGPD a documentos, biometria, conteúdo adulto, localização e dados financeiros;
- bases legais por finalidade, LIA e necessidade de RIPD;
- transparência e consentimento na verificação etária e biométrica;
- Lei 15.211/2025, Decreto 12.880/2026 e orientações da ANPD sobre aferição de idade;
- Marco Civil, inclusive os Decretos 12.975 e 12.976, de 20 de maio de 2026;
- retirada de conteúdo íntimo não autorizado, preservação e comunicação;
- fluxo de denúncia, retirada cautelar, recurso e comunicação com autoridades;
- CDC e Decreto 7.962/2013 para checkout, oferta, suporte, arrependimento e reembolso;
- regras de reserva, no-show, disputa, cancelamento, taxa de 10% e líquido de 90%;
- evento, prazo e forma de repasse ao anfitrião;
- retenção, exclusão, anonimização, legal hold e descarte;
- comunicação de incidentes conforme a Resolução CD/ANPD 15/2024;
- função, autonomia e publicidade do responsável de privacidade conforme a Resolução CD/ANPD 18/2024;
- transferências internacionais e contratos conforme a Resolução CD/ANPD 19/2024;
- contratos, termos eletrônicos, DPAs e subprocessadores dos fornecedores;
- foro, limitação de responsabilidade, canais e identificação empresarial;
- necessidade de novo aceite a cada alteração material.

## 8. Conteúdo público que exige decisão imediata

As rotas `/terms`, `/privacy` e `/politica-conteudo` retornam conteúdo público. Termos e Privacidade aparecem no sitemap da produção. Esses textos:

- não são gerados pelos documentos versionados;
- não possuem parecer ou aprovação registrados;
- usam canais de e-mail sem comprovação de existência;
- contêm regras e promessas que precisam de revisão;
- não devem ser confundidos com as minutas bloqueadas no banco.

Também foram encontrados perfis públicos e perfis individuais no sitemap da produção, incompatíveis com a proteção etária preparada apenas no código local.

## 9. O que está bloqueado

- publicação das 31 minutas;
- produção das alterações locais;
- aplicação das sete migrations no banco compartilhado;
- repasse live;
- migração ou exclusão da mídia legada;
- ativação de fornecedores de antivírus/moderação sem homologação;
- uso de canais corporativos não validados;
- aprovação de política de reembolso e regras de reserva;
- declaração de conformidade legal;
- assinatura ou designação definitiva sem representante legal.

## 10. Documentos que precisam de assinatura

- ato formal de designação do responsável operacional;
- políticas internas cuja governança empresarial exigir aprovação formal;
- contratos ou DPAs que não sejam incorporados automaticamente por aceite eletrônico;
- aprovação empresarial das regras comerciais de reserva, cancelamento e repasse;
- registro final de aprovação das versões jurídicas.

Na minuta de designação permanecem pendentes apenas:

- data de início;
- substituto informado: Bruno Felicio Pereira de Moura;
- representante legal informada: Larissa de Campos Lacerda Souza;
- CPF, somente se juridicamente necessário;
- assinatura.

## 11. Campos para parecer e aprovação

Para cada documento, a revisão deve registrar:

- versão e hash;
- nome e qualificação do revisor;
- data da revisão;
- parecer, ressalvas e alterações exigidas;
- referência do parecer ou chamado;
- aprovação ou rejeição empresarial;
- data de vigência;
- necessidade de novo aceite;
- assinatura do representante legal, quando aplicável.

## 12. Conclusão para encaminhamento

O material técnico está organizado para revisão, mas as minutas e a operação não estão liberadas.

**Pronto para revisão da advogada, não pronto para produção.**

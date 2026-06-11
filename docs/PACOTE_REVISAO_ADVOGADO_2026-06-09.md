# Pacote de revisao para advogado

Status: **MINUTAS TECNICAS NAO APROVADAS JURIDICAMENTE**

Data de preparacao: 2026-06-09

## Objetivo

Reunir documentos, matrizes, fluxos implementados e decisoes pendentes para revisao por advogado brasileiro. Este pacote nao e parecer juridico e nao autoriza publicacao.

## Conteudo

1. `RELATORIO_RAIO_X_JURIDICO_TECNICO_2026-06-09.md`
2. `RELATORIO_IMPLEMENTACAO_JURIDICA_TECNICA_2026-06-09.md`
3. `INVENTARIO_MIDIA_ANTIGA.md`
4. `CHECKLIST_PENDENCIAS_SOCIOS.md`
5. `CHECKLIST_REVISAO_ADVOGADO.md`
6. `PLANO_TESTES_JURIDICO_SEGURANCA.md`
7. `PLANO_ROLLBACK_IMPLEMENTACAO_JURIDICA.md`
8. `RELATORIO_GOVERNANCA_MODERACAO_FINANCEIRO_2026-06-10.md`
9. exportacao administrativa dos 31 documentos em `/api/admin/legal/export`

## Trinta e um documentos

1. Termos de Uso Gerais
2. Termos para Clientes
3. Termos para Profissionais
4. Termos para Anfitrioes
5. Politica de Privacidade
6. Politica de Cookies
7. Politica de Verificacao de Identidade e Biometria
8. Politica de Conteudo
9. Regras da Comunidade
10. Politica de Moderacao e Denuncia
11. Politica de Maioridade e Protecao contra Exploracao
12. Politica de Prevencao a Fraudes
13. Politica de Pagamentos
14. Termos dos Destaques
15. Politica de Cancelamento e Reembolso
16. Politica do Periodo Gratuito
17. Politica de Retencao e Exclusao
18. Procedimento de Direitos LGPD
19. Plano de Resposta a Incidentes
20. Politica Interna de Controle de Acesso
21. Politica Interna de Seguranca
22. Politica Interna de Administradores e Moderadores
23. Modelo de Contrato com Operadores
24. Aviso Resumido de Cadastro
25. Aviso de Biometria
26. Aviso de Documentos
27. Aviso de Publicacao de Conteudo
28. Aviso de Checkout
29. Confirmacao de Maioridade
30. Declaracao de Autoria e Autorizacao
31. Ato Formal de Indicacao do Responsavel ou Encarregado pelo Tratamento de Dados Pessoais

## Matrizes

- Matriz legal: LGPD, Marco Civil, CDC, comercio eletronico, normas ANPD e protecao de criancas e adolescentes.
- Matriz Lei Felca: barreira etaria, nao entrega de conteudo antes da verificacao, denuncia, retirada, evidencia e autoridade.
- Matriz de dados: cadastro, KYC/biometria, midia, pagamento, reserva, auditoria, retencao, exportacao e exclusao.
- Matriz de autoridade da moderacao: permissao, execucao individual, segundo aprovador, socio, juridico, evidencia e comunicacao.
- Matriz de visibilidade do endereco por contexto.

## Fluxos para revisar

- Aceite: versao/hash, IP, user agent, sessao, data e reaceite.
- KYC: Persona ou revisao manual; acesso administrativo com RBAC e MFA.
- Exclusao: simulacao, fila, tentativas, legal hold, anonimização, comprovante e preservacao.
- Denuncia: triagem, emergencia, retirada, eventos, evidencia e prazo.
- Financeiro: Asaas, webhook idempotente, conciliacao, cancelamento, reembolso e beneficio.
- Reservas: total, taxa de 10%, liquido de 90%, no-show, disputa, reembolso e repasse.
- Indicacao operacional: BRUNO MORAES DA ROCHA para moderacao e privacidade, sem substituir o ato formal.
- Canais corporativos: suporte, privacidade, seguranca/incidentes e financeiro.

## Decisoes juridicas necessarias

- bases legais finais e necessidade de LIA/RIPD;
- biometria e verificacao etaria;
- prazos de retencao e legal hold;
- regras finais de cancelamento, arrependimento e reembolso;
- papel contratual da plataforma em reservas;
- no-show, disputa e prazo de repasse;
- ato formal, substituto, autonomia e conflitos do responsavel de privacidade;
- limites de autoridade da moderacao e comunicacao ao usuario;
- visibilidade do endereco empresarial em cada contexto;
- autoridades, preservacao, sigilo e incidentes;
- adequacao final a Lei 15.211/2025 e ao Decreto 12.880/2026.

## Exportacao

O administrador com permissao `legal:manage` e MFA pode baixar um JSON contendo as 31 minutas, hashes, versoes, pendencias, matrizes, configuracoes e historico em:

`/api/admin/legal/export`

O arquivo exportado carrega aviso expresso de que nao existe aprovacao juridica.

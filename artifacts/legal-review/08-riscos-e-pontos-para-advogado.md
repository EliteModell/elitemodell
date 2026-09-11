# Riscos e pontos para o advogado

## Questões para o advogado

1. Qual é a qualificação jurídica exata da plataforma: vitrine, marketplace, intermediadora ou outra?
2. Quais cláusulas são obrigatórias para clientes, profissionais, administradores e eventuais anfitriões?
3. Como delimitar responsabilidade por conteúdo, identidade, fraude, contato e encontro presencial?
4. Como descrever atividade e conteúdo adulto sem sugerir garantia, participação ou oferta ilícita?
5. O age gate público e a declaração no cadastro são suficientes? Em quais riscos exigir KYC?
6. Como tratar suspeita de menoridade, exploração, coerção ou tráfico e quando acionar autoridades?
7. Quais fundamentos e prazos aplicar a documentos, biometria, logs, mensagens, pagamentos, denúncias e evidências?
8. Quais fornecedores são operadores/controladores; há transferência internacional e contratos adequados?
9. Como estruturar consentimento, legítimo interesse, revogação e prova de aceite?
10. Qual política de cookies e analytics aplicar antes/depois da escolha do visitante?
11. Qual política de cancelamento, arrependimento, reembolso, falha, chargeback e no-show?
12. Como definir taxas, repasses, tributos e responsabilidade financeira se forem ativados?
13. Como tratar exclusão de conta, anonimização, portabilidade e retenção defensiva?
14. Qual procedimento de denúncia, retirada cautelar, suspensão, recurso e reincidência?
15. Como notificar atualização de termos, quando exigir reaceite e como provar a versão aceita?
16. Qual lei, jurisdição, foro e canal jurídico devem constar?
17. O canal provisório `admin@elitemodell.com.br` pode receber comunicações jurídicas?
18. Como retirar formalmente documentos de funcionalidades descontinuadas preservando versões e aceites?

## Riscos técnicos encontrados

- Os 25 documentos públicos estão publicados como versão operacional pendente de ratificação jurídica, não como aprovação final.
- Textos atuais ainda citam anfitriões, imóveis e vouchers, embora essas funções estejam retiradas ou em retirada.
- Banco contém documento e dados reais da promoção descontinuada: 58 participações, 4 benefícios emitidos e 1 política. Apagar sem plano pode destruir prova, dados financeiros ou histórico de aceite.
- Há 432 aceites gerais, mas 0 registros na tabela específica `CheckoutAcceptance`; verificar se compras reais usaram outra trilha ou se houve falha de gravação.
- Persona e Didit coexistem no código; a configuração local indica Persona em sandbox. Confirmar fornecedor efetivo de produção.
- A configuração Vercel está vinculada, mas a CLI local não tem autorização para listar projeto/variáveis; integrações de produção não foram comprovadas por essa via.
- Retenção final e canal jurídico continuam pendentes nos próprios documentos.
- Perfis adultos, mídias e localização elevam o impacto de vazamento, fraude e exposição indevida.

## Não decidir sem validação profissional

Este pacote não define foro, responsabilidade, legalidade da atividade anunciada, prazo de retenção, base legal específica, política financeira ou obrigação de comunicação. Ele descreve o comportamento técnico para que essas escolhas sejam formalizadas.


# Fluxos financeiros e pagamentos

## Meios e gateway

- Gateway implementado: Asaas.
- Métodos observados: Pix e cartão de crédito.
- Cobranças locais são registradas em `Payment`; o ID do provedor, status, valor, QR Code/Pix, datas, reembolso e reconciliação são persistidos.
- Webhooks possuem idempotência; status incluem pendente, pago, reembolso parcial/integral, cancelado, expirado, chargeback e falha.
- Operações administrativas de conciliação, cancelamento e reembolso geram `PaymentOperation` e `AuditLog`.
- Chaves/segredos não foram incluídos neste pacote.

## Produtos cobrados

Cliente Premium no código atual: 24 horas por R$ 4,99; 30 dias por R$ 39,90, com primeira compra a R$ 10,99; 90 dias por R$ 79,90; existe ainda oferta mensal de R$ 49,90 no upsell. Confirmar coerência comercial entre as duas listas.

Profissional: topo por 1 hora; pontos; telefone na listagem; Bronze, Prata, Ouro, Diamante e idade oculta, com opções de 3, 7 ou 30 dias e preços codificados em `src/lib/professional-plans.ts`. O checkout profissional aceita Pix e registra duração, preço total, aviso, termos e política de reembolso.

Créditos e reservas de imóveis ainda aparecem em modelos/rotas financeiras legadas. As rotas de imóvel/anfitrião estão retiradas pelo `proxy`; o advogado deve orientar se os textos e dados históricos devem permanecer e por quanto tempo.

## Aceite e prova

- O checkout exige confirmação de termos e maioridade.
- O sistema resolve as versões vigentes de aviso de checkout, pagamentos e reembolso; grava número/hash, preço e snapshot de informação.
- Idempotency keys reduzem duplicidade.
- Benefício pago pode aguardar vinculação da conta e depois ser aplicado pelo webhook/claim.
- Reembolso integral reverte efeitos pagos; chargeback pode abrir disputa de reserva.

## Taxas, repasses e encontros

O modelo de booking legado calcula taxa de serviço e repasse do anfitrião e mantém repasse bloqueado até aprovação/homologação. Os documentos anteriores mencionam taxa de 10% e repasse de 90%, mas isso exige confirmação empresarial e jurídica e não deve ser tratado como política final sem validação.

Agendamentos com profissionais armazenam valor informado, mas o código atual não demonstra escrow ou repasse do atendimento presencial. Deve-se definir claramente se a plataforma apenas aproxima usuários ou participa da contratação/pagamento do serviço.

## Decisões necessárias

- Cancelamento, arrependimento, no-show, reembolso parcial/integral e prazos.
- Responsabilidade por falha de gateway, duplicidade, fraude, chargeback e contestação.
- Recorrência: os planos atuais parecem pagamentos únicos por duração; proibir linguagem de assinatura/renovação se não existir cobrança recorrente.
- Regras de início e término do benefício, expiração de Pix, primeira compra e preços promocionais.
- Emissão fiscal, conciliação, retenção contábil e atendimento financeiro.
- Se houver repasse: condição, prazo, reserva financeira, bloqueio, estorno, taxa e responsabilidade tributária.


# Diagnostico de estrutura do EliteModell

## Conceito de produto

O projeto tem dois blocos principais:

- Marketplace adulto premium: acompanhantes com cadastro, documentos, biometria, fotos, servicos, valores e aprovacao.
- Rooms / imoveis: experiencia inspirada em Airbnb, com hospedagem/espacos por diaria, localizacao, fotos, regras e reservas.

## Estruturas funcionando

- Autenticacao com NextAuth/Firebase.
- Cadastro de cliente e anunciante com maioridade, termos e LGPD.
- Cadastro de acompanhante em etapas.
- Upload publico para fotos de perfil, stories e agora fotos de imoveis.
- Upload privado para documentos/verificacao.
- API de profissionais com validacao forte.
- API de imoveis com criacao real e status `PENDING_REVIEW`.
- Campo de GPS no schema de imoveis: `latitude` e `longitude`.
- Cadastro de imovel agora captura GPS pelo navegador ou aceita coordenadas manuais.
- Fotos de imovel agora sao salvas em `PropertyPhoto`.
- Busca de imoveis por texto agora usa `search` em titulo, cidade, estado e endereco.
- Schema ja possui reservas, pagamentos, datas bloqueadas, precos sazonais e avaliacoes.

## Estruturas parcialmente prontas

- Pagamentos: rotas existem, mas `MERCADOPAGO_ACCESS_TOKEN` nao esta configurado.
- Biometria: rota existe em modo manual local, mas falta provedor real de KYC/liveness.
- Aprovacao admin: profissionais tem tela/admin; imoveis ainda precisam de painel de aprovacao equivalente.
- Reservas de imoveis: schema e rotas existem, mas precisa testar fluxo ponta a ponta com pagamento.
- Disponibilidade: `BlockedDate` existe no banco, mas falta calendario visual para bloquear datas.
- Preco sazonal: `SeasonalPrice` existe no banco, mas falta tela para configurar temporadas.

## Falta para o modulo Airbnb ficar premium

- Mapa visual no cadastro e na pagina do imovel.
- Geocoding por CEP/endereco para preencher latitude e longitude automaticamente.
- Privacidade de localizacao: mostrar bairro/regiao antes da reserva e endereco completo apenas apos pagamento.
- Painel do anfitriao para editar imovel, fotos, regras, disponibilidade e precos.
- Calendario de disponibilidade com bloqueio de datas.
- Regras de cancelamento.
- Taxa de servico da plataforma calculada no checkout.
- Fluxo de reserva com confirmacao, pagamento PIX/cartao e status claro.
- Mensagens entre cliente e anfitriao ligadas a reserva.
- Admin para aprovar/reprovar imoveis e ver documentos do anfitriao.
- Moderacao de fotos de imoveis.

## Falta para o modulo adulto ficar premium

- Provedor real de biometria facial.
- Webhook de KYC.
- Moderacao automatica de fotos publicas.
- Rascunho salvo por etapa.
- Painel de pendencias do perfil.
- Planos premium e impulsionamento ligados a destaque real.
- Auditoria completa de aprovacao/reprovacao.

## Observacao operacional

Para desenvolvimento local, usar sempre:

```bash
npm run turbo
```

# Registros legados da promoção descontinuada

## Motivo deste anexo

A funcionalidade promocional foi retirada do produto, mas a consulta somente leitura encontrou dados reais. Para não destruir histórico, prova de aceite ou dados relacionados a transações/agendamentos, o schema, migrations históricas e o tratamento no worker LGPD foram preservados. Nenhuma tabela, coluna ou linha foi apagada.

## Contagens em 10/09/2026

| Estrutura | Registros |
|---|---:|
| Configuração | 1 |
| Orçamentos | 4 |
| Prêmios | 9 |
| Estoques diários | 80 |
| Participações/giros | 58 |
| Benefícios/vouchers de cliente | 4 |
| Configurações de aceite por profissional | 0 |
| Documento jurídico promocional | 1 |

## Estado após a retirada de produto

- Componentes e páginas de interação: ausentes.
- APIs de consulta/resgate/desbloqueio: removidas.
- Uso em carteira, agendamentos e configurações profissionais: removido.
- Permissão administrativa e testes específicos: removidos.
- Manifesto do build: nenhuma rota relacionada.
- Catálogo jurídico público: a política antiga já não está catalogada, e a página genérica retorna 404 para chaves fora do catálogo.
- Dados e evidências: preservados no banco; o worker de exclusão ainda consegue desvincular/anonimizar registros ligados ao titular.

## Decisão necessária antes de migration

O advogado e o responsável empresarial devem definir: fundamento e prazo de retenção; necessidade de preservar valores/códigos e aceites; anonimização de identificadores; tratamento de benefícios ainda marcados como disponíveis; despublicação/arquivamento formal da versão jurídica no banco; e momento seguro para migration destrutiva. Só depois disso deve ser preparada e revisada uma migration de remoção das estruturas legadas.


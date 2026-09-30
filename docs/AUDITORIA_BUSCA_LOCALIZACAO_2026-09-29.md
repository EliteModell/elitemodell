# Correção da busca por localização

## Causa raiz

- `/buscar` filtrava somente `SUPPORTED_PUBLIC_LOCATIONS`: 13 cidades, majoritariamente de MG, sem consultar os cadastros.
- A Home usava a mesma lista como fallback de `/api/address/search`. Essa rota não estava entre as rotas públicas do proxy e exigia autenticação. Além disso, dependia de Google Places e retornava sugestões vazias sem chave.
- O filtro de profissionais usava `contains` e variantes de uma lista limitada. `mode: insensitive` não remove acentos no PostgreSQL; portanto, `Vitoria` não era equivalente a `Vitória`. A correspondência parcial também podia misturar municípios.

## Auditoria do registro real

Consulta realizada no banco configurado em `.env`, sem alterar o cadastro:

- Encontrado um perfil de Vitória/ES, categoria MULHER, status ACTIVE.
- `city = Vitória`, `state = ES`.
- `currentServiceCity` e `currentServiceState` nulos: deve prevalecer o fallback para `city/state`.
- Sem pausa e com acesso gratuito vigente até 29/10/2026.
- Não foi necessário corrigir dados ou liberar moderação/acesso.

## Implementação

- Home e modal compartilham sugestões do catálogo do IBGE: 5.571 localidades, 27 UFs; fonte e atualização documentadas em `src/data/brazilian-cities.md`.
- A resposta local é imediata, inclusive sem Google ou sem a API de prioridade. O servidor prioriza cidades com profissionais ativos disponíveis, usando as mesmas regras de acesso e pausa da listagem.
- `/api/locations/cities` é pública para funcionar antes do login. Retorna somente dados de cidades e contagens agregadas.
- Consulta aceita acentos, caixa, vírgula, barra e UF separada por espaço; nomes iguais em UFs diferentes continuam separados.
- O filtro resolve grupos dos valores efetivamente armazenados e compara cidade normalizada exata + UF. Usa `currentServiceCity/currentServiceState`, com fallback `city/state`, assim como a localização exibida no resultado.
- Sem correspondência, aplica explicitamente `id in []`, evitando que um OR vazio dentro de AND seja descartado pelo Prisma e devolva perfis de outras cidades.
- Não há exceção ou cidade adicionada manualmente para Vitória. As alterações anteriores presentes na área de trabalho foram preservadas.

## Validação

Executar com servidor local conectado ao banco auditado:

```text
npx playwright test --config tests/location-search.config.ts
npx tsc --noEmit
```

A suíte verifica catálogo nacional, homônimos, prioridade, todas as grafias solicitadas, UF incorreta, cidade inexistente e fallback sem API. Os dois testes de navegador usam APIs e perfil reais, sem mock de sugestões ou resultados: digitar → selecionar Vitória, ES → buscar → conferir nome e link do perfil no resultado. A suíte depende de pelo menos um perfil público de Vitória/ES no banco conectado; não cria cadastros de teste nem altera o registro auditado.

Resultado: 5 testes aprovados em 27,8 segundos. TypeScript e ESLint dos arquivos envolvidos também aprovados.

Escopo da entrega: código e validação no servidor local; não foi realizado deploy em produção.

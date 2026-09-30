# Catálogo nacional de cidades

Fonte: https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome

Obtido em 29/09/2026: 5.571 registros, 27 UFs. O arquivo JSON preserva os códigos, nomes e UFs do IBGE. Atualizar com `node scripts/update-city-catalog.mjs`.

O catálogo acompanha o aplicativo para oferecer autocomplete imediato mesmo sem Google Places, conexão com o IBGE ou acesso ao banco. A API `/api/locations/cities` acrescenta as localidades dos perfis ativos e prioriza as que têm perfis disponíveis. Nenhuma cidade recebe tratamento individual.

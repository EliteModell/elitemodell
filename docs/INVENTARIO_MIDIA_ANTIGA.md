# Inventario de midia antiga

Gerado em: 2026-06-09T21:21:44.699Z

Modo: **somente leitura**. Nenhum arquivo, URL, cache ou registro foi alterado.

## Resumo

- Referencias legadas no banco: **2**
- Referencias em bucket publico: **2**
- Referencias sem aprovacao individual comprovada: **2**
- Referencias de conta/perfil restrito ou expirado: **0**
- Objetos candidatos a orfao no Storage: **30**
- Erro de leitura do Storage: **nenhum**

O manifesto detalhado, incluindo caminhos sensiveis, foi salvo localmente em `.diagnostics/legacy-media-inventory.json` e nao deve ser commitado nem enviado a terceiros sem base legal e controle de acesso.

## Buckets

- `profiles`: PUBLICO
- `properties`: PUBLICO
- `documentos`: PRIVADO
- `stories`: PUBLICO

## Contagens por tipo

- profile-image: 1
- gallery: 1

## Contagens por acao proposta

- QUARANTINE_AND_REVIEW: 2

## Referencias

| Caminho | Tipo | Visibilidade | Conta/perfil | Aprovacao | Declaracao | Ultimo uso | Acao proposta |
|---|---|---|---|---|---|---|---|
| profiles/profiles/main/cmpndp3ia0000funzecxm76kx/1780499564245-d82bca4c-596e-438a-b17a-d2809a3adc6c.png | profile-image | PUBLIC | PENDING_REVIEW | LEGACY_UNREVIEWED | nao | 2026-06-05T00:36:45.702Z | QUARANTINE_AND_REVIEW |
| profiles/profiles/gallery/cmpndp3ia0000funzecxm76kx/1780499572687-35c852ab-616c-4ef6-8af0-8dacf9d2589b.jpg | gallery | PUBLIC | PENDING_REVIEW | LEGACY_UNREVIEWED | nao | 2026-06-05T00:36:45.702Z | QUARANTINE_AND_REVIEW |



## Plano seguro de migracao

1. Importar cada objeto para `upload-quarantine` privado, preservando hash e referencia de origem.
2. Remover a referencia publica da interface enquanto o item estiver pendente.
3. Executar antimalware e moderacao; documentos permanecem privados e exigem controle KYC.
4. Promover aprovados para `approved-media` privado e substituir a URL por `/api/media/{assetId}`.
5. Manter manifesto de rollback por campo e registro.
6. Invalidar cache somente depois da troca da referencia.
7. Excluir o objeto antigo apenas depois de hash, copia privada, atualizacao e verificacao.
8. Objetos orfaos exigem segunda varredura e aprovacao administrativa antes de exclusao.

## Estado de execucao

A migracao **nao foi executada**, pois depende de aprovacao tecnica do inventario, migrations novas aplicadas e janela de homologacao. Isso evita exclusao ou indisponibilidade em massa sem rollback.

O plano foi validado em modo somente leitura com o hash:

`46cae59131a4e5a21ff8e8a04a905d21962f48e2e7aed71d2eb47c33add28b56`

O job implementado em `scripts/migrate-legacy-media.mjs` separa:

- `--stage`: copia e verifica hash em quarentena privada antes de restringir a origem;
- `--finalize`: restaura a referencia apenas para ativo aprovado e URL controlada;
- `--rollback`: recompõe o objeto e a referencia originais usando o manifesto.

Todas as fases mutáveis exigem hash de aprovação, administrador e justificativa. Nenhuma fase mutável foi executada.

## Addendum tecnico - 11/06/2026

Foi implementada mitigacao local para impedir nova publicacao de URL legada publica:

- `src/lib/approved-media.ts` rejeita referencias a `/storage/v1/object/public/` e exige rota controlada `/api/media/{assetId}`;
- APIs publicas autenticadas removem URLs legadas de perfis, fotos, stories e imoveis quando ainda existirem em registros antigos;
- `src/proxy.ts` e rotas sensiveis exigem sessao com verificacao de maioridade antes de expor dados ou midia.

Isto nao substitui a migracao. Os 2 itens listados neste inventario continuam pendentes de `--stage`, revisao humana, `--finalize` ou `--rollback` em ambiente homologado. Nenhum objeto foi movido, excluido ou alterado neste addendum.

# Verificação somente leitura do Supabase Storage — Elite Modell

Objetivo: confirmar o estado de buckets e políticas sem alterar, excluir,
baixar ou publicar mídia. Não executar o arquivo legado `storage-setup.sql`.

## Preparação

- [ ] Abrir o projeto Supabase correto pelo painel oficial.
- [ ] Confirmar visualmente organização, projeto e ambiente.
- [ ] Não usar `service_role` no navegador nem copiar chaves para o relatório.
- [ ] Executar as consultas no SQL Editor dentro da transação read-only abaixo.

```sql
begin;
set transaction read only;

select id, name, public, file_size_limit, allowed_mime_types,
       created_at, updated_at
from storage.buckets
where id in (
  'profiles', 'properties', 'stories', 'documentos',
  'Histórias', 'historias', 'Perfis', 'perfis',
  'upload-quarantine', 'approved-media'
)
order by id;

select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

select bucket_id,
       count(*) as object_count,
       coalesce(sum((metadata ->> 'size')::bigint), 0) as total_bytes
from storage.objects
where bucket_id in (
  'profiles', 'properties', 'stories', 'documentos',
  'Histórias', 'historias', 'Perfis', 'perfis',
  'upload-quarantine', 'approved-media'
)
group by bucket_id
order by bucket_id;

rollback;
```

## Critérios

- `upload-quarantine` e `approved-media` devem existir e ter `public = false`.
- Nenhuma policy de `anon` ou `authenticated` deve permitir INSERT/UPDATE/DELETE
  direto nesses dois buckets.
- Buckets legados públicos devem ser apenas registrados; não alterar antes de
  mapear todas as referências e preparar rollback.
- Não consultar ou exportar nomes/caminhos de objetos no relatório geral, pois
  podem conter identificadores pessoais.

## Próxima mudança, somente após autorização

1. Exportar inventário privado com hash e referência de banco.
2. Confirmar quais objetos ainda são usados.
3. Copiar para armazenamento privado sem sobrescrever.
4. Validar URLs controladas `/api/media/{assetId}`.
5. Tornar o bucket legado privado somente após canário e backup.
6. Nunca tocar nos 47 itens históricos em quarentena sem escopo específico.

## Rollback planejado

- Preservar bucket e objetos originais durante toda a migração.
- Manter mapa origem/destino e contagens antes/depois.
- Em falha, restaurar referências de banco por transação e manter objetos novos
  privados; não reabrir bucket público automaticamente.

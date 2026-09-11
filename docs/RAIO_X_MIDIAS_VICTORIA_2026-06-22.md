# Raio-X das mídias públicas — Victoria

Data da auditoria: 22/06/2026. Ambiente analisado: banco e Storage configurados no workspace. Nenhum deploy foi realizado.

## Perfil

- ID: `cmqjpx9kz00041142ynet4prw`
- User ID: `cmqjpx7ir000111422tdl1k5k`
- Slug real: `victoria` (não `victtoria`)
- Status: `ACTIVE`
- Verificado: `true`
- `Professional.image`: `null`
- `Professional.galleryUrls`: `[]`
- Avatar legado: imagem externa da conta Google
- Fonte canônica atual: relação `ProfessionalPhoto`

## Fotos vinculadas

1. Capa (`cover: true`, ordem 0)
   - Asset: `a4a10cf2-5aba-42c3-8edc-1cfebbf0a4eb`
   - URL gravada: `https://www.elitemodell.com.br/api/media/a4a10cf2-5aba-42c3-8edc-1cfebbf0a4eb`
   - Bucket: `approved-media`
   - Path: `profiles/main/cmqjpx7ir000111422tdl1k5k/a4a10cf2-5aba-42c3-8edc-1cfebbf0a4eb.jpg`
   - Arquivo: JPEG, 391.821 bytes

2. Galeria (`cover: false`, ordem 1)
   - Asset: `ba5bf558-7821-4629-87be-b10d0bfe056f`
   - URL gravada: `https://www.elitemodell.com.br/api/media/ba5bf558-7821-4629-87be-b10d0bfe056f`
   - Bucket: `approved-media`
   - Path: `profiles/gallery/cmqjpx7ir000111422tdl1k5k/ba5bf558-7821-4629-87be-b10d0bfe056f.jpg`
   - Arquivo: JPEG, 918.178 bytes

Os dois objetos existem no Storage e responderam `200` quando baixados com o cliente de serviço.

## Status dos assets

Os quatro uploads encontrados para a conta possuem `UploadAsset.status = APPROVED`, `approvedBucket` e `approvedPath`. Nos dois assets usados pelo perfil, `malwareStatus` e `moderationStatus` ainda constam como `PENDING`, porque a configuração atual promove arquivos quando os provedores retornam pendência operacional. A exposição pública é governada pelo status global `APPROVED`, pelo path promovido e pela referência em perfil público ativo.

## Causa comprovada

A rota `/api/media/[id]` procurava no banco somente a referência relativa `/api/media/{id}`. O upload devolvia e o cadastro gravava a referência absoluta `https://www.elitemodell.com.br/api/media/{id}`. A comparação exata falhava e a rota devolvia `404`, embora o arquivo existisse no bucket.

Antes da correção local:

- API do perfil: `200`
- Capa em `/api/media/a4a...`: `404`
- Foto da galeria em `/api/media/ba5...`: `404`

Havia um segundo efeito: o `next/image` interpretava a URL absoluta do próprio site como imagem remota. A configuração de imagens permite Supabase e provedores de avatar, mas não precisava nem deveria tratar a própria rota controlada como host remoto.

## Correção local validada

- URLs controladas absolutas e relativas agora são reconhecidas pelo mesmo asset ID.
- Toda resposta pública normaliza a mídia para `/api/media/{id}`.
- Novos uploads devolvem o path relativo estável.
- A API pública só expõe `ProfessionalPhoto` cujo asset pertence à conta, tem status global `APPROVED`, path promovido e pasta `profiles`.
- Capa e avatar profissional usam a foto de capa aprovada; o avatar externo fica apenas como fallback.
- Erros de carregamento removem a imagem do DOM e atualizam a contagem da galeria.
- Ausência ou erro de mídia mostra gradiente na capa e iniciais no avatar.
- A aprovação administrativa é recusada se uma foto referenciada estiver pendente, privada, rejeitada ou indisponível.

Prova com os dados reais no servidor local:

- API retornou capa e avatar como `/api/media/a4a...`.
- Capa: `200 image/jpeg`, 391.821 bytes.
- Galeria: `200 image/jpeg`, 918.178 bytes.
- Otimizador do Next para a capa: `200 image/jpeg`, 64.441 bytes.

## Infraestrutura

- Bucket `approved-media`: privado, conforme o desenho de segurança.
- A leitura pública ocorre somente pelo backend `/api/media/[id]`, usando credencial de serviço e autorização por referência pública.
- Não é necessário tornar o bucket público.
- Não foi encontrada falha de RLS/Policy nem necessidade de alterar policies.
- Não é necessária migration de banco.
- As URLs absolutas antigas não precisam de atualização manual: a camada de compatibilidade as normaliza durante a leitura. Novas gravações usarão path relativo.

## Verificações executadas

- ESLint dos arquivos alterados: aprovado.
- TypeScript `tsc --noEmit`: aprovado.
- Build de produção Next.js 16.2.8: aprovado.
- Projeto Playwright `public-professional-profile`: 12 testes aprovados.
- Teste de integração local com os objetos reais do Storage: aprovado.

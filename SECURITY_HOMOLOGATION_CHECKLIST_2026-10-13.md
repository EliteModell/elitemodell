# Checklist final de homologação — Elite Modell

## Estado local preparado

- Branch: `codex/security-audit-20261013`.
- Script legado de storage aborta antes de qualquer alteração.
- Upload atual exige buckets privados, quarentena, antivírus CLEAN, moderação e
  demais gates antes de publicação.
- `next-auth` está fixado em 4.24.15. Bearer malformado agora falha fechado no
  proxy, inclusive enquanto o ambiente instalado ainda usa 4.24.14.
- Não há Email Provider nem múltiplos OAuth/OIDC providers do Auth.js; os três
  providers configurados são Credentials e não oferecem account linking.
- Documento jurídico público degrada para “indisponível/ratificação pendente”
  sem liberar aceite quando o banco está indisponível.

## Validações executadas

- TypeScript aprovado.
- ESLint: zero erros e oito warnings preexistentes.
- Suítes previamente aprovadas: 112 testes de autenticação, providers, KYC,
  webhooks, upload/quarentena, worker ClamAV e gates de publicação.
- Playwright/Chromium instalado e os 14 testes antes bloqueados executados:
  14 aprovados, sendo a barreira etária aprovada no retry por cold compilation.
- Regressão adicional: Bearer malformado retorna negação, não erro interno.
- Nenhum dado real, migração ou serviço de produção foi usado.

## Dependências pendentes

- `npm audit --omit=dev`: 17 alertas (2 críticos, 9 altos, 4 moderados, 2 baixos).
- Os avisos Auth.js residuais são puxados pelo peer opcional `@auth/core@0.34.3`;
  ele não é importado pela aplicação. Não aplicar o downgrade sugerido para
  `next-auth@4.24.7` nem migrar para beta sem plano próprio.
- Firebase/Firestore e demais transitivas precisam de atualização separada com
  regressão de autenticação e webhooks.

## Ações manuais antes de produção

1. Executar o runbook Supabase somente leitura e confirmar buckets privados e
   policies sem alterar objetos.
2. Publicar este branch em Preview e repetir smoke sintético de cadastro, KYC,
   upload, quarentena, moderação, webhooks e painel administrativo.
3. Confirmar no Preview o teste etário sem retry e latência aceitável.
4. Promover somente o mesmo commit/artefato homologado.

## Rollback

- Registrar deployment e commit anteriores.
- Em regressão, reatribuir o domínio ao deployment anterior e executar `git
  revert` do commit local; não restaurar script legado de storage nem tornar
  buckets públicos.
- Não reverter migrações automaticamente; nenhuma foi criada nesta etapa.

## Classificação

**PRONTO PARA HOMOLOGAÇÃO.** Não está pronto para produção antes da inspeção
Supabase somente leitura e do Preview com dados sintéticos.

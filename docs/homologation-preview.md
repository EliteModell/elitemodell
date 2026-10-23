# Homologacao isolada do PR #1

## Decisao

Use uma Supabase Preview Branch vinculada a `EliteModell/elitemodell#1` quando o recurso estiver disponivel no plano atual. Ela fornece Database, Auth e Storage separados e acompanha o ciclo do PR. Se Branching exigir contratacao, reutilize somente um projeto de homologacao ja existente cuja referencia seja diferente da producao e que nao contenha dados reais.

Um schema separado dentro do banco de producao nao e isolamento suficiente: Auth, Storage, credenciais e limites continuam compartilhados.

## Acao manual nos paineis

1. No Supabase, habilitar Branching e vincular o repositorio/PR, sem importar dados ou objetos de Storage de producao.
2. Na branch Supabase, aplicar as migrations Prisma existentes a um banco vazio, incluindo `20261023110000_add_professional_price15min`. O endurecimento RLS foi adiado para uma release de seguranca separada e esta preservado em `docs/security/deferred/20261023120000_harden_post_rls_tables.sql`; ele nao faz parte desta publicacao funcional.
3. Configurar Auth com `site_url` e redirects apontando apenas para o alias estavel da Preview e localhost. Nao habilitar OAuth social nesta fase.
4. Criar como privados os buckets `upload-quarantine`, `approved-media`, `documentos` e `moderation-evidence`. Nenhum bucket de homologacao deve ser publico.
5. Aplicar as protecoes ja existentes nas migrations publicadas e as politicas de Storage de `supabase/homologation-storage.sql`. O novo pacote de endurecimento RLS permanece fora desta etapa.
6. Na Vercel, criar overrides Preview limitados a `fix/onboarding-didit-pending-identity`, usando as credenciais emitidas pela branch Supabase.
7. Preencher as variaveis publicas de `config/homologation-preview.variables.example`; manter todos os servicos secundarios desabilitados.
8. Executar `npm run homolog:check-isolation` no ambiente da Preview. Escritas so podem comecar depois de resultado APROVADO.
9. Depois de `prisma migrate deploy` exclusivamente no banco isolado, executar `npm run homolog:check-schema` antes de qualquer teste funcional.

Nao use `scripts/configure-vercel-homolog-preview.mjs`: ele deriva configuracao do `.env` e nao garante separacao de Production.

## Primeira fase de testes

Com apenas Supabase isolado, podem ser validados cadastro sem entrega externa de e-mail, login com usuario de teste, perfil, cidades, precos, duracoes, ordenacao e agendamentos sem pagamento. Fotos podem validar upload, quarentena, privacidade e revisao manual; aprovacao automatica depende de antivirus/moderacao isolados.

Ordem: executar o validador; criar uma conta sintetica; concluir perfil; cadastrar precos de 15/30/60/120 minutos e modalidades; confirmar cards/perfil/ordenacao; criar e editar agendamento; enviar uma imagem sintetica; confirmar que ela permanece privada e inacessivel para outro usuario.

Confirmacao real de e-mail, Didit, pagamentos, antivirus remoto, moderacao automatica, Firebase e OAuth ficam fora desta fase ate receberem credenciais exclusivas de teste.

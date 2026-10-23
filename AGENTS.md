<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Publicações e produção

- A produção é publicada exclusivamente pela integração GitHub → Vercel, a partir da branch `main`.
- Nunca execute deploy Production pela Vercel CLI, por diretório local, worktree, branch experimental ou checkout com alterações não commitadas.
- Preview deployments não podem ser promovidos manualmente para Production.
- Cada correção publicada precisa manter uma cadeia verificável: commit identificado em `main`, deployment correspondente ao mesmo SHA e validação funcional no domínio público.
- Build aprovado e deployment com estado `READY` são pré-condições, não evidência de que a correção funciona em produção.
- Não declare uma correção concluída em produção antes de confirmar o SHA ativo e testar o comportamento afetado no domínio público.
- Não altere Production Branch, domínios, variáveis de produção, Deployment Checks, proteções/rulesets do GitHub ou permissões de deploy sem apresentar a mudança e obter aprovação explícita do usuário.
- Commit, push, merge, deploy, promoção e alterações de banco exigem autorização explícita do usuário.
- Antes de qualquer preparação de release, execute `npm run release:check-context`. Depois do deployment Git, execute `npm run release:verify-public -- --url <dominio> --sha <commit>` e complemente com testes funcionais da correção.

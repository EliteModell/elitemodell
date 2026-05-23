# Diagnostico do Painel Administrativo - Elite Model

## O que ja existia

- Rota `/admin` em `src/app/(dashboard)/admin/page.tsx`.
- Rotas administrativas basicas:
  - `/admin/profissionais`
  - `/admin/imoveis`
  - `/admin/usuarios`
  - `/admin/reservas`
  - `/admin/cupons`
- Protecao global no `proxy.ts` para `/admin/*` e `/api/admin/*`, exigindo `token.role === "ADMIN"`.
- Enum `UserRole` no Prisma com `ADMIN`.
- Modelos `Report` e `AuditLog` em `prisma/schema.prisma`.
- APIs administrativas:
  - `src/app/api/admin/kyc/route.ts`
  - `src/app/api/admin/documento/route.ts`
  - `src/app/api/admin/professionals/[id]/verify-docs/route.ts`
  - `src/app/api/admin/properties/[id]/status/route.ts`
  - `src/app/api/admin/users/[id]/block/route.ts`
- Helper de auditoria em `src/lib/audit.ts`.
- API de denuncias em `src/app/api/reports/route.ts`.

## O que estava incompleto

- Dashboard admin tinha poucos indicadores e apontava denuncias para rota errada.
- Sidebar admin nao tinha KYC, anfitrioes, denuncias, suporte, financeiro, funcionarios, auditoria e configuracoes.
- Nao existia `/admin/login`.
- Nao existiam telas dedicadas para:
  - `/admin/anfitrioes`
  - `/admin/clientes`
  - `/admin/kyc`
  - `/admin/denuncias`
  - `/admin/suporte`
  - `/admin/financeiro`
  - `/admin/funcionarios`
  - `/admin/auditoria`
  - `/admin/configuracoes`
- Sistema de cargos finos ainda nao existia em banco.
- Aprovacoes por Server Action nao registravam auditoria em todas as telas.
- KYC manual/Persona de profissionais nao tinha uma fila administrativa consolidada.

## O que foi melhorado/criado

- Criado `src/lib/admin-access.ts` com papeis operacionais:
  - `ADMIN_MASTER`
  - `ADMIN_GERAL`
  - `MODERADOR_CADASTROS`
  - `MODERADOR_CONTEUDO`
  - `SUPORTE`
  - `FINANCEIRO`
- `ADMIN_MASTER` e resolvido por `ADMIN_MASTER_EMAILS` nas variaveis de ambiente.
- Criados componentes visuais administrativos em `src/app/(dashboard)/admin/_components/AdminPrimitives.tsx`.
- Criadas/melhoradas as rotas:
  - `/admin/login`
  - `/admin/dashboard`
  - `/admin`
  - `/admin/profissionais`
  - `/admin/anfitrioes`
  - `/admin/imoveis`
  - `/admin/clientes`
  - `/admin/kyc`
  - `/admin/denuncias`
  - `/admin/suporte`
  - `/admin/financeiro`
  - `/admin/funcionarios`
  - `/admin/auditoria`
  - `/admin/configuracoes`
  - `/admin/acesso-negado`
- Acoes sensiveis novas registram `AuditLog`.

## Pontos que ainda podem evoluir com migracao de banco

- Criar modelo persistido `AdminStaff` com cargo, permissoes, status e ultimo acesso.
- Criar modelo `SupportTicket` para chamados formais, separado de mensagens/denuncias.
- Criar modelo `ApprovalRequest` para historico antes/depois de cada aprovacao.
- Adicionar campos especificos de revisao em `Professional`, `Property` e `HostProfile`:
  - `reviewedById`
  - `reviewedAt`
  - `rejectionReason`
  - `correctionRequestedAt`

## Observacao de seguranca

O acesso continua protegido no servidor e no `proxy.ts`. Clientes, acompanhantes e anfitrioes sem `role ADMIN` nao acessam `/admin/*`.

# CHECKLIST DE VALIDAÇÃO - ANTES DE RODAR

Quando você tiver um computador disponível para rodar, use este checklist:

---

## 1️⃣ PRÉ-EXECUÇÃO

### Variáveis de Ambiente
- [ ] `.env.local` tem `DATABASE_URL` apontando para Supabase **CLIENTE**?
- [ ] `.env.local` tem `SUPABASE_URL` da conta **CLIENTE**?
- [ ] `.env.local` tem `FIREBASE_ADMIN_PROJECT_ID` do projeto **CLIENTE**?
- [ ] `.env.local` tem `NEXTAUTH_SECRET` preenchido (pode gerar: `openssl rand -base64 32`)?
- [ ] Nenhuma credencial pessoal está em `.env.local`?

### Git & Repositório
- [ ] `git remote -v` retorna `github.com/EliteModell/elitemodell`?
- [ ] `git status` mostra apenas `.env.local` em Untracked (não versionado)?
- [ ] `.gitignore` inclui `.env.local` e `.env*`?

### Banco de Dados
- [ ] Supabase cliente está criado e acessível?
- [ ] Você tem credenciais PostgreSQL válidas?
- [ ] `psql -U postgres -h db.[PROJECT].supabase.co` conecta?

---

## 2️⃣ INSTALAÇÃO & BUILD

### Instalar dependências
```bash
cd c:\projeto\elitemodell
npm install
```
**Esperado**: Sem erros, ~200-300 warnings OK

### Gerar Prisma Client
```bash
npx prisma generate
```
**Esperado**: `✓ Prisma schema loaded from prisma/schema.prisma`

### Rodar Migrations
```bash
npx prisma migrate deploy
```
**Cenários**:
- ✅ Success: "Database has been successfully migrated"
- ⚠️ Pending migrations: `npx prisma db push`
- ❌ Connection error: Verificar DATABASE_URL

### Build para Validação
```bash
npm run build
```
**Esperado**: 
- ✅ `> next build` com sucesso
- ✅ Sem erros TypeScript
- ✅ Arquivo `.next/` criado

---

## 3️⃣ TESTES FUNCIONAIS

### Teste 1: Age Gate
```bash
npm run dev
```
1. Abrir `http://localhost:3000`
2. Você deve ver modal "18+" antes de qualquer coisa
3. Tentar preencher data de nascimento inválida → deve mostrar erro
4. Preencher data válida (maior de 18) → deve permitir acesso
5. Preencher data de menor → deve redirecionar para Google
6. Abrir aba anônima/privada → age gate aparece novamente

**✅ Passou se**: Age gate aparece, valida, redireciona corretamente

### Teste 2: Termos e Privacidade
1. Acessar `http://localhost:3000/terms`
2. Deve mostrar 10 seções de termos em português
3. Botão PT/EN funciona e muda idioma
4. Acessar `http://localhost:3000/privacy`
5. Deve mostrar 10 seções de privacidade
6. Links de contato funcionam (mailto:)

**✅ Passou se**: Páginas carregam, idioma muda, layout responsivo

### Teste 3: Cadastro com Validação
1. Acessar `http://localhost:3000/cadastro`
2. Tentar enviar sem preencher → deve mostrar erros por campo
3. Preencher nome, email, senha fraca (123) → deve alertar senha fraca
4. Preencher data de nascimento como menor → deve validar no registro
5. Desmarcar checkbox LGPD → deve bloquear cadastro
6. Desmarcar checkbox Termos → deve bloquear cadastro
7. Preencher tudo correto → deve enviar

**✅ Passou se**: Validações funcionam, erros aparecem

### Teste 4: Middleware de Proteção
1. Deslogar ou abrir aba anônima
2. Tentar acessar `http://localhost:3000/admin` → redireciona para `/login`
3. Tentar acessar `http://localhost:3000/anfitriao` → redireciona para `/login`
4. Tentar acessar `http://localhost:3000/profissional` → redireciona para `/login`
5. Acessar `http://localhost:3000/termos` → funciona (página pública)
6. Acessar `http://localhost:3000/api/professionals` → funciona (API pública)

**✅ Passou se**: Rotas protegidas bloqueiam, públicas permitem

### Teste 5: Bloqueio de Usuário (Admin API)
```bash
# 1. Pegar ID de um usuário no banco:
npx prisma studio  # GUI do Prisma

# 2. Fazer request POST para bloquear:
curl -X POST http://localhost:3000/api/admin/users/[USER_ID]/block \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -d '{"reason": "Teste de bloqueio"}'

# 3. Esperado: Usuário fica com blocked=true, blockReason="Teste de bloqueio"

# 4. Tentar desbloquear:
curl -X DELETE http://localhost:3000/api/admin/users/[USER_ID]/block \
  -H "Authorization: Bearer [JWT_TOKEN]"

# 5. Esperado: blocked=false
```

**✅ Passou se**: Bloqueio/desbloqueio funciona, usuário bloqueado não consegue logar

### Teste 6: Denúncias
```bash
# 1. Criar denúncia:
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -d '{
    "targetType": "USER",
    "targetId": "[USER_ID]",
    "reason": "HARASSMENT",
    "description": "Este usuário está me assediando com mensagens"
  }'

# 2. Esperado: Report criado com status PENDING

# 3. Tentar denunciar novamente → deve bloquear (pendente)

# 4. Admin listar denúncias:
curl http://localhost:3000/api/reports?status=PENDING \
  -H "Authorization: Bearer [ADMIN_JWT]"

# 5. Esperado: Lista com paginação
```

**✅ Passou se**: Denúncias criam, duplicatas são bloqueadas, admin lista

---

## 4️⃣ TESTES DE SEGURANÇA

### Rate Limiting
```bash
# Enviar 6 denúncias rápido (limite é 5/hora):
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/reports \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer [JWT]" \
    -d '{"targetType":"USER","targetId":"[ID]","reason":"HARASSMENT","description":"Test"}'
  sleep 0.5
done

# 6ª deve retornar 429 (Too Many Requests)
```

**✅ Passou se**: 6ª denúncia retorna 429

### Age Gate não pode ser bypassed
1. Validar data de menor no DevTools → sessionStorage
2. Mudar manualmente sessionStorage → Reload
3. Age gate deve aparecer novamente (validação em sessão)

**✅ Passou se**: Age gate não pode ser removido via DevTools

### Usuário bloqueado não consegue logar
1. Bloquear usuário via API
2. Tentar logar com esse usuário
3. Deve receber erro silencioso de auth

**✅ Passou se**: Login falha silenciosamente para bloqueados

---

## 5️⃣ TESTES DE DATABASE

### Verificar Schema
```bash
npx prisma studio
```

Deve ter novos campos em User:
- `birthDate`
- `blocked`
- `blockReason`
- `blockedAt`
- `lgpdConsent`
- `termsConsent`
- `consentDate`

Deve ter novos Models:
- `Report` (com campos: id, authorId, targetType, reason, status, etc)
- `AuditLog` (com campos: id, adminId, action, targetType, etc)

**✅ Passou se**: Todos os campos existem

---

## 6️⃣ RELATÓRIO FINAL

Após completar todos os testes, preencha:

```markdown
## ✅ Testes Completados

- [ ] Age Gate valida corretamente
- [ ] Termos/Privacidade funcionam
- [ ] Cadastro valida maioridade + LGPD
- [ ] Middleware bloqueia rotas protegidas
- [ ] Bloqueio de usuário funciona
- [ ] Denúncias funcionam
- [ ] Rate limiting funciona
- [ ] Security validações passam
- [ ] Database schema correto
- [ ] Build sem erros

## 🚀 Status: PRONTO PARA ETAPA 2

Todos os testes passaram ✅
Próximo: Implementar Etapa 2 (Painel Admin, Busca, Email)
```

---

## 📞 TROUBLESHOOTING

### Erro: "DATABASE_URL não encontrado"
```bash
# Solução: Criar .env.local com todas as vars
cat > .env.local << EOF
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
... (copie de .env.example)
EOF
```

### Erro: "NEXTAUTH_SECRET não é seguro"
```bash
# Solução: Gerar um novo
openssl rand -base64 32
# Copiar resultado para .env.local como NEXTAUTH_SECRET
```

### Erro: "Prisma migration failed"
```bash
# Solução: Forçar push (cuidado - deleta BD)
npx prisma db push --force-reset
# Depois rodar seed se existir:
npx prisma db seed
```

### Build muito lento
```bash
# Solução: Usar SWC (mais rápido)
npm install --save-dev @swc/core
# Já está configurado no next.config.ts
```

### Age Gate não aparece
```bash
# Solução: Limpar storage
# F12 → Console → 
sessionStorage.clear()
localStorage.clear()
location.reload()
```

---

## 📧 PRÓXIMAS AÇÕES

Depois que validar Etapa 1:

1. **Commit as mudanças**:
```bash
git add .
git commit -m "ETAPA 1: Middleware, Age Gate, LGPD, APIs de moderação"
git push origin main
```

2. **Criar tag de versão**:
```bash
git tag -a v0.1.0-alpha -m "Etapa 1 - Segurança e conformidade LGPD"
git push origin v0.1.0-alpha
```

3. **Deploy no Vercel**:
```bash
# Se estiver ligado corretamente, faz deploy automaticamente
# Verificar em: https://vercel.com/EliteModell/elitemodell
```

4. **Avisar cliente**:
- Validação de idade implementada ✅
- Conformidade LGPD validada ✅
- Moderação e bloqueio ativados ✅
- Próximo: Painel administrativo funcional (Etapa 2)

---

**Última atualização**: 11 de maio de 2026

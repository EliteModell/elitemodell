# Setup Supabase Auth do cliente

Use este checklist no painel Supabase do cliente.

## 1. URLs de autenticacao

Painel Supabase:

`Authentication > URL Configuration`

Configurar:

- Site URL: dominio oficial de producao do cliente.
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`
  - URL de producao: `https://DOMINIO-DO-CLIENTE/auth/callback`
  - Vercel preview, se usar: `https://*-SLUG-DA-CONTA-VERCEL.vercel.app/**`
  - Callback Supabase do projeto atual: `https://jgvmpbrsxegwkrgjncsv.supabase.co/auth/v1/callback`

Em producao, prefira URL exata com `/auth/callback`.

## 2. Email/senha

Painel Supabase:

`Authentication > Providers > Email`

Ativar:

- Email provider: enabled.
- Allow new users to sign up: enabled.
- Confirm email: recomendado enabled em producao.

Observacao: se Confirm email estiver enabled, o usuario confirma o email e volta para `/auth/callback`.

## 3. Google OAuth

Painel Supabase:

`Authentication > Providers > Google`

Ativar:

- Google provider: enabled.
- Client ID: credencial OAuth do Google Cloud do cliente.
- Client Secret: credencial OAuth do Google Cloud do cliente.

No Google Cloud Console do cliente, adicionar Authorized redirect URI:

```txt
https://jgvmpbrsxegwkrgjncsv.supabase.co/auth/v1/callback
```

Tambem adicionar em Authorized JavaScript origins:

```txt
http://localhost:3000
https://DOMINIO-DO-CLIENTE
```

## 4. Telefone/SMS

Painel Supabase:

`Authentication > Providers > Phone`

Ativar apenas se o cliente tiver provedor SMS configurado.

Supabase Phone Auth usa provedores como Twilio, MessageBird ou Vonage. Sem isso, login/cadastro por SMS nao funcionara.

Para Twilio, pegar no painel Twilio:

- Account SID
- Auth Token
- Messaging Service SID ou numero remetente configurado

Depois preencher esses dados no Supabase em `Authentication > Providers > Phone`.

Observacao: o Supabase cria e valida o OTP, mas quem envia o SMS e o provedor configurado.

## 5. Variaveis do projeto

No `.env` local e na Vercel do cliente:

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
NEXTAUTH_URL=""
NEXTAUTH_SECRET=""
```

Na Vercel:

- `NEXTAUTH_URL` deve ser a URL final de producao.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` podem ser publicas.
- `SUPABASE_SERVICE_ROLE_KEY` e `NEXTAUTH_SECRET` sao segredos e nunca devem ir para o frontend.

## 6. Testes depois de configurar

- Cadastro com email/senha.
- Confirmacao de email voltando para `/auth/callback`.
- Login com email/senha.
- Login/cadastro com Google.
- Cadastro por SMS, somente se Phone Auth estiver configurado.
- Redirecionamento correto para:
  - Cliente: `/dashboard`
  - Profissional anunciante: `/profissional/novo`
  - Anfitriao de imovel: `/anfitriao`

# Identidade, ambientes e integrações

## Projeto

- `PROJECT`: elitemodell / Elite Modell.
- `ROOT_DIRECTORY`: `C:\projeto\elitemodell`.
- `BRANCH`: `main` (7 commits à frente de `origin/main` no início da auditoria).
- `REMOTE_ORIGIN`: `https://github.com/EliteModell/elitemodell.git`.
- `LAST_COMMIT`: `a369158 feat: aplica identidade roxa premium em toda plataforma`.
- `VERCEL_PROJECT`: `elitemodell`.
- `VERCEL_PROJECT_ID`: `prj_1fDIftp1ECitjUgZ4i8OBDHo0oV6`.
- `VERCEL_ORG`: `team_9zGr0r3P83YZSymFbOArk88A`.
- `PRODUCTION_DOMAIN`: `https://www.elitemodell.com.br`, conforme código, sitemap, robots, configuração Supabase e documentação. A CLI Vercel local respondeu “Not authorized”, então os aliases e envs remotos não foram revalidados pela conta Vercel nesta auditoria.
- Referências aos projetos externos citados na solicitação: nenhuma encontrada.
- Apps mobile/bundle IDs/App Store/Play Store: não aplicável no repositório; não há Android, iOS, Capacitor, Expo ou manifestos de lojas.
- CI/CD: não foi encontrada pasta `.github/workflows`; deploy é associado ao Vercel pelo arquivo `.vercel/project.json`.

## Configuração local, sem segredos

| Serviço | Código | Configuração local |
|---|---|---|
| PostgreSQL/Supabase | presente | `DATABASE_URL`, `DIRECT_URL`, URL, anon key e service role: PRESENT |
| Prisma | presente | schema válido; cliente gera corretamente |
| Asaas | presente | chave e token de webhook: MISSING localmente; produção UNKNOWN |
| Persona | presente | chave, template e webhook: PRESENT; ambiente local `sandbox` |
| Didit | presente | chave, workflow e webhook: PRESENT |
| Resend | presente | chave e remetente: MISSING localmente; produção UNKNOWN |
| Sentry | presente | DSN, token, org e projeto: MISSING localmente; produção UNKNOWN |
| Cloudflare | Turnstile opcional e leitura de `cf-connecting-ip` | chaves: MISSING; zona DNS/CDN UNKNOWN |
| NextAuth | presente | segredo: PRESENT |
| Firebase | auth/telefone presente | API e credenciais admin: PRESENT; project ID `elitemodell` |
| Storage | Supabase + buckets lógicos | vars de URL/chave PRESENT; nomes usam defaults `upload-quarantine`/`approved-media` |
| Twilio/WhatsApp Cloud/Zenvia | adaptadores presentes | credenciais principais: MISSING localmente; produção UNKNOWN |
| Google Maps | presente | chave server/browser: PRESENT |
| Upstash Redis | rate limit opcional | URL/token: MISSING localmente; fallback em memória |
| CAPTCHA | Turnstile/reCAPTCHA opcional | vars principais: MISSING localmente |

Nenhum segredo completo foi incluído. “MISSING” descreve os arquivos locais inspecionados, não prova ausência na Vercel.

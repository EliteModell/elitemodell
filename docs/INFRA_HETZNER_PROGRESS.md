# Infraestrutura Hetzner - Elite Modell

Codigo de retomada: `INFRA-HETZNER-ELITE-2026`

Use este arquivo como memoria oficial da migracao para infraestrutura propria na Hetzner. Se a conversa cair ou perder contexto, envie:

```text
Continuar infraestrutura Hetzner do projeto Elite Modell. Leia docs/INFRA_HETZNER_PROGRESS.md e retome a partir da etapa marcada como EM ANDAMENTO.
Codigo: INFRA-HETZNER-ELITE-2026
```

## Regra de trabalho

- Explicar cada etapa antes de executar.
- Nunca salvar senhas, tokens, chaves privadas ou variaveis reais neste arquivo.
- Atualizar este arquivo ao final de cada etapa concluida.
- Manter comandos executados e decisoes importantes registrados aqui.
- Separar ambiente de producao, staging e desenvolvimento.
- Priorizar seguranca, rollback e backups antes de expor producao.

## Estado atual

- Status geral: PLANEJAMENTO INICIAL
- Etapa atual: 0 - Memoria operacional e plano de execucao
- Ultima atualizacao: 2026-05-13
- Deploy atual conhecido: Vercel em producao
- Repositorio GitHub: `https://github.com/EliteModell/elitemodell.git`
- Stack: Next.js, Node.js, PostgreSQL, Prisma, Docker, Nginx

## Arquitetura alvo inicial

- Hetzner Cloud com Ubuntu LTS.
- Docker e Docker Compose como base de runtime.
- App Next.js em container separado.
- PostgreSQL em container com volume persistente no inicio.
- Nginx como reverse proxy.
- HTTPS com Certbot/Let's Encrypt.
- Deploy automatico via GitHub Actions usando SSH.
- Backups automaticos de PostgreSQL e arquivos persistentes.
- Firewall liberando apenas SSH, HTTP e HTTPS.
- Ambientes separados:
  - Local/dev no Windows.
  - Staging em subdominio.
  - Producao em dominio principal.

## Etapas

| Etapa | Status | Objetivo |
| --- | --- | --- |
| 0 | EM ANDAMENTO | Criar memoria operacional e plano de execucao |
| 1 | PENDENTE | Levantar dados necessarios: dominio, subdominios, servidor, usuario SSH |
| 2 | PENDENTE | Preparar servidor Ubuntu: usuario, SSH, updates, timezone, pacotes base |
| 3 | PENDENTE | Configurar firewall, fail2ban e seguranca inicial |
| 4 | PENDENTE | Instalar Docker e Docker Compose |
| 5 | PENDENTE | Criar estrutura `/opt/elitemodell` no servidor |
| 6 | PENDENTE | Criar Dockerfile profissional do Next.js |
| 7 | PENDENTE | Criar Docker Compose de producao |
| 8 | PENDENTE | Configurar PostgreSQL com volume, usuario e database |
| 9 | PENDENTE | Configurar variaveis de ambiente de producao |
| 10 | PENDENTE | Configurar Nginx reverse proxy |
| 11 | PENDENTE | Configurar SSL HTTPS com Let's Encrypt |
| 12 | PENDENTE | Configurar DNS: dominio e subdominios |
| 13 | PENDENTE | Configurar GitHub Actions para deploy automatico |
| 14 | PENDENTE | Configurar migrations Prisma em deploy |
| 15 | PENDENTE | Configurar backups automaticos e politica de retencao |
| 16 | PENDENTE | Configurar monitoramento basico e logs |
| 17 | PENDENTE | Criar ambiente staging |
| 18 | PENDENTE | Teste final de producao, rollback e checklist |

## Decisoes pendentes

- Dominio principal que vai apontar para a Hetzner.
- Subdominios desejados, por exemplo:
  - `www.dominio.com`
  - `app.dominio.com`
  - `staging.dominio.com`
  - `api.dominio.com`, se necessario no futuro
- Tamanho inicial do servidor Hetzner.
- Se PostgreSQL ficara no mesmo servidor inicialmente ou em servidor separado.
- Estrategia de storage para uploads/imagens privadas.

## Historico

- 2026-05-13: Criado arquivo de memoria operacional e codigo de retomada.

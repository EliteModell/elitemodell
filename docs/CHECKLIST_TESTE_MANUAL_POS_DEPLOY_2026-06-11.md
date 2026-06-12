# Checklist de teste manual pos-deploy

Data: 11 de junho de 2026
URL: `https://www.elitemodell.com.br`

## Publico

- [ ] Abrir a pagina inicial e confirmar carregamento sem erro.
- [ ] Abrir `/terms` e confirmar status operacional, versao e hash.
- [ ] Abrir `/privacy` e confirmar status operacional, versao e hash.
- [ ] Abrir `/documentos/cookies-policy`.
- [ ] Abrir `/documentos/adult-safety-policy`.
- [ ] Abrir `/documentos/roleta-promocional-policy`.
- [ ] Confirmar que nenhum documento declara `LEGAL_APPROVED` ou `PUBLISHED_FINAL`.
- [ ] Confirmar que documentos internos retornam 404 ou acesso negado.

## Cadastro e cookies

- [ ] Abrir `/cadastro` em janela anonima.
- [ ] Confirmar checkboxes de Termos, Privacidade e maioridade desmarcados.
- [ ] Confirmar link do Aviso Resumido de Cadastro.
- [ ] Tentar continuar sem aceite e confirmar bloqueio.
- [ ] Rejeitar cookies opcionais e confirmar navegacao normal.
- [ ] Abrir Configuracoes de cookies e testar preferencias, analytics e marketing separadamente.

## Cliente, profissional e anfitriao

- [ ] Confirmar documentos corretos na area do cliente.
- [ ] Confirmar KYC, biometria e avisos na area profissional.
- [ ] Tentar upload publico sem declaracao e confirmar bloqueio.
- [ ] Confirmar Termos do Anfitriao, taxa 10% e repasse 90%.
- [ ] Confirmar aviso, preco total e aceite no checkout.

## Seguranca

- [ ] Acessar perfil sensivel sem `adultVerified` e confirmar redirecionamento/bloqueio.
- [ ] Tentar acessar API de profissionais sem sessao e confirmar 401/403.
- [ ] Confirmar que URL direta de midia indevida nao fica publica.
- [ ] Conferir `/robots.txt` e `/sitemap.xml`.
- [ ] Criar denuncia de teste nao emergencial.
- [ ] Em ambiente controlado, validar denuncia emergencial e retirada cautelar.

## Admin juridico

- [ ] Confirmar listagem de 32 documentos.
- [ ] Conferir status, versao, hash, vigencia e responsavel operacional.
- [ ] Conferir historico e auditoria da publicacao.
- [ ] Confirmar campos de ratificacao/assinatura futura.
- [ ] Nao acionar revogacao fora de um teste controlado.

## Evidencias

- [ ] Registrar data, hora, usuario e navegador.
- [ ] Anexar capturas das paginas juridicas e dos checkboxes.
- [ ] Registrar protocolos de denuncia usados no teste.
- [ ] Registrar qualquer erro no relatorio de deploy.

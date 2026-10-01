# Recuperação e break-glass do MFA administrativo

O acesso administrativo normal exige sessão autenticada, papel administrativo ativo e MFA TOTP válido.

## Recuperação normal

Na primeira ativação do TOTP, a aplicação exibe uma única vez um código `EM-...`. Apenas o hash SHA-256 é persistido. O código deve ser guardado em um gerenciador de senhas corporativo e é invalidado após o primeiro uso.

## Break-glass operacional

O endpoint `POST /api/admin/mfa/break-glass` permanece desabilitado enquanto `ADMIN_MFA_BREAK_GLASS_TOKEN_HASH` estiver vazio. Para prepará-lo:

1. gere uma credencial aleatória fora do repositório;
2. armazene somente seu SHA-256 em `ADMIN_MFA_BREAK_GLASS_TOKEN_HASH`;
3. guarde o valor bruto em cofre externo com acesso dual-control;
4. use o endpoint apenas com uma sessão de identidade administrativa válida;
5. após qualquer uso, rotacione imediatamente a credencial e revise o `AuditLog`.

O valor bruto nunca deve ser colocado em Git, documentação, ticket, log ou histórico de terminal.

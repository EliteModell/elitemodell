# Relatório de publicação operacional dos documentos

Data: 11 de junho de 2026
Resultado: NÃO EXECUTADA — GATE DE SEGURANÇA

## Motivo

A publicação operacional depende das migrations, da persistência correta das versões e da implementação segura do novo status. A homologação foi bloqueada antes de qualquer escrita.

## Estado por área

| Área | Estado |
|---|---|
| Rodapé | Links preparados; textos continuam identificados como revisão |
| Cadastro/login | Checkboxes e integrações preparados; aceite não encontra versão operacional |
| Cliente | Parcial; documentos e fluxos não estão publicados no banco |
| Profissional | Parcial; KYC, biometria e documentos dependem de homologação |
| Anfitrião | Parcial; regras comerciais ainda são propostas |
| Checkout | Parcial; schema e versões publicáveis não estão homologados |
| Upload | Parcial; migration de quarentena não aplicada |
| Admin jurídico | Código preparado, mas consulta tabelas pendentes e não suporta o novo status |

## Aceites versionados

`UserAcceptance` registra usuário, versão, hash, IP, user agent, sessão, origem, rota, idioma e ação.

Lacunas:

- não há campo explícito para obrigatório/opcional;
- não há campo explícito de tipo de aceite além de `action` e `source`;
- o status operacional não é aceito pela consulta;
- cookies usam preferências e não tabela separada;
- biometria/KYC e marketing dependem de finalidade/source, sem contrato de dados consolidado para todos os campos pedidos.

## Segurança

A baseline anterior permanece em 238 testes aprovados, incluindo:

- barreira `adultVerified`;
- bloqueio de APIs sensíveis;
- proteção de mídia;
- robots e sitemap;
- checkboxes desmarcados;
- upload com declaração;
- checkout com aceite;
- páginas jurídicas identificadas como revisão.

Como não houve mudança funcional nem deploy nesta fase, a suíte completa não foi repetida.

## Resultado

- status operacional não aplicado;
- documentos não publicados;
- aceites não gravados;
- auditoria de publicação não criada;
- nenhum dado de usuário alterado.

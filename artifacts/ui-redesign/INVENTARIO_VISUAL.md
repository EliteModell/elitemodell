# Elite Modell — inventário visual da repaginação

Data da revisão: 11/09/2026

## Escopo encontrado

- 119 páginas/rotas de interface em `src/app`.
- 66 componentes compartilhados em `src/components`.
- 6 folhas de estilo existentes antes da nova camada global.
- Áreas principais: home pública, autenticação, cadastro de cliente, cadastro profissional, busca/listagem, perfil público, área do cliente, área profissional, administração, pagamentos, configurações, documentos públicos e modais compartilhados.

## Componentes estruturais reutilizados

- `Navbar` e `Footer` para navegação pública.
- `ClientAreaShell` e `DashSidebar` para a área do cliente.
- layout compartilhado de dashboard para áreas profissional e administrativa.
- `ProfessionalPremium` para cartões, seções, estados vazios e componentes do painel profissional.
- componentes compartilhados de pagamento, consentimento, denúncia, avaliação e autenticação contextual.

## Diagnóstico anterior à repaginação

- O tema predominante usava preto e cinzas muito escuros como estrutura principal.
- Roxo, vermelho e gradientes apareciam simultaneamente em várias superfícies.
- Havia excesso de ícones ornamentais, brilhos, ilustrações e cartões escuros com pouca hierarquia.
- Telas públicas, autenticação e dashboards não compartilhavam um sistema visual único.
- A home aprovada já indicava a direção correta: fundo branco, fotografia real, tipografia direta e roxo usado como ação.

## Direção aplicada

- Fundo de página `#f7f7fa`, superfícies `#ffffff`, texto principal `#17141d` e destaque roxo `#7c22ee`.
- Tipografia sem serifa baseada em Inter/Segoe UI.
- Bordas claras, sombras suaves, raios consistentes e foco visível.
- Gradientes limitados a ações ou destaques pontuais; nenhuma estrutura principal preta.
- Fundos escuros preservados somente quando semânticos: backdrop de modal, legibilidade sobre fotografia e visualizadores de foto/vídeo.
- Ícones mantidos quando ajudam navegação, estado, segurança ou ação; ornamentos sem função foram ocultados ou removidos.

## Restrições preservadas

- Nenhuma regra de autenticação, permissão, busca, pagamento, KYC, agendamento, moderação ou persistência foi alterada pela repaginação.
- Nenhum texto jurídico foi reescrito.
- Roleta e vouchers não foram reintroduzidos.
- A fotografia `MODELO ELITE.jpg` foi copiada sem transformação para `public/images/home/modelo-elite.jpg` e usada no hero.
- Nenhum commit, push ou deploy foi executado.

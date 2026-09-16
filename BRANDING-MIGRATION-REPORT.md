# Relatório de migração da identidade visual — Elite Modell

Data: 2026-09-16

## Resultado

- BRANDING_UPDATED = YES
- OLD_LOGO_REMOVED = YES
- MASCOT_UPDATED = YES
- HEADER_UPDATED = YES
- FOOTER_UPDATED = YES
- FAVICON_UPDATED = YES
- APPLE_TOUCH_ICON_UPDATED = YES
- PWA_ICONS_UPDATED = YES
- MANIFEST_UPDATED = YES
- METADATA_UPDATED = YES
- GOOGLE_METADATA_UPDATED = YES
- OPEN_GRAPH_UPDATED = YES
- SCHEMA_UPDATED = YES
- SITEMAP_CHECKED = YES
- ROBOTS_CHECKED = YES
- MOBILE_VALIDATED = YES
- DESKTOP_VALIDATED = YES
- BUILD = PASS

## Validação

- `npm run lint`: PASS, 0 erros e 20 avisos preexistentes.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- Playwright de branding/SEO/responsividade: 21/21 testes PASS.
- Viewports: 320, 360, 375, 390, 414, 430, 768, 1024 e 1440 px.
- Busca global: nenhuma referência a logo roxo, SVG antigo ou token roxo legado permanece em `src`, `public`, `scripts` e `tests`.

## Assets oficiais usados

- `public/brand/elite-modell-symbol.png` — mascote oficial transparente, fonte dos favicons e ícones.
- `public/brand/elite-modell-logo.png` — logo horizontal oficial transparente, usado na interface.
- `assets/brand/elite-modell-visual-reference.jpg` — referência visual aprovada.
- `public/brand/social/elite-modell-social.png` — imagem social 1200×630 gerada com a identidade oficial.
- `public/brand/favicon/` — cópias organizadas dos favicons PNG.

## Cores e logos antigos remanescentes

- Cores roxas antigas: nenhuma no código ou nos assets de marca ativos.
- Logos antigos: nenhum.
- `EliteModell` permanece apenas como fallback técnico do sender ID da Zenvia em `src/lib/otp-delivery.ts`; espaços podem ser inválidos para esse identificador e ele não é exibido como marca visual ou metadata.
- `public/brand/client-area-bg.jpg`, `public/brand/elite modell explorar.png` e `public/brand/elite-modell gps.png` foram mantidos: são fotografias de ambientação preto/dourado, sem logo roxo e sem função de marca principal.
- Tons rosa/magenta da fotografia da modelo foram mantidos como conteúdo fotográfico, não como tokens da identidade roxa antiga.

## Arquivos criados

- `BRANDING-MIGRATION-REPORT.md`
- `assets/brand/elite-modell-visual-reference.jpg`
- `public/android-chrome-maskable-512x512.png`
- `public/brand/elite-modell-symbol.png`
- `public/brand/favicon/favicon-16x16.png`
- `public/brand/favicon/favicon-32x32.png`
- `public/brand/favicon/favicon-48x48.png`
- `public/brand/social/elite-modell-social.png`
- `artifacts/visual-review/home-mobile-320.png`
- `artifacts/visual-review/home-mobile-360.png`
- `artifacts/visual-review/home-mobile-375.png`
- `artifacts/visual-review/home-mobile-390.png`
- `artifacts/visual-review/home-mobile-414.png`
- `artifacts/visual-review/home-mobile-430.png`
- `artifacts/visual-review/home-mobile-768.png`
- `artifacts/visual-review/home-mobile-1024.png`
- `artifacts/visual-review/home-mobile-1440.png`

## Arquivos alterados

- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/apple-touch-icon.png`
- `public/brand/elite-modell-apple-touch-icon.png`
- `public/brand/elite-modell-icon-192.png`
- `public/brand/elite-modell-icon-512.png`
- `public/brand/elite-modell-logo.png`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/favicon.ico`
- `public/og-image.png`
- `scripts/generate-brand-assets.mjs`
- `src/app/(auth)/admin/login/page.tsx`
- `src/app/(auth)/cadastro/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(dashboard)/admin/_components/AdminPrimitives.tsx`
- `src/app/(dashboard)/admin/acesso-negado/page.tsx`
- `src/app/(dashboard)/admin/avaliacoes/page.tsx`
- `src/app/(dashboard)/admin/configuracoes/page.tsx`
- `src/app/(dashboard)/admin/funcionarios/page.tsx`
- `src/app/(dashboard)/admin/juridico/governanca/minutas/page.tsx`
- `src/app/(dashboard)/admin/juridico/governanca/page.tsx`
- `src/app/(dashboard)/admin/juridico/page.tsx`
- `src/app/(dashboard)/admin/kyc/page.tsx`
- `src/app/(dashboard)/admin/loading.tsx`
- `src/app/(dashboard)/admin/mfa/page.tsx`
- `src/app/(dashboard)/admin/moderacao/uploads/page.tsx`
- `src/app/(dashboard)/admin/profissionais/page.tsx`
- `src/app/(dashboard)/dashboard/acompanhantes/page.tsx`
- `src/app/(dashboard)/dashboard/atendimento/page.tsx`
- `src/app/(dashboard)/dashboard/avaliacoes/page.tsx`
- `src/app/(dashboard)/dashboard/carteira/page.tsx`
- `src/app/(dashboard)/dashboard/configuracoes/excluir-conta/page.tsx`
- `src/app/(dashboard)/dashboard/configuracoes/page.tsx`
- `src/app/(dashboard)/dashboard/favoritos/page.tsx`
- `src/app/(dashboard)/dashboard/informacoes/page.tsx`
- `src/app/(dashboard)/dashboard/mensagens/page.tsx`
- `src/app/(dashboard)/dashboard/planos/page.tsx`
- `src/app/(dashboard)/dashboard/privacidade/page.tsx`
- `src/app/(dashboard)/dashboard/reservas/page.tsx`
- `src/app/(dashboard)/dashboard/selecionar-cidade/page.tsx`
- `src/app/(dashboard)/dashboard/verificacao-idade/VerificacaoIdadeClient.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/profissional/agendamentos/page.tsx`
- `src/app/(dashboard)/profissional/analise/page.tsx`
- `src/app/(dashboard)/profissional/avaliacoes/page.tsx`
- `src/app/(dashboard)/profissional/configuracoes/page.tsx`
- `src/app/(dashboard)/profissional/estatisticas/page.tsx`
- `src/app/(dashboard)/profissional/loading.tsx`
- `src/app/(dashboard)/profissional/mensagens/page.tsx`
- `src/app/(dashboard)/profissional/notificacoes/page.tsx`
- `src/app/(dashboard)/profissional/novo/page.tsx`
- `src/app/(dashboard)/profissional/page.tsx`
- `src/app/(dashboard)/profissional/perfil/page.tsx`
- `src/app/(dashboard)/profissional/planos/page.tsx`
- `src/app/(dashboard)/verificacao/VerificacaoClient.tsx`
- `src/app/admin-setup/page.tsx`
- `src/app/apple-icon.png`
- `src/app/auth/callback/page.tsx`
- `src/app/buscar/page.tsx`
- `src/app/completar-cadastro/CompletarCadastroClient.tsx`
- `src/app/coral-design-system.css`
- `src/app/esqueci-senha/PasswordRecoveryClient.tsx`
- `src/app/favicon.ico`
- `src/app/globals.css`
- `src/app/home.module.css`
- `src/app/icon.png`
- `src/app/layout.tsx`
- `src/app/manifest.ts`
- `src/app/opengraph-image.png`
- `src/app/premium/vincular/PremiumClaimClient.tsx`
- `src/app/profissionais/[slug]/page.tsx`
- `src/app/profissionais/[slug]/profile.module.css`
- `src/app/profissionais/page.tsx`
- `src/app/redefinir-senha/ResetPasswordClient.tsx`
- `src/app/saida/page.tsx`
- `src/app/theme-v2.css`
- `src/app/twitter-image.png`
- `src/app/verificacao-idade/page.tsx`
- `src/components/AgeGate.tsx`
- `src/components/AppRouteLoading.tsx`
- `src/components/BottomNav.tsx`
- `src/components/BrandMark.tsx`
- `src/components/ChatBox.tsx`
- `src/components/DashSidebar.tsx`
- `src/components/EntryChoiceSheet.tsx`
- `src/components/FiltersModal.tsx`
- `src/components/Footer.module.css`
- `src/components/Footer.tsx`
- `src/components/Navbar.module.css`
- `src/components/Navbar.tsx`
- `src/components/NavbarSessionControls.tsx`
- `src/components/ReviewForm.tsx`
- `src/components/ReviewList.tsx`
- `src/components/Stories.tsx`
- `src/components/auth/ActionAuthModal.tsx`
- `src/components/auth/PhoneRegistrationClient.tsx`
- `src/components/auth/ProfessionalRegistrationFlow.module.css`
- `src/components/auth/ProfessionalRegistrationFlow.tsx`
- `src/components/client-area/AchievementsSection.tsx`
- `src/components/client-area/AgeVerificationCard.tsx`
- `src/components/client-area/CitySearchModal.tsx`
- `src/components/client-area/CitySelectorScreen.tsx`
- `src/components/client-area/ClientAreaShell.tsx`
- `src/components/client-area/ClientSensitiveGate.tsx`
- `src/components/client-area/HistorySection.tsx`
- `src/components/client-area/ListsSection.tsx`
- `src/components/client-area/NotificationsEmptyState.tsx`
- `src/components/client-area/UserWelcomeCard.tsx`
- `src/components/client-area/VerificationSection.tsx`
- `src/components/dashboard/PremiumDashboardHome.tsx`
- `src/components/home/HomeCitySearch.module.css`
- `src/components/home/HomeDiscoveryPreview.tsx`
- `src/components/legal/OperationalLegalDocumentPage.tsx`
- `src/components/moderation/PublicReportButton.tsx`
- `src/components/payments/CardPaymentForm.tsx`
- `src/components/payments/PixPaymentModal.tsx`
- `src/components/premium/PremiumUpsellModal.tsx`
- `src/components/privacy/CookiePreferences.tsx`
- `src/components/professional-dashboard/EmptyState.tsx`
- `src/components/professional-dashboard/PerformanceStats.tsx`
- `src/components/professional-dashboard/ProfessionalAlertCard.tsx`
- `src/components/professional-dashboard/ProfessionalDashboardCards.tsx`
- `src/components/professional-dashboard/ProfessionalListingClient.tsx`
- `src/components/professional-dashboard/ProfessionalPremium.tsx`
- `src/components/professional-dashboard/ProfessionalTopHeader.tsx`
- `src/components/professional-dashboard/StatusBadge.tsx`
- `src/components/professionals/ProfessionalContactAction.tsx`
- `src/lib/auth-email.ts`
- `tests/browser-icons.spec.ts`
- `tests/home-reference.spec.ts`
- `tests/logo-context.spec.ts`

## Arquivos removidos

- `public/brand/elite-modell-icon.svg`
- `public/brand/elite-modell-logo-transparent.svg`
- `public/brand/elite-modell-logo.svg`
- `public/brand/elite-modell-preview.png`
- `public/brand/elite-modell-preview.svg`
- `public/brand/elite-modell-purple.svg`
- `public/brand/elite-modell-source.png`

## Deploy

Nenhum deploy foi executado.

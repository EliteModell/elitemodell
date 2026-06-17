import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getPremiumUpsellPlan,
  premiumUpsellUntil,
  resolvePremiumUpsellPrice,
} from "../src/lib/client-plans";
import {
  canViewProfessionalContact,
  normalizeContactVisibility,
} from "../src/lib/professional-contact";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test.describe("upsell premium para clientes", () => {
  test("oferece 24 horas, 30 dias e mensal sem renovacao automatica implicita", () => {
    const day = getPremiumUpsellPlan("client-premium-24h");
    const month30 = getPremiumUpsellPlan("client-premium-30d");
    const monthly = getPremiumUpsellPlan("elite-premium-monthly");

    expect(resolvePremiumUpsellPrice(day, true)).toBe(4.99);
    expect(resolvePremiumUpsellPrice(month30, true)).toBe(10.99);
    expect(resolvePremiumUpsellPrice(month30, false)).toBe(39.9);
    expect(monthly.calendarMonths).toBe(1);
  });

  test("calcula duracoes a partir da confirmacao e limita fim de mes", () => {
    const day = getPremiumUpsellPlan("client-premium-24h");
    const monthly = getPremiumUpsellPlan("elite-premium-monthly");
    const paidAt = new Date("2026-01-31T12:00:00.000Z");

    expect(premiumUpsellUntil(day, paidAt).toISOString()).toBe("2026-02-01T12:00:00.000Z");
    expect(premiumUpsellUntil(monthly, paidAt).toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  test("aplica as tres politicas de visibilidade de contato", () => {
    expect(normalizeContactVisibility(undefined, false)).toBe("PUBLIC");
    expect(normalizeContactVisibility(undefined, true)).toBe("PREMIUM");
    expect(canViewProfessionalContact({
      visibility: "PUBLIC",
      authenticated: false,
      premium: false,
    })).toBe(true);
    expect(canViewProfessionalContact({
      visibility: "LOGGED_IN",
      authenticated: false,
      premium: false,
    })).toBe(false);
    expect(canViewProfessionalContact({
      visibility: "LOGGED_IN",
      authenticated: true,
      premium: false,
    })).toBe(true);
    expect(canViewProfessionalContact({
      visibility: "PREMIUM",
      authenticated: true,
      premium: false,
    })).toBe(false);
    expect(canViewProfessionalContact({
      visibility: "PREMIUM",
      authenticated: true,
      premium: true,
    })).toBe(true);
  });

  test("checkout registra tentativa, aceite, idempotencia e nao importa a roleta", () => {
    const checkout = source("src/app/api/premium/checkout/pix/route.ts");

    expect(checkout).toContain("acceptedTerms: z.literal(true)");
    expect(checkout).toContain("ageConfirmed: z.literal(true)");
    expect(checkout).toContain("TransactionIsolationLevel.Serializable");
    expect(checkout).toContain("PURCHASE_ATTEMPT_REGISTERED");
    expect(checkout).toContain("hashPurchaserDocument");
    expect(checkout).not.toMatch(/roulette|roleta|voucher-roulette/i);
  });

  test("pagamento anonimo aguarda conta antes de liberar o beneficio", () => {
    const effects = source("src/lib/payment-effects.ts");
    const claim = source("src/app/api/premium/claim/route.ts");

    expect(effects).toContain('benefitStatus: "AWAITING_CLAIM"');
    expect(effects).toContain('status: "PAID_AWAITING_ACCOUNT"');
    expect(claim).toContain("premiumClaimMatches");
    expect(claim).toContain("Entre com o mesmo e-mail informado no pagamento Pix.");
    expect(claim).toContain("applyPaidPaymentEffects");
  });

  test("payload publico nao entrega video premium nem mais de duas avaliacoes", () => {
    const publicProfile = source("src/app/api/professionals/[slug]/route.ts");

    expect(publicProfile).toContain("take: 2");
    expect(publicProfile).toContain("hasPremiumVideo");
    expect(publicProfile).toContain("hasMoreReviews");
    expect(publicProfile).toContain("presentationVideoUrl: canViewDraft");
    expect(publicProfile).toContain('contactVisibility === "PUBLIC"');
  });

  test("migration e aditiva e preserva pagamentos e aceites existentes", () => {
    const migration = source(
      "prisma/migrations/20260612190000_client_premium_upsell/migration.sql",
    );

    expect(migration).toContain('ADD COLUMN "contactVisibility"');
    expect(migration).toContain('CREATE TABLE "PremiumPurchaseIntent"');
    expect(migration).toContain('CREATE TABLE "PremiumPurchaseEvent"');
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  test("convites da area cliente abrem o modal tambem no mobile", () => {
    const modal = source("src/components/client-area/CitySearchModal.tsx");
    const selector = source("src/components/client-area/CitySelectorScreen.tsx");

    expect(modal).toContain("<PremiumUpsellModal");
    expect(selector).toContain("<PremiumUpsellModal");
    expect(modal).toContain('className="flex min-h-[54px] w-full');
    expect(selector).toContain('className="flex min-h-[54px] w-full');
  });
});

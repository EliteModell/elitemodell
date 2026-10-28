import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  canAppearOnHome,
  canAppearOnPublicSurfaces,
  normalizeProfessionalProfileVisibility,
} from "../src/lib/professional-profile-visibility";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

test.describe("visibilidade independente do perfil profissional", () => {
  test("normaliza somente os tres estados permitidos", () => {
    expect(normalizeProfessionalProfileVisibility("PUBLIC")).toBe("PUBLIC");
    expect(normalizeProfessionalProfileVisibility("SEARCH_ONLY")).toBe("SEARCH_ONLY");
    expect(normalizeProfessionalProfileVisibility("HIDDEN")).toBe("HIDDEN");
    expect(normalizeProfessionalProfileVisibility("ACTIVE")).toBe("PUBLIC");
  });

  test("sem destaque continua publico, mas fica fora da Home", () => {
    expect(canAppearOnPublicSurfaces("SEARCH_ONLY")).toBe(true);
    expect(canAppearOnHome("SEARCH_ONLY")).toBe(false);
    expect(canAppearOnHome("PUBLIC")).toBe(true);
  });

  test("oculto falha fechado em todas as superficies publicas", () => {
    expect(canAppearOnPublicSurfaces("HIDDEN")).toBe(false);
    const access = read("src/lib/public-professional-access.ts");
    const profile = read("src/app/api/professionals/[slug]/route.ts");
    const contact = read("src/app/api/professionals/[slug]/contact/route.ts");
    const premium = read("src/app/api/professionals/[slug]/premium-content/route.ts");
    const reviews = read("src/app/api/reviews/route.ts");
    expect(access).toContain('profileVisibility: { not: "HIDDEN" }');
    expect(profile).toContain('professional.profileVisibility === "HIDDEN"');
    expect(profile).toContain("&& !canViewDraft");
    expect(contact).toContain('professional.profileVisibility === "HIDDEN"');
    expect(premium).toContain('professional.profileVisibility === "HIDDEN"');
    expect(reviews).toContain("getPublicProfessionalWhere()");
  });

  test("Home pede apenas PUBLIC e nao conserva lista pessoal em cache", () => {
    const home = read("src/components/home/HomeDiscoveryPreview.tsx");
    const route = read("src/app/api/professionals/route.ts");
    expect(home).toContain('placement: "home"');
    expect(home).toContain('cache: "no-store"');
    expect(home).not.toContain("HOME_CACHE_STORAGE_KEY");
    expect(route).toContain('placement === "home"');
    expect(route).toContain("publicHomeProfessionalWhere()");
  });

  test("favoritos, recomendacoes e ranking nao expõem perfil oculto", () => {
    expect(read("src/app/api/favorites/professionals/route.ts")).toContain('profileVisibility: { not: "HIDDEN" }');
    expect(read("src/lib/dashboard-data.ts")).toContain('profileVisibility: { not: "HIDDEN" }');
    expect(read("src/app/(dashboard)/profissional/listagem/page.tsx")).toContain('profileVisibility: { not: "HIDDEN" }');
  });

  test("painel administrativo persiste somente visibilidade e registra auditoria", () => {
    const admin = read("src/app/(dashboard)/admin/profissionais/page.tsx");
    const card = read("src/app/(dashboard)/admin/profissionais/AdminProfessionalCard.tsx");
    expect(admin).toContain('action === "setVisibility"');
    expect(admin).toContain("data: { profileVisibility }");
    expect(admin).toContain('reason: "professional:profile-visibility"');
    expect(card).toContain("Público");
    expect(card).toContain("Sem destaque");
    expect(card).toContain("Oculto");
  });

  test("migracao e aditiva e preserva perfis existentes como PUBLIC", () => {
    const migration = read("prisma/migrations/20261028123000_professional_profile_visibility/migration.sql");
    expect(migration).toContain('ADD COLUMN "profileVisibility" TEXT NOT NULL DEFAULT \'PUBLIC\'');
    expect(migration).not.toMatch(/DROP|DELETE|TRUNCATE/i);
  });

  test("pausa da profissional continua independente da visibilidade administrativa", () => {
    const settings = read("src/app/api/professional/settings/route.ts");
    expect(settings).toContain('data.status = "PAUSED"');
    expect(settings).not.toContain("profileVisibility");
  });
});

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test.describe("galeria profissional de fotos e videos", () => {
  test("usa modelo aditivo sem remover compatibilidade legada", () => {
    const schema = read("prisma/schema.prisma");
    const migration = read("prisma/migrations/20261027223000_professional_media_gallery/migration.sql");
    expect(schema).toContain("model ProfessionalMedia");
    expect(schema).toMatch(/assetId\s+String\?\s+@unique/);
    expect(schema).toContain("presentationVideoUrl");
    expect(migration).toContain('CREATE TABLE "ProfessionalMedia"');
    expect(migration).not.toContain("DROP TABLE");
    expect(migration).not.toContain("DROP COLUMN");
  });

  test("API limita, autoriza por titularidade e remove logicamente", () => {
    const route = read("src/app/api/professional/media/route.ts");
    expect(route).toContain("const MAX_VIDEOS = 10");
    expect(route).toContain("userId: session.user.id");
    expect(route).toContain('kind: z.enum(["IMAGE", "VIDEO"])');
    expect(route).toContain('hiddenReason: "Removida pela titular."');
    expect(route).toContain("media_order_owner_mismatch");
  });

  test("interface aceita varios videos com estados e progresso individual", () => {
    const page = read("src/app/(dashboard)/profissional/fotos/page.tsx");
    expect(page).toContain('title="Vídeos da galeria"');
    expect(page).toContain("video/mp4,video/webm,video/quicktime");
    expect(page).toContain("multiple hidden onChange={handleVideoInput}");
    expect(page).toContain("videoProgress[item.preview]");
    for (const state of ["Publicado", "Requer revisão", "Rejeitado", "Processando", "Em análise"]) {
      expect(page).toContain(state);
    }
  });

  test("cadastro inicial reutiliza a galeria multipla e preserva o legado", () => {
    const onboarding = read("src/app/(dashboard)/profissional/novo/page.tsx");
    expect(onboarding).toContain("MAX_ONBOARDING_GALLERY_PHOTOS = 20");
    expect(onboarding).toContain("MAX_ONBOARDING_GALLERY_VIDEOS = 10");
    expect(onboarding).toContain('fetch("/api/professional/media"');
    expect(onboarding).toContain('kind: "VIDEO"');
    expect(onboarding).toContain("multiple hidden");
    expect(onboarding).toContain("progress: 80");
    expect(onboarding).toContain("presentationVideoUrl: uploaded.reference");
  });

  test("perfil publico libera somente ativos aprovados por todos os gates", () => {
    const profileApi = read("src/app/api/professionals/[slug]/route.ts");
    const delivery = read("src/app/api/media/[id]/route.ts");
    expect(profileApi).toContain("evaluateMediaPublicationGates({");
    expect(profileApi).toContain('asset.status !== "APPROVED"');
    expect(profileApi).toContain("media: galleryMedia");
    expect(delivery).toContain("media: { where: { hiddenAt: null, assetId: asset.id }");
  });
});

import { expect, test, type Page, type Route } from "@playwright/test";
import {
  calculateAge,
  canonicalProfessionalPhotos,
  isProfessionalOnline,
} from "../src/lib/public-professional-profile";
import {
  adminControlledMediaPreviewUrl,
  controlledMediaAssetId,
  controlledMediaVariantUrl,
  filterApprovedProfilePhotos,
  isPublishableStoryAsset,
  normalizeControlledMediaUrl,
  requiresDirectMediaDelivery,
  resolvePublicProfileMedia,
} from "../src/lib/public-professional-media";
import {
  canonicalizeBrazilianLocation,
  citySearchVariants,
  nearestSupportedLocation,
} from "../src/lib/brazilian-location";
import { installMockSessionCookie } from "./helpers/mock-auth";

const MOCK_SESSION = {
  user: {
    id: "public-media-viewer",
    name: "Visitante",
    email: "viewer@teste.elitemodell.local",
    role: "GUEST",
    accountType: "client",
    adultVerified: true,
    activeProfileType: "CLIENTE" as const,
    availableProfiles: ["CLIENTE"] as Array<"CLIENTE" | "PROFESSIONAL" | "HOST">,
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

function mockProfessional(photoUrls: string[], pendingMedia = 0) {
  return {
    id: "professional-victoria",
    slug: "victoria",
    displayName: "Victoria",
    bio: "Perfil profissional aprovado para teste das mídias públicas.",
    city: "Itaúna",
    state: "MG",
    image: photoUrls[0] ?? null,
    avatar: photoUrls[0] ?? null,
    galleryUrls: photoUrls.slice(1),
    verified: true,
    featured: false,
    price15min: 150,
    price30min: 200,
    pricePerHour: 300,
    price2h: null,
    priceOvernight: 1_000,
    priceWebcam: null,
    priceMin: 150,
    paymentMethods: ["Pix"],
    rating: 5,
    totalReviews: 0,
    profileViews: 0,
    specialties: [],
    services: [],
    photos: photoUrls.map((url, index) => ({ id: `photo-${index}`, url, cover: index === 0, order: index })),
    mediaPublication: { total: photoUrls.length + pendingMedia, published: photoUrls.length, pending: pendingMedia },
    reviews: [],
    stories: [],
    createdAt: "2026-06-18T12:00:00.000Z",
    user: { name: "Victoria", image: null, createdAt: "2026-06-18T12:00:00.000Z" },
  };
}

async function mockPublicProfilePage(page: Page, photoUrls: string[], brokenImages = false, pendingMedia = 0) {
  await installMockSessionCookie(page.context(), MOCK_SESSION.user);
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
  });
  await page.route("**/api/auth/session", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(MOCK_SESSION),
  }));
  await page.route("**/api/professionals/victoria", (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(mockProfessional(photoUrls, pendingMedia)),
  }));
  await page.route(/\/api\/professionals\?.*/, (route: Route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ professionals: [] }),
  }));
  await page.route("**/_next/image**", (route: Route) => brokenImages
    ? route.fulfill({ status: 404, contentType: "text/plain", body: "missing" })
    : route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
      }));
}

test.describe("contrato publico do perfil profissional", () => {
  const ownerId = "owner-victoria";
  const approvedAssets = ["cover-id", "gallery-id"].map((id) => ({
    id,
    userId: ownerId,
    folder: id === "cover-id" ? "profiles/main" : "profiles/gallery",
    category: "image",
    status: "APPROVED",
    visibility: "PUBLIC",
    uploadCompletedAt: new Date("2026-06-18T12:00:00.000Z"),
    malwareStatus: "CLEAN",
    moderationStatus: "APPROVED",
    ageIdentityStatus: "PASS",
    consentStatus: "PASS",
    adminReviewRequired: true,
    adminReviewStatus: "PASS",
    takedownStatus: "CLEAR",
    approvedBucket: "approved-media",
    approvedPath: `profiles/${id}.jpg`,
  }));

  test("usa ProfessionalPhoto como fonte canonica antes dos campos legados", () => {
    const photos = canonicalProfessionalPhotos({
      image: "/api/media/legacy-cover",
      galleryUrls: ["/api/media/legacy-gallery"],
      photos: [
        { id: "2", url: "/api/media/gallery", cover: false, order: 2 },
        { id: "1", url: "/api/media/cover", cover: true, order: 0 },
      ],
    });

    expect(photos.map((photo) => photo.url)).toEqual([
      "/api/media/cover",
      "/api/media/gallery",
    ]);
  });

  test("normaliza URL absoluta da capa para a rota controlada estavel", () => {
    const absolute = "https://www.elitemodell.com.br/api/media/cover-id";
    expect(controlledMediaAssetId(absolute)).toBe("cover-id");
    expect(normalizeControlledMediaUrl(absolute)).toBe("/api/media/cover-id");
  });

  test("gera variantes controladas sem expor o bucket privado", () => {
    expect(controlledMediaVariantUrl("/api/media/cover-id", "card"))
      .toBe("/api/media/cover-id?variant=card");
    expect(controlledMediaVariantUrl("https://cdn.example/photo.jpg", "card"))
      .toBe("https://cdn.example/photo.jpg");
  });

  test("entrega midia controlada direto ao navegador para preservar os cookies de acesso", () => {
    expect(requiresDirectMediaDelivery("/api/media/cover-id")).toBe(true);
    expect(requiresDirectMediaDelivery("https://www.elitemodell.com.br/api/media/cover-id")).toBe(true);
    expect(requiresDirectMediaDelivery("/brand/elite-modell-logo.png")).toBe(false);
  });

  test("gera preview administrativo somente para a rota controlada", () => {
    expect(adminControlledMediaPreviewUrl("/api/media/cover-id"))
      .toBe("/api/admin/uploads/cover-id/preview");
    expect(adminControlledMediaPreviewUrl("https://legacy.example/photo.jpg"))
      .toBe("https://legacy.example/photo.jpg");
  });

  test("perfil aprovado expoe capa, avatar e duas fotos aprovadas", () => {
    const photos = filterApprovedProfilePhotos([
      { id: "photo-cover", url: "https://www.elitemodell.com.br/api/media/cover-id", cover: true, order: 0 },
      { id: "photo-gallery", url: "/api/media/gallery-id", cover: false, order: 1 },
    ], approvedAssets, ownerId);
    const media = resolvePublicProfileMedia({ photos });

    expect(media.cover).toBe("/api/media/cover-id");
    expect(media.avatar).toBe("/api/media/cover-id");
    expect(media.gallery).toEqual(["/api/media/cover-id", "/api/media/gallery-id"]);
  });

  test("publica foto de perfil aprovada mesmo com flag privada legada, mas bloqueia pendentes e outra conta", () => {
    const photos = filterApprovedProfilePhotos([
      { url: "/api/media/pending-id", cover: true },
      { url: "/api/media/private-id" },
      { url: "/api/media/foreign-id" },
    ], [
      { ...approvedAssets[0], id: "pending-id", status: "PENDING_MODERATION" },
      { ...approvedAssets[0], id: "private-id", visibility: "PRIVATE" },
      { ...approvedAssets[0], id: "foreign-id", userId: "other-owner" },
    ], ownerId);

    expect(photos).toEqual([{ url: "/api/media/private-id" }]);
  });

  test("nao amplia midia exclusiva de assinantes", () => {
    const photos = filterApprovedProfilePhotos([
      { url: "/api/media/subscribers-id", cover: true },
    ], [
      { ...approvedAssets[0], id: "subscribers-id", visibility: "SUBSCRIBERS" },
    ], ownerId);

    expect(photos).toEqual([]);
  });

  test("documento privado nunca entra na galeria publica", () => {
    const photos = filterApprovedProfilePhotos([
      { url: "/api/media/document-id", cover: true },
    ], [
      { ...approvedAssets[0], id: "document-id", category: "document", folder: "documentos/identidade", visibility: "PRIVATE" },
    ], ownerId);

    expect(photos).toEqual([]);
  });

  test("perfil restrito mantem foto pendente ou reprovada fora da resposta publica", () => {
    const photos = filterApprovedProfilePhotos([
      { url: "/api/media/pending-id", cover: true },
      { url: "/api/media/rejected-id" },
    ], [
      { ...approvedAssets[0], id: "pending-id", status: "PENDING_MODERATION", moderationStatus: "PENDING", approvedBucket: null, approvedPath: null },
      { ...approvedAssets[0], id: "rejected-id", status: "REJECTED", moderationStatus: "REJECTED", approvedBucket: null, approvedPath: null },
    ], ownerId);

    expect(photos).toEqual([]);
  });

  test("story publico exige owner, pasta e todos os gates aprovados", () => {
    const story = { ...approvedAssets[0], id: "story-id", folder: "stories", category: "video" };
    expect(isPublishableStoryAsset(story, ownerId)).toBe(true);
    expect(isPublishableStoryAsset({ ...story, userId: "other-owner" }, ownerId)).toBe(false);
    expect(isPublishableStoryAsset({ ...story, status: "PENDING_MODERATION" }, ownerId)).toBe(false);
    expect(isPublishableStoryAsset({ ...story, malwareStatus: "INFECTED" }, ownerId)).toBe(false);
  });

  test("remove imagem quebrada da galeria e usa fallback quando nao sobra URL", () => {
    const media = resolvePublicProfileMedia({
      photos: [{ url: "/api/media/broken", cover: true }],
      failedUrls: ["/api/media/broken"],
    });
    expect(media).toEqual({ cover: null, avatar: null, gallery: [] });
  });

  test("sem URL nao produz src invalido e sinaliza fallback visual", () => {
    const media = resolvePublicProfileMedia({ photos: [], image: null, avatar: null });
    expect(media.cover).toBeNull();
    expect(media.avatar).toBeNull();
    expect(media.gallery).toHaveLength(0);
  });

  test("abre a tabela com apenas as duracoes configuradas e contraste legivel", async ({ page }) => {
    await mockPublicProfilePage(page, []);
    await page.goto("/profissionais/victoria");

    const pricing = page.getByRole("heading", { name: "Valores", exact: true }).locator("..").locator("..");
    const toggle = pricing.getByRole("button");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toContainText("A partir de R$ 150 · 15 min");
    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(pricing).toContainText("15 minutos");
    await expect(pricing).toContainText("30 minutos");
    await expect(pricing).toContainText("1 hora");
    await expect(pricing).toContainText("Pernoite");
    await expect(pricing).not.toContainText("2 horas");
    await expect(pricing).not.toContainText("Vídeo chamada");
    await expect(toggle).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(toggle).toHaveCSS("color", "rgb(20, 18, 18)");
  });

  test("cartao de valores no topo abre e leva diretamente para a tabela", async ({ page }) => {
    await mockPublicProfilePage(page, []);
    await page.goto("/profissionais/victoria");

    const pricing = page.getByRole("region", { name: "Valores" });
    const topCard = page.getByRole("button", { name: /Valores a partir de R\$ 150/i });
    await topCard.click();

    await expect(pricing.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    await expect.poll(async () => pricing.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThanOrEqual(110);
  });

  test("calcula presenca apenas dentro da janela e respeita privacidade", () => {
    const now = new Date("2026-06-12T12:00:00.000Z");
    expect(isProfessionalOnline("2026-06-12T11:50:00.000Z", true, now)).toBe(true);
    expect(isProfessionalOnline("2026-06-12T11:30:00.000Z", true, now)).toBe(false);
    expect(isProfessionalOnline("2026-06-12T11:59:00.000Z", false, now)).toBe(false);
  });

  test("expoe idade calculada sem exigir data de nascimento no cliente", () => {
    expect(calculateAge("2000-06-13", new Date("2026-06-12T12:00:00.000Z"))).toBe(25);
    expect(calculateAge("2000-06-12", new Date("2026-06-12T12:00:00.000Z"))).toBe(26);
  });

  test("normaliza variantes de Itauna para a cidade canonica", () => {
    expect(canonicalizeBrazilianLocation("Itauna", "MG")).toEqual({
      city: "Itaúna",
      state: "MG",
    });
    expect(canonicalizeBrazilianLocation("Itaúna, MG", null)).toEqual({
      city: "Itaúna",
      state: "MG",
    });
    expect(citySearchVariants("Itauna")).toContain("Itaúna");
  });

  test("usa a cidade suportada mais proxima como fallback controlado", () => {
    expect(nearestSupportedLocation(-20.0755, -44.5764)).toEqual({
      city: "Itaúna",
      state: "MG",
    });
    expect(nearestSupportedLocation(0, 0)).toBeNull();
  });

  test("UI renderiza capa, avatar e duas fotos aprovadas", async ({ page }) => {
    await mockPublicProfilePage(page, ["/mock-media/cover.jpg", "/mock-media/gallery.jpg"]);
    await page.goto("/profissionais/victoria", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("profile-cover")).toHaveAttribute("data-media-state", "image");
    await expect(page.getByTestId("profile-cover").locator("img")).toHaveCount(1);
    await expect(page.getByTestId("profile-avatar")).toHaveAttribute("data-media-state", "image");
    await expect(page.getByTestId("profile-avatar").locator("img")).toHaveCount(1);
    await expect(page.getByTestId("gallery-image")).toHaveCount(2);
  });

  test("reaproveita a foto real do card enquanto os dados completos carregam", async ({ page }) => {
    await installMockSessionCookie(page.context(), MOCK_SESSION.user);
    await page.addInitScript(() => {
      sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
      sessionStorage.setItem("elite_professional_navigation_preview:victoria", JSON.stringify({
        slug: "victoria",
        displayName: "Victoria",
        image: "/mock-media/cover.jpg",
        city: "Itaúna",
        state: "MG",
      }));
    });
    await page.route("**/api/auth/session", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    }));
    await page.route("**/mock-media/cover.jpg", (route) => route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
    }));
    let releaseProfile!: () => void;
    const profileDelay = new Promise<void>((resolve) => { releaseProfile = resolve; });
    await page.route("**/api/professionals/victoria", async (route) => {
      await profileDelay;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProfessional(["/mock-media/cover.jpg"])),
      });
    });
    await page.route(/\/api\/professionals\?.*/, (route) => route.fulfill({ json: { professionals: [] } }));

    await page.goto("/profissionais/victoria", { waitUntil: "domcontentloaded" });
    const preview = page.getByTestId("profile-navigation-preview");
    await expect(preview.getByRole("heading", { name: "Victoria" })).toBeVisible();
    await expect(preview.locator("img")).toBeVisible();

    releaseProfile();
    await expect(page.getByTestId("profile-cover")).toHaveAttribute("data-media-state", "image");
  });

  test("perfil aprovado permanece íntegro nos mobiles prioritários", async ({ page }) => {
    await mockPublicProfilePage(page, ["/mock-media/cover.jpg", "/mock-media/gallery.jpg"]);
    for (const width of [375, 390, 412, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/profissionais/victoria", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("profile-cover")).toHaveAttribute("data-media-state", "image");
      await expect(page.getByTestId("gallery-image")).toHaveCount(2);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth, `overflow em ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
  });

  test("UI remove tags de imagem quebradas e mostra fallback", async ({ page }) => {
    await mockPublicProfilePage(page, ["/mock-media/broken.jpg"], true);
    await page.goto("/profissionais/victoria", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("profile-cover")).toHaveAttribute("data-media-state", "fallback");
    await expect(page.getByTestId("profile-cover").locator("img")).toHaveCount(0);
    await expect(page.getByTestId("profile-avatar")).toHaveAttribute("data-media-state", "fallback");
    await expect(page.getByTestId("profile-avatar").locator("img")).toHaveCount(0);
    await expect(page.getByTestId("gallery-image")).toHaveCount(0);
  });

  test("UI explica quando as fotos existem mas continuam restritas pela moderacao", async ({ page }) => {
    await mockPublicProfilePage(page, [], false, 4);
    await page.goto("/profissionais/victoria", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("profile-cover")).toHaveAttribute("data-media-state", "fallback");
    await expect(page.getByTestId("gallery-image")).toHaveCount(0);
    await expect(page.getByTestId("gallery-restricted")).toContainText("aguardando liberação");
  });
});

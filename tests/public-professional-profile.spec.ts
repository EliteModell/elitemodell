import { expect, test, type Page, type Route } from "@playwright/test";
import {
  calculateAge,
  canonicalProfessionalPhotos,
  isProfessionalOnline,
} from "../src/lib/public-professional-profile";
import {
  controlledMediaAssetId,
  filterApprovedProfilePhotos,
  normalizeControlledMediaUrl,
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

function mockProfessional(photoUrls: string[]) {
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
    rating: 5,
    totalReviews: 0,
    profileViews: 0,
    specialties: [],
    services: [],
    photos: photoUrls.map((url, index) => ({ id: `photo-${index}`, url, cover: index === 0, order: index })),
    reviews: [],
    stories: [],
    createdAt: "2026-06-18T12:00:00.000Z",
    user: { name: "Victoria", image: null, createdAt: "2026-06-18T12:00:00.000Z" },
  };
}

async function mockPublicProfilePage(page: Page, photoUrls: string[], brokenImages = false) {
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
    body: JSON.stringify(mockProfessional(photoUrls)),
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
    moderationStatus: "APPROVED",
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

  test("nao publica fotos pendentes, rejeitadas, privadas ou de outra conta", () => {
    const photos = filterApprovedProfilePhotos([
      { url: "/api/media/pending-id", cover: true },
      { url: "/api/media/private-id" },
      { url: "/api/media/foreign-id" },
    ], [
      { ...approvedAssets[0], id: "pending-id", status: "PENDING_MODERATION" },
      { ...approvedAssets[0], id: "private-id", folder: "documentos/rg" },
      { ...approvedAssets[0], id: "foreign-id", userId: "other-owner" },
    ], ownerId);

    expect(photos).toEqual([]);
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

  test("UI remove tags de imagem quebradas e mostra fallback", async ({ page }) => {
    await mockPublicProfilePage(page, ["/mock-media/broken.jpg"], true);
    await page.goto("/profissionais/victoria", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("profile-cover")).toHaveAttribute("data-media-state", "fallback");
    await expect(page.getByTestId("profile-cover").locator("img")).toHaveCount(0);
    await expect(page.getByTestId("profile-avatar")).toHaveAttribute("data-media-state", "fallback");
    await expect(page.getByTestId("profile-avatar").locator("img")).toHaveCount(0);
    await expect(page.getByTestId("gallery-image")).toHaveCount(0);
  });
});

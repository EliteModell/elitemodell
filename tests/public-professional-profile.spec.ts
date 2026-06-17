import { expect, test } from "@playwright/test";
import {
  calculateAge,
  canonicalProfessionalPhotos,
  isProfessionalOnline,
} from "../src/lib/public-professional-profile";
import {
  canonicalizeBrazilianLocation,
  citySearchVariants,
  nearestSupportedLocation,
} from "../src/lib/brazilian-location";

test.describe("contrato publico do perfil profissional", () => {
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
});

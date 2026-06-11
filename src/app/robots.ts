import type { MetadataRoute } from "next";

const siteUrl = "https://www.elitemodell.com.br";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    host: siteUrl,
  };
}

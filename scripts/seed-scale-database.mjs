import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const allowedTargets = new Set([1000, 5000, 10000, 50000]);
const target = Number(process.argv.find((argument) => argument.startsWith("--target="))?.slice(9));
if (!allowedTargets.has(target)) throw new Error("Use --target=1000, 5000, 10000 ou 50000.");

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname) || databaseUrl.pathname !== "/elite_scale") {
  throw new Error("Recusado: o seed de escala so pode usar o banco local elite_scale.");
}

const prisma = new PrismaClient();

async function main() {
  const startedAt = Date.now();
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: { id: "default", professionalBillingEnabled: false },
    update: { professionalBillingEnabled: false },
  });
  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" (
      "id", "name", "email", "emailVerified", "accountType", "birthDate", "verified",
      "lgpdConsent", "termsConsent", "clientStatus", "createdAt", "updatedAt"
    )
    SELECT
      'scale-user-' || lpad(n::text, 8, '0'),
      'Profissional Sintetica ' || n,
      'scale-' || n || '@invalid.example',
      CURRENT_TIMESTAMP,
      'model',
      DATE '1990-01-01' + ((n % 3650) * INTERVAL '1 day'),
      true,
      true,
      true,
      'VERIFIED'::"ClientStatus",
      CURRENT_TIMESTAMP - ((n % 365) * INTERVAL '1 day'),
      CURRENT_TIMESTAMP
    FROM generate_series(1, ${target}) AS n
    ON CONFLICT ("id") DO NOTHING
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Professional" (
      "id", "userId", "slug", "displayName", "bio", "city", "state", "paymentMethods",
      "attendanceTypes", "servesGenders", "idiomas", "diasDisponiveis", "services", "fetishes",
      "image", "galleryUrls", "status", "verified", "accessGrandfathered", "billingStatus",
      "boostActive", "planPriority", "featured", "rating", "totalReviews", "priceMin",
      "currentServiceCity", "currentServiceState", "currentServiceNeighborhood",
      "locationVerificationStatus", "kycStatus", "createdAt", "updatedAt"
    )
    SELECT
      'scale-pro-' || lpad(n::text, 8, '0'),
      'scale-user-' || lpad(n::text, 8, '0'),
      'profissional-' || n,
      'Profissional ' || n,
      repeat('Perfil sintetico para teste isolado de capacidade. ', 3),
      CASE n % 5 WHEN 0 THEN 'Itaúna' WHEN 1 THEN 'Belo Horizonte' WHEN 2 THEN 'São Paulo' WHEN 3 THEN 'Rio de Janeiro' ELSE 'Vitória' END,
      CASE n % 5 WHEN 0 THEN 'MG' WHEN 1 THEN 'MG' WHEN 2 THEN 'SP' WHEN 3 THEN 'RJ' ELSE 'ES' END,
      ARRAY['PIX']::text[],
      ARRAY['Local próprio']::text[],
      ARRAY['Homens']::text[],
      ARRAY['Português']::text[],
      ARRAY['Segunda', 'Terça']::text[],
      ARRAY['Companhia']::text[],
      ARRAY[]::text[],
      '/api/media/scale-cover-' || n,
      ARRAY[]::text[],
      'ACTIVE'::"ProfessionalStatus",
      true,
      true,
      'GRANDFATHERED'::"ProfessionalBillingStatus",
      (n % 20 = 0),
      (n % 4),
      (n % 10 = 0),
      ((n % 50)::double precision / 10.0),
      (n % 200),
      (100 + (n % 900))::double precision,
      CASE n % 5 WHEN 0 THEN 'Itaúna' WHEN 1 THEN 'Belo Horizonte' WHEN 2 THEN 'São Paulo' WHEN 3 THEN 'Rio de Janeiro' ELSE 'Vitória' END,
      CASE n % 5 WHEN 0 THEN 'MG' WHEN 1 THEN 'MG' WHEN 2 THEN 'SP' WHEN 3 THEN 'RJ' ELSE 'ES' END,
      'Centro',
      'VERIFIED',
      'APPROVED',
      CURRENT_TIMESTAMP - ((n % 365) * INTERVAL '1 day'),
      CURRENT_TIMESTAMP
    FROM generate_series(1, ${target}) AS n
    ON CONFLICT ("id") DO NOTHING
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "ProfessionalPhoto" ("id", "professionalId", "url", "order", "cover", "createdAt")
    SELECT
      'scale-photo-' || lpad(n::text, 8, '0') || '-' || p,
      'scale-pro-' || lpad(n::text, 8, '0'),
      '/api/media/scale-' || n || '-' || p,
      p - 1,
      p = 1,
      CURRENT_TIMESTAMP
    FROM generate_series(1, ${target}) AS n
    CROSS JOIN generate_series(1, 10) AS p
    ON CONFLICT ("id") DO NOTHING
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "ProfessionalSpecialty" ("id", "professionalId", "name")
    SELECT
      'scale-specialty-' || lpad(n::text, 8, '0'),
      'scale-pro-' || lpad(n::text, 8, '0'),
      CASE n % 3 WHEN 0 THEN 'Companhia' WHEN 1 THEN 'Massagem' ELSE 'Jantar' END
    FROM generate_series(1, ${target}) AS n
    ON CONFLICT ("id") DO NOTHING
  `);
  await prisma.$executeRawUnsafe('ANALYZE');
  const [users, professionals, photos] = await Promise.all([
    prisma.user.count(),
    prisma.professional.count(),
    prisma.professionalPhoto.count(),
  ]);
  console.log(JSON.stringify({ target, users, professionals, photos, elapsedMs: Date.now() - startedAt }, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((cause) => {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  });

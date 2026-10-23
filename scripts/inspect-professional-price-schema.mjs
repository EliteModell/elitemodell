import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Professional'
      AND column_name IN ('price15min', 'price30min', 'pricePerHour', 'price2h')
    ORDER BY column_name
  `;
  console.log(JSON.stringify(columns));
} finally {
  await prisma.$disconnect();
}

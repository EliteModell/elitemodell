import { Prisma } from "@prisma/client";

export function clientNameSearchQuery(query: string, offset: number, limit: number) {
  const normalized = query.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return Prisma.sql`
    WITH matches AS (
      SELECT id, "createdAt"
      FROM public."User"
      WHERE role = 'GUEST' AND "accountType" <> 'host'
        AND ${normalized} <> ''
        AND strpos(lower(regexp_replace(normalize(name, NFD), U&'[\\0300-\\036F]', '', 'g')), ${normalized}) > 0
    )
    SELECT (SELECT count(*)::int FROM matches) AS total,
           ARRAY(SELECT id FROM matches ORDER BY "createdAt" DESC, id DESC OFFSET ${offset} LIMIT ${limit}) AS ids
  `;
}

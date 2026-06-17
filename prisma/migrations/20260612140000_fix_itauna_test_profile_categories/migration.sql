-- Repair two demonstration profiles that were created under the male category.
-- The public search defaults to the women's tab, so the inconsistent category
-- kept these Itauna profiles out of the expected results.

UPDATE "Professional"
SET
  "escortCategory" = 'MULHER',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('sofia-teste', 'teste-profissional-elite')
  AND "city" ILIKE 'Itaun%';

UPDATE "User"
SET
  "category" = 'MULHER',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
  SELECT "userId"
  FROM "Professional"
  WHERE "slug" IN ('sofia-teste', 'teste-profissional-elite')
    AND "city" ILIKE 'Itaun%'
);

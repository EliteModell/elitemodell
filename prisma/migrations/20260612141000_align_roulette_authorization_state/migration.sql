-- Keep the administrative flag consistent with the authorization gate.
-- A campaign can be activated again from the admin panel after a valid
-- promotional authorization reference is registered.

UPDATE "VoucherSettings"
SET
  "active" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "active" = true
  AND NULLIF(BTRIM("promotionAuthorizationReference"), '') IS NULL;

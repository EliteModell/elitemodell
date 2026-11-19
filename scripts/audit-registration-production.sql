-- Execute in the Elite Modell database with a read-only account.
-- Metrics reflect available records. OTP preparation, acceptance and use are distinct.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '20s';

WITH windows(hours, since) AS (
  SELECT hours, now() - make_interval(hours => hours)
  FROM (VALUES (24), (48), (168), (720)) AS periods(hours)
),
phones AS (
  SELECT w.hours,
         regexp_replace(regexp_replace(p.phone, '[^0-9]', '', 'g'), '^55([0-9]{11})$', '\1') AS phone,
         p."sentAt", p."sendError", p."usedAt", p.attempts, p."userId", p."expiresAt"
  FROM windows w JOIN "PhoneVerificationCode" p ON p."createdAt" >= w.since
  WHERE p."accountType" = 'model'
),
phone_totals AS (
  SELECT hours, count(DISTINCT phone) AS phones_with_records,
         count(*) FILTER (WHERE "sentAt" IS NOT NULL AND "sendError" IS NULL) AS otp_accepted,
         count(*) FILTER (WHERE "sendError" IS NOT NULL) AS recorded_send_errors,
         count(DISTINCT phone) FILTER (WHERE "usedAt" IS NOT NULL AND attempts > 0) AS phones_with_used_code,
         count(DISTINCT phone) FILTER (WHERE "userId" IS NOT NULL) AS phones_linked_to_account,
         count(*) FILTER (WHERE "sentAt" IS NOT NULL AND "sendError" IS NULL AND "usedAt" IS NULL AND "expiresAt" <= now())
           AS expired_unused_code_records
  FROM phones GROUP BY hours
)
SELECT w.hours,
       coalesce(p.phones_with_records, 0) AS professional_phones_with_otp_record,
       coalesce(p.otp_accepted, 0) AS otp_accepted,
       coalesce(p.recorded_send_errors, 0) AS recorded_send_errors,
       coalesce(p.phones_with_used_code, 0) AS professional_phones_with_used_code,
       coalesce(p.phones_linked_to_account, 0) AS otp_phones_linked_to_account,
       coalesce(p.expired_unused_code_records, 0) AS expired_unused_code_records,
       (SELECT count(*) FROM "User" u WHERE u."accountType" = 'model' AND u."createdAt" >= w.since) AS current_professional_accounts_created,
       (SELECT count(*) FROM "Professional" a WHERE a."registrationSubmittedAt" >= w.since) AS profiles_submitted,
       (SELECT count(*) FROM "Professional" a WHERE a."createdAt" >= w.since AND a.status = 'DRAFT') AS profiles_still_draft,
       (SELECT count(*) FROM "Professional" a WHERE a."createdAt" >= w.since AND a."kycStatus" IN ('PENDING', 'KYC_MANUAL_PENDENTE'))
         AS profiles_still_kyc_pending
FROM windows w LEFT JOIN phone_totals p USING (hours)
ORDER BY w.hours;

-- Legacy e-mail records have no account type. Count them independently.
WITH windows(hours, since) AS (
  SELECT hours, now() - make_interval(hours => hours)
  FROM (VALUES (24), (48), (168), (720)) AS periods(hours)
)
SELECT w.hours, d.provider, d.category, d.status, count(*) AS records
FROM windows w JOIN "EmailDelivery" d ON d."createdAt" >= w.since
WHERE left(d.category, 13) = 'REGISTRATION_'
   OR d.subject IN ('Confirme seu cadastro - Elite Modell', 'Confirme seu e-mail - Elite Modell')
GROUP BY w.hours, d.provider, d.category, d.status
ORDER BY w.hours, d.category, d.status;

-- Stored provider identifiers can be compared to provider logs through an authorized console.
-- Report only aggregates here. Retain raw PII and arbitrary stored error text inside the database.
WITH windows(hours, since) AS (
  SELECT hours, now() - make_interval(hours => hours)
  FROM (VALUES (24), (48), (168), (720)) AS periods(hours)
),
failures AS (
  SELECT w.hours, p."deliveryProvider", p.channel,
         CASE WHEN p."sendError" ~ '^TWILIO_[0-9]{5}$' THEN p."sendError"
              WHEN p."sendError" IS NOT NULL THEN 'SEND_ERROR_WITHOUT_STRUCTURED_CODE'
              WHEN p.attempts >= 5 THEN 'LOCAL_ATTEMPT_LIMIT_REACHED'
              ELSE 'EXPIRED_UNUSED' END AS evidence
  FROM windows w JOIN "PhoneVerificationCode" p ON p."createdAt" >= w.since
  WHERE p."accountType" = 'model' AND (
    p."sendError" IS NOT NULL OR (p."usedAt" IS NULL AND p."sentAt" IS NOT NULL AND p."expiresAt" <= now())
  )
)
SELECT hours, "deliveryProvider", channel, evidence, count(*) AS records
FROM failures GROUP BY hours, "deliveryProvider", channel, evidence
ORDER BY hours, records DESC;

-- Match authenticated webhook evidence to the outgoing provider message.
WITH windows(hours, since) AS (
  SELECT hours, now() - make_interval(hours => hours)
  FROM (VALUES (24), (48), (168), (720)) AS periods(hours)
)
SELECT w.hours, e."eventType", e.status AS processing_status, count(*) AS webhook_events,
       count(DISTINCT d.id) AS matched_messages
FROM windows w
JOIN "EmailDelivery" d ON d."createdAt" >= w.since AND d."providerMessageId" IS NOT NULL
JOIN "WebhookEvent" e ON e.provider = 'RESEND' AND e."resourceId" = d."providerMessageId"
WHERE left(d.category, 13) = 'REGISTRATION_'
   OR d.subject IN ('Confirme seu cadastro - Elite Modell', 'Confirme seu e-mail - Elite Modell')
GROUP BY w.hours, e."eventType", e.status
ORDER BY w.hours, e."eventType", e.status;
-- Bounds of surviving evidence. These are not the first incident without log retention evidence.
SELECT 'OTP_SEND_ERROR' AS source, min("createdAt") AS earliest, max("createdAt") AS latest, count(*) AS records
FROM "PhoneVerificationCode" WHERE "accountType" = 'model' AND "sendError" IS NOT NULL
UNION ALL
SELECT 'CONFIRMATION_EMAIL_FAILURE', min(coalesce("failedAt", "rejectedAt", "createdAt")),
       max(coalesce("failedAt", "rejectedAt", "createdAt")), count(*)
FROM "EmailDelivery" WHERE status IN ('FAILED', 'REJECTED') AND (
  left(category, 13) = 'REGISTRATION_' OR subject IN ('Confirme seu cadastro - Elite Modell', 'Confirme seu e-mail - Elite Modell')
)
UNION ALL
SELECT 'PROFESSIONAL_PROFILE_SUBMITTED', min("registrationSubmittedAt"), max("registrationSubmittedAt"),
       count("registrationSubmittedAt")
FROM "Professional";

-- Profile references for restricted follow-up. This snapshot cannot prove why an individual stopped.
SELECT p.id AS professional_id, p."createdAt" AS profile_created_at, p."registrationSubmittedAt",
       p.status AS profile_status, p."kycStatus", u."phoneVerifiedAt", u."emailVerified",
       CASE WHEN p."registrationSubmittedAt" IS NOT NULL THEN 'PROFILE_SUBMITTED'
            WHEN NOT u."phoneVerified" THEN 'PHONE_NOT_VERIFIED'
            WHEN u."emailVerified" IS NULL THEN 'EMAIL_NOT_VERIFIED'
            WHEN p."kycStatus" IN ('PENDING', 'KYC_MANUAL_PENDENTE', 'REJECTED') THEN 'IDENTITY_REQUIRES_REVIEW'
            ELSE 'PROFILE_NOT_SUBMITTED' END AS current_stage
FROM "Professional" p JOIN "User" u ON u.id = p."userId"
WHERE p."createdAt" >= now() - interval '30 days'
   OR p."registrationSubmittedAt" >= now() - interval '30 days'
ORDER BY p."createdAt" DESC;

COMMIT;

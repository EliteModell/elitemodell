-- DEFERRED SECURITY CHANGE: intentionally kept outside prisma/migrations.
-- Apply only in a separately authorized security release after impact validation.
--
-- Tables introduced after 20260602181500_enable_supabase_rls must not inherit
-- direct Data API access. The application accesses them through validated
-- server-side Prisma routes. No anon/authenticated policies are intentionally
-- created here, so RLS remains fail-closed.

ALTER TABLE public."PremiumPurchaseIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PremiumPurchaseEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BookingFinancialEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProfessionalSubmissionReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ModerationAuthorityRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CorporateChannel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PrivacyOfficerAppointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LegalAddressVisibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BookingPolicyHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UploadAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MalwareScanJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProfessionalLocationChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminRoleAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminMfaEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminMfaSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LegalDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LegalDocumentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserAcceptance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConsentPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PrivacyRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PrivacyRequestEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentDeclaration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MediaDepictedPerson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CheckoutAcceptance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ModerationCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ModerationCaseEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvidenceArtifact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DataRetentionRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DataDeletionJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DataDeletionJobItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LegacyMediaMigrationJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LegacyMediaMigrationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PublicationRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PublicationRequirementHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SecurityIncident" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public."PremiumPurchaseIntent",
  public."PremiumPurchaseEvent",
  public."PaymentOperation",
  public."BookingFinancialEvent",
  public."ProfessionalSubmissionReceipt",
  public."PlatformSettings",
  public."ModerationAuthorityRule",
  public."CorporateChannel",
  public."PrivacyOfficerAppointment",
  public."LegalAddressVisibility",
  public."BookingPolicyHistory",
  public."UploadAsset",
  public."MalwareScanJob",
  public."ProfessionalLocationChange",
  public."AdminRoleAssignment",
  public."AdminMfaEnrollment",
  public."AdminMfaSession",
  public."LegalDocument",
  public."LegalDocumentVersion",
  public."UserAcceptance",
  public."ConsentPreference",
  public."PrivacyRequest",
  public."PrivacyRequestEvent",
  public."ContentDeclaration",
  public."MediaDepictedPerson",
  public."CheckoutAcceptance",
  public."ModerationCase",
  public."ModerationCaseEvent",
  public."EvidenceArtifact",
  public."DataRetentionRule",
  public."DataDeletionJob",
  public."DataDeletionJobItem",
  public."LegacyMediaMigrationJob",
  public."LegacyMediaMigrationItem",
  public."PublicationRequirement",
  public."PublicationRequirementHistory",
  public."SecurityIncident"
FROM anon, authenticated;

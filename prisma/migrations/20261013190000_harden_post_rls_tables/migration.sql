-- Tables introduced after the original RLS migration are backend-only unless
-- a later, reviewed policy explicitly grants access.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'AdminMfaEnrollment','AdminMfaSession','AdminRoleAssignment',
    'BookingFinancialEvent','BookingPolicyHistory','CheckoutAcceptance',
    'ConsentPreference','ContentDeclaration','CorporateChannel',
    'DataDeletionJob','DataDeletionJobItem','DataRetentionRule',
    'EvidenceArtifact','LegacyMediaMigrationItem','LegacyMediaMigrationJob',
    'LegalAddressVisibility','LegalDocument','LegalDocumentVersion',
    'MalwareScanJob','MediaDepictedPerson','ModerationAuthorityRule',
    'ModerationCase','ModerationCaseEvent','PaymentOperation',
    'PlatformSettings','PremiumPurchaseEvent','PremiumPurchaseIntent',
    'PrivacyOfficerAppointment','PrivacyRequest','PrivacyRequestEvent',
    'ProfessionalLocationChange','ProfessionalSubmissionReceipt',
    'PublicationRequirement','PublicationRequirementHistory','SecurityIncident',
    'UploadAsset','UserAcceptance'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', table_name);
  END LOOP;
END $$;

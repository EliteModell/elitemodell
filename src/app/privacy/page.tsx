import type { Metadata } from "next";
import { OperationalLegalDocumentPage } from "@/components/legal/OperationalLegalDocumentPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <OperationalLegalDocumentPage documentKey="privacy-policy" />;
}

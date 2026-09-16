import type { Metadata } from "next";
import { OperationalLegalDocumentPage } from "@/components/legal/OperationalLegalDocumentPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termos de Uso",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <OperationalLegalDocumentPage documentKey="terms-general" />;
}

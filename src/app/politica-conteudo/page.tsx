import type { Metadata } from "next";
import { OperationalLegalDocumentPage } from "@/components/legal/OperationalLegalDocumentPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de Conteúdo",
  alternates: { canonical: "/politica-conteudo" },
};

export default function ContentPolicyPage() {
  return <OperationalLegalDocumentPage documentKey="content-policy" />;
}

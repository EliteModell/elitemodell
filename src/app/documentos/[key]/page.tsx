import { OperationalLegalDocumentPage } from "@/components/legal/OperationalLegalDocumentPage";
import { publicLegalDocument } from "@/lib/legal-document-catalog";

type PageProps = {
  params: Promise<{ key: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps) {
  const { key } = await props.params;
  const document = publicLegalDocument(key);
  if (!document) return { title: "Documento juridico" };
  return {
    title: `${document.title} | Elite Modell`,
    robots: { index: false, follow: false },
  };
}

export default async function LegalDocumentPage(props: PageProps) {
  const { key } = await props.params;
  return <OperationalLegalDocumentPage documentKey={key} />;
}

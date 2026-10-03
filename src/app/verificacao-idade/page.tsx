import AgeDeclarationPageClient from "./AgeDeclarationPageClient";

export const metadata = {
  title: "Verificacao de maioridade | Elite Modell",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function PublicAgeVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const returnUrl = typeof params.returnUrl === "string" ? params.returnUrl : "/";
  return <AgeDeclarationPageClient returnUrl={returnUrl} />;
}

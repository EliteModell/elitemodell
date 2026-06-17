import { redirect } from "next/navigation";

function cityFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CityDiscoveryPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const query = new URLSearchParams({
    cidade: cityFromSlug(city),
    estado: state.toUpperCase(),
  });
  redirect(`/buscar?${query.toString()}`);
}

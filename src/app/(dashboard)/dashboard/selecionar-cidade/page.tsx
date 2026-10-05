"use client";

import { useRouter } from "next/navigation";
import CitySelectorScreen from "@/components/client-area/CitySelectorScreen";

export default function SelecionarCidadePage() {
  const router = useRouter();

  return (
    <CitySelectorScreen
      onClose={() => router.back()}
      onSelectCity={(city) => {
        router.push(`/dashboard/acompanhantes?city=${encodeURIComponent(city)}`);
      }}
    />
  );
}

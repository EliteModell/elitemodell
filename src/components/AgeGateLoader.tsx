"use client";

import dynamic from "next/dynamic";

const AgeGate = dynamic(() => import("@/components/AgeGate"), {
  ssr: false,
});

export default function AgeGateLoader() {
  return <AgeGate />;
}

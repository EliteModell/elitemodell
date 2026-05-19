import { Suspense } from "react";
import { PhoneRegistrationClient } from "@/components/auth/PhoneRegistrationClient";

export default function HostVerifyPhonePage() {
  return (
    <Suspense fallback={null}>
      <PhoneRegistrationClient mode="host" screen="verify" />
    </Suspense>
  );
}

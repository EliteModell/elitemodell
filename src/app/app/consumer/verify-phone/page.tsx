import { Suspense } from "react";
import { PhoneRegistrationClient } from "@/components/auth/PhoneRegistrationClient";

export default function ConsumerVerifyPhonePage() {
  return (
    <Suspense fallback={null}>
      <PhoneRegistrationClient mode="client" screen="verify" />
    </Suspense>
  );
}

import { Suspense } from "react";
import { PhoneRegistrationClient } from "@/components/auth/PhoneRegistrationClient";

export default function ModelVerifyPhonePage() {
  return (
    <Suspense fallback={null}>
      <PhoneRegistrationClient mode="model" screen="verify" />
    </Suspense>
  );
}

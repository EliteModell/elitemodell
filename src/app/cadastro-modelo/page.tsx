import { Suspense } from "react";
import { PhoneRegistrationClient } from "@/components/auth/PhoneRegistrationClient";

export default function ModelRegisterPage() {
  return (
    <Suspense fallback={null}>
      <PhoneRegistrationClient mode="model" screen="register" />
    </Suspense>
  );
}

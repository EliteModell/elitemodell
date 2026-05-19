import { Suspense } from "react";
import { PhoneRegistrationClient } from "@/components/auth/PhoneRegistrationClient";

export default function ConsumerRegisterPage() {
  return (
    <Suspense fallback={null}>
      <PhoneRegistrationClient mode="client" screen="register" />
    </Suspense>
  );
}

import { Suspense } from "react";
import { PhoneRegistrationClient } from "@/components/auth/PhoneRegistrationClient";

export default function HostRegisterPage() {
  return (
    <Suspense fallback={null}>
      <PhoneRegistrationClient mode="host" screen="register" />
    </Suspense>
  );
}

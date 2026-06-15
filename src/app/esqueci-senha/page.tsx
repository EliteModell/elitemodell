import type { Metadata } from "next";
import { PasswordRecoveryClient } from "./PasswordRecoveryClient";

export const metadata: Metadata = {
  title: "Recuperar senha | Elite Modell",
  robots: { index: false, follow: false },
};

export default function EsqueciSenhaPage() {
  return <PasswordRecoveryClient />;
}

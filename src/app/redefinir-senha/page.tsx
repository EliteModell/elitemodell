import type { Metadata } from "next";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Criar nova senha | Elite Modell",
  robots: { index: false, follow: false },
};

export default function RedefinirSenhaPage() {
  return <ResetPasswordClient />;
}

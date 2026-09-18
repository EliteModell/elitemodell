import { ProfessionalRegistrationFlow } from "@/components/auth/ProfessionalRegistrationFlow";

export default function CadastroAcompanhantePage() {
  const whatsAppVerifyEnabled =
    process.env.TWILIO_WHATSAPP_VERIFY_ENABLED?.trim().toLowerCase() === "true";
  return <ProfessionalRegistrationFlow whatsAppVerifyEnabled={whatsAppVerifyEnabled} />;
}

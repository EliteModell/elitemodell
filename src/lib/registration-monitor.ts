import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { after, type NextRequest, type NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type RegistrationStage = "PHONE_SEND" | "PHONE_CHECK" | "EMAIL_SEND" | "EMAIL_CONFIRMATION" | "ACCOUNT" | "IDENTITY" | "PROFILE" | "DRAFT";
type AccountType = "client" | "model" | "host";
type RegistrationTrace = {
  accountType?: AccountType;
  identity?: string;
  channel?: "sms" | "whatsapp";
  provider?: "TWILIO" | "FIREBASE" | "RESEND" | "SUPABASE" | "DIDIT";
  reason?: string;
  step?: number;
  providerCode?: number;
  providerReference?: string;
  outcome?: "EXISTING_ACCOUNT" | "ACCOUNT_COMPLETED" | "IDENTITY_PENDING" | "PREPARED" | "ERROR" | "EMAIL_VERIFIED" | "NO_CHANGE" | "PROFILE_SUBMITTED" | "STEP_SAVED" | "IDENTITY_APPROVED" | "IDENTITY_REJECTED";
};

let telemetryTableConfirmed = false;

export async function registrationTelemetryReady() {
  if (telemetryTableConfirmed) return true;
  const [state] = await prisma.$queryRaw<{ ready: boolean }[]>`
    SELECT to_regclass('public."RegistrationEvent"') IS NOT NULL AS ready
  `;
  telemetryTableConfirmed = state?.ready === true;
  return telemetryTableConfirmed;
}

export function registrationIdentity(kind: "phone" | "email" | "account", value: string | null | undefined) {
  const secret = process.env.REGISTRATION_TELEMETRY_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret || !value?.trim()) return undefined;
  return createHmac("sha256", secret).update(`registration:v1:${kind}:${value.trim().toLowerCase()}`).digest("hex");
}

export function registrationAccountType(value: string): AccountType {
  if (value === "PROFESSIONAL" || value === "model") return "model";
  if (value === "PROPERTY_HOST" || value === "host") return "host";
  return "client";
}

export function recordRegistrationEvent(stage: RegistrationStage, trace: RegistrationTrace, status: number) {
  const data = {
    ...trace,
    createdAt: new Date(),
    stage,
    status,
    outcome: status >= 400 ? "ERROR" : trace.outcome ?? "SUCCESS",
  };
  try {
    after(async () => {
      try {
        if (!(await registrationTelemetryReady())) return;
        await prisma.registrationEvent.create({ data });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
          telemetryTableConfirmed = false;
          return;
        }
        console.error("[registration-monitor] event_write_failed", { stage });
      }
    });
  } catch {
    console.warn("[registration-monitor] event_schedule_unavailable", { stage });
  }
}

export function monitorRegistration(
  stage: RegistrationStage,
  handler: (req: NextRequest, trace: RegistrationTrace) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const trace: RegistrationTrace = {};
    let status = 500;
    try {
      const response = await handler(req, trace);
      status = response.status;
      return response;
    } finally {
      recordRegistrationEvent(stage, trace, status);
    }
  };
}

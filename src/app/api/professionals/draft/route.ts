export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertApprovedMediaUrls } from "@/lib/approved-media";
import { normalizeControlledMediaUrl } from "@/lib/public-professional-media";
import { professionalCompletion } from "@/lib/professional-completeness";

const draftSchema = z.object({
  step: z.number().int().min(0).max(7),
  form: z.record(z.string(), z.unknown()),
});

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function list(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []; }
function number(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function phone(value: unknown) {
  const digits = text(value).replace(/\D/g, "");
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits.slice(0, 11);
}
function submittedNumber(form: Record<string, unknown>, field: string, fallback: number | null) {
  return Object.prototype.hasOwnProperty.call(form, field) ? number(form[field]) : fallback;
}

async function loadProfessional(userId: string) {
  return prisma.professional.findUnique({
    where: { userId },
    include: {
      photos: { select: { url: true, cover: true } },
      specialties: { select: { name: true } },
      user: { select: { emailVerified: true } },
    },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const professional = await loadProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "Rascunho profissional não encontrado." }, { status: 404 });
  const lastCorrection = professional.status === "CORRECTION_REQUIRED"
    ? await prisma.auditLog.findFirst({
        where: { targetType: "PROFESSIONAL", targetId: professional.id, reason: { not: null } },
        orderBy: { timestamp: "desc" },
        select: { changes: true, reason: true },
      })
    : null;
  const changes = lastCorrection?.changes && typeof lastCorrection.changes === "object" && !Array.isArray(lastCorrection.changes)
    ? lastCorrection.changes as Record<string, unknown>
    : {};
  const correctionFields = Array.isArray(changes.correctionFields)
    ? changes.correctionFields.filter((item): item is string => typeof item === "string")
    : [];
  return NextResponse.json({
    completion: professionalCompletion({
      ...professional,
      specialties: professional.specialties,
      emailVerified: professional.user.emailVerified,
    }),
    correction: professional.status === "CORRECTION_REQUIRED" ? { reason: lastCorrection?.reason, fields: correctionFields } : null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const { step, form } = draftSchema.parse(await req.json());
    const professional = await loadProfessional(session.user.id);
    if (!professional) return NextResponse.json({ error: "Rascunho profissional não encontrado." }, { status: 404 });
    if (!["DRAFT", "CORRECTION_REQUIRED"].includes(professional.status)) {
      return NextResponse.json({ error: "Este cadastro não está em edição." }, { status: 409 });
    }

    const merged = {
      ...professional,
      ...form,
      image: text(form.mainPhotoUrl) || professional.image,
      photos: text(form.mainPhotoUrl)
        ? [{ url: text(form.mainPhotoUrl), cover: true }, ...list(form.galleryUrls).map((url) => ({ url, cover: false }))]
        : professional.photos,
      specialties: list(form.services).length ? list(form.services) : professional.specialties,
      price15min: submittedNumber(form, "price15min", professional.price15min),
      price30min: submittedNumber(form, "price30min", professional.price30min),
      pricePerHour: submittedNumber(form, "pricePerHour", professional.pricePerHour),
      price2h: submittedNumber(form, "price2h", professional.price2h),
      priceOvernight: submittedNumber(form, "priceOvernight", professional.priceOvernight),
      priceWebcam: submittedNumber(form, "priceWebcam", professional.priceWebcam),
      emailVerified: professional.user.emailVerified,
    };
    const completion = professionalCompletion(merged);
    const stepIssues = completion.issues.filter((issue) => issue.step === step);
    if (stepIssues.length) {
      return NextResponse.json({
        error: "Complete os campos obrigatórios desta etapa.",
        code: "step_incomplete",
        step,
        issues: stepIssues,
        completion,
      }, { status: 422 });
    }

    const common = { completionRulesVersion: 2 };
    if (step === 0) {
      const category = text(form.escortCategory);
      const typedCategory = ["MULHER", "HOMEM", "TRANS", "HETERO"].includes(category)
        ? category as "MULHER" | "HOMEM" | "TRANS" | "HETERO"
        : null;
      await prisma.professional.update({
        where: { id: professional.id },
        data: {
          ...common, displayName: text(form.displayName), bio: text(form.bio), city: text(form.city), state: text(form.state).toUpperCase(),
          bairro: text(form.bairro) || null, placeId: text(form.placeId) || null, escortCategory: category,
          currentServiceCity: text(form.city), currentServiceState: text(form.state).toUpperCase(), currentServiceNeighborhood: text(form.bairro) || null,
          locationUpdatedAt: new Date(), locationVerificationStatus: "VERIFIED",
          user: { update: { category: typedCategory } },
        },
      });
    } else if (step === 1) {
      await prisma.professional.update({ where: { id: professional.id }, data: {
        ...common, birthDate: new Date(text(form.birthDate)), height: number(form.height) ? Math.round(number(form.height)!) : null,
        weight: number(form.weight) ? Math.round(number(form.weight)!) : null, hairColor: text(form.hairColor) || null,
        eyeColor: text(form.eyeColor) || null, ethnicity: text(form.ethnicity) || null, signo: text(form.signo) || null,
        hasTattoos: Boolean(form.hasTattoos), hasPiercing: Boolean(form.hasPiercing), hasSilicone: Boolean(form.hasSilicone),
        isDepilada: Boolean(form.isDepilada), depilationStyle: text(form.depilationStyle) || null, bodyType: text(form.bodyType) || null,
      } });
    } else if (step === 2) {
      await prisma.professional.update({ where: { id: professional.id }, data: {
        ...common, attendanceTypes: list(form.attendanceTypes), servesGenders: list(form.servesGenders), idiomas: list(form.idiomas),
        diasDisponiveis: list(form.diasDisponiveis), horarioInicio: text(form.horarioInicio) || null, horarioFim: text(form.horarioFim) || null,
      } });
    } else if (step === 3) {
      const services = list(form.services);
      await prisma.professional.update({ where: { id: professional.id }, data: {
        ...common, services, fetishes: list(form.fetishes), specialties: { deleteMany: {}, create: services.map((name) => ({ name })) },
      } });
    } else if (step === 4) {
      await prisma.professional.update({ where: { id: professional.id }, data: {
        ...common, price15min: number(form.price15min), price30min: number(form.price30min), pricePerHour: number(form.pricePerHour),
        price2h: number(form.price2h), priceOvernight: number(form.priceOvernight), priceWebcam: number(form.priceWebcam),
        priceMin: number(form.pricePerHour), paymentMethods: list(form.paymentMethods),
      } });
    } else if (step === 5) {
      await prisma.professional.update({ where: { id: professional.id }, data: {
        ...common, phone: phone(form.phone) || null, whatsapp: phone(form.whatsapp), instagram: text(form.instagram) || null, website: text(form.website) || null,
      } });
    } else if (step === 6) {
      const urls = [text(form.mainPhotoUrl), ...list(form.galleryUrls)].filter(Boolean);
      await assertApprovedMediaUrls({ urls, requestUrl: req.url, ownerId: session.user.id, allowedFolderPrefixes: ["profiles"] });
      const normalized = urls.map((url) => normalizeControlledMediaUrl(url)).filter((url): url is string => Boolean(url));
      await prisma.professional.update({ where: { id: professional.id }, data: {
        ...common, image: null, galleryUrls: [], photos: { deleteMany: {}, create: normalized.map((url, order) => ({ url, order, cover: order === 0 })) },
      } });
    } else {
      await prisma.professional.update({ where: { id: professional.id }, data: common });
    }

    const saved = await loadProfessional(session.user.id);
    const savedCompletion = professionalCompletion({ ...saved!, specialties: saved!.specialties, emailVerified: saved!.user.emailVerified });
    return NextResponse.json({ ok: true, savedStep: step, completion: savedCompletion });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados da etapa inválidos.", issues: error.issues }, { status: 400 });
    if (error instanceof Error && error.message.toLowerCase().includes("midia")) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[professional/draft]", error);
    return NextResponse.json({ error: "Não foi possível salvar esta etapa." }, { status: 500 });
  }
}

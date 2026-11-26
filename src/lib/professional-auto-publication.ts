import { identityEnabled, MANUAL_DOCUMENT_PROVIDER, manualAttemptAllowsPublication } from "@/lib/manual-identity-policy";
import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { mediaIsPublishable } from "@/lib/media-security";
import { professionalApprovalAccessData } from "@/lib/professional-access";
import { professionalCompletion } from "@/lib/professional-completeness";
import { deliverProfessionalApprovalSms, deliverProfileApprovalCommunication } from "@/lib/professional-communications";
import { controlledMediaAssetId } from "@/lib/public-professional-media";

export type ProfessionalPublicationBlocker = {
  code: string;
  label: string;
};

export type AutomaticPublicationResult = {
  professionalId: string;
  status: string;
  published: boolean;
  becamePublished: boolean;
  profileUrl: string;
  blockers: ProfessionalPublicationBlocker[];
};

function uniqueBlockers(blockers: ProfessionalPublicationBlocker[]) {
  return blockers.filter((blocker, index, values) => (
    values.findIndex((candidate) => candidate.code === blocker.code) === index
  ));
}

function refreshPublicProfessionalPages() {
  try {
    revalidatePath("/");
    revalidatePath("/buscar");
    revalidatePath("/profissionais");
    revalidatePath("/cidade/[state]/[city]", "page");
    revalidatePath("/profissionais/[slug]", "page");
  } catch (cause) {
    console.warn("[professional-auto-publication] revalidacao adiada", {
      reason: cause instanceof Error ? cause.name : "unknown",
    });
  }
}

export async function attemptAutomaticProfessionalPublication(
  professionalId: string,
  source: string,
  adminId?: string,
): Promise<AutomaticPublicationResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`professional-auto-publication:${professionalId}`}))`;
    const professional = await tx.professional.findUniqueOrThrow({
      where: { id: professionalId },
      include: {
        photos: { where: { hiddenAt: null }, orderBy: { order: "asc" } },
        specialties: { select: { id: true } },
        user: {
          select: {
            id: true,

            email: true,
            emailVerified: true,
            blocked: true,
            termsConsent: true,
            lgpdConsent: true,
            uploadedAssets: {
              where: { category: "image", folder: { startsWith: "profiles" } },
              select: {
                id: true, userId: true, folder: true, category: true, status: true,
                approvedBucket: true, approvedPath: true, uploadCompletedAt: true,
                malwareStatus: true, moderationStatus: true, publicationDecisionType: true, ageIdentityStatus: true,
                consentStatus: true, adminReviewRequired: true, adminReviewStatus: true,
                takedownStatus: true,
              },
            },
          },
        },
      },
    });
    const profileUrl = `/profissionais/${professional.slug}`;
    if (professional.status === "ACTIVE" && professional.verified) {
      return {
        result: {
          professionalId,
          status: professional.status,
          published: true,
          becamePublished: false,
          profileUrl,
          blockers: [],
        } satisfies AutomaticPublicationResult,
        communication: null,
      };
    }

    const blockers: ProfessionalPublicationBlocker[] = [];
    if (!adminId || professional.status !== "PENDING_REVIEW") {
      blockers.push({ code: "administrative_approval", label: "O perfil aguarda aprovação administrativa." });
    }
    if (!["DRAFT", "PENDING_REVIEW", "CORRECTION_REQUIRED"].includes(professional.status)) {
      blockers.push({ code: "status", label: `Status ${professional.status} exige análise administrativa.` });
    }
    if (professional.status === "CORRECTION_REQUIRED" && professional.rejectReason) {
      blockers.push({ code: "correction", label: professional.rejectReason });
    }
    if (!professional.registrationSubmittedAt) {
      blockers.push({ code: "submission", label: "Conclua e envie as 9 etapas do cadastro." });
    }
    if (professional.user.blocked) {
      blockers.push({ code: "account_blocked", label: "A conta está bloqueada." });
    }
    if (!professional.user.emailVerified) {
      blockers.push({ code: "email", label: "Confirme o e-mail da conta." });
    }
    if (!professional.user.termsConsent || !professional.user.lgpdConsent) {
      blockers.push({ code: "consent", label: "Aceite os termos e o consentimento de privacidade obrigatórios." });
    }

    const completion = professionalCompletion({
      ...professional,
      specialties: professional.specialties,
      emailVerified: professional.user.emailVerified,
    });
    blockers.push(...completion.profileIssues.map((issue) => ({ code: issue.code, label: issue.label })));
    let approvedIdentity = Boolean(professional.kycSessionId && professional.kycStatus === "APPROVED");
    if (professional.kycProvider === MANUAL_DOCUMENT_PROVIDER) {
      const current = identityEnabled() && approvedIdentity ? await tx.manualIdentityAttempt.findFirst({
        where: { userId: professional.userId, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" },
      }) : null;
      approvedIdentity = manualAttemptAllowsPublication(professional.kycSessionId, current);
    }
    if (!approvedIdentity) {
      blockers.push({ code: "kyc", label: "A verificação de identidade e maioridade ainda não foi aprovada." });
    }

    const assetsById = new Map(professional.user.uploadedAssets.map((asset) => [asset.id, asset]));
    const publishablePhotos = professional.photos.filter((photo) => {
      const assetId = controlledMediaAssetId(photo.url);
      const asset = assetId ? assetsById.get(assetId) : null;
      return Boolean(asset && asset.userId === professional.userId && mediaIsPublishable(asset));
    });
    if (!publishablePhotos.length) {
      const referencedAssets = professional.photos
        .map((photo) => controlledMediaAssetId(photo.url))
        .map((assetId) => assetId ? assetsById.get(assetId) : null)
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
      const rejected = referencedAssets.some((asset) => asset.status === "REJECTED" || asset.moderationStatus === "REJECTED" || asset.malwareStatus === "INFECTED");
      blockers.push({
        code: "main_photo_security",
        label: rejected
          ? "A foto principal foi impedida pelas verificações de segurança; envie outra foto."
          : "A foto principal ainda está nas verificações obrigatórias de segurança e conteúdo.",
      });
    }

    const finalBlockers = uniqueBlockers(blockers);
    if (finalBlockers.length) {
      return {
        result: {
          professionalId,
          status: professional.status,
          published: false,
          becamePublished: false,
          profileUrl,
          blockers: finalBlockers,
        } satisfies AutomaticPublicationResult,
        communication: null,
      };
    }

    const cover = publishablePhotos.find((photo) => photo.cover) ?? publishablePhotos[0];
    const accessData = await professionalApprovalAccessData(tx, professional);
    await tx.professionalPhoto.updateMany({
      where: { professionalId, cover: true, id: { not: cover.id } },
      data: { cover: false },
    });
    if (!cover.cover) {
      await tx.professionalPhoto.update({ where: { id: cover.id }, data: { cover: true } });
    }
    await tx.professional.update({
      where: { id: professionalId, status: professional.status, updatedAt: professional.updatedAt },
      data: {
        status: "ACTIVE",
        verified: true,
        docStatus: "APPROVED",
        verifStatus: "APPROVED",
        rejectReason: null,
        image: null,
        ...accessData,
      },
    });
    await tx.auditLog.create({
      data: {
        adminId,
        actorIdentifier: adminId ?? "automatic-publication",
        action: "PROFESSIONAL_APPROVED",
        targetType: "PROFESSIONAL",
        targetId: professionalId,
        reason: adminId ? "Aprovação administrativa do perfil." : "professional:auto-publication",
        changes: {
          source,
          resultingStatus: "ACTIVE",
          coverPhotoId: cover.id,
          publishablePhotoCount: publishablePhotos.length,
          moderationAction: adminId ? "approve" : "automatic-publication",
        },
      },
    });
    return {
      result: {
        professionalId,
        status: "ACTIVE",
        published: true,
        becamePublished: true,
        profileUrl,
        blockers: [],
      } satisfies AutomaticPublicationResult,
      communication: {
        userId: professional.user.id,
        email: professional.user.email,
      },
    };
  }, { maxWait: 5_000, timeout: 15_000 });

  if (outcome.result.published && outcome.communication) {
    const communication = outcome.communication;
    await deliverProfileApprovalCommunication({
      professionalId,
      userId: communication.userId,
      email: communication.email,
      adminId,
    }).catch((cause) => {
      console.error("[professional-auto-publication] falha na comunicação", {
        professionalId,
        reason: cause instanceof Error ? cause.name : "unknown",
      });
    });
    await deliverProfessionalApprovalSms({
      professionalId,
      userId: communication.userId,
      dedupeReason: "professional:publication-sms",
      body: "Elite Modell: seu perfil foi aprovado! Acesse sua conta em www.elitemodell.com.br/profissional",
    }).catch((cause) => {
      console.error("[professional-auto-publication] falha no SMS", {
        professionalId,
        reason: cause instanceof Error ? cause.name : "unknown",
      });
    });
    if (outcome.result.becamePublished) refreshPublicProfessionalPages();
  }

  return outcome.result;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function positiveNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(String(formData.get(key) ?? "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(String(formData.get(key) ?? "").replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function positiveInt(formData: FormData, key: string, fallback: number) {
  const value = Math.floor(Number(formData.get(key)));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function optionalPositiveInt(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function ownedProperty(id: string) {
  const access = await requireHostPanel();
  const property = await prisma.property.findFirst({
    where: access.isAdmin ? { id } : { id, hostId: access.user.id },
    select: { id: true, status: true },
  });

  return { access, property };
}

export async function submitPropertyForReview(formData: FormData) {
  const id = text(formData, "id");
  if (!id) return;

  const { property } = await ownedProperty(id);
  if (!property) return;
  if (property.status === "ACTIVE" || property.status === "PENDING_REVIEW") return;

  await prisma.property.update({
    where: { id: property.id },
    data: { status: "PENDING_REVIEW" },
    select: { id: true },
  });

  revalidatePath("/anfitriao");
  revalidatePath("/anfitriao/imoveis");
  revalidatePath(`/anfitriao/imoveis/${id}`);
}

export async function pauseProperty(formData: FormData) {
  const id = text(formData, "id");
  if (!id) return;

  const { property } = await ownedProperty(id);
  if (!property || property.status !== "ACTIVE") return;

  await prisma.property.update({
    where: { id: property.id },
    data: { status: "INACTIVE" },
    select: { id: true },
  });

  revalidatePath("/anfitriao");
  revalidatePath("/anfitriao/imoveis");
  revalidatePath(`/anfitriao/imoveis/${id}`);
}

export async function saveHostProperty(formData: FormData) {
  const id = text(formData, "id");
  const intent = text(formData, "intent");
  if (!id) return;

  const { property } = await ownedProperty(id);
  if (!property) return;

  const title = text(formData, "title");
  const description = text(formData, "description");
  const address = text(formData, "address");
  const city = text(formData, "city");
  const state = text(formData, "state");

  if (title.length < 5 || description.length < 20 || address.length < 5 || city.length < 2 || state.length < 2) {
    redirect(`/anfitriao/imoveis/${id}/editar?erro=dados-obrigatorios`);
  }

  const amenities = text(formData, "amenities")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  const photos = text(formData, "photos")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const nextStatus = intent === "review"
    ? "PENDING_REVIEW"
    : property.status === "ACTIVE"
      ? "INACTIVE"
      : "DRAFT";

  await prisma.property.update({
    where: { id: property.id },
    data: {
      title,
      description,
      address,
      bairro: text(formData, "bairro") || null,
      city,
      state,
      zipCode: text(formData, "zipCode") || null,
      pricePerNight: positiveNumber(formData, "pricePerNight", 1),
      cleaningFee: nonNegativeNumber(formData, "cleaningFee", 0),
      maxGuests: positiveInt(formData, "maxGuests", 1),
      bedrooms: positiveInt(formData, "bedrooms", 1),
      beds: positiveInt(formData, "beds", 1),
      bathrooms: positiveInt(formData, "bathrooms", 1),
      checkInTime: text(formData, "checkInTime") || "14:00",
      checkOutTime: text(formData, "checkOutTime") || "12:00",
      minNights: positiveInt(formData, "minNights", 1),
      maxNights: optionalPositiveInt(formData, "maxNights"),
      instantBook: formData.get("instantBook") === "on",
      allowPets: formData.get("allowPets") === "on",
      allowSmoking: formData.get("allowSmoking") === "on",
      allowParties: formData.get("allowParties") === "on",
      status: nextStatus,
      amenities: {
        deleteMany: {},
        create: amenities.map((name) => ({ name })),
      },
      photos: photos.length
        ? {
            deleteMany: {},
            create: photos.map((url, order) => ({ url, order })),
          }
        : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/anfitriao");
  revalidatePath("/anfitriao/imoveis");
  revalidatePath(`/anfitriao/imoveis/${id}`);
  redirect(`/anfitriao/imoveis/${id}?salvo=${intent === "review" ? "analise" : "rascunho"}`);
}

"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Acesso estático obrigatório — Next.js só substitui NEXT_PUBLIC_* em acesso literal,
// nunca via process.env[chave_dinamica] no bundle do cliente.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getMissingFirebaseClientEnv(): string[] {
  // Checagem com acesso estático — garante que Next.js substitui os valores corretamente
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID) missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) missing.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  return missing;
}

export function assertFirebaseClientConfig() {
  const missing = getMissingFirebaseClientEnv();
  if (missing.length > 0) {
    // Log técnico para o Vercel — não expõe para o usuário final
    console.error("[firebase] Variaveis de ambiente ausentes:", missing.join(", "), "— Configure na Vercel.");
    throw new Error("Autenticação por SMS temporariamente indisponível. Tente novamente em instantes.");
  }
}

export function isFirebaseConfigured(): boolean {
  return getMissingFirebaseClientEnv().length === 0;
}

export function getFirebaseClientApp(): FirebaseApp {
  assertFirebaseClientConfig();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseClientAuth(): Auth {
  return getAuth(getFirebaseClientApp());
}

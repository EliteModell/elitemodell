"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
] as const;

export function getMissingFirebaseClientEnv() {
  return requiredKeys.filter((key) => !process.env[key]);
}

export function assertFirebaseClientConfig() {
  const missing = getMissingFirebaseClientEnv();
  if (missing.length > 0) {
    const message = `[firebase] Variaveis de ambiente ausentes: ${missing.join(", ")}. Configure o .env para ativar Phone Auth.`;
    console.error(message);
    throw new Error(message);
  }
}

export function getFirebaseClientApp(): FirebaseApp {
  assertFirebaseClientConfig();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseClientAuth(): Auth {
  return getAuth(getFirebaseClientApp());
}

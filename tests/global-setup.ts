/**
 * Global setup: cria uma sessao NextAuth assinada para a conta E2E configurada
 * e salva o storageState para os testes autenticados.
 */

import { chromium, type FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { installMockSessionCookie } from "./helpers/mock-auth";

const STORAGE_PATH = path.join(__dirname, ".auth", "user.json");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

function writeEmptyStorageState() {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  fs.writeFileSync(STORAGE_PATH, JSON.stringify({ cookies: [], origins: [] }));
}

function selectedProjectsFromArgv() {
  const selected = new Set<string>();
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === "--project" && process.argv[i + 1]) selected.add(process.argv[i + 1]);
    if (arg.startsWith("--project=")) selected.add(arg.slice("--project=".length));
  }
  return selected;
}

export default async function globalSetup(config: FullConfig) {
  const selectedProjects = selectedProjectsFromArgv();
  const hasAuthenticatedProject = config.projects.some((project) => project.name === "authenticated");
  const shouldLogin = hasAuthenticatedProject && (selectedProjects.size === 0 || selectedProjects.has("authenticated"));

  if (!shouldLogin) {
    console.warn("\n[global-setup] Projeto autenticado nao selecionado; sessao E2E ignorada.\n");
    writeEmptyStorageState();
    return;
  }

  const email = process.env.TEST_USER_EMAIL;

  if (!email) {
    console.warn("\n[global-setup] TEST_USER_EMAIL nao definido; testes autenticados serao pulados.\n");
    writeEmptyStorageState();
    return;
  }

  console.log("\n[global-setup] Criando sessao assinada para a conta E2E configurada.");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    await context.addInitScript(() => {
      sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
      sessionStorage.setItem("elite_modell_adult_consent_at", new Date().toISOString());
      localStorage.setItem("elite_modell_ageConsentAccepted", "true");
      localStorage.setItem("elite_modell_ageConsentAcceptedAt", new Date().toISOString());
    });

    await installMockSessionCookie(context, {
      id: "e2e-user",
      name: "Conta E2E",
      email,
      role: "GUEST",
      accountType: "client",
      clientStatus: "UNVERIFIED",
      isProfessional: false,
      needsConsent: false,
      activeProfileType: "CLIENTE",
      availableProfiles: ["CLIENTE"],
      adultVerified: true,
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    if (page.url().includes("/login")) {
      throw new Error("A sessao E2E foi redirecionada para o login.");
    }

    fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
    await context.storageState({ path: STORAGE_PATH });
    console.log(`[global-setup] Sessao E2E validada e salva em ${STORAGE_PATH}.\n`);
  } catch (err) {
    console.error(`[global-setup] Falha ao criar sessao E2E: ${(err as Error).message}`);
    writeEmptyStorageState();
  } finally {
    await browser.close();
  }
}

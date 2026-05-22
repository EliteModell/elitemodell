/**
 * Global setup — executa UMA vez antes de todos os testes.
 * Faz login real com Supabase + NextAuth e salva o storageState em
 * tests/.auth/user.json para reutilização em todos os testes autenticados.
 */

import { chromium, type FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

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
    console.warn("\n[global-setup] Projeto autenticado nao selecionado; login real ignorado.\n");
    writeEmptyStorageState();
    return;
  }

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.warn("\n[global-setup] TEST_USER_EMAIL / TEST_USER_PASSWORD não definidos — testes autenticados serão pulados.\n");
    // Cria um storageState vazio para não quebrar o setup
    writeEmptyStorageState();
    return;
  }

  console.log(`\n[global-setup] Fazendo login como: ${email}`);

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
    // 0. Injeta sessionStorage para bypassar o Age Gate em TODOS os requests
    await context.addInitScript(() => {
      sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
      sessionStorage.setItem("elite_modell_adult_consent_at", new Date().toISOString());
      localStorage.setItem("elite_modell_ageConsentAccepted", "true");
      localStorage.setItem("elite_modell_ageConsentAcceptedAt", new Date().toISOString());
    });

    // 1. Abre página de login
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

    // 2. Preenche e-mail e senha
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // 3. Submete
    await page.click('button[type="submit"]');

    // 4. Aguarda redirect para /dashboard* ou /painel*
    await page.waitForURL(/\/(dashboard|painel|acompanhantes)/, { timeout: 20_000 });

    console.log(`[global-setup] Login OK — URL: ${page.url()}`);

    // 5. Salva sessão
    fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
    await context.storageState({ path: STORAGE_PATH });
    console.log(`[global-setup] storageState salvo em: ${STORAGE_PATH}\n`);
  } catch (err) {
    console.error(`[global-setup] Falha no login: ${(err as Error).message}`);
    // Salva estado vazio para não quebrar os testes (eles vão pular graciosamente)
    writeEmptyStorageState();
  } finally {
    await browser.close();
  }
}

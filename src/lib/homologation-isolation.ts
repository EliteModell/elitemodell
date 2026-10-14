const AUDIT_BRANCH = "codex/security-audit-20261013";

export function isIsolatedHomologation(): boolean {
  return process.env.HOMOLOGATION_MODE === "isolated" ||
    (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === AUDIT_BRANCH);
}

export function isHomologationMock(variable: string): boolean {
  if (process.env[variable]?.trim().toLowerCase() !== "mock") return false;
  if (!isIsolatedHomologation() || process.env.VERCEL_ENV === "production") {
    throw new Error(`${variable}=mock is restricted to the isolated homologation branch.`);
  }
  return true;
}

export function externalIntegrationIsMocked(variable?: string): boolean {
  return isHomologationMock(variable ?? "HOMOLOGATION_EXTERNAL_MODE");
}

export async function externalFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (externalIntegrationIsMocked()) {
    throw new Error("External network is disabled in isolated homologation.");
  }
  return fetch(input, init);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installHomologationNetworkGuard } = await import("./lib/homologation-runtime-guard");
  if (installHomologationNetworkGuard()) console.info("[homologation-runtime] PASS");
}

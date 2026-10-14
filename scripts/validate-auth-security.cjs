const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { getToken } = require("next-auth/jwt");

async function main() {
  const installed = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "node_modules", "next-auth", "package.json"),
    "utf8",
  )).version;
  assert.equal(installed, "4.24.15", "next-auth security patch version is not installed");

  const malformedBearer = {
    headers: { authorization: "Bearer %E0%A4%A" },
    cookies: {},
  };
  const token = await getToken({
    req: malformedBearer,
    secret: "synthetic-regression-secret-at-least-32-bytes",
  });
  assert.equal(token, null, "malformed Bearer header must fail closed without throwing");

  const signin = fs.readFileSync(
    path.join(__dirname, "..", "node_modules", "next-auth", "core", "routes", "signin.js"),
    "utf8",
  );
  assert.match(signin, /normalize\(["']NFKC["']\)/, "email normalization patch is absent");

  const oauthCallback = fs.readFileSync(
    path.join(__dirname, "..", "node_modules", "next-auth", "core", "lib", "oauth", "callback.js"),
    "utf8",
  );
  assert.match(oauthCallback, /providerId:\s*provider\.id/, "OAuth provider-bound cookie patch is absent");

  console.log("AUTH_SECURITY_REGRESSIONS=PASS");
}

main().catch((error) => {
  console.error(`AUTH_SECURITY_REGRESSIONS=FAIL ${error.message}`);
  process.exit(1);
});

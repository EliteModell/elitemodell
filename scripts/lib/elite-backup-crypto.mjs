import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";

const MAGIC = Buffer.from("EMBK0001", "ascii");

function derive(masterKey, purpose) {
  return createHmac("sha256", masterKey).update(purpose, "utf8").digest();
}

export function recoveryKeyFromEnvironment() {
  const encoded = process.env.ELITE_BACKUP_KEY?.trim();
  if (!encoded) throw new Error("ELITE_BACKUP_KEY ausente; use a chave de recuperacao sem inclui-la na linha de comando.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("ELITE_BACKUP_KEY invalida.");
  return key;
}

export function encryptBackupPayload(plaintext, masterKey) {
  const encryptionKey = derive(masterKey, "elite-backup-encryption-v1");
  const authenticationKey = derive(masterKey, "elite-backup-authentication-v1");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authenticated = Buffer.concat([MAGIC, iv, ciphertext]);
  const tag = createHmac("sha256", authenticationKey).update(authenticated).digest();
  encryptionKey.fill(0);
  authenticationKey.fill(0);
  return Buffer.concat([authenticated, tag]);
}

export function decryptBackupPayload(payload, masterKey) {
  if (payload.length < MAGIC.length + 16 + 32 || !timingSafeEqual(payload.subarray(0, MAGIC.length), MAGIC)) {
    throw new Error("Payload EMBK invalido ou truncado.");
  }
  const tagOffset = payload.length - 32;
  const authenticated = payload.subarray(0, tagOffset);
  const actualTag = payload.subarray(tagOffset);
  const authenticationKey = derive(masterKey, "elite-backup-authentication-v1");
  const expectedTag = createHmac("sha256", authenticationKey).update(authenticated).digest();
  authenticationKey.fill(0);
  if (!timingSafeEqual(actualTag, expectedTag)) throw new Error("Autenticacao EMBK falhou.");
  const encryptionKey = derive(masterKey, "elite-backup-encryption-v1");
  const decipher = createDecipheriv("aes-256-cbc", encryptionKey, payload.subarray(MAGIC.length, MAGIC.length + 16));
  const plaintext = Buffer.concat([
    decipher.update(payload.subarray(MAGIC.length + 16, tagOffset)),
    decipher.final(),
  ]);
  encryptionKey.fill(0);
  return plaintext;
}

export function assertExternalEncryptedOutput(output, repositoryRoot = process.cwd()) {
  const resolved = path.resolve(output);
  const relative = path.relative(path.resolve(repositoryRoot), resolved);
  if (!path.isAbsolute(output) || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("O relatorio deve ser salvo fora do repositorio.");
  }
  if (!resolved.toLowerCase().endsWith(".embk")) throw new Error("O arquivo de saida deve usar a extensao .embk.");
  return resolved;
}

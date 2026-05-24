/**
 * Rate limiting com dois backends:
 *   - Upstash Redis (produção) — via REST API sem SDK extra, só fetch.
 *   - In-memory (dev / fallback) — usado quando as env vars do Redis não existem.
 *
 * Variáveis necessárias (Vercel/ambiente de produção):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetIn: number; // ms
};

// ─── In-memory (dev / fallback) ───────────────────────────────────────────────

const _store = new Map<string, { count: number; resetAt: number }>();
let _lastPrune = 0;

function pruneMemory(now: number) {
  if (now - _lastPrune < 60_000) return;
  _lastPrune = now;
  for (const [k, v] of _store) {
    if (now >= v.resetAt) _store.delete(k);
  }
}

function checkInMemory(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneMemory(now);
  const rec = _store.get(key);

  if (!rec || now >= rec.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetIn: windowMs };
  }
  if (rec.count >= max) {
    return { allowed: false, remaining: 0, resetIn: rec.resetAt - now };
  }
  rec.count++;
  return { allowed: true, remaining: max - rec.count, resetIn: rec.resetAt - now };
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function failClosed(windowMs: number): RateLimitResult {
  return { allowed: false, remaining: 0, resetIn: windowMs };
}

// ─── Upstash Redis via REST API (produção) ────────────────────────────────────
// Pipeline atômico: INCR → EXPIRE (apenas se nova chave) → TTL

async function checkRedis(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowSec = Math.ceil(windowMs / 1000);

  let res: Response;
  try {
    res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
        ["TTL", key],
      ]),
    });
  } catch {
    return isProductionRuntime() ? failClosed(windowMs) : checkInMemory(key, max, windowMs);
  }

  if (!res.ok) return isProductionRuntime() ? failClosed(windowMs) : checkInMemory(key, max, windowMs);

  const data = (await res.json()) as Array<{ result: number }>;
  const count = data[0].result;
  const ttl = data[2].result;
  const resetIn = ttl > 0 ? ttl * 1000 : windowMs;

  if (count > max) return { allowed: false, remaining: 0, resetIn };
  return { allowed: true, remaining: max - count, resetIn };
}

// ─── API pública ──────────────────────────────────────────────────────────────

const HAS_REDIS =
  typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
  process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
  typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string" &&
  process.env.UPSTASH_REDIS_REST_TOKEN.length > 0;

/**
 * Verifica rate limit para um identificador (IP, user ID, etc.).
 * Em produção usa Redis; em dev usa memória local.
 */
export function checkRateLimitAsync(
  identifier: string,
  maxRequests = 100,
  windowMs = 5 * 60 * 1000
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;
  if (HAS_REDIS) return checkRedis(key, maxRequests, windowMs);
  if (isProductionRuntime()) return Promise.resolve(failClosed(windowMs));
  return Promise.resolve(checkInMemory(key, maxRequests, windowMs));
}

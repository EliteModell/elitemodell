/**
 * Logger com sanitização de PII.
 * Scrubs emails, CPFs, telefones e tokens antes de escrever em stdout/stderr,
 * para que dados sensíveis nunca cheguem a logs externos ou plataformas de APM.
 */

const REDACT: Array<[RegExp, string]> = [
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]"],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]"],
  [/\b(\+?55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, "[phone]"],
  [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, "Bearer [token]"],
  [/"(password|senha|token|secret|key|authorization)":\s*"[^"]+"/gi, '"$1":"[redacted]"'],
];

function redact(msg: string): string {
  let s = msg;
  for (const [pattern, replacement] of REDACT) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

function serialize(val: unknown): string {
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function fmt(level: string, msg: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const clean = redact(msg);
  const metaStr = meta !== undefined ? " " + redact(serialize(meta)) : "";
  return `[${ts}] [${level}] ${clean}${metaStr}`;
}

export const logger = {
  info:  (msg: string, meta?: unknown) => console.log(fmt("INFO", msg, meta)),
  warn:  (msg: string, meta?: unknown) => console.warn(fmt("WARN", msg, meta)),
  error: (msg: string, meta?: unknown) => console.error(fmt("ERROR", msg, meta)),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") console.debug(fmt("DEBUG", msg, meta));
  },
};

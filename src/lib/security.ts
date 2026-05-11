/**
 * Módulo de segurança da plataforma
 * Rate limiting, validações, e proteções gerais
 */

import { NextRequest } from "next/server";

// Armazenar tentativas de requisição em memória (em produção usar Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiting simples (verificar de 5 em 5 min)
 * @param identifier - IP ou user ID para rastrear
 * @param maxRequests - Máximo de requisições permitidas
 * @param windowMs - Janela de tempo em ms (default: 5 min)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 5 * 60 * 1000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now >= record.resetAt) {
    // Nova janela
    requestCounts.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetAt - now };
}

/**
 * Extrai IP do cliente (considerando proxies)
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0].trim() || real || "unknown";
}

/**
 * Valida se email parece ser válido (básico)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida formato de telefone brasileiro
 */
export function isValidBRPhone(phone: string): boolean {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, "");
  
  // Formato esperado: 11 dígitos (para celular) ou 10 (para fixo)
  // Com DDD: 11 ou 10 dígitos
  return cleaned.length === 11 || cleaned.length === 10;
}

/**
 * Valida força de senha
 */
export function isStrongPassword(password: string): {
  isStrong: boolean;
  feedback: string[];
} {
  const feedback: string[] = [];

  if (password.length < 8) {
    feedback.push("Mínimo 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push("Incluir letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    feedback.push("Incluir letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    feedback.push("Incluir número");
  }
  if (!/[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?]/.test(password)) {
    feedback.push("Incluir caractere especial");
  }

  return {
    isStrong: feedback.length === 0,
    feedback,
  };
}

/**
 * Sanitiza string para evitar XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < e >
    .trim()
    .substring(0, 500); // Limita tamanho
}

/**
 * Gera um token aleatório seguro
 */
export function generateSecureToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const array = new Uint8Array(length);
  
  if (typeof window === "undefined" && global.crypto) {
    // Node.js
    global.crypto.getRandomValues(array);
  } else if (typeof window !== "undefined" && window.crypto) {
    // Browser
    window.crypto.getRandomValues(array);
  } else {
    // Fallback (não ideal, mas funciona)
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }

  return token;
}

/**
 * Valida CPF (básico - apenas formato)
 * Para validação completa, integrar com serviço externo
 */
export function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, "");

  // Deve ter 11 dígitos
  if (cleaned.length !== 11) return false;

  // Não pode ser sequência repetida
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validação de checksum (simplificado)
  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

/**
 * Mascara CPF para exibição (111.111.111-11)
 */
export function maskCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9)}`;
}

/**
 * Verifica se array de strings tem valores únicos e válidas
 */
export function isValidStringArray(arr: unknown): arr is string[] {
  return (
    Array.isArray(arr) &&
    arr.every((item) => typeof item === "string" && item.length > 0) &&
    new Set(arr).size === arr.length
  );
}

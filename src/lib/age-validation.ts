/**
 * Módulo de validação de maioridade
 * Conforme Lei Geral de Proteção de Dados (LGPD) - Lei 13.709/2018
 * Art. 14: Coleta de dados de menores de 18 anos requer consentimento dos pais/responsáveis
 * 
 * Esta plataforma é para maiores de 18 anos apenas
 */

const MIN_AGE = 18;

function parseIsoBirthDate(birthDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(Date.UTC(year, month - 1, day));

  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return null;
  }

  return birth;
}

/**
 * Valida se o usuário é maior de idade baseado na data de nascimento
 * @param birthDate - Data de nascimento em formato ISO (YYYY-MM-DD)
 * @returns {boolean} true se é maior de 18, false caso contrário
 */
export function isAgeOfMajority(birthDate: string): boolean {
  try {
    const birth = parseIsoBirthDate(birthDate);
    const today = new Date();
    
    // Validar se é uma data válida
    if (!birth) {
      return false;
    }

    // Calcular idade
    let age = today.getFullYear() - birth.getUTCFullYear();
    const monthDiff = today.getMonth() - birth.getUTCMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
      age--;
    }

    return age >= MIN_AGE;
  } catch {
    return false;
  }
}

/**
 * Valida se a data de nascimento está em um intervalo razoável
 * (não permite datas futuras ou muito antigas)
 * @param birthDate - Data de nascimento em formato ISO
 * @returns {boolean} true se a data é válida
 */
export function isValidBirthDate(birthDate: string): boolean {
  try {
    const birth = parseIsoBirthDate(birthDate);
    const today = new Date();

    if (!birth) {
      return false;
    }
    
    // Não permite data no futuro
    if (birth > today) {
      return false;
    }

    // Não permite datas anteriores a 1900 (pessoa teria mais de 120 anos)
    const minYear = 1900;
    if (birth.getUTCFullYear() < minYear) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Formata data no padrão brasileiro (DD/MM/YYYY)
 * @param date - Data em formato ISO ou objeto Date
 * @returns {string} Data formatada
 */
export function formatBRDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Obtém a data mínima de nascimento para maioridade
 * Útil para validação em inputs date
 * @returns {string} Data em formato YYYY-MM-DD
 */
export function getMaxBirthDate(): string {
  const today = new Date();
  const maxDate = new Date(
    today.getFullYear() - MIN_AGE,
    today.getMonth(),
    today.getDate()
  );
  
  const year = maxDate.getFullYear();
  const month = String(maxDate.getMonth() + 1).padStart(2, "0");
  const day = String(maxDate.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

/**
 * Validação completa de entrada de data de nascimento
 * @returns {object} { isValid, isOfAge, errors }
 */
export function validateBirthDate(birthDate: string): {
  isValid: boolean;
  isOfAge: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!birthDate) {
    errors.push("Data de nascimento é obrigatória");
    return { isValid: false, isOfAge: false, errors };
  }

  if (!isValidBirthDate(birthDate)) {
    errors.push("Data de nascimento inválida");
    return { isValid: false, isOfAge: false, errors };
  }

  const isOfAge = isAgeOfMajority(birthDate);
  if (!isOfAge) {
    errors.push("Você deve ter pelo menos 18 anos para usar esta plataforma");
    return { isValid: true, isOfAge: false, errors };
  }

  return { isValid: true, isOfAge: true, errors: [] };
}

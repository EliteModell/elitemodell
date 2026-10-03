export const AGE_DECLARATION_COOKIE = "elite_modell_age_declaration";
export const AGE_DECLARATION_VALUE = "confirmed";
export const AGE_DECLARATION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function hasConfirmedAgeDeclaration(cookies: CookieReader) {
  return cookies.get(AGE_DECLARATION_COOKIE)?.value === AGE_DECLARATION_VALUE;
}

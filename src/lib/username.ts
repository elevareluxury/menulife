// Reglas del username (la dirección mycen.id/<username>), sin dependencias: las usan Studio, el onboarding, la landing
// y la página pública. Igual que check_username en la base: 3 a 30 caracteres, letras, números y guiones (no al
// principio, al final ni dos seguidos).

export const USERNAME_FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/

export function normalizeUsername(raw: string): string {
  return raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, 30)
}

export function validUsername(value: string): boolean {
  return USERNAME_FORMAT.test(value) && !value.includes('--')
}

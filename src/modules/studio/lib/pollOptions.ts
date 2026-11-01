/** Id corto y estable para una opción de encuesta ([a-z0-9]{1,16}, lo valida la base) */
export function newOptionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
}

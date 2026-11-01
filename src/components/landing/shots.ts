// Capturas de ejemplo de la landing (estructuras y "Mi día"), generadas con scripts/landing-shots. Las imágenes se
// guardan en caché por un año con su nombre: al regenerarlas, subir la versión (carpeta nueva) para que se vean.
export const LANDING_SHOTS_VERSION = 'v2'
export const shot = (name: string) => `/landing/${LANDING_SHOTS_VERSION}/${name}.webp`

// Prueba de carga del perfil público (k6: https://k6.io). NO corre en CI ni sola: la corre el dueño a propósito,
// contra la web publicada o un preview, avisando antes (Supabase y Vercel ven tráfico real).
//
//   k6 run -e BASE=https://mycen.id -e HANDLE=tu-usuario scripts/load/profile-load.js
//
// Simula un perfil viral: sube hasta ~500 visitas por segundo durante 5 minutos. Cada "visita" pide el perfil a la
// CDN (/api/profile, lo mismo que hace la página sin sesión). Lo que importa mirar al final:
//   - http_req_failed < 1 % y p(95) de http_req_duration < 800 ms (umbrales de abajo);
//   - en Supabase → Reports: la base casi no debería subir (la CDN contesta casi todo);
//   - en Vercel → Observability: casi todo "HIT" en la caché.
// Docs: docs/lanzamiento/prueba-de-carga.md
import http from 'k6/http'
import { check } from 'k6'

const BASE = __ENV.BASE || 'https://mycen.id'
const HANDLE = __ENV.HANDLE || 'mycen'

export const options = {
  scenarios: {
    viral: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1500,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '2m', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
}

export default function () {
  const res = http.get(`${BASE}/api/profile?h=${encodeURIComponent(HANDLE)}`, { tags: { name: 'profile' } })
  check(res, {
    '200': r => r.status === 200,
    'es JSON': r => (r.headers['Content-Type'] || '').includes('application/json'),
  })
}

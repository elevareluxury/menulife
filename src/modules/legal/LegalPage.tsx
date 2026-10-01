import { Link } from 'react-router-dom'

type Doc = 'terms' | 'privacy'

const UPDATED = 'octubre de 2026'

export function LegalPage({ doc }: { doc: Doc }) {
  return (
    <main style={{ minHeight: '100svh', background: '#111311', color: '#F1F0E9', fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 64px', lineHeight: 1.65, fontSize: 15.5 }}>
        <Link to="/" style={{ color: '#F1F0E9', fontWeight: 700, textDecoration: 'none', fontSize: 18 }}>mycen.</Link>
        {doc === 'terms' ? <Terms /> : <Privacy />}
        <p style={{ color: '#B9B9AE', fontSize: 13, marginTop: 40 }}>
          Última actualización: {UPDATED}. ·{' '}
          <Link to={doc === 'terms' ? '/privacidad' : '/terminos'} style={{ color: '#F1F0E9' }}>
            {doc === 'terms' ? 'Política de privacidad' : 'Términos y condiciones'}
          </Link>
        </p>
      </div>
    </main>
  )
}

const h1: React.CSSProperties = { fontSize: 30, letterSpacing: '-0.02em', margin: '28px 0 8px' }
const h2: React.CSSProperties = { fontSize: 18, margin: '28px 0 6px' }
const muted: React.CSSProperties = { color: '#B9B9AE' }

function Terms() {
  return (
    <>
      <h1 style={h1}>Términos y condiciones</h1>
      <p style={muted}>Al crear una cuenta en Mycen aceptás estas condiciones.</p>

      <h2 style={h2}>Qué es Mycen</h2>
      <p>Mycen te permite crear una identidad digital pública (Mycen Profile), administrarla desde Mycen Studio, organizar tu vida personal en Life OS y, si tenés un negocio, gestionarlo con Mycen Business.</p>

      <h2 style={h2}>Tu cuenta</h2>
      <p>Sos responsable de mantener segura tu contraseña y de la actividad de tu cuenta. Los datos que cargues tienen que ser verdaderos y te tienen que pertenecer o tenés que tener permiso para usarlos.</p>

      <h2 style={h2}>Tu contenido</h2>
      <p>Lo que publicás en tu perfil sigue siendo tuyo. Nos das permiso para mostrarlo en tu dirección pública mientras tu perfil esté publicado. Podés editarlo, ocultarlo, despublicarlo o eliminarlo cuando quieras.</p>
      <p>No está permitido publicar contenido ilegal, engañoso, que infrinja derechos de terceros, links maliciosos ni reseñas falsas. Podemos ocultar contenido o suspender cuentas que no cumplan estas reglas.</p>

      <h2 style={h2}>Nombres de usuario</h2>
      <p>Algunos nombres están reservados por el sistema. Si cambiás tu username, la dirección anterior redirige a la nueva para que tus links y QR sigan funcionando.</p>

      <h2 style={h2}>Disponibilidad</h2>
      <p>Trabajamos para que el servicio funcione siempre, pero puede haber interrupciones o cambios. Las funciones pueden evolucionar con el tiempo.</p>

      <h2 style={h2}>Baja</h2>
      <p>Podés eliminar tu cuenta desde Studio → Ajustes. Las cuentas con un negocio activo en Mycen Business se dan de baja a través de soporte, porque involucran datos de clientes y ventas.</p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <h1 style={h1}>Política de privacidad</h1>
      <p style={muted}>Qué datos usamos, para qué y qué control tenés.</p>

      <h2 style={h2}>Datos de tu cuenta</h2>
      <p>Tu nombre, email y contraseña (guardada de forma cifrada) para que puedas iniciar sesión. No se muestran en tu perfil público.</p>

      <h2 style={h2}>Tu perfil público</h2>
      <p>Solo se publica lo que cargás en tu perfil y decidís mostrar. Cargar un dato en Studio no lo hace público: los módulos ocultos y los borradores no se ven. La tarjeta "Guardar contacto" incluye únicamente los datos que escribas en ella.</p>

      <h2 style={h2}>Estadísticas de visitas</h2>
      <p>Para mostrarte cuántas visitas y clicks recibe tu perfil, registramos eventos anónimos. No guardamos direcciones IP ni datos del dispositivo: usamos un identificador que cambia todos los días y no permite saber quién visitó. No contamos bots ni tus propias visitas.</p>

      <h2 style={h2}>Life OS</h2>
      <p>Tus metas, hábitos, tareas, finanzas y notas son privados: solo vos podés verlos.</p>

      <h2 style={h2}>Tus derechos</h2>
      <p>Desde Studio podés editar, ocultar y despublicar tu información, descargar una copia de tus datos (Ajustes → Descargar mis datos) y eliminar tu cuenta.</p>

      <h2 style={h2}>Proveedores</h2>
      <p>Mycen se aloja en servicios de infraestructura de terceros (base de datos, almacenamiento y hosting) que procesan los datos solo para prestar el servicio.</p>
    </>
  )
}

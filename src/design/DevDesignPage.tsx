// Muestra del sistema de diseño en los dos temas y los cuatro acentos. Sólo existe en desarrollo (/dev/design):
// App.tsx la importa detrás de import.meta.env.DEV, así que no entra en el build de producción. Textos fijos en
// español a propósito: es una herramienta interna, no una pantalla para usuarios.
import { useState } from 'react'
import { Chip, Field, GlassPanel, IconButton, MYCEN_ACCENTS, MYCEN_THEMES, PrimaryAction, Sheet, StatusChip } from '@/design'
import type { MycenAccent, MycenTheme } from '@/design'

function Sample({ theme, accent }: { theme: MycenTheme; accent: MycenAccent }) {
  const [open, setOpen] = useState(false)
  return (
    <section data-mycen-theme={theme} data-mycen-accent={accent} className="my-sky"
      style={{ padding: 20, borderRadius: 'var(--my-r-card)', display: 'grid', gap: 14 }}>
      <p style={{ margin: 0, font: '500 var(--my-fs-meta)/1 var(--my-font-ui)', color: 'var(--my-subtle)' }}>{theme} · {accent}</p>
      <GlassPanel variant="hero" className="my-float my-float-1" style={{ padding: 20 }}>
        <h2 style={{ margin: 0, font: '700 var(--my-fs-name)/var(--my-lh-title) var(--my-font-display)' }}>Ana Pérez</h2>
        <p style={{ margin: '6px 0 12px', color: 'var(--my-muted)' }}>Fotógrafa en Buenos Aires</p>
        <StatusChip>Disponible para proyectos</StatusChip>
      </GlassPanel>
      <PrimaryAction href="#contacto">Escribime por WhatsApp</PrimaryAction>
      <GlassPanel style={{ padding: 16, display: 'grid', gap: 12 }} className="my-float my-float-2">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip>Etiqueta</Chip>
          <Chip onClick={() => setOpen(true)}>Abrir hoja</Chip>
          <IconButton label="Compartir">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5" /></svg>
          </IconButton>
        </div>
        <Field label="Tu nombre" placeholder="Cómo te llamás" hint="Lo ve sólo la persona que recibe el mensaje." />
        <Field label="Mensaje" multiline error="Escribí al menos una palabra." />
        <p style={{ margin: 0, fontSize: 'var(--my-fs-small)', color: 'var(--my-muted)' }}>Texto secundario sobre vidrio.</p>
        <p style={{ margin: 0, fontSize: 'var(--my-fs-meta)', color: 'var(--my-subtle)' }}>Metadatos pequeños.</p>
      </GlassPanel>
      <Sheet open={open} onClose={() => setOpen(false)} title="Hoja de ejemplo" closeLabel="Cerrar">
        <p style={{ marginTop: 0, color: 'var(--my-muted)' }}>En el celular sube desde abajo; en la computadora es un diálogo.</p>
        <PrimaryAction onClick={() => setOpen(false)}>Listo</PrimaryAction>
      </Sheet>
    </section>
  )
}

export default function DevDesignPage() {
  return (
    <main style={{ padding: 16, background: '#000', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', fontFamily: 'Unbounded, sans-serif', fontWeight: 700 }}>Sistema de diseño Mycen</h1>
      {MYCEN_THEMES.map(theme => (
        <div key={theme} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: 24 }}>
          {MYCEN_ACCENTS.map(accent => <Sample key={accent} theme={theme} accent={accent} />)}
        </div>
      ))}
    </main>
  )
}

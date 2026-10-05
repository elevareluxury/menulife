import type { HubC } from '../lib/themeConfig'

interface FooterViralProps {
  slug: string
  C: HubC
}

export function FooterViral({ slug, C }: FooterViralProps) {
  const refUrl = `/?ref=hub&from=${encodeURIComponent(slug)}`

  return (
    <footer
      style={{
        margin: '40px 20px 0',
        padding: '24px 0',
        textAlign: 'center',
        borderTop: `1px solid ${C.bdr}`,
      }}
    >
      <a
        href={refUrl}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none',
          fontSize: '12px',
          color: C.t3,
          transition: 'color 0.2s',
          fontFamily: "'DM Mono',monospace",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = C.acc }}
        onMouseLeave={e => { e.currentTarget.style.color = C.t3 }}
      >
        <span>Creado con</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" />
          <path d="M2 17L12 22L22 17" opacity="0.6" />
          <path d="M2 12L12 17L22 12" opacity="0.8" />
        </svg>
        <span style={{ fontWeight: 600 }}>Mycen</span>
      </a>
    </footer>
  )
}

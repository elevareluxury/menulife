import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  const COLS = [
    {
      title: t('footer.col_product'),
      links: [t('footer.col_product_l1'), t('footer.col_product_l2'), t('footer.col_product_l3'), t('footer.col_product_l4')],
    },
    {
      title: t('footer.col_company'),
      links: [t('footer.col_company_l1'), t('footer.col_company_l2'), t('footer.col_company_l3'), t('footer.col_company_l4')],
    },
  ]

  return (
    <footer style={{
      background: '#0a0c10',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      padding: '64px 24px 32px',
      fontFamily: 'var(--font-jakarta)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
          gap: '40px', marginBottom: '56px',
        }}>
          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
              <div style={{
                width: '32px', height: '32px',
                background: 'var(--ml-salmon)', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '16px',
              }}>M</div>
              <span style={{ color: '#fff', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '18px' }}>MenuLife</span>
            </Link>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, maxWidth: '220px', fontWeight: 300 }}>
              {t('footer.tagline')}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <SocialLink href="#" label="Instagram">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </SocialLink>
              <SocialLink href="#" label="LinkedIn">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </SocialLink>
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <h4 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '13px', color: '#fff', marginBottom: '16px', letterSpacing: '0.05em' }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                    >{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* CTA col */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '13px', color: '#fff', marginBottom: '16px' }}>
              {t('footer.cta_title')}
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '16px', fontWeight: 300 }}>
              {t('footer.cta_sub')}
            </p>
            <Link to="/solicitar-acceso" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '10px 20px', borderRadius: '50px', border: 'none',
                background: 'var(--ml-salmon)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-jakarta)', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(244,112,90,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >{t('footer.cta_button')}</button>
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '24px',
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'space-between', alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{t('footer.copyright')}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{t('footer.made')}</span>
        </div>
      </div>
    </footer>
  )
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} style={{
      width: '34px', height: '34px', borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ml-salmon)'; e.currentTarget.style.color = 'var(--ml-salmon)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
    >{children}</a>
  )
}

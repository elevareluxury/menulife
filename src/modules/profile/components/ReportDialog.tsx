import { lazy, Suspense, useRef, useState } from 'react'
import { ui } from '../lib/profileI18n'
import type { ProfileLang } from '../lib/profileTypes'

const ReportDialog = lazy(() => import('./ReportDialogPanel'))

/** "Denunciar" (Identity Fase 8): botón discreto + diálogo con motivo y detalle. Sin cuenta. */
export function ReportButton({ username, projectSlug, lang }: { username: string; projectSlug?: string; lang: ProfileLang }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const t = ui(lang)
  return (
    <>
      <button ref={trigger} type="button" className="mp-report-link" onClick={() => setOpen(true)}>{t.report}</button>
      {open && (
        <Suspense fallback={null}>
          <ReportDialog username={username} projectSlug={projectSlug} lang={lang}
            onClose={() => { setOpen(false); trigger.current?.focus() }} />
        </Suspense>
      )}
    </>
  )
}


import toast from 'react-hot-toast'
import { lifeT } from '@/i18n/app/life'

/**
 * Borrado con "Deshacer": el ítem ya se ocultó en pantalla; si en 5 s no se
 * deshace, se borra de verdad. Si el borrado falla, vuelve a aparecer.
 */
export function deleteWithUndo({ message, commit, restore, ms = 5000 }: {
  message: string
  commit: () => Promise<void>
  restore: () => void
  ms?: number
}) {
  const t = lifeT()
  let undone = false
  const id = toast.custom(toastItem => (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 16px', borderRadius: 16,
      background: '#1E2330', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      color: '#F5F7FA', fontFamily: 'var(--font-jakarta)', fontSize: 14, maxWidth: 360,
      opacity: toastItem.visible ? 1 : 0, transition: 'opacity .2s',
    }}>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message}</span>
      <button type="button" onClick={() => { undone = true; toast.dismiss(toastItem.id); restore() }}
        style={{ minHeight: 36, padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'rgba(244,112,90,0.16)', color: '#F4705A', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
        {t.undo.undo}
      </button>
    </div>
  ), { duration: ms, position: 'bottom-center' })
  window.setTimeout(() => {
    if (undone) return
    toast.dismiss(id)
    commit().catch(() => { restore(); toast.error(t.undo.error) })
  }, ms)
}

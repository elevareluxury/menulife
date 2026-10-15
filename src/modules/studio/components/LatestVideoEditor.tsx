import { useState } from 'react'
import { useStudioT } from '@/i18n/app/studio'
import { channelQuery, inspectChannelUrl } from '@/modules/profile/lib/latestVideo'
import { loadLatestVideos } from '@/modules/profile/lib/latestVideoClient'
import { Button, SelectField, TextField, Toggle } from './ui'
import type { ExtraEditorProps } from './moduleExtraEditors'

/** Estado del editor de "Último video" (se guarda en content: url, channel_id o handle, show_title y count) */
export interface LatestVideoValue {
  url: string
  showTitle: boolean
  count: 1 | 3
}

type Test = { query: string; text: string; ok: boolean } | null

/**
 * Link del canal (validado en el dispositivo con las mismas reglas que el servidor), opciones y "Probar": consulta
 * `/api/youtube-latest` (la función de Mycen, no YouTube) y muestra el título del último video.
 */
export function LatestVideoEditor({ value, onChange }: ExtraEditorProps<LatestVideoValue>) {
  const t = useStudioT().latestVideo
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<Test>(null)
  const result = inspectChannelUrl(value.url)
  const ref = 'ref' in result ? result.ref : null
  const error = value.url.trim() && 'error' in result ? t.errors[result.error] : null
  const query = ref ? channelQuery(ref) : null

  async function runTest() {
    if (!query) return
    setTesting(true)
    const r = await loadLatestVideos(query)
    setTesting(false)
    const first = r?.videos[0]
    setTest({ query, ok: !!first, text: !r ? t.testError : first ? t.testOk.replace('{title}', first.title || first.id) : t.testEmpty })
  }

  return (
    <div className="st-stack" style={{ gap: 12 }}>
      <TextField label={t.url} type="url" value={value.url} placeholder="https://www.youtube.com/@…" required help={t.help}
        error={error} onChange={url => onChange({ ...value, url })} />
      {ref && (
        <div className="st-stack" style={{ gap: 8 }}>
          <p className="st-help" style={{ margin: 0 }}>
            {t.detected.replace('{channel}', 'handle' in ref ? ref.handle : ref.channel_id)}
          </p>
          <div>
            <Button size="sm" onClick={runTest} loading={testing}>{t.test}</Button>
          </div>
          {test && test.query === query && (
            <p className={test.ok ? 'st-help' : 'st-error'} role="status" style={{ margin: 0 }}>{test.text}</p>
          )}
        </div>
      )}
      <Toggle label={t.showTitle} checked={value.showTitle} onChange={showTitle => onChange({ ...value, showTitle })} />
      <SelectField label={t.count} value={String(value.count)} required
        options={[{ value: '1', label: t.countOne }, { value: '3', label: t.countThree }]}
        onChange={v => onChange({ ...value, count: v === '3' ? 3 : 1 })} />
      <p className="st-help" style={{ margin: 0 }}>{t.privacy}</p>
    </div>
  )
}

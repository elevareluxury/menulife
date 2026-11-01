import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { profileLook } from '@/modules/profile/lib/profileLook'
import { useStudio } from '../StudioContext'
import { moduleDef } from '../lib/moduleCatalog'
import { MODULE_ICONS } from '../lib/moduleUi'
import { addableTypes, addTemplateModules } from '../lib/applyTemplate'
import { friendlyError } from '../lib/studioApi'
import { TEMPLATE_LIST, templateModulesToAdd, type IdentityTemplate } from '../lib/templates'
import { Button, Drawer, Toggle } from './ui'
import { useStudioT } from '@/i18n/app/studio'

const accentName = (a: string) => a[0].toUpperCase() + a.slice(1)

/** Íconos y nombres de una lista de tipos (vista previa de la plantilla). `inline`: dentro de un botón (sin lista) */
function ModuleChips({ types, inline = false }: { types: IdentityTemplate['modules']; inline?: boolean }) {
  const t = useStudioT()
  const chips = types.map(type => {
    const Icon = MODULE_ICONS[type]
    const Tag = inline ? 'span' : 'li'
    return <Tag key={type} className="st-template-chip"><Icon size={14} aria-hidden="true" /> {moduleDef(type, t).label}</Tag>
  })
  return inline
    ? <span className="st-template-modules">{chips}</span>
    : <ul className="st-template-modules">{chips}</ul>
}

/**
 * "Usar una plantilla" (Studio → Módulos): agrega al Space los módulos que falten, vacíos y ocultos ("Completá esto").
 * Nunca borra; estructura y acento sólo si se elige "Usar también su estructura y su acento".
 */
export function TemplatePicker({ onClose, onAdded }: { onClose: () => void; onAdded: (count: number) => void }) {
  const { profile, modules, setModules, patchProfile } = useStudio()
  const t = useStudioT()
  const x = t.templates
  const [chosen, setChosen] = useState<IdentityTemplate | null>(null)
  const [applyLook, setApplyLook] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const allowed = addableTypes(t)
  const lookText = (tpl: IdentityTemplate) => x.look(t.look.layouts[tpl.layout].name, accentName(tpl.accent))

  async function apply(tpl: IdentityTemplate) {
    setBusy(true); setError(null)
    try {
      const added = await addTemplateModules(profile.id, tpl, modules, t)
      if (added.length) setModules(prev => [...prev, ...added])
      if (applyLook) {
        const look = profileLook(profile.theme)
        patchProfile({ theme: { ...profile.theme, layout: tpl.layout, mode: look.mode, accent: tpl.accent } })
      }
      onAdded(added.length)
    } catch (e) {
      setError(friendlyError(e))
      setBusy(false)
    }
  }

  if (!chosen) {
    return (
      <Drawer title={x.title} onClose={onClose}>
        <p className="st-help" style={{ marginTop: 0 }}>{x.intro}</p>
        {(['profile', 'industry'] as const).map(group => (
          <section key={group} aria-label={x.groups[group]}>
            <h3 className="st-card-title">{x.groups[group]}</h3>
            <div className="st-library st-template-list">
              {TEMPLATE_LIST.filter(tpl => tpl.group === group).map(tpl => (
                <button key={tpl.id} type="button" onClick={() => { setChosen(tpl); setApplyLook(false) }}
                  aria-label={x.choose(x.items[tpl.id].name)}>
                  <span>
                    <strong>{x.items[tpl.id].name}</strong>
                    <span>{x.items[tpl.id].description}</span>
                    <ModuleChips inline types={tpl.modules.filter(allowed)} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </Drawer>
    )
  }

  const toAdd = templateModulesToAdd(chosen, modules, allowed)
  const skipped = chosen.modules.filter(type => allowed(type) && !toAdd.includes(type))
  return (
    <Drawer title={x.items[chosen.id].name} onClose={onClose} footer={<>
      <Button variant="ghost" onClick={() => setChosen(null)} disabled={busy}>
        <ArrowLeft size={16} aria-hidden="true" className="flip-rtl" /> {x.back}
      </Button>
      <Button variant="primary" loading={busy} disabled={!toAdd.length && !applyLook} onClick={() => { void apply(chosen) }}>
        {toAdd.length ? x.add(toAdd.length) : t.common.save}
      </Button>
    </>}>
      <div className="st-stack">
        <p className="st-help" style={{ margin: 0 }}>{x.items[chosen.id].description}</p>
        {toAdd.length ? (
          <section aria-label={x.willAdd}>
            <h3 className="st-card-title">{x.willAdd}</h3>
            <ModuleChips types={toAdd} />
          </section>
        ) : <p className="st-help" style={{ margin: 0 }}>{x.nothingToAdd}</p>}
        {skipped.length > 0 && (
          <section aria-label={x.alreadyHave}>
            <h3 className="st-card-title">{x.alreadyHave}</h3>
            <ModuleChips types={skipped} />
          </section>
        )}
        <p className="st-help" style={{ margin: 0 }}>{x.intro}</p>
        <Toggle checked={applyLook} onChange={setApplyLook} label={x.applyLook}
          description={`${lookText(chosen)}. ${x.applyLookHelp}`} />
        {error && <p className="st-error" role="alert">{error}</p>}
      </div>
    </Drawer>
  )
}

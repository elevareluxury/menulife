import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { buildCatalog, libraryGroups } from '../lib/moduleCatalog'
import { MODULE_ICONS } from '../lib/moduleUi'
import { Drawer } from './ui'
import { useStudioT } from '@/i18n/app/studio'

/** Biblioteca para agregar un módulo nuevo, por grupos (como "Usar una plantilla") */
export function ModuleLibrary({ onPick, onClose }: { onPick: (type: ModuleType) => void; onClose: () => void }) {
  const t = useStudioT()
  return (
    <Drawer title={t.modules.library} onClose={onClose}>
      {libraryGroups(buildCatalog(t)).map(group => (
        <section key={group.id} className="st-template-group" aria-labelledby={`st-library-${group.id}`}>
          <h3 id={`st-library-${group.id}`} className="st-card-title st-template-group-title">{t.modules.libraryGroups[group.id]}</h3>
          <div className="st-library">
            {group.defs.map(d => {
              const Icon = MODULE_ICONS[d.type]
              return (
                <button key={d.type} type="button" onClick={() => onPick(d.type)}>
                  <span className="st-module-icon" aria-hidden="true"><Icon size={17} /></span>
                  <span><strong>{d.label}</strong><span>{d.description}</span></span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </Drawer>
  )
}

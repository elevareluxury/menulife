import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { buildCatalog } from '../lib/moduleCatalog'
import { MODULE_ICONS } from '../lib/moduleUi'
import { Drawer } from './ui'
import { useStudioT } from '@/i18n/app/studio'

/** Biblioteca para agregar un módulo nuevo */
export function ModuleLibrary({ onPick, onClose }: { onPick: (type: ModuleType) => void; onClose: () => void }) {
  const t = useStudioT()
  return (
    <Drawer title={t.modules.library} onClose={onClose}>
      <div className="st-library">
        {buildCatalog(t).filter(d => d.addable).map(d => {
          const Icon = MODULE_ICONS[d.type]
          return (
            <button key={d.type} type="button" onClick={() => onPick(d.type)}>
              <span className="st-module-icon" aria-hidden="true"><Icon size={17} /></span>
              <span><strong>{d.label}</strong><span>{d.description}</span></span>
            </button>
          )
        })}
      </div>
    </Drawer>
  )
}

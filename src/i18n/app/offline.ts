// Aviso general de conexión (toda la app, también la página pública). Un solo archivo con los 12 idiomas.
import { useAppLang } from './store'
import type { AppLang } from './languages'

export interface OfflineDict {
  offline: string
  back: string
}

export const OFFLINE: Record<AppLang, OfflineDict> = {
  es: { offline: 'Sin conexión. Lo que hagas se guarda cuando vuelva.', back: 'Volvió la conexión' },
  en: { offline: 'You’re offline. Your changes will save when you’re back online.', back: 'You’re back online' },
  pt: { offline: 'Sem conexão. O que você fizer será salvo quando ela voltar.', back: 'A conexão voltou' },
  fr: { offline: 'Hors connexion. Vos modifications seront enregistrées au retour du réseau.', back: 'Connexion rétablie' },
  de: { offline: 'Keine Verbindung. Deine Änderungen werden gespeichert, sobald du wieder online bist.', back: 'Wieder online' },
  it: { offline: 'Sei offline. Le modifiche verranno salvate quando torna la connessione.', back: 'Connessione ripristinata' },
  zh: { offline: '网络已断开。恢复连接后会保存你的更改。', back: '网络已恢复' },
  ja: { offline: 'オフラインです。接続が戻ると変更が保存されます。', back: 'オンラインに戻りました' },
  ko: { offline: '오프라인 상태예요. 연결되면 변경 사항이 저장돼요.', back: '다시 연결됐어요' },
  hi: { offline: 'आप ऑफ़लाइन हैं। कनेक्शन लौटने पर आपके बदलाव सेव हो जाएँगे।', back: 'कनेक्शन वापस आ गया' },
  ar: { offline: 'لا يوجد اتصال. ستُحفظ تغييراتك عند عودة الاتصال.', back: 'عاد الاتصال' },
  ru: { offline: 'Нет подключения. Изменения сохранятся, когда связь вернётся.', back: 'Подключение восстановлено' },
}

export function useOfflineT(): OfflineDict {
  return OFFLINE[useAppLang(s => s.lang)] ?? OFFLINE.es
}

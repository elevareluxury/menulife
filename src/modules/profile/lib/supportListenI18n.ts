// Textos de los módulos "Apoyame" (support) y "Escuchá en" (listen_on). Aparte de profileI18n, como los del
// formulario de contacto: sólo los baja un perfil que usa alguno de los dos (cada módulo va en su propio chunk).
import type { ProfileLang } from './profileTypes'

export interface SupportListenStrings {
  supportTitle: string
  /** Nombre de la fila de alias cuando la persona no le puso texto */
  supportAlias: string
  supportPix: string
  /** Delante de los montos sugeridos */
  suggested: string
  copy: string
  /** Nombre accesible del botón de copiar ({label} = "Alias, CVU o CBU", "Clave Pix" o el texto propio) */
  copyAria: string
  copied: string
  copyFailed: string
  supportNote: string
  /** {platform} = Spotify, Apple Music… (no se traduce) */
  listenOn: string
}

const STRINGS: Record<ProfileLang, SupportListenStrings> = {
  es: {
    supportTitle: 'Apoyame', supportAlias: 'Alias, CVU o CBU', supportPix: 'Clave Pix', suggested: 'Sugerido',
    copy: 'Copiar', copyAria: 'Copiar {label}', copied: 'Copiado', copyFailed: 'No se pudo copiar. Seleccioná el texto y copialo a mano.',
    supportNote: 'Pagás directo en cada plataforma. Mycen no cobra ni procesa pagos.',
    listenOn: 'Escuchá en {platform}',
  },
  en: {
    supportTitle: 'Support me', supportAlias: 'Bank alias', supportPix: 'Pix key', suggested: 'Suggested',
    copy: 'Copy', copyAria: 'Copy {label}', copied: 'Copied', copyFailed: 'Couldn’t copy. Select the text and copy it manually.',
    supportNote: 'You pay directly on each platform. Mycen doesn’t charge or process payments.',
    listenOn: 'Listen on {platform}',
  },
  pt: {
    supportTitle: 'Me apoie', supportAlias: 'Alias bancário', supportPix: 'Chave Pix', suggested: 'Sugerido',
    copy: 'Copiar', copyAria: 'Copiar {label}', copied: 'Copiado', copyFailed: 'Não foi possível copiar. Selecione o texto e copie manualmente.',
    supportNote: 'Você paga direto em cada plataforma. A Mycen não cobra nem processa pagamentos.',
    listenOn: 'Ouça no {platform}',
  },
  fr: {
    supportTitle: 'Me soutenir', supportAlias: 'Alias bancaire', supportPix: 'Clé Pix', suggested: 'Suggéré',
    copy: 'Copier', copyAria: 'Copier {label}', copied: 'Copié', copyFailed: 'Impossible de copier. Sélectionnez le texte et copiez-le à la main.',
    supportNote: 'Vous payez directement sur chaque plateforme. Mycen ne facture ni ne traite aucun paiement.',
    listenOn: 'Écouter sur {platform}',
  },
  de: {
    supportTitle: 'Unterstütze mich', supportAlias: 'Bank-Alias', supportPix: 'Pix-Schlüssel', suggested: 'Vorschlag',
    copy: 'Kopieren', copyAria: '{label} kopieren', copied: 'Kopiert', copyFailed: 'Kopieren nicht möglich. Markiere den Text und kopiere ihn selbst.',
    supportNote: 'Du zahlst direkt auf der jeweiligen Plattform. Mycen berechnet und verarbeitet keine Zahlungen.',
    listenOn: 'Auf {platform} hören',
  },
  it: {
    supportTitle: 'Sostienimi', supportAlias: 'Alias bancario', supportPix: 'Chiave Pix', suggested: 'Suggerito',
    copy: 'Copia', copyAria: 'Copia {label}', copied: 'Copiato', copyFailed: 'Impossibile copiare. Seleziona il testo e copialo a mano.',
    supportNote: 'Paghi direttamente su ogni piattaforma. Mycen non addebita né elabora pagamenti.',
    listenOn: 'Ascolta su {platform}',
  },
  zh: {
    supportTitle: '支持我', supportAlias: '银行别名', supportPix: 'Pix 密钥', suggested: '建议',
    copy: '复制', copyAria: '复制{label}', copied: '已复制', copyFailed: '无法复制。请选中文字后手动复制。',
    supportNote: '你直接在各平台付款。Mycen 不收费，也不处理付款。',
    listenOn: '在 {platform} 收听',
  },
  ja: {
    supportTitle: '応援する', supportAlias: '銀行エイリアス', supportPix: 'Pix キー', suggested: '目安',
    copy: 'コピー', copyAria: '{label}をコピー', copied: 'コピーしました', copyFailed: 'コピーできませんでした。テキストを選択して手動でコピーしてください。',
    supportNote: '支払いは各サービスで直接行われます。Mycen は料金を受け取らず、決済も扱いません。',
    listenOn: '{platform} で聴く',
  },
  ko: {
    supportTitle: '응원하기', supportAlias: '은행 별칭', supportPix: 'Pix 키', suggested: '추천 금액',
    copy: '복사', copyAria: '{label} 복사', copied: '복사됨', copyFailed: '복사하지 못했어요. 텍스트를 선택해 직접 복사해 주세요.',
    supportNote: '각 플랫폼에서 직접 결제해요. Mycen은 요금을 받거나 결제를 처리하지 않아요.',
    listenOn: '{platform}에서 듣기',
  },
  hi: {
    supportTitle: 'मेरा साथ दें', supportAlias: 'बैंक उपनाम', supportPix: 'Pix कुंजी', suggested: 'सुझाव',
    copy: 'कॉपी करें', copyAria: '{label} कॉपी करें', copied: 'कॉपी हो गया', copyFailed: 'कॉपी नहीं हो सका। टेक्स्ट चुनकर खुद कॉपी करें।',
    supportNote: 'आप हर प्लेटफ़ॉर्म पर सीधे भुगतान करते हैं। Mycen न शुल्क लेता है, न भुगतान संभालता है।',
    listenOn: '{platform} पर सुनें',
  },
  ar: {
    supportTitle: 'ادعمني', supportAlias: 'الاسم المستعار البنكي', supportPix: 'مفتاح Pix', suggested: 'مقترح',
    copy: 'نسخ', copyAria: 'نسخ {label}', copied: 'تم النسخ', copyFailed: 'تعذّر النسخ. حدّد النص وانسخه يدويًا.',
    supportNote: 'تدفع مباشرة على كل منصة. لا تتقاضى Mycen أي رسوم ولا تعالج المدفوعات.',
    listenOn: 'استمع على {platform}',
  },
  ru: {
    supportTitle: 'Поддержать меня', supportAlias: 'Банковский псевдоним', supportPix: 'Ключ Pix', suggested: 'Рекомендуемо',
    copy: 'Копировать', copyAria: 'Копировать: {label}', copied: 'Скопировано', copyFailed: 'Не удалось скопировать. Выделите текст и скопируйте вручную.',
    supportNote: 'Вы платите напрямую на каждой платформе. Mycen не берёт плату и не обрабатывает платежи.',
    listenOn: 'Слушать в {platform}',
  },
}

export function supportListenStrings(lang: ProfileLang): SupportListenStrings {
  return STRINGS[lang] ?? STRINGS.es
}

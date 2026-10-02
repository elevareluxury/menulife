import type { ProfileLang, Translations } from './profileTypes'

/**
 * Texto en el idioma pedido. El contenido original está en el idioma del perfil
 * (default_locale); si hay una traducción guardada para `lang` se usa esa.
 */
export function tr(original: string | null | undefined, translations: Translations | undefined, field: string, lang: ProfileLang): string {
  const value = translations?.[lang]?.[field]
  if (typeof value === 'string' && value.trim()) return value
  return original ?? ''
}

type Days = { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string; sunday: string }

export interface UiStrings {
  openNow: string
  closedNow: string
  share: string
  linkCopied: string
  saveContact: string
  contact: string
  location: string
  howToGet: string
  hours: string
  closed: string
  gallery: string
  reviews: string
  seeOnGoogle: string
  reviewsCount: string
  notFoundTitle: string
  notFoundText: string
  unavailableTitle: string
  unavailableText: string
  errorTitle: string
  errorText: string
  retry: string
  createYours: string
  draftBanner: string
  footer: string
  days: Days
  languageLabel: string
  socials: string
  close: string
  cards: string
  swipeHint: string
  tags: string
}

const UI: Record<ProfileLang, UiStrings> = {
  es: {
    openNow: 'Abierto ahora', closedNow: 'Cerrado ahora', share: 'Compartir', linkCopied: 'Link copiado',
    saveContact: 'Guardar contacto', contact: 'Contacto', location: 'Ubicación', howToGet: 'Cómo llegar',
    hours: 'Horarios', closed: 'Cerrado', gallery: 'Galería', reviews: 'Reseñas', seeOnGoogle: 'Ver en Google',
    reviewsCount: 'reseñas',
    notFoundTitle: 'Este perfil no existe', notFoundText: 'Revisá el link o creá tu propia identidad en Mycen.',
    unavailableTitle: 'Este perfil no está disponible', unavailableText: 'Su dueño todavía no lo publicó o lo pausó por ahora.',
    errorTitle: 'No pudimos cargar el perfil', errorText: 'Revisá tu conexión e intentá de nuevo.',
    retry: 'Reintentar', createYours: 'Creá tu Mycen', draftBanner: 'Vista previa: este perfil todavía no es público.',
    footer: 'Una identidad Mycen',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' },
    languageLabel: 'Idioma', socials: 'Redes sociales', close: 'Cerrar', cards: 'Tarjetas',
    swipeHint: 'deslizá para ver más', tags: 'Categorías',
  },
  en: {
    openNow: 'Open now', closedNow: 'Closed now', share: 'Share', linkCopied: 'Link copied',
    saveContact: 'Save contact', contact: 'Contact', location: 'Location', howToGet: 'Get directions',
    hours: 'Hours', closed: 'Closed', gallery: 'Gallery', reviews: 'Reviews', seeOnGoogle: 'See on Google',
    reviewsCount: 'reviews',
    notFoundTitle: 'This profile does not exist', notFoundText: 'Check the link or create your own identity on Mycen.',
    unavailableTitle: 'This profile is not available', unavailableText: 'Its owner has not published it yet or paused it for now.',
    errorTitle: 'We could not load this profile', errorText: 'Check your connection and try again.',
    retry: 'Try again', createYours: 'Create your Mycen', draftBanner: 'Preview: this profile is not public yet.',
    footer: 'A Mycen identity',
    days: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
    languageLabel: 'Language', socials: 'Social networks', close: 'Close', cards: 'Cards',
    swipeHint: 'swipe to see more', tags: 'Categories',
  },
  pt: {
    openNow: 'Aberto agora', closedNow: 'Fechado agora', share: 'Compartilhar', linkCopied: 'Link copiado',
    saveContact: 'Salvar contato', contact: 'Contato', location: 'Localização', howToGet: 'Como chegar',
    hours: 'Horários', closed: 'Fechado', gallery: 'Galeria', reviews: 'Avaliações', seeOnGoogle: 'Ver no Google',
    reviewsCount: 'avaliações',
    notFoundTitle: 'Este perfil não existe', notFoundText: 'Confira o link ou crie sua própria identidade no Mycen.',
    unavailableTitle: 'Este perfil não está disponível', unavailableText: 'O dono ainda não o publicou ou o pausou por enquanto.',
    errorTitle: 'Não conseguimos carregar o perfil', errorText: 'Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente', createYours: 'Crie seu Mycen', draftBanner: 'Prévia: este perfil ainda não é público.',
    footer: 'Uma identidade Mycen',
    days: { monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom' },
    languageLabel: 'Idioma', socials: 'Redes sociais', close: 'Fechar', cards: 'Cartões',
    swipeHint: 'deslize para ver mais', tags: 'Categorias',
  },
  fr: {
    openNow: 'Ouvert', closedNow: 'Fermé', share: 'Partager', linkCopied: 'Lien copié',
    saveContact: 'Enregistrer le contact', contact: 'Contact', location: 'Adresse', howToGet: 'Itinéraire',
    hours: 'Horaires', closed: 'Fermé', gallery: 'Galerie', reviews: 'Avis', seeOnGoogle: 'Voir sur Google',
    reviewsCount: 'avis',
    notFoundTitle: 'Ce profil n’existe pas', notFoundText: 'Vérifiez le lien ou créez votre propre identité sur Mycen.',
    unavailableTitle: 'Ce profil n’est pas disponible', unavailableText: 'Son propriétaire ne l’a pas encore publié ou l’a mis en pause.',
    errorTitle: 'Impossible de charger le profil', errorText: 'Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer', createYours: 'Créez votre Mycen', draftBanner: 'Aperçu : ce profil n’est pas encore public.',
    footer: 'Une identité Mycen',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim' },
    languageLabel: 'Langue', socials: 'Réseaux sociaux', close: 'Fermer', cards: 'Cartes',
    swipeHint: 'faites glisser pour voir plus', tags: 'Catégories',
  },
  de: {
    openNow: 'Jetzt geöffnet', closedNow: 'Jetzt geschlossen', share: 'Teilen', linkCopied: 'Link kopiert',
    saveContact: 'Kontakt speichern', contact: 'Kontakt', location: 'Standort', howToGet: 'Route',
    hours: 'Öffnungszeiten', closed: 'Geschlossen', gallery: 'Galerie', reviews: 'Bewertungen', seeOnGoogle: 'Auf Google ansehen',
    reviewsCount: 'Bewertungen',
    notFoundTitle: 'Dieses Profil existiert nicht', notFoundText: 'Prüfe den Link oder erstelle deine eigene Identität auf Mycen.',
    unavailableTitle: 'Dieses Profil ist nicht verfügbar', unavailableText: 'Der Inhaber hat es noch nicht veröffentlicht oder vorübergehend pausiert.',
    errorTitle: 'Das Profil konnte nicht geladen werden', errorText: 'Prüfe deine Verbindung und versuche es erneut.',
    retry: 'Erneut versuchen', createYours: 'Erstelle dein Mycen', draftBanner: 'Vorschau: Dieses Profil ist noch nicht öffentlich.',
    footer: 'Eine Mycen-Identität',
    days: { monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So' },
    languageLabel: 'Sprache', socials: 'Soziale Netzwerke', close: 'Schließen', cards: 'Karten',
    swipeHint: 'wischen für mehr', tags: 'Kategorien',
  },
  it: {
    openNow: 'Aperto ora', closedNow: 'Chiuso ora', share: 'Condividi', linkCopied: 'Link copiato',
    saveContact: 'Salva contatto', contact: 'Contatti', location: 'Posizione', howToGet: 'Indicazioni',
    hours: 'Orari', closed: 'Chiuso', gallery: 'Galleria', reviews: 'Recensioni', seeOnGoogle: 'Vedi su Google',
    reviewsCount: 'recensioni',
    notFoundTitle: 'Questo profilo non esiste', notFoundText: 'Controlla il link o crea la tua identità su Mycen.',
    unavailableTitle: 'Questo profilo non è disponibile', unavailableText: 'Il proprietario non l’ha ancora pubblicato o l’ha messo in pausa.',
    errorTitle: 'Impossibile caricare il profilo', errorText: 'Controlla la connessione e riprova.',
    retry: 'Riprova', createYours: 'Crea il tuo Mycen', draftBanner: 'Anteprima: questo profilo non è ancora pubblico.',
    footer: 'Un’identità Mycen',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Gio', friday: 'Ven', saturday: 'Sab', sunday: 'Dom' },
    languageLabel: 'Lingua', socials: 'Social network', close: 'Chiudi', cards: 'Schede',
    swipeHint: 'scorri per vedere altro', tags: 'Categorie',
  },
  zh: {
    openNow: '营业中', closedNow: '已打烊', share: '分享', linkCopied: '链接已复制',
    saveContact: '保存联系人', contact: '联系方式', location: '位置', howToGet: '导航',
    hours: '营业时间', closed: '休息', gallery: '相册', reviews: '评价', seeOnGoogle: '在 Google 上查看',
    reviewsCount: '条评价',
    notFoundTitle: '该主页不存在', notFoundText: '请检查链接，或在 Mycen 创建你自己的主页。',
    unavailableTitle: '该主页暂不可用', unavailableText: '主人尚未发布或已暂停。',
    errorTitle: '无法加载主页', errorText: '请检查网络连接后重试。',
    retry: '重试', createYours: '创建你的 Mycen', draftBanner: '预览：此主页尚未公开。',
    footer: 'Mycen 身份主页',
    days: { monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四', friday: '周五', saturday: '周六', sunday: '周日' },
    languageLabel: '语言', socials: '社交媒体', close: '关闭', cards: '卡片',
    swipeHint: '滑动查看更多', tags: '分类',
  },
  ja: {
    openNow: '営業中', closedNow: '営業時間外', share: '共有', linkCopied: 'リンクをコピーしました',
    saveContact: '連絡先を保存', contact: '連絡先', location: '所在地', howToGet: '経路',
    hours: '営業時間', closed: '定休日', gallery: 'ギャラリー', reviews: 'レビュー', seeOnGoogle: 'Google で見る',
    reviewsCount: '件のレビュー',
    notFoundTitle: 'このプロフィールは存在しません', notFoundText: 'リンクを確認するか、Mycen で自分のプロフィールを作成してください。',
    unavailableTitle: 'このプロフィールは現在ご利用いただけません', unavailableText: 'オーナーがまだ公開していないか、一時停止中です。',
    errorTitle: 'プロフィールを読み込めませんでした', errorText: '接続を確認して、もう一度お試しください。',
    retry: '再試行', createYours: 'Mycen をつくる', draftBanner: 'プレビュー：このプロフィールはまだ公開されていません。',
    footer: 'Mycen のプロフィール',
    days: { monday: '月', tuesday: '火', wednesday: '水', thursday: '木', friday: '金', saturday: '土', sunday: '日' },
    languageLabel: '言語', socials: 'SNS', close: '閉じる', cards: 'カード',
    swipeHint: 'スワイプしてもっと見る', tags: 'カテゴリー',
  },
  ko: {
    openNow: '영업 중', closedNow: '영업 종료', share: '공유', linkCopied: '링크가 복사되었습니다',
    saveContact: '연락처 저장', contact: '연락처', location: '위치', howToGet: '길찾기',
    hours: '영업시간', closed: '휴무', gallery: '갤러리', reviews: '리뷰', seeOnGoogle: 'Google에서 보기',
    reviewsCount: '개의 리뷰',
    notFoundTitle: '존재하지 않는 프로필입니다', notFoundText: '링크를 확인하거나 Mycen에서 나만의 프로필을 만들어 보세요.',
    unavailableTitle: '이 프로필은 현재 이용할 수 없습니다', unavailableText: '소유자가 아직 공개하지 않았거나 잠시 중단했습니다.',
    errorTitle: '프로필을 불러오지 못했습니다', errorText: '연결 상태를 확인하고 다시 시도해 주세요.',
    retry: '다시 시도', createYours: '나의 Mycen 만들기', draftBanner: '미리보기: 이 프로필은 아직 공개되지 않았습니다.',
    footer: 'Mycen 아이덴티티',
    days: { monday: '월', tuesday: '화', wednesday: '수', thursday: '목', friday: '금', saturday: '토', sunday: '일' },
    languageLabel: '언어', socials: '소셜 미디어', close: '닫기', cards: '카드',
    swipeHint: '밀어서 더 보기', tags: '카테고리',
  },
  hi: {
    openNow: 'अभी खुला है', closedNow: 'अभी बंद है', share: 'शेयर करें', linkCopied: 'लिंक कॉपी हो गया',
    saveContact: 'संपर्क सहेजें', contact: 'संपर्क', location: 'पता', howToGet: 'रास्ता देखें',
    hours: 'समय', closed: 'बंद', gallery: 'गैलरी', reviews: 'समीक्षाएँ', seeOnGoogle: 'Google पर देखें',
    reviewsCount: 'समीक्षाएँ',
    notFoundTitle: 'यह प्रोफ़ाइल मौजूद नहीं है', notFoundText: 'लिंक जाँचें या Mycen पर अपनी पहचान बनाएँ।',
    unavailableTitle: 'यह प्रोफ़ाइल उपलब्ध नहीं है', unavailableText: 'इसके मालिक ने इसे अभी प्रकाशित नहीं किया है या अस्थायी रूप से रोक दिया है।',
    errorTitle: 'प्रोफ़ाइल लोड नहीं हो सकी', errorText: 'अपना कनेक्शन जाँचें और फिर से कोशिश करें।',
    retry: 'फिर से कोशिश करें', createYours: 'अपना Mycen बनाएँ', draftBanner: 'पूर्वावलोकन: यह प्रोफ़ाइल अभी सार्वजनिक नहीं है।',
    footer: 'एक Mycen पहचान',
    days: { monday: 'सोम', tuesday: 'मंगल', wednesday: 'बुध', thursday: 'गुरु', friday: 'शुक्र', saturday: 'शनि', sunday: 'रवि' },
    languageLabel: 'भाषा', socials: 'सोशल मीडिया', close: 'बंद करें', cards: 'कार्ड',
    swipeHint: 'और देखने के लिए स्वाइप करें', tags: 'श्रेणियाँ',
  },
  ar: {
    openNow: 'مفتوح الآن', closedNow: 'مغلق الآن', share: 'مشاركة', linkCopied: 'تم نسخ الرابط',
    saveContact: 'حفظ جهة الاتصال', contact: 'التواصل', location: 'الموقع', howToGet: 'الاتجاهات',
    hours: 'ساعات العمل', closed: 'مغلق', gallery: 'المعرض', reviews: 'التقييمات', seeOnGoogle: 'عرض على Google',
    reviewsCount: 'تقييمات',
    notFoundTitle: 'هذا الملف غير موجود', notFoundText: 'تحقّق من الرابط أو أنشئ هويتك الخاصة على Mycen.',
    unavailableTitle: 'هذا الملف غير متاح', unavailableText: 'لم ينشره صاحبه بعد أو أوقفه مؤقتًا.',
    errorTitle: 'تعذّر تحميل الملف', errorText: 'تحقّق من اتصالك وحاول مرة أخرى.',
    retry: 'إعادة المحاولة', createYours: 'أنشئ Mycen الخاص بك', draftBanner: 'معاينة: هذا الملف ليس عامًا بعد.',
    footer: 'هوية Mycen',
    days: { monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد' },
    languageLabel: 'اللغة', socials: 'وسائل التواصل', close: 'إغلاق', cards: 'بطاقات',
    swipeHint: 'اسحب لرؤية المزيد', tags: 'الفئات',
  },
  ru: {
    openNow: 'Открыто', closedNow: 'Закрыто', share: 'Поделиться', linkCopied: 'Ссылка скопирована',
    saveContact: 'Сохранить контакт', contact: 'Контакты', location: 'Адрес', howToGet: 'Как добраться',
    hours: 'Часы работы', closed: 'Выходной', gallery: 'Галерея', reviews: 'Отзывы', seeOnGoogle: 'Смотреть в Google',
    reviewsCount: 'отзывов',
    notFoundTitle: 'Такого профиля нет', notFoundText: 'Проверьте ссылку или создайте свой профиль в Mycen.',
    unavailableTitle: 'Профиль недоступен', unavailableText: 'Владелец ещё не опубликовал его или временно приостановил.',
    errorTitle: 'Не удалось загрузить профиль', errorText: 'Проверьте подключение и попробуйте снова.',
    retry: 'Повторить', createYours: 'Создайте свой Mycen', draftBanner: 'Предпросмотр: профиль ещё не опубликован.',
    footer: 'Профиль Mycen',
    days: { monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс' },
    languageLabel: 'Язык', socials: 'Соцсети', close: 'Закрыть', cards: 'Карточки',
    swipeHint: 'листайте, чтобы увидеть больше', tags: 'Категории',
  },
}

export function ui(lang: ProfileLang): UiStrings {
  return UI[lang] ?? UI.es
}

/** Etiquetas conocidas (acción principal, títulos importados del Hub) traducidas. */
const KNOWN_LABELS: Record<string, Partial<Record<ProfileLang, string>>> = {
  'Ver menú':     { en: 'View menu', pt: 'Ver cardápio', fr: 'Voir le menu', de: 'Speisekarte', it: 'Vedi menù', zh: '查看菜单', ja: 'メニューを見る', ko: '메뉴 보기', hi: 'मेनू देखें', ar: 'عرض القائمة', ru: 'Меню' },
  'Ver catálogo': { en: 'View catalog', pt: 'Ver catálogo', fr: 'Voir le catalogue', de: 'Katalog ansehen', it: 'Vedi catalogo', zh: '查看目录', ja: 'カタログを見る', ko: '카탈로그 보기', hi: 'कैटलॉग देखें', ar: 'عرض الكتالوج', ru: 'Каталог' },
  'Contactar':    { en: 'Contact', pt: 'Entrar em contato', fr: 'Contacter', de: 'Kontakt', it: 'Contatta', zh: '联系', ja: '問い合わせ', ko: '문의하기', hi: 'संपर्क करें', ar: 'تواصل', ru: 'Связаться' },
  'Reservar':     { en: 'Book a table', pt: 'Reservar', fr: 'Réserver', de: 'Reservieren', it: 'Prenota', zh: '预订', ja: '予約する', ko: '예약하기', hi: 'बुक करें', ar: 'احجز', ru: 'Забронировать' },
  'Ver más':      { en: 'See more', pt: 'Ver mais', fr: 'Voir plus', de: 'Mehr ansehen', it: 'Vedi di più', zh: '查看更多', ja: 'もっと見る', ko: '더 보기', hi: 'और देखें', ar: 'عرض المزيد', ru: 'Подробнее' },
  'Contacto':     { en: 'Contact', pt: 'Contato', fr: 'Contact', de: 'Kontakt', it: 'Contatti', zh: '联系方式', ja: '連絡先', ko: '연락처', hi: 'संपर्क', ar: 'التواصل', ru: 'Контакты' },
  'Ubicación':    { en: 'Location', pt: 'Localização', fr: 'Adresse', de: 'Standort', it: 'Posizione', zh: '位置', ja: '所在地', ko: '위치', hi: 'पता', ar: 'الموقع', ru: 'Адрес' },
  'Horarios':     { en: 'Hours', pt: 'Horários', fr: 'Horaires', de: 'Öffnungszeiten', it: 'Orari', zh: '营业时间', ja: '営業時間', ko: '영업시간', hi: 'समय', ar: 'ساعات العمل', ru: 'Часы работы' },
  'Galería':      { en: 'Gallery', pt: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria', zh: '相册', ja: 'ギャラリー', ko: '갤러리', hi: 'गैलरी', ar: 'المعرض', ru: 'Галерея' },
  'Reseñas':      { en: 'Reviews', pt: 'Avaliações', fr: 'Avis', de: 'Bewertungen', it: 'Recensioni', zh: '评价', ja: 'レビュー', ko: '리뷰', hi: 'समीक्षाएँ', ar: 'التقييمات', ru: 'Отзывы' },
}

export function trLabel(label: string | null | undefined, lang: ProfileLang): string {
  if (!label) return ''
  return KNOWN_LABELS[label]?.[lang] ?? label
}

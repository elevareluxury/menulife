// Textos de los módulos de portfolio (página pública): viajan en el chunk de PortfolioModules, no en el del perfil.
import type { ProfileLang } from './profileTypes'
import type { MeasureCm, MeasureText, RepRole } from './portfolio'

export interface PortfolioStrings {
  titles: Record<'measurements' | 'audience' | 'brands' | 'press' | 'credits' | 'representation', string>
  measures: Record<MeasureCm | MeasureText, string>
  followers: string
  avgViews: string
  engagement: string
  /** {name} y {date} */
  reportedBy: string
  stale: string
  roles: Record<RepRole, string>
  email: string
  call: string
  web: string
}

const STRINGS: Record<ProfileLang, PortfolioStrings> = {
  es: {
    titles: { measurements: "Medidas", audience: "Audiencia", brands: "Marcas con las que trabajé", press: "Prensa", credits: "Créditos", representation: "Representación" },
    measures: { height: "Altura", bust: "Busto", waist: "Cintura", hips: "Cadera", chest: "Pecho", inseam: "Entrepierna", shoe: "Calzado", dress: "Talle", suit: "Saco", hair: "Pelo", eyes: "Ojos" },
    followers: "seguidores", avgViews: "vistas promedio", engagement: "interacción",
    reportedBy: "Números informados por {name} el {date}.", stale: "Pueden estar desactualizados.",
    roles: { agency: "Agencia", mother_agency: "Agencia madre", booking: "Booking", management: "Management", label: "Sello", publicist: "Prensa", other: "Contacto" },
    email: "Escribir", call: "Llamar", web: "Sitio",
  },
  en: {
    titles: { measurements: "Measurements", audience: "Audience", brands: "Brands I’ve worked with", press: "Press", credits: "Credits", representation: "Representation" },
    measures: { height: "Height", bust: "Bust", waist: "Waist", hips: "Hips", chest: "Chest", inseam: "Inseam", shoe: "Shoes", dress: "Dress", suit: "Suit", hair: "Hair", eyes: "Eyes" },
    followers: "followers", avgViews: "avg. views", engagement: "engagement",
    reportedBy: "Numbers reported by {name} on {date}.", stale: "They may be out of date.",
    roles: { agency: "Agency", mother_agency: "Mother agency", booking: "Booking", management: "Management", label: "Label", publicist: "Press", other: "Contact" },
    email: "Email", call: "Call", web: "Website",
  },
  pt: {
    titles: { measurements: "Medidas", audience: "Audiência", brands: "Marcas com que trabalhei", press: "Imprensa", credits: "Créditos", representation: "Representação" },
    measures: { height: "Altura", bust: "Busto", waist: "Cintura", hips: "Quadril", chest: "Tórax", inseam: "Entreperna", shoe: "Calçado", dress: "Manequim", suit: "Paletó", hair: "Cabelo", eyes: "Olhos" },
    followers: "seguidores", avgViews: "visualizações médias", engagement: "engajamento",
    reportedBy: "Números informados por {name} em {date}.", stale: "Podem estar desatualizados.",
    roles: { agency: "Agência", mother_agency: "Agência mãe", booking: "Booking", management: "Empresário", label: "Gravadora", publicist: "Assessoria de imprensa", other: "Contato" },
    email: "Escrever", call: "Ligar", web: "Site",
  },
  fr: {
    titles: { measurements: "Mensurations", audience: "Audience", brands: "Marques avec qui j’ai travaillé", press: "Presse", credits: "Crédits", representation: "Représentation" },
    measures: { height: "Taille", bust: "Poitrine", waist: "Tour de taille", hips: "Hanches", chest: "Tour de poitrine", inseam: "Entrejambe", shoe: "Pointure", dress: "Taille de vêtement", suit: "Costume", hair: "Cheveux", eyes: "Yeux" },
    followers: "abonnés", avgViews: "vues moyennes", engagement: "engagement",
    reportedBy: "Chiffres indiqués par {name} le {date}.", stale: "Ils peuvent ne plus être à jour.",
    roles: { agency: "Agence", mother_agency: "Agence mère", booking: "Booking", management: "Management", label: "Label", publicist: "Attaché de presse", other: "Contact" },
    email: "Écrire", call: "Appeler", web: "Site",
  },
  de: {
    titles: { measurements: "Maße", audience: "Reichweite", brands: "Marken, mit denen ich gearbeitet habe", press: "Presse", credits: "Credits", representation: "Vertretung" },
    measures: { height: "Größe", bust: "Brust", waist: "Taille", hips: "Hüfte", chest: "Brustumfang", inseam: "Schrittlänge", shoe: "Schuhe", dress: "Konfektion", suit: "Anzug", hair: "Haare", eyes: "Augen" },
    followers: "Follower", avgViews: "Ø Aufrufe", engagement: "Engagement",
    reportedBy: "Zahlen von {name} angegeben am {date}.", stale: "Sie können veraltet sein.",
    roles: { agency: "Agentur", mother_agency: "Mutteragentur", booking: "Booking", management: "Management", label: "Label", publicist: "Presse", other: "Kontakt" },
    email: "Schreiben", call: "Anrufen", web: "Website",
  },
  it: {
    titles: { measurements: "Misure", audience: "Pubblico", brands: "Brand con cui ho lavorato", press: "Stampa", credits: "Crediti", representation: "Rappresentanza" },
    measures: { height: "Altezza", bust: "Seno", waist: "Vita", hips: "Fianchi", chest: "Torace", inseam: "Cavallo", shoe: "Scarpe", dress: "Taglia", suit: "Giacca", hair: "Capelli", eyes: "Occhi" },
    followers: "follower", avgViews: "visualizzazioni medie", engagement: "engagement",
    reportedBy: "Numeri indicati da {name} il {date}.", stale: "Potrebbero non essere aggiornati.",
    roles: { agency: "Agenzia", mother_agency: "Agenzia madre", booking: "Booking", management: "Management", label: "Etichetta", publicist: "Ufficio stampa", other: "Contatto" },
    email: "Scrivi", call: "Chiama", web: "Sito",
  },
  zh: {
    titles: { measurements: "身材数据", audience: "受众", brands: "合作过的品牌", press: "媒体报道", credits: "作品履历", representation: "经纪代理" },
    measures: { height: "身高", bust: "胸围", waist: "腰围", hips: "臀围", chest: "胸围（男）", inseam: "内长", shoe: "鞋码", dress: "服装尺码", suit: "西装尺码", hair: "发色", eyes: "眼睛" },
    followers: "粉丝", avgViews: "平均观看", engagement: "互动率",
    reportedBy: "以上数据由 {name} 于 {date} 提供。", stale: "数据可能已过时。",
    roles: { agency: "经纪公司", mother_agency: "母公司经纪", booking: "演出预约", management: "经纪人", label: "唱片公司", publicist: "公关", other: "联系方式" },
    email: "发邮件", call: "打电话", web: "网站",
  },
  ja: {
    titles: { measurements: "サイズ", audience: "オーディエンス", brands: "一緒に仕事をしたブランド", press: "メディア掲載", credits: "出演・制作実績", representation: "所属・窓口" },
    measures: { height: "身長", bust: "バスト", waist: "ウエスト", hips: "ヒップ", chest: "胸囲", inseam: "股下", shoe: "靴", dress: "服のサイズ", suit: "スーツ", hair: "髪", eyes: "目" },
    followers: "フォロワー", avgViews: "平均再生数", engagement: "エンゲージメント",
    reportedBy: "{name} が {date} に申告した数値です。", stale: "最新ではない可能性があります。",
    roles: { agency: "事務所", mother_agency: "マザーエージェンシー", booking: "ブッキング", management: "マネジメント", label: "レーベル", publicist: "広報", other: "連絡先" },
    email: "メール", call: "電話", web: "サイト",
  },
  ko: {
    titles: { measurements: "신체 사이즈", audience: "오디언스", brands: "함께한 브랜드", press: "언론 보도", credits: "크레딧", representation: "소속" },
    measures: { height: "키", bust: "가슴", waist: "허리", hips: "엉덩이", chest: "가슴둘레", inseam: "인심", shoe: "신발", dress: "옷 사이즈", suit: "정장", hair: "머리색", eyes: "눈" },
    followers: "팔로워", avgViews: "평균 조회수", engagement: "참여율",
    reportedBy: "{name}이(가) {date}에 알린 수치입니다.", stale: "최신이 아닐 수 있습니다.",
    roles: { agency: "소속사", mother_agency: "마더 에이전시", booking: "부킹", management: "매니지먼트", label: "레이블", publicist: "홍보", other: "연락처" },
    email: "이메일", call: "전화", web: "웹사이트",
  },
  hi: {
    titles: { measurements: "माप", audience: "दर्शक", brands: "जिन ब्रांडों के साथ काम किया", press: "प्रेस", credits: "क्रेडिट", representation: "प्रतिनिधित्व" },
    measures: { height: "लंबाई", bust: "बस्ट", waist: "कमर", hips: "हिप्स", chest: "छाती", inseam: "इनसीम", shoe: "जूते", dress: "ड्रेस साइज़", suit: "सूट", hair: "बाल", eyes: "आँखें" },
    followers: "फ़ॉलोअर", avgViews: "औसत व्यूज़", engagement: "एंगेजमेंट",
    reportedBy: "ये आँकड़े {name} ने {date} को बताए।", stale: "ये पुराने हो सकते हैं।",
    roles: { agency: "एजेंसी", mother_agency: "मदर एजेंसी", booking: "बुकिंग", management: "मैनेजमेंट", label: "लेबल", publicist: "पीआर", other: "संपर्क" },
    email: "ईमेल", call: "कॉल", web: "वेबसाइट",
  },
  ar: {
    titles: { measurements: "المقاسات", audience: "الجمهور", brands: "علامات عملت معها", press: "الصحافة", credits: "الأعمال", representation: "التمثيل" },
    measures: { height: "الطول", bust: "الصدر", waist: "الخصر", hips: "الأرداف", chest: "محيط الصدر", inseam: "طول الساق الداخلي", shoe: "الحذاء", dress: "مقاس الملابس", suit: "البدلة", hair: "الشعر", eyes: "العينان" },
    followers: "متابع", avgViews: "متوسط المشاهدات", engagement: "التفاعل",
    reportedBy: "أرقام أعلنها {name} بتاريخ {date}.", stale: "قد لا تكون محدّثة.",
    roles: { agency: "الوكالة", mother_agency: "الوكالة الأم", booking: "الحجوزات", management: "الإدارة", label: "شركة الإنتاج", publicist: "العلاقات الإعلامية", other: "التواصل" },
    email: "مراسلة", call: "اتصال", web: "الموقع",
  },
  ru: {
    titles: { measurements: "Параметры", audience: "Аудитория", brands: "Бренды, с которыми я работал(а)", press: "Пресса", credits: "Работы", representation: "Представительство" },
    measures: { height: "Рост", bust: "Грудь", waist: "Талия", hips: "Бёдра", chest: "Обхват груди", inseam: "Длина по внутреннему шву", shoe: "Обувь", dress: "Размер одежды", suit: "Костюм", hair: "Волосы", eyes: "Глаза" },
    followers: "подписчиков", avgViews: "ср. просмотров", engagement: "вовлечённость",
    reportedBy: "Цифры указал(а) {name} {date}.", stale: "Они могут быть устаревшими.",
    roles: { agency: "Агентство", mother_agency: "Материнское агентство", booking: "Букинг", management: "Менеджмент", label: "Лейбл", publicist: "Пресс-служба", other: "Контакт" },
    email: "Написать", call: "Позвонить", web: "Сайт",
  },
}

export const portfolioStrings = (lang: ProfileLang): PortfolioStrings => STRINGS[lang] ?? STRINGS.es

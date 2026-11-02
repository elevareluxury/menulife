// Textos del módulo "Eventos". Aparte de profileI18n: sólo los baja un perfil que tiene el módulo (EventsModule va en
// su propio chunk).
import type { ProfileLang } from './profileTypes'

export interface EventsStrings {
  /** Nombre de la sección si el dueño no le puso título */
  section: string
  swipe: string
  /** Nombre accesible de la tarjeta que abre la ficha */
  open: (title: string) => string
  /** Botón de abajo de la tarjeta (lleva directo al link) */
  tickets: string
  /** Botón fijo de la ficha */
  buy: string
  back: string
  share: string
  copied: string
  readMore: string
  readLess: string
  /** Puntos del carrusel: "2 de 5" */
  position: (n: number, total: number) => string
}

const STRINGS: Record<ProfileLang, EventsStrings> = {
  es: {
    section: 'Eventos', swipe: 'deslizá para ver más', open: t => `Ver evento: ${t}`, tickets: 'Entradas',
    buy: 'Comprar entradas', back: 'Volver', share: 'Compartir', copied: 'Link copiado', readMore: 'Leer más',
    readLess: 'Leer menos', position: (n, t) => `${n} de ${t}`,
  },
  en: {
    section: 'Events', swipe: 'swipe to see more', open: t => `See event: ${t}`, tickets: 'Tickets',
    buy: 'Get tickets', back: 'Back', share: 'Share', copied: 'Link copied', readMore: 'Read more',
    readLess: 'Read less', position: (n, t) => `${n} of ${t}`,
  },
  pt: {
    section: 'Eventos', swipe: 'deslize para ver mais', open: t => `Ver evento: ${t}`, tickets: 'Ingressos',
    buy: 'Comprar ingressos', back: 'Voltar', share: 'Compartilhar', copied: 'Link copiado', readMore: 'Ler mais',
    readLess: 'Ler menos', position: (n, t) => `${n} de ${t}`,
  },
  fr: {
    section: 'Événements', swipe: 'faites glisser pour voir plus', open: t => `Voir l’événement : ${t}`, tickets: 'Billets',
    buy: 'Acheter des billets', back: 'Retour', share: 'Partager', copied: 'Lien copié', readMore: 'Lire la suite',
    readLess: 'Réduire', position: (n, t) => `${n} sur ${t}`,
  },
  de: {
    section: 'Events', swipe: 'wischen für mehr', open: t => `Event ansehen: ${t}`, tickets: 'Tickets',
    buy: 'Tickets kaufen', back: 'Zurück', share: 'Teilen', copied: 'Link kopiert', readMore: 'Mehr lesen',
    readLess: 'Weniger anzeigen', position: (n, t) => `${n} von ${t}`,
  },
  it: {
    section: 'Eventi', swipe: 'scorri per vedere altro', open: t => `Vedi evento: ${t}`, tickets: 'Biglietti',
    buy: 'Compra i biglietti', back: 'Indietro', share: 'Condividi', copied: 'Link copiato', readMore: 'Leggi di più',
    readLess: 'Mostra meno', position: (n, t) => `${n} di ${t}`,
  },
  zh: {
    section: '活动', swipe: '滑动查看更多', open: t => `查看活动：${t}`, tickets: '门票',
    buy: '购买门票', back: '返回', share: '分享', copied: '链接已复制', readMore: '展开全文',
    readLess: '收起', position: (n, t) => `第 ${n} 个，共 ${t} 个`,
  },
  ja: {
    section: 'イベント', swipe: 'スワイプしてもっと見る', open: t => `イベントを見る：${t}`, tickets: 'チケット',
    buy: 'チケットを購入', back: '戻る', share: '共有', copied: 'リンクをコピーしました', readMore: 'もっと読む',
    readLess: '閉じる', position: (n, t) => `${t} 件中 ${n} 件目`,
  },
  ko: {
    section: '이벤트', swipe: '밀어서 더 보기', open: t => `이벤트 보기: ${t}`, tickets: '티켓',
    buy: '티켓 구매', back: '뒤로', share: '공유', copied: '링크를 복사했어요', readMore: '더 보기',
    readLess: '접기', position: (n, t) => `${t}개 중 ${n}번째`,
  },
  hi: {
    section: 'इवेंट', swipe: 'और देखने के लिए स्वाइप करें', open: t => `इवेंट देखें: ${t}`, tickets: 'टिकट',
    buy: 'टिकट खरीदें', back: 'वापस', share: 'शेयर करें', copied: 'लिंक कॉपी हो गया', readMore: 'और पढ़ें',
    readLess: 'कम दिखाएँ', position: (n, t) => `${t} में से ${n}`,
  },
  ar: {
    section: 'الفعاليات', swipe: 'اسحب لرؤية المزيد', open: t => `عرض الفعالية: ${t}`, tickets: 'التذاكر',
    buy: 'شراء التذاكر', back: 'رجوع', share: 'مشاركة', copied: 'تم نسخ الرابط', readMore: 'اقرأ المزيد',
    readLess: 'عرض أقل', position: (n, t) => `${n} من ${t}`,
  },
  ru: {
    section: 'События', swipe: 'листайте, чтобы увидеть больше', open: t => `Открыть событие: ${t}`, tickets: 'Билеты',
    buy: 'Купить билеты', back: 'Назад', share: 'Поделиться', copied: 'Ссылка скопирована', readMore: 'Читать дальше',
    readLess: 'Свернуть', position: (n, t) => `${n} из ${t}`,
  },
}

export const eventsStrings = (lang: ProfileLang): EventsStrings => STRINGS[lang] ?? STRINGS.es

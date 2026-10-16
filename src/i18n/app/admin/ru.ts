import type { AdminDict } from './es'

// Русские формы множественного числа: 1 / 2–4 / 5+
const plural = (n: number, one: string, few: string, many: string) => {
  const d = n % 10, h = n % 100
  if (d === 1 && h !== 11) return one
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few
  return many
}

const ru: AdminDict = {
  layout: { brand: 'Mycen', admin: 'Админ', openMenu: 'Открыть меню', closeMenu: 'Закрыть меню', signOut: 'Выйти', nav: 'Внутренняя панель' },
  nav: {
    overview: 'Обзор', requests: 'Заявки', reports: 'Жалобы', verifications: 'Верификация', errors: 'Ошибки',
    product: 'Продукт', businesses: 'Заведения', metrics: 'Метрики', plans: 'Тарифы', system: 'Система',
    flags: 'Флаги функций', landing: 'Лендинг', testimonials: 'Отзывы', tester: 'Тестер',
  },
  common: { loading: 'Загрузка…', filter: 'Фильтр', note: (note) => `Заметка: ${note}`, actionFailed: 'Не удалось выполнить действие. Попробуйте ещё раз.' },
  dashboard: {
    title: 'Панель управления', subtitle: 'Общий вид Mycen',
    totalBusinesses: 'Всего заведений', newThisMonth: (n) => `+${n} в этом месяце`,
    pendingRequests: 'Заявки в ожидании', needsReview: 'Нужна проверка', allClear: 'Всё обработано',
    activeOnline: 'Активны онлайн', rightNow: 'прямо сейчас',
    revenueMonth: 'Выручка за месяц', allBusinesses: 'все заведения',
    ordersToday: 'Заказы сегодня', inAllBusinesses: 'во всех заведениях',
    activeWaiters: 'Активные официанты', systemTotal: 'всего в системе', drivers: 'Курьеры', activeTables: 'Активные столы',
    trialsExpiring: (n) => `${n} ${plural(n, 'пробный период заканчивается', 'пробных периода заканчиваются', 'пробных периодов заканчиваются')} в ближайшие 3 дня`,
    inactive: (n) => `${n} ${plural(n, 'заведение', 'заведения', 'заведений')} без активности 7+ дней`,
    oldRequests: (n) => `${n} ${plural(n, 'заявка ждёт', 'заявки ждут', 'заявок ждут')} больше 48 часов`,
    incompleteOnboarding: (n) => `${n} ${plural(n, 'заведение не завершило', 'заведения не завершили', 'заведений не завершили')} настройку`,
    registered: (name) => `${name}: регистрация`, approved: (name) => `${name}: одобрено`,
    alertsTitle: 'Требуют внимания', noAlerts: 'Всё в порядке. Нет ожидающих уведомлений.', see: 'Открыть',
    recentActivity: 'Недавняя активность', seeAll: 'Показать все →', noActivity: 'Нет недавней активности',
    planDistribution: 'Распределение по тарифам', noData: 'Нет данных',
    openErrors: (n) => `${n} ${plural(n, 'открытая ошибка', 'открытые ошибки', 'открытых ошибок')}`,
    affectedToday: (n) => `затронуто сегодня: ${n} ${plural(n, 'человек', 'человека', 'человек')}`,
    seeErrors: 'Открыть ошибки →',
  },
  reports: {
    title: 'Жалобы',
    intro: 'Профили и проекты, на которые пожаловались посетители. Блокировка профиля полностью скрывает его (страницу, проекты, vCard) и закрывает все открытые жалобы. Владелец видит причину в Studio.',
    open: 'Открытые', resolved: 'Рассмотренные',
    loadFailed: 'Не удалось загрузить жалобы. Миграция фазы 8 применена?',
    noneOpen: 'Открытых жалоб нет.', noneResolved: 'Рассмотренных жалоб пока нет.', list: 'Жалобы',
    reportOf: (name) => `Жалоба на ${name}`, project: (title) => `Проект: ${title}`, suspendedTag: 'ЗАБЛОКИРОВАН',
    openCount: (n) => `${n} ${plural(n, 'открытая жалоба', 'открытые жалобы', 'открытых жалоб')} на этот профиль`,
    noteLabel: 'Заметка (владелец увидит причину блокировки)', dismiss: 'Отклонить', suspend: 'Заблокировать профиль',
    suspendedTitle: 'Заблокированные профили', noneSuspended: 'Заблокированных профилей нет.', since: (date) => `С ${date}`,
    lift: 'Снять блокировку',
    reasons: {
      spam: 'Спам или вводящая в заблуждение реклама', scam: 'Мошенничество', impersonation: 'Выдача себя за другого',
      hate: 'Ненависть или травля', violence: 'Насилие или угрозы', sexual: 'Сексуальный контент', illegal: 'Что-то незаконное', other: 'Другая причина',
    },
    status: { open: 'Открыта', dismissed: 'Отклонена', actioned: 'Профиль заблокирован' },
  },
  verifications: {
    title: 'Верификация',
    intro: 'Заявки на верификацию аккаунта. После одобрения галочка появится во всех профилях человека.',
    pending: 'В ожидании', reviewed: 'Рассмотренные', saveFailed: 'Не удалось сохранить. Попробуйте ещё раз.',
    loadFailed: 'Не удалось загрузить. Проверьте, что миграция верификации применена.',
    nonePending: 'Заявок в ожидании нет.', noneReviewed: 'Рассмотренных заявок пока нет.',
    requestOf: (name) => `Заявка от ${name}`, verified: 'верифицирован', noProfile: 'Без профиля',
    notePlaceholder: 'Заметка для человека (необязательно, видна в его Studio)', noteLabel: 'Заметка для человека',
    approve: 'Одобрить', reject: 'Отклонить', remove: 'Снять верификацию',
    status: { pending: 'В ожидании', approved: 'Одобрена', rejected: 'Отклонена' },
  },
  errors: {
    title: 'Ошибки',
    intro: 'Что ломается в браузерах людей, сгруппировано: одна и та же ошибка в разных версиях считается одной. «Люди» — анонимный подсчёт за день (без IP и личных данных). Если исправленная ошибка повторится, она откроется снова сама.',
    loadFailed: 'Не удалось загрузить ошибки. Миграция L5 применена?',
    summaryOpen: 'Открытые', summaryNewToday: 'Новые сегодня', summaryAffectedToday: 'Затронуто сегодня',
    filters: { open: 'Открытые', resolved: 'Исправленные', ignored: 'Игнорируемые', all: 'Все' },
    statusGroup: 'Статус', area: 'Раздел', allAreas: 'Все',
    areas: {
      landing: 'Лендинг', auth: 'Вход', profile: 'Публичная страница', studio: 'Studio', life: 'Life OS',
      business: 'Business', admin: 'Суперадмин', other: 'Другое',
    },
    noneOpen: 'Открытых ошибок нет.', noneHere: 'В этом представлении ошибок нет.', list: 'Ошибки',
    reopened: 'Повторилась', resolvedTag: 'Исправлена', ignoredTag: 'Игнорируется',
    times: (n) => `${n} ${plural(n, 'раз', 'раза', 'раз')}`,
    people: (n, today) => `${n} ${plural(n, 'человек', 'человека', 'человек')} (${today} сегодня)`,
    last: (date) => `последняя ${date}`, first: (date) => `первая ${date}`, version: (v) => `версия ${v}`,
    details: 'Показать технические детали', stackLabel: 'Технические детали ошибки',
    noteLabel: 'Заметка (необязательно: что сделано)', markResolved: 'Отметить исправленной', ignore: 'Игнорировать', reopen: 'Открыть снова',
  },
  product: {
    title: 'Продукт',
    intro: 'Собственные метрики V1 (без третьих сторон). События не хранят содержимое задач, привычек и сообщений.',
    period: 'Период', lastDays: (n) => `Последние ${n} ${plural(n, 'день', 'дня', 'дней')}`,
    loadFailed: 'Не удалось загрузить метрики. Проверьте, что миграция этапа 14 применена.',
    timeToPublish: 'Время до публикации', medianSinceSignup: 'Медиана, с момента регистрации',
    published: 'Опубликованные аккаунты', publishedSub: (n, total) => `${n} из ${total} регистраций за период`,
    referralSignups: 'Регистрации по приглашению', referralSub: (n) => `${n} пришли из профиля`,
    events: 'События', inPeriod: 'За период',
    habit4: 'Привычка 4+ дня в неделю', habit4Sub: (n, total) => `${n} из ${total} активных в Life OS (последние 7 дней)`,
    returnRate: 'Доля возвращений', returnSub: (median) => `Вернулись после 3+ дней · медиана ${median}`,
    retentionTitle: 'Удержание Life OS по недельным когортам',
    retentionHelp: 'Когорта = неделя первого использования. День 1 = вернулся на следующий день; неделя 1 = дни 7–13; месяц 1 = дни 30–36. «…» = когорта ещё не дошла до этого дня.',
    noLifeUse: 'Life OS пока не использовали.',
    week: 'Неделя', people: 'Люди', day1: 'День 1', week1: 'Неделя 1', month1: 'Месяц 1',
    referralsTitle: 'Регистрации по приглашению', noReferrals: 'За этот период никто не пришёл из профиля.',
    profile: 'Профиль', signups: 'Регистрации',
    seconds: (n) => `${n} с`, minutes: (n) => `${n} мин`, hours: (n) => `${n} ч`, days: (n) => `${n} дн.`,
  },
}

export default ru

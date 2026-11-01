import type { UiStrings } from '../profileI18n'

// Textos de la página pública en ru (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'Открыто', closedNow: 'Закрыто', share: 'Поделиться', linkCopied: 'Ссылка скопирована',
    saveContact: 'Сохранить контакт', contact: 'Контакты', location: 'Адрес', howToGet: 'Как добраться',
    hours: 'Часы работы', closed: 'Выходной', gallery: 'Галерея', reviews: 'Отзывы', seeOnGoogle: 'Смотреть в Google',
    reviewsCount: 'отзывов',
    notFoundTitle: 'Такого профиля нет', notFoundText: 'Проверьте ссылку или создайте свой профиль в Mycen.',
    unavailableTitle: 'Профиль недоступен', unavailableText: 'Владелец ещё не опубликовал его или временно приостановил.',
    errorTitle: 'Не удалось загрузить профиль', errorText: 'Проверьте подключение и попробуйте снова.',
    retry: 'Повторить', createYours: 'Создайте свой Mycen', draftBanner: 'Предпросмотр: профиль ещё не опубликован.',
    footer: 'Профиль Mycen',
    verified: 'Подтверждённый аккаунт', available: 'На связи', moreAboutMe: 'Подробнее обо мне', createIdentity: 'Создайте свою идентичность', createFree: 'Создайте свой Mycen бесплатно', call: 'Позвонить', copyLink: 'Скопировать ссылку', qrCode: 'QR-код', moreOptions: 'Другие варианты', backToTop: 'Наверх', emailLabel: 'Почта', playOn: 'Воспроизвести в {provider}',
    days: { monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс' },
    languageLabel: 'Язык', socials: 'Соцсети', close: 'Закрыть', prevPhoto: 'Предыдущее фото', nextPhoto: 'Следующее фото', cards: 'Карточки',
    swipeHint: 'листайте, чтобы увидеть больше', tickets: 'Билеты', tags: 'Категории',
    projects: "Проекты", viewProject: "Открыть проект", credits: "Авторы", backToProfile: "Назад к профилю", projectNotFoundTitle: "Такого проекта нет", projectNotFoundText: "Проверьте ссылку или откройте весь профиль.", projectUnavailableTitle: "Этот проект недоступен", projectUnavailableText: "Владелец ещё не опубликовал его или снял с публикации.", projectDraftBanner: "Предпросмотр: этот проект ещё не опубликован.", video: "Видео",
    links: 'Ссылки',
    report: 'Пожаловаться', reportTitle: 'Пожаловаться на профиль', reportProjectTitle: 'Пожаловаться на проект', reportIntro: 'Расскажите, в чём проблема. Жалобу проверит команда Mycen; владелец не узнает, кто её отправил.', reportReason: 'Причина', reportDetails: 'Подробности (необязательно)', reportSend: 'Отправить жалобу', reportSending: 'Отправка…', reportThanks: 'Спасибо. Мы получили жалобу и рассмотрим её.', reportDuplicate: 'Мы уже получили вашу жалобу на этот профиль и рассматриваем её.', reportLimit: 'Сегодня вы отправили слишком много жалоб. Попробуйте завтра.', reportError: 'Не удалось отправить жалобу. Проверьте подключение и попробуйте ещё раз.', cancel: 'Отмена', rules: 'Правила контента',
    reportReasons: { spam: 'Спам или обманная реклама', scam: 'Мошенничество', impersonation: 'Выдаёт себя за другого человека или бренд', hate: 'Ненависть или травля', violence: 'Насилие или угрозы', sexual: 'Сексуальный контент', illegal: 'Что-то незаконное', other: 'Другое' },
}

export default ui

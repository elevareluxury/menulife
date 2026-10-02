import type { LifeDict } from './es'

const ru: LifeDict = {
  common: {
    cancel: 'Отмена', confirm: 'Подтвердить', save: 'Сохранить', saving: 'Сохранение…', edit: 'Изменить', delete: 'Удалить',
    close: 'Закрыть', search: 'Поиск', saveError: 'Не удалось сохранить. Проверьте подключение и попробуйте снова.', saved: 'Сохранено',
  },
  nav: { life: 'Главная', money: 'Деньги', goals: 'Цели', habits: 'Привычки', brain: 'Brain', settings: 'Настройки' },
  capture: { open: 'Быстрая запись', close: 'Закрыть', idea: 'Идея', note: 'Заметка', task: 'Задача', goal: 'Цель', transaction: 'Операция' },
  home: {
    greetMorning: 'Доброе утро', greetAfternoon: 'Добрый день', greetEvening: 'Добрый вечер',
    myBusiness: 'Мой бизнес', identityTitle: 'Мой профиль', identitySubtitle: 'Ваша цифровая идентичность в одном месте',
    openStudio: 'Открыть Studio', viewProfile: 'Открыть профиль', today: 'Сегодня',
    goalsValue: n => `в работе: ${n}`, habitsValue: (d, t) => `${d}/${t} сегодня`, tasksValue: n => `ожидают: ${n}`,
    recap: '✦ Итоги месяца', settings: 'Настройки', language: 'Язык',
  },
  settings: {
    title: 'Настройки', subtitle: 'Язык, валюта и регион вашего аккаунта.',
    language: 'Язык', languageHelp: 'Используется в Life OS, Studio и вашем профиле.',
    currency: 'Основная валюта', currencyHelp: 'Итоги раздела «Деньги» показываются в этой валюте.',
    extraCurrencies: 'Другие валюты',
    extraHelp: 'Чтобы записывать операции в других валютах (до 5). Они суммируются отдельно: мы не конвертируем суммы.',
    addCurrency: 'Добавить валюту', removeCurrency: c => `Убрать ${c}`, searchCurrency: 'Найти валюту…',
    timezone: 'Часовой пояс', timezoneHelp: 'Определяет, когда начинается и заканчивается ваш день.',
    weekStart: 'Неделя начинается с', monday: 'Понедельник', sunday: 'Воскресенье',
    account: 'Аккаунт', openStudio: 'Открыть Mycen Studio', signOut: 'Выйти', savedOk: 'Настройки сохранены', noResults: 'Ничего не найдено',
  },
  money: {
    title: 'Деньги', add: 'Новая операция', balance: m => `Баланс: ${m}`, otherCurrencies: 'Другие валюты в этом месяце',
    income: 'Доходы', expense: 'Расходы', today: 'Сегодня', yesterday: 'Вчера', net: 'итого',
    emptyTitle: 'Ваши деньги — наглядно', emptyText: 'Записывайте доходы и расходы, чтобы видеть, куда уходят деньги.',
    emptyAction: 'Добавить первую операцию', options: 'Действия', deleteTitle: 'Удалить операцию?',
    deleteText: (k, a, c) => `${k}: ${a}, категория «${c}».`, incomeOne: 'Доход', expenseOne: 'Расход',
  },
  tx: {
    newTitle: 'Новая операция', editTitle: 'Изменить операцию', income: 'Доход', expense: 'Расход', amount: 'Сумма',
    currency: 'Валюта', category: 'Категория', description: 'Описание (необязательно)', descriptionPlaceholder: 'На что потратили?',
    date: 'Дата', invalidAmount: 'Введите корректную сумму', create: 'Записать операцию', update: 'Сохранить изменения',
  },
  categories: {
    Sueldo: 'Зарплата', Freelance: 'Фриланс', Comisiones: 'Комиссии', Ventas: 'Продажи', Inversiones: 'Инвестиции',
    Vivienda: 'Жильё', Transporte: 'Транспорт', Comida: 'Еда', Ocio: 'Досуг', Salud: 'Здоровье',
    Suscripciones: 'Подписки', Ropa: 'Одежда', Otros: 'Другое',
  },
}
export default ru

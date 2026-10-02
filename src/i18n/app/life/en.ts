import type { LifeDict } from './es'

const en: LifeDict = {
  common: {
    cancel: 'Cancel', confirm: 'Confirm', save: 'Save', saving: 'Saving…', edit: 'Edit', delete: 'Delete',
    close: 'Close', search: 'Search', saveError: 'Could not save. Check your connection and try again.', saved: 'Saved',
  },
  nav: { life: 'Home', money: 'Money', goals: 'Goals', habits: 'Habits', brain: 'Brain', settings: 'Settings' },
  capture: { open: 'Capture', close: 'Close', idea: 'Idea', note: 'Note', task: 'Task', goal: 'Goal', transaction: 'Transaction' },
  home: {
    greetMorning: 'Good morning', greetAfternoon: 'Good afternoon', greetEvening: 'Good evening',
    myBusiness: 'My business', identityTitle: 'My identity', identitySubtitle: 'Your digital identity, all in one place',
    openStudio: 'Open Studio', viewProfile: 'View profile', today: 'Today',
    goalsValue: n => `${n} in progress`, habitsValue: (d, t) => `${d}/${t} today`, tasksValue: n => `${n} pending`,
    recap: '✦ See monthly recap', settings: 'Settings', language: 'Language',
  },
  settings: {
    title: 'Settings', subtitle: 'Language, currency and region for your account.',
    language: 'Language', languageHelp: 'Used in Life OS, Studio and your profile.',
    currency: 'Main currency', currencyHelp: 'Your Money totals are shown in this currency.',
    extraCurrencies: 'Other currencies',
    extraHelp: 'To record transactions in other currencies (up to 5). They are totaled separately: we never convert amounts.',
    addCurrency: 'Add currency', removeCurrency: c => `Remove ${c}`, searchCurrency: 'Search currency…',
    timezone: 'Time zone', timezoneHelp: 'Defines when your day starts and ends.',
    weekStart: 'Week starts on', monday: 'Monday', sunday: 'Sunday',
    account: 'Account', openStudio: 'Open Mycen Studio', signOut: 'Sign out', savedOk: 'Settings saved', noResults: 'No results',
  },
  money: {
    title: 'Money', add: 'New transaction', balance: m => `${m} balance`, otherCurrencies: 'Other currencies this month',
    income: 'Income', expense: 'Expenses', today: 'Today', yesterday: 'Yesterday', net: 'net',
    emptyTitle: 'Your money, visible', emptyText: 'Record income and expenses to see where your money goes.',
    emptyAction: 'Add first transaction', options: 'Options', deleteTitle: 'Delete transaction?',
    deleteText: (k, a, c) => `${k} of ${a} in ${c}.`, incomeOne: 'Income', expenseOne: 'Expense',
  },
  tx: {
    newTitle: 'New transaction', editTitle: 'Edit transaction', income: 'Income', expense: 'Expense', amount: 'Amount',
    currency: 'Currency', category: 'Category', description: 'Description (optional)', descriptionPlaceholder: 'What was it for?',
    date: 'Date', invalidAmount: 'Enter a valid amount', create: 'Record transaction', update: 'Save changes',
  },
  categories: {
    Sueldo: 'Salary', Freelance: 'Freelance', Comisiones: 'Commissions', Ventas: 'Sales', Inversiones: 'Investments',
    Vivienda: 'Housing', Transporte: 'Transport', Comida: 'Food', Ocio: 'Leisure', Salud: 'Health',
    Suscripciones: 'Subscriptions', Ropa: 'Clothing', Otros: 'Other',
  },
}
export default en

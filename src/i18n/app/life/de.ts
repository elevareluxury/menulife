import type { LifeDict } from './es'

const de: LifeDict = {
  common: {
    cancel: 'Abbrechen', confirm: 'Bestätigen', save: 'Speichern', saving: 'Wird gespeichert…', edit: 'Bearbeiten', delete: 'Löschen',
    close: 'Schließen', search: 'Suchen', saveError: 'Speichern fehlgeschlagen. Prüfe deine Verbindung und versuche es erneut.', saved: 'Gespeichert',
  },
  nav: { life: 'Start', money: 'Finanzen', goals: 'Ziele', habits: 'Gewohnheiten', brain: 'Brain', settings: 'Einstellungen' },
  capture: { open: 'Erfassen', close: 'Schließen', idea: 'Idee', note: 'Notiz', task: 'Aufgabe', goal: 'Ziel', transaction: 'Buchung' },
  home: {
    greetMorning: 'Guten Morgen', greetAfternoon: 'Guten Tag', greetEvening: 'Guten Abend',
    myBusiness: 'Mein Unternehmen', identityTitle: 'Meine Identität', identitySubtitle: 'Deine digitale Identität, alles an einem Ort',
    openStudio: 'Studio öffnen', viewProfile: 'Profil ansehen', today: 'Heute',
    goalsValue: n => `${n} aktiv`, habitsValue: (d, t) => `${d}/${t} heute`, tasksValue: n => `${n} offen`,
    recap: '✦ Monatsrückblick ansehen', settings: 'Einstellungen', language: 'Sprache',
  },
  settings: {
    title: 'Einstellungen', subtitle: 'Sprache, Währung und Region deines Kontos.',
    language: 'Sprache', languageHelp: 'Wird in Life OS, Studio und deinem Profil verwendet.',
    currency: 'Hauptwährung', currencyHelp: 'Deine Finanz-Summen werden in dieser Währung angezeigt.',
    extraCurrencies: 'Weitere Währungen',
    extraHelp: 'Um Buchungen in anderen Währungen zu erfassen (bis zu 5). Sie werden getrennt summiert: Wir rechnen keine Beträge um.',
    addCurrency: 'Währung hinzufügen', removeCurrency: c => `${c} entfernen`, searchCurrency: 'Währung suchen…',
    timezone: 'Zeitzone', timezoneHelp: 'Legt fest, wann dein Tag beginnt und endet.',
    weekStart: 'Die Woche beginnt am', monday: 'Montag', sunday: 'Sonntag',
    account: 'Konto', openStudio: 'Mycen Studio öffnen', signOut: 'Abmelden', savedOk: 'Einstellungen gespeichert', noResults: 'Keine Ergebnisse',
  },
  money: {
    title: 'Finanzen', add: 'Neue Buchung', balance: m => `Saldo ${m}`, otherCurrencies: 'Weitere Währungen in diesem Monat',
    income: 'Einnahmen', expense: 'Ausgaben', today: 'Heute', yesterday: 'Gestern', net: 'netto',
    emptyTitle: 'Dein Geld im Blick', emptyText: 'Erfasse Einnahmen und Ausgaben, um zu sehen, wohin dein Geld fließt.',
    emptyAction: 'Erste Buchung hinzufügen', options: 'Optionen', deleteTitle: 'Buchung löschen?',
    deleteText: (k, a, c) => `${k} über ${a} in ${c}.`, incomeOne: 'Einnahme', expenseOne: 'Ausgabe',
  },
  tx: {
    newTitle: 'Neue Buchung', editTitle: 'Buchung bearbeiten', income: 'Einnahme', expense: 'Ausgabe', amount: 'Betrag',
    currency: 'Währung', category: 'Kategorie', description: 'Beschreibung (optional)', descriptionPlaceholder: 'Wofür war es?',
    date: 'Datum', invalidAmount: 'Gib einen gültigen Betrag ein', create: 'Buchung speichern', update: 'Änderungen speichern',
  },
  categories: {
    Sueldo: 'Gehalt', Freelance: 'Freelance', Comisiones: 'Provisionen', Ventas: 'Verkäufe', Inversiones: 'Investitionen',
    Vivienda: 'Wohnen', Transporte: 'Mobilität', Comida: 'Essen', Ocio: 'Freizeit', Salud: 'Gesundheit',
    Suscripciones: 'Abos', Ropa: 'Kleidung', Otros: 'Sonstiges',
  },
}
export default de

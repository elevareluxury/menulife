import type { LifeDict } from './es'

const it: LifeDict = {
  common: {
    cancel: 'Annulla', confirm: 'Conferma', save: 'Salva', saving: 'Salvataggio…', edit: 'Modifica', delete: 'Elimina',
    close: 'Chiudi', search: 'Cerca', saveError: 'Impossibile salvare. Controlla la connessione e riprova.', saved: 'Salvato',
  },
  nav: { life: 'Home', money: 'Soldi', goals: 'Obiettivi', habits: 'Abitudini', brain: 'Brain', settings: 'Impostazioni' },
  capture: { open: 'Cattura', close: 'Chiudi', idea: 'Idea', note: 'Nota', task: 'Attività', goal: 'Obiettivo', transaction: 'Movimento' },
  home: {
    greetMorning: 'Buongiorno', greetAfternoon: 'Buon pomeriggio', greetEvening: 'Buonasera',
    myBusiness: 'La mia attività', identityTitle: 'La mia identità', identitySubtitle: 'La tua identità digitale, tutta in un unico posto',
    openStudio: 'Apri Studio', viewProfile: 'Vedi profilo', today: 'Oggi',
    goalsValue: n => `${n} in corso`, habitsValue: (d, t) => `${d}/${t} oggi`, tasksValue: n => `${n} in sospeso`,
    recap: '✦ Vedi il riepilogo del mese', settings: 'Impostazioni', language: 'Lingua',
  },
  settings: {
    title: 'Impostazioni', subtitle: 'Lingua, valuta e regione del tuo account.',
    language: 'Lingua', languageHelp: 'Usata in Life OS, Studio e nel tuo profilo.',
    currency: 'Valuta principale', currencyHelp: 'I totali di Soldi sono mostrati in questa valuta.',
    extraCurrencies: 'Altre valute',
    extraHelp: 'Per registrare movimenti in altre valute (fino a 5). Si sommano separatamente: non convertiamo gli importi.',
    addCurrency: 'Aggiungi valuta', removeCurrency: c => `Rimuovi ${c}`, searchCurrency: 'Cerca valuta…',
    timezone: 'Fuso orario', timezoneHelp: 'Definisce quando inizia e finisce la tua giornata.',
    weekStart: 'La settimana inizia di', monday: 'Lunedì', sunday: 'Domenica',
    account: 'Account', openStudio: 'Apri Mycen Studio', signOut: 'Esci', savedOk: 'Impostazioni salvate', noResults: 'Nessun risultato',
  },
  money: {
    title: 'Soldi', add: 'Nuovo movimento', balance: m => `Saldo di ${m}`, otherCurrencies: 'Altre valute questo mese',
    income: 'Entrate', expense: 'Uscite', today: 'Oggi', yesterday: 'Ieri', net: 'netto',
    emptyTitle: 'I tuoi soldi, in chiaro', emptyText: 'Registra entrate e uscite per vedere dove vanno i tuoi soldi.',
    emptyAction: 'Aggiungi il primo movimento', options: 'Opzioni', deleteTitle: 'Eliminare il movimento?',
    deleteText: (k, a, c) => `${k} di ${a} in ${c}.`, incomeOne: 'Entrata', expenseOne: 'Uscita',
  },
  tx: {
    newTitle: 'Nuovo movimento', editTitle: 'Modifica movimento', income: 'Entrata', expense: 'Uscita', amount: 'Importo',
    currency: 'Valuta', category: 'Categoria', description: 'Descrizione (facoltativa)', descriptionPlaceholder: 'A cosa è servito?',
    date: 'Data', invalidAmount: 'Inserisci un importo valido', create: 'Registra movimento', update: 'Salva modifiche',
  },
  categories: {
    Sueldo: 'Stipendio', Freelance: 'Freelance', Comisiones: 'Commissioni', Ventas: 'Vendite', Inversiones: 'Investimenti',
    Vivienda: 'Casa', Transporte: 'Trasporti', Comida: 'Cibo', Ocio: 'Tempo libero', Salud: 'Salute',
    Suscripciones: 'Abbonamenti', Ropa: 'Abbigliamento', Otros: 'Altro',
  },
}
export default it

import type { LifeDict } from './es'

const hi: LifeDict = {
  common: {
    cancel: 'रद्द करें', confirm: 'पुष्टि करें', save: 'सहेजें', saving: 'सहेजा जा रहा है…', edit: 'संपादित करें', delete: 'हटाएँ',
    close: 'बंद करें', search: 'खोजें', saveError: 'सहेजा नहीं जा सका। अपना कनेक्शन जाँचें और फिर से कोशिश करें।', saved: 'सहेजा गया',
  },
  nav: { life: 'होम', money: 'पैसा', goals: 'लक्ष्य', habits: 'आदतें', brain: 'Brain', settings: 'सेटिंग्स' },
  capture: { open: 'जल्दी नोट करें', close: 'बंद करें', idea: 'विचार', note: 'नोट', task: 'काम', goal: 'लक्ष्य', transaction: 'लेन-देन' },
  home: {
    greetMorning: 'सुप्रभात', greetAfternoon: 'नमस्कार', greetEvening: 'शुभ संध्या',
    myBusiness: 'मेरा व्यवसाय', identityTitle: 'मेरी पहचान', identitySubtitle: 'आपकी डिजिटल पहचान, सब कुछ एक जगह',
    openStudio: 'Studio खोलें', viewProfile: 'प्रोफ़ाइल देखें', today: 'आज',
    goalsValue: n => `${n} जारी`, habitsValue: (d, t) => `आज ${d}/${t}`, tasksValue: n => `${n} बाकी`,
    recap: '✦ इस महीने का सार देखें', settings: 'सेटिंग्स', language: 'भाषा',
  },
  settings: {
    title: 'सेटिंग्स', subtitle: 'आपके खाते की भाषा, मुद्रा और क्षेत्र।',
    language: 'भाषा', languageHelp: 'Life OS, Studio और आपकी प्रोफ़ाइल में इस्तेमाल होती है।',
    currency: 'मुख्य मुद्रा', currencyHelp: 'पैसे के कुल योग इसी मुद्रा में दिखते हैं।',
    extraCurrencies: 'अन्य मुद्राएँ',
    extraHelp: 'दूसरी मुद्राओं में लेन-देन दर्ज करने के लिए (अधिकतम 5)। इन्हें अलग-अलग जोड़ा जाता है: हम राशियों को नहीं बदलते।',
    addCurrency: 'मुद्रा जोड़ें', removeCurrency: c => `${c} हटाएँ`, searchCurrency: 'मुद्रा खोजें…',
    timezone: 'समय क्षेत्र', timezoneHelp: 'तय करता है कि आपका दिन कब शुरू और खत्म होता है।',
    weekStart: 'सप्ताह शुरू होता है', monday: 'सोमवार', sunday: 'रविवार',
    account: 'खाता', openStudio: 'Mycen Studio खोलें', signOut: 'साइन आउट करें', savedOk: 'सेटिंग्स सहेजी गईं', noResults: 'कोई परिणाम नहीं',
  },
  money: {
    title: 'पैसा', add: 'नया लेन-देन', balance: m => `${m} का बैलेंस`, otherCurrencies: 'इस महीने अन्य मुद्राएँ',
    income: 'आय', expense: 'खर्च', today: 'आज', yesterday: 'कल', net: 'शुद्ध',
    emptyTitle: 'आपका पैसा, साफ़ नज़र में', emptyText: 'आय और खर्च दर्ज करें और देखें कि आपका पैसा कहाँ जाता है।',
    emptyAction: 'पहला लेन-देन जोड़ें', options: 'विकल्प', deleteTitle: 'लेन-देन हटाएँ?',
    deleteText: (k, a, c) => `${c} में ${a} का ${k}।`, incomeOne: 'आय', expenseOne: 'खर्च',
  },
  tx: {
    newTitle: 'नया लेन-देन', editTitle: 'लेन-देन संपादित करें', income: 'आय', expense: 'खर्च', amount: 'राशि',
    currency: 'मुद्रा', category: 'श्रेणी', description: 'विवरण (वैकल्पिक)', descriptionPlaceholder: 'यह किसलिए था?',
    date: 'तारीख', invalidAmount: 'मान्य राशि दर्ज करें', create: 'लेन-देन दर्ज करें', update: 'बदलाव सहेजें',
  },
  categories: {
    Sueldo: 'वेतन', Freelance: 'फ्रीलांस', Comisiones: 'कमीशन', Ventas: 'बिक्री', Inversiones: 'निवेश',
    Vivienda: 'आवास', Transporte: 'यातायात', Comida: 'खाना', Ocio: 'मनोरंजन', Salud: 'स्वास्थ्य',
    Suscripciones: 'सदस्यताएँ', Ropa: 'कपड़े', Otros: 'अन्य',
  },
}
export default hi

import type { LifeDict } from './es'

const fr: LifeDict = {
  common: {
    cancel: 'Annuler', confirm: 'Confirmer', save: 'Enregistrer', saving: 'Enregistrement…', edit: 'Modifier', delete: 'Supprimer',
    close: 'Fermer', search: 'Rechercher', saveError: 'Enregistrement impossible. Vérifiez votre connexion et réessayez.', saved: 'Enregistré',
  },
  nav: { life: 'Accueil', money: 'Argent', goals: 'Objectifs', habits: 'Habitudes', brain: 'Brain', settings: 'Réglages' },
  capture: { open: 'Capturer', close: 'Fermer', idea: 'Idée', note: 'Note', task: 'Tâche', goal: 'Objectif', transaction: 'Opération' },
  home: {
    greetMorning: 'Bonjour', greetAfternoon: 'Bon après-midi', greetEvening: 'Bonsoir',
    myBusiness: 'Mon entreprise', identityTitle: 'Mon identité', identitySubtitle: 'Votre identité numérique, réunie en un seul lieu',
    openStudio: 'Ouvrir Studio', viewProfile: 'Voir le profil', today: 'Aujourd’hui',
    goalsValue: n => `${n} en cours`, habitsValue: (d, t) => `${d}/${t} aujourd’hui`, tasksValue: n => `${n} en attente`,
    recap: '✦ Voir le récap du mois', settings: 'Réglages', language: 'Langue',
  },
  settings: {
    title: 'Réglages', subtitle: 'Langue, devise et région de votre compte.',
    language: 'Langue', languageHelp: 'Utilisée dans Life OS, Studio et votre profil.',
    currency: 'Devise principale', currencyHelp: 'Vos totaux d’Argent s’affichent dans cette devise.',
    extraCurrencies: 'Autres devises',
    extraHelp: 'Pour enregistrer des opérations dans d’autres devises (jusqu’à 5). Elles sont totalisées séparément : nous ne convertissons jamais les montants.',
    addCurrency: 'Ajouter une devise', removeCurrency: c => `Retirer ${c}`, searchCurrency: 'Rechercher une devise…',
    timezone: 'Fuseau horaire', timezoneHelp: 'Définit quand votre journée commence et se termine.',
    weekStart: 'La semaine commence le', monday: 'Lundi', sunday: 'Dimanche',
    account: 'Compte', openStudio: 'Ouvrir Mycen Studio', signOut: 'Se déconnecter', savedOk: 'Réglages enregistrés', noResults: 'Aucun résultat',
  },
  money: {
    title: 'Argent', add: 'Nouvelle opération', balance: m => `Solde de ${m}`, otherCurrencies: 'Autres devises ce mois-ci',
    income: 'Revenus', expense: 'Dépenses', today: 'Aujourd’hui', yesterday: 'Hier', net: 'net',
    emptyTitle: 'Votre argent, en clair', emptyText: 'Enregistrez revenus et dépenses pour voir où va votre argent.',
    emptyAction: 'Ajouter une première opération', options: 'Options', deleteTitle: 'Supprimer l’opération ?',
    deleteText: (k, a, c) => `${k} de ${a} en ${c}.`, incomeOne: 'Revenu', expenseOne: 'Dépense',
  },
  tx: {
    newTitle: 'Nouvelle opération', editTitle: 'Modifier l’opération', income: 'Revenu', expense: 'Dépense', amount: 'Montant',
    currency: 'Devise', category: 'Catégorie', description: 'Description (facultatif)', descriptionPlaceholder: 'C’était pour quoi ?',
    date: 'Date', invalidAmount: 'Saisissez un montant valide', create: 'Enregistrer l’opération', update: 'Enregistrer les modifications',
  },
  categories: {
    Sueldo: 'Salaire', Freelance: 'Freelance', Comisiones: 'Commissions', Ventas: 'Ventes', Inversiones: 'Investissements',
    Vivienda: 'Logement', Transporte: 'Transport', Comida: 'Alimentation', Ocio: 'Loisirs', Salud: 'Santé',
    Suscripciones: 'Abonnements', Ropa: 'Vêtements', Otros: 'Autres',
  },
}
export default fr

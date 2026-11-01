import type { UiStrings } from '../profileI18n'

// Textos de la página pública en fr (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'Ouvert', closedNow: 'Fermé', share: 'Partager', linkCopied: 'Lien copié',
    saveContact: 'Enregistrer le contact', contact: 'Contact', location: 'Adresse', howToGet: 'Itinéraire',
    hours: 'Horaires', closed: 'Fermé', gallery: 'Galerie', reviews: 'Avis', seeOnGoogle: 'Voir sur Google',
    reviewsCount: 'avis',
    notFoundTitle: 'Ce profil n’existe pas', notFoundText: 'Vérifiez le lien ou créez votre propre identité sur Mycen.',
    unavailableTitle: 'Ce profil n’est pas disponible', unavailableText: 'Son propriétaire ne l’a pas encore publié ou l’a mis en pause.',
    errorTitle: 'Impossible de charger le profil', errorText: 'Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer', createYours: 'Créez votre Mycen', draftBanner: 'Aperçu : ce profil n’est pas encore public.',
    footer: 'Une identité Mycen',
    verified: 'Compte vérifié', available: 'Disponible', moreAboutMe: 'En savoir plus', createIdentity: 'Créez votre identité', createFree: 'Créez votre Mycen gratuitement', call: 'Appeler', copyLink: 'Copier le lien', qrCode: 'Code QR', moreOptions: 'Plus d’options', backToTop: 'Retour en haut', votesCount: "{n} votes", oneVote: "1 vote", noVotes: "Aucun vote pour l’instant : le vôtre est le premier", yourVote: "Votre vote", download: "Télécharger", copyCode: "Copier le code", codeCopied: "Code copié", validUntil: "Valable jusqu’au {date}", useCoupon: "Utiliser le coupon", listen: "Écouter", nearest: "Voir la plus proche", nearestBusy: "Recherche de votre position…", nearestDone: "Triées par distance", nearestFail: "Impossible de connaître votre position. Vérifiez l’autorisation de localisation.", nearestPrivate: "Votre position ne quitte pas votre téléphone.", pause: "Pause", videos: "Vidéos", podcast: "Podcast", episodes: "Épisodes", emailLabel: 'E-mail', playOn: 'Lire sur {provider}',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim' },
    languageLabel: 'Langue', socials: 'Réseaux sociaux', close: 'Fermer', prevPhoto: 'Photo précédente', nextPhoto: 'Photo suivante', cards: 'Cartes',
    swipeHint: 'faites glisser pour voir plus', tickets: 'Billets', tags: 'Catégories',
    projects: "Projets", viewProject: "Voir le projet", credits: "Crédits", backToProfile: "Retour au profil", projectNotFoundTitle: "Ce projet n’existe pas", projectNotFoundText: "Vérifiez le lien ou consultez le profil complet.", projectUnavailableTitle: "Ce projet n’est pas disponible", projectUnavailableText: "Son propriétaire ne l’a pas encore publié ou l’a dépublié.", projectDraftBanner: "Aperçu : ce projet n’est pas encore public.", video: "Vidéo",
    links: 'Liens',
    report: 'Signaler', reportTitle: 'Signaler ce profil', reportProjectTitle: 'Signaler ce projet', reportIntro: 'Dites-nous ce qui ne va pas. L’équipe Mycen examine le signalement ; le propriétaire ne saura pas qui l’a fait.', reportReason: 'Motif', reportDetails: 'Détails (facultatif)', reportSend: 'Envoyer le signalement', reportSending: 'Envoi…', reportThanks: 'Merci. Nous avons reçu votre signalement et allons l’examiner.', reportDuplicate: 'Nous avons déjà reçu votre signalement sur ce profil. Il est en cours d’examen.', reportLimit: 'Vous avez envoyé beaucoup de signalements aujourd’hui. Réessayez demain.', reportError: 'Impossible d’envoyer le signalement. Vérifiez votre connexion et réessayez.', cancel: 'Annuler', rules: 'Règles de contenu',
    reportReasons: { spam: 'Spam ou publicité trompeuse', scam: 'Arnaque ou fraude', impersonation: 'Usurpe l’identité d’une personne ou d’une marque', hate: 'Haine ou harcèlement', violence: 'Violence ou menaces', sexual: 'Contenu sexuel', illegal: 'Quelque chose d’illégal', other: 'Autre motif' },
}

export default ui

import type { UiStrings } from '../profileI18n'

// Textos de la página pública en de (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'Jetzt geöffnet', closedNow: 'Jetzt geschlossen', share: 'Teilen', linkCopied: 'Link kopiert',
    saveContact: 'Kontakt speichern', contact: 'Kontakt', location: 'Standort', howToGet: 'Route',
    hours: 'Öffnungszeiten', closed: 'Geschlossen', gallery: 'Galerie', reviews: 'Bewertungen', seeOnGoogle: 'Auf Google ansehen',
    reviewsCount: 'Bewertungen',
    notFoundTitle: 'Dieses Profil existiert nicht', notFoundText: 'Prüfe den Link oder erstelle deine eigene Identität auf Mycen.',
    unavailableTitle: 'Dieses Profil ist nicht verfügbar', unavailableText: 'Der Inhaber hat es noch nicht veröffentlicht oder vorübergehend pausiert.',
    errorTitle: 'Das Profil konnte nicht geladen werden', errorText: 'Prüfe deine Verbindung und versuche es erneut.',
    retry: 'Erneut versuchen', createYours: 'Erstelle dein Mycen', draftBanner: 'Vorschau: Dieses Profil ist noch nicht öffentlich.',
    footer: 'Eine Mycen-Identität',
    verified: 'Verifiziertes Konto', available: 'Verfügbar', moreAboutMe: 'Mehr über mich', createIdentity: 'Erstelle deine Identität', createFree: 'Erstelle dein Mycen kostenlos', call: 'Anrufen', copyLink: 'Link kopieren', qrCode: 'QR-Code', moreOptions: 'Weitere Optionen', backToTop: 'Nach oben', emailLabel: 'E-Mail', playOn: 'Auf {provider} abspielen',
    days: { monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So' },
    languageLabel: 'Sprache', socials: 'Soziale Netzwerke', close: 'Schließen', prevPhoto: 'Vorheriges Foto', nextPhoto: 'Nächstes Foto', cards: 'Karten',
    swipeHint: 'wischen für mehr', tickets: 'Tickets', tags: 'Kategorien',
    projects: "Projekte", viewProject: "Projekt ansehen", credits: "Credits", backToProfile: "Zurück zum Profil", projectNotFoundTitle: "Dieses Projekt gibt es nicht", projectNotFoundText: "Prüfe den Link oder sieh dir das ganze Profil an.", projectUnavailableTitle: "Dieses Projekt ist nicht verfügbar", projectUnavailableText: "Der Inhaber hat es noch nicht veröffentlicht oder wieder zurückgezogen.", projectDraftBanner: "Vorschau: Dieses Projekt ist noch nicht öffentlich.", video: "Video",
    links: 'Links',
    report: 'Melden', reportTitle: 'Dieses Profil melden', reportProjectTitle: 'Dieses Projekt melden', reportIntro: 'Sag uns, was los ist. Das Mycen-Team prüft es; der Inhaber erfährt nicht, wer gemeldet hat.', reportReason: 'Grund', reportDetails: 'Details (optional)', reportSend: 'Meldung senden', reportSending: 'Wird gesendet…', reportThanks: 'Danke. Wir haben deine Meldung erhalten und prüfen sie.', reportDuplicate: 'Wir haben deine Meldung zu diesem Profil schon erhalten und prüfen sie.', reportLimit: 'Du hast heute viele Meldungen gesendet. Versuch es morgen wieder.', reportError: 'Die Meldung konnte nicht gesendet werden. Prüfe deine Verbindung und versuch es erneut.', cancel: 'Abbrechen', rules: 'Inhaltsregeln',
    reportReasons: { spam: 'Spam oder irreführende Werbung', scam: 'Betrug', impersonation: 'Gibt sich als jemand anderes oder eine Marke aus', hate: 'Hass oder Belästigung', violence: 'Gewalt oder Drohungen', sexual: 'Sexuelle Inhalte', illegal: 'Etwas Illegales', other: 'Etwas anderes' },
}

export default ui

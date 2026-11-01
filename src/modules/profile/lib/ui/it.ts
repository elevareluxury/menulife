import type { UiStrings } from '../profileI18n'

// Textos de la página pública en it (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'Aperto ora', closedNow: 'Chiuso ora', share: 'Condividi', linkCopied: 'Link copiato',
    saveContact: 'Salva contatto', contact: 'Contatti', location: 'Posizione', howToGet: 'Indicazioni',
    hours: 'Orari', closed: 'Chiuso', gallery: 'Galleria', reviews: 'Recensioni', seeOnGoogle: 'Vedi su Google',
    reviewsCount: 'recensioni',
    notFoundTitle: 'Questo profilo non esiste', notFoundText: 'Controlla il link o crea la tua identità su Mycen.',
    unavailableTitle: 'Questo profilo non è disponibile', unavailableText: 'Il proprietario non l’ha ancora pubblicato o l’ha messo in pausa.',
    errorTitle: 'Impossibile caricare il profilo', errorText: 'Controlla la connessione e riprova.',
    retry: 'Riprova', createYours: 'Crea il tuo Mycen', draftBanner: 'Anteprima: questo profilo non è ancora pubblico.',
    footer: 'Un’identità Mycen',
    verified: 'Account verificato', available: 'Disponibile', moreAboutMe: 'Di più su di me', createIdentity: 'Crea la tua identità', createFree: 'Crea il tuo Mycen gratis', call: 'Chiama', copyLink: 'Copia link', qrCode: 'Codice QR', moreOptions: 'Altre opzioni', backToTop: 'Torna su', emailLabel: 'Email', playOn: 'Riproduci su {provider}',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Gio', friday: 'Ven', saturday: 'Sab', sunday: 'Dom' },
    languageLabel: 'Lingua', socials: 'Social network', close: 'Chiudi', prevPhoto: 'Foto precedente', nextPhoto: 'Foto successiva', cards: 'Schede',
    swipeHint: 'scorri per vedere altro', tickets: 'Biglietti', tags: 'Categorie',
    projects: "Progetti", viewProject: "Vedi progetto", credits: "Crediti", backToProfile: "Torna al profilo", projectNotFoundTitle: "Questo progetto non esiste", projectNotFoundText: "Controlla il link o guarda il profilo completo.", projectUnavailableTitle: "Questo progetto non è disponibile", projectUnavailableText: "Il proprietario non l’ha ancora pubblicato o l’ha ritirato.", projectDraftBanner: "Anteprima: questo progetto non è ancora pubblico.", video: "Video",
    links: 'Link',
    report: 'Segnala', reportTitle: 'Segnala questo profilo', reportProjectTitle: 'Segnala questo progetto', reportIntro: 'Dicci cosa succede. Il team di Mycen lo verifica; il proprietario non saprà chi ha segnalato.', reportReason: 'Motivo', reportDetails: 'Dettagli (facoltativo)', reportSend: 'Invia segnalazione', reportSending: 'Invio…', reportThanks: 'Grazie. Abbiamo ricevuto la tua segnalazione e la esamineremo.', reportDuplicate: 'Abbiamo già ricevuto la tua segnalazione su questo profilo. La stiamo esaminando.', reportLimit: 'Hai inviato molte segnalazioni oggi. Riprova domani.', reportError: 'Non siamo riusciti a inviare la segnalazione. Controlla la connessione e riprova.', cancel: 'Annulla', rules: 'Regole sui contenuti',
    reportReasons: { spam: 'Spam o pubblicità ingannevole', scam: 'Truffa o frode', impersonation: 'Si spaccia per un’altra persona o un marchio', hate: 'Odio o molestie', violence: 'Violenza o minacce', sexual: 'Contenuti sessuali', illegal: 'Qualcosa di illegale', other: 'Altro motivo' },
}

export default ui

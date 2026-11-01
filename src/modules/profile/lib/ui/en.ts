import type { UiStrings } from '../profileI18n'

// Textos de la página pública en en (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'Open now', closedNow: 'Closed now', share: 'Share', linkCopied: 'Link copied',
    saveContact: 'Save contact', contact: 'Contact', location: 'Location', howToGet: 'Get directions',
    hours: 'Hours', closed: 'Closed', gallery: 'Gallery', reviews: 'Reviews', seeOnGoogle: 'See on Google',
    reviewsCount: 'reviews',
    notFoundTitle: 'This profile does not exist', notFoundText: 'Check the link or create your own identity on Mycen.',
    unavailableTitle: 'This profile is not available', unavailableText: 'Its owner has not published it yet or paused it for now.',
    errorTitle: 'We could not load this profile', errorText: 'Check your connection and try again.',
    retry: 'Try again', createYours: 'Create your Mycen', draftBanner: 'Preview: this profile is not public yet.',
    footer: 'A Mycen identity',
    verified: 'Verified account', available: 'Available', moreAboutMe: 'More about me', createIdentity: 'Create your identity', createFree: 'Create your Mycen for free', call: 'Call', copyLink: 'Copy link', qrCode: 'QR code', moreOptions: 'More options', backToTop: 'Back to top', votesCount: "{n} votes", oneVote: "1 vote", noVotes: "No votes yet: yours is the first", yourVote: "Your vote", download: "Download", copyCode: "Copy code", codeCopied: "Code copied", validUntil: "Valid until {date}", useCoupon: "Use the coupon", listen: "Listen", nearest: "Show the nearest", nearestBusy: "Finding where you are…", nearestDone: "Sorted by distance", nearestFail: "We couldn’t get your location. Check the location permission.", nearestPrivate: "Your location never leaves your phone.", pause: "Pause", videos: "Videos", podcast: "Podcast", episodes: "Episodes", emailLabel: 'Email', playOn: 'Play on {provider}',
    days: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
    languageLabel: 'Language', socials: 'Social networks', close: 'Close', prevPhoto: 'Previous photo', nextPhoto: 'Next photo', cards: 'Cards',
    swipeHint: 'swipe to see more', tickets: 'Tickets', tags: 'Categories',
    projects: "Projects", viewProject: "View project", credits: "Credits", backToProfile: "Back to profile", projectNotFoundTitle: "This project does not exist", projectNotFoundText: "Check the link or see the full profile.", projectUnavailableTitle: "This project is not available", projectUnavailableText: "Its owner hasn’t published it yet or unpublished it.", projectDraftBanner: "Preview: this project is not public yet.", video: "Video",
    links: 'Links',
    report: 'Report', reportTitle: 'Report this profile', reportProjectTitle: 'Report this project', reportIntro: 'Tell us what’s wrong. The Mycen team reviews it; the owner won’t know who reported.', reportReason: 'Reason', reportDetails: 'Details (optional)', reportSend: 'Send report', reportSending: 'Sending…', reportThanks: 'Thanks. We received your report and will review it.', reportDuplicate: 'We already received your report about this profile. We’re reviewing it.', reportLimit: 'You’ve sent many reports today. Try again tomorrow.', reportError: 'We couldn’t send the report. Check your connection and try again.', cancel: 'Cancel', rules: 'Content rules',
    reportReasons: { spam: 'Spam or misleading ads', scam: 'Scam or fraud', impersonation: 'Impersonates someone else or a brand', hate: 'Hate or harassment', violence: 'Violence or threats', sexual: 'Sexual content', illegal: 'Something illegal', other: 'Something else' },
}

export default ui

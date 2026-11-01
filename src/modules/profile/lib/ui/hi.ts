import type { UiStrings } from '../profileI18n'

// Textos de la página pública en hi (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'अभी खुला है', closedNow: 'अभी बंद है', share: 'शेयर करें', linkCopied: 'लिंक कॉपी हो गया',
    saveContact: 'संपर्क सहेजें', contact: 'संपर्क', location: 'पता', howToGet: 'रास्ता देखें',
    hours: 'समय', closed: 'बंद', gallery: 'गैलरी', reviews: 'समीक्षाएँ', seeOnGoogle: 'Google पर देखें',
    reviewsCount: 'समीक्षाएँ',
    notFoundTitle: 'यह प्रोफ़ाइल मौजूद नहीं है', notFoundText: 'लिंक जाँचें या Mycen पर अपनी पहचान बनाएँ।',
    unavailableTitle: 'यह प्रोफ़ाइल उपलब्ध नहीं है', unavailableText: 'इसके मालिक ने इसे अभी प्रकाशित नहीं किया है या अस्थायी रूप से रोक दिया है।',
    errorTitle: 'प्रोफ़ाइल लोड नहीं हो सकी', errorText: 'अपना कनेक्शन जाँचें और फिर से कोशिश करें।',
    retry: 'फिर से कोशिश करें', createYours: 'अपना Mycen बनाएँ', draftBanner: 'पूर्वावलोकन: यह प्रोफ़ाइल अभी सार्वजनिक नहीं है।',
    footer: 'एक Mycen पहचान',
    verified: 'सत्यापित खाता', available: 'उपलब्ध', moreAboutMe: 'मेरे बारे में और', createIdentity: 'अपनी पहचान बनाएं', createFree: 'अपना Mycen मुफ़्त बनाएं', call: 'कॉल करें', copyLink: 'लिंक कॉपी करें', qrCode: 'QR कोड', moreOptions: 'और विकल्प', backToTop: 'ऊपर जाएँ', votesCount: "{n} वोट", oneVote: "1 वोट", noVotes: "अभी कोई वोट नहीं: पहला वोट आपका", yourVote: "आपका वोट", download: "डाउनलोड करें", copyCode: "कोड कॉपी करें", codeCopied: "कोड कॉपी हो गया", validUntil: "{date} तक मान्य", useCoupon: "कूपन इस्तेमाल करें", listen: "सुनें", nearest: "सबसे नज़दीकी देखें", nearestBusy: "आपकी जगह ढूंढ रहे हैं…", nearestDone: "दूरी के हिसाब से क्रम में", nearestFail: "आपकी जगह पता नहीं चल सकी। लोकेशन की अनुमति जांचें।", nearestPrivate: "आपकी लोकेशन आपके फ़ोन से बाहर नहीं जाती।", pause: "रोकें", videos: "वीडियो", podcast: "पॉडकास्ट", episodes: "एपिसोड", emailLabel: 'ईमेल', playOn: '{provider} पर चलाएं',
    days: { monday: 'सोम', tuesday: 'मंगल', wednesday: 'बुध', thursday: 'गुरु', friday: 'शुक्र', saturday: 'शनि', sunday: 'रवि' },
    languageLabel: 'भाषा', socials: 'सोशल मीडिया', close: 'बंद करें', prevPhoto: 'पिछली फ़ोटो', nextPhoto: 'अगली फ़ोटो', cards: 'कार्ड',
    swipeHint: 'और देखने के लिए स्वाइप करें', tickets: 'टिकट', tags: 'श्रेणियाँ',
    projects: "प्रोजेक्ट", viewProject: "प्रोजेक्ट देखें", credits: "श्रेय", backToProfile: "प्रोफ़ाइल पर वापस", projectNotFoundTitle: "यह प्रोजेक्ट मौजूद नहीं है", projectNotFoundText: "लिंक जाँचें या पूरी प्रोफ़ाइल देखें।", projectUnavailableTitle: "यह प्रोजेक्ट उपलब्ध नहीं है", projectUnavailableText: "इसके मालिक ने इसे अभी प्रकाशित नहीं किया है या हटा दिया है।", projectDraftBanner: "पूर्वावलोकन: यह प्रोजेक्ट अभी सार्वजनिक नहीं है।", video: "वीडियो",
    links: 'लिंक',
    report: 'रिपोर्ट करें', reportTitle: 'यह प्रोफ़ाइल रिपोर्ट करें', reportProjectTitle: 'यह प्रोजेक्ट रिपोर्ट करें', reportIntro: 'बताएँ क्या गलत है। Mycen टीम इसकी समीक्षा करती है; मालिक को पता नहीं चलेगा कि रिपोर्ट किसने की।', reportReason: 'कारण', reportDetails: 'विवरण (वैकल्पिक)', reportSend: 'रिपोर्ट भेजें', reportSending: 'भेजा जा रहा है…', reportThanks: 'धन्यवाद। हमें आपकी रिपोर्ट मिल गई है और हम इसकी समीक्षा करेंगे।', reportDuplicate: 'इस प्रोफ़ाइल पर आपकी रिपोर्ट हमें पहले ही मिल चुकी है। हम समीक्षा कर रहे हैं।', reportLimit: 'आज आपने बहुत सारी रिपोर्ट भेजी हैं। कल फिर से कोशिश करें।', reportError: 'रिपोर्ट नहीं भेजी जा सकी। कनेक्शन जाँचें और फिर से कोशिश करें।', cancel: 'रद्द करें', rules: 'सामग्री के नियम',
    reportReasons: { spam: 'स्पैम या भ्रामक विज्ञापन', scam: 'धोखाधड़ी', impersonation: 'किसी और व्यक्ति या ब्रांड का रूप धारण', hate: 'नफ़रत या उत्पीड़न', violence: 'हिंसा या धमकी', sexual: 'यौन सामग्री', illegal: 'कुछ गैर-कानूनी', other: 'कुछ और' },
}

export default ui

import type { UiStrings } from '../profileI18n'

// Textos de la página pública en ar (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'مفتوح الآن', closedNow: 'مغلق الآن', share: 'مشاركة', linkCopied: 'تم نسخ الرابط',
    saveContact: 'حفظ جهة الاتصال', contact: 'التواصل', location: 'الموقع', howToGet: 'الاتجاهات',
    hours: 'ساعات العمل', closed: 'مغلق', gallery: 'المعرض', reviews: 'التقييمات', seeOnGoogle: 'عرض على Google',
    reviewsCount: 'تقييمات',
    notFoundTitle: 'هذا الملف غير موجود', notFoundText: 'تحقّق من الرابط أو أنشئ هويتك الخاصة على Mycen.',
    unavailableTitle: 'هذا الملف غير متاح', unavailableText: 'لم ينشره صاحبه بعد أو أوقفه مؤقتًا.',
    errorTitle: 'تعذّر تحميل الملف', errorText: 'تحقّق من اتصالك وحاول مرة أخرى.',
    retry: 'إعادة المحاولة', createYours: 'أنشئ Mycen الخاص بك', draftBanner: 'معاينة: هذا الملف ليس عامًا بعد.',
    footer: 'هوية Mycen',
    verified: 'حساب موثّق', available: 'متاح', moreAboutMe: 'المزيد عني', createIdentity: 'أنشئ هويتك', createFree: 'أنشئ Mycen الخاص بك مجانًا', call: 'اتصال', copyLink: 'نسخ الرابط', qrCode: 'رمز QR', moreOptions: 'خيارات أخرى', backToTop: 'العودة للأعلى', votesCount: "{n} صوت", oneVote: "صوت واحد", noVotes: "لا توجد أصوات بعد: صوتك هو الأول", yourVote: "صوتك", download: "تنزيل", copyCode: "نسخ الرمز", codeCopied: "تم نسخ الرمز", validUntil: "صالح حتى {date}", useCoupon: "استخدم القسيمة", listen: "استمع", nearest: "عرض الأقرب", nearestBusy: "جارٍ تحديد موقعك…", nearestDone: "مرتّبة حسب القرب", nearestFail: "تعذّر تحديد موقعك. تحقّق من إذن الموقع.", nearestPrivate: "موقعك لا يغادر هاتفك.", pause: "إيقاف مؤقت", videos: "فيديوهات", podcast: "بودكاست", episodes: "الحلقات", emailLabel: 'البريد', playOn: 'تشغيل على {provider}',
    days: { monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد' },
    languageLabel: 'اللغة', socials: 'وسائل التواصل', close: 'إغلاق', prevPhoto: 'الصورة السابقة', nextPhoto: 'الصورة التالية', cards: 'بطاقات',
    swipeHint: 'اسحب لرؤية المزيد', tickets: 'التذاكر', tags: 'الفئات',
    projects: "المشاريع", viewProject: "عرض المشروع", credits: "الاعتمادات", backToProfile: "العودة إلى الملف", projectNotFoundTitle: "هذا المشروع غير موجود", projectNotFoundText: "تحقق من الرابط أو اطّلع على الملف الكامل.", projectUnavailableTitle: "هذا المشروع غير متاح", projectUnavailableText: "لم ينشره صاحبه بعد أو ألغى نشره.", projectDraftBanner: "معاينة: هذا المشروع ليس عامًا بعد.", video: "فيديو",
    links: 'روابط',
    report: 'إبلاغ', reportTitle: 'الإبلاغ عن هذا الملف', reportProjectTitle: 'الإبلاغ عن هذا المشروع', reportIntro: 'أخبرنا بما يحدث. يراجعه فريق Mycen، ولن يعرف المالك من أبلغ.', reportReason: 'السبب', reportDetails: 'تفاصيل (اختياري)', reportSend: 'إرسال البلاغ', reportSending: 'جارٍ الإرسال…', reportThanks: 'شكرًا. تلقينا بلاغك وسنراجعه.', reportDuplicate: 'تلقينا بلاغك عن هذا الملف بالفعل، ونحن نراجعه.', reportLimit: 'أرسلت بلاغات كثيرة اليوم. حاول غدًا.', reportError: 'تعذّر إرسال البلاغ. تحقق من اتصالك وحاول مرة أخرى.', cancel: 'إلغاء', rules: 'قواعد المحتوى',
    reportReasons: { spam: 'رسائل مزعجة أو إعلانات مضللة', scam: 'احتيال', impersonation: 'ينتحل شخصية أحد أو علامة تجارية', hate: 'كراهية أو تحرش', violence: 'عنف أو تهديد', sexual: 'محتوى جنسي', illegal: 'شيء غير قانوني', other: 'سبب آخر' },
}

export default ui

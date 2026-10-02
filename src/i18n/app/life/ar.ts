import type { LifeDict } from './es'

const ar: LifeDict = {
  common: {
    cancel: 'إلغاء', confirm: 'تأكيد', save: 'حفظ', saving: 'جارٍ الحفظ…', edit: 'تعديل', delete: 'حذف',
    close: 'إغلاق', search: 'بحث', saveError: 'تعذّر الحفظ. تحقّق من اتصالك وحاول مرة أخرى.', saved: 'تم الحفظ',
  },
  nav: { life: 'الرئيسية', money: 'المال', goals: 'الأهداف', habits: 'العادات', brain: 'Brain', settings: 'الإعدادات' },
  capture: { open: 'تسجيل سريع', close: 'إغلاق', idea: 'فكرة', note: 'ملاحظة', task: 'مهمة', goal: 'هدف', transaction: 'معاملة' },
  home: {
    greetMorning: 'صباح الخير', greetAfternoon: 'نهارك سعيد', greetEvening: 'مساء الخير',
    myBusiness: 'نشاطي التجاري', identityTitle: 'هويتي', identitySubtitle: 'هويتك الرقمية في مكان واحد',
    openStudio: 'فتح Studio', viewProfile: 'عرض الملف', today: 'اليوم',
    goalsValue: n => `${n} قيد التنفيذ`, habitsValue: (d, t) => `${d}/${t} اليوم`, tasksValue: n => `${n} معلّقة`,
    recap: '✦ عرض ملخص الشهر', settings: 'الإعدادات', language: 'اللغة',
  },
  settings: {
    title: 'الإعدادات', subtitle: 'لغة حسابك وعملته ومنطقته.',
    language: 'اللغة', languageHelp: 'تُستخدم في Life OS وStudio وملفك.',
    currency: 'العملة الرئيسية', currencyHelp: 'تظهر مجاميع المال بهذه العملة.',
    extraCurrencies: 'عملات أخرى',
    extraHelp: 'لتسجيل معاملات بعملات أخرى (حتى 5). تُجمع كل عملة على حدة: لا نحوّل المبالغ.',
    addCurrency: 'إضافة عملة', removeCurrency: c => `إزالة ${c}`, searchCurrency: 'ابحث عن عملة…',
    timezone: 'المنطقة الزمنية', timezoneHelp: 'تحدّد متى يبدأ يومك وينتهي.',
    weekStart: 'يبدأ الأسبوع يوم', monday: 'الإثنين', sunday: 'الأحد',
    account: 'الحساب', openStudio: 'فتح Mycen Studio', signOut: 'تسجيل الخروج', savedOk: 'تم حفظ الإعدادات', noResults: 'لا توجد نتائج',
  },
  money: {
    title: 'المال', add: 'معاملة جديدة', balance: m => `رصيد ${m}`, otherCurrencies: 'عملات أخرى هذا الشهر',
    income: 'الدخل', expense: 'المصروفات', today: 'اليوم', yesterday: 'أمس', net: 'صافي',
    emptyTitle: 'أموالك أمام عينيك', emptyText: 'سجّل الدخل والمصروفات لترى أين تذهب أموالك.',
    emptyAction: 'إضافة أول معاملة', options: 'خيارات', deleteTitle: 'حذف المعاملة؟',
    deleteText: (k, a, c) => `${k} بقيمة ${a} في ${c}.`, incomeOne: 'دخل', expenseOne: 'مصروف',
  },
  tx: {
    newTitle: 'معاملة جديدة', editTitle: 'تعديل المعاملة', income: 'دخل', expense: 'مصروف', amount: 'المبلغ',
    currency: 'العملة', category: 'الفئة', description: 'الوصف (اختياري)', descriptionPlaceholder: 'لأي غرض كانت؟',
    date: 'التاريخ', invalidAmount: 'أدخل مبلغًا صالحًا', create: 'تسجيل المعاملة', update: 'حفظ التغييرات',
  },
  categories: {
    Sueldo: 'الراتب', Freelance: 'عمل حر', Comisiones: 'عمولات', Ventas: 'مبيعات', Inversiones: 'استثمارات',
    Vivienda: 'السكن', Transporte: 'المواصلات', Comida: 'الطعام', Ocio: 'الترفيه', Salud: 'الصحة',
    Suscripciones: 'الاشتراكات', Ropa: 'الملابس', Otros: 'أخرى',
  },
}
export default ar

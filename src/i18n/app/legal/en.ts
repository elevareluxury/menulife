import type { LegalDict } from './es'
import es from './es'

const en: LegalDict = {
  ui: {
    termsTitle: 'Terms and conditions',
    privacyTitle: 'Privacy policy',
    termsIntro: 'By creating an account or using Mycen you accept these terms. They are written to be understood.',
    privacyIntro: 'What data we use, what for, who we share it with and what control you have.',
    updated: 'Last updated',
    contents: 'Contents',
    reference: 'The Spanish version is the reference version. Translations are provided for your convenience; if there are differences, the Spanish text prevails.',
    seeOther: { terms: 'Privacy policy', privacy: 'Terms and conditions' },
    language: 'Language',
    back: 'Back to Mycen',
  },
  updated: es.updated,
  terms: [
    { id: 'quien', title: 'Who provides the service', body: [
      'Mycen is a service operated by **Resilio**, based in the Argentine Republic. You can write to us at **team@mycen.id**.',
      'Mycen lets you create a public digital identity (Mycen Identity), manage it from Mycen Studio, organize your personal life in Life OS and, if you have a business, run it with Mycen Business.',
    ] },
    { id: 'edad', title: 'Who can use Mycen', body: [
      'You must be at least **13 years old**. If the minimum age to accept these terms or for the processing of your data is higher in your country (for example, 16 in some European Union countries), you need to be that age or have permission from your parent or guardian.',
      'To use Mycen Business on behalf of a business you must be of legal age and be authorized to represent it.',
    ] },
    { id: 'cuenta', title: 'Your account', body: [
      'You are responsible for keeping your password safe and for what happens in your account. The data you add must be true and must be yours, or you must have permission to use it.',
      'If you notice any use you did not authorize, change your password and write to us.',
    ] },
    { id: 'contenido', title: 'Your content', body: [
      'What you publish remains yours. You give us a free, worldwide permission to store it, show it at your public address and adapt it technically (for example, resizing images) while you keep it published. You can edit, hide, unpublish or delete it whenever you want.',
      'What you publish must follow the content rules. We may hide or suspend anything that does not.',
    ] },
    { id: 'reglas', title: 'Content rules', body: [
      'The following is not allowed on Mycen:',
      { list: [
        '**Spam or misleading advertising:** false promises, links that don’t go where they say, or fake reviews.',
        '**Scams or fraud:** asking for money or data through deception, selling things that don’t exist.',
        '**Impersonation:** pretending to be another person, company or brand.',
        '**Hate or harassment:** attacking people or groups for who they are, or harassing someone.',
        '**Violence or threats:** threatening, inciting violence or showing it gratuitously.',
        '**Explicit sexual content**, and any sexual content involving minors (reported to the authorities).',
        '**Anything illegal:** prohibited products or services, or content that infringes other people’s rights (trademarks, photos, texts).',
        '**Malicious links:** viruses, phishing or deceptive sites.',
      ] },
      'Anyone can report a profile or a project with the "Report" link at the bottom of the page, without an account and anonymously. We review every report. If a profile breaks the rules, we suspend it: it stops being visible (page, projects and contact card) and its owner sees the reason in Studio. If you think it was a mistake, write to us from the account you created it with and we will review it again.',
    ] },
    { id: 'derechos-de-autor', title: 'Copyright and trademarks', body: [
      'If you believe something published on Mycen uses your work or your trademark without permission, write to **team@mycen.id** with: your contact details, which work or trademark is yours, the exact address of the content on Mycen, and a statement that the information is accurate and that you are the owner or act on their behalf.',
      'If the claim is valid, we remove or block the content and notify the person who published it, who can respond with their side. Anyone who repeatedly publishes other people’s content without permission may lose their account.',
    ] },
    { id: 'usernames', title: 'Usernames', body: [
      'Some names are reserved. Registering names to impersonate another person or brand, or to resell them, is not allowed; in those cases we may reclaim them. If you change your username, the old address redirects to the new one so your links and QR codes keep working.',
    ] },
    { id: 'pagos', title: 'Paid Mycen Business plans', body: [
      'Your identity, Studio and Life OS are free. Mycen Business plans have the price shown when you subscribe, in US dollars (US$), plus any taxes that apply in your country.',
      'There is no minimum term: you can cancel anytime and the plan stays active until the end of the paid period. If we change a price, we will tell you in advance and the change applies from the next period. If you are a consumer, you keep the rights your country’s law gives you, such as the right to withdraw from a distance purchase.',
    ] },
    { id: 'servicio', title: 'The service', body: [
      'We work to keep Mycen running well at all times, but there may be interruptions, errors or changes. Features may change, improve or stop being available; if something important changes, we will tell you in advance whenever possible.',
      'To the extent permitted by law, Mycen is provided "as is", and we are not liable for indirect damages or lost profits arising from the use of the service. None of this limits the rights that your country’s law does not allow to be limited, such as the rights of people who use the service as consumers.',
    ] },
    { id: 'baja', title: 'Closing and suspension', body: [
      'You can delete your account anytime from Studio → Settings, and download a copy of your data first. Accounts with an active business on Mycen Business are closed through support, because they involve customer and sales data.',
      'We may suspend or close accounts that break these terms or the law, or that put other people or the service at risk. Whenever possible, we will let you know and explain why.',
    ] },
    { id: 'cambios', title: 'Changes to these terms', body: [
      'If we change these terms in an important way, we will notify you by email or within Mycen before they take effect. If you don’t agree, you can stop using the service and delete your account.',
    ] },
    { id: 'ley', title: 'Governing law', body: [
      'These terms are governed by the laws of the Argentine Republic. If you use Mycen as a consumer from another country, you are also protected by the rules of your country that cannot be waived by contract, and you can bring a claim before the courts where you live.',
      'Before any claim, write to us at **team@mycen.id**: almost everything gets solved by talking.',
    ] },
  ],
  privacy: [
    { id: 'responsable', title: 'Who is responsible for your data', body: [
      'The data controller is **Resilio**, based in the Argentine Republic, which operates Mycen. For any question about your data, write to **team@mycen.id**.',
      'When a business uses Mycen Business to manage data about its own customers (orders, reservations, appointments), that business is responsible for that data and Mycen processes it on its behalf and following its instructions.',
    ] },
    { id: 'datos', title: 'What data we use', body: [
      { list: [
        '**Your account:** name, email, password (stored encrypted, we never see it), language, currency, time zone and the date you accepted these terms.',
        '**Your public profile:** what you add in Studio (name, photo, texts, links, projects, contact card). Only what you choose to show is published.',
        '**Life OS:** your goals, habits, tasks, finances and notes. They are private: only you can see them.',
        '**Mycen Business:** your business data and what you add about your customers and sales.',
        '**Visit statistics:** anonymous events (visits and clicks on your profile) with an identifier that changes every day. We don’t store IP addresses or device data, and we don’t count bots.',
        '**Reports:** the reason and details written by the person reporting, with a daily anonymous identifier to prevent abuse.',
        '**Technical errors:** when something fails, we store the error message, the screen, the Mycen version and the browser (for example, "Chrome 128 · Android"), without IP or personal data, so we can fix it.',
      ] },
    ] },
    { id: 'para-que', title: 'What we use it for and on what basis', body: [
      { list: [
        '**Providing the service** you asked for when you created your account: storing, showing and syncing your information (performance of the contract).',
        '**Keeping Mycen safe and working:** preventing abuse, reviewing reports and fixing errors (legitimate interest).',
        '**Showing you statistics** about your profile, anonymously (legitimate interest).',
        '**Sending you necessary emails** about your account: confirmation, password recovery and important changes.',
        '**Complying with the law** when a competent authority requires it.',
      ] },
      'We don’t sell your data, we don’t use it for advertising, and there are no third-party trackers on Mycen.',
    ] },
    { id: 'publico', title: 'What is public', body: [
      'Your public page only shows what you publish. Hidden modules, drafts and unpublished Spaces are not visible. Public profiles may appear in search engines; if you choose "unlisted" or "private" visibility, they are not included in the sitemap that search engines read.',
    ] },
    { id: 'proveedores', title: 'Who we share it with', body: [
      'We use providers that process data only to provide the service and under contract:',
      { list: [
        '**Supabase:** database, sign-in and files.',
        '**Vercel:** hosting the application and delivering the pages.',
        '**Resend:** sending your account emails.',
        '**YouTube, Vimeo, TikTok, Spotify and SoundCloud:** only if a profile embeds a video or a song and you tap "Play". Nothing connects to them before that; from then on, their own policies apply.',
        '**Anthropic:** only if a business uses the menu import from a PDF; that file is processed.',
        '**Mercado Pago:** only if a business sets it up to get paid; the payment happens on Mercado Pago.',
      ] },
      'Beyond that, we only share data if the law requires it or to protect people’s rights and safety.',
    ] },
    { id: 'transferencias', title: 'Data outside your country', body: [
      'Our providers may store or process data on servers in other countries, such as the United States or European Union countries. When that happens, we use the safeguards provided by law, such as contractual clauses approved by data protection authorities, so your data has an adequate level of protection.',
    ] },
    { id: 'plazos', title: 'How long we keep it', body: [
      { list: [
        'Your account, profile and Life OS data, for as long as you have the account. If you delete it, we erase it; providers’ backups are overwritten in their usual cycles.',
        'Visit statistics are kept aggregated and anonymous.',
        'Error records are kept until they are resolved; the count of affected people, 90 days.',
        'Whatever the law requires us to keep (for example, billing data), for the period it sets.',
      ] },
    ] },
    { id: 'dispositivo', title: 'What is stored on your device', body: [
      'Mycen does not use advertising or tracking cookies. In your browser we only store what is needed for it to work: your session, your language and some drafts and preferences. You can clear it from your browser settings (you will need to sign in again).',
    ] },
    { id: 'seguridad', title: 'Security', body: [
      'We use encrypted connections, passwords stored with encryption and database permissions so each person only sees their own data. No system is perfect: if something affecting your data happened, we would let you know and act as the law requires.',
    ] },
    { id: 'derechos', title: 'Your rights', body: [
      'You can ask to access your data, correct it, delete it, take it with you (portability), object to or restrict certain uses, and withdraw any consent you gave. Many things you can do directly from Studio → Settings (download your data, delete your account) or from Life OS → Settings → Your data. For anything else, write to **team@mycen.id** from your account’s email.',
      'We respond within the legal deadlines (in Argentina, 10 calendar days for access and 5 business days to correct or delete). You can also file a complaint with the data protection authority: in Argentina, the **Agency for Access to Public Information (AAIP)**; in the European Union, the authority in your country; in Brazil, the **ANPD**.',
      'If you live in California: we don’t sell or share your personal data for advertising, and we will not treat you differently for exercising your rights.',
    ] },
    { id: 'menores', title: 'Children', body: [
      'Mycen is not directed at children under 13. If we learn that an account belongs to someone under that age (or the age set by the law of their country) without permission, we delete it. If you are a parent or guardian and believe this happened, write to us.',
    ] },
    { id: 'cambios', title: 'Changes to this policy', body: [
      'If we change this policy in an important way, we will notify you by email or within Mycen before it applies. You will always see the date of the last update at the top.',
    ] },
  ],
}

export default en

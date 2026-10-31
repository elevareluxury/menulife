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
    supportTitle: 'Help and support',
    supportIntro: 'How to reach us and answers to the most common questions.',
    deletionTitle: 'Delete your Mycen account',
    deletionIntro: 'How to delete your Mycen account and data (app and web), what gets deleted and what may remain.',
  },
  updated: es.updated,
  support: [
    { id: 'contacto', title: 'Write to us', body: [
      'For any question, problem or request, write to **team@mycen.id**. Tell us your Mycen username (or your account email) and, if you can, send a screenshot. We reply as soon as possible.',
    ] },
    { id: 'acceso', title: 'Getting into your account', body: [
      { list: [
        '**I forgot my password:** on the login screen tap “Forgot your password?” and follow the link we email you.',
        '**I didn’t get the confirmation email:** check spam and promotions. If it isn’t there, sign up again with the same email and we’ll send it again.',
        '**I signed in with Google:** always use the same button; you don’t need a password.',
      ] },
    ] },
    { id: 'datos', title: 'Your data', body: [
      { list: [
        '**Download it:** Studio → Settings → “Download my data” (your profile, modules and Life OS in one file). In Life OS → Settings → “Your data” you can also download Money as CSV.',
        '**Delete your account:** from Studio → Settings or Life OS → Settings → Account. All the steps, and what gets deleted, at **mycen.id/eliminar-cuenta**.',
      ] },
    ] },
    { id: 'seguridad', title: 'Report or block', body: [
      { list: [
        '**A profile:** on any public profile tap “Report”. The Mycen team reviews it and the owner won’t know who reported.',
        '**A message:** in Studio → Messages, “Report” sends the message to the team and blocks the sender; “Block” just stops their messages.',
      ] },
      'If something is urgent or puts someone at risk, write to **team@mycen.id** with the subject “Urgent”.',
    ] },
  ],
  deletion: [
    { id: 'app', title: 'From the app or the web', body: [
      'Log in and choose one of these options:',
      { list: [
        '**Life OS → Settings → Account → “Delete my account”**',
        '**Studio → Settings → “Delete my account”**',
      ] },
      'To confirm, type the word we ask for. The account is deleted right away.',
    ] },
    { id: 'sin-acceso', title: 'If you can’t log in', body: [
      'Write to **team@mycen.id** from your account email with the subject “Delete my account”. We delete it within the legal deadlines (in Argentina, 5 business days) and let you know when it’s done.',
    ] },
    { id: 'que-se-borra', title: 'What gets deleted', body: [
      { list: [
        'Your account and your login email.',
        'Your identity: profiles, Spaces, modules, projects, images, published versions, stats, messages and subscribers.',
        'All of Life OS: tasks, habits, goals, My day, reviews, Money and journal.',
      ] },
    ] },
    { id: 'que-queda', title: 'What may remain', body: [
      { list: [
        'Our providers’ backups, which are overwritten in their usual cycles.',
        'Error logs, which are not linked to your account.',
        'Anything the law requires us to keep (for example, billing data), for the period it sets.',
        'If your account has a business in Mycen Business, write to us: we close it with you to protect your customers’ and sales data.',
      ] },
    ] },
  ],
  terms: [
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'quien', title: 'Who provides the service', body: [
      'Mycen is a service operated by **Luca Cazzoli** (Argentine tax ID CUIT 20-42325961-3), under the trade name **Resilio**, based in the Argentine Republic. You can write to us at **team@mycen.id**.',
      'Mycen lets you create a public digital identity (Mycen Identity), manage it from Mycen Studio, organize your personal life in Life OS and, if you have a business, run it with Mycen Business.',
    ] },
    { id: 'edad', title: 'Who can use Mycen', body: [
      'To use Mycen you must be at least **13 years old**. If you live in a European Union or European Economic Area country that requires you to be **16** to use a service like this without your parent’s or guardian’s consent, you must be at least 16. And if the law of your country sets a higher minimum age, that age applies.',
      'By creating an account you confirm that you meet the required age. If we learn that an account belongs to someone who does not, we delete it.',
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
    { id: 'derechos-de-autor', title: 'Copyright and other rights', body: [
      'If you believe something published on Mycen infringes your copyright or other rights (for example, your trademark or your image), you can ask us to take it down. Write to **team@mycen.id** with:',
      { list: [
        '**The link to the content:** the exact address on Mycen of the profile, project or image.',
        '**Who owns the right** and how to contact them. If you are acting on behalf of another person or company, say so.',
        '**Why it infringes:** which work, trademark or other right it is and how it is being used without permission.',
        '**A good-faith statement:** that you believe in good faith that the use is not authorized and that the information you give us is accurate.',
      ] },
      'We review every request. When appropriate, we take down or block the content and notify the person who published it, with the reason. That person can reply with their side (for example, if they have permission to use it) and we review it again.',
      'Accounts that repeatedly publish content that infringes other people’s rights may be suspended or closed.',
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
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'responsable', title: 'Who is responsible for your data', body: [
      'The data controller is **Luca Cazzoli** (Argentine tax ID CUIT 20-42325961-3), who operates Mycen under the trade name **Resilio** and is based in the Argentine Republic. For any question about your data, write to **team@mycen.id**.',
      'When a business uses Mycen Business to manage data about its own customers (orders, reservations, appointments), that business is responsible for that data and Mycen processes it on its behalf and following its instructions.',
    ] },
    { id: 'datos', title: 'What data we use', body: [
      { list: [
        '**Your account:** name, email, password (stored encrypted, we never see it), language, currency, time zone and the date you accepted these terms.',
        '**Your public profile:** what you add in Studio (name, photo, texts, links, projects, contact card). Only what you choose to show is published.',
        '**Life OS:** your goals, habits, tasks, finances and notes, including the names you type (for example, who you split an expense with). They are private: only you can see them. So is your journal: the PIN, fingerprint or face lock works only on your device (it is not sent to Mycen) and entries are not end-to-end encrypted.',
        '**Mycen Business:** your business data and what you add about your customers and sales.',
        '**Visit statistics:** anonymous events (visits and clicks on your profile) with an identifier that changes every day. We don’t store IP addresses or device data, and we don’t count bots. We also store which site or link the visit came from (for example, Instagram or the QR code).',
        '**Reports:** the reason and details written by the person reporting, with a daily anonymous identifier to prevent abuse. If the person reporting is signed in, we also store their account: only the Mycen team sees it, never the reported person.',
        '**Contact form messages:** the name, contact (email or WhatsApp) and message a visitor leaves. If the profile has the Collaborations module, a brand also leaves its company and what it is looking for, and optionally its website, a budget and a deadline. Only the profile owner sees them, in Studio; they are not published or emailed. To prevent abuse we use an anonymous identifier that changes every day, with no IP or device data. If the profile owner reports a message, we keep a copy for the Mycen team to review and that contact is blocked on their profile.',
        '**Subscriptions:** if you subscribe through a profile’s “Subscribe” module, we store your email (and your name, if the profile asks for it), the date you gave your consent and your language, and we give them to the owner of that profile, who sees them in Studio and can export them. Mycen sends nothing to that list: the profile owner decides how to use it and is responsible for doing so properly. To leave, ask that person or write to us at team@mycen.id and we will delete it. To prevent abuse we use an anonymous identifier that changes every day, with no IP address or device data.',
        '**Invitations:** if you create your account from “Create your identity” on someone else’s profile, we save which profile brought you and its type, to understand how Mycen grows. That person can’t see your data.',
        '**App usage:** to know whether Mycen works and how it’s growing, we save usage events (for example, that you published your profile, opened “My day” or checked off a habit) with your account, the date and short details such as the layout you chose or a number of days. Also, once a day we note that you used Mycen, from what kind of device (browser, installed app, iPhone or Android), in which language and your device’s time zone (for example, “America/Argentina/Buenos_Aires”); never your IP address or your exact location. We never save the content of your tasks, habits, notes or messages. We don’t use third-party analytics services.',
        '**Account verification:** if you request the verified-account check mark, we store your message, the link you give us and our reply. Only the Mycen team sees them, to review the request; if it’s approved, your profile shows the check mark.',
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
        '**Cloudflare (Turnstile):** the anti-bot check on sign-up, log-in and password recovery. When you open those screens, Cloudflare receives technical data from your browser (such as your IP address) only to check that you are not a bot.',
        '**YouTube, Vimeo, TikTok, Spotify and SoundCloud:** only if a profile embeds a video or a song and you tap "Play". Nothing connects to them before that; from then on, their own policies apply. If a profile shows its "Latest video", the Mycen server checks the public video list of the YouTube channel chosen by the owner, without sending any of your data. When a profile owner pastes one of those links in Studio, the Mycen server fetches the public cover of that video or song and stores it as another photo of their profile, so the page shows it without connecting you to the provider.',
        '**Anthropic:** only if a business uses the menu import from a PDF; that file is processed.',
        '**Mercado Pago:** only if a business sets it up to get paid; the payment happens on Mercado Pago.',
        '**Google (sign-in):** only if you choose "Continue with Google". Google confirms your name, email and photo to us; we never get your Google password or access anything else in your account.',
        '**Apple (sign-in):** only if you choose "Continue with Apple". Apple confirms your name and email to us (or a relay email Apple creates if you prefer to hide yours); we never get your password or access anything else in your account.',
        '**iOS and Android app:** if you download it, Apple (App Store) or Google (Google Play) record the download under their own policies. The app’s reminders are scheduled on your phone; Mycen doesn’t use a third-party notification service.',
        '**Google Calendar, Apple or another calendar:** only if you turn on the Life OS calendar link; that service downloads your pending tasks with a date (title, date, time and reminder). You can turn it off or change it at any time.',
        '**Your browser’s speech recognition:** only if you use "Dictate" in Life OS. Your browser turns your voice into text (in Chrome, Google’s speech service does it; in Safari, Apple). Mycen only receives the text.',
      ] },
      'Beyond that, we only share data if the law requires it or to protect people’s rights and safety.',
    ] },
    { id: 'transferencias', title: 'Data outside your country', body: [
      'Our providers may store or process data on servers in other countries, such as the United States or European Union countries. When that happens, we use the safeguards provided by law, such as contractual clauses approved by data protection authorities, so your data has an adequate level of protection.',
    ] },
    { id: 'plazos', title: 'How long we keep it', body: [
      { list: [
        'Your account, profile and Life OS data, for as long as you have the account. If you delete it, we erase it; providers’ backups are overwritten in their usual cycles.',
        'Visit statistics are kept as anonymous events (with the identifier that changes every day) for as long as the profile exists; if it is deleted, they are deleted with it.',
        'Contact form messages, until the profile owner deletes them or deletes their account.',
        'Subscription emails, until the profile owner deletes them, deletes their account or you ask us to delete them.',
        'Error records are kept for as long as they help us fix problems (a resolved one stays in case it happens again); the count of affected people, 90 days.',
        'Usage events, while you have your account; if you delete it, they are no longer linked to you in any way.',
        'Whatever the law requires us to keep (for example, billing data), for the period it sets.',
      ] },
    ] },
    { id: 'dispositivo', title: 'What is stored on your device', body: [
      'Mycen does not use advertising or tracking cookies. In your browser we only store what is needed for it to work: your session, your language and some drafts and preferences. You can clear it from your browser settings (you will need to sign in again). If you add something in Life OS while offline, it stays on your device until it is uploaded (only with your session). For the journal PIN we only store an encrypted fingerprint (hash), never the PIN.',
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
      'Mycen is not directed at children under 13, nor at anyone under 16 in European Union or European Economic Area countries that require that age to process their data without parental consent (nor at anyone below a higher age set by the law of their country). We do not knowingly collect data from people under that age: if we learn that an account belongs to someone who does not meet it, we delete the account and its data. If you are a parent or guardian and believe this happened, write to us at **team@mycen.id**.',
    ] },
    { id: 'cambios', title: 'Changes to this policy', body: [
      'If we change this policy in an important way, we will notify you by email or within Mycen before it applies. You will always see the date of the last update at the top.',
    ] },
  ],
}

export default en

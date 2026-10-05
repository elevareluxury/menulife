import type { ProfileLang, Translations } from './profileTypes'

/**
 * Texto en el idioma pedido. El contenido original está en el idioma del perfil
 * (default_locale); si hay una traducción guardada para `lang` se usa esa.
 */
export function tr(original: string | null | undefined, translations: Translations | undefined, field: string, lang: ProfileLang): string {
  const value = translations?.[lang]?.[field]
  if (typeof value === 'string' && value.trim()) return value
  return original ?? ''
}

/** Motivos de denuncia (mismos valores que el check de profile_reports.reason) */
export const REPORT_REASONS = ['spam', 'scam', 'impersonation', 'hate', 'violence', 'sexual', 'illegal', 'other'] as const
export type ReportReason = typeof REPORT_REASONS[number]

type Days = { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string; sunday: string }

export interface UiStrings {
  openNow: string
  closedNow: string
  share: string
  linkCopied: string
  saveContact: string
  contact: string
  location: string
  howToGet: string
  hours: string
  closed: string
  gallery: string
  reviews: string
  seeOnGoogle: string
  reviewsCount: string
  notFoundTitle: string
  notFoundText: string
  unavailableTitle: string
  unavailableText: string
  errorTitle: string
  errorText: string
  retry: string
  createYours: string
  draftBanner: string
  footer: string
  days: Days
  languageLabel: string
  socials: string
  close: string
  cards: string
  swipeHint: string
  tags: string
  projects: string
  viewProject: string
  credits: string
  backToProfile: string
  projectNotFoundTitle: string
  projectNotFoundText: string
  projectUnavailableTitle: string
  projectUnavailableText: string
  projectDraftBanner: string
  video: string
  links: string
  report: string
  reportTitle: string
  reportProjectTitle: string
  reportIntro: string
  reportReason: string
  reportDetails: string
  reportSend: string
  reportSending: string
  reportThanks: string
  reportDuplicate: string
  reportLimit: string
  reportError: string
  cancel: string
  rules: string
  reportReasons: Record<ReportReason, string>
}

const UI: Record<ProfileLang, UiStrings> = {
  es: {
    openNow: 'Abierto ahora', closedNow: 'Cerrado ahora', share: 'Compartir', linkCopied: 'Link copiado',
    saveContact: 'Guardar contacto', contact: 'Contacto', location: 'Ubicación', howToGet: 'Cómo llegar',
    hours: 'Horarios', closed: 'Cerrado', gallery: 'Galería', reviews: 'Reseñas', seeOnGoogle: 'Ver en Google',
    reviewsCount: 'reseñas',
    notFoundTitle: 'Este perfil no existe', notFoundText: 'Revisá el link o creá tu propia identidad en Mycen.',
    unavailableTitle: 'Este perfil no está disponible', unavailableText: 'Su dueño todavía no lo publicó o lo pausó por ahora.',
    errorTitle: 'No pudimos cargar el perfil', errorText: 'Revisá tu conexión e intentá de nuevo.',
    retry: 'Reintentar', createYours: 'Creá tu Mycen', draftBanner: 'Vista previa: este perfil todavía no es público.',
    footer: 'Una identidad Mycen',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' },
    languageLabel: 'Idioma', socials: 'Redes sociales', close: 'Cerrar', cards: 'Tarjetas',
    swipeHint: 'deslizá para ver más', tags: 'Categorías',
    projects: "Proyectos", viewProject: "Ver proyecto", credits: "Créditos", backToProfile: "Volver al perfil", projectNotFoundTitle: "Este proyecto no existe", projectNotFoundText: "Revisá el link o mirá el perfil completo.", projectUnavailableTitle: "Este proyecto no está disponible", projectUnavailableText: "Su dueño todavía no lo publicó o lo despublicó.", projectDraftBanner: "Vista previa: este proyecto todavía no es público.", video: "Video",
    links: 'Links',
    report: 'Denunciar', reportTitle: 'Denunciar este perfil', reportProjectTitle: 'Denunciar este proyecto', reportIntro: 'Contanos qué pasa. Lo revisa el equipo de Mycen; el dueño no sabe quién denunció.', reportReason: 'Motivo', reportDetails: 'Detalles (opcional)', reportSend: 'Enviar denuncia', reportSending: 'Enviando…', reportThanks: 'Gracias. Recibimos tu denuncia y la vamos a revisar.', reportDuplicate: 'Ya recibimos tu denuncia sobre este perfil. La estamos revisando.', reportLimit: 'Enviaste muchas denuncias hoy. Probá de nuevo mañana.', reportError: 'No pudimos enviar la denuncia. Revisá tu conexión e intentá de nuevo.', cancel: 'Cancelar', rules: 'Reglas de contenido',
    reportReasons: { spam: 'Spam o publicidad engañosa', scam: 'Estafa o fraude', impersonation: 'Se hace pasar por otra persona o marca', hate: 'Odio o acoso', violence: 'Violencia o amenazas', sexual: 'Contenido sexual', illegal: 'Algo ilegal', other: 'Otro motivo' },
  },
  en: {
    openNow: 'Open now', closedNow: 'Closed now', share: 'Share', linkCopied: 'Link copied',
    saveContact: 'Save contact', contact: 'Contact', location: 'Location', howToGet: 'Get directions',
    hours: 'Hours', closed: 'Closed', gallery: 'Gallery', reviews: 'Reviews', seeOnGoogle: 'See on Google',
    reviewsCount: 'reviews',
    notFoundTitle: 'This profile does not exist', notFoundText: 'Check the link or create your own identity on Mycen.',
    unavailableTitle: 'This profile is not available', unavailableText: 'Its owner has not published it yet or paused it for now.',
    errorTitle: 'We could not load this profile', errorText: 'Check your connection and try again.',
    retry: 'Try again', createYours: 'Create your Mycen', draftBanner: 'Preview: this profile is not public yet.',
    footer: 'A Mycen identity',
    days: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
    languageLabel: 'Language', socials: 'Social networks', close: 'Close', cards: 'Cards',
    swipeHint: 'swipe to see more', tags: 'Categories',
    projects: "Projects", viewProject: "View project", credits: "Credits", backToProfile: "Back to profile", projectNotFoundTitle: "This project does not exist", projectNotFoundText: "Check the link or see the full profile.", projectUnavailableTitle: "This project is not available", projectUnavailableText: "Its owner hasn’t published it yet or unpublished it.", projectDraftBanner: "Preview: this project is not public yet.", video: "Video",
    links: 'Links',
    report: 'Report', reportTitle: 'Report this profile', reportProjectTitle: 'Report this project', reportIntro: 'Tell us what’s wrong. The Mycen team reviews it; the owner won’t know who reported.', reportReason: 'Reason', reportDetails: 'Details (optional)', reportSend: 'Send report', reportSending: 'Sending…', reportThanks: 'Thanks. We received your report and will review it.', reportDuplicate: 'We already received your report about this profile. We’re reviewing it.', reportLimit: 'You’ve sent many reports today. Try again tomorrow.', reportError: 'We couldn’t send the report. Check your connection and try again.', cancel: 'Cancel', rules: 'Content rules',
    reportReasons: { spam: 'Spam or misleading ads', scam: 'Scam or fraud', impersonation: 'Impersonates someone else or a brand', hate: 'Hate or harassment', violence: 'Violence or threats', sexual: 'Sexual content', illegal: 'Something illegal', other: 'Something else' },
  },
  pt: {
    openNow: 'Aberto agora', closedNow: 'Fechado agora', share: 'Compartilhar', linkCopied: 'Link copiado',
    saveContact: 'Salvar contato', contact: 'Contato', location: 'Localização', howToGet: 'Como chegar',
    hours: 'Horários', closed: 'Fechado', gallery: 'Galeria', reviews: 'Avaliações', seeOnGoogle: 'Ver no Google',
    reviewsCount: 'avaliações',
    notFoundTitle: 'Este perfil não existe', notFoundText: 'Confira o link ou crie sua própria identidade no Mycen.',
    unavailableTitle: 'Este perfil não está disponível', unavailableText: 'O dono ainda não o publicou ou o pausou por enquanto.',
    errorTitle: 'Não conseguimos carregar o perfil', errorText: 'Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente', createYours: 'Crie seu Mycen', draftBanner: 'Prévia: este perfil ainda não é público.',
    footer: 'Uma identidade Mycen',
    days: { monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom' },
    languageLabel: 'Idioma', socials: 'Redes sociais', close: 'Fechar', cards: 'Cartões',
    swipeHint: 'deslize para ver mais', tags: 'Categorias',
    projects: "Projetos", viewProject: "Ver projeto", credits: "Créditos", backToProfile: "Voltar ao perfil", projectNotFoundTitle: "Este projeto não existe", projectNotFoundText: "Confira o link ou veja o perfil completo.", projectUnavailableTitle: "Este projeto não está disponível", projectUnavailableText: "O dono ainda não o publicou ou o despublicou.", projectDraftBanner: "Prévia: este projeto ainda não é público.", video: "Vídeo",
    links: 'Links',
    report: 'Denunciar', reportTitle: 'Denunciar este perfil', reportProjectTitle: 'Denunciar este projeto', reportIntro: 'Conte o que está acontecendo. A equipe do Mycen revisa; o dono não sabe quem denunciou.', reportReason: 'Motivo', reportDetails: 'Detalhes (opcional)', reportSend: 'Enviar denúncia', reportSending: 'Enviando…', reportThanks: 'Obrigado. Recebemos sua denúncia e vamos analisá-la.', reportDuplicate: 'Já recebemos sua denúncia sobre este perfil. Estamos analisando.', reportLimit: 'Você enviou muitas denúncias hoje. Tente amanhã.', reportError: 'Não conseguimos enviar a denúncia. Verifique a conexão e tente de novo.', cancel: 'Cancelar', rules: 'Regras de conteúdo',
    reportReasons: { spam: 'Spam ou publicidade enganosa', scam: 'Golpe ou fraude', impersonation: 'Finge ser outra pessoa ou marca', hate: 'Ódio ou assédio', violence: 'Violência ou ameaças', sexual: 'Conteúdo sexual', illegal: 'Algo ilegal', other: 'Outro motivo' },
  },
  fr: {
    openNow: 'Ouvert', closedNow: 'Fermé', share: 'Partager', linkCopied: 'Lien copié',
    saveContact: 'Enregistrer le contact', contact: 'Contact', location: 'Adresse', howToGet: 'Itinéraire',
    hours: 'Horaires', closed: 'Fermé', gallery: 'Galerie', reviews: 'Avis', seeOnGoogle: 'Voir sur Google',
    reviewsCount: 'avis',
    notFoundTitle: 'Ce profil n’existe pas', notFoundText: 'Vérifiez le lien ou créez votre propre identité sur Mycen.',
    unavailableTitle: 'Ce profil n’est pas disponible', unavailableText: 'Son propriétaire ne l’a pas encore publié ou l’a mis en pause.',
    errorTitle: 'Impossible de charger le profil', errorText: 'Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer', createYours: 'Créez votre Mycen', draftBanner: 'Aperçu : ce profil n’est pas encore public.',
    footer: 'Une identité Mycen',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim' },
    languageLabel: 'Langue', socials: 'Réseaux sociaux', close: 'Fermer', cards: 'Cartes',
    swipeHint: 'faites glisser pour voir plus', tags: 'Catégories',
    projects: "Projets", viewProject: "Voir le projet", credits: "Crédits", backToProfile: "Retour au profil", projectNotFoundTitle: "Ce projet n’existe pas", projectNotFoundText: "Vérifiez le lien ou consultez le profil complet.", projectUnavailableTitle: "Ce projet n’est pas disponible", projectUnavailableText: "Son propriétaire ne l’a pas encore publié ou l’a dépublié.", projectDraftBanner: "Aperçu : ce projet n’est pas encore public.", video: "Vidéo",
    links: 'Liens',
    report: 'Signaler', reportTitle: 'Signaler ce profil', reportProjectTitle: 'Signaler ce projet', reportIntro: 'Dites-nous ce qui ne va pas. L’équipe Mycen examine le signalement ; le propriétaire ne saura pas qui l’a fait.', reportReason: 'Motif', reportDetails: 'Détails (facultatif)', reportSend: 'Envoyer le signalement', reportSending: 'Envoi…', reportThanks: 'Merci. Nous avons reçu votre signalement et allons l’examiner.', reportDuplicate: 'Nous avons déjà reçu votre signalement sur ce profil. Il est en cours d’examen.', reportLimit: 'Vous avez envoyé beaucoup de signalements aujourd’hui. Réessayez demain.', reportError: 'Impossible d’envoyer le signalement. Vérifiez votre connexion et réessayez.', cancel: 'Annuler', rules: 'Règles de contenu',
    reportReasons: { spam: 'Spam ou publicité trompeuse', scam: 'Arnaque ou fraude', impersonation: 'Usurpe l’identité d’une personne ou d’une marque', hate: 'Haine ou harcèlement', violence: 'Violence ou menaces', sexual: 'Contenu sexuel', illegal: 'Quelque chose d’illégal', other: 'Autre motif' },
  },
  de: {
    openNow: 'Jetzt geöffnet', closedNow: 'Jetzt geschlossen', share: 'Teilen', linkCopied: 'Link kopiert',
    saveContact: 'Kontakt speichern', contact: 'Kontakt', location: 'Standort', howToGet: 'Route',
    hours: 'Öffnungszeiten', closed: 'Geschlossen', gallery: 'Galerie', reviews: 'Bewertungen', seeOnGoogle: 'Auf Google ansehen',
    reviewsCount: 'Bewertungen',
    notFoundTitle: 'Dieses Profil existiert nicht', notFoundText: 'Prüfe den Link oder erstelle deine eigene Identität auf Mycen.',
    unavailableTitle: 'Dieses Profil ist nicht verfügbar', unavailableText: 'Der Inhaber hat es noch nicht veröffentlicht oder vorübergehend pausiert.',
    errorTitle: 'Das Profil konnte nicht geladen werden', errorText: 'Prüfe deine Verbindung und versuche es erneut.',
    retry: 'Erneut versuchen', createYours: 'Erstelle dein Mycen', draftBanner: 'Vorschau: Dieses Profil ist noch nicht öffentlich.',
    footer: 'Eine Mycen-Identität',
    days: { monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So' },
    languageLabel: 'Sprache', socials: 'Soziale Netzwerke', close: 'Schließen', cards: 'Karten',
    swipeHint: 'wischen für mehr', tags: 'Kategorien',
    projects: "Projekte", viewProject: "Projekt ansehen", credits: "Credits", backToProfile: "Zurück zum Profil", projectNotFoundTitle: "Dieses Projekt gibt es nicht", projectNotFoundText: "Prüfe den Link oder sieh dir das ganze Profil an.", projectUnavailableTitle: "Dieses Projekt ist nicht verfügbar", projectUnavailableText: "Der Inhaber hat es noch nicht veröffentlicht oder wieder zurückgezogen.", projectDraftBanner: "Vorschau: Dieses Projekt ist noch nicht öffentlich.", video: "Video",
    links: 'Links',
    report: 'Melden', reportTitle: 'Dieses Profil melden', reportProjectTitle: 'Dieses Projekt melden', reportIntro: 'Sag uns, was los ist. Das Mycen-Team prüft es; der Inhaber erfährt nicht, wer gemeldet hat.', reportReason: 'Grund', reportDetails: 'Details (optional)', reportSend: 'Meldung senden', reportSending: 'Wird gesendet…', reportThanks: 'Danke. Wir haben deine Meldung erhalten und prüfen sie.', reportDuplicate: 'Wir haben deine Meldung zu diesem Profil schon erhalten und prüfen sie.', reportLimit: 'Du hast heute viele Meldungen gesendet. Versuch es morgen wieder.', reportError: 'Die Meldung konnte nicht gesendet werden. Prüfe deine Verbindung und versuch es erneut.', cancel: 'Abbrechen', rules: 'Inhaltsregeln',
    reportReasons: { spam: 'Spam oder irreführende Werbung', scam: 'Betrug', impersonation: 'Gibt sich als jemand anderes oder eine Marke aus', hate: 'Hass oder Belästigung', violence: 'Gewalt oder Drohungen', sexual: 'Sexuelle Inhalte', illegal: 'Etwas Illegales', other: 'Etwas anderes' },
  },
  it: {
    openNow: 'Aperto ora', closedNow: 'Chiuso ora', share: 'Condividi', linkCopied: 'Link copiato',
    saveContact: 'Salva contatto', contact: 'Contatti', location: 'Posizione', howToGet: 'Indicazioni',
    hours: 'Orari', closed: 'Chiuso', gallery: 'Galleria', reviews: 'Recensioni', seeOnGoogle: 'Vedi su Google',
    reviewsCount: 'recensioni',
    notFoundTitle: 'Questo profilo non esiste', notFoundText: 'Controlla il link o crea la tua identità su Mycen.',
    unavailableTitle: 'Questo profilo non è disponibile', unavailableText: 'Il proprietario non l’ha ancora pubblicato o l’ha messo in pausa.',
    errorTitle: 'Impossibile caricare il profilo', errorText: 'Controlla la connessione e riprova.',
    retry: 'Riprova', createYours: 'Crea il tuo Mycen', draftBanner: 'Anteprima: questo profilo non è ancora pubblico.',
    footer: 'Un’identità Mycen',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Gio', friday: 'Ven', saturday: 'Sab', sunday: 'Dom' },
    languageLabel: 'Lingua', socials: 'Social network', close: 'Chiudi', cards: 'Schede',
    swipeHint: 'scorri per vedere altro', tags: 'Categorie',
    projects: "Progetti", viewProject: "Vedi progetto", credits: "Crediti", backToProfile: "Torna al profilo", projectNotFoundTitle: "Questo progetto non esiste", projectNotFoundText: "Controlla il link o guarda il profilo completo.", projectUnavailableTitle: "Questo progetto non è disponibile", projectUnavailableText: "Il proprietario non l’ha ancora pubblicato o l’ha ritirato.", projectDraftBanner: "Anteprima: questo progetto non è ancora pubblico.", video: "Video",
    links: 'Link',
    report: 'Segnala', reportTitle: 'Segnala questo profilo', reportProjectTitle: 'Segnala questo progetto', reportIntro: 'Dicci cosa succede. Il team di Mycen lo verifica; il proprietario non saprà chi ha segnalato.', reportReason: 'Motivo', reportDetails: 'Dettagli (facoltativo)', reportSend: 'Invia segnalazione', reportSending: 'Invio…', reportThanks: 'Grazie. Abbiamo ricevuto la tua segnalazione e la esamineremo.', reportDuplicate: 'Abbiamo già ricevuto la tua segnalazione su questo profilo. La stiamo esaminando.', reportLimit: 'Hai inviato molte segnalazioni oggi. Riprova domani.', reportError: 'Non siamo riusciti a inviare la segnalazione. Controlla la connessione e riprova.', cancel: 'Annulla', rules: 'Regole sui contenuti',
    reportReasons: { spam: 'Spam o pubblicità ingannevole', scam: 'Truffa o frode', impersonation: 'Si spaccia per un’altra persona o un marchio', hate: 'Odio o molestie', violence: 'Violenza o minacce', sexual: 'Contenuti sessuali', illegal: 'Qualcosa di illegale', other: 'Altro motivo' },
  },
  zh: {
    openNow: '营业中', closedNow: '已打烊', share: '分享', linkCopied: '链接已复制',
    saveContact: '保存联系人', contact: '联系方式', location: '位置', howToGet: '导航',
    hours: '营业时间', closed: '休息', gallery: '相册', reviews: '评价', seeOnGoogle: '在 Google 上查看',
    reviewsCount: '条评价',
    notFoundTitle: '该主页不存在', notFoundText: '请检查链接，或在 Mycen 创建你自己的主页。',
    unavailableTitle: '该主页暂不可用', unavailableText: '主人尚未发布或已暂停。',
    errorTitle: '无法加载主页', errorText: '请检查网络连接后重试。',
    retry: '重试', createYours: '创建你的 Mycen', draftBanner: '预览：此主页尚未公开。',
    footer: 'Mycen 身份主页',
    days: { monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四', friday: '周五', saturday: '周六', sunday: '周日' },
    languageLabel: '语言', socials: '社交媒体', close: '关闭', cards: '卡片',
    swipeHint: '滑动查看更多', tags: '分类',
    projects: "项目", viewProject: "查看项目", credits: "鸣谢", backToProfile: "返回主页", projectNotFoundTitle: "该项目不存在", projectNotFoundText: "请检查链接或查看完整主页。", projectUnavailableTitle: "该项目暂不可用", projectUnavailableText: "所有者尚未发布或已取消发布。", projectDraftBanner: "预览：该项目尚未公开。", video: "视频",
    links: '链接',
    report: '举报', reportTitle: '举报此主页', reportProjectTitle: '举报此项目', reportIntro: '告诉我们发生了什么。由 Mycen 团队审核，所有者不会知道是谁举报的。', reportReason: '原因', reportDetails: '详细说明（可选）', reportSend: '提交举报', reportSending: '正在提交…', reportThanks: '谢谢。我们已收到你的举报，会进行审核。', reportDuplicate: '我们已收到你对此主页的举报，正在审核。', reportLimit: '你今天提交的举报太多了，请明天再试。', reportError: '举报未能提交。请检查网络后重试。', cancel: '取消', rules: '内容规则',
    reportReasons: { spam: '垃圾信息或误导性广告', scam: '诈骗或欺诈', impersonation: '冒充他人或品牌', hate: '仇恨或骚扰', violence: '暴力或威胁', sexual: '色情内容', illegal: '违法内容', other: '其他原因' },
  },
  ja: {
    openNow: '営業中', closedNow: '営業時間外', share: '共有', linkCopied: 'リンクをコピーしました',
    saveContact: '連絡先を保存', contact: '連絡先', location: '所在地', howToGet: '経路',
    hours: '営業時間', closed: '定休日', gallery: 'ギャラリー', reviews: 'レビュー', seeOnGoogle: 'Google で見る',
    reviewsCount: '件のレビュー',
    notFoundTitle: 'このプロフィールは存在しません', notFoundText: 'リンクを確認するか、Mycen で自分のプロフィールを作成してください。',
    unavailableTitle: 'このプロフィールは現在ご利用いただけません', unavailableText: 'オーナーがまだ公開していないか、一時停止中です。',
    errorTitle: 'プロフィールを読み込めませんでした', errorText: '接続を確認して、もう一度お試しください。',
    retry: '再試行', createYours: 'Mycen をつくる', draftBanner: 'プレビュー：このプロフィールはまだ公開されていません。',
    footer: 'Mycen のプロフィール',
    days: { monday: '月', tuesday: '火', wednesday: '水', thursday: '木', friday: '金', saturday: '土', sunday: '日' },
    languageLabel: '言語', socials: 'SNS', close: '閉じる', cards: 'カード',
    swipeHint: 'スワイプしてもっと見る', tags: 'カテゴリー',
    projects: "プロジェクト", viewProject: "プロジェクトを見る", credits: "クレジット", backToProfile: "プロフィールに戻る", projectNotFoundTitle: "このプロジェクトは存在しません", projectNotFoundText: "リンクを確認するか、プロフィール全体をご覧ください。", projectUnavailableTitle: "このプロジェクトは公開されていません", projectUnavailableText: "所有者がまだ公開していないか、公開を停止しました。", projectDraftBanner: "プレビュー：このプロジェクトはまだ公開されていません。", video: "動画",
    links: 'リンク',
    report: '報告する', reportTitle: 'このプロフィールを報告', reportProjectTitle: 'このプロジェクトを報告', reportIntro: '何が問題か教えてください。Mycenチームが確認します。報告者が誰かは所有者に知らされません。', reportReason: '理由', reportDetails: '詳細（任意）', reportSend: '報告を送信', reportSending: '送信中…', reportThanks: 'ありがとうございます。報告を受け付けました。確認します。', reportDuplicate: 'このプロフィールについての報告はすでに受け付けています。確認中です。', reportLimit: '本日は多くの報告が送信されました。明日もう一度お試しください。', reportError: '報告を送信できませんでした。接続を確認して、もう一度お試しください。', cancel: 'キャンセル', rules: 'コンテンツのルール',
    reportReasons: { spam: 'スパム・誤解を招く広告', scam: '詐欺', impersonation: '他人やブランドになりすましている', hate: 'ヘイト・嫌がらせ', violence: '暴力・脅迫', sexual: '性的なコンテンツ', illegal: '違法なもの', other: 'その他' },
  },
  ko: {
    openNow: '영업 중', closedNow: '영업 종료', share: '공유', linkCopied: '링크가 복사되었습니다',
    saveContact: '연락처 저장', contact: '연락처', location: '위치', howToGet: '길찾기',
    hours: '영업시간', closed: '휴무', gallery: '갤러리', reviews: '리뷰', seeOnGoogle: 'Google에서 보기',
    reviewsCount: '개의 리뷰',
    notFoundTitle: '존재하지 않는 프로필입니다', notFoundText: '링크를 확인하거나 Mycen에서 나만의 프로필을 만들어 보세요.',
    unavailableTitle: '이 프로필은 현재 이용할 수 없습니다', unavailableText: '소유자가 아직 공개하지 않았거나 잠시 중단했습니다.',
    errorTitle: '프로필을 불러오지 못했습니다', errorText: '연결 상태를 확인하고 다시 시도해 주세요.',
    retry: '다시 시도', createYours: '나의 Mycen 만들기', draftBanner: '미리보기: 이 프로필은 아직 공개되지 않았습니다.',
    footer: 'Mycen 아이덴티티',
    days: { monday: '월', tuesday: '화', wednesday: '수', thursday: '목', friday: '금', saturday: '토', sunday: '일' },
    languageLabel: '언어', socials: '소셜 미디어', close: '닫기', cards: '카드',
    swipeHint: '밀어서 더 보기', tags: '카테고리',
    projects: "프로젝트", viewProject: "프로젝트 보기", credits: "크레딧", backToProfile: "프로필로 돌아가기", projectNotFoundTitle: "존재하지 않는 프로젝트입니다", projectNotFoundText: "링크를 확인하거나 전체 프로필을 보세요.", projectUnavailableTitle: "이 프로젝트는 볼 수 없습니다", projectUnavailableText: "소유자가 아직 게시하지 않았거나 게시를 취소했습니다.", projectDraftBanner: "미리보기: 이 프로젝트는 아직 공개되지 않았습니다.", video: "동영상",
    links: '링크',
    report: '신고', reportTitle: '이 프로필 신고', reportProjectTitle: '이 프로젝트 신고', reportIntro: '무엇이 문제인지 알려 주세요. Mycen 팀이 검토하며, 소유자는 신고자를 알 수 없습니다.', reportReason: '사유', reportDetails: '상세 내용(선택)', reportSend: '신고 보내기', reportSending: '보내는 중…', reportThanks: '감사합니다. 신고가 접수되었으며 검토하겠습니다.', reportDuplicate: '이 프로필에 대한 신고가 이미 접수되어 검토 중입니다.', reportLimit: '오늘 신고를 너무 많이 보냈습니다. 내일 다시 시도하세요.', reportError: '신고를 보내지 못했습니다. 연결을 확인하고 다시 시도하세요.', cancel: '취소', rules: '콘텐츠 규칙',
    reportReasons: { spam: '스팸 또는 오해의 소지가 있는 광고', scam: '사기', impersonation: '다른 사람이나 브랜드를 사칭함', hate: '혐오 또는 괴롭힘', violence: '폭력 또는 위협', sexual: '성적인 콘텐츠', illegal: '불법적인 내용', other: '기타' },
  },
  hi: {
    openNow: 'अभी खुला है', closedNow: 'अभी बंद है', share: 'शेयर करें', linkCopied: 'लिंक कॉपी हो गया',
    saveContact: 'संपर्क सहेजें', contact: 'संपर्क', location: 'पता', howToGet: 'रास्ता देखें',
    hours: 'समय', closed: 'बंद', gallery: 'गैलरी', reviews: 'समीक्षाएँ', seeOnGoogle: 'Google पर देखें',
    reviewsCount: 'समीक्षाएँ',
    notFoundTitle: 'यह प्रोफ़ाइल मौजूद नहीं है', notFoundText: 'लिंक जाँचें या Mycen पर अपनी पहचान बनाएँ।',
    unavailableTitle: 'यह प्रोफ़ाइल उपलब्ध नहीं है', unavailableText: 'इसके मालिक ने इसे अभी प्रकाशित नहीं किया है या अस्थायी रूप से रोक दिया है।',
    errorTitle: 'प्रोफ़ाइल लोड नहीं हो सकी', errorText: 'अपना कनेक्शन जाँचें और फिर से कोशिश करें।',
    retry: 'फिर से कोशिश करें', createYours: 'अपना Mycen बनाएँ', draftBanner: 'पूर्वावलोकन: यह प्रोफ़ाइल अभी सार्वजनिक नहीं है।',
    footer: 'एक Mycen पहचान',
    days: { monday: 'सोम', tuesday: 'मंगल', wednesday: 'बुध', thursday: 'गुरु', friday: 'शुक्र', saturday: 'शनि', sunday: 'रवि' },
    languageLabel: 'भाषा', socials: 'सोशल मीडिया', close: 'बंद करें', cards: 'कार्ड',
    swipeHint: 'और देखने के लिए स्वाइप करें', tags: 'श्रेणियाँ',
    projects: "प्रोजेक्ट", viewProject: "प्रोजेक्ट देखें", credits: "श्रेय", backToProfile: "प्रोफ़ाइल पर वापस", projectNotFoundTitle: "यह प्रोजेक्ट मौजूद नहीं है", projectNotFoundText: "लिंक जाँचें या पूरी प्रोफ़ाइल देखें।", projectUnavailableTitle: "यह प्रोजेक्ट उपलब्ध नहीं है", projectUnavailableText: "इसके मालिक ने इसे अभी प्रकाशित नहीं किया है या हटा दिया है।", projectDraftBanner: "पूर्वावलोकन: यह प्रोजेक्ट अभी सार्वजनिक नहीं है।", video: "वीडियो",
    links: 'लिंक',
    report: 'रिपोर्ट करें', reportTitle: 'यह प्रोफ़ाइल रिपोर्ट करें', reportProjectTitle: 'यह प्रोजेक्ट रिपोर्ट करें', reportIntro: 'बताएँ क्या गलत है। Mycen टीम इसकी समीक्षा करती है; मालिक को पता नहीं चलेगा कि रिपोर्ट किसने की।', reportReason: 'कारण', reportDetails: 'विवरण (वैकल्पिक)', reportSend: 'रिपोर्ट भेजें', reportSending: 'भेजा जा रहा है…', reportThanks: 'धन्यवाद। हमें आपकी रिपोर्ट मिल गई है और हम इसकी समीक्षा करेंगे।', reportDuplicate: 'इस प्रोफ़ाइल पर आपकी रिपोर्ट हमें पहले ही मिल चुकी है। हम समीक्षा कर रहे हैं।', reportLimit: 'आज आपने बहुत सारी रिपोर्ट भेजी हैं। कल फिर से कोशिश करें।', reportError: 'रिपोर्ट नहीं भेजी जा सकी। कनेक्शन जाँचें और फिर से कोशिश करें।', cancel: 'रद्द करें', rules: 'सामग्री के नियम',
    reportReasons: { spam: 'स्पैम या भ्रामक विज्ञापन', scam: 'धोखाधड़ी', impersonation: 'किसी और व्यक्ति या ब्रांड का रूप धारण', hate: 'नफ़रत या उत्पीड़न', violence: 'हिंसा या धमकी', sexual: 'यौन सामग्री', illegal: 'कुछ गैर-कानूनी', other: 'कुछ और' },
  },
  ar: {
    openNow: 'مفتوح الآن', closedNow: 'مغلق الآن', share: 'مشاركة', linkCopied: 'تم نسخ الرابط',
    saveContact: 'حفظ جهة الاتصال', contact: 'التواصل', location: 'الموقع', howToGet: 'الاتجاهات',
    hours: 'ساعات العمل', closed: 'مغلق', gallery: 'المعرض', reviews: 'التقييمات', seeOnGoogle: 'عرض على Google',
    reviewsCount: 'تقييمات',
    notFoundTitle: 'هذا الملف غير موجود', notFoundText: 'تحقّق من الرابط أو أنشئ هويتك الخاصة على Mycen.',
    unavailableTitle: 'هذا الملف غير متاح', unavailableText: 'لم ينشره صاحبه بعد أو أوقفه مؤقتًا.',
    errorTitle: 'تعذّر تحميل الملف', errorText: 'تحقّق من اتصالك وحاول مرة أخرى.',
    retry: 'إعادة المحاولة', createYours: 'أنشئ Mycen الخاص بك', draftBanner: 'معاينة: هذا الملف ليس عامًا بعد.',
    footer: 'هوية Mycen',
    days: { monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد' },
    languageLabel: 'اللغة', socials: 'وسائل التواصل', close: 'إغلاق', cards: 'بطاقات',
    swipeHint: 'اسحب لرؤية المزيد', tags: 'الفئات',
    projects: "المشاريع", viewProject: "عرض المشروع", credits: "الاعتمادات", backToProfile: "العودة إلى الملف", projectNotFoundTitle: "هذا المشروع غير موجود", projectNotFoundText: "تحقق من الرابط أو اطّلع على الملف الكامل.", projectUnavailableTitle: "هذا المشروع غير متاح", projectUnavailableText: "لم ينشره صاحبه بعد أو ألغى نشره.", projectDraftBanner: "معاينة: هذا المشروع ليس عامًا بعد.", video: "فيديو",
    links: 'روابط',
    report: 'إبلاغ', reportTitle: 'الإبلاغ عن هذا الملف', reportProjectTitle: 'الإبلاغ عن هذا المشروع', reportIntro: 'أخبرنا بما يحدث. يراجعه فريق Mycen، ولن يعرف المالك من أبلغ.', reportReason: 'السبب', reportDetails: 'تفاصيل (اختياري)', reportSend: 'إرسال البلاغ', reportSending: 'جارٍ الإرسال…', reportThanks: 'شكرًا. تلقينا بلاغك وسنراجعه.', reportDuplicate: 'تلقينا بلاغك عن هذا الملف بالفعل، ونحن نراجعه.', reportLimit: 'أرسلت بلاغات كثيرة اليوم. حاول غدًا.', reportError: 'تعذّر إرسال البلاغ. تحقق من اتصالك وحاول مرة أخرى.', cancel: 'إلغاء', rules: 'قواعد المحتوى',
    reportReasons: { spam: 'رسائل مزعجة أو إعلانات مضللة', scam: 'احتيال', impersonation: 'ينتحل شخصية أحد أو علامة تجارية', hate: 'كراهية أو تحرش', violence: 'عنف أو تهديد', sexual: 'محتوى جنسي', illegal: 'شيء غير قانوني', other: 'سبب آخر' },
  },
  ru: {
    openNow: 'Открыто', closedNow: 'Закрыто', share: 'Поделиться', linkCopied: 'Ссылка скопирована',
    saveContact: 'Сохранить контакт', contact: 'Контакты', location: 'Адрес', howToGet: 'Как добраться',
    hours: 'Часы работы', closed: 'Выходной', gallery: 'Галерея', reviews: 'Отзывы', seeOnGoogle: 'Смотреть в Google',
    reviewsCount: 'отзывов',
    notFoundTitle: 'Такого профиля нет', notFoundText: 'Проверьте ссылку или создайте свой профиль в Mycen.',
    unavailableTitle: 'Профиль недоступен', unavailableText: 'Владелец ещё не опубликовал его или временно приостановил.',
    errorTitle: 'Не удалось загрузить профиль', errorText: 'Проверьте подключение и попробуйте снова.',
    retry: 'Повторить', createYours: 'Создайте свой Mycen', draftBanner: 'Предпросмотр: профиль ещё не опубликован.',
    footer: 'Профиль Mycen',
    days: { monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс' },
    languageLabel: 'Язык', socials: 'Соцсети', close: 'Закрыть', cards: 'Карточки',
    swipeHint: 'листайте, чтобы увидеть больше', tags: 'Категории',
    projects: "Проекты", viewProject: "Открыть проект", credits: "Авторы", backToProfile: "Назад к профилю", projectNotFoundTitle: "Такого проекта нет", projectNotFoundText: "Проверьте ссылку или откройте весь профиль.", projectUnavailableTitle: "Этот проект недоступен", projectUnavailableText: "Владелец ещё не опубликовал его или снял с публикации.", projectDraftBanner: "Предпросмотр: этот проект ещё не опубликован.", video: "Видео",
    links: 'Ссылки',
    report: 'Пожаловаться', reportTitle: 'Пожаловаться на профиль', reportProjectTitle: 'Пожаловаться на проект', reportIntro: 'Расскажите, в чём проблема. Жалобу проверит команда Mycen; владелец не узнает, кто её отправил.', reportReason: 'Причина', reportDetails: 'Подробности (необязательно)', reportSend: 'Отправить жалобу', reportSending: 'Отправка…', reportThanks: 'Спасибо. Мы получили жалобу и рассмотрим её.', reportDuplicate: 'Мы уже получили вашу жалобу на этот профиль и рассматриваем её.', reportLimit: 'Сегодня вы отправили слишком много жалоб. Попробуйте завтра.', reportError: 'Не удалось отправить жалобу. Проверьте подключение и попробуйте ещё раз.', cancel: 'Отмена', rules: 'Правила контента',
    reportReasons: { spam: 'Спам или обманная реклама', scam: 'Мошенничество', impersonation: 'Выдаёт себя за другого человека или бренд', hate: 'Ненависть или травля', violence: 'Насилие или угрозы', sexual: 'Сексуальный контент', illegal: 'Что-то незаконное', other: 'Другое' },
  },
}

export function ui(lang: ProfileLang): UiStrings {
  return UI[lang] ?? UI.es
}

/** Etiquetas conocidas (acción principal, títulos importados del Hub) traducidas. */
const KNOWN_LABELS: Record<string, Partial<Record<ProfileLang, string>>> = {
  'Ver menú':     { en: 'View menu', pt: 'Ver cardápio', fr: 'Voir le menu', de: 'Speisekarte', it: 'Vedi menù', zh: '查看菜单', ja: 'メニューを見る', ko: '메뉴 보기', hi: 'मेनू देखें', ar: 'عرض القائمة', ru: 'Меню' },
  'Ver catálogo': { en: 'View catalog', pt: 'Ver catálogo', fr: 'Voir le catalogue', de: 'Katalog ansehen', it: 'Vedi catalogo', zh: '查看目录', ja: 'カタログを見る', ko: '카탈로그 보기', hi: 'कैटलॉग देखें', ar: 'عرض الكتالوج', ru: 'Каталог' },
  'Contactar':    { en: 'Contact', pt: 'Entrar em contato', fr: 'Contacter', de: 'Kontakt', it: 'Contatta', zh: '联系', ja: '問い合わせ', ko: '문의하기', hi: 'संपर्क करें', ar: 'تواصل', ru: 'Связаться' },
  'Reservar':     { en: 'Book a table', pt: 'Reservar', fr: 'Réserver', de: 'Reservieren', it: 'Prenota', zh: '预订', ja: '予約する', ko: '예약하기', hi: 'बुक करें', ar: 'احجز', ru: 'Забронировать' },
  'Ver más':      { en: 'See more', pt: 'Ver mais', fr: 'Voir plus', de: 'Mehr ansehen', it: 'Vedi di più', zh: '查看更多', ja: 'もっと見る', ko: '더 보기', hi: 'और देखें', ar: 'عرض المزيد', ru: 'Подробнее' },
  'Contacto':     { en: 'Contact', pt: 'Contato', fr: 'Contact', de: 'Kontakt', it: 'Contatti', zh: '联系方式', ja: '連絡先', ko: '연락처', hi: 'संपर्क', ar: 'التواصل', ru: 'Контакты' },
  'Ubicación':    { en: 'Location', pt: 'Localização', fr: 'Adresse', de: 'Standort', it: 'Posizione', zh: '位置', ja: '所在地', ko: '위치', hi: 'पता', ar: 'الموقع', ru: 'Адрес' },
  'Horarios':     { en: 'Hours', pt: 'Horários', fr: 'Horaires', de: 'Öffnungszeiten', it: 'Orari', zh: '营业时间', ja: '営業時間', ko: '영업시간', hi: 'समय', ar: 'ساعات العمل', ru: 'Часы работы' },
  'Galería':      { en: 'Gallery', pt: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria', zh: '相册', ja: 'ギャラリー', ko: '갤러리', hi: 'गैलरी', ar: 'المعرض', ru: 'Галерея' },
  'Reseñas':      { en: 'Reviews', pt: 'Avaliações', fr: 'Avis', de: 'Bewertungen', it: 'Recensioni', zh: '评价', ja: 'レビュー', ko: '리뷰', hi: 'समीक्षाएँ', ar: 'التقييمات', ru: 'Отзывы' },
}

export function trLabel(label: string | null | undefined, lang: ProfileLang): string {
  if (!label) return ''
  return KNOWN_LABELS[label]?.[lang] ?? label
}

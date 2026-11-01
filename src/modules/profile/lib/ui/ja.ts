import type { UiStrings } from '../profileI18n'

// Textos de la página pública en ja (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: '営業中', closedNow: '営業時間外', share: '共有', linkCopied: 'リンクをコピーしました',
    saveContact: '連絡先を保存', contact: '連絡先', location: '所在地', howToGet: '経路',
    hours: '営業時間', closed: '定休日', gallery: 'ギャラリー', reviews: 'レビュー', seeOnGoogle: 'Google で見る',
    reviewsCount: '件のレビュー',
    notFoundTitle: 'このプロフィールは存在しません', notFoundText: 'リンクを確認するか、Mycen で自分のプロフィールを作成してください。',
    unavailableTitle: 'このプロフィールは現在ご利用いただけません', unavailableText: 'オーナーがまだ公開していないか、一時停止中です。',
    errorTitle: 'プロフィールを読み込めませんでした', errorText: '接続を確認して、もう一度お試しください。',
    retry: '再試行', createYours: 'Mycen をつくる', draftBanner: 'プレビュー：このプロフィールはまだ公開されていません。',
    footer: 'Mycen のプロフィール',
    verified: '認証済みアカウント', available: '対応可能', moreAboutMe: 'もっと見る', createIdentity: 'あなたのアイデンティティをつくる', createFree: '無料で Mycen をつくる', call: '電話', copyLink: 'リンクをコピー', qrCode: 'QRコード', moreOptions: 'その他', backToTop: 'トップへ戻る', votesCount: "{n}票", oneVote: "1票", noVotes: "まだ投票はありません。あなたが最初です", yourVote: "あなたの投票", download: "ダウンロード", copyCode: "コードをコピー", codeCopied: "コードをコピーしました", validUntil: "{date}まで有効", useCoupon: "クーポンを使う", listen: "聴く", pause: "一時停止", videos: "動画", podcast: "ポッドキャスト", episodes: "エピソード", emailLabel: 'メール', playOn: '{provider} で再生',
    days: { monday: '月', tuesday: '火', wednesday: '水', thursday: '木', friday: '金', saturday: '土', sunday: '日' },
    languageLabel: '言語', socials: 'SNS', close: '閉じる', prevPhoto: '前の写真', nextPhoto: '次の写真', cards: 'カード',
    swipeHint: 'スワイプしてもっと見る', tickets: 'チケット', tags: 'カテゴリー',
    projects: "プロジェクト", viewProject: "プロジェクトを見る", credits: "クレジット", backToProfile: "プロフィールに戻る", projectNotFoundTitle: "このプロジェクトは存在しません", projectNotFoundText: "リンクを確認するか、プロフィール全体をご覧ください。", projectUnavailableTitle: "このプロジェクトは公開されていません", projectUnavailableText: "所有者がまだ公開していないか、公開を停止しました。", projectDraftBanner: "プレビュー：このプロジェクトはまだ公開されていません。", video: "動画",
    links: 'リンク',
    report: '報告する', reportTitle: 'このプロフィールを報告', reportProjectTitle: 'このプロジェクトを報告', reportIntro: '何が問題か教えてください。Mycenチームが確認します。報告者が誰かは所有者に知らされません。', reportReason: '理由', reportDetails: '詳細（任意）', reportSend: '報告を送信', reportSending: '送信中…', reportThanks: 'ありがとうございます。報告を受け付けました。確認します。', reportDuplicate: 'このプロフィールについての報告はすでに受け付けています。確認中です。', reportLimit: '本日は多くの報告が送信されました。明日もう一度お試しください。', reportError: '報告を送信できませんでした。接続を確認して、もう一度お試しください。', cancel: 'キャンセル', rules: 'コンテンツのルール',
    reportReasons: { spam: 'スパム・誤解を招く広告', scam: '詐欺', impersonation: '他人やブランドになりすましている', hate: 'ヘイト・嫌がらせ', violence: '暴力・脅迫', sexual: '性的なコンテンツ', illegal: '違法なもの', other: 'その他' },
}

export default ui

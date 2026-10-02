import type { LifeDict } from './es'

const ja: LifeDict = {
  common: {
    cancel: 'キャンセル', confirm: '確認', save: '保存', saving: '保存中…', edit: '編集', delete: '削除',
    close: '閉じる', search: '検索', saveError: '保存できませんでした。接続を確認して、もう一度お試しください。', saved: '保存しました',
  },
  nav: { life: 'ホーム', money: 'お金', goals: '目標', habits: '習慣', brain: 'Brain', settings: '設定' },
  capture: { open: 'クイック記録', close: '閉じる', idea: 'アイデア', note: 'メモ', task: 'タスク', goal: '目標', transaction: '収支' },
  home: {
    greetMorning: 'おはようございます', greetAfternoon: 'こんにちは', greetEvening: 'こんばんは',
    myBusiness: 'マイビジネス', identityTitle: 'マイ アイデンティティ', identitySubtitle: 'あなたのデジタルアイデンティティを一か所に',
    openStudio: 'Studio を開く', viewProfile: 'プロフィールを見る', today: '今日',
    goalsValue: n => `${n} 件進行中`, habitsValue: (d, t) => `今日 ${d}/${t}`, tasksValue: n => `${n} 件未完了`,
    recap: '✦ 今月の振り返りを見る', settings: '設定', language: '言語',
  },
  settings: {
    title: '設定', subtitle: 'アカウントの言語・通貨・地域。',
    language: '言語', languageHelp: 'Life OS、Studio、プロフィールで使われます。',
    currency: 'メイン通貨', currencyHelp: 'お金の合計はこの通貨で表示されます。',
    extraCurrencies: 'その他の通貨',
    extraHelp: '他の通貨で収支を記録するためのものです（最大 5 つ）。通貨ごとに別々に集計し、金額の換算は行いません。',
    addCurrency: '通貨を追加', removeCurrency: c => `${c} を削除`, searchCurrency: '通貨を検索…',
    timezone: 'タイムゾーン', timezoneHelp: '1 日の始まりと終わりを決めます。',
    weekStart: '週の始まり', monday: '月曜日', sunday: '日曜日',
    account: 'アカウント', openStudio: 'Mycen Studio を開く', signOut: 'ログアウト', savedOk: '設定を保存しました', noResults: '該当なし',
  },
  money: {
    title: 'お金', add: '新しい収支', balance: m => `${m}の収支`, otherCurrencies: '今月のその他の通貨',
    income: '収入', expense: '支出', today: '今日', yesterday: '昨日', net: '純額',
    emptyTitle: 'お金の流れを見える化', emptyText: '収入と支出を記録して、お金の行き先を確認しましょう。',
    emptyAction: '最初の収支を追加', options: 'オプション', deleteTitle: 'この収支を削除しますか？',
    deleteText: (k, a, c) => `${c}の${k}：${a}`, incomeOne: '収入', expenseOne: '支出',
  },
  tx: {
    newTitle: '新しい収支', editTitle: '収支を編集', income: '収入', expense: '支出', amount: '金額',
    currency: '通貨', category: 'カテゴリー', description: 'メモ（任意）', descriptionPlaceholder: '何に使いましたか？',
    date: '日付', invalidAmount: '有効な金額を入力してください', create: '収支を記録', update: '変更を保存',
  },
  categories: {
    Sueldo: '給与', Freelance: 'フリーランス', Comisiones: '手数料', Ventas: '売上', Inversiones: '投資',
    Vivienda: '住居', Transporte: '交通', Comida: '食費', Ocio: '娯楽', Salud: '健康',
    Suscripciones: 'サブスク', Ropa: '衣服', Otros: 'その他',
  },
}
export default ja

import type { LifeDict } from './es'

const zh: LifeDict = {
  common: {
    cancel: '取消', confirm: '确认', save: '保存', saving: '正在保存…', edit: '编辑', delete: '删除',
    close: '关闭', search: '搜索', saveError: '保存失败。请检查网络连接后重试。', saved: '已保存',
  },
  nav: { life: '首页', money: '财务', goals: '目标', habits: '习惯', brain: 'Brain', settings: '设置' },
  capture: { open: '快速记录', close: '关闭', idea: '想法', note: '笔记', task: '任务', goal: '目标', transaction: '收支' },
  home: {
    greetMorning: '早上好', greetAfternoon: '下午好', greetEvening: '晚上好',
    myBusiness: '我的商家', identityTitle: '我的身份', identitySubtitle: '你的数字身份，汇聚一处',
    openStudio: '打开 Studio', viewProfile: '查看主页', today: '今天',
    goalsValue: n => `${n} 个进行中`, habitsValue: (d, t) => `今天 ${d}/${t}`, tasksValue: n => `${n} 个待办`,
    recap: '✦ 查看本月回顾', settings: '设置', language: '语言',
  },
  settings: {
    title: '设置', subtitle: '账户的语言、货币和地区。',
    language: '语言', languageHelp: '用于 Life OS、Studio 和你的主页。',
    currency: '主要货币', currencyHelp: '财务汇总以此货币显示。',
    extraCurrencies: '其他货币',
    extraHelp: '用于记录其他货币的收支（最多 5 种）。各货币分别汇总，我们不会换算金额。',
    addCurrency: '添加货币', removeCurrency: c => `移除 ${c}`, searchCurrency: '搜索货币…',
    timezone: '时区', timezoneHelp: '决定你的一天何时开始和结束。',
    weekStart: '每周开始于', monday: '星期一', sunday: '星期日',
    account: '账户', openStudio: '打开 Mycen Studio', signOut: '退出登录', savedOk: '设置已保存', noResults: '无结果',
  },
  money: {
    title: '财务', add: '新建收支', balance: m => `${m}结余`, otherCurrencies: '本月其他货币',
    income: '收入', expense: '支出', today: '今天', yesterday: '昨天', net: '净额',
    emptyTitle: '让你的钱一目了然', emptyText: '记录收入和支出，看看钱都花在了哪里。',
    emptyAction: '添加第一笔收支', options: '选项', deleteTitle: '删除这笔收支？',
    deleteText: (k, a, c) => `${c}的${k}：${a}。`, incomeOne: '收入', expenseOne: '支出',
  },
  tx: {
    newTitle: '新建收支', editTitle: '编辑收支', income: '收入', expense: '支出', amount: '金额',
    currency: '货币', category: '类别', description: '说明（可选）', descriptionPlaceholder: '用途是什么？',
    date: '日期', invalidAmount: '请输入有效金额', create: '记录收支', update: '保存修改',
  },
  categories: {
    Sueldo: '工资', Freelance: '自由职业', Comisiones: '佣金', Ventas: '销售', Inversiones: '投资',
    Vivienda: '住房', Transporte: '交通', Comida: '餐饮', Ocio: '休闲', Salud: '健康',
    Suscripciones: '订阅', Ropa: '服装', Otros: '其他',
  },
}
export default zh

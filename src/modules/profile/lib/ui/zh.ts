import type { UiStrings } from '../profileI18n'

// Textos de la página pública en zh (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: '营业中', closedNow: '已打烊', share: '分享', linkCopied: '链接已复制',
    saveContact: '保存联系人', contact: '联系方式', location: '位置', howToGet: '导航',
    hours: '营业时间', closed: '休息', gallery: '相册', reviews: '评价', seeOnGoogle: '在 Google 上查看',
    reviewsCount: '条评价',
    notFoundTitle: '该主页不存在', notFoundText: '请检查链接，或在 Mycen 创建你自己的主页。',
    unavailableTitle: '该主页暂不可用', unavailableText: '主人尚未发布或已暂停。',
    errorTitle: '无法加载主页', errorText: '请检查网络连接后重试。',
    retry: '重试', createYours: '创建你的 Mycen', draftBanner: '预览：此主页尚未公开。',
    footer: 'Mycen 身份主页',
    verified: '已认证账号', available: '可接洽', moreAboutMe: '了解更多', createIdentity: '创建你的身份', createFree: '免费创建你的 Mycen', call: '打电话', copyLink: '复制链接', qrCode: '二维码', moreOptions: '更多选项', backToTop: '回到顶部', emailLabel: '邮件', playOn: '在 {provider} 播放',
    days: { monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四', friday: '周五', saturday: '周六', sunday: '周日' },
    languageLabel: '语言', socials: '社交媒体', close: '关闭', prevPhoto: '上一张', nextPhoto: '下一张', cards: '卡片',
    swipeHint: '滑动查看更多', tickets: '购票', tags: '分类',
    projects: "项目", viewProject: "查看项目", credits: "鸣谢", backToProfile: "返回主页", projectNotFoundTitle: "该项目不存在", projectNotFoundText: "请检查链接或查看完整主页。", projectUnavailableTitle: "该项目暂不可用", projectUnavailableText: "所有者尚未发布或已取消发布。", projectDraftBanner: "预览：该项目尚未公开。", video: "视频",
    links: '链接',
    report: '举报', reportTitle: '举报此主页', reportProjectTitle: '举报此项目', reportIntro: '告诉我们发生了什么。由 Mycen 团队审核，所有者不会知道是谁举报的。', reportReason: '原因', reportDetails: '详细说明（可选）', reportSend: '提交举报', reportSending: '正在提交…', reportThanks: '谢谢。我们已收到你的举报，会进行审核。', reportDuplicate: '我们已收到你对此主页的举报，正在审核。', reportLimit: '你今天提交的举报太多了，请明天再试。', reportError: '举报未能提交。请检查网络后重试。', cancel: '取消', rules: '内容规则',
    reportReasons: { spam: '垃圾信息或误导性广告', scam: '诈骗或欺诈', impersonation: '冒充他人或品牌', hate: '仇恨或骚扰', violence: '暴力或威胁', sexual: '色情内容', illegal: '违法内容', other: '其他原因' },
}

export default ui

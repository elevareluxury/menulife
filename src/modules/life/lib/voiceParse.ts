// Cargar con la voz (V1.1): del texto dictado a un gasto, ingreso, tarea o idea. Reglas simples por idioma, en el
// dispositivo (sin IA ni servidores): palabras clave, el primer número como monto, y "hoy/mañana/el lunes" y
// "a las 10" como fecha y hora. Quien dicta siempre confirma (y puede corregir) antes de guardar.

import type { AppLang } from '@/i18n/app/languages'

export type VoiceKind = 'expense' | 'income' | 'task' | 'idea'

export interface VoiceResult {
  kind: VoiceKind
  /** Lo que queda como descripción o título */
  text: string
  amount: number | null
  /** "YYYY-MM-DD" local */
  date: string | null
  /** "HH:MM" */
  time: string | null
}

interface Lexicon {
  expense: string[]
  income: string[]
  task: string[]
  idea: string[]
  today: string[]
  tomorrow: string[]
  afterTomorrow: string[]
  /** Domingo … sábado */
  weekdays: string[][]
  /** "a las", "at" … (antes de la hora) */
  at: string[]
  /** Palabras de relleno al principio de la descripción ("en", "de", "para"…) */
  fillers: string[]
  thousand: string[]
  pm: string[]
}

const L: Record<AppLang, Lexicon> = {
  es: {
    expense: ['gasté', 'gaste', 'pagué', 'pague', 'compré', 'compre', 'gasto', 'gastos'],
    income: ['cobré', 'cobre', 'me pagaron', 'recibí', 'recibi', 'gané', 'gane', 'ingreso', 'me depositaron'],
    task: ['recordame', 'recuérdame', 'recuerdame', 'tengo que', 'hay que', 'tarea', 'no olvidar', 'acordarme de'],
    idea: ['idea', 'anotá', 'anota', 'nota'],
    today: ['hoy'], tomorrow: ['mañana'], afterTomorrow: ['pasado mañana'],
    weekdays: [['domingo'], ['lunes'], ['martes'], ['miércoles', 'miercoles'], ['jueves'], ['viernes'], ['sábado', 'sabado']],
    at: ['a las', 'a la'], fillers: ['en', 'de', 'del', 'para', 'por', 'el', 'la', 'los', 'las', 'un', 'una', 'que', 'pesos', 'dólares', 'dolares', 'euros'],
    thousand: ['mil', 'k'], pm: ['de la tarde', 'de la noche', 'pm'],
  },
  en: {
    expense: ['spent', 'paid', 'bought', 'expense'],
    income: ['earned', 'got paid', 'received', 'income', 'made'],
    task: ['remind me to', 'remind me', 'i have to', 'i need to', 'need to', 'todo', 'to do', 'task'],
    idea: ['idea', 'note'],
    today: ['today', 'tonight'], tomorrow: ['tomorrow'], afterTomorrow: ['day after tomorrow'],
    weekdays: [['sunday'], ['monday'], ['tuesday'], ['wednesday'], ['thursday'], ['friday'], ['saturday']],
    at: ['at'], fillers: ['i', 'we', 'on', 'for', 'at', 'from', 'the', 'a', 'an', 'to', 'of', 'my', 'dollars', 'bucks', 'euros', 'pounds'],
    thousand: ['thousand', 'k', 'grand'], pm: ['pm', 'p.m.', 'in the evening', 'in the afternoon'],
  },
  pt: {
    expense: ['gastei', 'paguei', 'comprei', 'gasto'],
    income: ['recebi', 'ganhei', 'me pagaram', 'entrada'],
    task: ['me lembra', 'lembre-me', 'tenho que', 'preciso', 'tarefa'],
    idea: ['ideia', 'anota', 'nota'],
    today: ['hoje'], tomorrow: ['amanhã', 'amanha'], afterTomorrow: ['depois de amanhã'],
    weekdays: [['domingo'], ['segunda'], ['terça', 'terca'], ['quarta'], ['quinta'], ['sexta'], ['sábado', 'sabado']],
    at: ['às', 'as', 'à'], fillers: ['no', 'na', 'em', 'de', 'do', 'da', 'para', 'o', 'a', 'um', 'uma', 'reais'],
    thousand: ['mil'], pm: ['da tarde', 'da noite'],
  },
  fr: {
    expense: ["j'ai dépensé", 'dépensé', "j'ai payé", 'payé', "j'ai acheté", 'acheté', 'dépense'],
    income: ["j'ai reçu", 'reçu', "j'ai gagné", 'gagné', 'revenu'],
    task: ['rappelle-moi de', 'rappelle-moi', 'je dois', 'il faut', 'tâche'],
    idea: ['idée', 'note'],
    today: ["aujourd'hui", 'ce soir'], tomorrow: ['demain'], afterTomorrow: ['après-demain'],
    weekdays: [['dimanche'], ['lundi'], ['mardi'], ['mercredi'], ['jeudi'], ['vendredi'], ['samedi']],
    at: ['à'], fillers: ['au', 'aux', 'à', 'de', 'du', 'des', 'pour', 'le', 'la', 'les', 'un', 'une', 'euros'],
    thousand: ['mille'], pm: ['du soir', "de l'après-midi"],
  },
  de: {
    expense: ['ausgegeben', 'bezahlt', 'gekauft', 'ausgabe'],
    income: ['bekommen', 'verdient', 'erhalten', 'einnahme'],
    task: ['erinnere mich', 'ich muss', 'muss', 'aufgabe'],
    idea: ['idee', 'notiz'],
    today: ['heute'], tomorrow: ['morgen'], afterTomorrow: ['übermorgen'],
    weekdays: [['sonntag'], ['montag'], ['dienstag'], ['mittwoch'], ['donnerstag'], ['freitag'], ['samstag']],
    at: ['um'], fillers: ['für', 'im', 'in', 'bei', 'beim', 'am', 'der', 'die', 'das', 'den', 'ein', 'eine', 'euro', 'an'],
    thousand: ['tausend'], pm: ['abends', 'nachmittags'],
  },
  it: {
    expense: ['ho speso', 'speso', 'ho pagato', 'pagato', 'ho comprato', 'comprato', 'spesa'],
    income: ['ho ricevuto', 'ricevuto', 'ho guadagnato', 'guadagnato', 'entrata'],
    task: ['ricordami di', 'ricordami', 'devo', 'bisogna', 'attività'],
    idea: ['idea', 'nota'],
    today: ['oggi', 'stasera'], tomorrow: ['domani'], afterTomorrow: ['dopodomani'],
    weekdays: [['domenica'], ['lunedì', 'lunedi'], ['martedì', 'martedi'], ['mercoledì', 'mercoledi'], ['giovedì', 'giovedi'], ['venerdì', 'venerdi'], ['sabato']],
    at: ['alle', 'all'], fillers: ['al', 'alla', 'in', 'di', 'del', 'della', 'per', 'il', 'la', 'lo', 'un', 'una', 'euro'],
    thousand: ['mila', 'mille'], pm: ['di sera', 'del pomeriggio'],
  },
  zh: {
    expense: ['花了', '付了', '买了', '支出'],
    income: ['收到', '赚了', '工资', '收入'],
    task: ['提醒我', '我要', '要去', '任务'],
    idea: ['想法', '记一下', '笔记'],
    today: ['今天'], tomorrow: ['明天'], afterTomorrow: ['后天'],
    weekdays: [['星期天', '星期日', '周日'], ['星期一', '周一'], ['星期二', '周二'], ['星期三', '周三'], ['星期四', '周四'], ['星期五', '周五'], ['星期六', '周六']],
    at: [], fillers: ['在', '的', '元', '块'], thousand: ['千'], pm: ['下午', '晚上'],
  },
  ja: {
    expense: ['使った', '払った', '買った', '支出'],
    income: ['もらった', '入金', '稼いだ', '収入'],
    task: ['リマインド', 'しなきゃ', 'しないと', 'やること', 'タスク'],
    idea: ['アイデア', 'メモ'],
    today: ['今日'], tomorrow: ['明日'], afterTomorrow: ['明後日'],
    weekdays: [['日曜'], ['月曜'], ['火曜'], ['水曜'], ['木曜'], ['金曜'], ['土曜']],
    at: [], fillers: ['で', 'に', 'を', 'の', '円'], thousand: ['千'], pm: ['午後', '夜'],
  },
  ko: {
    expense: ['썼어', '썼다', '결제', '샀어', '지출'],
    income: ['받았어', '들어왔어', '벌었어', '수입'],
    task: ['알려줘', '해야', '할 일'],
    idea: ['아이디어', '메모'],
    today: ['오늘'], tomorrow: ['내일'], afterTomorrow: ['모레'],
    weekdays: [['일요일'], ['월요일'], ['화요일'], ['수요일'], ['목요일'], ['금요일'], ['토요일']],
    at: [], fillers: ['에서', '에', '원'], thousand: ['천'], pm: ['오후', '저녁'],
  },
  hi: {
    expense: ['खर्च किए', 'खर्च', 'दिए', 'खरीदा', 'भुगतान'],
    income: ['मिले', 'कमाए', 'आमदनी', 'वेतन'],
    task: ['याद दिलाना', 'याद दिला', 'करना है', 'काम'],
    idea: ['आइडिया', 'विचार', 'नोट'],
    today: ['आज'], tomorrow: ['कल'], afterTomorrow: ['परसों'],
    weekdays: [['रविवार'], ['सोमवार'], ['मंगलवार'], ['बुधवार'], ['गुरुवार'], ['शुक्रवार'], ['शनिवार']],
    at: ['बजे'], fillers: ['में', 'पर', 'के', 'की', 'का', 'रुपये', 'लिए'], thousand: ['हज़ार', 'हजार'], pm: ['शाम', 'रात'],
  },
  ar: {
    expense: ['صرفت', 'دفعت', 'اشتريت', 'مصروف'],
    income: ['استلمت', 'قبضت', 'ربحت', 'دخل'],
    task: ['ذكرني', 'يجب أن', 'لازم', 'مهمة'],
    idea: ['فكرة', 'ملاحظة'],
    today: ['اليوم'], tomorrow: ['غدا', 'غدًا', 'بكرة'], afterTomorrow: ['بعد غد'],
    weekdays: [['الأحد'], ['الاثنين'], ['الثلاثاء'], ['الأربعاء'], ['الخميس'], ['الجمعة'], ['السبت']],
    at: ['الساعة'], fillers: ['في', 'على', 'من', 'ل', 'دولار', 'جنيه'], thousand: ['ألف', 'الف'], pm: ['مساء', 'مساءً'],
  },
  ru: {
    expense: ['потратил', 'потратила', 'заплатил', 'заплатила', 'купил', 'купила', 'расход'],
    income: ['получил', 'получила', 'заработал', 'заработала', 'доход', 'зарплата'],
    task: ['напомни', 'нужно', 'надо', 'задача'],
    idea: ['идея', 'заметка'],
    today: ['сегодня'], tomorrow: ['завтра'], afterTomorrow: ['послезавтра'],
    weekdays: [['воскресенье'], ['понедельник'], ['вторник'], ['среду', 'среда'], ['четверг'], ['пятницу', 'пятница'], ['субботу', 'суббота']],
    at: ['в'], fillers: ['на', 'в', 'за', 'для', 'рублей', 'рубля', 'долларов'], thousand: ['тысяч', 'тысячи', 'тысяча', 'тыс'], pm: ['вечера', 'дня'],
  },
}

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Coincidencia de palabra completa (en idiomas sin espacios, por contenido) */
function wordRe(words: string[], cjk: boolean): RegExp | null {
  if (!words.length) return null
  const alt = [...words].sort((a, b) => b.length - a.length).map(escapeRe).join('|')
  return cjk ? new RegExp(`(${alt})`, 'iu') : new RegExp(`(?<![\\p{L}\\p{N}])(${alt})(?![\\p{L}\\p{N}])`, 'iu')
}

export function parseVoice(input: string, lang: AppLang, now = new Date()): VoiceResult {
  const lex = L[lang] ?? L.es
  const cjk = lang === 'zh' || lang === 'ja' || lang === 'ko'
  let text = ` ${input.trim()} `
  const take = (re: RegExp | null): string | null => {
    if (!re) return null
    const m = text.match(re)
    if (!m) return null
    text = text.replace(m[0], ' ')
    return m[1] ?? m[0]
  }

  // Tipo (el primero que aparece gana; "recordame pagar la luz" es una tarea)
  const found: [VoiceKind, number][] = []
  for (const kind of ['task', 'expense', 'income', 'idea'] as const) {
    const re = wordRe(lex[kind], cjk)
    const m = re ? text.match(re) : null
    if (m?.index != null) found.push([kind, m.index])
  }
  found.sort((a, b) => a[1] - b[1])
  let kind: VoiceKind | null = found[0]?.[0] ?? null
  if (kind) take(wordRe(lex[kind], cjk))

  // Fecha
  let date: string | null = null
  const day = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return keyOf(d) }
  if (take(wordRe(lex.afterTomorrow, cjk))) date = day(2)
  else if (take(wordRe(lex.tomorrow, cjk))) date = day(1)
  else if (take(wordRe(lex.today, cjk))) date = day(0)
  else {
    for (let w = 0; w < 7 && !date; w++) {
      if (take(wordRe(lex.weekdays[w], cjk))) date = day(((w - now.getDay() + 7) % 7) || 7)
    }
  }

  // Hora: "a las 10", "10:30", "at 7 pm", "10 de la noche"
  let time: string | null = null
  const atAlt = lex.at.length ? `(?:${[...lex.at].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})` : ''
  const pmRe = wordRe(lex.pm, cjk)
  const timePattern = [
    atAlt ? `(?<![\\p{L}])${atAlt}\\s*(\\d{1,2})(?:[:h](\\d{2}))?(?![\\d.,])` : '(?!x)x()()',
    '(\\d{1,2})[:h](\\d{2})',
    '(\\d{1,2})\\s*(?:時|点|시|uhr)',
  ].join('|')
  const tm = text.match(new RegExp(`(?:${timePattern})\\s*(am|a\\.m\\.|pm|p\\.m\\.)?(?![\\p{L}])`, 'iu'))
  if (tm) {
    let h = Number(tm[1] ?? tm[3] ?? tm[5])
    const min = Number(tm[2] ?? tm[4] ?? 0)
    const suffix = (tm[6] ?? '').toLowerCase()
    const pm = suffix.startsWith('p') || (pmRe ? pmRe.test(text) : false)
    if (pm && h < 12) h += 12
    if (suffix.startsWith('a') && h === 12) h = 0
    if (h <= 23 && min <= 59) {
      time = `${pad(h)}:${pad(min)}`
      text = text.replace(tm[0], ' ')
      if (pmRe) take(pmRe)
    }
  }

  // Monto: el primer número (3.500 / 3,500.50 / 12,50 / "3 mil")
  let amount: number | null = null
  const am = text.match(/(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/u)
  if (am) {
    const raw = am[1].replace(/\s/g, '')
    const lastSep = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'))
    const decimals = lastSep >= 0 && raw.length - lastSep - 1 <= 2 && !/^\d{1,3}([.,]\d{3})+$/.test(raw)
    const value = decimals
      ? Number(raw.slice(0, lastSep).replace(/[.,]/g, '') + '.' + raw.slice(lastSep + 1))
      : Number(raw.replace(/[.,]/g, ''))
    if (Number.isFinite(value) && value > 0) {
      amount = value
      const after = text.slice((am.index ?? 0) + am[0].length)
      const thAlt = [...lex.thousand].sort((a, b) => b.length - a.length).map(escapeRe).join('|')
      const thm = thAlt ? after.match(new RegExp(cjk ? `^\\s*(?:${thAlt})` : `^\\s*(?:${thAlt})(?![\\p{L}\\p{N}])`, 'iu')) : null
      if (thm) { amount *= 1000; text = text.replace(am[0] + after.slice(0, thm[0].length), ' ') } else text = text.replace(am[0], ' ')
      amount = Math.round(amount * 100) / 100
    }
  }
  text = text.replace(/[$€£¥₹₽₩]|\b(ars|usd|eur|brl|mxn)\b/giu, ' ')

  if (!kind) kind = amount != null ? 'expense' : date || time ? 'task' : 'idea'

  // Descripción: sin palabras de relleno al principio ni al final
  const fill = wordRe(lex.fillers, cjk)
  let clean = text.replace(/\s+/g, ' ').trim().replace(/^[,.;:]+|[,.;:]+$/g, '').trim()
  if (fill && !cjk) {
    const edge = new RegExp(`^(?:${fill.source}\\s+)+|(?:\\s+${fill.source})+$`, 'iu')
    for (let i = 0; i < 4; i++) clean = clean.replace(edge, '').trim()
  } else if (cjk && lex.fillers.length) {
    // Partículas y moneda pegadas al final de una palabra ("コーヒーに", "500円")
    const alt = lex.fillers.map(escapeRe).join('|')
    clean = clean.replace(new RegExp(`(?:${alt})(?=\\s|$)`, 'gu'), '').replace(/\s+/g, ' ').trim()
  }
  clean = clean.charAt(0).toLocaleUpperCase() + clean.slice(1)
  return { kind, text: clean.slice(0, 200), amount: kind === 'expense' || kind === 'income' ? amount : null, date, time }
}

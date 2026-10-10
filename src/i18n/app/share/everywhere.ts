// "Poné tu Mycen en todos lados" (V1 · etapa 08; desde la prueba de uso, sólo botones de copiar). Un solo archivo con
// los 12 idiomas. El español es la fuente; cada idioma tiene las mismas claves (lo verifica un test).
import { useAppLang } from '../store'
import type { AppLang } from '../languages'

export const PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'whatsapp_business', 'whatsapp', 'email'] as const
export type Platform = typeof PLATFORMS[number]

/** Nombre de cada plataforma (marcas: no se traducen, salvo la firma de email) y el ?src= de su link */
export const PLATFORM_SRC: Record<Platform, string> = {
  instagram: 'ig', tiktok: 'tt', linkedin: 'li', whatsapp_business: 'wa', whatsapp: 'wa', email: 'email',
}

export interface EverywhereDict {
  title: string
  subtitle: string
  yourLink: string
  copyLink: string
  copied: string
  copyFor: (platform: string) => string
  note: string
  names: Record<Platform, string>
}

const es: EverywhereDict = {
  title: 'Poné tu Mycen en todos lados',
  subtitle: 'Un solo link para todas tus redes. Pegalo donde te buscan.',
  yourLink: 'Tu link',
  copyLink: 'Copiar link',
  copied: 'Copiado',
  copyFor: p => `Copiar link para ${p}`,
  note: 'Cada link avisa de qué red llegó la visita, así ves en tus resultados qué funciona.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Firma de email' },
}

const en: EverywhereDict = {
  title: 'Put your Mycen everywhere',
  subtitle: 'One link for all your networks. Paste it wherever people look for you.',
  yourLink: 'Your link',
  copyLink: 'Copy link',
  copied: 'Copied',
  copyFor: p => `Copy link for ${p}`,
  note: 'Each link tells you which network the visit came from, so your results show what works.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Email signature' },
}

const pt: EverywhereDict = {
  title: 'Coloque seu Mycen em todo lugar',
  subtitle: 'Um só link para todas as suas redes. Cole onde as pessoas procuram você.',
  yourLink: 'Seu link',
  copyLink: 'Copiar link',
  copied: 'Copiado',
  copyFor: p => `Copiar link para ${p}`,
  note: 'Cada link mostra de qual rede veio a visita, assim você vê nos resultados o que funciona.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Assinatura de e-mail' },
}

const fr: EverywhereDict = {
  title: 'Mets ton Mycen partout',
  subtitle: 'Un seul lien pour tous tes réseaux. Colle-le là où on te cherche.',
  yourLink: 'Ton lien',
  copyLink: 'Copier le lien',
  copied: 'Copié',
  copyFor: p => `Copier le lien pour ${p}`,
  note: 'Chaque lien indique de quel réseau vient la visite : tes résultats montrent ce qui marche.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Signature e-mail' },
}

const de: EverywhereDict = {
  title: 'Bring dein Mycen überall hin',
  subtitle: 'Ein Link für alle deine Netzwerke. Füg ihn dort ein, wo man dich sucht.',
  yourLink: 'Dein Link',
  copyLink: 'Link kopieren',
  copied: 'Kopiert',
  copyFor: p => `Link für ${p} kopieren`,
  note: 'Jeder Link zeigt, aus welchem Netzwerk der Besuch kam – so siehst du in deinen Ergebnissen, was funktioniert.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'E-Mail-Signatur' },
}

const it: EverywhereDict = {
  title: 'Metti il tuo Mycen ovunque',
  subtitle: 'Un solo link per tutti i tuoi social. Incollalo dove ti cercano.',
  yourLink: 'Il tuo link',
  copyLink: 'Copia link',
  copied: 'Copiato',
  copyFor: p => `Copia link per ${p}`,
  note: 'Ogni link indica da quale social arriva la visita, così nei risultati vedi cosa funziona.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Firma email' },
}

const zh: EverywhereDict = {
  title: '把你的 Mycen 放到各处',
  subtitle: '一个链接，适用于你所有的社交平台。粘贴到别人会找你的地方。',
  yourLink: '你的链接',
  copyLink: '复制链接',
  copied: '已复制',
  copyFor: p => `复制用于 ${p} 的链接`,
  note: '每个链接都会标明访问来自哪个平台，你可以在结果里看到什么最有效。',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: '邮件签名' },
}

const ja: EverywhereDict = {
  title: 'あなたの Mycen をどこにでも',
  subtitle: 'すべての SNS にひとつのリンク。あなたを探す場所に貼りましょう。',
  yourLink: 'あなたのリンク',
  copyLink: 'リンクをコピー',
  copied: 'コピーしました',
  copyFor: p => `${p} 用のリンクをコピー`,
  note: 'リンクごとにどの SNS から来た訪問かがわかるので、結果で効果を確認できます。',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'メール署名' },
}

const ko: EverywhereDict = {
  title: '어디에나 내 Mycen을 걸어두세요',
  subtitle: '모든 SNS에 하나의 링크. 사람들이 나를 찾는 곳에 붙여넣으세요.',
  yourLink: '내 링크',
  copyLink: '링크 복사',
  copied: '복사됨',
  copyFor: p => `${p}용 링크 복사`,
  note: '링크마다 어느 SNS에서 방문했는지 알려줘서 결과에서 무엇이 효과적인지 볼 수 있어요.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: '이메일 서명' },
}

const hi: EverywhereDict = {
  title: 'अपना Mycen हर जगह लगाएँ',
  subtitle: 'आपके सभी नेटवर्क के लिए एक ही लिंक। जहाँ लोग आपको ढूँढते हैं, वहाँ चिपकाएँ।',
  yourLink: 'आपका लिंक',
  copyLink: 'लिंक कॉपी करें',
  copied: 'कॉपी हो गया',
  copyFor: p => `${p} के लिए लिंक कॉपी करें`,
  note: 'हर लिंक बताता है कि विज़िट किस नेटवर्क से आई, ताकि नतीजों में दिखे कि क्या काम कर रहा है।',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'ईमेल सिग्नेचर' },
}

const ar: EverywhereDict = {
  title: 'ضع Mycen الخاص بك في كل مكان',
  subtitle: 'رابط واحد لكل شبكاتك. الصقه حيث يبحث عنك الناس.',
  yourLink: 'رابطك',
  copyLink: 'نسخ الرابط',
  copied: 'تم النسخ',
  copyFor: p => `نسخ الرابط لـ ${p}`,
  note: 'كل رابط يوضح من أي شبكة جاءت الزيارة، فترى في نتائجك ما ينجح.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'توقيع البريد' },
}

const ru: EverywhereDict = {
  title: 'Разместите свой Mycen везде',
  subtitle: 'Одна ссылка для всех ваших соцсетей. Вставьте её туда, где вас ищут.',
  yourLink: 'Ваша ссылка',
  copyLink: 'Скопировать ссылку',
  copied: 'Скопировано',
  copyFor: p => `Скопировать ссылку для ${p}`,
  note: 'Каждая ссылка показывает, из какой сети пришёл визит, — так в результатах видно, что работает.',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Подпись в почте' },
}

export const EVERYWHERE: Record<AppLang, EverywhereDict> = { es, en, pt, fr, de, it, zh, ja, ko, hi, ar, ru }

export function useEverywhereT(): EverywhereDict {
  return EVERYWHERE[useAppLang(s => s.lang)] ?? es
}

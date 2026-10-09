// "Poné tu Mycen en todos lados" (V1 · etapa 08). Un solo archivo con los 12 idiomas, para actualizarlo fácil:
// los menús de cada plataforma cambian seguido, así que los pasos son generales a propósito.
// El español es la fuente; cada idioma tiene las mismas claves y la misma cantidad de pasos (lo verifica un test).
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
  open: string
  names: Record<Platform, string>
  steps: Record<Platform, string[]>
}

const es: EverywhereDict = {
  title: 'Poné tu Mycen en todos lados',
  subtitle: 'Un solo link para todas tus redes. Pegalo donde te buscan.',
  yourLink: 'Tu link',
  copyLink: 'Copiar link',
  copied: 'Copiado',
  copyFor: p => `Copiar link para ${p}`,
  note: 'Cada link avisa de qué red llegó la visita, así ves en tus resultados qué funciona. Las apps cambian sus menús seguido: si algo no está donde decimos, buscá “Editar perfil” o “Sitio web”.',
  open: 'Ver pasos',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Firma de email' },
  steps: {
    instagram: ['Abrí tu perfil y tocá “Editar perfil”.', 'En “Enlaces” o “Sitio web”, pegá tu link.', 'Guardá. También lo podés sumar a una historia con el sticker de enlace.'],
    tiktok: ['Andá a tu perfil y tocá “Editar perfil”.', 'Pegá tu link en “Sitio web” (puede pedir una cuenta de empresa o un mínimo de seguidores).', 'Si todavía no te aparece, escribilo en tu presentación.'],
    linkedin: ['Abrí tu perfil y tocá el lápiz de tu presentación.', 'En “Sitio web” o en la información de contacto, pegá tu link.', 'También lo podés sumar en “Destacado”.'],
    whatsapp_business: ['Abrí la configuración de la app y entrá al perfil de empresa.', 'Pegá tu link en “Sitio web”.', 'Sumalo también al mensaje de bienvenida o de ausencia.'],
    whatsapp: ['Abrí la configuración y tocá tu nombre.', 'Pegá tu link en “Info” (lo ve quien abre tu perfil).', 'Mandalo con tu presentación cuando conozcas a alguien.'],
    email: ['Abrí la configuración de tu correo y buscá “Firma”.', 'Escribí tu nombre y pegá tu link debajo.', 'Guardá: va a salir en cada mail nuevo.'],
  },
}

const en: EverywhereDict = {
  title: 'Put your Mycen everywhere',
  subtitle: 'One link for all your networks. Paste it wherever people look for you.',
  yourLink: 'Your link',
  copyLink: 'Copy link',
  copied: 'Copied',
  copyFor: p => `Copy link for ${p}`,
  note: 'Each link tells you which network the visit came from, so your results show what works. Apps change their menus often: if something isn’t where we say, look for “Edit profile” or “Website”.',
  open: 'See steps',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Email signature' },
  steps: {
    instagram: ['Open your profile and tap “Edit profile”.', 'Paste your link under “Links” or “Website”.', 'Save. You can also add it to a story with the link sticker.'],
    tiktok: ['Go to your profile and tap “Edit profile”.', 'Paste your link in “Website” (it may require a business account or a minimum number of followers).', 'If it doesn’t show up yet, write it in your bio.'],
    linkedin: ['Open your profile and tap the pencil on your intro.', 'Paste your link under “Website” or your contact info.', 'You can also add it to “Featured”.'],
    whatsapp_business: ['Open the app settings and go to your business profile.', 'Paste your link in “Website”.', 'Add it to your greeting or away message too.'],
    whatsapp: ['Open settings and tap your name.', 'Paste your link in “About” (anyone who opens your profile sees it).', 'Send it with your intro when you meet someone.'],
    email: ['Open your email settings and look for “Signature”.', 'Type your name and paste your link below it.', 'Save: it will appear in every new email.'],
  },
}

const pt: EverywhereDict = {
  title: 'Coloque seu Mycen em todo lugar',
  subtitle: 'Um só link para todas as suas redes. Cole onde as pessoas procuram você.',
  yourLink: 'Seu link',
  copyLink: 'Copiar link',
  copied: 'Copiado',
  copyFor: p => `Copiar link para ${p}`,
  note: 'Cada link mostra de qual rede veio a visita, assim você vê nos resultados o que funciona. Os apps mudam os menus com frequência: se algo não estiver onde dizemos, procure “Editar perfil” ou “Site”.',
  open: 'Ver passos',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Assinatura de e-mail' },
  steps: {
    instagram: ['Abra seu perfil e toque em “Editar perfil”.', 'Em “Links” ou “Site”, cole seu link.', 'Salve. Você também pode colocá-lo em um story com o sticker de link.'],
    tiktok: ['Vá ao seu perfil e toque em “Editar perfil”.', 'Cole seu link em “Site” (pode exigir conta comercial ou um mínimo de seguidores).', 'Se ainda não aparecer, escreva na sua bio.'],
    linkedin: ['Abra seu perfil e toque no lápis da apresentação.', 'Cole seu link em “Site” ou nas informações de contato.', 'Você também pode colocá-lo em “Destaques”.'],
    whatsapp_business: ['Abra as configurações do app e entre no perfil comercial.', 'Cole seu link em “Site”.', 'Coloque também na mensagem de saudação ou de ausência.'],
    whatsapp: ['Abra as configurações e toque no seu nome.', 'Cole seu link em “Recado” (quem abre seu perfil vê).', 'Envie com sua apresentação quando conhecer alguém.'],
    email: ['Abra as configurações do seu e-mail e procure “Assinatura”.', 'Escreva seu nome e cole seu link embaixo.', 'Salve: vai aparecer em cada e-mail novo.'],
  },
}

const fr: EverywhereDict = {
  title: 'Mets ton Mycen partout',
  subtitle: 'Un seul lien pour tous tes réseaux. Colle-le là où on te cherche.',
  yourLink: 'Ton lien',
  copyLink: 'Copier le lien',
  copied: 'Copié',
  copyFor: p => `Copier le lien pour ${p}`,
  note: 'Chaque lien indique de quel réseau vient la visite : tes résultats montrent ce qui marche. Les applis changent souvent leurs menus : si quelque chose n’est pas où on le dit, cherche « Modifier le profil » ou « Site web ».',
  open: 'Voir les étapes',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Signature e-mail' },
  steps: {
    instagram: ['Ouvre ton profil et touche « Modifier le profil ».', 'Dans « Liens » ou « Site web », colle ton lien.', 'Enregistre. Tu peux aussi l’ajouter à une story avec le sticker lien.'],
    tiktok: ['Va sur ton profil et touche « Modifier le profil ».', 'Colle ton lien dans « Site web » (un compte professionnel ou un minimum d’abonnés peut être requis).', 'S’il n’apparaît pas encore, écris-le dans ta bio.'],
    linkedin: ['Ouvre ton profil et touche le crayon de ta présentation.', 'Colle ton lien dans « Site web » ou tes coordonnées.', 'Tu peux aussi l’ajouter dans « Sélection ».'],
    whatsapp_business: ['Ouvre les réglages de l’appli et va dans le profil professionnel.', 'Colle ton lien dans « Site web ».', 'Ajoute-le aussi au message d’accueil ou d’absence.'],
    whatsapp: ['Ouvre les réglages et touche ton nom.', 'Colle ton lien dans « Infos » (visible par qui ouvre ton profil).', 'Envoie-le avec ta présentation quand tu rencontres quelqu’un.'],
    email: ['Ouvre les réglages de ta messagerie et cherche « Signature ».', 'Écris ton nom et colle ton lien en dessous.', 'Enregistre : il apparaîtra dans chaque nouvel e-mail.'],
  },
}

const de: EverywhereDict = {
  title: 'Bring dein Mycen überall hin',
  subtitle: 'Ein Link für alle deine Netzwerke. Füg ihn dort ein, wo man dich sucht.',
  yourLink: 'Dein Link',
  copyLink: 'Link kopieren',
  copied: 'Kopiert',
  copyFor: p => `Link für ${p} kopieren`,
  note: 'Jeder Link zeigt, aus welchem Netzwerk der Besuch kam – so siehst du in deinen Ergebnissen, was funktioniert. Apps ändern ihre Menüs oft: Wenn etwas nicht dort ist, wo wir sagen, such nach „Profil bearbeiten“ oder „Website“.',
  open: 'Schritte ansehen',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'E-Mail-Signatur' },
  steps: {
    instagram: ['Öffne dein Profil und tippe auf „Profil bearbeiten“.', 'Füg deinen Link unter „Links“ oder „Website“ ein.', 'Speichern. Du kannst ihn auch mit dem Link-Sticker in eine Story packen.'],
    tiktok: ['Geh zu deinem Profil und tippe auf „Profil bearbeiten“.', 'Füg deinen Link bei „Website“ ein (eventuell nötig: Unternehmenskonto oder Mindestzahl an Followern).', 'Falls er noch nicht erscheint, schreib ihn in deine Bio.'],
    linkedin: ['Öffne dein Profil und tippe auf den Stift bei deiner Vorstellung.', 'Füg deinen Link bei „Website“ oder in deinen Kontaktinfos ein.', 'Du kannst ihn auch unter „Im Fokus“ hinzufügen.'],
    whatsapp_business: ['Öffne die App-Einstellungen und geh zum Unternehmensprofil.', 'Füg deinen Link bei „Website“ ein.', 'Ergänz ihn auch in der Begrüßungs- oder Abwesenheitsnachricht.'],
    whatsapp: ['Öffne die Einstellungen und tippe auf deinen Namen.', 'Füg deinen Link bei „Info“ ein (sieht jeder, der dein Profil öffnet).', 'Schick ihn mit deiner Vorstellung, wenn du jemanden kennenlernst.'],
    email: ['Öffne die Einstellungen deines E-Mail-Programms und such „Signatur“.', 'Schreib deinen Namen und füg darunter deinen Link ein.', 'Speichern: Er erscheint in jeder neuen E-Mail.'],
  },
}

const it: EverywhereDict = {
  title: 'Metti il tuo Mycen ovunque',
  subtitle: 'Un solo link per tutti i tuoi social. Incollalo dove ti cercano.',
  yourLink: 'Il tuo link',
  copyLink: 'Copia link',
  copied: 'Copiato',
  copyFor: p => `Copia link per ${p}`,
  note: 'Ogni link indica da quale social arriva la visita, così nei risultati vedi cosa funziona. Le app cambiano spesso i menu: se qualcosa non è dove diciamo, cerca “Modifica profilo” o “Sito web”.',
  open: 'Vedi i passaggi',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Firma email' },
  steps: {
    instagram: ['Apri il tuo profilo e tocca “Modifica profilo”.', 'In “Link” o “Sito web”, incolla il tuo link.', 'Salva. Puoi anche aggiungerlo a una storia con lo sticker link.'],
    tiktok: ['Vai al tuo profilo e tocca “Modifica profilo”.', 'Incolla il link in “Sito web” (può servire un account business o un minimo di follower).', 'Se non compare ancora, scrivilo nella bio.'],
    linkedin: ['Apri il tuo profilo e tocca la matita della presentazione.', 'Incolla il link in “Sito web” o nelle informazioni di contatto.', 'Puoi aggiungerlo anche in “In primo piano”.'],
    whatsapp_business: ['Apri le impostazioni dell’app ed entra nel profilo aziendale.', 'Incolla il link in “Sito web”.', 'Aggiungilo anche al messaggio di benvenuto o di assenza.'],
    whatsapp: ['Apri le impostazioni e tocca il tuo nome.', 'Incolla il link in “Info” (lo vede chi apre il tuo profilo).', 'Mandalo con la tua presentazione quando conosci qualcuno.'],
    email: ['Apri le impostazioni della posta e cerca “Firma”.', 'Scrivi il tuo nome e incolla il link sotto.', 'Salva: comparirà in ogni nuova email.'],
  },
}

const zh: EverywhereDict = {
  title: '把你的 Mycen 放到各处',
  subtitle: '一个链接，适用于你所有的社交平台。粘贴到别人会找你的地方。',
  yourLink: '你的链接',
  copyLink: '复制链接',
  copied: '已复制',
  copyFor: p => `复制用于 ${p} 的链接`,
  note: '每个链接都会标明访问来自哪个平台，你可以在结果里看到什么最有效。各应用经常调整菜单：如果找不到我们说的位置，请找“编辑资料”或“网站”。',
  open: '查看步骤',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: '邮件签名' },
  steps: {
    instagram: ['打开你的主页，点“编辑主页”。', '在“链接”或“网站”中粘贴你的链接。', '保存。也可以用链接贴纸把它加到快拍里。'],
    tiktok: ['进入你的主页，点“编辑资料”。', '在“网站”中粘贴链接（可能需要企业账号或一定粉丝数）。', '如果还没有这个选项，就写在简介里。'],
    linkedin: ['打开你的个人资料，点简介旁的铅笔。', '在“网站”或联系信息中粘贴链接。', '也可以添加到“精选”。'],
    whatsapp_business: ['打开应用设置，进入商家资料。', '在“网站”中粘贴链接。', '也可以加到欢迎消息或离开消息里。'],
    whatsapp: ['打开设置，点你的名字。', '把链接粘贴到“关于”（打开你资料的人都能看到）。', '认识新朋友时，连同自我介绍一起发出。'],
    email: ['打开邮箱设置，找到“签名”。', '写上你的名字，并在下方粘贴链接。', '保存后，每封新邮件都会带上它。'],
  },
}

const ja: EverywhereDict = {
  title: 'あなたの Mycen をどこにでも',
  subtitle: 'すべての SNS にひとつのリンク。あなたを探す場所に貼りましょう。',
  yourLink: 'あなたのリンク',
  copyLink: 'リンクをコピー',
  copied: 'コピーしました',
  copyFor: p => `${p} 用のリンクをコピー`,
  note: 'リンクごとにどの SNS から来た訪問かがわかるので、結果で効果を確認できます。アプリのメニューはよく変わります。見つからないときは「プロフィールを編集」や「ウェブサイト」を探してください。',
  open: '手順を見る',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'メール署名' },
  steps: {
    instagram: ['プロフィールを開き「プロフィールを編集」をタップ。', '「リンク」または「ウェブサイト」にリンクを貼り付け。', '保存。リンクスタンプでストーリーズにも追加できます。'],
    tiktok: ['プロフィールで「プロフィールを編集」をタップ。', '「ウェブサイト」にリンクを貼り付け（ビジネスアカウントや一定のフォロワー数が必要な場合があります）。', 'まだ表示されない場合は自己紹介に書きましょう。'],
    linkedin: ['プロフィールを開き、自己紹介の鉛筆をタップ。', '「ウェブサイト」または連絡先情報にリンクを貼り付け。', '「注目」に追加することもできます。'],
    whatsapp_business: ['アプリの設定を開き、ビジネスプロフィールへ。', '「ウェブサイト」にリンクを貼り付け。', 'あいさつメッセージや不在メッセージにも入れましょう。'],
    whatsapp: ['設定を開き、自分の名前をタップ。', '「自己紹介」にリンクを貼り付け（プロフィールを開いた人に表示されます）。', '誰かと知り合ったら、自己紹介と一緒に送りましょう。'],
    email: ['メールの設定を開き「署名」を探します。', '名前を書き、その下にリンクを貼り付け。', '保存すると、新しいメールすべてに表示されます。'],
  },
}

const ko: EverywhereDict = {
  title: '어디에나 내 Mycen을 걸어두세요',
  subtitle: '모든 SNS에 하나의 링크. 사람들이 나를 찾는 곳에 붙여넣으세요.',
  yourLink: '내 링크',
  copyLink: '링크 복사',
  copied: '복사됨',
  copyFor: p => `${p}용 링크 복사`,
  note: '링크마다 어느 SNS에서 방문했는지 알려줘서 결과에서 무엇이 효과적인지 볼 수 있어요. 앱 메뉴는 자주 바뀌어요. 안내한 곳에 없으면 “프로필 편집”이나 “웹사이트”를 찾아보세요.',
  open: '단계 보기',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: '이메일 서명' },
  steps: {
    instagram: ['프로필을 열고 “프로필 편집”을 누르세요.', '“링크” 또는 “웹사이트”에 링크를 붙여넣으세요.', '저장하세요. 링크 스티커로 스토리에도 추가할 수 있어요.'],
    tiktok: ['프로필에서 “프로필 편집”을 누르세요.', '“웹사이트”에 링크를 붙여넣으세요(비즈니스 계정이나 최소 팔로워 수가 필요할 수 있어요).', '아직 보이지 않으면 소개란에 적어두세요.'],
    linkedin: ['프로필을 열고 소개 옆 연필을 누르세요.', '“웹사이트”나 연락처 정보에 링크를 붙여넣으세요.', '“추천” 섹션에도 추가할 수 있어요.'],
    whatsapp_business: ['앱 설정을 열고 비즈니스 프로필로 가세요.', '“웹사이트”에 링크를 붙여넣으세요.', '인사말이나 부재중 메시지에도 넣어두세요.'],
    whatsapp: ['설정을 열고 내 이름을 누르세요.', '“정보”에 링크를 붙여넣으세요(내 프로필을 여는 사람에게 보여요).', '누군가를 만나면 소개와 함께 보내세요.'],
    email: ['메일 설정을 열고 “서명”을 찾으세요.', '이름을 쓰고 그 아래에 링크를 붙여넣으세요.', '저장하면 새 메일마다 표시돼요.'],
  },
}

const hi: EverywhereDict = {
  title: 'अपना Mycen हर जगह लगाएँ',
  subtitle: 'आपके सभी नेटवर्क के लिए एक ही लिंक। जहाँ लोग आपको ढूँढते हैं, वहाँ चिपकाएँ।',
  yourLink: 'आपका लिंक',
  copyLink: 'लिंक कॉपी करें',
  copied: 'कॉपी हो गया',
  copyFor: p => `${p} के लिए लिंक कॉपी करें`,
  note: 'हर लिंक बताता है कि विज़िट किस नेटवर्क से आई, ताकि नतीजों में दिखे कि क्या काम कर रहा है। ऐप अपने मेनू अक्सर बदलते हैं: अगर कुछ बताई जगह पर न मिले, तो “प्रोफ़ाइल संपादित करें” या “वेबसाइट” खोजें।',
  open: 'चरण देखें',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'ईमेल सिग्नेचर' },
  steps: {
    instagram: ['अपनी प्रोफ़ाइल खोलें और “प्रोफ़ाइल संपादित करें” पर टैप करें।', '“लिंक” या “वेबसाइट” में अपना लिंक चिपकाएँ।', 'सेव करें। लिंक स्टिकर से इसे स्टोरी में भी जोड़ सकते हैं।'],
    tiktok: ['अपनी प्रोफ़ाइल पर जाएँ और “प्रोफ़ाइल संपादित करें” पर टैप करें।', '“वेबसाइट” में लिंक चिपकाएँ (बिज़नेस अकाउंट या न्यूनतम फ़ॉलोअर ज़रूरी हो सकते हैं)।', 'अगर अभी न दिखे, तो इसे अपने बायो में लिखें।'],
    linkedin: ['अपनी प्रोफ़ाइल खोलें और परिचय के पेंसिल पर टैप करें।', '“वेबसाइट” या संपर्क जानकारी में लिंक चिपकाएँ।', 'इसे “फ़ीचर्ड” में भी जोड़ सकते हैं।'],
    whatsapp_business: ['ऐप की सेटिंग खोलें और बिज़नेस प्रोफ़ाइल में जाएँ।', '“वेबसाइट” में लिंक चिपकाएँ।', 'इसे स्वागत या अनुपस्थिति संदेश में भी जोड़ें।'],
    whatsapp: ['सेटिंग खोलें और अपने नाम पर टैप करें।', '“अबाउट” में लिंक चिपकाएँ (आपकी प्रोफ़ाइल खोलने वाले इसे देखते हैं)।', 'किसी से मिलें तो अपने परिचय के साथ भेजें।'],
    email: ['अपने ईमेल की सेटिंग खोलें और “सिग्नेचर” खोजें।', 'अपना नाम लिखें और नीचे लिंक चिपकाएँ।', 'सेव करें: यह हर नए ईमेल में दिखेगा।'],
  },
}

const ar: EverywhereDict = {
  title: 'ضع Mycen الخاص بك في كل مكان',
  subtitle: 'رابط واحد لكل شبكاتك. الصقه حيث يبحث عنك الناس.',
  yourLink: 'رابطك',
  copyLink: 'نسخ الرابط',
  copied: 'تم النسخ',
  copyFor: p => `نسخ الرابط لـ ${p}`,
  note: 'كل رابط يوضح من أي شبكة جاءت الزيارة، فترى في نتائجك ما ينجح. التطبيقات تغيّر قوائمها كثيرًا: إن لم تجد شيئًا حيث نقول، ابحث عن «تعديل الملف الشخصي» أو «الموقع الإلكتروني».',
  open: 'عرض الخطوات',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'توقيع البريد' },
  steps: {
    instagram: ['افتح ملفك الشخصي واضغط «تعديل الملف الشخصي».', 'الصق رابطك في «الروابط» أو «الموقع الإلكتروني».', 'احفظ. يمكنك أيضًا إضافته إلى قصة باستخدام ملصق الرابط.'],
    tiktok: ['اذهب إلى ملفك الشخصي واضغط «تعديل الملف الشخصي».', 'الصق رابطك في «الموقع الإلكتروني» (قد يتطلب حساب أعمال أو حدًا أدنى من المتابعين).', 'إن لم يظهر بعد، اكتبه في نبذتك.'],
    linkedin: ['افتح ملفك الشخصي واضغط القلم بجانب نبذتك.', 'الصق رابطك في «الموقع الإلكتروني» أو معلومات التواصل.', 'يمكنك أيضًا إضافته إلى «المميز».'],
    whatsapp_business: ['افتح إعدادات التطبيق وادخل إلى الملف التجاري.', 'الصق رابطك في «الموقع الإلكتروني».', 'أضفه أيضًا إلى رسالة الترحيب أو رسالة الغياب.'],
    whatsapp: ['افتح الإعدادات واضغط على اسمك.', 'الصق رابطك في «الأخبار» (يراه من يفتح ملفك).', 'أرسله مع تعريفك بنفسك عندما تتعرف على أحد.'],
    email: ['افتح إعدادات بريدك وابحث عن «التوقيع».', 'اكتب اسمك والصق رابطك تحته.', 'احفظ: سيظهر في كل رسالة جديدة.'],
  },
}

const ru: EverywhereDict = {
  title: 'Разместите свой Mycen везде',
  subtitle: 'Одна ссылка для всех ваших соцсетей. Вставьте её туда, где вас ищут.',
  yourLink: 'Ваша ссылка',
  copyLink: 'Скопировать ссылку',
  copied: 'Скопировано',
  copyFor: p => `Скопировать ссылку для ${p}`,
  note: 'Каждая ссылка показывает, из какой сети пришёл визит, — так в результатах видно, что работает. Приложения часто меняют меню: если что-то не там, где мы говорим, ищите «Редактировать профиль» или «Сайт».',
  open: 'Показать шаги',
  names: { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp_business: 'WhatsApp Business', whatsapp: 'WhatsApp', email: 'Подпись в почте' },
  steps: {
    instagram: ['Откройте профиль и нажмите «Редактировать профиль».', 'Вставьте ссылку в «Ссылки» или «Сайт».', 'Сохраните. Ссылку также можно добавить в историю со стикером-ссылкой.'],
    tiktok: ['Перейдите в профиль и нажмите «Изменить профиль».', 'Вставьте ссылку в «Сайт» (может понадобиться бизнес-аккаунт или минимум подписчиков).', 'Если пункта ещё нет, напишите ссылку в описании.'],
    linkedin: ['Откройте профиль и нажмите карандаш у раздела о себе.', 'Вставьте ссылку в «Сайт» или контактные данные.', 'Её также можно добавить в «Рекомендуемое».'],
    whatsapp_business: ['Откройте настройки приложения и перейдите в профиль компании.', 'Вставьте ссылку в «Сайт».', 'Добавьте её и в приветственное сообщение или автоответ.'],
    whatsapp: ['Откройте настройки и нажмите на своё имя.', 'Вставьте ссылку в «Сведения» (её видит каждый, кто открывает ваш профиль).', 'Отправляйте её вместе с представлением при знакомстве.'],
    email: ['Откройте настройки почты и найдите «Подпись».', 'Напишите имя и вставьте ссылку ниже.', 'Сохраните: она будет в каждом новом письме.'],
  },
}

export const EVERYWHERE: Record<AppLang, EverywhereDict> = { es, en, pt, fr, de, it, zh, ja, ko, hi, ar, ru }

export function useEverywhereT(): EverywhereDict {
  return EVERYWHERE[useAppLang(s => s.lang)] ?? es
}

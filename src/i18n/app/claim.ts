// "Elegí tu nombre" (campo mycen.id/<nombre> de la landing, del perfil que no existe y del pie de cada perfil, y la
// nota del registro). Un solo archivo con los 12 idiomas; el español es la fuente y cada idioma tiene las mismas
// claves (lo verifica tests/unit/claim.test.ts). {name} se reemplaza por la dirección.
import { useAppLang } from './store'
import type { AppLang } from './languages'

export interface ClaimDict {
  /** Nombre accesible del campo */
  label: string
  placeholder: string
  submit: string
  checking: string
  available: string
  taken: string
  /** Antes de las alternativas libres */
  tryThese: string
  reserved: string
  invalid: string
  /** No se pudo consultar: se puede seguir igual */
  error: string
  /** Perfil que no existe y cuyo nombre está libre */
  freeTitle: string
  freeText: string
  /** Registro: el nombre que eligió */
  yourAddress: string
}

const es: ClaimDict = {
  label: 'Elegí tu nombre en Mycen',
  placeholder: 'tunombre',
  submit: 'Crear mi Mycen',
  checking: 'Fijándonos…',
  available: 'Está libre',
  taken: 'Ya está tomado.',
  tryThese: 'Probá con:',
  reserved: 'Ese nombre no se puede usar.',
  invalid: 'De 3 a 30 letras, números o guiones.',
  error: 'No pudimos revisarlo ahora. Seguí igual: lo revisamos al crear tu cuenta.',
  freeTitle: '{name} está libre',
  freeText: '¿Es tuyo? Creá tu Mycen con este nombre.',
  yourAddress: 'Tu dirección va a ser',
}

const en: ClaimDict = {
  label: 'Choose your name on Mycen',
  placeholder: 'yourname',
  submit: 'Create my Mycen',
  checking: 'Checking…',
  available: 'It’s available',
  taken: 'That one is taken.',
  tryThese: 'Try:',
  reserved: 'That name can’t be used.',
  invalid: '3 to 30 letters, numbers or hyphens.',
  error: 'We couldn’t check right now. Go ahead: we’ll check when you create your account.',
  freeTitle: '{name} is available',
  freeText: 'Is it yours? Create your Mycen with this name.',
  yourAddress: 'Your address will be',
}

const pt: ClaimDict = {
  label: 'Escolha seu nome no Mycen',
  placeholder: 'seunome',
  submit: 'Criar meu Mycen',
  checking: 'Verificando…',
  available: 'Está livre',
  taken: 'Esse já está em uso.',
  tryThese: 'Tente:',
  reserved: 'Esse nome não pode ser usado.',
  invalid: 'De 3 a 30 letras, números ou hífens.',
  error: 'Não conseguimos verificar agora. Siga em frente: verificamos ao criar sua conta.',
  freeTitle: '{name} está livre',
  freeText: 'É seu? Crie seu Mycen com este nome.',
  yourAddress: 'Seu endereço vai ser',
}

const fr: ClaimDict = {
  label: 'Choisissez votre nom sur Mycen',
  placeholder: 'votrenom',
  submit: 'Créer mon Mycen',
  checking: 'Vérification…',
  available: 'Il est libre',
  taken: 'Celui-ci est déjà pris.',
  tryThese: 'Essayez :',
  reserved: 'Ce nom ne peut pas être utilisé.',
  invalid: 'De 3 à 30 lettres, chiffres ou tirets.',
  error: 'Impossible de vérifier pour le moment. Continuez : nous vérifierons à la création du compte.',
  freeTitle: '{name} est libre',
  freeText: 'C’est le vôtre ? Créez votre Mycen avec ce nom.',
  yourAddress: 'Votre adresse sera',
}

const de: ClaimDict = {
  label: 'Wähle deinen Namen bei Mycen',
  placeholder: 'deinname',
  submit: 'Mein Mycen erstellen',
  checking: 'Wird geprüft…',
  available: 'Ist frei',
  taken: 'Der ist schon vergeben.',
  tryThese: 'Versuch es mit:',
  reserved: 'Dieser Name kann nicht verwendet werden.',
  invalid: '3 bis 30 Buchstaben, Zahlen oder Bindestriche.',
  error: 'Wir konnten es gerade nicht prüfen. Mach weiter: Wir prüfen es beim Erstellen deines Kontos.',
  freeTitle: '{name} ist frei',
  freeText: 'Ist das deiner? Erstelle dein Mycen mit diesem Namen.',
  yourAddress: 'Deine Adresse wird',
}

const it: ClaimDict = {
  label: 'Scegli il tuo nome su Mycen',
  placeholder: 'tuonome',
  submit: 'Crea il mio Mycen',
  checking: 'Controllo…',
  available: 'È libero',
  taken: 'Questo è già preso.',
  tryThese: 'Prova:',
  reserved: 'Questo nome non si può usare.',
  invalid: 'Da 3 a 30 lettere, numeri o trattini.',
  error: 'Non riusciamo a controllare ora. Vai avanti: lo controlliamo quando crei l’account.',
  freeTitle: '{name} è libero',
  freeText: 'È tuo? Crea il tuo Mycen con questo nome.',
  yourAddress: 'Il tuo indirizzo sarà',
}

const zh: ClaimDict = {
  label: '在 Mycen 选择你的名字',
  placeholder: 'yourname',
  submit: '创建我的 Mycen',
  checking: '正在检查…',
  available: '可以使用',
  taken: '已被占用。',
  tryThese: '试试：',
  reserved: '这个名字不能使用。',
  invalid: '3 到 30 个字母、数字或连字符。',
  error: '暂时无法检查。继续吧：创建账户时我们会再检查。',
  freeTitle: '{name} 可以使用',
  freeText: '是你的吗？用这个名字创建你的 Mycen。',
  yourAddress: '你的地址将是',
}

const ja: ClaimDict = {
  label: 'Mycen での名前を選ぶ',
  placeholder: 'yourname',
  submit: 'Mycen をつくる',
  checking: '確認中…',
  available: '使えます',
  taken: 'すでに使われています。',
  tryThese: 'こちらはどうですか：',
  reserved: 'この名前は使えません。',
  invalid: '3〜30文字の英字、数字、ハイフン。',
  error: '今は確認できませんでした。このまま進んでください。アカウント作成時に確認します。',
  freeTitle: '{name} は使えます',
  freeText: 'あなたの名前ですか？この名前で Mycen をつくりましょう。',
  yourAddress: 'あなたのアドレス',
}

const ko: ClaimDict = {
  label: 'Mycen에서 이름 정하기',
  placeholder: 'yourname',
  submit: '내 Mycen 만들기',
  checking: '확인 중…',
  available: '사용할 수 있어요',
  taken: '이미 사용 중이에요.',
  tryThese: '이건 어때요:',
  reserved: '이 이름은 사용할 수 없어요.',
  invalid: '영문, 숫자, 하이픈 3~30자.',
  error: '지금은 확인할 수 없어요. 계속하세요. 계정을 만들 때 확인할게요.',
  freeTitle: '{name} 사용 가능',
  freeText: '당신의 이름인가요? 이 이름으로 Mycen을 만드세요.',
  yourAddress: '내 주소는',
}

const hi: ClaimDict = {
  label: 'Mycen पर अपना नाम चुनें',
  placeholder: 'aapkanaam',
  submit: 'मेरा Mycen बनाएं',
  checking: 'जांच रहे हैं…',
  available: 'उपलब्ध है',
  taken: 'यह पहले से लिया हुआ है।',
  tryThese: 'ये आज़माएं:',
  reserved: 'यह नाम इस्तेमाल नहीं हो सकता।',
  invalid: '3 से 30 अक्षर, अंक या हाइफ़न।',
  error: 'अभी जांच नहीं हो पाई। आगे बढ़ें: खाता बनाते समय हम जांच लेंगे।',
  freeTitle: '{name} उपलब्ध है',
  freeText: 'क्या यह आपका है? इसी नाम से अपना Mycen बनाएं।',
  yourAddress: 'आपका पता होगा',
}

const ar: ClaimDict = {
  label: 'اختر اسمك على Mycen',
  placeholder: 'yourname',
  submit: 'أنشئ Mycen الخاص بي',
  checking: 'جارٍ التحقق…',
  available: 'متاح',
  taken: 'هذا الاسم مستخدم بالفعل.',
  tryThese: 'جرّب:',
  reserved: 'لا يمكن استخدام هذا الاسم.',
  invalid: 'من 3 إلى 30 حرفًا أو رقمًا أو شرطة.',
  error: 'تعذّر التحقق الآن. تابِع: سنتحقق عند إنشاء حسابك.',
  freeTitle: '{name} متاح',
  freeText: 'هل هو لك؟ أنشئ Mycen الخاص بك بهذا الاسم.',
  yourAddress: 'سيكون عنوانك',
}

const ru: ClaimDict = {
  label: 'Выберите имя в Mycen',
  placeholder: 'vashe-imya',
  submit: 'Создать мой Mycen',
  checking: 'Проверяем…',
  available: 'Свободно',
  taken: 'Это имя уже занято.',
  tryThese: 'Попробуйте:',
  reserved: 'Это имя нельзя использовать.',
  invalid: 'От 3 до 30 латинских букв, цифр или дефисов.',
  error: 'Сейчас не получилось проверить. Продолжайте: проверим при создании аккаунта.',
  freeTitle: '{name} свободно',
  freeText: 'Это ваше? Создайте свой Mycen с этим именем.',
  yourAddress: 'Ваш адрес будет',
}

export const CLAIM: Record<AppLang, ClaimDict> = { es, en, pt, fr, de, it, zh, ja, ko, hi, ar, ru }

export function claimT(lang: AppLang): ClaimDict {
  return CLAIM[lang] ?? es
}

export function useClaimT(): ClaimDict {
  return claimT(useAppLang(s => s.lang))
}

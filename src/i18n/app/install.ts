// "Agregar a inicio": instalar Mycen como app desde el navegador (Mi día y Studio). Un solo archivo con los 12
// idiomas. El español es la fuente; cada idioma tiene las mismas claves y la misma cantidad de pasos (lo verifica
// tests/unit/install.test.ts). Los menús de los navegadores cambian: los pasos son generales a propósito.
import { useAppLang } from './store'
import type { AppLang } from './languages'

export interface InstallDict {
  /** Texto del botón */
  add: string
  title: string
  intro: string
  /** Pasos en iPhone y iPad (Safari) */
  ios: string[]
  /** Pasos en Android cuando el navegador no ofrece instalar directo */
  android: string[]
  close: string
}

const es: InstallDict = {
  add: 'Agregar a inicio',
  title: 'Tené Mycen en tu inicio',
  intro: 'Se abre como una app, a pantalla completa y sin buscarla en el navegador.',
  ios: ['Tocá el botón Compartir (el cuadrado con la flecha hacia arriba).', 'Elegí “Agregar a inicio”.', 'Tocá “Agregar”.'],
  android: ['Abrí el menú del navegador (los tres puntos).', 'Elegí “Instalar app” o “Agregar a la pantalla principal”.', 'Confirmá.'],
  close: 'Cerrar',
}

const en: InstallDict = {
  add: 'Add to Home Screen',
  title: 'Keep Mycen on your home screen',
  intro: 'It opens like an app, full screen, without looking for it in the browser.',
  ios: ['Tap the Share button (the square with the arrow pointing up).', 'Choose “Add to Home Screen”.', 'Tap “Add”.'],
  android: ['Open the browser menu (the three dots).', 'Choose “Install app” or “Add to Home screen”.', 'Confirm.'],
  close: 'Close',
}

const pt: InstallDict = {
  add: 'Adicionar à Tela de Início',
  title: 'Tenha o Mycen na sua tela inicial',
  intro: 'Abre como um app, em tela cheia, sem precisar procurá-lo no navegador.',
  ios: ['Toque no botão Compartilhar (o quadrado com a seta para cima).', 'Escolha “Adicionar à Tela de Início”.', 'Toque em “Adicionar”.'],
  android: ['Abra o menu do navegador (os três pontos).', 'Escolha “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme.'],
  close: 'Fechar',
}

const fr: InstallDict = {
  add: 'Sur l’écran d’accueil',
  title: 'Gardez Mycen sur votre écran d’accueil',
  intro: 'Il s’ouvre comme une app, en plein écran, sans le chercher dans le navigateur.',
  ios: ['Touchez le bouton Partager (le carré avec la flèche vers le haut).', 'Choisissez « Sur l’écran d’accueil ».', 'Touchez « Ajouter ».'],
  android: ['Ouvrez le menu du navigateur (les trois points).', 'Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».', 'Confirmez.'],
  close: 'Fermer',
}

const de: InstallDict = {
  add: 'Zum Home-Bildschirm',
  title: 'Mycen auf deinem Home-Bildschirm',
  intro: 'Es öffnet sich wie eine App, im Vollbild, ohne es im Browser zu suchen.',
  ios: ['Tippe auf „Teilen“ (das Quadrat mit dem Pfeil nach oben).', 'Wähle „Zum Home-Bildschirm“.', 'Tippe auf „Hinzufügen“.'],
  android: ['Öffne das Browser-Menü (die drei Punkte).', 'Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.', 'Bestätige.'],
  close: 'Schließen',
}

const it: InstallDict = {
  add: 'Aggiungi alla schermata Home',
  title: 'Tieni Mycen nella schermata Home',
  intro: 'Si apre come un’app, a schermo intero, senza cercarla nel browser.',
  ios: ['Tocca il pulsante Condividi (il quadrato con la freccia verso l’alto).', 'Scegli “Aggiungi alla schermata Home”.', 'Tocca “Aggiungi”.'],
  android: ['Apri il menu del browser (i tre puntini).', 'Scegli “Installa app” o “Aggiungi a schermata Home”.', 'Conferma.'],
  close: 'Chiudi',
}

const zh: InstallDict = {
  add: '添加到主屏幕',
  title: '把 Mycen 放到主屏幕',
  intro: '像应用一样全屏打开，不用再在浏览器里找。',
  ios: ['点按“分享”按钮（带向上箭头的方框）。', '选择“添加到主屏幕”。', '点按“添加”。'],
  android: ['打开浏览器菜单（三个点）。', '选择“安装应用”或“添加到主屏幕”。', '确认。'],
  close: '关闭',
}

const ja: InstallDict = {
  add: 'ホーム画面に追加',
  title: 'Mycen をホーム画面に',
  intro: 'ブラウザで探さなくても、アプリのように全画面で開けます。',
  ios: ['共有ボタン（上向き矢印の四角）をタップします。', '「ホーム画面に追加」を選びます。', '「追加」をタップします。'],
  android: ['ブラウザのメニュー（3 つの点）を開きます。', '「アプリをインストール」または「ホーム画面に追加」を選びます。', '確認します。'],
  close: '閉じる',
}

const ko: InstallDict = {
  add: '홈 화면에 추가',
  title: 'Mycen을 홈 화면에 두세요',
  intro: '브라우저에서 찾지 않아도 앱처럼 전체 화면으로 열려요.',
  ios: ['공유 버튼(위쪽 화살표가 있는 사각형)을 누르세요.', '“홈 화면에 추가”를 고르세요.', '“추가”를 누르세요.'],
  android: ['브라우저 메뉴(점 세 개)를 여세요.', '“앱 설치” 또는 “홈 화면에 추가”를 고르세요.', '확인하세요.'],
  close: '닫기',
}

const hi: InstallDict = {
  add: 'होम स्क्रीन पर जोड़ें',
  title: 'Mycen को अपनी होम स्क्रीन पर रखें',
  intro: 'यह ऐप की तरह पूरी स्क्रीन पर खुलता है, ब्राउज़र में ढूँढने की ज़रूरत नहीं।',
  ios: ['शेयर बटन (ऊपर तीर वाला चौकोर) पर टैप करें।', '“होम स्क्रीन पर जोड़ें” चुनें।', '“जोड़ें” पर टैप करें।'],
  android: ['ब्राउज़र का मेन्यू (तीन बिंदु) खोलें।', '“ऐप इंस्टॉल करें” या “होम स्क्रीन पर जोड़ें” चुनें।', 'पुष्टि करें।'],
  close: 'बंद करें',
}

const ar: InstallDict = {
  add: 'إضافة إلى الشاشة الرئيسية',
  title: 'اجعل Mycen على شاشتك الرئيسية',
  intro: 'يفتح مثل التطبيق بملء الشاشة، دون البحث عنه في المتصفح.',
  ios: ['اضغط زر المشاركة (المربع الذي فيه سهم إلى الأعلى).', 'اختر «إضافة إلى الشاشة الرئيسية».', 'اضغط «إضافة».'],
  android: ['افتح قائمة المتصفح (النقاط الثلاث).', 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».', 'أكّد.'],
  close: 'إغلاق',
}

const ru: InstallDict = {
  add: 'На экран «Домой»',
  title: 'Mycen на главном экране',
  intro: 'Открывается как приложение, на весь экран, без поиска в браузере.',
  ios: ['Нажмите «Поделиться» (квадрат со стрелкой вверх).', 'Выберите «На экран „Домой“».', 'Нажмите «Добавить».'],
  android: ['Откройте меню браузера (три точки).', 'Выберите «Установить приложение» или «Добавить на главный экран».', 'Подтвердите.'],
  close: 'Закрыть',
}

export const INSTALL: Record<AppLang, InstallDict> = { es, en, pt, fr, de, it, zh, ja, ko, hi, ar, ru }

export function useInstallT(): InstallDict {
  return INSTALL[useAppLang(s => s.lang)] ?? es
}

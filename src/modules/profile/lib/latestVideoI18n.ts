// Textos del módulo "Último video". Aparte de profileI18n: sólo los baja un perfil que lo usa (LatestVideoModule va
// en su propio chunk). "Reproducir en YouTube" sale de profileI18n (`playOn`), igual que en Video y música.
import type { ProfileLang } from './profileTypes'

export interface LatestVideoStrings {
  /** Nombre del módulo cuando no tiene título */
  heading: string
  /** Videos anteriores cuando no se muestra el título ("Video anterior 2") */
  previous: string
  loading: string
  /** Sólo en la vista previa de Studio: el canal no devolvió videos o no se pudo consultar */
  previewEmpty: string
}

const STRINGS: Record<ProfileLang, LatestVideoStrings> = {
  es: { heading: 'Último video', previous: 'Video anterior', loading: 'Cargando el último video…',
    previewEmpty: 'Todavía no encontramos videos de este canal. Revisá el link o probá en un rato: en tu perfil no se muestra nada hasta que haya uno.' },
  en: { heading: 'Latest video', previous: 'Previous video', loading: 'Loading the latest video…',
    previewEmpty: 'We haven’t found videos from this channel yet. Check the link or try again later: nothing shows on your profile until there is one.' },
  pt: { heading: 'Último vídeo', previous: 'Vídeo anterior', loading: 'Carregando o último vídeo…',
    previewEmpty: 'Ainda não encontramos vídeos deste canal. Confira o link ou tente mais tarde: nada aparece no seu perfil até existir um.' },
  fr: { heading: 'Dernière vidéo', previous: 'Vidéo précédente', loading: 'Chargement de la dernière vidéo…',
    previewEmpty: 'Nous n’avons pas encore trouvé de vidéos sur cette chaîne. Vérifiez le lien ou réessayez plus tard : rien ne s’affiche sur votre profil tant qu’il n’y en a pas.' },
  de: { heading: 'Neuestes Video', previous: 'Früheres Video', loading: 'Neuestes Video wird geladen…',
    previewEmpty: 'Wir haben noch keine Videos dieses Kanals gefunden. Prüfe den Link oder versuch es später: Auf deinem Profil erscheint nichts, bis es eines gibt.' },
  it: { heading: 'Ultimo video', previous: 'Video precedente', loading: 'Caricamento dell’ultimo video…',
    previewEmpty: 'Non abbiamo ancora trovato video di questo canale. Controlla il link o riprova più tardi: sul tuo profilo non appare nulla finché non ce n’è uno.' },
  zh: { heading: '最新视频', previous: '更早的视频', loading: '正在加载最新视频…',
    previewEmpty: '还没有找到这个频道的视频。请检查链接或稍后再试：在有视频之前，你的主页上不会显示任何内容。' },
  ja: { heading: '最新の動画', previous: '以前の動画', loading: '最新の動画を読み込み中…',
    previewEmpty: 'このチャンネルの動画はまだ見つかりません。リンクを確認するか、しばらくしてからお試しください。動画が見つかるまでプロフィールには何も表示されません。' },
  ko: { heading: '최신 동영상', previous: '이전 동영상', loading: '최신 동영상을 불러오는 중…',
    previewEmpty: '아직 이 채널의 동영상을 찾지 못했어요. 링크를 확인하거나 잠시 후 다시 시도하세요. 동영상이 생기기 전까지 프로필에는 아무것도 표시되지 않아요.' },
  hi: { heading: 'नया वीडियो', previous: 'पिछला वीडियो', loading: 'नया वीडियो लोड हो रहा है…',
    previewEmpty: 'इस चैनल के वीडियो अभी नहीं मिले। लिंक जांचें या थोड़ी देर बाद कोशिश करें: वीडियो मिलने तक आपकी प्रोफ़ाइल पर कुछ नहीं दिखेगा।' },
  ar: { heading: 'أحدث فيديو', previous: 'فيديو سابق', loading: 'جارٍ تحميل أحدث فيديو…',
    previewEmpty: 'لم نجد بعد فيديوهات لهذه القناة. تحقّق من الرابط أو حاول لاحقًا: لن يظهر شيء في ملفك حتى يتوفر فيديو.' },
  ru: { heading: 'Новое видео', previous: 'Предыдущее видео', loading: 'Загружаем новое видео…',
    previewEmpty: 'Пока не нашли видео этого канала. Проверьте ссылку или попробуйте позже: в профиле ничего не появится, пока видео нет.' },
}

export const latestVideoT = (lang: ProfileLang): LatestVideoStrings => STRINGS[lang] ?? STRINGS.es

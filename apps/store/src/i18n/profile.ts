/**
 * The words of the citizen's own face in the player area (Pablo's video
 * walkthrough, 2026-10-14): the portrait and the profile on Resumen's card
 * («la foto del personaje», «editar mi perfil personal»), the sheet's new
 * layout (a blank sheet is one door, not a wall of «—») and the manual's
 * sheet opened inside the character page («el códice no te debería sacar
 * al códice entero»). Five locales, like every UI string; the panel's own
 * words stay in lap.ts.
 *
 * Where the card lives is said on the form itself, in the site's own words
 * for it: the sheet is a file of yours and it lives in this browser.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { SheetLayoutLabels } from '../components/lap/sheet/sheet-props';

export interface ProfileMessages {
  /** The card on Resumen («Tu ciudadanía»). */
  readonly card: {
    /** The portrait button: what a tap does. */
    readonly photoChange: string;
    readonly photoAdd: string;
    readonly photoAlt: string;
    readonly photoError: string;
    readonly photoFull: string;
    readonly saved: string;
    readonly edit: string;
    readonly links: string;
  };
  /** The «Editar perfil» form. */
  readonly form: {
    readonly title: string;
    readonly note: string;
    readonly photo: string;
    readonly photoPick: string;
    readonly photoRemove: string;
    readonly name: string;
    readonly namePlaceholder: string;
    readonly line: string;
    readonly linePlaceholder: string;
    readonly place: string;
    readonly placePlaceholder: string;
    readonly links: string;
    /** «Enlace {n}»: each link's own name for a screen reader. */
    readonly link: string;
    readonly badLink: string;
    readonly save: string;
    readonly cancel: string;
  };
  readonly sheet: SheetLayoutLabels;
  /** The manual's sheet, opened inside the character page. */
  readonly annex: {
    readonly summary: string;
    readonly hint: string;
    readonly download: string;
    readonly loading: string;
    /** Shown when the page could not be read here; the Códice link follows. */
    readonly failed: string;
  };
}

export const PROFILE_UI: Readonly<Record<SupportedLocale, ProfileMessages>> = {
  es: {
    card: {
      photoChange: 'Cambiar la foto',
      photoAdd: 'Poner una foto',
      photoAlt: 'Tu foto',
      photoError: 'No hemos podido leer esa imagen. Prueba con una JPG, PNG o WebP.',
      photoFull: 'Este navegador no tiene sitio para guardar la foto. Prueba con otra imagen.',
      saved: 'Guardado en este navegador.',
      edit: 'Editar perfil',
      links: 'Tus enlaces',
    },
    form: {
      title: 'Editar perfil',
      note: 'Tu perfil vive en este navegador, junto a tu ficha: no se envía a ningún sitio. Tu ficha es un archivo tuyo; si la exportas, la foto y estos datos van con ella.',
      photo: 'Foto',
      photoPick: 'Elegir foto',
      photoRemove: 'Quitar foto',
      name: 'Nombre visible',
      namePlaceholder: 'Cómo quieres que te vean',
      line: 'Una línea sobre ti',
      linePlaceholder: 'Qué haces o qué te trae a Numinia',
      place: 'Ciudad o zona',
      placePlaceholder: 'Madrid, Valparaíso, Osaka…',
      links: 'Enlaces (hasta 3)',
      link: 'Enlace {n}',
      badLink:
        'Revisa los enlaces marcados: cada uno tiene que ser una dirección web, como ejemplo.org/tu-nombre.',
      save: 'Guardar',
      cancel: 'Cancelar',
    },
    sheet: {
      emptyTitle: 'Tu ficha está en blanco',
      emptyBody:
        'Crea tu personaje paso a paso: quién es, de dónde viene y qué sabe hacer. Se guarda en este navegador y te lo llevas en un archivo .md cuando quieras.',
      emptyStart: 'Crear mi personaje',
      unnamed: 'Sin nombre',
      portraitAlt: 'Retrato de tu personaje',
      portraitHint: 'La foto se cambia en Resumen.',
      groupWho: 'Quién',
      groupOrigin: 'Origen',
      groupCity: 'En la ciudad',
    },
    annex: {
      summary: 'La hoja del manual',
      hint: 'Ábrela aquí: cada casilla tal como la trae el Códice.',
      download: 'Descargar la hoja en .md',
      loading: 'Abriendo la hoja…',
      failed: 'No hemos podido abrir la hoja aquí.',
    },
  },
  en: {
    card: {
      photoChange: 'Change the photo',
      photoAdd: 'Add a photo',
      photoAlt: 'Your photo',
      photoError: 'We could not read that image. Try a JPG, PNG or WebP.',
      photoFull: 'This browser has no room to keep the photo. Try another image.',
      saved: 'Saved in this browser.',
      edit: 'Edit profile',
      links: 'Your links',
    },
    form: {
      title: 'Edit profile',
      note: 'Your profile lives in this browser, next to your sheet: it is not sent anywhere. Your sheet is a file of your own; when you export it, the photo and these details go with it.',
      photo: 'Photo',
      photoPick: 'Choose a photo',
      photoRemove: 'Remove photo',
      name: 'Display name',
      namePlaceholder: 'How you want to be seen',
      line: 'A line about you',
      linePlaceholder: 'What you do, or what brings you to Numinia',
      place: 'City or area',
      placePlaceholder: 'Madrid, Valparaíso, Osaka…',
      links: 'Links (up to 3)',
      link: 'Link {n}',
      badLink:
        'Check the marked links: each one has to be a web address, like example.org/your-name.',
      save: 'Save',
      cancel: 'Cancel',
    },
    sheet: {
      emptyTitle: 'Your sheet is blank',
      emptyBody:
        'Create your character step by step: who they are, where they come from and what they can do. It is kept in this browser, and you take it with you as a .md file whenever you like.',
      emptyStart: 'Create my character',
      unnamed: 'Unnamed',
      portraitAlt: 'Portrait of your character',
      portraitHint: 'The photo is changed in Overview.',
      groupWho: 'Who',
      groupOrigin: 'Origin',
      groupCity: 'In the city',
    },
    annex: {
      summary: 'The manual’s sheet',
      hint: 'Open it here: every box as the Codex explains it.',
      download: 'Download the sheet as .md',
      loading: 'Opening the sheet…',
      failed: 'We could not open the sheet here.',
    },
  },
  ja: {
    card: {
      photoChange: '写真を変える',
      photoAdd: '写真を追加',
      photoAlt: 'あなたの写真',
      photoError: 'その画像を読み込めませんでした。JPG、PNG、WebP を試してください。',
      photoFull: 'このブラウザには写真を保存する空きがありません。別の画像を試してください。',
      saved: 'このブラウザに保存しました。',
      edit: 'プロフィールを編集',
      links: 'あなたのリンク',
    },
    form: {
      title: 'プロフィールを編集',
      note: 'プロフィールはシートと一緒にこのブラウザに保存され、どこにも送信されません。シートはあなたのファイルです。書き出すと、写真とこれらの情報も一緒に入ります。',
      photo: '写真',
      photoPick: '写真を選ぶ',
      photoRemove: '写真を外す',
      name: '表示名',
      namePlaceholder: 'どう呼ばれたいか',
      line: 'ひとこと',
      linePlaceholder: 'していること、ヌミニアに来た理由など',
      place: '都市・地域',
      placePlaceholder: 'マドリード、バルパライソ、大阪…',
      links: 'リンク（3 つまで）',
      link: 'リンク {n}',
      badLink:
        '印の付いたリンクを確認してください。example.org/your-name のようなウェブアドレスである必要があります。',
      save: '保存',
      cancel: 'キャンセル',
    },
    sheet: {
      emptyTitle: 'シートはまだ白紙です',
      emptyBody:
        'キャラクターを一歩ずつ作りましょう。誰なのか、どこから来たのか、何ができるのか。このブラウザに保存され、いつでも .md ファイルとして持ち出せます。',
      emptyStart: 'キャラクターを作る',
      unnamed: '名前なし',
      portraitAlt: 'キャラクターの肖像',
      portraitHint: '写真は「概要」で変更します。',
      groupWho: '人物',
      groupOrigin: '出自',
      groupCity: '街での立場',
    },
    annex: {
      summary: 'マニュアルのシート',
      hint: 'ここで開けます：コデックスが説明するとおりの各欄。',
      download: 'シートを .md でダウンロード',
      loading: 'シートを開いています…',
      failed: 'ここではシートを開けませんでした。',
    },
  },
  ko: {
    card: {
      photoChange: '사진 바꾸기',
      photoAdd: '사진 넣기',
      photoAlt: '내 사진',
      photoError: '그 이미지를 읽지 못했습니다. JPG, PNG 또는 WebP로 해 보세요.',
      photoFull: '이 브라우저에는 사진을 저장할 공간이 없습니다. 다른 이미지로 해 보세요.',
      saved: '이 브라우저에 저장했습니다.',
      edit: '프로필 편집',
      links: '내 링크',
    },
    form: {
      title: '프로필 편집',
      note: '프로필은 시트와 함께 이 브라우저에 저장되며 어디에도 전송되지 않습니다. 시트는 당신의 파일입니다. 내보내면 사진과 이 정보도 함께 들어갑니다.',
      photo: '사진',
      photoPick: '사진 고르기',
      photoRemove: '사진 빼기',
      name: '표시 이름',
      namePlaceholder: '어떻게 불리고 싶은지',
      line: '나를 소개하는 한 줄',
      linePlaceholder: '하는 일, 누미니아에 온 이유',
      place: '도시 또는 지역',
      placePlaceholder: '마드리드, 발파라이소, 오사카…',
      links: '링크(최대 3개)',
      link: '링크 {n}',
      badLink: '표시된 링크를 확인하세요. example.org/your-name 같은 웹 주소여야 합니다.',
      save: '저장',
      cancel: '취소',
    },
    sheet: {
      emptyTitle: '시트가 비어 있습니다',
      emptyBody:
        '캐릭터를 차근차근 만들어 보세요. 누구인지, 어디에서 왔는지, 무엇을 할 수 있는지. 이 브라우저에 저장되고 언제든 .md 파일로 가져갈 수 있습니다.',
      emptyStart: '내 캐릭터 만들기',
      unnamed: '이름 없음',
      portraitAlt: '캐릭터 초상',
      portraitHint: '사진은 「개요」에서 바꿉니다.',
      groupWho: '누구',
      groupOrigin: '출신',
      groupCity: '도시에서',
    },
    annex: {
      summary: '매뉴얼의 시트',
      hint: '여기서 펼쳐 보세요: 코덱스가 설명하는 그대로의 각 칸.',
      download: '시트를 .md로 내려받기',
      loading: '시트를 여는 중…',
      failed: '여기서는 시트를 열지 못했습니다.',
    },
  },
  'pt-br': {
    card: {
      photoChange: 'Trocar a foto',
      photoAdd: 'Pôr uma foto',
      photoAlt: 'Sua foto',
      photoError: 'Não conseguimos ler essa imagem. Tente uma JPG, PNG ou WebP.',
      photoFull: 'Este navegador não tem espaço para guardar a foto. Tente outra imagem.',
      saved: 'Salvo neste navegador.',
      edit: 'Editar perfil',
      links: 'Seus links',
    },
    form: {
      title: 'Editar perfil',
      note: 'Seu perfil fica neste navegador, junto com sua ficha: não é enviado a lugar nenhum. Sua ficha é um arquivo seu; se você exportá-la, a foto e estes dados vão junto.',
      photo: 'Foto',
      photoPick: 'Escolher foto',
      photoRemove: 'Tirar foto',
      name: 'Nome visível',
      namePlaceholder: 'Como você quer ser visto',
      line: 'Uma linha sobre você',
      linePlaceholder: 'O que você faz, ou o que te traz a Numinia',
      place: 'Cidade ou região',
      placePlaceholder: 'Madri, Valparaíso, Osaka…',
      links: 'Links (até 3)',
      link: 'Link {n}',
      badLink:
        'Revise os links marcados: cada um precisa ser um endereço da web, como exemplo.org/seu-nome.',
      save: 'Salvar',
      cancel: 'Cancelar',
    },
    sheet: {
      emptyTitle: 'Sua ficha está em branco',
      emptyBody:
        'Crie seu personagem passo a passo: quem é, de onde vem e o que sabe fazer. Fica guardado neste navegador, e você o leva em um arquivo .md quando quiser.',
      emptyStart: 'Criar meu personagem',
      unnamed: 'Sem nome',
      portraitAlt: 'Retrato do seu personagem',
      portraitHint: 'A foto se troca no Resumo.',
      groupWho: 'Quem',
      groupOrigin: 'Origem',
      groupCity: 'Na cidade',
    },
    annex: {
      summary: 'A ficha do manual',
      hint: 'Abra aqui: cada campo como o Códice explica.',
      download: 'Baixar a ficha em .md',
      loading: 'Abrindo a ficha…',
      failed: 'Não conseguimos abrir a ficha aqui.',
    },
  },
};

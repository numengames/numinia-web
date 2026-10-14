/**
 * The assets room's editing words (v0.89.0, «aquí lo que debería es poder
 * editar los assets, eliminarlos o añadir»), in the five locales. Every
 * change happens in GitHub's own editor on the public data repo; the room
 * only opens the right page. `{name}` and `{id}` are filled in.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface AdminAssetsMessages {
  /** The one primary action: opens the list of kinds. */
  readonly add: string;
  /** Under «Añadir»: what happens after the upload. */
  readonly addHint: string;
  /** The table's last column. */
  readonly actions: string;
  readonly edit: string;
  readonly remove: string;
  /** Title of «Editar»: «{name}», «{id}». */
  readonly editTitle: string;
  /** Title of «Eliminar»: «{name}», «{id}». */
  readonly removeTitle: string;
  /** The one line on when a change shows. */
  readonly publishNote: string;
  /** Read after a link: it opens GitHub in a new tab. */
  readonly opensGithub: string;
  /** Under the table: what «Editar» and «Eliminar» open, and what to do there. */
  readonly rowsHint: string;
}

export const ADMIN_ASSETS_MESSAGES: Readonly<Record<SupportedLocale, AdminAssetsMessages>> = {
  es: {
    add: 'Añadir',
    addHint:
      'Elige su tipo: GitHub abre la carpeta para subir el archivo. Después añade su ficha al catálogo de ese tipo con «Editar».',
    actions: 'Acciones',
    edit: 'Editar',
    remove: 'Eliminar',
    editTitle: 'Editar «{name}» en el catálogo, en GitHub (busca {id})',
    removeTitle: 'Eliminar «{name}»: en el editor de GitHub quita su bloque ({id}) del catálogo',
    publishNote:
      'Los cambios se hacen en GitHub y llegan al Bazar cuando la web se vuelve a publicar.',
    opensGithub: '(abre GitHub en otra pestaña)',
    rowsHint:
      '«Editar» y «Eliminar» abren el catálogo de su tipo en GitHub: busca el id y cambia o quita su bloque; GitHub te pide confirmar.',
  },
  en: {
    add: 'Add',
    addHint:
      'Pick its kind: GitHub opens the folder to upload the file. Then add its entry to that kind’s catalogue with «Edit».',
    actions: 'Actions',
    edit: 'Edit',
    remove: 'Delete',
    editTitle: 'Edit «{name}» in the catalogue, on GitHub (look for {id})',
    removeTitle: 'Delete «{name}»: in GitHub’s editor, remove its block ({id}) from the catalogue',
    publishNote:
      'Changes are made on GitHub and reach the Bazaar when the site is published again.',
    opensGithub: '(opens GitHub in a new tab)',
    rowsHint:
      '«Edit» and «Delete» open its kind’s catalogue on GitHub: find the id and change or remove its block; GitHub asks you to confirm.',
  },
  ja: {
    add: '追加',
    addHint:
      '種類を選ぶと、GitHub がファイルをアップロードするフォルダを開きます。その後「編集」でその種類のカタログに項目を追加してください。',
    actions: '操作',
    edit: '編集',
    remove: '削除',
    editTitle: 'GitHub のカタログで「{name}」を編集({id} を探す)',
    removeTitle: '「{name}」を削除:GitHub のエディタでカタログからそのブロック({id})を消す',
    publishNote: '変更は GitHub で行い、サイトが再公開されるとバザールに反映されます。',
    opensGithub: '(GitHub を新しいタブで開く)',
    rowsHint:
      '「編集」と「削除」は GitHub でその種類のカタログを開きます。id を探してブロックを変更または削除してください。GitHub が確認を求めます。',
  },
  ko: {
    add: '추가',
    addHint:
      '종류를 고르면 GitHub가 파일을 올릴 폴더를 엽니다. 그다음 「편집」으로 그 종류의 카탈로그에 항목을 추가하세요.',
    actions: '작업',
    edit: '편집',
    remove: '삭제',
    editTitle: 'GitHub 카탈로그에서 「{name}」 편집 ({id} 찾기)',
    removeTitle: '「{name}」 삭제: GitHub 편집기에서 카탈로그의 해당 블록({id})을 지우세요',
    publishNote: '변경은 GitHub에서 이루어지며, 사이트를 다시 게시하면 바자에 반영됩니다.',
    opensGithub: '(새 탭에서 GitHub 열기)',
    rowsHint:
      '「편집」과 「삭제」는 GitHub에서 그 종류의 카탈로그를 엽니다. id를 찾아 블록을 바꾸거나 지우세요. GitHub가 확인을 요청합니다.',
  },
  'pt-br': {
    add: 'Adicionar',
    addHint:
      'Escolha o tipo: o GitHub abre a pasta para enviar o arquivo. Depois adicione a ficha ao catálogo desse tipo com «Editar».',
    actions: 'Ações',
    edit: 'Editar',
    remove: 'Excluir',
    editTitle: 'Editar «{name}» no catálogo, no GitHub (procure {id})',
    removeTitle: 'Excluir «{name}»: no editor do GitHub, remova o bloco ({id}) do catálogo',
    publishNote:
      'As mudanças são feitas no GitHub e chegam ao Bazar quando o site é publicado de novo.',
    opensGithub: '(abre o GitHub em outra aba)',
    rowsHint:
      '«Editar» e «Excluir» abrem o catálogo do tipo no GitHub: procure o id e altere ou remova o bloco; o GitHub pede confirmação.',
  },
};

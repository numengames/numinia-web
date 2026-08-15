/**
 * UI messages for the store — typed per locale: a missing translation does
 * not compile (same guarantee as the domain constants).
 */

import type { SupportedLocale } from '@numinia/domain';

export interface ArchiveMessages {
  readonly archiveTitle: string;
  readonly archiveIntro: string;
  readonly searchPlaceholder: string;
  readonly allFormats: string;
  readonly download: string;
  readonly downloadUnavailable: string;
  readonly emptyState: string;
  readonly noResults: string;
  readonly backToArchive: string;
  readonly category: string;
  readonly format: string;
  readonly license: string;
  readonly worldFileNote: string;
}

export const ARCHIVE_MESSAGES: Readonly<Record<SupportedLocale, ArchiveMessages>> = {
  es: {
    archiveTitle: 'Archivo',
    archiveIntro: 'Bienes digitales CC0 de la ciudad de Numinia: úsalos, remézclalos, mejóralos.',
    searchPlaceholder: 'Buscar en el archivo…',
    allFormats: 'Todos',
    download: 'Descargar',
    downloadUnavailable: 'Descarga no disponible',
    emptyState: 'El archivo está vacío por ahora.',
    noResults: 'Nada coincide con tu búsqueda.',
    backToArchive: '← Volver al Archivo',
    category: 'Categoría',
    format: 'Formato',
    license: 'Licencia',
    worldFileNote: 'Archivo de mundo para Hyperfy. Descárgalo para usarlo en tu espacio.',
  },
  en: {
    archiveTitle: 'Archive',
    archiveIntro: 'CC0 digital goods from the city of Numinia: use them, remix them, improve them.',
    searchPlaceholder: 'Search the archive…',
    allFormats: 'All',
    download: 'Download',
    downloadUnavailable: 'Download unavailable',
    emptyState: 'The archive is empty for now.',
    noResults: 'Nothing matches your search.',
    backToArchive: '← Back to the Archive',
    category: 'Category',
    format: 'Format',
    license: 'License',
    worldFileNote: 'A world file for Hyperfy. Download it to use it in your space.',
  },
  ja: {
    archiveTitle: 'アーカイブ',
    archiveIntro:
      'ヌミニアの都市が贈るCC0デジタルグッズ。使って、リミックスして、良くしてください。',
    searchPlaceholder: 'アーカイブを検索…',
    allFormats: 'すべて',
    download: 'ダウンロード',
    downloadUnavailable: 'ダウンロード不可',
    emptyState: 'アーカイブはまだ空です。',
    noResults: '検索に一致するものがありません。',
    backToArchive: '← アーカイブへ戻る',
    category: 'カテゴリー',
    format: 'フォーマット',
    license: 'ライセンス',
    worldFileNote: 'Hyperfy用ワールドファイル。ダウンロードしてスペースで使えます。',
  },
  ko: {
    archiveTitle: '아카이브',
    archiveIntro: '누미니아 도시의 CC0 디지털 굿즈 — 쓰고, 리믹스하고, 더 좋게 만드세요.',
    searchPlaceholder: '아카이브 검색…',
    allFormats: '전체',
    download: '다운로드',
    downloadUnavailable: '다운로드 불가',
    emptyState: '아카이브가 아직 비어 있습니다.',
    noResults: '검색과 일치하는 항목이 없습니다.',
    backToArchive: '← 아카이브로 돌아가기',
    category: '카테고리',
    format: '포맷',
    license: '라이선스',
    worldFileNote: 'Hyperfy용 월드 파일입니다. 내려받아 내 공간에서 사용하세요.',
  },
  'pt-br': {
    archiveTitle: 'Arquivo',
    archiveIntro: 'Bens digitais CC0 da cidade de Numinia: use, remixe, melhore.',
    searchPlaceholder: 'Buscar no arquivo…',
    allFormats: 'Todos',
    download: 'Baixar',
    downloadUnavailable: 'Download indisponível',
    emptyState: 'O arquivo está vazio por enquanto.',
    noResults: 'Nada corresponde à sua busca.',
    backToArchive: '← Voltar ao Arquivo',
    category: 'Categoria',
    format: 'Formato',
    license: 'Licença',
    worldFileNote: 'Arquivo de mundo para o Hyperfy. Baixe para usar no seu espaço.',
  },
};

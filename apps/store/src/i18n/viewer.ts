/**
 * The 3D viewer's words (v0.89.0), in the five locales: every state it can
 * be in says what is happening, and a model that cannot be drawn says why
 * and offers its file — never an empty box, never English on a Spanish page.
 * `{percent}` is filled in.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface ViewerMessages {
  /** The canvas's accessible name. */
  readonly canvasLabel: string;
  readonly loading: string;
  /** While loading, when the size is known: «{percent}». */
  readonly loadingShare: string;
  /** Under a model on show. */
  readonly ready: string;
  /** A file with bones and no body (an emote): its skeleton is what moves. */
  readonly skeleton: string;
  /** A file that loaded and holds nothing to draw. */
  readonly nothing: string;
  readonly error: string;
  /** The browser has no WebGL. */
  readonly noWebgl: string;
  /** The way out when the model cannot be shown: its file. */
  readonly downloadInstead: string;
  /** No file at all. */
  readonly empty: string;
}

export const VIEWER_MESSAGES: Readonly<Record<SupportedLocale, ViewerMessages>> = {
  es: {
    canvasLabel: 'Modelo en 3D',
    loading: 'Cargando el modelo…',
    loadingShare: 'Cargando el modelo… {percent} %',
    ready: 'Gira solo para que lo veas por todos lados.',
    skeleton: 'Este archivo es una animación sin cuerpo: lo que se mueve es su esqueleto.',
    nothing: 'Este archivo se abre bien, pero no trae nada que se pueda dibujar.',
    error: 'No se ha podido cargar el modelo.',
    noWebgl: 'Este navegador no puede dibujar en 3D.',
    downloadInstead: 'Descárgalo y ábrelo en tu programa 3D',
    empty: 'No hay ningún modelo que mostrar.',
  },
  en: {
    canvasLabel: '3D model',
    loading: 'Loading the model…',
    loadingShare: 'Loading the model… {percent}%',
    ready: 'It turns on its own so you can see every side.',
    skeleton: 'This file is an animation with no body: what moves is its skeleton.',
    nothing: 'This file opens fine, but holds nothing that can be drawn.',
    error: 'The model could not be loaded.',
    noWebgl: 'This browser cannot draw in 3D.',
    downloadInstead: 'Download it and open it in your 3D app',
    empty: 'There is no model to show.',
  },
  ja: {
    canvasLabel: '3Dモデル',
    loading: 'モデルを読み込み中…',
    loadingShare: 'モデルを読み込み中… {percent}%',
    ready: 'すべての面が見えるよう、自動で回転します。',
    skeleton: 'このファイルは体のないアニメーションです。動いているのはその骨格です。',
    nothing: 'このファイルは開けますが、描画できるものが入っていません。',
    error: 'モデルを読み込めませんでした。',
    noWebgl: 'このブラウザでは3Dを表示できません。',
    downloadInstead: 'ダウンロードして3Dアプリで開く',
    empty: '表示できるモデルがありません。',
  },
  ko: {
    canvasLabel: '3D 모델',
    loading: '모델을 불러오는 중…',
    loadingShare: '모델을 불러오는 중… {percent}%',
    ready: '모든 면을 볼 수 있도록 저절로 돌아갑니다.',
    skeleton: '이 파일은 몸체가 없는 애니메이션입니다. 움직이는 것은 뼈대입니다.',
    nothing: '이 파일은 열리지만, 그릴 수 있는 것이 들어 있지 않습니다.',
    error: '모델을 불러오지 못했습니다.',
    noWebgl: '이 브라우저는 3D를 그릴 수 없습니다.',
    downloadInstead: '내려받아 3D 앱에서 여세요',
    empty: '보여 줄 모델이 없습니다.',
  },
  'pt-br': {
    canvasLabel: 'Modelo em 3D',
    loading: 'Carregando o modelo…',
    loadingShare: 'Carregando o modelo… {percent}%',
    ready: 'Ele gira sozinho para você ver todos os lados.',
    skeleton: 'Este arquivo é uma animação sem corpo: o que se move é o esqueleto.',
    nothing: 'Este arquivo abre bem, mas não traz nada que possa ser desenhado.',
    error: 'Não foi possível carregar o modelo.',
    noWebgl: 'Este navegador não consegue desenhar em 3D.',
    downloadInstead: 'Baixe e abra no seu programa 3D',
    empty: 'Não há nenhum modelo para mostrar.',
  },
};

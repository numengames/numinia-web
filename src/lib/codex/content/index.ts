import type { CodexChapter } from '../types';
import { intro } from './intro';
import { chapter1 } from './chapter1';
import { chapter2 } from './chapter2';
import { chapter4 } from './chapter4';
import { chapter5 } from './chapter5';
import { chapter6 } from './chapter6';
import { chapter7 } from './chapter7';

export const codexChapters: CodexChapter[] = [
  intro, chapter1, chapter2, chapter4, chapter5, chapter6, chapter7,
];

export const totalFragments = codexChapters.reduce(
  (sum, ch) => sum + ch.fragments.length, 0
);

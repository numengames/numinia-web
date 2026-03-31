'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { CodexFragment } from '@/lib/codex/types';

interface CodexPageProps {
  fragment: CodexFragment;
  chapterTitle: string;
  chapterNumber: number | null;
  fragmentIndex: number;
  totalFragments: number;
  globalPageNumber: number;
}

export const CodexPage = forwardRef<HTMLDivElement, CodexPageProps>(
  function CodexPage(
    { fragment, chapterTitle, chapterNumber, fragmentIndex, totalFragments, globalPageNumber },
    ref
  ) {
    const chapterLabel = chapterNumber !== null
      ? `Capítulo ${chapterNumber}`
      : 'Introducción';

    return (
      <motion.div
        className="codex-page"
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35 }}
        role="article"
        aria-label={`${chapterLabel} — ${fragment.title}`}
      >
        {/* Chapter label */}
        <div className="codex-chapter-label">
          {chapterLabel}
        </div>

        {/* Fragment title */}
        <h2 className="codex-page-title">
          {fragment.title}
        </h2>

        {/* Body content */}
        <div
          className="codex-page-body"
          dangerouslySetInnerHTML={{ __html: fragment.body }}
        />

        {/* Page number */}
        <div className="codex-page-number" aria-hidden>
          — {globalPageNumber} —
        </div>
      </motion.div>
    );
  }
);

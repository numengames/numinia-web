'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { CodexChapter } from '@/lib/codex/types';

interface CodexIndexProps {
  isOpen: boolean;
  chapters: CodexChapter[];
  currentChapter: number;
  currentFragment: number;
  onNavigate: (chapterIndex: number, fragmentIndex: number) => void;
  onClose: () => void;
}

export function CodexIndex({
  isOpen,
  chapters,
  currentChapter,
  currentFragment,
  onNavigate,
  onClose,
}: CodexIndexProps) {
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="codex-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="codex-index-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="navigation"
            aria-label="Índice del Códice"
          >
            <div className="codex-index-header">
              <span>Índice</span>
              <button
                className="codex-index-close"
                onClick={onClose}
                aria-label="Cerrar índice"
              >
                <X size={18} />
              </button>
            </div>

            <div className="codex-index-list">
              {chapters.map((chapter, chIdx) => (
                <div key={chapter.id}>
                  {/* Chapter heading */}
                  <motion.div
                    className={`codex-index-chapter ${chIdx === currentChapter ? 'active' : ''}`}
                    onClick={() => onNavigate(chIdx, 0)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: chIdx * 0.04 }}
                  >
                    {chapter.number !== null ? `${chapter.number}. ` : ''}
                    {chapter.title}
                  </motion.div>

                  {/* Fragment sub-items */}
                  {chapter.fragments.map((frag, fIdx) => (
                    <motion.div
                      key={frag.id}
                      className={`codex-index-fragment ${
                        chIdx === currentChapter && fIdx === currentFragment ? 'active' : ''
                      }`}
                      onClick={() => onNavigate(chIdx, fIdx)}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: chIdx * 0.04 + fIdx * 0.02 }}
                    >
                      {frag.title}
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

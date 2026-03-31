'use client';

import { motion } from 'framer-motion';

interface CodexCoverProps {
  hasBookmark: boolean;
  onOpen: () => void;
  onResume: () => void;
}

export function CodexCover({ hasBookmark, onOpen, onResume }: CodexCoverProps) {
  return (
    <motion.div
      className="codex-cover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8 }}
    >
      {/* Floating particles */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              background: `rgba(201, 168, 76, ${0.1 + Math.random() * 0.15})`,
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -30 - Math.random() * 40, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Sigil */}
      <motion.div
        className="codex-cover-sigil"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        &#x29DB;
      </motion.div>

      {/* Title */}
      <motion.h1
        className="codex-cover-title"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        NUMINIA
      </motion.h1>

      {/* Subtitle */}
      <motion.div
        className="codex-cover-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        El Juego de Rol
      </motion.div>

      <motion.div
        className="codex-cover-divider"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      />

      <motion.div
        className="codex-cover-edition"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        El Códice de las Brumas &middot; v0.0.9
      </motion.div>

      {/* Open button */}
      <motion.button
        className="codex-cover-open-btn"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        onClick={hasBookmark ? onResume : onOpen}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        {hasBookmark ? 'Continuar Lectura' : 'Abrir el Códice'}
      </motion.button>

      {hasBookmark && (
        <motion.button
          className="codex-cover-resume"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          onClick={onOpen}
        >
          o comenzar desde el inicio
        </motion.button>
      )}
    </motion.div>
  );
}
